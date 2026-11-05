use std::collections::HashMap;
use std::sync::{Arc, Mutex, PoisonError};

use russh::client::{self, Handle};
use russh::{ChannelMsg, Disconnect};
use serde::Deserialize;
use tauri::ipc::{Channel, InvokeResponseBody};
use tauri::{AppHandle, Manager, State};
use tokio::sync::mpsc;

use super::auth::Secret;
use super::connect::{default_known_hosts, establish, ConnectContext, Established, TerminalSize};
use super::errors::ConnectError;
use super::events::SessionEvent;
use super::handler::{ClientHandler, EventSink, PendingHostKeys};
use crate::connections::Connection;

pub enum Input {
    Data(Vec<u8>),
    Resize { cols: u32, rows: u32 },
    Close,
}

#[derive(Default)]
pub struct SshState {
    sessions: Mutex<HashMap<String, mpsc::UnboundedSender<Input>>>,
    pending_host_keys: PendingHostKeys,
}

impl SshState {
    fn send(&self, session_id: &str, input: Input) -> Result<(), String> {
        let sessions = self.sessions.lock().unwrap_or_else(PoisonError::into_inner);
        let sender = sessions
            .get(session_id)
            .ok_or_else(|| "session inconnue".to_string())?;
        sender.send(input).map_err(|_| "session terminée".to_string())
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectRequest {
    pub session_id: String,
    pub connection: Connection,
    pub secret: Option<String>,
    pub remember_secret: bool,
    pub cols: u32,
    pub rows: u32,
}

#[tauri::command]
pub async fn ssh_connect(
    app: AppHandle,
    state: State<'_, SshState>,
    request: ConnectRequest,
    events: Channel<SessionEvent>,
    output: Channel<InvokeResponseBody>,
) -> Result<(), ConnectError> {
    let sink_channel = events.clone();
    let sink: EventSink = Arc::new(move |event| {
        let _ = sink_channel.send(event);
    });
    let context = ConnectContext {
        session_id: request.session_id.clone(),
        events: sink,
        pending_host_keys: state.pending_host_keys.clone(),
        known_hosts: default_known_hosts(),
    };
    let Established { handle, channel } = establish(
        context,
        &request.connection,
        Secret {
            value: request.secret.as_deref(),
            remember: request.remember_secret,
        },
        TerminalSize {
            cols: request.cols,
            rows: request.rows,
        },
    )
    .await?;

    let (sender, receiver) = mpsc::unbounded_channel();
    state
        .sessions
        .lock()
        .unwrap_or_else(PoisonError::into_inner)
        .insert(request.session_id.clone(), sender);

    let session_id = request.session_id;
    tauri::async_runtime::spawn(async move {
        let reason = pump(handle, channel, receiver, output).await;
        app.state::<SshState>()
            .sessions
            .lock()
            .unwrap_or_else(PoisonError::into_inner)
            .remove(&session_id);
        let _ = events.send(SessionEvent::Closed { reason });
    });
    Ok(())
}

async fn pump(
    handle: Handle<ClientHandler>,
    channel: russh::Channel<client::Msg>,
    mut inputs: mpsc::UnboundedReceiver<Input>,
    output: Channel<InvokeResponseBody>,
) -> String {
    let (mut reader, writer) = channel.split();
    let mut exit_status = None;

    let reason = loop {
        tokio::select! {
            message = reader.wait() => match message {
                Some(ChannelMsg::Data { data }) | Some(ChannelMsg::ExtendedData { data, .. }) => {
                    let _ = output.send(InvokeResponseBody::Raw(data.to_vec()));
                }
                Some(ChannelMsg::ExitStatus { exit_status: status }) => exit_status = Some(status),
                Some(ChannelMsg::Close) | None => {
                    break match exit_status {
                        Some(status) => format!("Session terminée (code {status})"),
                        None if handle.is_closed() => "Connexion interrompue".to_string(),
                        None => "Session terminée".to_string(),
                    };
                }
                Some(_) => {}
            },
            input = inputs.recv() => match input {
                Some(Input::Data(bytes)) => {
                    if writer.data_bytes(bytes).await.is_err() {
                        break "Connexion interrompue".to_string();
                    }
                }
                Some(Input::Resize { cols, rows }) => {
                    let _ = writer.window_change(cols, rows, 0, 0).await;
                }
                Some(Input::Close) | None => {
                    let _ = writer.close().await;
                    break "Session fermée".to_string();
                }
            },
        }
    };

    let _ = handle.disconnect(Disconnect::ByApplication, "", "fr").await;
    reason
}

#[tauri::command]
pub fn ssh_write(state: State<'_, SshState>, session_id: String, data: String) -> Result<(), String> {
    state.send(&session_id, Input::Data(data.into_bytes()))
}

#[tauri::command]
pub fn ssh_resize(state: State<'_, SshState>, session_id: String, cols: u32, rows: u32) -> Result<(), String> {
    state.send(&session_id, Input::Resize { cols, rows })
}

#[tauri::command]
pub fn ssh_close(state: State<'_, SshState>, session_id: String) {
    let _ = state.send(&session_id, Input::Close);
}

#[tauri::command]
pub fn ssh_answer_host_key(state: State<'_, SshState>, session_id: String, accept: bool) {
    let sender = state
        .pending_host_keys
        .lock()
        .unwrap_or_else(PoisonError::into_inner)
        .remove(&session_id);
    if let Some(sender) = sender {
        let _ = sender.send(accept);
    }
}
