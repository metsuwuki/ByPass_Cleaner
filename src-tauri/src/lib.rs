use chrono::Local;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::{Arc, Mutex};
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::{Duration, SystemTime};
use tauri::{AppHandle, Emitter, Manager, State};
use walkdir::WalkDir;

#[derive(Clone)]
struct AppState {
  app_root: PathBuf,
  settings_path: PathBuf,
  stop_flag: Arc<AtomicBool>,
  running_flag: Arc<AtomicBool>,
  active_report_path: Arc<Mutex<String>>,
}

#[derive(Default, Serialize, Clone)]
struct CleanupStats {
  scanned: u64,
  matched: u64,
  deleted: u64,
  freed_bytes: u64,
  deleted_dirs: u64,
  errors: u64,
}

#[derive(Clone)]
struct CleanupOptions {
  days_limit: i64,
  min_size_bytes: u64,
  extensions: HashSet<String>,
  scan_subfolders: bool,
  delete_empty_dirs: bool,
  skip_hidden: bool,
  use_age_filter: bool,
  dry_run: bool,
}

#[derive(Deserialize)]
struct RequestEnvelope {
  id: Option<String>,
  cmd: Option<String>,
  payload: Option<Value>,
}

fn default_settings() -> Value {
  json!({
    "language": "auto",
    "theme": "AUTO",
    "accent": "AMETHYST",
    "out_dir": "logs",
    "days_limit": 14,
    "min_size_mb": 0,
    "extensions": "",
    "scan_subfolders": true,
    "delete_empty_dirs": false,
    "skip_hidden": true,
    "use_age_filter": true,
    "dry_run": true
  })
}

fn normalize_settings(payload: &Value) -> Value {
  let mut merged = default_settings();
  if let (Some(dst), Some(src)) = (merged.as_object_mut(), payload.as_object()) {
    for (k, v) in src {
      dst.insert(k.clone(), v.clone());
    }
  }
  merged
}

fn ok_response(req_id: &str, payload: Value) -> String {
  json!({"type":"response","id":req_id,"ok":true,"payload":payload}).to_string()
}

fn err_response(req_id: &str, error: &str) -> String {
  json!({"type":"response","id":req_id,"ok":false,"error":error}).to_string()
}

fn emit_event(app: &AppHandle, event: &str, payload: Value) {
  let envelope = json!({"type":"event","event":event,"payload":payload}).to_string();
  let _ = app.emit("host-dispatch", envelope);
}

fn read_settings(path: &Path) -> Value {
  let defaults = default_settings();
  let raw = match fs::read_to_string(path) {
    Ok(v) => v,
    Err(_) => return defaults,
  };
  let parsed: Value = match serde_json::from_str(&raw) {
    Ok(v) => v,
    Err(_) => return defaults,
  };
  normalize_settings(&parsed)
}

fn write_settings(path: &Path, payload: &Value) -> Result<Value, String> {
  let normalized = normalize_settings(payload);
  let text = serde_json::to_string_pretty(&normalized).map_err(|e| e.to_string())?;
  fs::write(path, text).map_err(|e| e.to_string())?;
  Ok(normalized)
}

fn resolve_out_dir(app_root: &Path, out_dir: &str) -> Result<PathBuf, String> {
  let raw = out_dir.trim();
  let base = if raw.is_empty() {
    app_root.join("logs")
  } else {
    let out_path = PathBuf::from(raw);
    if out_path.is_absolute() { out_path } else { app_root.join(out_path) }
  };
  fs::create_dir_all(&base).map_err(|e| e.to_string())?;
  Ok(base)
}

