use bypass_cleaner::quarantine_path_with_root;
use std::fs;
use std::path::PathBuf;
use uuid::Uuid;

fn make_temp_dir(prefix: &str) -> PathBuf {
    let root =
        std::env::temp_dir().join(format!("bypass-cleaner-it-{}-{}", prefix, Uuid::new_v4()));
    fs::create_dir_all(&root).expect("temp dir");
    root
}

#[test]
fn quarantine_moves_file_and_writes_manifest() {
    let app_root = make_temp_dir("quarantine");
    let source = app_root.join("sample.bin");
    fs::write(&source, b"payload").expect("write source");

    let entry = quarantine_path_with_root(
        &app_root,
        source.to_string_lossy().as_ref(),
        Some("integration_test".to_string()),
        Some("tester".to_string()),
    )
    .expect("quarantine entry");

    let manifest_path = app_root
        .join(".quarantine")
        .join("manifests")
        .join(format!("{}.json", entry.id));
    assert!(!source.exists());
    assert!(PathBuf::from(&entry.quarantine_path).exists());
    assert!(manifest_path.exists());

    let _ = fs::remove_dir_all(app_root);
}
