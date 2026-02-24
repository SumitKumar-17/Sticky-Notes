import { FormEvent, useEffect, useMemo, useState } from "react";
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

function createLocalId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [newItemText, setNewItemText] = useState("");

  const activeNote = useMemo(
    () => notes.find((note) => note.id === activeNoteId) ?? null,
    [notes, activeNoteId],
  );

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
    } catch (createError) {
      setError(String(createError));
    }
  }

  async function persistNote(updatedNote: Note) {
    setIsSaving(true);
    setError("");
    try {
      const saved = await invoke<Note>("save_note", { note: updatedNote });
      setNotes((prev) =>
        prev
          .map((note) => (note.id === saved.id ? saved : note))
          .sort((a, b) => b.updatedAt - a.updatedAt),
      );
    } catch (saveError) {
      setError(String(saveError));
    } finally {
      setIsSaving(false);
    }
  }

  function updateActiveNote(updater: (note: Note) => Note) {
    if (!activeNote) return;
    const updated = updater(activeNote);
    setNotes((prev) => prev.map((note) => (note.id === updated.id ? updated : note)));
    void persistNote(updated);
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
    } catch (deleteError) {
      setError(String(deleteError));
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

  return (
    <main className="app-shell">
      <aside className="notes-pane">
        <div className="notes-pane-header">
          <h1>Sticky Checklist</h1>
          <button onClick={createNote} type="button">
            New Note
          </button>
        </div>
        {isLoading && <p className="muted">Loading notes...</p>}
        {!isLoading && notes.length === 0 && (
          <p className="muted">No notes yet. Create your first checklist.</p>
        )}
        <div className="note-list">
          {notes.map((note) => {
            const doneCount = note.items.filter((item) => item.done).length;
            return (
              <button
                className={`note-card ${note.id === activeNoteId ? "active" : ""}`}
                key={note.id}
                onClick={() => setActiveNoteId(note.id)}
                type="button"
              >
                <span className="note-title">{note.title || "Untitled note"}</span>
                <span className="note-meta">
                  {doneCount}/{note.items.length} done
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
              <button className="danger" onClick={removeActiveNote} type="button">
                Delete Note
              </button>
            </div>

            <form className="add-item-row" onSubmit={addChecklistItem}>
              <input
                onChange={(event) => setNewItemText(event.currentTarget.value)}
                placeholder="Add checklist item..."
                value={newItemText}
              />
              <button type="submit">Add</button>
            </form>

            <div className="checklist">
              {activeNote.items.length === 0 && (
                <p className="muted">No checklist items yet.</p>
              )}
              {activeNote.items.map((item) => (
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
          {isSaving ? <span>Saving...</span> : <span>Saved locally</span>}
          {error && <span className="error">{error}</span>}
        </footer>
      </section>
    </main>
  );
}

export default App;
