export type ChecklistItem = {
  id: string;
  text: string;
  done: boolean;
};

export type Note = {
  id: string;
  title: string;
  items: ChecklistItem[];
  createdAt: number;
  updatedAt: number;
};

export type ItemFilter = "all" | "open" | "done";
export type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";
export type NoteSort = "recent" | "title" | "completion";
