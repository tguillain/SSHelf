use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

const STORE_FILE: &str = "connections.json";

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Environment {
    Prod,
    Staging,
    Perso,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum AuthMethod {
    Key,
    Password,
    Agent,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct Connection {
    pub id: String,
    pub name: String,
    pub user: String,
    pub host: String,
    pub port: u16,
    pub environment: Environment,
    pub auth: AuthMethod,
    pub key_name: String,
}

fn store_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|error| error.to_string())?;
    fs::create_dir_all(&dir).map_err(|error| error.to_string())?;
    Ok(dir.join(STORE_FILE))
}

#[tauri::command]
pub fn load_connections(app: AppHandle) -> Result<Vec<Connection>, String> {
    let path = store_path(&app)?;
    if !path.exists() {
        return Ok(Vec::new());
    }
    let raw = fs::read_to_string(&path).map_err(|error| error.to_string())?;
    serde_json::from_str(&raw).map_err(|error| format!("{STORE_FILE} is unreadable: {error}"))
}

#[tauri::command]
pub fn save_connections(app: AppHandle, connections: Vec<Connection>) -> Result<(), String> {
    let path = store_path(&app)?;
    let raw = serde_json::to_string_pretty(&connections).map_err(|error| error.to_string())?;
    let temporary = path.with_extension("json.tmp");
    fs::write(&temporary, raw).map_err(|error| error.to_string())?;
    fs::rename(&temporary, &path).map_err(|error| error.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn connection_round_trips_with_camel_case_fields() {
        let json = r#"{"id":"1","name":"web","user":"deploy","host":"10.0.0.1","port":2222,"environment":"prod","auth":"key","keyName":"id_ed25519"}"#;
        let connection: Connection = serde_json::from_str(json).unwrap();
        assert_eq!(connection.environment, Environment::Prod);
        assert_eq!(connection.auth, AuthMethod::Key);
        assert_eq!(connection.port, 2222);
        assert_eq!(serde_json::to_string(&connection).unwrap(), json);
    }
}
