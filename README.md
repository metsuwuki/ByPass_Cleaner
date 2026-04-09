# ByPass Cleaner

ByPass Cleaner is a Windows desktop utility for preview-first cleanup, quarantine, process triage, and controlled file removal.

The project is built with Rust + Tauri and targets Windows 10/11.

## Implemented

- Preview-first cleanup via `dry-run` before actual deletion.
- Cleanup filters:
  - file age in days
  - minimum file size
  - extension allow-list such as `tmp`, `log`, `bak`
  - file name contains terms such as `cache`, `temp`, `dump`
  - exclude path tokens such as `Windows`, `Program Files`, `.quarantine`
- Recursive scan with optional subfolder traversal.
- Optional deletion of empty directories.
- Optional skip for hidden files and directories.
- Live progress updates, dashboard counters, runtime log stream, and JSON cleanup reports.
- Quarantine flow:
  - move file into isolated `.quarantine/files/`
  - SHA-256 calculation
  - manifest in `.quarantine/manifests/`
  - restore back to original path
- Process triage:
  - compact process list with risk ordering
  - path, command line, memory, CPU, start time
  - detailed process card with parent PID, SHA-256, and signature status
  - heuristic threat scoring
- Heuristic process families:
  - `miner`
  - `rat`
  - `trojan`
  - `suspicious`
- Aggressive delete flow for files:
  - standard delete attempt
  - attribute reset
  - staged rename into a pending-delete path
  - schedule delete on reboot if the file stays locked
- Process neutralize flow:
  - force-stop suspicious process tree
  - attempt quarantine of the executable
  - fallback to aggressive delete when quarantine cannot complete
- Audit log for sensitive actions such as quarantine, restore, reboot-delete, and aggressive delete.

## Important Limitations

ByPass Cleaner is not a full antivirus product and does not provide guaranteed malware detection.

The labels `miner`, `rat`, `trojan`, and `suspicious` are local heuristics for triage and investigation. They are not final malware verdicts.

Aggressive delete is also not a magical bypass. It helps with common file-lock and attribute-related cases, but it should not be treated as a way to bypass system protections, drivers, EDR, or protected OS objects.

## Typical Workflow

1. Select a target folder.
2. Configure cleanup filters.
3. Run `dry-run`.
4. Review matches, counters, and the generated report.
5. Run real cleanup only after verification.
6. If needed, use quarantine, process review, or aggressive delete.

## Build

Requirements:

- Windows 10/11 x64
- Rust toolchain
- WebView2 Runtime
- Inno Setup 6 for installer builds

Run in dev mode:

```powershell
cd .\src-tauri
cargo tauri dev
```

If `cargo tauri` is not installed:

```powershell
cargo install tauri-cli --version "^2"
```

Build the app executable:

```powershell
cd .\src-tauri
cargo build --release
```

Resulting binary:

```text
src-tauri/target/release/bypass-cleaner.exe
```

## Build Setup

After building the release executable:

```powershell
powershell -ExecutionPolicy Bypass -File .\Installer\build_setup.ps1 -AppVersion 0.3.0
```

Resulting installer:

```text
Installer/Output/ByPass Cleaner Setup.exe
```

## Runtime Artifacts

During normal work the application creates:

- `qt_settings.json` - saved UI and cleanup settings
- `logs/cleanup_report_*.json` - cleanup reports
- `.quarantine/files/` - quarantined files
- `.quarantine/manifests/` - quarantine metadata
- `audit-log.jsonl` - audit log for sensitive actions

## Repository Layout

Source folders:

- `src-tauri/` - Rust backend, Tauri host, tests, config
- `webui/` - HTML/CSS/JS interface
- `Installer/` - Inno Setup script and packaging helpers
- `Utils/` - icons and supporting assets

Generated/output folders:

- `src-tauri/target/`
- `src-tauri/gen/`
- `Installer/Output/`
- `.cargo-target/`
- `EXE - app/`
- `Setup/`

## Tech Stack

- Rust
- Tauri 2
- sysinfo
- walkdir
- sha2
- serde / serde_json
- Inno Setup 6

## Current Status

The project already covers its core desktop workflow:

- filtered cleanup
- report generation
- quarantine
- process triage
- audit logging
- aggressive delete with reboot fallback

Areas that should still be treated as future hardening work rather than "finished antivirus engine" scope:

- stronger malware classification
- cloud/signature reputation
- richer process reputation
- deeper handling of protected system objects

## License

Private project. All rights reserved unless explicitly stated otherwise.