fn open_path(raw_path: &str, app_root: &Path) -> Result<(), String> {
  let path = raw_path.trim();
  if path.is_empty() {
    return Err("path is empty".to_string());
  }

  if path.starts_with("http://") || path.starts_with("https://") {
    Command::new("cmd")
      .args(["/C", "start", "", path])
      .spawn()
      .map_err(|e| e.to_string())?;
    return Ok(());
  }

  let mut resolved = PathBuf::from(path);
  if !resolved.is_absolute() {
    resolved = app_root.join(resolved);
  }
  if !resolved.exists() {
    fs::create_dir_all(&resolved).map_err(|e| e.to_string())?;
  }

  let target = resolved.to_string_lossy().to_string();
  Command::new("cmd")
    .args(["/C", "start", "", &target])
    .spawn()
    .map_err(|e| e.to_string())?;
  Ok(())
}

fn list_reports(out_dir: &Path) -> Value {
  let mut rows: Vec<Value> = Vec::new();
  if let Ok(iter) = fs::read_dir(out_dir) {
    for entry in iter.flatten() {
      let path = entry.path();
      let name = match path.file_name().and_then(|v| v.to_str()) {
        Some(v) => v.to_lowercase(),
        None => continue,
      };
      if !name.ends_with(".json") || !name.starts_with("cleanup_report_") {
        continue;
      }
      let meta = match entry.metadata() {
        Ok(v) => v,
        Err(_) => continue,
      };
      let modified = meta
        .modified()
        .ok()
        .and_then(|m| m.duration_since(SystemTime::UNIX_EPOCH).ok())
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0);
      rows.push(json!({
        "path": path.to_string_lossy().to_string(),
        "modified_unix": modified,
        "size_bytes": meta.len()
      }));
    }
  }
  rows.sort_by(|a, b| b["modified_unix"].as_i64().cmp(&a["modified_unix"].as_i64()));
  Value::Array(rows)
}

fn is_hidden_name(path: &Path) -> bool {
  path
    .file_name()
    .and_then(|v| v.to_str())
    .map(|v| v.starts_with('.'))
    .unwrap_or(false)
}

fn parse_options(payload: &Value) -> CleanupOptions {
  let days_limit = payload["days_limit"].as_i64().unwrap_or(14).max(0);
  let min_size_mb = payload["min_size_mb"].as_f64().unwrap_or(0.0).max(0.0);
  let min_size_bytes = (min_size_mb * 1024.0 * 1024.0) as u64;
  let extensions_str = payload["extensions"].as_str().unwrap_or("");
  let extensions = extensions_str
    .split(',')
    .map(|s| s.trim().trim_start_matches('.').to_lowercase())
    .filter(|s| !s.is_empty())
    .collect::<HashSet<_>>();

  CleanupOptions {
    days_limit,
    min_size_bytes,
    extensions,
    scan_subfolders: payload["scan_subfolders"].as_bool().unwrap_or(true),
    delete_empty_dirs: payload["delete_empty_dirs"].as_bool().unwrap_or(false),
    skip_hidden: payload["skip_hidden"].as_bool().unwrap_or(true),
    use_age_filter: payload["use_age_filter"].as_bool().unwrap_or(days_limit > 0),
    dry_run: payload["dry_run"].as_bool().unwrap_or(true),
  }
}

fn should_keep_file(path: &Path, meta: &fs::Metadata, opt: &CleanupOptions) -> bool {
  if opt.skip_hidden && is_hidden_name(path) {
    return true;
  }
  if !opt.extensions.is_empty() {
    let ext = path
      .extension()
      .and_then(|v| v.to_str())
      .map(|v| v.to_lowercase())
      .unwrap_or_default();
    if !opt.extensions.contains(&ext) {
      return true;
    }
  }
  if meta.len() < opt.min_size_bytes {
    return true;
  }
  if opt.use_age_filter {
    let threshold = SystemTime::now()
      .checked_sub(Duration::from_secs((opt.days_limit as u64) * 86_400))
      .unwrap_or(SystemTime::UNIX_EPOCH);
    let modified = meta.modified().unwrap_or(SystemTime::UNIX_EPOCH);
    if modified > threshold {
      return true;
    }
  }
  false
}

