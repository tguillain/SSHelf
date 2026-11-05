use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex, PoisonError};
use std::time::Duration;

use russh::keys::{decode_secret_key, known_hosts, load_public_key, PrivateKey, PublicKey};
use russh::server::{self, Auth, ChannelOpenHandle, Msg, Session, VerifiedPublicKey};
use russh::{ChannelId, ChannelMsg};
use tempfile::TempDir;
use tokio::net::TcpListener;

use super::auth::Secret;
use super::connect::{establish, ConnectContext, Established, TerminalSize};
use super::errors::{ConnectError, ErrorCode};
use super::events::SessionEvent;
use super::handler::PendingHostKeys;
use crate::connections::{AuthMethod, Connection, Environment};

const PASSWORD: &str = "bon-mot-de-passe";
const PASSPHRASE: &str = "test-passphrase";
const FIXTURES: &str = concat!(env!("CARGO_MANIFEST_DIR"), "/tests/fixtures");

fn fixture(name: &str) -> PathBuf {
    Path::new(FIXTURES).join(name)
}

fn host_key(name: &str) -> PrivateKey {
    let raw = std::fs::read_to_string(fixture(name)).expect("clé d’hôte de test");
    decode_secret_key(&raw, None).expect("clé d’hôte lisible")
}

#[derive(Clone)]
struct TestServer {
    authorized_keys: Arc<Vec<PublicKey>>,
    open_channels: Arc<Mutex<Vec<russh::Channel<Msg>>>>,
}

impl server::Handler for TestServer {
    type Error = russh::Error;

    async fn auth_password(&mut self, _user: &str, password: &str) -> Result<Auth, Self::Error> {
        Ok(if password == PASSWORD { Auth::Accept } else { Auth::reject() })
    }

    async fn auth_publickey(&mut self, _user: &str, key: VerifiedPublicKey<'_>) -> Result<Auth, Self::Error> {
        let authorized = self
            .authorized_keys
            .iter()
            .any(|candidate| candidate.key_data() == key.public_key.key_data());
        Ok(if authorized { Auth::Accept } else { Auth::reject() })
    }

    async fn channel_open_session(
        &mut self,
        channel: russh::Channel<Msg>,
        reply: ChannelOpenHandle,
        _session: &mut Session,
    ) -> Result<(), Self::Error> {
        self.open_channels.lock().unwrap_or_else(PoisonError::into_inner).push(channel);
        reply.accept().await;
        Ok(())
    }

    async fn shell_request(&mut self, channel: ChannelId, session: &mut Session) -> Result<(), Self::Error> {
        session.channel_success(channel)?;
        session.data(channel, b"bienvenue\r\n".to_vec())?;
        Ok(())
    }

    async fn data(&mut self, channel: ChannelId, data: &[u8], session: &mut Session) -> Result<(), Self::Error> {
        session.data(channel, data.to_vec())?;
        Ok(())
    }
}

async fn start_server(host_key_name: &str) -> u16 {
    let listener = TcpListener::bind("127.0.0.1:0").await.expect("port libre");
    let port = listener.local_addr().expect("adresse locale").port();
    let config = Arc::new(server::Config {
        keys: vec![host_key(host_key_name)],
        auth_rejection_time: Duration::from_millis(5),
        auth_rejection_time_initial: Some(Duration::ZERO),
        ..Default::default()
    });
    let handler = TestServer {
        authorized_keys: Arc::new(vec![
            load_public_key(fixture("client_plain.pub")).expect("clé publique"),
            load_public_key(fixture("client_encrypted.pub")).expect("clé publique"),
        ]),
        open_channels: Arc::default(),
    };
    tokio::spawn(async move {
        while let Ok((stream, _)) = listener.accept().await {
            let config = config.clone();
            let handler = handler.clone();
            tokio::spawn(async move {
                if let Ok(running) = server::run_stream(config, stream, handler).await {
                    let _ = running.await;
                }
            });
        }
    });
    port
}

fn connection(port: u16, auth: AuthMethod, key_name: &str) -> Connection {
    Connection {
        id: "test".into(),
        name: "test".into(),
        user: "tester".into(),
        host: "127.0.0.1".into(),
        port,
        environment: Environment::Perso,
        auth,
        key_name: key_name.into(),
    }
}

fn key_path(name: &str) -> String {
    fixture(name).to_string_lossy().into_owned()
}

struct Client {
    known_hosts: PathBuf,
    events: Arc<Mutex<Vec<SessionEvent>>>,
    _dir: TempDir,
}

impl Client {
    fn new() -> Self {
        let dir = tempfile::tempdir().expect("dossier temporaire");
        Self {
            known_hosts: dir.path().join("known_hosts"),
            events: Arc::default(),
            _dir: dir,
        }
    }

    async fn connect(
        &self,
        connection: &Connection,
        secret: Option<&str>,
        trust_unknown_host: bool,
    ) -> Result<Established, ConnectError> {
        let pending: PendingHostKeys = Arc::default();
        let answers = pending.clone();
        let recorded = self.events.clone();
        let context = ConnectContext {
            session_id: "session".into(),
            events: Arc::new(move |event| {
                if matches!(event, SessionEvent::HostKeyPrompt { .. }) {
                    if let Some(sender) = answers.lock().unwrap_or_else(PoisonError::into_inner).remove("session") {
                        let _ = sender.send(trust_unknown_host);
                    }
                }
                recorded.lock().unwrap_or_else(PoisonError::into_inner).push(event);
            }),
            pending_host_keys: pending,
            known_hosts: self.known_hosts.clone(),
        };
        establish(
            context,
            connection,
            Secret {
                value: secret,
                remember: false,
            },
            TerminalSize { cols: 80, rows: 24 },
        )
        .await
    }

