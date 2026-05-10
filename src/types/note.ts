export type ChecklistItem = {
  id: string;
  text: string;
  done: boolean;
};

export type NoteColor = "none" | "yellow" | "green" | "blue" | "pink" | "purple" | "orange";

export const NOTE_COLORS: NoteColor[] = ["none", "yellow", "green", "blue", "pink", "purple", "orange"];

export type Note = {
  id: string;
  title: string;
  items: ChecklistItem[];
  color: NoteColor;
  order: number;
  createdAt: number;
  updatedAt: number;
};

export type ItemFilter = "all" | "open" | "done";
export type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";
export type NoteSort = "manual" | "recent" | "title" | "completion";
