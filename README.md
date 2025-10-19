
# MCPM — Minecraft Package Manager

**MCPM** is a cross-platform **package manager for Minecraft** mods, written in **Rust** with a future **Tauri + Vue.js** GUI.  
It automates downloading, updating, and managing Minecraft mods — like `npm` or `cargo`, but for Minecraft.

> Hobby project in active development. Expect breaking changes.

---

## Features

- **CLI-first** tool built with [Clap](https://github.com/clap-rs/clap)
- **Mod management** via Modrinth API  
  - `mcpm add` — add a mod to your manifest  
  - `mcpm remove` — remove a mod  
  - `mcpm install` — install or update all mods  
  - `mcpm upgrade` — upgrade mods to newer compatible versions  
  - `mcpm outdated` — check which mods are outdated  
  - `mcpm search` — find mods interactively
- **Lockfile system** (`mcpm.lock`) for reproducible installs
- **Semantic versioning** support (`^1.2`, `>=1.20`, etc.)
- **Offline caching** of downloaded mods
- **Cross-platform** (Windows, macOS, Linux)
- **Planned:**  
  - More sources like Curseforge, Github, Gitlab
  - Resource pack management  
  - Datapack management  
  - Shader and texture pack support  
  - Graphical interface via Tauri (Vue.js frontend)

---

## Quick Start

You can use MCPM without building it yourself.

### Option 1 — Download a Prebuilt Binary
Head to the [**Releases page**](../../releases) and download the latest binary for your platform.

### Option 2 — Use Docker

```bash
# Pull the latest image
docker pull ghcr.io/RWConnected/mcpm:latest

# Run MCPM in a container (mount your modpack folder)
docker run -it -v $(pwd):/data ghcr.io/RWConnected/mcpm:latest mcpm init
```

Both binaries and Docker images include the CLI by default.

### Option 3 — Building from Source

If you want to install MCPM on your system without using a prebuilt binary or Docker, you can build it directly from source using Cargo.

#### Prerequisites
- [Rust toolchain](https://rustup.rs/)

#### Build and Run

```bash
git clone https://github.com/RWConnected/mcpm.git
cd mcpm
cargo install --path src-tauri
```

This will:
- Compile MCPM in release mode
- Install the binaries (mcpm and mcpm-cli) into ~/.cargo/bin
- Make them available globally (ensure ~/.cargo/bin is in your PATH)

You can then run:

```bash
mcpm-cli --help
```

---

## Contributing

MCPM is a personal hobby project.
Ideas, bug reports, and pull requests are very welcome — they help shape the tool and inspire new directions.

That said, please note:
- This is not my main focus, so reviews or responses may take time.
- Contributions might be declined if they don’t align with the project’s direction or goals.
- To avoid wasted effort, it’s best to open an issue first to discuss major ideas before starting work.

Even if a contribution isn’t merged, your input is still appreciated — it helps improve MCPM over time.

### Prerequisites
- [Rust toolchain](https://rustup.rs/)
- Optionally: [Yarn](https://yarnpkg.com/) for the Vue.JS frontend (Not yet implemented)

### Build and Run Locally

```bash
git clone https://github.com/RWConnected/mcpm.git
cd mcpm/src-tauri
cargo run --bin mcpm-cli -- <command> [options]
```

Example:
```bash
cargo run --bin mcpm-cli -- add sodium --search
```

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Vue - Official](https://marketplace.visualstudio.com/items?itemName=Vue.volar) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

### 🗂 Project Structure

| Path                             | Purpose                                                             |
|----------------------------------|---------------------------------------------------------------------|
| `src-tauri/src/`                 | Frontend (Vue.js) code                                              |
| `src-tauri/src/app/commands`     | Entrypoint for every command                                        |
| `src-tauri/src/app/modules`      | Modules that encapsulate specific functionality                     |
| `src-tauri/src/app/modules/core` | Core logic used by both CLI and GUI                                 |
| `src-tauri/src/app/helpers`      | Shared helper functions that as haven't found its way into a module |
| `src-tauri/src/app`              | Core logic (manifest, repositories, I/O, commands)                  |
| `src-tauri/src/bin/cli.rs`       | Entrypoint for standalone CLI binary                                |
| `src-tauri/src/main.rs`          | Tauri entrypoint (CLI + GUI)                                        |

---

## License

This project is licensed under the **Apache License, Version 2.0**.  
You may use, modify, and distribute the software in compliance with that license.
See the [LICENSE](./LICENSE) file for details.
