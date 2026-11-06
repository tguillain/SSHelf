use serde::Serialize;

use super::message::Message;

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum ErrorCode {
    PasswordRequired,
    PassphraseRequired,
    AuthFailed,
    HostKeyRejected,
    HostKeyChanged,
    Timeout,
    Network,
    Agent,
    Key,
    Protocol,
}

#[derive(Debug, Serialize)]
pub struct ConnectError {
    pub code: ErrorCode,
    pub message: Message,
}

impl ConnectError {
    pub fn new(code: ErrorCode, message: Message) -> Self {
        Self { code, message }
    }
}

#[derive(Debug)]
pub enum HandlerError {
    Ssh(russh::Error),
    HostKeyRejected,
    HostKeyChanged { line: usize, fingerprint: String },
    HostCertificateUnsupported,
}

impl From<russh::Error> for HandlerError {
    fn from(error: russh::Error) -> Self {
        Self::Ssh(error)
    }
}

impl From<russh::Error> for ConnectError {
    fn from(error: russh::Error) -> Self {
        match error {
            russh::Error::IO(io) => ConnectError::new(
                ErrorCode::Network,
                Message::NetworkError {
                    detail: io.to_string(),
                },
            ),
            russh::Error::HUP | russh::Error::Disconnect => {
                ConnectError::new(ErrorCode::Network, Message::ClosedByServer)
            }
            russh::Error::KeepaliveTimeout
            | russh::Error::InactivityTimeout
            | russh::Error::ConnectionTimeout => {
                ConnectError::new(ErrorCode::Timeout, Message::ServerUnresponsive)
            }
            other => ConnectError::new(
                ErrorCode::Protocol,
                Message::ProtocolError {
                    detail: other.to_string(),
                },
            ),
        }
    }
}

impl From<HandlerError> for ConnectError {
    fn from(error: HandlerError) -> Self {
        match error {
            HandlerError::Ssh(ssh) => ssh.into(),
            HandlerError::HostKeyRejected => {
                ConnectError::new(ErrorCode::HostKeyRejected, Message::HostKeyRejected)
            }
            HandlerError::HostKeyChanged { line, fingerprint } => ConnectError::new(
                ErrorCode::HostKeyChanged,
                Message::HostKeyChanged { fingerprint, line },
            ),
            HandlerError::HostCertificateUnsupported => {
                ConnectError::new(ErrorCode::Protocol, Message::HostCertificateUnsupported)
            }
        }
    }
}