fn maybe_delete_empty_dirs(root: &Path, opt: &CleanupOptions, stats: &mut CleanupStats, logs: &mut Vec<String>) {
  if !opt.delete_empty_dirs || opt.dry_run {
    return;
  }
  for entry in WalkDir::new(root).contents_first(true).into_iter().filter_map(|e| e.ok()) {
    let path = entry.path();
    if !path.is_dir() || path == root {
      continue;
    }
    if opt.skip_hidden && is_hidden_name(path) {
      continue;
    }
    let is_empty = fs::read_dir(path).map(|mut i| i.next().is_none()).unwrap_or(false);
    if is_empty {
      match fs::remove_dir(path) {
        Ok(_) => {
          stats.deleted_dirs += 1;
          logs.push(format!("Deleted empty folder: {}", path.to_string_lossy()));
        }
        Err(e) => {
          stats.errors += 1;
          logs.push(format!("Error deleting folder: {} | {}", path.to_string_lossy(), e));
        }
      }
    }
  }
}

fn run_cleanup(
  app: AppHandle,
  state: AppState,
  req_id: String,
  payload: Value,
) {
  let _ = req_id;
  let started = std::time::Instant::now();
  let mut logs: Vec<String> = Vec::new();
  let mut stats = CleanupStats::default();

  let target_raw = payload["target_path"].as_str().unwrap_or("").trim().to_string();
  if target_raw.is_empty() {
    emit_event(&app, "analysis-log", json!("[error] target_path is required"));
    emit_event(&app, "analysis-finished", json!({"reportPath": ""}));
    state.running_flag.store(false, Ordering::SeqCst);
    return;
  }

  let mut target_path = PathBuf::from(&target_raw);
  if target_path.is_file() {
    if let Some(parent) = target_path.parent() {
      target_path = parent.to_path_buf();
    }
  }
  if !target_path.is_dir() {
    emit_event(&app, "analysis-log", json!("[error] target_path must be an existing directory"));
    emit_event(&app, "analysis-finished", json!({"reportPath": ""}));
    state.running_flag.store(false, Ordering::SeqCst);
    return;
  }

  let options = parse_options(&payload);
  let mode = payload["mode"].as_str().unwrap_or("STANDARD").to_uppercase();
  let out_dir_value = payload["out_dir"].as_str().unwrap_or("logs");
  let out_dir = match resolve_out_dir(&state.app_root, out_dir_value) {
    Ok(v) => v,
    Err(e) => {
      emit_event(&app, "analysis-log", json!(format!("[error] {}", e)));
      emit_event(&app, "analysis-finished", json!({"reportPath": ""}));
      state.running_flag.store(false, Ordering::SeqCst);
      return;
    }
  };

  emit_event(
    &app,
    "analysis-log",
    json!(format!("[host] mode={} | folder={}", mode, target_path.to_string_lossy())),
  );

  let walker = if options.scan_subfolders {
    WalkDir::new(&target_path)
  } else {
    WalkDir::new(&target_path).max_depth(1)
  };

  for entry in walker.into_iter() {
    if state.stop_flag.load(Ordering::SeqCst) {
      break;
    }
    let entry = match entry {
      Ok(v) => v,
      Err(e) => {
        stats.errors += 1;
        logs.push(format!("Error: {}", e));
        continue;
      }
    };

    let path = entry.path();
    if path.is_dir() {
      if options.skip_hidden && is_hidden_name(path) {
        continue;
      }
      continue;
    }
    if !path.is_file() {
      continue;
    }

    stats.scanned += 1;
    let meta = match entry.metadata() {
      Ok(v) => v,
      Err(e) => {
        stats.errors += 1;
        logs.push(format!("Error: {} | {}", path.to_string_lossy(), e));
        continue;
      }
    };

    if should_keep_file(path, &meta, &options) {
      if stats.scanned % 300 == 0 {
        emit_event(
          &app,
          "analysis-log",
          json!(format!("[progress] scanned={} deleted={}", stats.scanned, stats.deleted)),
        );
      }
      continue;
    }

    stats.matched += 1;
    if options.dry_run {
      logs.push(format!("Preview: {}", path.to_string_lossy()));
    } else {
      match fs::remove_file(path) {
        Ok(_) => {
          stats.deleted += 1;
          stats.freed_bytes += meta.len();
          logs.push(format!("Deleted: {}", path.to_string_lossy()));
        }
        Err(e) => {
          stats.errors += 1;
          logs.push(format!("Error: {} | {}", path.to_string_lossy(), e));
        }
      }
    }

    if stats.scanned % 300 == 0 {
      emit_event(
        &app,
        "analysis-log",
        json!(format!("[progress] scanned={} deleted={}", stats.scanned, stats.deleted)),
      );
    }
  }

  maybe_delete_empty_dirs(&target_path, &options, &mut stats, &mut logs);

  for line in logs.iter().rev().take(1200).rev() {
    emit_event(&app, "analysis-log", json!(line));
  }

  let duration_ms = started.elapsed().as_millis() as u64;
  let findings = {
    let mut f = vec![
      json!({
        "severity": if stats.errors == 0 { "PASS" } else { "WARN" },
        "code": "FILES_SCANNED",
        "category": "scan",
        "points": ((stats.scanned / 20) + 1).min(50),
        "message": format!("Scanned files: {}", stats.scanned)
      }),
      json!({
        "severity": if stats.matched > 0 { "PASS" } else { "WARN" },
        "code": "MATCHED",
        "category": "filter",
        "points": stats.matched.clamp(1, 25),
        "message": format!("Matched files: {}", stats.matched)
      }),
      json!({
        "severity": if stats.deleted > 0 || options.dry_run { "PASS" } else { "WARN" },
        "code": "DELETED",
        "category": "cleanup",
        "points": stats.deleted.max(stats.matched).clamp(1, 25),
        "message": format!("Deleted files: {}", stats.deleted)
      }),
    ];
    if stats.errors > 0 {
      f.push(json!({
        "severity": "FAIL",
        "code": "ERRORS",
        "category": "runtime",
        "points": stats.errors,
        "message": format!("Errors during cleanup: {}", stats.errors)
      }));
    }
    f
  };

  let score = 100_i64.saturating_sub((stats.errors * 10) as i64).clamp(0, 100);
  let report = json!({
    "schema_version": "cleanup-v1",
    "generated_at": Local::now().format("%Y-%m-%dT%H:%M:%S").to_string(),
    "target_path": target_path.to_string_lossy().to_string(),
    "mode": mode,
    "dry_run": options.dry_run,
    "score": score,
    "final_status": if stats.errors == 0 { "DONE" } else { "WARN" },
    "findings": findings,
    "runtime": [{
      "scenario": "cleanup",
      "exit_code": if stats.errors == 0 { 0 } else { 1 },
      "timed_out": state.stop_flag.load(Ordering::SeqCst),
      "duration_ms": duration_ms,
      "stdout_len": logs.len(),
      "stderr_len": stats.errors
    }],
    "cleanup": {
      "scanned": stats.scanned,
      "matched": stats.matched,
      "deleted": stats.deleted,
      "freed_bytes": stats.freed_bytes,
      "deleted_dirs": stats.deleted_dirs,
      "errors": stats.errors
    }
  });

  let filename = format!("cleanup_report_{}.json", Local::now().format("%Y%m%d_%H%M%S"));
  let report_path = out_dir.join(filename);
  let report_text = serde_json::to_string_pretty(&report).unwrap_or_else(|_| "{}".to_string());
  if let Err(e) = fs::write(&report_path, report_text) {
    emit_event(&app, "analysis-log", json!(format!("[error] failed to save report: {}", e)));
    emit_event(&app, "analysis-finished", json!({"reportPath": ""}));
    state.running_flag.store(false, Ordering::SeqCst);
    return;
  }

  let report_path_string = report_path.to_string_lossy().to_string();
  if let Ok(mut p) = state.active_report_path.lock() {
    *p = report_path_string.clone();
  }
  emit_event(&app, "analysis-log", json!(format!("[host] report saved: {}", report_path_string)));
  emit_event(&app, "analysis-finished", json!({"reportPath": report_path_string}));
  state.running_flag.store(false, Ordering::SeqCst);
}

