import { Note, NoteSort } from "../types/note";

type Props = {
  notes: Note[];
  activeNoteId: string;
  isLoading: boolean;
  searchQuery: string;
  sortBy: NoteSort;
  onSearchChange: (value: string) => void;
  onSortChange: (value: NoteSort) => void;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onExport: () => void;
  onImportClick: () => void;
};

export function NotesSidebar(props: Props) {
  return (
    <aside className="notes-pane">
      <div className="notes-pane-header">
        <h1>Sticky Checklist</h1>
        <button onClick={props.onCreate} type="button">
          New Note
        </button>
      </div>

      <div className="sidebar-actions">
        <button className="ghost" onClick={props.onExport} type="button">
          Export
        </button>
        <button className="ghost" onClick={props.onImportClick} type="button">
          Import
        </button>
      </div>

      <input
        className="search-input"
        onChange={(event) => props.onSearchChange(event.currentTarget.value)}
        placeholder="Search notes..."
        value={props.searchQuery}
      />

      <select
        className="sort-select"
        onChange={(event) => props.onSortChange(event.currentTarget.value as NoteSort)}
        value={props.sortBy}
      >
        <option value="recent">Sort: Recently updated</option>
        <option value="title">Sort: Title A-Z</option>
        <option value="completion">Sort: Completion</option>
      </select>

      {props.isLoading && <p className="muted">Loading notes...</p>}
      {!props.isLoading && props.notes.length === 0 && (
        <p className="muted">No notes found.</p>
      )}

      <div className="note-list">
        {props.notes.map((note) => {
          const doneCount = note.items.filter((item) => item.done).length;
          return (
            <button
              className={`note-card ${note.id === props.activeNoteId ? "active" : ""}`}
              key={note.id}
              onClick={() => props.onSelect(note.id)}
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
  );
}
