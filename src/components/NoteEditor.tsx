import { FormEvent } from "react";
import { ItemFilter, Note } from "../types/note";
import { createLocalId } from "../utils/noteHelpers";

type Props = {
  note: Note | null;
  newItemText: string;
  itemFilter: ItemFilter;
  onNewItemTextChange: (value: string) => void;
  onFilterChange: (value: ItemFilter) => void;
  onUpdate: (updater: (note: Note) => Note) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onReorderItems: (sourceId: string, targetId: string) => void;
};

export function NoteEditor(props: Props) {
  if (!props.note) {
    return (
      <section className="editor-pane">
        <div className="empty-state">Select or create a note to start editing.</div>
      </section>
    );
  }

  const doneCount = props.note.items.filter((item) => item.done).length;
  const totalCount = props.note.items.length;
  const progress = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
  const visibleItems = props.note.items.filter((item) => {
    if (props.itemFilter === "open") return !item.done;
    if (props.itemFilter === "done") return item.done;
    return true;
  });
  const canDragItems = props.itemFilter === "all";

  function addChecklistItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = props.newItemText.trim();
    if (!text) return;

    props.onUpdate((note) => ({
      ...note,
      items: [...note.items, { id: createLocalId("item"), text, done: false }],
    }));
    props.onNewItemTextChange("");
  }

  return (
    <section className="editor-pane">
      <div className="editor-header">
        <input
          className="title-input"
          onChange={(event) =>
            props.onUpdate((note) => ({
              ...note,
              title: event.currentTarget.value,
            }))
          }
          placeholder="Note title"
          value={props.note.title}
        />
        <button className="ghost" onClick={props.onDuplicate} type="button">
          Duplicate
        </button>
        <button className="danger" onClick={props.onDelete} type="button">
          Delete
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
          onChange={(event) => props.onNewItemTextChange(event.currentTarget.value)}
          placeholder="Add checklist item..."
          value={props.newItemText}
        />
        <button type="submit">Add</button>
      </form>

      <div className="item-controls">
        <div className="filter-row">
          <button
            className={props.itemFilter === "all" ? "active-filter" : ""}
            onClick={() => props.onFilterChange("all")}
            type="button"
          >
            All
          </button>
          <button
            className={props.itemFilter === "open" ? "active-filter" : ""}
            onClick={() => props.onFilterChange("open")}
            type="button"
          >
            Open
          </button>
          <button
            className={props.itemFilter === "done" ? "active-filter" : ""}
            onClick={() => props.onFilterChange("done")}
            type="button"
          >
            Done
          </button>
        </div>
        <button
          className="ghost"
          disabled={doneCount === 0}
          onClick={() =>
            props.onUpdate((note) => ({
              ...note,
              items: note.items.filter((item) => !item.done),
            }))
          }
          type="button"
        >
          Clear Completed
        </button>
      </div>

      <div className="item-controls">
        <span className="muted">Quick actions</span>
        <div className="filter-row">
          <button
            className="ghost"
            onClick={() =>
              props.onUpdate((note) => ({
                ...note,
                items: note.items.map((item) => ({ ...item, done: true })),
              }))
            }
            type="button"
          >
            Mark all done
          </button>
          <button
            className="ghost"
            onClick={() =>
              props.onUpdate((note) => ({
                ...note,
                items: note.items.map((item) => ({ ...item, done: false })),
              }))
            }
            type="button"
          >
            Reset all
          </button>
        </div>
      </div>

      <div className="checklist">
        {props.note.items.length === 0 && <p className="muted">No checklist items yet.</p>}
        {props.note.items.length > 0 && visibleItems.length === 0 && (
          <p className="muted">No items in this filter.</p>
        )}
        {!canDragItems && props.note.items.length > 1 && (
          <p className="muted">Switch filter to "All" to drag and reorder items.</p>
        )}
        {canDragItems && props.note.items.length > 1 && (
          <p className="muted">Drag checklist rows to reorder.</p>
        )}
        {visibleItems.map((item) => (
          <div
            className="checklist-item"
            draggable={canDragItems}
            key={item.id}
            onDragOver={(event) => {
              if (!canDragItems) return;
              event.preventDefault();
            }}
            onDrop={(event) => {
              if (!canDragItems) return;
              event.preventDefault();
              const sourceId = event.dataTransfer.getData("text/item-id");
              if (!sourceId) return;
              props.onReorderItems(sourceId, item.id);
            }}
            onDragStart={(event) => {
              if (!canDragItems) return;
              event.dataTransfer.setData("text/item-id", item.id);
              event.dataTransfer.effectAllowed = "move";
            }}
          >
            <input
              checked={item.done}
              onChange={() =>
                props.onUpdate((note) => ({
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
                props.onUpdate((note) => ({
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
                props.onUpdate((note) => ({
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
    </section>
  );
}
