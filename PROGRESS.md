# Kanban Board — Build Progress

Drag tasks between To Do / Doing / Done columns, saved in the browser. Static files only, no dependencies.

- [x] 1. Skeleton: three columns (To Do / Doing / Done), add a card, move it left/right with buttons, delete, persist to localStorage. Pure state logic in `board.js`.
- [x] 2. Drag & drop between columns and reorder within a column (pure `moveCard(state, id, toCol, index)` with drop-position indicator).
- [x] 3. Card detail modal: edit title, description, priority, due date and tags; overdue highlighting.
- [x] 4. Undo / redo history stack (snapshot-based, capped size) with Ctrl+Z / Ctrl+Y and toolbar buttons.
- [x] 5. Multiple boards: board switcher, create / rename / delete boards, each persisted separately.
- [x] 6. Search & filters: fuzzy subsequence search with scored highlighting, plus tag and priority filters.
- [x] 7. Stats view: per-column counts, overdue count, WIP limits per column with warnings, simple SVG bar chart.
- [x] 8. Import / export boards as JSON, keyboard shortcuts help, responsive/mobile polish, README.
