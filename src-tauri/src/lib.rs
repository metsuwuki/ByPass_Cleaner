use chrono::{Local, SecondsFormat, Utc};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::collections::{HashMap, HashSet, VecDeque};
use std::fs::{self, OpenOptions};
use std::io::{BufRead, BufReader, Read, Write};
#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::{Duration, SystemTime};
use sysinfo::{Pid, System};
use tauri::{AppHandle, Emitter, Manager, State};
use uuid::Uuid;
use walkdir::WalkDir;

#[cfg(target_os = "windows")]
use widestring::U16CString;
#[cfg(target_os = "windows")]
use winapi::um::fileapi::{
    DeleteFileW, GetFileAttributesW, SetFileAttributesW, INVALID_FILE_ATTRIBUTES,
};
#[cfg(target_os = "windows")]
use winapi::um::winbase::{MoveFileExW, MOVEFILE_DELAY_UNTIL_REBOOT};
#[cfg(target_os = "windows")]
use winapi::um::winnt::{FILE_ATTRIBUTE_HIDDEN, FILE_ATTRIBUTE_NORMAL};

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

#[derive(Clone)]
struct AppState {
    app_root: PathBuf,
    settings_path: PathBuf,
    stop_flag: Arc<AtomicBool>,
    running_flag: Arc<AtomicBool>,
}

#[derive(Default, Serialize, Clone)]
struct CleanupStats {
    scanned: u64,
    matched: u64,
    matched_bytes: u64,
    deleted: u64,
    freed_bytes: u64,
    deleted_dirs: u64,
    errors: u64,
}

