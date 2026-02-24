import { ChangeEvent, useMemo, useRef, useState } from "react";
import { NoteEditor } from "./components/NoteEditor";
import { NotesSidebar } from "./components/NotesSidebar";
import { useNotes } from "./hooks/useNotes";
import { ItemFilter, NoteSort } from "./types/note";
import { exportNotesAsJson, readJsonFile } from "./utils/fileTransfer";
import { sortNotes } from "./utils/noteHelpers";
import "./App.css";

function App() {
  const {
    notes,
    activeNote,
    activeNoteId,
    isLoading,
    saveState,
    error,
    setActiveNoteId,
    createNote,
    duplicateActiveNote,
    updateActiveNote,
    removeActiveNote,
    importNotes,
    clearError,
  } = useNotes();

  const [newItemText, setNewItemText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [itemFilter, setItemFilter] = useState<ItemFilter>("all");
  const [sortBy, setSortBy] = useState<NoteSort>("recent");
  const [importMessage, setImportMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const filteredAndSortedNotes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = notes.filter((note) => {
      if (!query) return true;
      const titleMatch = note.title.toLowerCase().includes(query);
      const itemMatch = note.items.some((item) =>
        item.text.toLowerCase().includes(query),
      );
      return titleMatch || itemMatch;
    });
    return sortNotes(filtered, sortBy);
  }, [notes, searchQuery, sortBy]);

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;

    clearError();
    setImportMessage("");
    try {
      const parsed = await readJsonFile(file);
      const count = await importNotes(parsed);
      if (count > 0) {
        setImportMessage(`Imported ${count} notes.`);
      }
    } catch (importError) {
      setImportMessage(String(importError));
    }
  }

  function handleExport() {
    exportNotesAsJson(notes);
    setImportMessage("Exported notes JSON.");
  }

  return (
    <main className="app-shell">
      <input
        accept=".json,application/json"
        className="hidden-input"
        onChange={handleImport}
        ref={fileInputRef}
        type="file"
      />

      <NotesSidebar
        activeNoteId={activeNoteId}
        isLoading={isLoading}
        notes={filteredAndSortedNotes}
        onCreate={createNote}
        onExport={handleExport}
        onImportClick={() => fileInputRef.current?.click()}
        onSearchChange={setSearchQuery}
        onSelect={setActiveNoteId}
        onSortChange={setSortBy}
        searchQuery={searchQuery}
        sortBy={sortBy}
      />

      <section className="editor-with-status">
        <NoteEditor
          itemFilter={itemFilter}
          newItemText={newItemText}
          note={activeNote}
          onDelete={removeActiveNote}
          onDuplicate={duplicateActiveNote}
          onFilterChange={setItemFilter}
          onNewItemTextChange={setNewItemText}
          onUpdate={updateActiveNote}
        />

        <footer className="status-row">
          {saveState === "saving" && <span>Saving...</span>}
          {saveState === "dirty" && <span>Pending save...</span>}
          {(saveState === "saved" || saveState === "idle") && <span>Saved locally</span>}
          {saveState === "error" && <span className="error">Save failed</span>}
          {importMessage && <span className="muted">{importMessage}</span>}
          {error && <span className="error">{error}</span>}
        </footer>
      </section>
    </main>
  );
}

export default App;
