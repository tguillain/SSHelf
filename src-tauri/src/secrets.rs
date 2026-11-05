use keyring::Entry;

const SERVICE: &str = "SSHelf";

pub fn read(account: &str) -> Option<String> {
    Entry::new(SERVICE, account).ok()?.get_password().ok()
}

pub fn store(account: &str, secret: &str) -> Result<(), String> {
    Entry::new(SERVICE, account)
        .and_then(|entry| entry.set_password(secret))
        .map_err(|error| error.to_string())
}

pub fn forget(account: &str) {
    if let Ok(entry) = Entry::new(SERVICE, account) {
        let _ = entry.delete_credential();
    }
}
