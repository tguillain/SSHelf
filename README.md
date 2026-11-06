<div align="center">

# SSHelf

**Your SSH servers, neatly shelved. One click and you're in.**

A lightweight, modern desktop SSH client: your connections saved, opened in a single click,
all gathered as tabs in one window.

[![Release](https://github.com/tguillain/SSHelf/actions/workflows/release.yml/badge.svg)](https://github.com/tguillain/SSHelf/actions/workflows/release.yml)
[![Latest version](https://img.shields.io/github/v/release/tguillain/SSHelf?label=version)](https://github.com/tguillain/SSHelf/releases/latest)
![Platforms](https://img.shields.io/badge/platforms-Windows%20%7C%20macOS%20%7C%20Linux-informational)
![Rust](https://img.shields.io/badge/SSH%20core-Rust-dea584?logo=rust)
![Tauri](https://img.shields.io/badge/Tauri-2-24c8db?logo=tauri)

[**Download**](https://github.com/tguillain/SSHelf/releases/latest) ·
[Features](#features) ·
[Roadmap](#roadmap) ·
[Contributing](#contributing)

</div>

---

## Why SSHelf?

Typing `ssh deploy@web-prod-02 -p 2222` for the hundredth time, juggling ten terminal windows,
double-checking you're really on staging before running that command…
SSHelf puts all of that on a shelf.

- **Genuinely lightweight**: a **2.4 MB** installer and around **30 MB of memory** at startup.
  No Electron, no bundled 150 MB browser: SSHelf uses the operating system's own WebView.
- **An SSH engine written in Rust**: connections go through [russh](https://github.com/Eugeny/russh),
  a native SSH implementation, with no dependency on OpenSSH or PuTTY.
- **Built for people who manage dozens of servers**: everything is grouped by environment,
  and production stands out at a glance.

## Features

### Your connections, one click away
- Saved connections **grouped by environment**: production, staging, personal.
- **Instant search** (<kbd>Ctrl</kbd>+<kbd>K</kbd>) to find one server among dozens.
- **Import from `~/.ssh/config`**: bring your existing hosts in with one click.

### Many sessions, one window
- Each connection opens in its own **tab**; middle-click to close it.
- **Split view** to keep two servers side by side.
- Connection dropped? Press <kbd>Enter</kbd> to **reconnect**.

### A real terminal
- **WebGL-accelerated xterm.js** rendering: 256 colours, and `vim`, `htop` and `tmux` display properly.
- Automatic resizing, 10,000 lines of scrollback, JetBrains Mono font.

### Security first
- **Host key verification** against your `~/.ssh/known_hosts`: confirmation on first contact,
  connection **blocked** if the server's key changes.
- **Passwords and passphrases stored in the system keychain** (Windows Credential Manager,
  macOS Keychain, Secret Service on Linux), never in plain text on disk.
- Authentication by **password**, **private key** (encrypted or not) or **SSH agent**
  (OpenSSH, Pageant).
- **Warning banner** on production servers, so you always know where you're typing.

> [!NOTE]
> The interface is currently in French. An English translation is on the [roadmap](#roadmap).

## Installation

Download the installer for your system from the
[releases page](https://github.com/tguillain/SSHelf/releases/latest).

| System | File |
|---|---|
| Windows 10 / 11 | `SSHelf_x.y.z_x64-setup.exe` (no admin rights needed) or `.msi` |
| macOS Apple Silicon | `SSHelf_x.y.z_aarch64.dmg` |
| macOS Intel | `SSHelf_x.y.z_x64.dmg` |
| Linux | `.AppImage`, `.deb` or `.rpm` |

> [!NOTE]
> Early releases are not code-signed yet.
> **Windows** shows "Unknown publisher": click *More info*, then *Run anyway*.
> **macOS** blocks the app on first launch: right-click it, then choose *Open*.

## Roadmap

SSHelf is just getting started. Here's what's next:

- [ ] English interface
- [ ] Full command palette (<kbd>Ctrl</kbd>+<kbd>K</kbd> to open, connect, switch tabs)
- [ ] Drag-and-drop **SFTP** file transfer
- [ ] **Tunnels** and port forwarding
- [ ] Light theme and a settings page
- [ ] Signed installers and automatic updates

Got an idea or a need? [Open an issue](https://github.com/tguillain/SSHelf/issues):
now is the best time to shape where the project goes.

## Development

**Prerequisites**: [Node.js](https://nodejs.org) 22+, stable [Rust](https://rustup.rs), and the
[Tauri system dependencies](https://tauri.app/start/prerequisites/) for your OS.

```bash
git clone https://github.com/tguillain/SSHelf.git
cd SSHelf
npm install
npm run tauri dev
```

| Command | What it does |
|---|---|
| `npm run tauri dev` | Runs the app with hot reload |
| `npm run tauri build` | Builds the installers into `src-tauri/target/release/bundle/` |
| `cargo test` (in `src-tauri/`) | Rust tests, including a real in-memory SSH server |

### Under the hood

| Layer | Technology |
|---|---|
| App shell | [Tauri 2](https://tauri.app) |
| SSH engine | [russh](https://github.com/Eugeny/russh) (Rust, *ring* cryptography) |
| Secrets | [keyring](https://crates.io/crates/keyring) |
| Interface | React 19, TypeScript, Vite |
| Terminal | [xterm.js](https://xtermjs.org) with WebGL rendering |

### Releasing a version

1. Bump the version in `package.json` and `src-tauri/tauri.conf.json`.
2. Push a tag: `git tag v0.2.0 && git push origin v0.2.0`.
3. GitHub Actions runs the tests, builds the installers for all three platforms and prepares
   a draft release, ready to publish from the *Releases* tab.

## Contributing

Feedback of any size is welcome: a bug, a daily annoyance, a feature idea.
Open an [issue](https://github.com/tguillain/SSHelf/issues) or send a pull request directly.

If SSHelf saves you time, a ⭐ on the repo helps the project get noticed.