#[derive(Serialize, Clone)]
struct CleanupItem {
    path: String,
    kind: String,
    extension: String,
    size_bytes: u64,
    modified_unix: i64,
    action: String,
    status: String,
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

#[derive(Serialize, Clone)]
struct ProcessInfo {
    pid: u32,
    name: String,
    exe: Option<String>,
    cmdline: Option<String>,
    start_ts_unix: u64,
    cpu_pct: f32,
    mem_bytes: u64,
    suspicion_score: u8,
    threat_family: String,
    threat_risk: String,
    threat_confidence: u8,
    threat_reasons: Vec<String>,
}

#[derive(Serialize, Clone)]
struct ProcessDetail {
    pid: u32,
    name: String,
    exe: Option<String>,
    cmdline: Option<String>,
    start_ts_unix: u64,
    cpu_pct: f32,
    mem_bytes: u64,
    sha256: Option<String>,
    digital_signature: Option<bool>,
    parent_pid: Option<u32>,
    suspicion_score: u8,
    threat_family: String,
    threat_risk: String,
    threat_confidence: u8,
    threat_reasons: Vec<String>,
}

#[derive(Clone)]
struct ThreatAssessment {
    suspicion_score: u8,
    family: String,
    risk: String,
    confidence: u8,
    reasons: Vec<String>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct QuarantineEntry {
    pub id: String,
    pub original_path: String,
    pub quarantine_path: String,
    pub sha256: String,
    pub timestamp_iso: String,
    pub operator: String,
    pub reason: String,
}

#[derive(Serialize, Deserialize, Clone)]
struct AuditEntry {
    ts_iso: String,
    operator: String,
    action: String,
    target: String,
    details: Value,
    result: String,
    message: String,
}

#[derive(Serialize)]
pub struct AggressiveDeleteResult {
    pub path: String,
    pub final_path: String,
    pub deleted_now: bool,
    pub scheduled_on_reboot: bool,
    pub strategy: String,
    pub steps: Vec<String>,
}

fn default_settings() -> Value {
    let operator = std::env::var("USERNAME")
        .or_else(|_| std::env::var("USER"))
        .unwrap_or_else(|_| "unknown".to_string());
    json!({
      "language": "auto",
      "theme": "AUTO",
      "accent": "AMETHYST",
      "operator": operator,
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

fn emit_cleanup_progress(
    app: &AppHandle,
    stats: &CleanupStats,
    current_path: Option<&Path>,
    phase: &str,
) {
    emit_event(
        app,
        "analysis-progress",
        json!({
          "phase": phase,
          "current_path": current_path.map(|path| path.to_string_lossy().to_string()),
          "stats": stats
        }),
    );
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
        if out_path.is_absolute() {
            out_path
        } else {
            app_root.join(out_path)
        }
    };
    fs::create_dir_all(&base).map_err(|e| e.to_string())?;
    Ok(base)
}

fn spawn_shell_open(target: &str) -> Result<(), String> {
    let mut cmd = Command::new("cmd");
    cmd.args(["/C", "start", "", target]);
    #[cfg(target_os = "windows")]
    {
        cmd.creation_flags(CREATE_NO_WINDOW);
    }
    cmd.spawn().map_err(|e| e.to_string())?;
    Ok(())
}

fn open_path(raw_path: &str, app_root: &Path) -> Result<(), String> {
    let path = raw_path.trim();
    if path.is_empty() {
        return Err("path is empty".to_string());
    }

    if path.starts_with("http://") || path.starts_with("https://") {
        spawn_shell_open(path)?;
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
    spawn_shell_open(&target)?;
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
    rows.sort_by(|a, b| {
        b["modified_unix"]
            .as_i64()
            .cmp(&a["modified_unix"].as_i64())
    });
    Value::Array(rows)
}

fn now_iso() -> String {
    Utc::now().to_rfc3339_opts(SecondsFormat::Secs, true)
}

fn normalize_operator(raw: Option<&str>) -> String {
    raw.map(str::trim)
        .filter(|v| !v.is_empty())
        .unwrap_or("unknown")
        .to_string()
}

fn quarantine_root(app_root: &Path) -> PathBuf {
    app_root.join(".quarantine")
}

fn quarantine_files_dir(app_root: &Path) -> PathBuf {
    quarantine_root(app_root).join("files")
}

fn quarantine_manifests_dir(app_root: &Path) -> PathBuf {
    quarantine_root(app_root).join("manifests")
}

fn quarantine_manifest_path(app_root: &Path, id: &str) -> PathBuf {
    quarantine_manifests_dir(app_root).join(format!("{}.json", id))
}

fn audit_log_path(app_root: &Path) -> PathBuf {
    app_root.join("audit-log.jsonl")
}

fn ensure_quarantine_dirs(app_root: &Path) -> Result<(), String> {
    fs::create_dir_all(quarantine_files_dir(app_root)).map_err(|e| e.to_string())?;
    fs::create_dir_all(quarantine_manifests_dir(app_root)).map_err(|e| e.to_string())?;
    Ok(())
}

fn sanitize_filename(name: &str) -> String {
    let mut sanitized = String::with_capacity(name.len());
    for ch in name.chars() {
        let safe = match ch {
            '<' | '>' | ':' | '"' | '/' | '\\' | '|' | '?' | '*' => '_',
            _ => ch,
        };
        sanitized.push(safe);
    }
    let trimmed = sanitized.trim().trim_matches('.').trim();
    if trimmed.is_empty() {
        "item".to_string()
    } else {
        trimmed.to_string()
    }
}

fn append_audit_entry(
    app_root: &Path,
    operator: Option<&str>,
    action: &str,
    target: &str,
    details: Value,
    result: &str,
    message: &str,
) -> Result<(), String> {
    let entry = AuditEntry {
        ts_iso: now_iso(),
        operator: normalize_operator(operator),
        action: action.to_string(),
        target: target.to_string(),
        details,
        result: result.to_string(),
        message: message.to_string(),
    };
    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(audit_log_path(app_root))
        .map_err(|e| e.to_string())?;
    let line = serde_json::to_string(&entry).map_err(|e| e.to_string())?;
    file.write_all(line.as_bytes()).map_err(|e| e.to_string())?;
    file.write_all(b"\n").map_err(|e| e.to_string())?;
    Ok(())
}

fn read_quarantine_entry(path: &Path) -> Result<QuarantineEntry, String> {
    let text = fs::read_to_string(path).map_err(|e| e.to_string())?;
    serde_json::from_str(&text).map_err(|e| e.to_string())
}

fn write_quarantine_entry(app_root: &Path, entry: &QuarantineEntry) -> Result<(), String> {
    ensure_quarantine_dirs(app_root)?;
    let text = serde_json::to_string_pretty(entry).map_err(|e| e.to_string())?;
    fs::write(quarantine_manifest_path(app_root, &entry.id), text).map_err(|e| e.to_string())
}

pub fn compute_sha256(path: &Path) -> Result<String, String> {
    let mut file = fs::File::open(path).map_err(|e| e.to_string())?;
    let mut sha = Sha256::new();
    let mut buffer = [0_u8; 8192];
    loop {
        let read = file.read(&mut buffer).map_err(|e| e.to_string())?;
        if read == 0 {
            break;
        }
        sha.update(&buffer[..read]);
    }
    Ok(hex::encode(sha.finalize()))
}

pub fn atomic_move(src: &Path, dst: &Path) -> Result<(), String> {
    if let Some(parent) = dst.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    match fs::rename(src, dst) {
        Ok(_) => Ok(()),
        Err(rename_err) => {
            if src.is_file() {
                fs::copy(src, dst)
                    .map_err(|e| format!("{}; fallback copy failed: {}", rename_err, e))?;
                fs::remove_file(src)
                    .map_err(|e| format!("{}; fallback remove failed: {}", rename_err, e))?;
                Ok(())
            } else {
                Err(rename_err.to_string())
            }
        }
    }
}

#[cfg(target_os = "windows")]
fn schedule_delete_on_reboot_impl(path: &Path) -> Result<(), String> {
    let wide = U16CString::from_os_str(path.as_os_str()).map_err(|e| e.to_string())?;
    let ok = unsafe { MoveFileExW(wide.as_ptr(), std::ptr::null(), MOVEFILE_DELAY_UNTIL_REBOOT) };
    if ok == 0 {
        return Err(std::io::Error::last_os_error().to_string());
    }
    Ok(())
}

#[cfg(not(target_os = "windows"))]
fn schedule_delete_on_reboot_impl(_path: &Path) -> Result<(), String> {
    Err("not supported on this platform".to_string())
}

#[cfg(target_os = "windows")]
fn set_normal_attributes(path: &Path) -> Result<(), String> {
    let wide = U16CString::from_os_str(path.as_os_str()).map_err(|e| e.to_string())?;
    let ok = unsafe { SetFileAttributesW(wide.as_ptr(), FILE_ATTRIBUTE_NORMAL) };
    if ok == 0 {
        return Err(std::io::Error::last_os_error().to_string());
    }
    Ok(())
}

#[cfg(not(target_os = "windows"))]
fn set_normal_attributes(_path: &Path) -> Result<(), String> {
    Ok(())
}

#[cfg(target_os = "windows")]
fn delete_file_winapi(path: &Path) -> Result<(), String> {
    let wide = U16CString::from_os_str(path.as_os_str()).map_err(|e| e.to_string())?;
    let ok = unsafe { DeleteFileW(wide.as_ptr()) };
    if ok == 0 {
        return Err(std::io::Error::last_os_error().to_string());
    }
    Ok(())
}

#[cfg(not(target_os = "windows"))]
fn delete_file_winapi(path: &Path) -> Result<(), String> {
    fs::remove_file(path).map_err(|e| e.to_string())
}

fn delete_path_best_effort(path: &Path) -> Result<(), String> {
    fs::remove_file(path)
        .or_else(|_| delete_file_winapi(path).map_err(std::io::Error::other))
        .map_err(|e| e.to_string())
}

fn staged_delete_name(path: &Path) -> PathBuf {
    let extension = path.extension().and_then(|v| v.to_str()).unwrap_or("");
    let ext_suffix = if extension.is_empty() {
        String::new()
    } else {
        format!(".{}", extension)
    };
    let stem = path
        .file_stem()
        .and_then(|v| v.to_str())
        .map(sanitize_filename)
        .unwrap_or_else(|| "item".to_string());
    path.parent()
        .unwrap_or_else(|| Path::new("."))
        .join(format!(
            ".bpc-delete-{}-{}{}",
            stem,
            Uuid::new_v4(),
            ext_suffix
        ))
}

pub fn aggressive_delete_path_with_root(
    app_root: &Path,
    raw_path: &str,
) -> Result<AggressiveDeleteResult, String> {
    let source = PathBuf::from(raw_path.trim());
    if raw_path.trim().is_empty() {
        return Err("path is required".to_string());
    }
    if !source.exists() {
        return Err("path does not exist".to_string());
    }
    if !source.is_file() {
        return Err("aggressive delete currently supports files only".to_string());
    }

    let original = source.canonicalize().unwrap_or(source.clone());
    let mut current = original.clone();
    let mut steps = Vec::new();

    steps.push("attempted standard file removal".to_string());
    if delete_path_best_effort(&current).is_ok() {
        return Ok(AggressiveDeleteResult {
            path: original.to_string_lossy().to_string(),
            final_path: current.to_string_lossy().to_string(),
            deleted_now: true,
            scheduled_on_reboot: false,
            strategy: "standard_delete".to_string(),
            steps,
        });
    }

    if set_normal_attributes(&current).is_ok() {
        steps.push("reset hidden/system/readonly attributes to normal".to_string());
        if delete_path_best_effort(&current).is_ok() {
            return Ok(AggressiveDeleteResult {
                path: original.to_string_lossy().to_string(),
                final_path: current.to_string_lossy().to_string(),
                deleted_now: true,
                scheduled_on_reboot: false,
                strategy: "attribute_reset_then_delete".to_string(),
                steps,
            });
        }
    }

    let staged = staged_delete_name(&current);
    if atomic_move(&current, &staged).is_ok() {
        current = staged;
        steps.push("renamed file into staged pending-delete name".to_string());
        let _ = set_normal_attributes(&current);
        if delete_path_best_effort(&current).is_ok() {
            return Ok(AggressiveDeleteResult {
                path: original.to_string_lossy().to_string(),
                final_path: current.to_string_lossy().to_string(),
                deleted_now: true,
                scheduled_on_reboot: false,
                strategy: "rename_then_delete".to_string(),
                steps,
            });
        }
    }

    schedule_delete_on_reboot_impl(&current)?;
    steps.push("scheduled delete on reboot as locked-file fallback".to_string());

    let _ = append_audit_entry(
        app_root,
        None,
        "aggressive_delete_internal",
        &original.to_string_lossy(),
        json!({"final_path": current.to_string_lossy().to_string()}),
        "ok",
        "aggressive delete scheduled on reboot",
    );

    Ok(AggressiveDeleteResult {
        path: original.to_string_lossy().to_string(),
        final_path: current.to_string_lossy().to_string(),
        deleted_now: false,
        scheduled_on_reboot: true,
        strategy: "rename_or_schedule_reboot_delete".to_string(),
        steps,
    })
}

#[cfg(target_os = "windows")]
fn is_hidden_by_attr(path: &Path) -> bool {
    let wide = match U16CString::from_os_str(path.as_os_str()) {
        Ok(v) => v,
        Err(_) => return false,
    };
    let attrs = unsafe { GetFileAttributesW(wide.as_ptr()) };
    attrs != INVALID_FILE_ATTRIBUTES && (attrs & FILE_ATTRIBUTE_HIDDEN) != 0
}

#[cfg(not(target_os = "windows"))]
fn is_hidden_by_attr(_path: &Path) -> bool {
    false
}

fn is_hidden_name(path: &Path) -> bool {
    path.file_name()
        .and_then(|v| v.to_str())
        .map(|v| v.starts_with('.'))
        .unwrap_or(false)
        || is_hidden_by_attr(path)
}

fn process_exe_string(process: &sysinfo::Process) -> Option<String> {
    process.exe().map(|path| path.to_string_lossy().to_string())
}

fn process_cmdline_string(process: &sysinfo::Process) -> Option<String> {
    let joined = process.cmd().join(" ");
    if joined.trim().is_empty() {
        None
    } else {
        Some(joined)
    }
}

fn looks_like_system_location(path: &str) -> bool {
    let lower = path.to_ascii_lowercase();
    lower.starts_with("c:\\windows\\system32\\")
        || lower.starts_with("c:\\windows\\syswow64\\")
        || lower.starts_with("c:\\windows\\")
        || lower.starts_with("c:\\program files\\")
        || lower.starts_with("c:\\program files (x86)\\")
}

fn looks_like_userland_drop_location(path: &str) -> bool {
    let lower = path.to_ascii_lowercase();
    lower.contains("\\appdata\\roaming\\")
        || lower.contains("\\temp\\")
        || lower.contains("\\tmp\\")
        || lower.contains("\\downloads\\")
        || lower.contains("\\desktop\\")
        || lower.contains("\\programdata\\")
        || lower.contains("\\users\\public\\")
}

fn looks_like_trusted_user_install_location(path: &str) -> bool {
    let lower = path.to_ascii_lowercase();
    lower.contains("\\appdata\\local\\programs\\")
        || lower.contains("\\appdata\\local\\microsoft\\")
        || lower.contains("\\appdata\\local\\packages\\")
}

fn push_reason(reasons: &mut Vec<String>, reason: impl Into<String>) {
    let reason = reason.into();
    if !reasons.iter().any(|existing| existing == &reason) {
        reasons.push(reason);
    }
}

fn increase_signal(signals: &mut HashMap<&'static str, u16>, key: &'static str, value: u16) {
    *signals.entry(key).or_insert(0) += value;
}

fn assess_process_threat(
    name: &str,
    exe: Option<&str>,
    cmdline: Option<&str>,
    cpu_pct: f32,
    mem_bytes: u64,
    child_count: u32,
    digital_signature: Option<bool>,
) -> ThreatAssessment {
    let mut score = 0_u16;
    let mut reasons = Vec::new();
    let mut family_signals: HashMap<&'static str, u16> = HashMap::new();

    let lower_name = name.to_ascii_lowercase();
    let lower_exe = exe.unwrap_or("").to_ascii_lowercase();
    let lower_cmd = cmdline.unwrap_or("").to_ascii_lowercase();
    let combined = format!("{} {} {}", lower_name, lower_exe, lower_cmd);

    if let Some(path) = exe {
        if looks_like_userland_drop_location(path) {
            score += 20;
            push_reason(
                &mut reasons,
                "runs from AppData/Temp/Downloads/ProgramData instead of a trusted system location",
            );
        }
        if looks_like_trusted_user_install_location(path) {
            score = score.saturating_sub(12);
        }
        if lower_exe.contains("\\startup\\")
            || lower_exe.contains("\\run\\")
            || lower_exe.contains("\\runonce\\")
        {
            score += 18;
            increase_signal(&mut family_signals, "trojan", 22);
            increase_signal(&mut family_signals, "rat", 18);
            push_reason(
                &mut reasons,
                "location suggests persistence via Startup/Run path",
            );
        }
    }

    let masquerade_names = [
        "svchost.exe",
        "explorer.exe",
        "lsass.exe",
        "csrss.exe",
        "services.exe",
        "winlogon.exe",
        "spoolsv.exe",
        "taskhostw.exe",
        "runtimebroker.exe",
        "dwm.exe",
    ];
    if masquerade_names.contains(&lower_name.as_str())
        && exe
            .map(|path| !looks_like_system_location(path))
            .unwrap_or(false)
    {
        score += 48;
        increase_signal(&mut family_signals, "trojan", 55);
        push_reason(
            &mut reasons,
            "masquerades as a Windows system process outside system directories",
        );
    }

    let miner_keywords = [
        "xmrig",
        "minerd",
        "cpuminer",
        "nbminer",
        "phoenixminer",
        "lolminer",
        "claymore",
        "excavator",
        "ethminer",
        "gminer",
        "nanominer",
        "nicehash",
        "trex",
        "t-rex",
        "rigel",
        "stratum+tcp",
        "stratum+ssl",
        "randomx",
        "cryptonight",
        "kawpow",
    ];
    if let Some(keyword) = miner_keywords
        .iter()
        .find(|keyword| combined.contains(**keyword))
    {
        score += 55;
        increase_signal(&mut family_signals, "miner", 70);
        push_reason(
            &mut reasons,
            format!("contains miner indicator: {}", keyword),
        );
    }
    if cpu_pct >= 65.0 && combined.contains("stratum") {
        score += 20;
        increase_signal(&mut family_signals, "miner", 24);
        push_reason(
            &mut reasons,
            "high CPU usage together with mining pool terminology",
        );
    } else if cpu_pct >= 80.0 && exe.map(looks_like_userland_drop_location).unwrap_or(false) {
        score += 14;
        increase_signal(&mut family_signals, "miner", 10);
        push_reason(
            &mut reasons,
            "very high CPU usage from a user-space executable",
        );
    }

    let rat_keywords = [
        "njrat",
        "asyncrat",
        "quasar",
        "quasarrat",
        "remcos",
        "darkcomet",
        "xworm",
        "netwire",
        "nanocore",
        "orcus",
        "poisonivy",
    ];
    if let Some(keyword) = rat_keywords
        .iter()
        .find(|keyword| combined.contains(**keyword))
    {
        score += 58;
        increase_signal(&mut family_signals, "rat", 76);
        push_reason(
            &mut reasons,
            format!(
                "contains remote-access-trojan family indicator: {}",
                keyword
            ),
        );
    }
    let c2_keywords = [
        "ngrok",
        "cloudflared tunnel",
        "localtonet",
        "pastebin",
        "webhook",
    ];
    if c2_keywords.iter().any(|keyword| combined.contains(keyword))
        && exe.map(looks_like_userland_drop_location).unwrap_or(false)
    {
        score += 18;
        increase_signal(&mut family_signals, "rat", 22);
        push_reason(
            &mut reasons,
            "tunnel/C2-related terms present in command line",
        );
    }

    let script_loader_terms = [
        " -enc ",
        " -encodedcommand ",
        "frombase64string(",
        "invoke-expression",
        "iex(",
        "downloadstring(",
        "downloadfile(",
        "net.webclient",
        "windowstyle hidden",
        " -nop",
        " -noni",
        "mshta ",
        "javascript:",
        "rundll32",
        "regsvr32",
        "wscript",
        "cscript",
    ];
    let script_hits = script_loader_terms
        .iter()
        .filter(|keyword| lower_cmd.contains(**keyword))
        .count();
    if script_hits >= 2 {
        score += 36;
        increase_signal(&mut family_signals, "trojan", 34);
        increase_signal(&mut family_signals, "rat", 12);
        push_reason(
            &mut reasons,
            "command line looks like a loader/dropper script (encoded PowerShell or LOLBin abuse)",
        );
    }

    if lower_cmd.contains("schtasks /create")
        || lower_cmd.contains("\\currentversion\\run")
        || lower_cmd.contains("startup")
    {
        score += 18;
        increase_signal(&mut family_signals, "trojan", 24);
        increase_signal(&mut family_signals, "rat", 18);
        push_reason(
            &mut reasons,
            "command line suggests persistence installation",
        );
    }

    if matches!(digital_signature, Some(false)) {
        score += 18;
        increase_signal(&mut family_signals, "trojan", 8);
        increase_signal(&mut family_signals, "rat", 8);
        push_reason(&mut reasons, "binary is unsigned or signature is not valid");
    } else if matches!(digital_signature, Some(true)) {
        score = score.saturating_sub(18);
    }

    if child_count >= 5 {
        score += 10;
        increase_signal(&mut family_signals, "rat", 8);
        increase_signal(&mut family_signals, "trojan", 8);
        push_reason(&mut reasons, "spawned many child processes");
    }

    if mem_bytes >= 700 * 1024 * 1024
        && cpu_pct >= 55.0
        && exe.map(looks_like_userland_drop_location).unwrap_or(false)
    {
        score += 10;
        increase_signal(&mut family_signals, "miner", 8);
        push_reason(
            &mut reasons,
            "resource footprint is unusually high for a user-space executable",
        );
    }

    let (family, family_score) = family_signals
        .iter()
        .max_by_key(|(_, value)| *value)
        .map(|(key, value)| ((*key).to_string(), *value))
        .unwrap_or_else(|| {
            if score >= 35 {
                ("suspicious".to_string(), score)
            } else {
                ("clean".to_string(), 0)
            }
        });

    let suspicion_score = score.min(100) as u8;
    let risk = if suspicion_score >= 80 || family_score >= 70 {
        "critical"
    } else if suspicion_score >= 55 || family_score >= 45 {
        "high"
    } else if suspicion_score >= 30 {
        "watch"
    } else {
        "clean"
    }
    .to_string();

    let confidence = if family == "clean" {
        0
    } else if family != "suspicious" && family_score >= 70 {
        90
    } else if family != "suspicious" && family_score >= 45 {
        78
    } else if suspicion_score >= 55 {
        68
    } else {
        52
    };

    ThreatAssessment {
        suspicion_score,
        family,
        risk,
        confidence,
        reasons,
    }
}

fn build_process_system() -> System {
    let mut system = System::new_all();
    system.refresh_all();
    system
}

#[cfg(target_os = "windows")]
fn powershell_literal(input: &str) -> String {
    input.replace('\'', "''")
}

#[cfg(target_os = "windows")]
fn authenticode_signature_status(path: &str) -> Option<bool> {
    let escaped = powershell_literal(path);
    let script = format!(
        "$sig=Get-AuthenticodeSignature -LiteralPath '{}'; if ($null -eq $sig) {{ 'UNKNOWN' }} else {{ $sig.Status.ToString() }}",
        escaped
    );
    let mut cmd = Command::new("powershell");
    cmd.args(["-NoProfile", "-NonInteractive", "-Command", &script]);
    cmd.creation_flags(CREATE_NO_WINDOW);
    let output = cmd.output().ok()?;
    if !output.status.success() {
        return None;
    }
    let value = String::from_utf8_lossy(&output.stdout)
        .trim()
        .to_ascii_lowercase();
    if value.is_empty() || value == "unknown" {
        None
    } else if value == "valid" {
        Some(true)
    } else {
        Some(false)
    }
}

#[cfg(not(target_os = "windows"))]
fn authenticode_signature_status(_path: &str) -> Option<bool> {
    None
}

fn list_processes_impl() -> Vec<ProcessInfo> {
    let system = build_process_system();
    let mut child_counts: HashMap<u32, u32> = HashMap::new();
    for process in system.processes().values() {
        if let Some(parent) = process.parent() {
            *child_counts.entry(parent.as_u32()).or_insert(0) += 1;
        }
    }

    let mut rows: Vec<ProcessInfo> = system
        .processes()
        .iter()
        .map(|(pid, process)| {
            let exe = process_exe_string(process);
            let digital_signature = None;
            let cmdline = process_cmdline_string(process);
            let threat = assess_process_threat(
                &process.name().to_string(),
                exe.as_deref(),
                cmdline.as_deref(),
                process.cpu_usage(),
                process.memory(),
                child_counts.get(&pid.as_u32()).copied().unwrap_or(0),
                digital_signature,
            );
            ProcessInfo {
                pid: pid.as_u32(),
                name: process.name().to_string(),
                exe: exe.clone(),
                cmdline,
                start_ts_unix: process.start_time(),
                cpu_pct: process.cpu_usage(),
                mem_bytes: process.memory(),
                suspicion_score: threat.suspicion_score,
                threat_family: threat.family,
                threat_risk: threat.risk,
                threat_confidence: threat.confidence,
                threat_reasons: threat.reasons,
            }
        })
        .collect();

    rows.sort_by(|a, b| {
        let risk_rank = |value: &str| match value {
            "critical" => 3_u8,
            "high" => 2_u8,
            "watch" => 1_u8,
            _ => 0_u8,
        };
        risk_rank(&b.threat_risk)
            .cmp(&risk_rank(&a.threat_risk))
            .then_with(|| b.threat_confidence.cmp(&a.threat_confidence))
            .then_with(|| b.suspicion_score.cmp(&a.suspicion_score))
            .then_with(|| a.name.to_lowercase().cmp(&b.name.to_lowercase()))
            .then_with(|| a.pid.cmp(&b.pid))
    });
    rows
}

fn get_process_info_impl(pid: u32) -> Result<ProcessDetail, String> {
    let system = build_process_system();
    let mut child_counts: HashMap<u32, u32> = HashMap::new();
    for candidate in system.processes().values() {
        if let Some(parent) = candidate.parent() {
            *child_counts.entry(parent.as_u32()).or_insert(0) += 1;
        }
    }
    let process = system
        .process(Pid::from_u32(pid))
        .ok_or_else(|| format!("process not found: {}", pid))?;

    let exe = process_exe_string(process);
    let digital_signature = exe.as_deref().and_then(authenticode_signature_status);
    let cmdline = process_cmdline_string(process);
    let threat = assess_process_threat(
        &process.name().to_string(),
        exe.as_deref(),
        cmdline.as_deref(),
        process.cpu_usage(),
        process.memory(),
        child_counts.get(&pid).copied().unwrap_or(0),
        digital_signature,
    );
    let sha256 = exe
        .as_ref()
        .and_then(|path| compute_sha256(Path::new(path)).ok());

    Ok(ProcessDetail {
        pid,
        name: process.name().to_string(),
        exe,
        cmdline,
        start_ts_unix: process.start_time(),
        cpu_pct: process.cpu_usage(),
        mem_bytes: process.memory(),
        sha256,
        digital_signature,
        parent_pid: process.parent().map(|parent| parent.as_u32()),
        suspicion_score: threat.suspicion_score,
        threat_family: threat.family,
        threat_risk: threat.risk,
        threat_confidence: threat.confidence,
        threat_reasons: threat.reasons,
    })
}

pub fn quarantine_path_with_root(
    app_root: &Path,
    raw_path: &str,
    reason: Option<String>,
    operator: Option<String>,
) -> Result<QuarantineEntry, String> {
    ensure_quarantine_dirs(app_root)?;

    let source = PathBuf::from(raw_path);
    if !source.exists() {
        return Err("path does not exist".to_string());
    }
    if !source.is_file() {
        return Err("quarantine currently supports files only".to_string());
    }

    let source_abs = source.canonicalize().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    let file_name = source_abs
        .file_name()
        .and_then(|v| v.to_str())
        .map(sanitize_filename)
        .unwrap_or_else(|| "item".to_string());
    let destination = quarantine_files_dir(app_root).join(format!("{}-{}", id, file_name));
    let sha256 = compute_sha256(&source_abs)?;

    atomic_move(&source_abs, &destination)?;

    let entry = QuarantineEntry {
        id: id.clone(),
        original_path: source_abs.to_string_lossy().to_string(),
        quarantine_path: destination.to_string_lossy().to_string(),
        sha256,
        timestamp_iso: now_iso(),
        operator: normalize_operator(operator.as_deref()),
        reason: reason.unwrap_or_else(|| "unspecified".to_string()),
    };

    write_quarantine_entry(app_root, &entry)?;
    Ok(entry)
}

pub fn list_quarantine_entries(app_root: &Path) -> Result<Vec<QuarantineEntry>, String> {
    ensure_quarantine_dirs(app_root)?;
    let mut entries = Vec::new();
    for entry in fs::read_dir(quarantine_manifests_dir(app_root)).map_err(|e| e.to_string())? {
        let path = entry.map_err(|e| e.to_string())?.path();
        if path.extension().and_then(|v| v.to_str()) != Some("json") {
            continue;
        }
        if let Ok(item) = read_quarantine_entry(&path) {
            entries.push(item);
        }
    }
    entries.sort_by(|a, b| b.timestamp_iso.cmp(&a.timestamp_iso));
    Ok(entries)
}

fn restore_quarantine_with_root(app_root: &Path, id: &str) -> Result<QuarantineEntry, String> {
    let manifest_path = quarantine_manifest_path(app_root, id);
    if !manifest_path.exists() {
        return Err("quarantine entry not found".to_string());
    }

    let entry = read_quarantine_entry(&manifest_path)?;
    let original = PathBuf::from(&entry.original_path);
    if original.exists() {
        return Err("original path already exists".to_string());
    }

    let quarantine_path = PathBuf::from(&entry.quarantine_path);
    if !quarantine_path.exists() {
        return Err("quarantine file is missing".to_string());
    }

    atomic_move(&quarantine_path, &original)?;
    fs::remove_file(manifest_path).map_err(|e| e.to_string())?;
    Ok(entry)
}

fn list_audit_entries(app_root: &Path, limit: usize) -> Result<Vec<AuditEntry>, String> {
    let path = audit_log_path(app_root);
    if !path.exists() {
        return Ok(Vec::new());
    }

    let file = fs::File::open(path).map_err(|e| e.to_string())?;
    let reader = BufReader::new(file);
    let cap = limit.max(1);
    let mut queue: VecDeque<AuditEntry> = VecDeque::with_capacity(cap);
    for line in reader.lines() {
        let line = line.map_err(|e| e.to_string())?;
        if line.trim().is_empty() {
            continue;
        }
        let entry: AuditEntry = match serde_json::from_str(&line) {
            Ok(v) => v,
            Err(_) => continue,
        };
        if queue.len() == cap {
            queue.pop_front();
        }
        queue.push_back(entry);
    }
    Ok(queue.into_iter().collect())
}

fn platform_capabilities() -> Value {
    json!({
      "is_windows": cfg!(target_os = "windows"),
      "schedule_delete_on_reboot": cfg!(target_os = "windows"),
      "aggressive_delete": cfg!(target_os = "windows"),
      "force_actions_require_helper": true
    })
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
        use_age_filter: payload["use_age_filter"]
            .as_bool()
            .unwrap_or(days_limit > 0),
        dry_run: payload["dry_run"].as_bool().unwrap_or(true),
    }
}

fn modified_unix(meta: &fs::Metadata) -> i64 {
    meta.modified()
        .ok()
        .and_then(|value| value.duration_since(SystemTime::UNIX_EPOCH).ok())
        .map(|value| value.as_secs() as i64)
        .unwrap_or(0)
}

fn cleanup_item_from_meta(
    path: &Path,
    meta: &fs::Metadata,
    kind: &str,
    action: &str,
    status: &str,
) -> CleanupItem {
    CleanupItem {
        path: path.to_string_lossy().to_string(),
        kind: kind.to_string(),
        extension: path
            .extension()
            .and_then(|value| value.to_str())
            .unwrap_or("")
            .to_ascii_lowercase(),
        size_bytes: meta.len(),
        modified_unix: modified_unix(meta),
        action: action.to_string(),
        status: status.to_string(),
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

fn maybe_delete_empty_dirs(
    root: &Path,
    opt: &CleanupOptions,
    stats: &mut CleanupStats,
    logs: &mut Vec<String>,
    items: &mut Vec<CleanupItem>,
    items_truncated: &mut bool,
) {
    if !opt.delete_empty_dirs {
        return;
    }
    for entry in WalkDir::new(root)
        .contents_first(true)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        let path = entry.path();
        if !path.is_dir() || path == root {
            continue;
        }
        if opt.skip_hidden && is_hidden_name(path) {
            continue;
        }
        let is_empty = fs::read_dir(path)
            .map(|mut i| i.next().is_none())
            .unwrap_or(false);
        if is_empty {
            let item = CleanupItem {
                path: path.to_string_lossy().to_string(),
                kind: "directory".to_string(),
                extension: String::new(),
                size_bytes: 0,
                modified_unix: 0,
                action: if opt.dry_run { "preview" } else { "delete" }.to_string(),
                status: if opt.dry_run { "matched" } else { "deleted" }.to_string(),
            };
            if items.len() < 5000 {
                items.push(item);
            } else {
                *items_truncated = true;
            }

            if opt.dry_run {
                logs.push(format!("Preview empty folder: {}", path.to_string_lossy()));
            } else {
                match fs::remove_dir(path) {
                    Ok(_) => {
                        stats.deleted_dirs += 1;
                        logs.push(format!("Deleted empty folder: {}", path.to_string_lossy()));
                    }
                    Err(e) => {
                        stats.errors += 1;
                        logs.push(format!(
                            "Error deleting folder: {} | {}",
                            path.to_string_lossy(),
                            e
                        ));
                    }
                }
            }
        }
    }
}

fn run_cleanup(app: AppHandle, state: AppState, req_id: String, payload: Value) {
    let _ = req_id;
    let started = std::time::Instant::now();
    let mut logs: Vec<String> = Vec::new();
    let mut stats = CleanupStats::default();
    let mut items: Vec<CleanupItem> = Vec::new();
    let mut items_truncated = false;

    let target_raw = payload["target_path"]
        .as_str()
        .unwrap_or("")
        .trim()
        .to_string();
    if target_raw.is_empty() {
        emit_event(
            &app,
            "analysis-log",
            json!("[error] target_path is required"),
        );
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
        emit_event(
            &app,
            "analysis-log",
            json!("[error] target_path must be an existing directory"),
        );
        emit_event(&app, "analysis-finished", json!({"reportPath": ""}));
        state.running_flag.store(false, Ordering::SeqCst);
        return;
    }

    let options = parse_options(&payload);
    let mode = payload["mode"]
        .as_str()
        .unwrap_or("STANDARD")
        .to_uppercase();
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
        json!(format!(
            "[host] mode={} | folder={}",
            mode,
            target_path.to_string_lossy()
        )),
    );
    emit_cleanup_progress(&app, &stats, Some(&target_path), "started");

    let walker = if options.scan_subfolders {
        WalkDir::new(&target_path)
    } else {
        WalkDir::new(&target_path).max_depth(1)
    };

    for entry in walker.into_iter().filter_entry(|entry| {
        !(options.skip_hidden
            && entry.depth() > 0
            && entry.file_type().is_dir()
            && is_hidden_name(entry.path()))
    }) {
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
                    json!(format!(
                        "[progress] scanned={} deleted={}",
                        stats.scanned, stats.deleted
                    )),
                );
            }
            continue;
        }

        stats.matched += 1;
        stats.matched_bytes += meta.len();
        let mut item = cleanup_item_from_meta(
            path,
            &meta,
            "file",
            if options.dry_run { "preview" } else { "delete" },
            "matched",
        );
        if options.dry_run {
            logs.push(format!("Preview: {}", path.to_string_lossy()));
        } else {
            match fs::remove_file(path) {
                Ok(_) => {
                    stats.deleted += 1;
                    stats.freed_bytes += meta.len();
                    item.status = "deleted".to_string();
                    logs.push(format!("Deleted: {}", path.to_string_lossy()));
                }
                Err(e) => {
                    stats.errors += 1;
                    item.status = "error".to_string();
                    logs.push(format!("Error: {} | {}", path.to_string_lossy(), e));
                }
            }
        }
        if items.len() < 5000 {
            items.push(item);
        } else {
            items_truncated = true;
        }

        if stats.scanned % 100 == 0 || stats.matched <= 5 {
            emit_cleanup_progress(&app, &stats, Some(path), "scanning");
        }

        if stats.scanned % 300 == 0 {
            emit_event(
                &app,
                "analysis-log",
                json!(format!(
                    "[progress] scanned={} matched={} deleted={} errors={}",
                    stats.scanned, stats.matched, stats.deleted, stats.errors
                )),
            );
        }
    }

