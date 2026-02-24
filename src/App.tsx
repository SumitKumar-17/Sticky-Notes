import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";

type ChecklistItem = {
  id: string;
  text: string;
  done: boolean;
};

type Note = {
  id: string;
  title: string;
  items: ChecklistItem[];
  createdAt: number;
  updatedAt: number;
};

type ItemFilter = "all" | "open" | "done";
type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

function createLocalId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [error, setError] = useState("");
  const [newItemText, setNewItemText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [itemFilter, setItemFilter] = useState<ItemFilter>("all");
  const saveTimer = useRef<number | null>(null);

  const activeNote = useMemo(
    () => notes.find((note) => note.id === activeNoteId) ?? null,
    [notes, activeNoteId],
  );

  const filteredNotes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return notes;
    return notes.filter((note) => {
      const titleMatch = note.title.toLowerCase().includes(query);
      const itemMatch = note.items.some((item) =>
        item.text.toLowerCase().includes(query),
      );
      return titleMatch || itemMatch;
    });
  }, [notes, searchQuery]);

  const doneCount = activeNote
    ? activeNote.items.filter((item) => item.done).length
    : 0;
  const totalCount = activeNote ? activeNote.items.length : 0;
  const progress = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  const visibleItems = useMemo(() => {
    if (!activeNote) return [];
    if (itemFilter === "open") return activeNote.items.filter((item) => !item.done);
    if (itemFilter === "done") return activeNote.items.filter((item) => item.done);
    return activeNote.items;
  }, [activeNote, itemFilter]);

  useEffect(() => {
    let isMounted = true;

    async function loadNotes() {
      try {
        const loadedNotes = await invoke<Note[]>("list_notes");
        if (!isMounted) return;
        setNotes(loadedNotes);
        if (loadedNotes.length > 0) {
          setActiveNoteId(loadedNotes[0].id);
        }
      } catch (loadError) {
        if (!isMounted) return;
        setError(String(loadError));
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadNotes();

    return () => {
      isMounted = false;
      if (saveTimer.current !== null) {
        window.clearTimeout(saveTimer.current);
      }
    };
  }, []);

  async function createNote() {
    setError("");
    try {
      const note = await invoke<Note>("create_note", {
        title: `New note ${notes.length + 1}`,
      });
      setNotes((prev) => [note, ...prev]);
      setActiveNoteId(note.id);
      setNewItemText("");
      setSaveState("saved");
    } catch (createError) {
      setError(String(createError));
      setSaveState("error");
    }
  }

  async function duplicateActiveNote() {
    if (!activeNote) return;
    setError("");
    try {
      const base = await invoke<Note>("create_note", {
        title: `${activeNote.title || "Untitled note"} (Copy)`,
      });
      const duplicated: Note = {
        ...base,
        items: activeNote.items.map((item) => ({
          ...item,
          id: createLocalId("item"),
        })),
      };
      const saved = await invoke<Note>("save_note", { note: duplicated });
      setNotes((prev) => [saved, ...prev].sort((a, b) => b.updatedAt - a.updatedAt));
      setActiveNoteId(saved.id);
      setSaveState("saved");
    } catch (duplicateError) {
      setError(String(duplicateError));
      setSaveState("error");
    }
  }

  function schedulePersist(updatedNote: Note) {
    if (saveTimer.current !== null) {
      window.clearTimeout(saveTimer.current);
    }
    setSaveState("dirty");
    saveTimer.current = window.setTimeout(async () => {
      setSaveState("saving");
      setError("");
      try {
        const saved = await invoke<Note>("save_note", { note: updatedNote });
        setNotes((prev) =>
          prev
            .map((note) => (note.id === saved.id ? saved : note))
            .sort((a, b) => b.updatedAt - a.updatedAt),
        );
        setSaveState("saved");
      } catch (saveError) {
        setError(String(saveError));
        setSaveState("error");
      }
    }, 350);
  }

  function updateActiveNote(updater: (note: Note) => Note) {
    if (!activeNote) return;
    const updated = {
      ...updater(activeNote),
      updatedAt: Date.now(),
    };
    setNotes((prev) =>
      prev
        .map((note) => (note.id === updated.id ? updated : note))
        .sort((a, b) => b.updatedAt - a.updatedAt),
    );
    schedulePersist(updated);
  }

  async function removeActiveNote() {
    if (!activeNote) return;
    try {
      await invoke("delete_note", { id: activeNote.id });
      setNotes((prev) => {
        const remaining = prev.filter((note) => note.id !== activeNote.id);
        setActiveNoteId(remaining[0]?.id ?? "");
        return remaining;
      });
      setNewItemText("");
      setError("");
      setSaveState("saved");
    } catch (deleteError) {
      setError(String(deleteError));
      setSaveState("error");
    }
  }

  function addChecklistItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeNote || !newItemText.trim()) return;
    updateActiveNote((note) => ({
      ...note,
      items: [
        ...note.items,
        { id: createLocalId("item"), text: newItemText.trim(), done: false },
      ],
    }));
    setNewItemText("");
  }

  function clearCompletedItems() {
    if (!activeNote) return;
    updateActiveNote((note) => ({
      ...note,
      items: note.items.filter((item) => !item.done),
    }));
  }

  return (
    <main className="app-shell">
      <aside className="notes-pane">
        <div className="notes-pane-header">
          <h1>Sticky Checklist</h1>
          <button onClick={createNote} type="button">
            New Note
          </button>
        </div>

        <input
          className="search-input"
          onChange={(event) => setSearchQuery(event.currentTarget.value)}
          placeholder="Search notes..."
          value={searchQuery}
        />

        {isLoading && <p className="muted">Loading notes...</p>}
        {!isLoading && notes.length === 0 && (
          <p className="muted">No notes yet. Create your first checklist.</p>
        )}
        {!isLoading && notes.length > 0 && filteredNotes.length === 0 && (
          <p className="muted">No notes match your search.</p>
        )}

        <div className="note-list">
          {filteredNotes.map((note) => {
            const noteDoneCount = note.items.filter((item) => item.done).length;
            return (
              <button
                className={`note-card ${note.id === activeNoteId ? "active" : ""}`}
                key={note.id}
                onClick={() => setActiveNoteId(note.id)}
                type="button"
              >
                <span className="note-title">{note.title || "Untitled note"}</span>
                <span className="note-meta">
                  {noteDoneCount}/{note.items.length} done
                </span>
              </button>
            );
          })}
        </div>
      </aside>

      <section className="editor-pane">
        {!activeNote && !isLoading && (
          <div className="empty-state">Select or create a note to start editing.</div>
        )}

        {activeNote && (
          <>
            <div className="editor-header">
              <input
                className="title-input"
                onChange={(event) =>
                  updateActiveNote((note) => ({
                    ...note,
                    title: event.currentTarget.value,
                  }))
                }
                placeholder="Note title"
                value={activeNote.title}
              />
              <button className="ghost" onClick={duplicateActiveNote} type="button">
                Duplicate
              </button>
              <button className="danger" onClick={removeActiveNote} type="button">
                Delete Note
              </button>
            </div>

            <div className="progress-row">
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${progress}%` }} />
              </div>
              <span className="note-meta">
                {doneCount}/{totalCount} complete ({progress}%)
              </span>
            </div>

            <form className="add-item-row" onSubmit={addChecklistItem}>
              <input
                onChange={(event) => setNewItemText(event.currentTarget.value)}
                placeholder="Add checklist item..."
                value={newItemText}
              />
              <button type="submit">Add</button>
            </form>

            <div className="item-controls">
              <div className="filter-row">
                <button
                  className={itemFilter === "all" ? "active-filter" : ""}
                  onClick={() => setItemFilter("all")}
                  type="button"
                >
                  All
                </button>
                <button
                  className={itemFilter === "open" ? "active-filter" : ""}
                  onClick={() => setItemFilter("open")}
                  type="button"
                >
                  Open
                </button>
                <button
                  className={itemFilter === "done" ? "active-filter" : ""}
                  onClick={() => setItemFilter("done")}
                  type="button"
                >
                  Done
                </button>
              </div>
              <button
                className="ghost"
                disabled={doneCount === 0}
                onClick={clearCompletedItems}
                type="button"
              >
                Clear Completed
              </button>
            </div>

            <div className="checklist">
              {activeNote.items.length === 0 && (
                <p className="muted">No checklist items yet.</p>
              )}
              {activeNote.items.length > 0 && visibleItems.length === 0 && (
                <p className="muted">No items in this filter.</p>
              )}
              {visibleItems.map((item) => (
                <div className="checklist-item" key={item.id}>
                  <input
                    checked={item.done}
                    onChange={() =>
                      updateActiveNote((note) => ({
                        ...note,
                        items: note.items.map((next) =>
                          next.id === item.id ? { ...next, done: !next.done } : next,
                        ),
                      }))
                    }
                    type="checkbox"
                  />
                  <input
                    className={item.done ? "item-text done" : "item-text"}
                    onChange={(event) =>
                      updateActiveNote((note) => ({
                        ...note,
                        items: note.items.map((next) =>
                          next.id === item.id
                            ? { ...next, text: event.currentTarget.value }
                            : next,
                        ),
                      }))
                    }
                    value={item.text}
                  />
                  <button
                    className="ghost"
                    onClick={() =>
                      updateActiveNote((note) => ({
                        ...note,
                        items: note.items.filter((next) => next.id !== item.id),
                      }))
                    }
                    type="button"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        <footer className="status-row">
          {saveState === "saving" && <span>Saving...</span>}
          {saveState === "dirty" && <span>Pending save...</span>}
          {(saveState === "saved" || saveState === "idle") && <span>Saved locally</span>}
          {saveState === "error" && <span className="error">Save failed</span>}
          {error && <span className="error">{error}</span>}
        </footer>
      </section>
    </main>
  );
}

export default App;
