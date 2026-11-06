use serde::Serialize;

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(tag = "key", rename_all = "camelCase", rename_all_fields = "camelCase")]
pub enum Message {
    Connecting {
        host: String,
        port: u16,
    },
    Authenticating {
        user: String,
    },
    HostKeyLearned,
    HostKeyNotSaved {
        detail: String,
    },
    NetworkError {
        detail: String,
    },
    ClosedByServer,
    ServerUnresponsive,
    ProtocolError {
        detail: String,
    },
    HostKeyRejected,
    HostKeyChanged {
        fingerprint: String,
        line: usize,
    },
    HostCertificateUnsupported,
    HomeNotFound,
    PasswordNeeded {
        user: String,
        host: String,
    },
    PasswordRejected,
    KeyNotFound {
        path: String,
    },
    PassphraseNeeded {
        key_name: String,
    },
    PassphraseRejected,
    KeyUnreadable {
        key_name: String,
        detail: String,
    },
    KeyRejected {
        key_name: String,
        user: String,
    },
    AgentError {
        detail: String,
    },
    AgentKeysRejected {
        user: String,
    },
    AgentUnreachable,
    TcpTimeout {
        host: String,
        port: u16,
    },
    TcpUnreachable {
        host: String,
        port: u16,
        detail: String,
    },
    HandshakeTimeout,
    SessionExited {
        status: u32,
    },
    ConnectionLost,
    SessionEnded,
    SessionClosed,
}

#[cfg(test)]
mod tests {
    use super::Message;

    #[test]
    fn messages_serialize_with_camel_case_key_and_fields() {
        let message = Message::KeyUnreadable {
            key_name: "id_ed25519".into(),
            detail: "bad format".into(),
        };
        assert_eq!(
            serde_json::to_value(message).expect("serializable message"),
            serde_json::json!({ "key": "keyUnreadable", "keyName": "id_ed25519", "detail": "bad format" })
        );
        assert_eq!(
            serde_json::to_value(Message::HostKeyLearned).expect("serializable message"),
            serde_json::json!({ "key": "hostKeyLearned" })
        );
    }
}
