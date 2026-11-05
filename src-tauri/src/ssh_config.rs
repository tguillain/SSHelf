use serde::Serialize;
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Default, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ImportedHost {
    pub alias: String,
    pub host_name: Option<String>,
    pub user: Option<String>,
    pub port: Option<u16>,
    pub identity_file: Option<String>,
}

fn ssh_dir() -> Result<PathBuf, String> {
    std::env::var_os("USERPROFILE")
        .or_else(|| std::env::var_os("HOME"))
        .map(|home| PathBuf::from(home).join(".ssh"))
        .ok_or_else(|| "dossier utilisateur introuvable".to_string())
}

#[tauri::command]
pub fn import_ssh_config() -> Result<Vec<ImportedHost>, String> {
    let path = ssh_dir()?.join("config");
    if !path.exists() {
        return Ok(Vec::new());
    }
    let raw = fs::read_to_string(&path).map_err(|error| error.to_string())?;
    Ok(parse_ssh_config(&raw))
}

#[tauri::command]
pub fn list_private_keys() -> Result<Vec<String>, String> {
    let dir = ssh_dir()?;
    if !dir.exists() {
        return Ok(Vec::new());
    }
    let mut keys: Vec<String> = fs::read_dir(&dir)
        .map_err(|error| error.to_string())?
        .filter_map(Result::ok)
        .filter_map(|entry| entry.file_name().into_string().ok())
        .filter(|name| !name.ends_with(".pub") && dir.join(format!("{name}.pub")).exists())
        .collect();
    keys.sort();
    Ok(keys)
}

fn split_directive(line: &str) -> (&str, &str) {
    let end = line
        .find(|character: char| character.is_whitespace() || character == '=')
        .unwrap_or(line.len());
    let value = line[end..]
        .trim_start_matches(|character: char| character.is_whitespace() || character == '=')
        .trim()
        .trim_matches('"');
    (&line[..end], value)
}

fn is_concrete_alias(alias: &str) -> bool {
    !alias.contains(['*', '?']) && !alias.starts_with('!')
}

pub fn parse_ssh_config(raw: &str) -> Vec<ImportedHost> {
    let mut hosts = Vec::new();
    let mut current: Vec<ImportedHost> = Vec::new();

    for line in raw.lines().map(str::trim) {
        if line.is_empty() || line.starts_with('#') {
            continue;
        }
        let (key, value) = split_directive(line);
        match key.to_ascii_lowercase().as_str() {
            "host" => {
                hosts.append(&mut current);
                current = value
                    .split_whitespace()
                    .filter(|alias| is_concrete_alias(alias))
                    .map(|alias| ImportedHost {
                        alias: alias.to_string(),
                        ..ImportedHost::default()
                    })
                    .collect();
            }
            "match" => hosts.append(&mut current),
            "hostname" => current
                .iter_mut()
                .for_each(|host| host.host_name = Some(value.to_string())),
            "user" => current
                .iter_mut()
                .for_each(|host| host.user = Some(value.to_string())),
            "port" => {
                let port = value.parse().ok();
                current.iter_mut().for_each(|host| host.port = port);
            }
            "identityfile" => current
                .iter_mut()
                .for_each(|host| host.identity_file = Some(value.to_string())),
            _ => {}
        }
    }
    hosts.append(&mut current);
    hosts
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_hosts_with_their_options() {
        let raw = "\
# commentaire
Host web-prod
    HostName 10.0.1.21
    User deploy
    Port 2222
    IdentityFile ~/.ssh/prod_rsa

Host pi
  HostName=192.168.1.42
  User pi
";
        let hosts = parse_ssh_config(raw);
        assert_eq!(hosts.len(), 2);
        assert_eq!(
            hosts[0],
            ImportedHost {
                alias: "web-prod".into(),
                host_name: Some("10.0.1.21".into()),
                user: Some("deploy".into()),
                port: Some(2222),
                identity_file: Some("~/.ssh/prod_rsa".into()),
            }
        );
        assert_eq!(hosts[1].host_name.as_deref(), Some("192.168.1.42"));
        assert_eq!(hosts[1].port, None);
    }

    #[test]
    fn skips_wildcards_and_applies_options_to_every_alias() {
        let raw = "Host *\n  User root\nHost a b\n  User admin\nMatch host c\n  User ignored\n";
        let hosts = parse_ssh_config(raw);
        let aliases: Vec<&str> = hosts.iter().map(|host| host.alias.as_str()).collect();
        assert_eq!(aliases, ["a", "b"]);
        assert!(hosts.iter().all(|host| host.user.as_deref() == Some("admin")));
    }
}
