# Kanban Board

A browser Kanban board with To Do / Doing / Done columns, saved in localStorage. Plain HTML/CSS/JS — no dependencies, no build step.

**Live:** https://lewis-p-t.github.io/kanban-board/

Run locally: clone and open `index.html` in a browser.

## Features

- **Cards** — add, drag & drop between columns or reorder within one (← → buttons on touch screens), delete.
- **Details** — click a card to edit title, description, priority, due date and tags. Overdue cards are highlighted.
- **Undo / redo** — snapshot history (Ctrl+Z / Ctrl+Y), capped size.
- **Multiple boards** — create, rename, delete and switch boards; each is stored separately.
- **Search & filters** — fuzzy subsequence search with scored, highlighted matches, plus tag and priority filters.
- **Stats** — per-column counts, overdue count, % done, WIP limits with warnings and an SVG bar chart.
- **Import / export** — download a board as JSON, import one back as a new board (validated and sanitised).
- **Keyboard shortcuts** — press `?` in the app for the list (`/` search, `N` new task, `S` stats).

## Files

| File | What |
|------|------|
| `board.js` | Pure state logic (no DOM): cards, moves, boards, fuzzy search, stats, import/export. Runs in Node too. |
| `history.js` | Undo/redo stack. |
| `script.js` | DOM rendering, events, drag & drop, storage. |
| `index.html`, `style.css` | Markup and styles (light/dark, responsive). |

Quick logic check: `node -e "const B=require('./board.js'); console.log(B.importBoard(JSON.stringify(B.exportBoard('x', B.addCard(B.createBoard(),'hi')))))"`
