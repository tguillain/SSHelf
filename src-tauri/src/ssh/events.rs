use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum SessionEvent {
    Progress { message: String },
    HostKeyPrompt { algorithm: String, fingerprint: String },
    Closed { reason: String },
}
