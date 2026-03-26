# ByPass Cleaner

<p align="center">
  Desktop utility for safe and fast file cleanup with preview mode, live metrics, and multilingual UI.
</p>

<p align="center">
  <img alt="Rust" src="https://img.shields.io/badge/Rust-1.77+-CE422B?logo=rust&logoColor=white">
  <img alt="UI" src="https://img.shields.io/badge/UI-HTML%2FJS%20+%20Tauri-FFC700?logo=tauri&logoColor=white">
  <img alt="Platform" src="https://img.shields.io/badge/Platform-Windows-0078D6?logo=windows&logoColor=white">
  <img alt="License" src="https://img.shields.io/badge/License-Private-lightgrey">
</p>

---

## ✨ Features

- 🧭 Modern web UI (Tauri + WebView2)
- 🔍 **Preview mode** (dry-run) before deleting files
- ⚙️ Flexible filters:
  - file age (days)
  - minimum size
  - extension list (e.g. `.log,.tmp,.bak`)
- 📁 Multi-folder cleanup with optional recursive scan
- 🛡️ Safety checks for protected/system locations
- 📊 Live dashboard: scanned / matched / deleted / freed space
- 🧾 Session logs with export support
- 🌐 Built-in localization and theme support + animations

---

## 🖼 Interface

Current layout:

- modern dark/light theme with accent colors
- cleanup filters + folder selection controls
- live preview/details/log panels with streaming updates
- settings with theme and language controls
- smooth animations and glassmorphism effects
- icons and responsive grid layout

> Tip: if Windows shows an old icon in taskbar or Explorer, clear icon cache or rename the executable once.

---

## 🚀 Quick Start (dev)

### 1) Install Rust

```powershell
# Download from https://rustup.rs/ or run if already installed
rustup update
```

### 2) Build and run

```powershell
cargo tauri dev
```

---

## 📦 Build Release

From project root:

```powershell
cargo tauri build
```

Output:

- Portable EXE: `src-tauri/target/release/ByPass Cleaner.exe`
- NSIS Installer: `src-tauri/target/release/bundle/nsis/ByPass Cleaner_1.0.0_x64-setup.exe`
- MSI Installer: `src-tauri/target/release/bundle/msi/ByPass Cleaner_1.0.0_x64_en-US.msi`

---

## 🧱 Project Structure

```text
ByPass_Cleaner/
├─ src-tauri/
│  ├─ src/
│  │  ├─ lib.rs       (IPC + cleanup engine)
│  │  └─ main.rs      (entry point)
│  ├─ Cargo.toml
│  ├─ tauri.conf.json
│  ├─ icons/
│  ├─ capabilities/
│  └─ target/         (build output)
├─ webui/
│  └─ index.html      (HTML/CSS/JS UI)
├─ Installer/
│  ├─ ByPass Cleaner.iss  (Inno Setup config)
│  └─ build_setup.ps1
├─ README.md
```

---

## 🛠 Notes

- Main UI is implemented in `webui/index.html` (HTML/CSS/vanilla JS).
- Cleanup engine + IPC is implemented in `src-tauri/src/lib.rs`.
- Frontend-backend communication uses Tauri `invoke()` and `event.listen()`.
- Icons are bundled in `src-tauri/icons/` and auto-embedded during build.
- Settings stored in `qt_settings.json` (adjacent to executable).

---

## 🔐 Process Safety Tools

- Read-only process inventory via `list_processes`
- Detailed process inspection with SHA256 via `get_process_info`
- Quarantine flow via `quarantine_path` with restore support
- Deletion scheduling on reboot via `schedule_delete_on_reboot` on Windows
- Append-only audit trail in `audit-log.jsonl`
- No force-kill or force-delete is executed by the main app

Safe flow:

- read-only inspection
- quarantine
- restore if needed
- schedule delete on reboot
- optional future elevation helper for force actions

Example calls from the web UI:

```js
await post("list_processes", {});
await post("get_process_info", { pid: 1234 });
await post("quarantine_path", { path: "C:\\temp\\bad.exe", reason: "susp" });
await post("schedule_delete_on_reboot", { path: "C:\\temp\\bad.exe" });
await post("request_force_action", { action: "force_kill", target: "pid:1234" });
```

---

## 🧹 Optional: Clean Up Old Python Files

If you migrated from the previous Python+Qt version and want to clean up:

```powershell
Remove-Item -Path "Utils", "dist", "build", ".venv", "*.spec" -Recurse -Force
```

---

## 📬 Support

- Check on https://metsuwuki.github.io/animesite/

---

<p align="center"><sub>Built with Python + PySide6 (Qt)</sub></p>
