# Sticky Checklist Notes Plan

## Goal
Build a desktop notes app for Arch Linux where each note is an editable checklist.

## Stack
- Tauri v2 (desktop shell)
- React + TypeScript + Vite (UI)
- Rust backend commands for local JSON persistence

## Features (MVP)
1. Create note
2. Edit note title
3. Add checklist item
4. Edit checklist item text
5. Mark checklist item done/undone
6. Delete checklist item
7. Delete note
8. Persistent storage on local machine

## Build Steps
1. Replace template greet app with note/checklist domain model.
2. Implement Tauri commands:
   - `list_notes`
   - `create_note`
   - `save_note`
   - `delete_note`
3. Build UI with:
   - left note list
   - right editor pane
4. Wire UI to backend invoke commands and save updates.
5. Verify with TypeScript build and Tauri rust checks.
6. Run app in development mode and package it for Linux.

## Git Strategy
- Commit 1: project plan document.
- Commit 2: backend persistence commands.
- Commit 3: frontend checklist UI + command integration.
- Commit 4: docs/run instructions and final polish.
