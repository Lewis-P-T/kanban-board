// Pure board state logic — no DOM. Works in the browser (window.Board) and in Node (module.exports).
(function (root) {
  const COLUMNS = [
    { id: 'todo', title: 'To Do' },
    { id: 'doing', title: 'Doing' },
    { id: 'done', title: 'Done' },
  ];

  function createBoard() {
    return { columns: COLUMNS.map(c => ({ id: c.id, title: c.title, cardIds: [] })), cards: {}, nextId: 1 };
  }

  function addCard(state, title, colId = 'todo') {
    title = String(title || '').trim();
    if (!title) return state;
    const id = 'c' + state.nextId;
    return {
      ...state,
      nextId: state.nextId + 1,
      cards: { ...state.cards, [id]: { id, title, created: Date.now() } },
      columns: state.columns.map(c => c.id === colId ? { ...c, cardIds: [...c.cardIds, id] } : c),
    };
  }

  function findColumnIndex(state, cardId) {
    return state.columns.findIndex(c => c.cardIds.includes(cardId));
  }

  // Move a card by `delta` columns (-1 = left, +1 = right); appended to the end of the target column.
  function shiftCard(state, cardId, delta) {
    const from = findColumnIndex(state, cardId);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= state.columns.length) return state;
    return {
      ...state,
      columns: state.columns.map((c, i) => {
        if (i === from) return { ...c, cardIds: c.cardIds.filter(x => x !== cardId) };
        if (i === to) return { ...c, cardIds: [...c.cardIds, cardId] };
        return c;
      }),
    };
  }

  // Move a card to column `toColId` at position `index` (index counts the target column's cards
  // with the moved card already removed). Handles both cross-column moves and in-column reordering.
  function moveCard(state, cardId, toColId, index) {
    const from = findColumnIndex(state, cardId);
    const toIdx = state.columns.findIndex(c => c.id === toColId);
    if (from < 0 || toIdx < 0) return state;
    const columns = state.columns.map(c => ({ ...c, cardIds: c.cardIds.filter(x => x !== cardId) }));
    const target = columns[toIdx].cardIds;
    const at = Math.max(0, Math.min(Number.isInteger(index) ? index : target.length, target.length));
    target.splice(at, 0, cardId);
    const same = columns.every((c, i) => c.cardIds.length === state.columns[i].cardIds.length &&
      c.cardIds.every((x, j) => x === state.columns[i].cardIds[j]));
    return same ? state : { ...state, columns };
  }

  const PRIORITIES = ['none', 'low', 'medium', 'high'];

  // Split a comma/space separated tag string into unique, lowercase tags.
  function parseTags(text) {
    const seen = new Set();
    String(text || '').split(/[,\s]+/).forEach(t => {
      t = t.trim().toLowerCase().replace(/^#/, '');
      if (t) seen.add(t.slice(0, 30));
    });
    return [...seen];
  }

  // Apply edits from the detail modal. Unknown fields are ignored; an empty title keeps the old one.
  function updateCard(state, cardId, patch) {
    const card = state.cards[cardId];
    if (!card) return state;
    const next = { ...card };
    if ('title' in patch) { const t = String(patch.title || '').trim(); if (t) next.title = t.slice(0, 200); }
    if ('description' in patch) next.description = String(patch.description || '');
    if ('priority' in patch) next.priority = PRIORITIES.includes(patch.priority) ? patch.priority : 'none';
    if ('due' in patch) next.due = /^\d{4}-\d{2}-\d{2}$/.test(patch.due || '') ? patch.due : '';
    if ('tags' in patch) next.tags = Array.isArray(patch.tags) ? parseTags(patch.tags.join(',')) : parseTags(patch.tags);
    return { ...state, cards: { ...state.cards, [cardId]: next } };
  }

  // Local YYYY-MM-DD for a Date (avoids UTC shifts from toISOString).
  function isoDate(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  // A card is overdue when it has a due date before today and is not in the last ("done") column.
  function isOverdue(state, cardId, today = isoDate(new Date())) {
    const card = state.cards[cardId];
    if (!card || !card.due) return false;
    const done = state.columns[state.columns.length - 1];
    return card.due < today && !done.cardIds.includes(cardId);
  }

  function deleteCard(state, cardId) {
    const cards = { ...state.cards };
    delete cards[cardId];
    return { ...state, cards, columns: state.columns.map(c => ({ ...c, cardIds: c.cardIds.filter(x => x !== cardId) })) };
  }

  function isValid(state) {
    return !!(state && Array.isArray(state.columns) && state.cards && typeof state.nextId === 'number');
  }

  // ---- Board list (metadata only; each board's state is stored under its own key) ----

  function createMeta(name = 'My Board') {
    return { boards: [{ id: 'b1', name }], activeId: 'b1', nextId: 2 };
  }

  function cleanName(name, fallback) {
    return String(name || '').trim().slice(0, 60) || fallback;
  }

  // Returns a new meta with the board added and made active.
  function addBoard(meta, name) {
    const id = 'b' + meta.nextId;
    return { boards: [...meta.boards, { id, name: cleanName(name, 'Board ' + meta.nextId) }], activeId: id, nextId: meta.nextId + 1 };
  }

  function renameBoard(meta, id, name) {
    return { ...meta, boards: meta.boards.map(b => b.id === id ? { ...b, name: cleanName(name, b.name) } : b) };
  }

  // The last board can't be removed. If the active board is removed, its neighbour becomes active.
  function removeBoard(meta, id) {
    const i = meta.boards.findIndex(b => b.id === id);
    if (i < 0 || meta.boards.length === 1) return meta;
    const boards = meta.boards.filter(b => b.id !== id);
    const activeId = meta.activeId === id ? boards[Math.min(i, boards.length - 1)].id : meta.activeId;
    return { ...meta, boards, activeId };
  }

  function isValidMeta(meta) {
    return !!(meta && Array.isArray(meta.boards) && meta.boards.length && typeof meta.nextId === 'number' &&
      meta.boards.some(b => b.id === meta.activeId));
  }

  const api = { createMeta, addBoard, renameBoard, removeBoard, isValidMeta, COLUMNS, PRIORITIES, createBoard, addCard, shiftCard, moveCard, updateCard, parseTags, isoDate, isOverdue, deleteCard, findColumnIndex, isValid };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Board = api;
})(this);