#[tauri::command]
fn post_message(raw: String, app: AppHandle, state: State<'_, AppState>) -> Result<String, String> {
  let req: RequestEnvelope = serde_json::from_str(&raw).map_err(|e| e.to_string())?;
  let req_id = req.id.unwrap_or_default();
  let cmd = req.cmd.unwrap_or_default();
  let payload = req.payload.unwrap_or_else(|| json!({}));

  match cmd.as_str() {
    "load_settings" => {
      let settings = read_settings(&state.settings_path);
      Ok(ok_response(&req_id, settings))
    }
    "save_settings" => {
      let saved = write_settings(&state.settings_path, &payload)?;
      Ok(ok_response(&req_id, saved))
    }
    "pick_target" => {
      let picked = rfd::FileDialog::new()
        .set_directory(&state.app_root)
        .pick_folder()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_default();
      Ok(ok_response(&req_id, json!({"path": picked})))
    }
    "open_path" => {
      let path = payload["path"].as_str().unwrap_or("");
      open_path(path, &state.app_root)?;
      Ok(ok_response(&req_id, json!({"ok": true})))
    }
    "list_reports" => {
      let out_dir = payload["out_dir"].as_str().unwrap_or("logs");
      let folder = resolve_out_dir(&state.app_root, out_dir)?;
      Ok(ok_response(&req_id, list_reports(&folder)))
    }
    "open_report" => {
      let path = payload["path"].as_str().unwrap_or("").trim();
      if path.is_empty() {
        return Ok(err_response(&req_id, "report path is empty"));
      }
      let text = fs::read_to_string(path).map_err(|e| e.to_string())?;
      let report: Value = serde_json::from_str(&text).map_err(|e| e.to_string())?;
      Ok(ok_response(&req_id, report))
    }
    "run_analysis" => {
      if state.running_flag.swap(true, Ordering::SeqCst) {
        return Ok(err_response(&req_id, "analysis is already running"));
      }
      state.stop_flag.store(false, Ordering::SeqCst);
      let app_handle = app.clone();
      let state_clone = state.inner().clone();
      let req_id_clone = req_id.clone();
      std::thread::spawn(move || run_cleanup(app_handle, state_clone, req_id_clone, payload));
      Ok(ok_response(&req_id, json!({"started": true})))
    }
    "stop_analysis" => {
      state.stop_flag.store(true, Ordering::SeqCst);
      emit_event(&app, "analysis-log", json!("[host] stop requested"));
      Ok(ok_response(&req_id, json!({"stopping": true})))
    }
    _ => Ok(err_response(&req_id, &format!("Unsupported command: {}", cmd))),
  }
}

fn detect_app_root() -> PathBuf {
  if cfg!(debug_assertions) {
    std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."))
  } else {
    std::env::current_exe()
      .ok()
      .and_then(|exe| exe.parent().map(|p| p.to_path_buf()))
      .unwrap_or_else(|| PathBuf::from("."))
  }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  let app_root = detect_app_root();
  let state = AppState {
    settings_path: app_root.join("qt_settings.json"),
    app_root,
    stop_flag: Arc::new(AtomicBool::new(false)),
    running_flag: Arc::new(AtomicBool::new(false)),
    active_report_path: Arc::new(Mutex::new(String::new())),
  };

  tauri::Builder::default()
    .manage(state)
    .invoke_handler(tauri::generate_handler![post_message])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      let window = app.get_webview_window("main").expect("main window not found");
      let _ = window.set_title("ByPass Cleaner");
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