    maybe_delete_empty_dirs(
        &target_path,
        &options,
        &mut stats,
        &mut logs,
        &mut items,
        &mut items_truncated,
    );
    let stopped = state.stop_flag.load(Ordering::SeqCst);

    for line in logs.iter().rev().take(1200).rev() {
        emit_event(&app, "analysis-log", json!(line));
    }
    emit_cleanup_progress(
        &app,
        &stats,
        Some(&target_path),
        if stopped { "stopped" } else { "finished" },
    );

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
        if stopped {
            f.push(json!({
              "severity": "WARN",
              "code": "STOPPED",
              "category": "runtime",
              "points": 1,
              "message": "Cleanup was stopped before walk completion"
            }));
        }
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

    let score = 100_i64
        .saturating_sub((stats.errors * 10) as i64)
        .clamp(0, 100);
    let report = json!({
      "schema_version": "cleanup-v2",
      "generated_at": Local::now().format("%Y-%m-%dT%H:%M:%S").to_string(),
      "target_path": target_path.to_string_lossy().to_string(),
      "mode": mode,
      "dry_run": options.dry_run,
      "score": score,
      "final_status": if stopped { "STOPPED" } else if stats.errors == 0 { "DONE" } else { "WARN" },
      "items_truncated": items_truncated,
      "findings": findings,
      "options": {
        "days_limit": options.days_limit,
        "min_size_bytes": options.min_size_bytes,
        "extensions": options.extensions.iter().cloned().collect::<Vec<_>>(),
        "scan_subfolders": options.scan_subfolders,
        "delete_empty_dirs": options.delete_empty_dirs,
        "skip_hidden": options.skip_hidden,
        "use_age_filter": options.use_age_filter,
        "dry_run": options.dry_run
      },
      "runtime": [{
        "scenario": "cleanup",
        "exit_code": if stopped || stats.errors > 0 { 1 } else { 0 },
        "timed_out": stopped,
        "duration_ms": duration_ms,
        "stdout_len": logs.len(),
        "stderr_len": stats.errors
      }],
      "cleanup": {
        "scanned": stats.scanned,
        "matched": stats.matched,
        "matched_bytes": stats.matched_bytes,
        "potential_freed_bytes": stats.matched_bytes,
        "deleted": stats.deleted,
        "freed_bytes": stats.freed_bytes,
        "deleted_dirs": stats.deleted_dirs,
        "errors": stats.errors,
        "stopped": stopped
      },
      "items": items,
      "logs_tail": logs.iter().rev().take(200).rev().cloned().collect::<Vec<_>>()
    });

