# ByPass Cleaner

<p align="center">
  <strong>Desktop cleanup, operational visibility, and controlled containment for Windows.</strong>
</p>

<p align="center">
  ByPass Cleaner is a native desktop application for preview-first cleanup workflows, live reporting, process inspection, and quarantine-driven handling of suspicious files.
</p>

<p align="center">
  <img alt="Rust" src="https://img.shields.io/badge/Rust-1.77.2+-CE422B?logo=rust&logoColor=white">
  <img alt="Tauri" src="https://img.shields.io/badge/Tauri-2.10-24C8DB?logo=tauri&logoColor=white">
  <img alt="Platform" src="https://img.shields.io/badge/Windows-10%2F11-0078D6?logo=windows&logoColor=white">
  <img alt="UI" src="https://img.shields.io/badge/UI-WebView%20Desktop-111827">
  <img alt="Packaging" src="https://img.shields.io/badge/Installer-Inno%20Setup-0F172A">
  <img alt="License" src="https://img.shields.io/badge/License-Private-6B7280">
</p>

<p align="center">
  <em>Built for operators who need cleanup workflows they can inspect, review, and trust.</em>
</p>

---

## Contents

- [Overview](#overview)
- [Highlights](#highlights)
- [Why It Matters](#why-it-matters)
- [Product Experience](#product-experience)
- [Design Principles](#design-principles)
- [Architecture](#architecture)
- [Technology](#technology)
- [Workflow](#workflow)
- [Requirements](#requirements)
- [Development](#development)
- [Build And Packaging](#build-and-packaging)
- [Runtime Artifacts](#runtime-artifacts)
- [Repository Layout](#repository-layout)
- [Safety Model](#safety-model)
- [Troubleshooting](#troubleshooting)
- [Use Cases](#use-cases)
- [License](#license)

## Highlights

| Area | What it delivers |
| --- | --- |
| Cleanup | Preview mode, delete mode, recursive scan, age/size/extension filters |
| Visibility | Live counters, progress updates, session log stream, report preview |
| Safety | Quarantine flow, restore support, audit trail, reboot-delete scheduling |
| UX | Tauri desktop shell, polished themed interface, multi-view operator workspace |
| Packaging | Native Windows executable, Tauri bundles, branded Inno Setup installer |

## Overview

ByPass Cleaner is built for situations where simple file deletion is not enough and blind cleanup is unacceptable. The application provides a controlled operating surface for inspecting targets, validating cleanup rules, executing preview-first runs, and handling suspicious artifacts with recoverable containment.

The result is a desktop tool that feels closer to an operator console than a disposable cleaner: opinionated enough to be safe, lightweight enough to stay practical, and structured enough to scale beyond one-off local use.

## Why It Matters

Most cleanup utilities optimize for speed. Mature tools optimize for trust.

ByPass Cleaner is designed around that distinction. It does not assume deletion is the right first move. Instead, it exposes what will happen, what did happen, and what can be recovered afterward. That makes it more suitable for real workstation maintenance, internal tooling, and controlled remediation workflows.

## Product Experience

### Visual Showcase

<p align="center">
  <sub>Add product screenshots or an animated walkthrough here to match the product-grade presentation of the repository.</sub>
</p>

```text
┌────────────────────────────────────────────────────────────────────┐
│ ByPass Cleaner                                                    │
│ Smart Cleanup Workspace                                           │
├────────────────────────────────────────────────────────────────────┤
│ Target Folder      Filters            KPIs        Live Log         │
│ Reports Directory  Preview/Delete     Metrics     Report Snapshot  │
│ Processes          Quarantine         Audit       Settings         │
└────────────────────────────────────────────────────────────────────┘
```

### Preview Before Destruction
- Run cleanup in dry-run mode before deleting anything
- Validate target scope and filters before committing actions
- Review live metrics and generated reports before rerunning in delete mode

### Observable Execution
- Track scanned, matched, deleted, freed bytes, and errors in real time
- Follow the execution stream through a live in-app log
- Inspect the latest report snapshot without leaving the interface

### Containment Instead Of Guesswork
- Inspect running processes and collect path metadata
- Compute SHA-256 for file-backed process binaries
- Move suspicious paths into quarantine with manifest tracking
- Restore quarantined items when needed
- Schedule locked files for deletion on reboot through native Windows APIs

### Operator-Focused Interface
- Dedicated views for cleanup, processes, reports, and settings
- Accent-aware dark and light themes
- Persistent settings and configurable report output directory
- Localized UI foundation with active English and Russian support

### Feature Grid

| Capability | Details |
| --- | --- |
| Cleanup engine | Age, size, extension, recursion, empty-directory, and hidden-file controls |
| Runtime visibility | Live KPIs, progress streaming, logs, and report snapshot preview |
| Process inspection | Process listing, metadata lookup, and SHA-256 calculation |
| Containment | Quarantine manifests, restore flow, audit trail, delete-on-reboot |
| Desktop delivery | Native Tauri runtime, Windows packaging, branded installer |

## Design Principles

- Safe by default. Preview, filtering, and visibility come before destructive action.
- Explicit over implicit. Runtime behavior should be inspectable, not hidden.
- Native where it matters. Filesystem and system operations live in Rust, not in UI glue.
- Recoverability matters. Quarantine and audit are first-class parts of the workflow.

## Feature Set

### Cleanup Engine
- Age filter in days
- Minimum size filter
- Extension list filter
- Optional recursive scan
- Optional empty-directory removal
- Optional skip for hidden files on Windows
- Stop request support during active analysis

### Reporting And State
- JSON cleanup reports in a configurable output folder
- Persisted runtime settings with normalized defaults
- Active report tracking during execution
- Append-only audit log for sensitive actions

### Process And Quarantine Toolkit
- Process inventory listing
- Detailed process inspection
- SHA-256 computation
- Quarantine manifest generation
- Restore flow from quarantine
- Delete-on-reboot scheduling on Windows
- Force-action request gate for future privileged flows

## Architecture

The project is intentionally split into a small number of clear layers:

- Rust backend: cleanup engine, process inspection, quarantine, hashing, audit, filesystem control, Windows-native integrations
- Tauri runtime: desktop shell, IPC boundary, bundling, application lifecycle
- Web UI: multi-view interface implemented in plain HTML, CSS, and JavaScript

This separation keeps critical operations close to the platform while allowing the interface to iterate quickly and remain visually expressive.

## Technology

- Rust 1.77.2+
- Tauri 2.10.x
- serde / serde_json
- chrono
- sha2
- walkdir
- sysinfo
- rfd
- Inno Setup 6

## Workflow

1. Select the target directory and output directory for reports.
2. Configure age, size, extension, recursion, and hidden-file behavior.
3. Run a preview pass first.
4. Review counters, logs, and the generated report.
5. Execute a delete pass only after the result is acceptable.
6. Use process inspection, quarantine, restore, or reboot-delete when remediation is required.

## Requirements

- Windows 10 or Windows 11 x64
- Rust toolchain via rustup
- Cargo
- Tauri CLI
- Microsoft WebView2 Runtime
- Optional: Inno Setup 6 for branded installer generation

## Development

Run the application from the repository root:

```powershell
cargo tauri dev
```

The Tauri configuration points the frontend distribution to the `webui` directory.

## Build And Packaging

Build the release executable and bundled artifacts:

```powershell
cargo tauri build
```

Main executable:

```text
src-tauri/target/release/bypass-cleaner.exe
```

Additional Tauri-generated bundles are written under:

```text
src-tauri/target/release/bundle/
```

The repository ships with a custom Inno Setup flow for producing a branded installer experience.

After building the release executable, run:

```powershell
powershell -ExecutionPolicy Bypass -File .\Installer\build_setup.ps1 -AppVersion 1.0.0
```

The installer build script will:
- verify the release executable exists
- generate branding bitmaps for the wizard when missing
- discover `ISCC.exe` through PATH, registry, or standard install locations
- compile the installer script defined in `Installer/ByPass Cleaner.iss`

Installer output:

```text
Installer/Output/
```

## Runtime Artifacts

The application persists operational data through a small set of predictable artifacts:

- `qt_settings.json` for saved settings
- `logs/cleanup_report_*.json` for cleanup reports
- `.quarantine/files/` for quarantined payloads
- `.quarantine/manifests/` for quarantine metadata
- `audit-log.jsonl` for append-only audit history

## Host Command Surface

The backend is exposed through a command-driven host bridge used by the UI for operations such as:

- loading settings
- saving settings
- starting cleanup
- requesting stop
- listing processes
- retrieving process details
- quarantining paths
- restoring quarantine entries
- scheduling delete on reboot
- requesting gated force actions

That command surface keeps orchestration explicit and separates UI behavior from native execution logic.

## Repository Layout

```text
ByPass_Cleaner/
├─ src-tauri/
│  ├─ src/
│  │  ├─ lib.rs
│  │  └─ main.rs
│  ├─ capabilities/
│  ├─ icons/
│  ├─ Cargo.toml
│  └─ tauri.conf.json
├─ webui/
│  ├─ index.html
│  ├─ styles.css
│  └─ app.js
├─ Installer/
│  ├─ ByPass Cleaner.iss
│  ├─ build_setup.ps1
│  ├─ Assets/
│  └─ Output/
├─ EXE - app/
├─ tests/
└─ README.md
```

## Safety Model

ByPass Cleaner is designed to make sensitive file operations more traceable and recoverable.

- Preview mode exists to reduce accidental deletion.
- Quarantine provides a reversible containment step.
- Audit logging records sensitive actions as JSON Lines.
- Reboot-delete uses the Windows scheduling API for locked paths.
- Force-action paths are intentionally treated as gated flows, not defaults.

## Troubleshooting

### `ISCC.exe` Was Not Found
Install Inno Setup 6 and ensure `ISCC.exe` is reachable through PATH or standard installation locations.

### Installer Build Cannot Find The Release EXE
Generate the release build first:

```powershell
cargo tauri build
```

### Explorer Shows Stale Branding Or Old Icons
Clear the Windows icon cache or rebuild with a version bump if Explorer continues to show cached branding.

### WebView Runtime Problems On Target Machines
Ensure Microsoft WebView2 Runtime is installed and available.

## Suitable Use Cases

- workstation cleanup with reviewable execution
- internal Windows utility distribution
- controlled file maintenance workflows
- early-stage remediation and containment tooling

## License

Private project. All rights reserved unless explicitly stated otherwise.
Made by Metsuwuki