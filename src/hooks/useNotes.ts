import { useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Note, SaveState } from "../types/note";
import {
  createLocalId,
  moveInArray,
  normalizeImportedNotes,
  sortNotes,
} from "../utils/noteHelpers";

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [error, setError] = useState("");
  const saveTimer = useRef<number | null>(null);

  const activeNote = useMemo(
    () => notes.find((note) => note.id === activeNoteId) ?? null,
    [notes, activeNoteId],
  );

  useEffect(() => {
    let isMounted = true;

    async function loadNotes() {
      try {
        const loaded = await invoke<Note[]>("list_notes");
        if (!isMounted) return;
        setNotes(loaded);
        if (loaded[0]) {
          setActiveNoteId(loaded[0].id);
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
      setNotes((prev) => sortNotes([note, ...prev], "manual"));
      setActiveNoteId(note.id);
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
      setNotes((prev) => sortNotes([saved, ...prev], "manual"));
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
        setNotes((prev) => prev.map((note) => (note.id === saved.id ? saved : note)));
        setSaveState("saved");
      } catch (saveError) {
        setError(String(saveError));
        setSaveState("error");
      }
    }, 300);
  }

  function updateActiveNote(updater: (note: Note) => Note) {
    if (!activeNote) return;
    const updated = {
      ...updater(activeNote),
      updatedAt: Date.now(),
    };
    setNotes((prev) =>
      prev.map((note) => (note.id === updated.id ? updated : note)),
    );
    schedulePersist(updated);
  }

  async function removeActiveNote() {
    if (!activeNote) return;
    try {
      await invoke("delete_note", { id: activeNote.id });
      setNotes((prev) => {
        const next = prev.filter((note) => note.id !== activeNote.id);
        if (next[0]) {
          setActiveNoteId(next[0].id);
        } else {
          setActiveNoteId("");
        }
        return next;
      });
      setSaveState("saved");
      setError("");
    } catch (removeError) {
      setError(String(removeError));
      setSaveState("error");
    }
  }

  async function importNotes(raw: unknown) {
    try {
      const imported = normalizeImportedNotes(raw);
      for (const note of imported) {
        await invoke("save_note", { note });
      }

      const refreshed = await invoke<Note[]>("list_notes");
      setNotes(refreshed);
      if (!activeNoteId && refreshed[0]) {
        setActiveNoteId(refreshed[0].id);
      }
      setSaveState("saved");
      setError("");
      return imported.length;
    } catch (importError) {
      setError(String(importError));
      setSaveState("error");
      return 0;
    }
  }

  function clearError() {
    setError("");
  }

  async function reorderNotes(sourceId: string, targetId: string) {
    if (sourceId === targetId) return;

    const sourceIndex = notes.findIndex((note) => note.id === sourceId);
    const targetIndex = notes.findIndex((note) => note.id === targetId);
    if (sourceIndex === -1 || targetIndex === -1) return;

    const moved = moveInArray(notes, sourceIndex, targetIndex).map((note, index) => ({
      ...note,
      order: index + 1,
    }));
    setNotes(moved);
    setSaveState("saving");
    setError("");

    try {
      await invoke("reorder_notes", { ids: moved.map((note) => note.id) });
      setSaveState("saved");
    } catch (reorderError) {
      setError(String(reorderError));
      setSaveState("error");
    }
  }

  return {
    notes,
    setNotes,
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
    reorderNotes,
    importNotes,
    clearError,
  };
}
