use std::path::PathBuf;
use std::sync::Arc;
use std::time::Duration;

use russh::client::{self, Handle};
use tokio::net::TcpStream;

use super::auth::{self, Secret};
use super::errors::{ConnectError, ErrorCode};
use super::events::SessionEvent;
use super::handler::{ClientHandler, EventSink, PendingHostKeys};
use crate::connections::Connection;

const TCP_CONNECT_TIMEOUT: Duration = Duration::from_secs(10);
const HANDSHAKE_TIMEOUT: Duration = Duration::from_secs(330);
const KEEPALIVE_INTERVAL: Duration = Duration::from_secs(20);
const KEEPALIVE_MAX: usize = 3;
const TERMINAL_TYPE: &str = "xterm-256color";

pub struct ConnectContext {
    pub session_id: String,
    pub events: EventSink,
    pub pending_host_keys: PendingHostKeys,
    pub known_hosts: PathBuf,
}

pub struct TerminalSize {
    pub cols: u32,
    pub rows: u32,
}

pub struct Established {
    pub handle: Handle<ClientHandler>,
    pub channel: russh::Channel<client::Msg>,
}

pub fn default_known_hosts() -> PathBuf {
    std::env::var_os("USERPROFILE")
        .or_else(|| std::env::var_os("HOME"))
        .map(PathBuf::from)
        .unwrap_or_default()
        .join(".ssh")
        .join("known_hosts")
}

fn client_config() -> Arc<client::Config> {
    Arc::new(client::Config {
        keepalive_interval: Some(KEEPALIVE_INTERVAL),
        keepalive_max: KEEPALIVE_MAX,
        nodelay: true,
        ..Default::default()
    })
}

async fn open_tcp(connection: &Connection) -> Result<TcpStream, ConnectError> {
    let address = (connection.host.as_str(), connection.port);
    match tokio::time::timeout(TCP_CONNECT_TIMEOUT, TcpStream::connect(address)).await {
        Err(_) => Err(ConnectError::new(
            ErrorCode::Timeout,
            format!("{}:{} ne répond pas (délai dépassé)", connection.host, connection.port),
        )),
        Ok(Err(error)) => Err(ConnectError::new(
            ErrorCode::Network,
            format!("Impossible de joindre {}:{} : {error}", connection.host, connection.port),
        )),
        Ok(Ok(stream)) => {
            let _ = stream.set_nodelay(true);
            Ok(stream)
        }
    }
}

pub async fn establish(
    context: ConnectContext,
    connection: &Connection,
    secret: Secret<'_>,
    size: TerminalSize,
) -> Result<Established, ConnectError> {
    let events = context.events.clone();
    let progress = |message: String| events(SessionEvent::Progress { message });

    progress(format!("Connexion à {}:{}…", connection.host, connection.port));
    let stream = open_tcp(connection).await?;

    let handler = ClientHandler {
        session_id: context.session_id,
        host: connection.host.clone(),
        port: connection.port,
        known_hosts: context.known_hosts,
        events: context.events,
        pending_host_keys: context.pending_host_keys,
    };
    let mut handle = tokio::time::timeout(
        HANDSHAKE_TIMEOUT,
        client::connect_stream(client_config(), stream, handler),
    )
    .await
    .map_err(|_| ConnectError::new(ErrorCode::Timeout, "Négociation SSH trop longue"))??;

    progress(format!("Authentification de {}…", connection.user));
    auth::authenticate(&mut handle, connection, secret).await?;

    let channel = handle.channel_open_session().await?;
    channel
        .request_pty(false, TERMINAL_TYPE, size.cols, size.rows, 0, 0, &[])
        .await?;
    channel.request_shell(false).await?;
    Ok(Established { handle, channel })
}
