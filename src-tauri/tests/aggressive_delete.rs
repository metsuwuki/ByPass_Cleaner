use bypass_cleaner::aggressive_delete_path_with_root;
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
fn aggressive_delete_removes_regular_file_immediately() {
    let app_root = make_temp_dir("aggressive-delete");
    let source = app_root.join("locked-looking.bin");
    fs::write(&source, b"payload").expect("write source");

    let result = aggressive_delete_path_with_root(&app_root, source.to_string_lossy().as_ref())
        .expect("aggressive delete result");

    assert!(result.deleted_now);
    assert!(!result.scheduled_on_reboot);
    assert!(!source.exists());
    assert!(
        result.strategy == "standard_delete"
            || result.strategy == "attribute_reset_then_delete"
            || result.strategy == "rename_then_delete"
    );

    let _ = fs::remove_dir_all(app_root);
}
