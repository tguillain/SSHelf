<div align="center">

# SSHelf

**Vos serveurs SSH, rangés sur une étagère. Un clic, vous y êtes.**

Un client SSH de bureau léger et moderne : vos connexions mémorisées, ouvertes en un clic,
toutes réunies en onglets dans une seule fenêtre.

[![Release](https://github.com/tguillain/SSHelf/actions/workflows/release.yml/badge.svg)](https://github.com/tguillain/SSHelf/actions/workflows/release.yml)
[![Dernière version](https://img.shields.io/github/v/release/tguillain/SSHelf?label=version)](https://github.com/tguillain/SSHelf/releases/latest)
![Plateformes](https://img.shields.io/badge/plateformes-Windows%20%7C%20macOS%20%7C%20Linux-informational)
![Rust](https://img.shields.io/badge/c%C5%93ur%20SSH-Rust-dea584?logo=rust)
![Tauri](https://img.shields.io/badge/Tauri-2-24c8db?logo=tauri)

[**Télécharger**](https://github.com/tguillain/SSHelf/releases/latest) ·
[Fonctionnalités](#fonctionnalités) ·
[Feuille de route](#feuille-de-route) ·
[Contribuer](#contribuer)

</div>

---

## Pourquoi SSHelf ?

Retaper `ssh deploy@web-prod-02 -p 2222` pour la centième fois, jongler entre dix fenêtres
de terminal, se demander si on est bien sur la préprod avant de lancer une commande…
SSHelf range tout ça.

- **Léger pour de vrai** : un installeur de **2,4 Mo** et environ **30 Mo de mémoire** au
  démarrage. Pas d'Electron, pas de navigateur embarqué de 150 Mo : SSHelf s'appuie sur la
  WebView du système.
- **Un moteur SSH écrit en Rust** : la connexion passe par [russh](https://github.com/Eugeny/russh),
  une implémentation SSH native, sans dépendre d'OpenSSH ni de PuTTY.
- **Pensé pour ceux qui gèrent des dizaines de serveurs** : tout est classé par environnement,
  et la production se voit tout de suite.

## Fonctionnalités

### Vos connexions, à portée de clic
- Connexions mémorisées et **classées par environnement** : production, préproduction, perso.
- **Recherche instantanée** (<kbd>Ctrl</kbd>+<kbd>K</kbd>) pour retrouver un serveur parmi des dizaines.
- **Import de `~/.ssh/config`** : vos hôtes existants arrivent en un clic.

### Plusieurs sessions, une seule fenêtre
- Chaque connexion s'ouvre dans un **onglet** ; clic molette pour le fermer.
- **Vue partagée** pour garder deux serveurs côte à côte.
- Connexion perdue ? <kbd>Entrée</kbd> pour **se reconnecter**.

### Un vrai terminal
- Rendu **xterm.js accéléré par WebGL** : couleurs 256, `vim`, `htop`, `tmux` s'affichent comme il faut.
- Redimensionnement automatique, 10 000 lignes d'historique, police JetBrains Mono.

### Sécurité d'abord
- **Vérification des clés d'hôte** via votre `~/.ssh/known_hosts` : confirmation au premier
  contact, connexion **bloquée** si la clé du serveur change.
- **Mots de passe et phrases de passe dans le trousseau du système** (Gestionnaire
  d'identification Windows, Trousseau macOS, Secret Service sous Linux), jamais en clair sur le disque.
- Authentification par **mot de passe**, **clé privée** (chiffrée ou non) ou **agent SSH**
  (OpenSSH, Pageant).
- **Bandeau d'alerte** sur les serveurs de production : impossible d'oublier où l'on tape.

## Installation

Téléchargez l'installeur de votre système sur la
[page des releases](https://github.com/tguillain/SSHelf/releases/latest).

| Système | Fichier |
|---|---|
| Windows 10 / 11 | `SSHelf_x.y.z_x64-setup.exe` (sans droits administrateur) ou `.msi` |
| macOS Apple Silicon | `SSHelf_x.y.z_aarch64.dmg` |
| macOS Intel | `SSHelf_x.y.z_x64.dmg` |
| Linux | `.AppImage`, `.deb` ou `.rpm` |

> [!NOTE]
> Les premières versions ne sont pas encore signées.
> **Windows** affiche « éditeur inconnu » : cliquez sur *Informations complémentaires*,
> puis *Exécuter quand même*.
> **macOS** bloque l'ouverture : faites un clic droit sur l'application, puis *Ouvrir*.

## Feuille de route

SSHelf démarre ; voici les pistes pour la suite :

- [ ] Palette de commandes complète (<kbd>Ctrl</kbd>+<kbd>K</kbd> pour ouvrir, se connecter, basculer d'onglet)
- [ ] Transfert de fichiers **SFTP** en glisser-déposer
- [ ] **Tunnels** et redirections de ports
- [ ] Thème clair et page de réglages
- [ ] Installeurs signés et mises à jour automatiques

Une idée, un besoin ? [Ouvrez une issue](https://github.com/tguillain/SSHelf/issues) :
c'est le meilleur moment pour influencer la direction du projet.

## Développer

**Prérequis** : [Node.js](https://nodejs.org) 22+, [Rust](https://rustup.rs) stable, et les
[dépendances système de Tauri](https://tauri.app/start/prerequisites/) pour votre OS.

```bash
git clone https://github.com/tguillain/SSHelf.git
cd SSHelf
npm install
npm run tauri dev
```

| Commande | Rôle |
|---|---|
| `npm run tauri dev` | Lance l'application avec rechargement à chaud |
| `npm run tauri build` | Produit les installeurs dans `src-tauri/target/release/bundle/` |
| `cargo test` (dans `src-tauri/`) | Tests Rust, dont un vrai serveur SSH en mémoire |

### Sous le capot

| Couche | Technologie |
|---|---|
| Application | [Tauri 2](https://tauri.app) |
| Moteur SSH | [russh](https://github.com/Eugeny/russh) (Rust, cryptographie *ring*) |
| Secrets | [keyring](https://crates.io/crates/keyring) |
| Interface | React 19, TypeScript, Vite |
| Terminal | [xterm.js](https://xtermjs.org) avec rendu WebGL |

### Publier une version

1. Incrémenter la version dans `package.json` et `src-tauri/tauri.conf.json`.
2. Pousser un tag : `git tag v0.2.0 && git push origin v0.2.0`.
3. GitHub Actions lance les tests, compile les installeurs des trois plateformes et prépare
   une release en brouillon, à publier depuis l'onglet *Releases*.

## Contribuer

Les retours sont les bienvenus, même les plus petits : un bug, une gêne au quotidien, une idée
de fonctionnalité. Ouvrez une [issue](https://github.com/tguillain/SSHelf/issues) ou proposez
directement une pull request.

Si SSHelf vous fait gagner du temps, une ⭐ sur le dépôt aide le projet à se faire connaître.
