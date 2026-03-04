# ByPass Cleaner

<p align="center">
  Desktop utility for safe and fast file cleanup with preview mode, live metrics, and multilingual UI.
</p>

<p align="center">
  <img alt="Python" src="https://img.shields.io/badge/Python-3.13+-3776AB?logo=python&logoColor=white">
  <img alt="UI" src="https://img.shields.io/badge/UI-PySide6%20(Qt)-41CD52?logo=qt&logoColor=white">
  <img alt="Platform" src="https://img.shields.io/badge/Platform-Windows-0078D6?logo=windows&logoColor=white">
  <img alt="License" src="https://img.shields.io/badge/License-Private-lightgrey">
</p>

---

## ✨ Features

- 🧭 Clean and modern desktop UI (PySide6 / Qt)
- 🔍 **Preview mode** (dry-run) before deleting files
- ⚙️ Flexible filters:
  - file age (days)
  - minimum size
  - extension list (e.g. `.log,.tmp,.bak`)
- 📁 Multi-folder cleanup with optional recursive scan
- 🛡️ Safety checks for protected/system locations
- 📊 Live dashboard: scanned / matched / deleted / freed space
- 🧾 Session logs with export support
- 🌐 Built-in localization and theme support

---

## 🖼 Interface

Current layout:

- app icon in the window and taskbar
- cleanup filters + folder selection controls
- preview/details/log panels
- themes and language controls in Qt UI
- icons configured for running process and packaged `.exe`

> Tip: if Windows shows an old icon in taskbar or Explorer, clear icon cache or rename the executable once.

---

## 🚀 Quick Start (dev)

### 1) Create and activate venv

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

### 2) Install dependencies

```powershell
pip install -r Utils/requirements.txt
```

### 3) Run app

From project root:

```powershell
python Utils/main.py
```

---

## 📦 Build EXE (PyInstaller)

From project root:

```powershell
python -m PyInstaller --noconfirm --clean --onefile --windowed --name "ByPass Cleaner" --icon "Utils/icon.ico" --add-data "Utils/logo.png;." --add-data "Utils/icon.ico;." --add-data "Utils/icon.png;." "Utils/main.py"
```

Output:

- `dist/ByPass Cleaner.exe`

---

## 🧱 Project Structure

```text
ByPass_Cleaner/
├─ Utils/
│  ├─ main.py
│  ├─ qt_app.py
│  ├─ cleaner_core.py
│  ├─ qt_settings.json
│  ├─ requirements.txt
│  ├─ icon.ico
│  ├─ icon.png
│  └─ logo.png
├─ build/
├─ dist/
├─ ByPass Cleaner.spec
└─ ByPass Cleaner Debug.spec
```

---

## 🛠 Notes

- Main UI is implemented in `Utils/qt_app.py`.
- Cleanup engine is implemented in `Utils/cleaner_core.py`.
- Runtime resources for onefile builds should be resolved with `_MEIPASS` when needed.
- If you change icons/logos, rebuild `.exe` to include updated assets.

---

## 📬 Support

- Check on https://metsuwuki.github.io/animesite/

---

<p align="center"><sub>Built with Python + PySide6 (Qt)</sub></p>
