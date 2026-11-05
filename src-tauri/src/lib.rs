mod connections;
mod secrets;
mod ssh;
mod ssh_config;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(ssh::SshState::default())
        .invoke_handler(tauri::generate_handler![
            connections::load_connections,
            connections::save_connections,
            ssh_config::import_ssh_config,
            ssh_config::list_private_keys,
            ssh::session::ssh_connect,
            ssh::session::ssh_write,
            ssh::session::ssh_resize,
            ssh::session::ssh_close,
            ssh::session::ssh_answer_host_key
        ])
        .run(tauri::generate_context!())
        .expect("impossible de démarrer SSHelf");
}
