use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::{Arc, Mutex, PoisonError};
use std::time::Duration;

use russh::client;
use russh::keys::{known_hosts, HashAlg, PublicKeyOrCertificate};
use tokio::sync::oneshot;

use super::errors::HandlerError;
use super::events::SessionEvent;
use super::message::Message;

const HOST_KEY_PROMPT_TIMEOUT: Duration = Duration::from_secs(300);

pub type PendingHostKeys = Arc<Mutex<HashMap<String, oneshot::Sender<bool>>>>;

pub type EventSink = Arc<dyn Fn(SessionEvent) + Send + Sync>;

pub struct ClientHandler {
    pub session_id: String,
    pub host: String,
    pub port: u16,
    pub known_hosts: PathBuf,
    pub events: EventSink,
    pub pending_host_keys: PendingHostKeys,
}

impl ClientHandler {
    async fn ask_user(&self, algorithm: String, fingerprint: String) -> bool {
        let (sender, receiver) = oneshot::channel();
        self.pending_host_keys
            .lock()
            .unwrap_or_else(PoisonError::into_inner)
            .insert(self.session_id.clone(), sender);
        (self.events)(SessionEvent::HostKeyPrompt {
            algorithm,
            fingerprint,
        });
        let accepted = matches!(
            tokio::time::timeout(HOST_KEY_PROMPT_TIMEOUT, receiver).await,
            Ok(Ok(true))
        );
        self.pending_host_keys
            .lock()
            .unwrap_or_else(PoisonError::into_inner)
            .remove(&self.session_id);
        accepted
    }

    fn progress(&self, message: Message) {
        (self.events)(SessionEvent::Progress { message });
    }
}

impl client::Handler for ClientHandler {
    type Error = HandlerError;

    async fn check_server_key(
        &mut self,
        server_public_key: &PublicKeyOrCertificate,
    ) -> Result<bool, Self::Error> {
        let PublicKeyOrCertificate::PublicKey { key, .. } = server_public_key else {
            return Err(HandlerError::HostCertificateUnsupported);
        };
        let fingerprint = key.fingerprint(HashAlg::Sha256).to_string();

        match known_hosts::check_known_hosts_path(&self.host, self.port, key, &self.known_hosts) {
            Ok(true) => Ok(true),
            Err(russh::keys::Error::KeyChanged { line }) => {
                Err(HandlerError::HostKeyChanged { line, fingerprint })
            }
            Ok(false) | Err(_) => {
                if !self
                    .ask_user(key.algorithm().as_str().to_string(), fingerprint)
                    .await
                {
                    return Err(HandlerError::HostKeyRejected);
                }
                match known_hosts::learn_known_hosts_path(
                    &self.host,
                    self.port,
                    key,
                    &self.known_hosts,
                ) {
                    Ok(()) => self.progress(Message::HostKeyLearned),
                    Err(error) => self.progress(Message::HostKeyNotSaved {
                        detail: error.to_string(),
                    }),
                }
                Ok(true)
            }
        }
    }
}
