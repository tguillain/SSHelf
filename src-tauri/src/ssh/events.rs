use serde::Serialize;

use super::message::Message;

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum SessionEvent {
    Progress {
        message: Message,
    },
    HostKeyPrompt {
        algorithm: String,
        fingerprint: String,
    },
    Closed {
        reason: Message,
    },
}
