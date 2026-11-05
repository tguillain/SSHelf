use std::path::PathBuf;
use std::sync::Arc;

use russh::client::Handle;
use russh::keys::agent::client::AgentClient;
use russh::keys::agent::AgentIdentity;
use russh::keys::{load_secret_key, PrivateKeyWithHashAlg};
use tokio::io::{AsyncRead, AsyncWrite};

use super::errors::{ConnectError, ErrorCode};
use super::handler::ClientHandler;
use crate::connections::{AuthMethod, Connection};
use crate::secrets;

#[cfg(windows)]
const OPENSSH_AGENT_PIPE: &str = r"\\.\pipe\openssh-ssh-agent";

pub struct Secret<'a> {
    pub value: Option<&'a str>,
    pub remember: bool,
}

pub async fn authenticate(
    handle: &mut Handle<ClientHandler>,
    connection: &Connection,
    secret: Secret<'_>,
) -> Result<(), ConnectError> {
    match connection.auth {
        AuthMethod::Password => with_password(handle, connection, secret).await,
        AuthMethod::Key => with_key(handle, connection, secret).await,
        AuthMethod::Agent => with_agent(handle, connection).await,
    }
}

fn password_account(connection: &Connection) -> String {
    format!("password:{}@{}:{}", connection.user, connection.host, connection.port)
}

fn passphrase_account(path: &std::path::Path) -> String {
    format!("passphrase:{}", path.display())
}

fn ssh_dir() -> Result<PathBuf, ConnectError> {
    std::env::var_os("USERPROFILE")
        .or_else(|| std::env::var_os("HOME"))
        .map(|home| PathBuf::from(home).join(".ssh"))
        .ok_or_else(|| ConnectError::new(ErrorCode::Key, "Dossier utilisateur introuvable"))
}

async fn with_password(
    handle: &mut Handle<ClientHandler>,
    connection: &Connection,
    secret: Secret<'_>,
) -> Result<(), ConnectError> {
    let account = password_account(connection);
    let stored = if secret.value.is_none() { secrets::read(&account) } else { None };
    let Some(password) = secret.value.map(str::to_string).or_else(|| stored.clone()) else {
        return Err(ConnectError::new(
            ErrorCode::PasswordRequired,
            format!("Mot de passe de {}@{}", connection.user, connection.host),
        ));
    };

    let result = handle.authenticate_password(&connection.user, &password).await?;
    if result.success() {
        if secret.remember && secret.value.is_some() {
            let _ = secrets::store(&account, &password);
        }
        return Ok(());
    }
    if stored.is_some() {
        secrets::forget(&account);
    }
    Err(ConnectError::new(ErrorCode::PasswordRequired, "Mot de passe refusé, réessayez"))
}

async fn with_key(
    handle: &mut Handle<ClientHandler>,
    connection: &Connection,
    secret: Secret<'_>,
) -> Result<(), ConnectError> {
    let path = ssh_dir()?.join(&connection.key_name);
    if !path.exists() {
        return Err(ConnectError::new(
            ErrorCode::Key,
            format!("Clé introuvable : {}", path.display()),
        ));
    }
    let account = passphrase_account(&path);
    let stored = if secret.value.is_none() { secrets::read(&account) } else { None };
    let passphrase = secret.value.map(str::to_string).or_else(|| stored.clone());

    let key = match load_secret_key(&path, passphrase.as_deref()) {
        Ok(key) => key,
        Err(_) if passphrase.is_some() => {
            if stored.is_some() {
                secrets::forget(&account);
            }
            return Err(ConnectError::new(ErrorCode::PassphraseRequired, "Phrase de passe incorrecte, réessayez"));
        }
        Err(russh::keys::Error::KeyIsEncrypted) => {
            return Err(ConnectError::new(
                ErrorCode::PassphraseRequired,
                format!("Phrase de passe de la clé {}", connection.key_name),
            ));
        }
        Err(error) => {
            return Err(ConnectError::new(
                ErrorCode::Key,
                format!("Impossible de lire la clé {} : {error}", connection.key_name),
            ));
        }
    };
    if secret.remember {
        if let Some(typed) = secret.value {
            let _ = secrets::store(&account, typed);
        }
    }

    let hash_alg = handle.best_supported_rsa_hash().await?.flatten();
    let result = handle
        .authenticate_publickey(&connection.user, PrivateKeyWithHashAlg::new(Arc::new(key), hash_alg))
        .await?;
    if result.success() {
        Ok(())
    } else {
        Err(ConnectError::new(
            ErrorCode::AuthFailed,
            format!("Clé {} refusée par le serveur pour {}", connection.key_name, connection.user),
        ))
    }
}

async fn try_agent<S>(
    handle: &mut Handle<ClientHandler>,
    user: &str,
    mut agent: AgentClient<S>,
) -> Result<bool, ConnectError>
where
    S: AsyncRead + AsyncWrite + Unpin + Send,
{
    let identities = agent
        .request_identities()
        .await
        .map_err(|error| ConnectError::new(ErrorCode::Agent, format!("Agent SSH : {error}")))?;
    let hash_alg = handle.best_supported_rsa_hash().await?.flatten();
    for identity in identities {
        let AgentIdentity::PublicKey { key, .. } = identity else {
            continue;
        };
        if let Ok(result) = handle.authenticate_publickey_with(user, key, hash_alg, &mut agent).await {
            if result.success() {
                return Ok(true);
            }
        }
    }
    Ok(false)
}

#[cfg(windows)]
async fn with_agent(handle: &mut Handle<ClientHandler>, connection: &Connection) -> Result<(), ConnectError> {
    let mut reachable = false;
    if let Ok(agent) = AgentClient::connect_named_pipe(OPENSSH_AGENT_PIPE).await {
        reachable = true;
        if try_agent(handle, &connection.user, agent).await? {
            return Ok(());
        }
    }
    if let Ok(agent) = AgentClient::connect_pageant().await {
        reachable = true;
        if try_agent(handle, &connection.user, agent).await? {
            return Ok(());
        }
    }
    Err(agent_failure(reachable, connection))
}

#[cfg(unix)]
async fn with_agent(handle: &mut Handle<ClientHandler>, connection: &Connection) -> Result<(), ConnectError> {
    let agent = AgentClient::connect_env().await;
    let reachable = agent.is_ok();
    if let Ok(agent) = agent {
        if try_agent(handle, &connection.user, agent).await? {
            return Ok(());
        }
    }
    Err(agent_failure(reachable, connection))
}

fn agent_failure(reachable: bool, connection: &Connection) -> ConnectError {
    if reachable {
        ConnectError::new(
            ErrorCode::AuthFailed,
            format!("Aucune clé de l’agent SSH n’a été acceptée pour {}", connection.user),
        )
    } else {
        ConnectError::new(
            ErrorCode::Agent,
            "Aucun agent SSH joignable (service OpenSSH Authentication Agent ou Pageant)",
        )
    }
}