    let filename = format!(
        "cleanup_report_{}.json",
        Local::now().format("%Y%m%d_%H%M%S")
    );
    let report_path = out_dir.join(filename);
    let report_text = serde_json::to_string_pretty(&report).unwrap_or_else(|_| "{}".to_string());
    if let Err(e) = fs::write(&report_path, report_text) {
        emit_event(
            &app,
            "analysis-log",
            json!(format!("[error] failed to save report: {}", e)),
        );
        emit_event(&app, "analysis-finished", json!({"reportPath": ""}));
        state.running_flag.store(false, Ordering::SeqCst);
        return;
    }

    let report_path_string = report_path.to_string_lossy().to_string();
    emit_event(
        &app,
        "analysis-log",
        json!(format!("[host] report saved: {}", report_path_string)),
    );
    emit_event(
        &app,
        "analysis-finished",
        json!({
          "reportPath": report_path_string,
          "stopped": stopped,
          "stats": stats
        }),
    );
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
        "list_processes" => Ok(ok_response(&req_id, json!(list_processes_impl()))),
        "get_process_info" => {
            let Some(pid) = payload["pid"].as_u64() else {
                return Ok(err_response(&req_id, "pid is required"));
            };
            match get_process_info_impl(pid as u32) {
                Ok(detail) => Ok(ok_response(&req_id, json!(detail))),
                Err(err) => Ok(err_response(&req_id, &err)),
            }
        }
        "quarantine_path" => {
            let path = payload["path"].as_str().unwrap_or("").trim().to_string();
            if path.is_empty() {
                return Ok(err_response(&req_id, "path is required"));
            }
            let reason = payload["reason"].as_str().map(|v| v.to_string());
            let operator = payload["operator"].as_str().map(|v| v.to_string());
            match quarantine_path_with_root(
                &state.app_root,
                &path,
                reason.clone(),
                operator.clone(),
            ) {
                Ok(entry) => {
                    let _ = append_audit_entry(
                        &state.app_root,
                        operator.as_deref(),
                        "quarantine",
                        &path,
                        json!({
                          "id": entry.id,
                          "quarantine_path": entry.quarantine_path,
                          "sha256": entry.sha256,
                          "reason": entry.reason
                        }),
                        "ok",
                        "quarantine created",
                    );
                    Ok(ok_response(&req_id, json!(entry)))
                }
                Err(err) => {
                    let _ = append_audit_entry(
                        &state.app_root,
                        operator.as_deref(),
                        "quarantine",
                        &path,
                        json!({"reason": reason}),
                        "error",
                        &err,
                    );
                    Ok(err_response(&req_id, &err))
                }
            }
        }
        "list_quarantine" => match list_quarantine_entries(&state.app_root) {
            Ok(entries) => Ok(ok_response(&req_id, json!(entries))),
            Err(err) => Ok(err_response(&req_id, &err)),
        },
        "restore_quarantine" => {
            let id = payload["id"].as_str().unwrap_or("").trim().to_string();
            if id.is_empty() {
                return Ok(err_response(&req_id, "id is required"));
            }
            match restore_quarantine_with_root(&state.app_root, &id) {
                Ok(entry) => {
                    let _ = append_audit_entry(
                        &state.app_root,
                        None,
                        "restore",
                        &entry.original_path,
                        json!({"id": entry.id, "quarantine_path": entry.quarantine_path}),
                        "ok",
                        "quarantine entry restored",
                    );
                    Ok(ok_response(&req_id, json!(entry)))
                }
                Err(err) => {
                    let _ = append_audit_entry(
                        &state.app_root,
                        None,
                        "restore",
                        &id,
                        json!({"id": id}),
                        "error",
                        &err,
                    );
                    Ok(err_response(&req_id, &err))
                }
            }
        }
        "schedule_delete_on_reboot" => {
            let path = payload["path"].as_str().unwrap_or("").trim().to_string();
            if path.is_empty() {
                return Ok(err_response(&req_id, "path is required"));
            }
            match schedule_delete_on_reboot_impl(Path::new(&path)) {
                Ok(_) => {
                    let _ = append_audit_entry(
                        &state.app_root,
                        None,
                        "schedule_delete",
                        &path,
                        json!({"path": path}),
                        "ok",
                        "scheduled for deletion on reboot",
                    );
                    Ok(ok_response(
                        &req_id,
                        json!({"scheduled": true, "path": path}),
                    ))
                }
                Err(err) => {
                    let _ = append_audit_entry(
                        &state.app_root,
                        None,
                        "schedule_delete",
                        &path,
                        json!({"path": path}),
                        "error",
                        &err,
                    );
                    Ok(err_response(&req_id, &err))
                }
            }
        }
        "aggressive_delete_path" => {
            let path = payload["path"].as_str().unwrap_or("").trim().to_string();
            if path.is_empty() {
                return Ok(err_response(&req_id, "path is required"));
            }
            match aggressive_delete_path_with_root(&state.app_root, &path) {
                Ok(result) => {
                    let _ = append_audit_entry(
                        &state.app_root,
                        None,
                        "aggressive_delete",
                        &path,
                        json!({
                            "final_path": result.final_path,
                            "deleted_now": result.deleted_now,
                            "scheduled_on_reboot": result.scheduled_on_reboot,
                            "strategy": result.strategy,
                            "steps": result.steps
                        }),
                        "ok",
                        "aggressive delete completed",
                    );
                    Ok(ok_response(&req_id, json!(result)))
                }
                Err(err) => {
                    let _ = append_audit_entry(
                        &state.app_root,
                        None,
                        "aggressive_delete",
                        &path,
                        json!({"path": path}),
                        "error",
                        &err,
                    );
                    Ok(err_response(&req_id, &err))
                }
            }
        }
        "request_terminate" => {
            let Some(pid) = payload["pid"].as_u64() else {
                return Ok(err_response(&req_id, "pid is required"));
            };
            let reason = payload["reason"].as_str().unwrap_or("user_requested");
            let timeout_ms = payload["timeout_ms"].as_u64().unwrap_or(5000);
            let response = json!({
              "pid": pid,
              "polite_requested": true,
              "attempted_close": false,
              "timeout_ms": timeout_ms,
              "reason": reason,
              "message": "graceful close was recorded; force termination requires elevation helper"
            });
            let _ = append_audit_entry(
                &state.app_root,
                None,
                "request_terminate",
                &format!("pid:{}", pid),
                response.clone(),
                "ok",
                "polite terminate request recorded",
            );
            Ok(ok_response(&req_id, response))
        }
        "list_audit_log" => {
            let limit = payload["limit"].as_u64().unwrap_or(100) as usize;
            match list_audit_entries(&state.app_root, limit) {
                Ok(entries) => Ok(ok_response(&req_id, json!(entries))),
                Err(err) => Ok(err_response(&req_id, &err)),
            }
        }
        "get_platform_capabilities" => Ok(ok_response(&req_id, platform_capabilities())),
        "request_force_action" => {
            let action = payload["action"].as_str().unwrap_or("force_kill");
            let target = payload["target"].as_str().unwrap_or("unknown");
            let helper_hint = format!(
                "ByPassCleaner.Helper.exe --action={} --target={} --reason=<reason>",
                action, target
            );
            let response = json!({
              "need_elevation": true,
              "helper_required": true,
              "helper_cmd": helper_hint,
              "message": "force actions are blocked in main app and require signed elevation helper"
            });
            let _ = append_audit_entry(
                &state.app_root,
                None,
                "request_force_action",
                target,
                json!({"action": action}),
                "ok",
                "elevation helper required",
            );
            Ok(ok_response(&req_id, response))
        }
        _ => Ok(err_response(
            &req_id,
            &format!("Unsupported command: {}", cmd),
        )),
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

#[cfg(feature = "ide-context-stub")]
fn app_context() -> tauri::Context<tauri::Wry> {
    panic!("ide context stub");
}

#[cfg(not(feature = "ide-context-stub"))]
fn app_context() -> tauri::Context<tauri::Wry> {
    tauri::generate_context!("tauri.conf.json")
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app_root = detect_app_root();
    let state = AppState {
        settings_path: app_root.join("qt_settings.json"),
        app_root,
        stop_flag: Arc::new(AtomicBool::new(false)),
        running_flag: Arc::new(AtomicBool::new(false)),
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
            let window = app
                .get_webview_window("main")
                .expect("main window not found");
            let _ = window.set_title("ByPass Cleaner");
            Ok(())
        })
        .run(app_context())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_temp_dir(prefix: &str) -> PathBuf {
        let root =
            std::env::temp_dir().join(format!("bypass-cleaner-{}-{}", prefix, Uuid::new_v4()));
        fs::create_dir_all(&root).expect("temp dir");
        root
    }

