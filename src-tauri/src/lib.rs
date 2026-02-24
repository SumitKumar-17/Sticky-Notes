use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::Manager;

const NOTES_FILE_NAME: &str = "notes.json";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ChecklistItem {
    id: String,
    text: String,
    done: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Note {
    id: String,
    title: String,
    items: Vec<ChecklistItem>,
    #[serde(default)]
    order: u64,
    created_at: u128,
    updated_at: u128,
}

fn now_millis() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis()
}

fn generate_id(prefix: &str) -> String {
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    format!("{prefix}-{nanos}")
}

fn storage_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("failed to get app data dir: {e}"))?;
    fs::create_dir_all(&data_dir).map_err(|e| format!("failed to create app data dir: {e}"))?;
    Ok(data_dir.join(NOTES_FILE_NAME))
}

fn load_notes_internal(app: &tauri::AppHandle) -> Result<Vec<Note>, String> {
    let path = storage_path(app)?;
    if !path.exists() {
        return Ok(Vec::new());
    }

    let content = fs::read_to_string(path).map_err(|e| format!("failed to read notes: {e}"))?;
    if content.trim().is_empty() {
        return Ok(Vec::new());
    }

    serde_json::from_str(&content).map_err(|e| format!("failed to parse notes: {e}"))
}

fn save_notes_internal(app: &tauri::AppHandle, notes: &[Note]) -> Result<(), String> {
    let path = storage_path(app)?;
    let content =
        serde_json::to_string_pretty(notes).map_err(|e| format!("failed to serialize notes: {e}"))?;
    fs::write(path, content).map_err(|e| format!("failed to write notes: {e}"))
}

#[tauri::command]
fn list_notes(app: tauri::AppHandle) -> Result<Vec<Note>, String> {
    let mut notes = load_notes_internal(&app)?;
    let needs_order_migration = notes.iter().any(|note| note.order == 0);
    if needs_order_migration {
        notes.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));
        for (index, note) in notes.iter_mut().enumerate() {
            note.order = index as u64 + 1;
        }
        save_notes_internal(&app, &notes)?;
    }
    notes.sort_by(|a, b| a.order.cmp(&b.order).then_with(|| b.updated_at.cmp(&a.updated_at)));
    Ok(notes)
}

#[tauri::command]
fn create_note(app: tauri::AppHandle, title: Option<String>) -> Result<Note, String> {
    let mut notes = load_notes_internal(&app)?;
    let now = now_millis();
    let next_order = notes.iter().map(|note| note.order).max().unwrap_or(0) + 1;
    let note = Note {
        id: generate_id("note"),
        title: title.unwrap_or_else(|| "Untitled note".to_string()),
        items: Vec::new(),
        order: next_order,
        created_at: now,
        updated_at: now,
    };

    notes.push(note.clone());
    save_notes_internal(&app, &notes)?;
    Ok(note)
}

#[tauri::command]
fn save_note(app: tauri::AppHandle, mut note: Note) -> Result<Note, String> {
    let mut notes = load_notes_internal(&app)?;
    note.updated_at = now_millis();

    if let Some(existing) = notes.iter_mut().find(|n| n.id == note.id) {
        note.created_at = existing.created_at;
        note.order = existing.order;
        *existing = note.clone();
    } else {
        if note.created_at == 0 {
            note.created_at = note.updated_at;
        }
        if note.order == 0 {
            note.order = notes.iter().map(|n| n.order).max().unwrap_or(0) + 1;
        }
        notes.push(note.clone());
    }

    save_notes_internal(&app, &notes)?;
    Ok(note)
}

#[tauri::command]
fn delete_note(app: tauri::AppHandle, id: String) -> Result<(), String> {
    let mut notes = load_notes_internal(&app)?;
    notes.retain(|note| note.id != id);
    save_notes_internal(&app, &notes)
}

#[tauri::command]
fn reorder_notes(app: tauri::AppHandle, ids: Vec<String>) -> Result<(), String> {
    let mut notes = load_notes_internal(&app)?;
    for (index, id) in ids.iter().enumerate() {
        if let Some(note) = notes.iter_mut().find(|note| note.id == *id) {
            note.order = index as u64 + 1;
        }
    }
    save_notes_internal(&app, &notes)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            list_notes,
            create_note,
            save_note,
            delete_note,
            reorder_notes
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
