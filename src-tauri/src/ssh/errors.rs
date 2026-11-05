use serde::Serialize;

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
    pub message: String,
}

impl ConnectError {
    pub fn new(code: ErrorCode, message: impl Into<String>) -> Self {
        Self {
            code,
            message: message.into(),
        }
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
            russh::Error::IO(io) => ConnectError::new(ErrorCode::Network, format!("Erreur réseau : {io}")),
            russh::Error::HUP | russh::Error::Disconnect => {
                ConnectError::new(ErrorCode::Network, "Connexion fermée par le serveur")
            }
            russh::Error::KeepaliveTimeout | russh::Error::InactivityTimeout | russh::Error::ConnectionTimeout => {
                ConnectError::new(ErrorCode::Timeout, "Le serveur ne répond plus")
            }
            other => ConnectError::new(ErrorCode::Protocol, format!("Erreur SSH : {other}")),
        }
    }
}

impl From<HandlerError> for ConnectError {
    fn from(error: HandlerError) -> Self {
        match error {
            HandlerError::Ssh(ssh) => ssh.into(),
            HandlerError::HostKeyRejected => {
                ConnectError::new(ErrorCode::HostKeyRejected, "Empreinte du serveur refusée")
            }
            HandlerError::HostKeyChanged { line, fingerprint } => ConnectError::new(
                ErrorCode::HostKeyChanged,
                format!(
                    "ATTENTION : la clé du serveur a changé ({fingerprint}). Elle ne correspond plus à la ligne {line} de ~/.ssh/known_hosts. Connexion bloquée : vérifiez auprès de l’administrateur avant de supprimer l’ancienne entrée."
                ),
            ),
            HandlerError::HostCertificateUnsupported => {
                ConnectError::new(ErrorCode::Protocol, "Les certificats d’hôte ne sont pas encore pris en charge")
            }
        }
    }
}