    #[test]
    fn compute_sha256_matches_expected_hash() {
        let root = make_temp_dir("sha256");
        let path = root.join("sample.txt");
        fs::write(&path, b"abc").expect("write sample");

        let hash = compute_sha256(&path).expect("hash");
        assert_eq!(
            hash,
            "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
        );

        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn restore_quarantine_puts_file_back() {
        let root = make_temp_dir("restore");
        let path = root.join("restore-me.bin");
        fs::write(&path, b"payload").expect("write source");

        let entry = quarantine_path_with_root(
            &root,
            path.to_string_lossy().as_ref(),
            Some("test_restore".to_string()),
            Some("tester".to_string()),
        )
        .expect("quarantine");

        assert!(!path.exists());
        let restored = restore_quarantine_with_root(&root, &entry.id).expect("restore");
        assert_eq!(restored.id, entry.id);
        assert!(path.exists());
        assert!(!PathBuf::from(&entry.quarantine_path).exists());

        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn miner_commandline_is_flagged_as_miner() {
        let threat = assess_process_threat(
            "worker.exe",
            Some("C:\\Users\\User\\AppData\\Roaming\\worker.exe"),
            Some("worker.exe --algo randomx --url stratum+tcp://pool:3333 --user wallet"),
            92.0,
            350 * 1024 * 1024,
            0,
            Some(false),
        );

        assert_eq!(threat.family, "miner");
        assert!(threat.suspicion_score >= 70);
        assert!(threat
            .reasons
            .iter()
            .any(|item| item.contains("miner indicator")));
    }

    #[test]
    fn trusted_local_program_is_not_marked_as_trojan() {
        let threat = assess_process_threat(
            "Code.exe",
            Some("C:\\Users\\varpm\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe"),
            Some("Code.exe --type=renderer --enable-sandbox"),
            18.0,
            450 * 1024 * 1024,
            2,
            Some(true),
        );

        assert_ne!(threat.family, "trojan");
        assert!(threat.suspicion_score < 45);
    }
}
