# ByPass Cleaner

ByPass Cleaner is a Windows desktop utility for preview-first cleanup, quarantine, process triage, and controlled file removal.

The project is built with Rust + Tauri and targets Windows 10/11.

## Что уже реализовано

- Preview / `dry-run` перед удалением.
- Очистка по фильтрам:
  - возраст файла в днях
  - минимальный размер
  - список расширений (`tmp`, `log` и т.д.)
- Сканирование с подпапками или без.
- Опциональное удаление пустых папок.
- Опциональный пропуск скрытых файлов и папок.
- Живой прогресс, статистика, журнал выполнения и итоговый JSON-отчёт.
- Карантин:
  - перенос файла в изолированную папку
  - SHA-256
  - manifest с метаданными
  - восстановление обратно
- Просмотр процессов:
  - компактный список
  - путь, командная строка, память, CPU, родительский PID
  - SHA-256 исполняемого файла
  - простая эвристическая оценка риска
- Эвристические метки для процессов:
  - `miner`
  - `rat`
  - `trojan`
  - `suspicious`
- Агрессивное удаление:
  - обычная попытка удаления
  - сброс атрибутов файла
  - переименование во временный путь с повторной попыткой
  - постановка на удаление после перезагрузки, если файл заблокирован
- Audit log для чувствительных действий.

## Важное ограничение

ByPass Cleaner не является полноценным антивирусом и не даёт гарантированного определения вредоносного ПО. Метки `miner` / `rat` / `trojan` / `suspicious` основаны на локальных эвристиках и нужны для триажа, а не для финального вердикта.

Агрессивное удаление тоже не является "магическим bypass". Оно помогает с обычными блокировками и неудобными файлами, но не должно рассматриваться как обход системной защиты, драйверов, EDR или защищённых системных объектов.

## Основной сценарий работы

1. Выбрать папку для анализа.
2. Настроить фильтры.
3. Запустить `dry-run`.
4. Проверить список совпадений, статистику и отчёт.
5. Запустить реальную очистку только после проверки.
6. При необходимости использовать карантин, просмотр процессов или агрессивное удаление.

## Сборка

Требования:

- Windows 10/11 x64
- Rust toolchain
- WebView2 Runtime
- Inno Setup 6 для сборки установщика

Запуск в dev-режиме:

```powershell
cd .\src-tauri
cargo tauri dev
```

Если `cargo tauri` не установлен:

```powershell
cargo install tauri-cli --version "^2"
```

Сборка `.exe`:

```powershell
cd .\src-tauri
cargo build --release
```

Готовый исполняемый файл:

```text
src-tauri/target/release/bypass-cleaner.exe
```

## Сборка Setup

После сборки release `.exe`:

```powershell
powershell -ExecutionPolicy Bypass -File .\Installer\build_setup.ps1 -AppVersion 1.0.0
```

Скрипт:

- проверяет наличие `bypass-cleaner.exe`
- подготавливает branding assets для Inno Setup
- находит `ISCC.exe`
- собирает установщик

Готовый установщик:

```text
Installer/Output/ByPass Cleaner Setup.exe
```

## Runtime-артефакты

Во время работы приложение создаёт:

- `qt_settings.json` - сохранённые настройки
- `logs/cleanup_report_*.json` - отчёты очистки
- `.quarantine/files/` - изолированные файлы
- `.quarantine/manifests/` - метаданные карантина
- `audit-log.jsonl` - журнал чувствительных действий

## Структура репозитория

Исходники:

- `src-tauri/` - Rust backend, Tauri host, tests, config
- `webui/` - HTML/CSS/JS интерфейс
- `Installer/` - Inno Setup script и build-обвязка
- `Utils/` - иконки и вспомогательные ресурсы

Генерируемые / выходные каталоги:

- `src-tauri/target/`
- `src-tauri/gen/`
- `Installer/Output/`
- `.cargo-target/`
- `EXE - app/`
- `Setup/`

## Технологии

- Rust
- Tauri 2
- sysinfo
- walkdir
- sha2
- serde / serde_json
- Inno Setup 6

## Статус проекта

Сейчас проект уже покрывает основную функциональность из описания: очистка, отчёты, карантин, просмотр процессов, triage-эвристики и агрессивное удаление с fallback на reboot delete.

Что ещё стоит считать зоной для дальнейшей доработки, а не "готовым антивирусным движком":

- более сильная malware-классификация
- облачная/сигнатурная проверка
- richer process reputation
- расширенная работа с защищёнными системными объектами

## License

Private project. All rights reserved unless explicitly stated otherwise.
