import { Note, NoteColor, NoteSort } from "../types/note";

const VALID_COLORS: NoteColor[] = ["none", "yellow", "green", "blue", "pink", "purple", "orange"];

export function createLocalId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function sortNotes(notes: Note[], sort: NoteSort) {
  const copy = [...notes];
  if (sort === "manual") {
    return copy.sort((a, b) => a.order - b.order);
  }
  if (sort === "title") {
    return copy.sort((a, b) => a.title.localeCompare(b.title));
  }
  if (sort === "completion") {
    return copy.sort((a, b) => completionRatio(b) - completionRatio(a));
  }
  return copy.sort((a, b) => b.updatedAt - a.updatedAt);
}

export function moveInArray<T>(items: T[], from: number, to: number) {
  if (from === to) return [...items];
  const copy = [...items];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

function completionRatio(note: Note) {
  if (note.items.length === 0) return 0;
  const done = note.items.filter((item) => item.done).length;
  return done / note.items.length;
}

export function normalizeImportedNotes(raw: unknown): Note[] {
  if (!Array.isArray(raw)) {
    throw new Error("Imported file must be an array of notes.");
  }

  return raw.map((entry, index) => normalizeSingleNote(entry, index));
}

function normalizeSingleNote(raw: unknown, index: number): Note {
  if (!raw || typeof raw !== "object") {
    throw new Error(`Note at index ${index} is invalid.`);
  }

  const partial = raw as Partial<Note>;
  const now = Date.now();

  const color = VALID_COLORS.includes(partial.color as NoteColor) ? (partial.color as NoteColor) : "none";
  return {
    id: createLocalId("note"),
    title: typeof partial.title === "string" ? partial.title : `Imported note ${index + 1}`,
    items: normalizeItems(partial.items),
    color,
    order: typeof partial.order === "number" ? partial.order : index + 1,
    createdAt: typeof partial.createdAt === "number" ? partial.createdAt : now,
    updatedAt: now,
  };
}

function normalizeItems(raw: unknown): Note["items"] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item) => item && typeof item === "object")
    .map((item) => {
      const partial = item as { text?: unknown; done?: unknown };
      return {
        id: createLocalId("item"),
        text: typeof partial.text === "string" ? partial.text : "",
        done: typeof partial.done === "boolean" ? partial.done : false,
      };
    });
}
