# Sticky Checklist Notes (Tauri + React)

Desktop checklist-notes app for Linux. You can:
- Create notes
- Search notes by title or checklist text
- Duplicate notes
- Edit note titles
- Add/edit/toggle/delete checklist items
- Filter checklist items (all/open/done)
- Clear completed checklist items
- Track completion progress
- Delete notes
- Keep notes persisted locally in app data

## Arch Linux prerequisites

```bash
sudo pacman -S --needed \
  base-devel curl wget file openssl appmenu-gtk-module gtk3 \
  libappindicator-gtk3 librsvg xdg-utils webkit2gtk-4.1 \
  llvm clang lld
```

Install Node.js (LTS), npm, and Rust:

```bash
sudo pacman -S --needed nodejs npm rustup
rustup default stable
```

## Run in development

```bash
npm install
npm run tauri dev
```

## Build installable app/package

```bash
npm run tauri build
```

Build output will be generated under:
- `src-tauri/target/release/bundle/`
