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

  function deleteCard(state, cardId) {
    const cards = { ...state.cards };
    delete cards[cardId];
    return { ...state, cards, columns: state.columns.map(c => ({ ...c, cardIds: c.cardIds.filter(x => x !== cardId) })) };
  }

  function isValid(state) {
    return !!(state && Array.isArray(state.columns) && state.cards && typeof state.nextId === 'number');
  }

  const api = { COLUMNS, createBoard, addCard, shiftCard, deleteCard, findColumnIndex, isValid };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Board = api;
})(this);