    fn host_key_prompts(&self) -> usize {
        self.events
            .lock()
            .unwrap_or_else(PoisonError::into_inner)
            .iter()
            .filter(|event| matches!(event, SessionEvent::HostKeyPrompt { .. }))
            .count()
    }
}

async fn read_until(channel: &mut russh::Channel<russh::client::Msg>, expected: &str) -> String {
    let mut received = String::new();
    let deadline = tokio::time::Instant::now() + Duration::from_secs(5);
    while !received.contains(expected) {
        let message = tokio::time::timeout_at(deadline, channel.wait())
            .await
            .expect("réponse du serveur dans les temps");
        match message {
            Some(ChannelMsg::Data { data }) => received.push_str(&String::from_utf8_lossy(&data)),
            Some(_) => {}
            None => break,
        }
    }
    received
}

fn code_of(result: Result<Established, ConnectError>) -> ErrorCode {
    match result {
        Ok(_) => panic!("la connexion aurait dû échouer"),
        Err(error) => error.code,
    }
}

#[tokio::test]
async fn password_login_opens_an_interactive_shell() {
    let port = start_server("host_a").await;
    let client = Client::new();

    let Established { mut channel, .. } = client
        .connect(&connection(port, AuthMethod::Password, ""), Some(PASSWORD), true)
        .await
        .expect("connexion par mot de passe");

    assert!(read_until(&mut channel, "bienvenue").await.contains("bienvenue"));
    channel.data(&b"ping-sshelf"[..]).await.expect("envoi de données");
    assert!(read_until(&mut channel, "ping-sshelf").await.contains("ping-sshelf"));
    assert_eq!(client.host_key_prompts(), 1);
}

#[tokio::test]
async fn accepted_host_key_is_remembered() {
    let port = start_server("host_a").await;
    let client = Client::new();
    let target = connection(port, AuthMethod::Password, "");

    client.connect(&target, Some(PASSWORD), true).await.expect("première connexion");
    let recorded = known_hosts::known_host_keys_path("127.0.0.1", port, &client.known_hosts).expect("known_hosts lisible");
    assert_eq!(recorded.len(), 1);

    client.connect(&target, Some(PASSWORD), false).await.expect("deuxième connexion sans question");
    assert_eq!(client.host_key_prompts(), 1);
}

#[tokio::test]
async fn refused_host_key_aborts_the_connection() {
    let port = start_server("host_a").await;
    let client = Client::new();

    let result = client.connect(&connection(port, AuthMethod::Password, ""), Some(PASSWORD), false).await;

    assert_eq!(code_of(result), ErrorCode::HostKeyRejected);
    assert!(!client.known_hosts.exists());
}

#[tokio::test]
async fn changed_host_key_is_blocked_without_asking() {
    let port = start_server("host_b").await;
    let client = Client::new();
    let previous_key = load_public_key(fixture("host_a.pub")).expect("ancienne clé");
    known_hosts::learn_known_hosts_path("127.0.0.1", port, &previous_key, &client.known_hosts).expect("écriture known_hosts");

    let result = client.connect(&connection(port, AuthMethod::Password, ""), Some(PASSWORD), true).await;

    assert_eq!(code_of(result), ErrorCode::HostKeyChanged);
    assert_eq!(client.host_key_prompts(), 0);
}

#[tokio::test]
async fn wrong_password_asks_again() {
    let port = start_server("host_a").await;
    let client = Client::new();

    let result = client.connect(&connection(port, AuthMethod::Password, ""), Some("mauvais"), true).await;

    assert_eq!(code_of(result), ErrorCode::PasswordRequired);
}

#[tokio::test]
async fn private_key_login_succeeds() {
    let port = start_server("host_a").await;
    let client = Client::new();

    let Established { mut channel, .. } = client
        .connect(&connection(port, AuthMethod::Key, &key_path("client_plain")), None, true)
        .await
        .expect("connexion par clé");

    assert!(read_until(&mut channel, "bienvenue").await.contains("bienvenue"));
}

#[tokio::test]
async fn encrypted_key_needs_the_right_passphrase() {
    let port = start_server("host_a").await;
    let client = Client::new();
    let target = connection(port, AuthMethod::Key, &key_path("client_encrypted"));

    assert_eq!(code_of(client.connect(&target, Some("mauvaise"), true).await), ErrorCode::PassphraseRequired);
    client.connect(&target, Some(PASSPHRASE), true).await.expect("connexion avec la phrase de passe");
}

#[tokio::test]
async fn missing_key_file_is_reported() {
    let port = start_server("host_a").await;
    let client = Client::new();
    let missing = fixture("absente").to_string_lossy().into_owned();

    let result = client.connect(&connection(port, AuthMethod::Key, &missing), None, true).await;

    assert_eq!(code_of(result), ErrorCode::Key);
}

#[tokio::test]
async fn unreachable_host_fails_fast() {
    let port = {
        let listener = TcpListener::bind("127.0.0.1:0").await.expect("port libre");
        listener.local_addr().expect("adresse").port()
    };
    let client = Client::new();

    let result = client.connect(&connection(port, AuthMethod::Password, ""), Some(PASSWORD), true).await;

    assert_eq!(code_of(result), ErrorCode::Network);
}
