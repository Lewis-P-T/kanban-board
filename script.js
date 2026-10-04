const LEGACY_KEY = 'kanban-board:v1';
const META_KEY = 'kanban-meta:v1';
const boardKey = id => 'kanban-board:v1:' + id;

function read(key) {
  try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; }
}
function write(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage unavailable */ }
}
function remove(key) {
  try { localStorage.removeItem(key); } catch (e) { /* storage unavailable */ }
}

// First run with multi-board storage: adopt the old single board as "My Board".
function loadMeta() {
  const m = read(META_KEY);
  if (Board.isValidMeta(m)) return m;
  const meta = Board.createMeta();
  const legacy = read(LEGACY_KEY);
  if (Board.isValid(legacy)) write(boardKey('b1'), legacy);
  write(META_KEY, meta);
  return meta;
}

function loadBoard(id) {
  const s = read(boardKey(id));
  return Board.isValid(s) ? s : Board.createBoard();
}

let meta = loadMeta();
let history = History_.create(loadBoard(meta.activeId));
let state = history.present;

// Every edit goes through here so it lands in the undo history.
function update(next) {
  if (next === state) return;
  setHistory(History_.push(history, next));
}

function setHistory(h) {
  if (h === history) return;
  history = h;
  state = h.present;
  write(boardKey(meta.activeId), state);
  render();
}

function setMeta(next) {
  meta = next;
  write(META_KEY, meta);
}

// Undo history is per session and per board; switching boards starts a fresh one.
function switchBoard(id) {
  setMeta({ ...meta, activeId: id });
  history = History_.create(loadBoard(id));
  state = history.present;
  render();
}

const boardEl = document.getElementById('board');

// ---- Rendering ----

function render() {
  renderToolbar();
  const today = Board.isoDate(new Date());
  boardEl.innerHTML = '';
  state.columns.forEach((col, colIdx) => {
    const section = document.createElement('section');
    section.className = 'column';
    section.dataset.col = col.id;

    const h2 = document.createElement('h2');
    const name = document.createElement('span');
    name.textContent = col.title;
    const count = document.createElement('span');
    count.className = 'count';
    count.textContent = col.cardIds.length;
    h2.append(name, count);
    section.appendChild(h2);

    const list = document.createElement('ul');
    list.className = 'cards';
    list.dataset.col = col.id;
    col.cardIds.forEach(id => list.appendChild(renderCard(state.cards[id], colIdx, today)));
    section.appendChild(list);

    if (colIdx === 0) {
      const form = document.createElement('form');
      form.className = 'add-form';
      form.innerHTML = '<input type="text" placeholder="Add a task…" aria-label="New task title" maxlength="200"><button type="submit">Add</button>';
      form.addEventListener('submit', e => {
        e.preventDefault();
        const input = form.querySelector('input');
        if (input.value.trim()) update(Board.addCard(state, input.value, col.id));
        boardEl.querySelector('.add-form input').focus();
      });
      section.appendChild(form);
    }
    boardEl.appendChild(section);
  });
}

function renderCard(card, colIdx, today) {
  const id = card.id;
  const li = document.createElement('li');
  li.className = 'card';
  if (card.priority && card.priority !== 'none') li.classList.add('prio-' + card.priority);
  if (Board.isOverdue(state, id, today)) li.classList.add('overdue');
  li.dataset.id = id;
  li.draggable = true;

  const body = document.createElement('button');
  body.type = 'button';
  body.className = 'card-body';
  body.title = 'Open details';
  const title = document.createElement('span');
  title.className = 'title';
  title.textContent = card.title;
  body.appendChild(title);

  const meta = document.createElement('span');
  meta.className = 'meta';
  if (card.due) {
    const due = document.createElement('span');
    due.className = 'due';
    due.textContent = (li.classList.contains('overdue') ? 'Overdue · ' : 'Due ') + card.due;
    meta.appendChild(due);
  }
  if (card.description) {
    const d = document.createElement('span');
    d.className = 'has-desc';
    d.textContent = '☰';
    d.title = 'Has description';
    meta.appendChild(d);
  }
  (card.tags || []).forEach(t => {
    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.textContent = '#' + t;
    meta.appendChild(tag);
  });
  if (meta.childNodes.length) body.appendChild(meta);
  body.addEventListener('click', () => openDetail(id));
  li.appendChild(body);

  const actions = document.createElement('div');
  actions.className = 'actions';
  actions.append(
    button('←', 'Move left', colIdx === 0, () => update(Board.shiftCard(state, id, -1))),
    button('→', 'Move right', colIdx === state.columns.length - 1, () => update(Board.shiftCard(state, id, 1))),
    button('✕', 'Delete', false, () => update(Board.deleteCard(state, id))),
  );
  li.appendChild(actions);
  return li;
}

function button(label, title, disabled, onClick) {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = label;
  b.title = title;
  b.setAttribute('aria-label', title);
  b.disabled = disabled;
  b.addEventListener('click', onClick);
  return b;
}

// ---- Toolbar: board switcher + undo/redo ----

const boardSelect = document.getElementById('board-select');
const undoBtn = document.getElementById('undo');
const redoBtn = document.getElementById('redo');

function renderToolbar() {
  boardSelect.innerHTML = '';
  meta.boards.forEach(b => boardSelect.add(new Option(b.name, b.id, false, b.id === meta.activeId)));
  document.getElementById('board-delete').disabled = meta.boards.length === 1;
  undoBtn.disabled = !history.past.length;
  redoBtn.disabled = !history.future.length;
  document.title = boardName() + ' · Kanban Board';
}

function boardName() {
  return meta.boards.find(b => b.id === meta.activeId).name;
}

boardSelect.addEventListener('change', () => switchBoard(boardSelect.value));
document.getElementById('board-new').addEventListener('click', () => {
  const name = prompt('Name for the new board:', 'Board ' + meta.nextId);
  if (name === null) return;
  setMeta(Board.addBoard(meta, name));
  switchBoard(meta.activeId);
});
document.getElementById('board-rename').addEventListener('click', () => {
  const name = prompt('Rename board:', boardName());
  if (name === null) return;
  setMeta(Board.renameBoard(meta, meta.activeId, name));
  renderToolbar();
});
document.getElementById('board-delete').addEventListener('click', () => {
  if (meta.boards.length === 1 || !confirm('Delete board "' + boardName() + '" and all its cards?')) return;
  const id = meta.activeId;
  setMeta(Board.removeBoard(meta, id));
  remove(boardKey(id));
  switchBoard(meta.activeId);
});

undoBtn.addEventListener('click', () => setHistory(History_.undo(history)));
redoBtn.addEventListener('click', () => setHistory(History_.redo(history)));
document.addEventListener('keydown', e => {
  if (!(e.ctrlKey || e.metaKey) || dialog.open) return;
  if (e.target.closest && e.target.closest('input, textarea, select')) return; // keep native text undo in fields
  const k = e.key.toLowerCase();
  if (k === 'z' && !e.shiftKey) { e.preventDefault(); setHistory(History_.undo(history)); }
  else if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); setHistory(History_.redo(history)); }
});

// ---- Drag & drop ----

let dragId = null;
const indicator = document.createElement('li');
indicator.className = 'drop-indicator';

// Index among the list's cards (excluding the dragged one) that the pointer is above.
function dropIndex(list, y) {
  const cards = [...list.querySelectorAll('.card')].filter(el => el.dataset.id !== dragId);
  const i = cards.findIndex(el => { const r = el.getBoundingClientRect(); return y < r.top + r.height / 2; });
  return { index: i < 0 ? cards.length : i, before: cards[i] || null };
}

boardEl.addEventListener('dragstart', e => {
  const card = e.target.closest && e.target.closest('.card');
  if (!card) return;
  dragId = card.dataset.id;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', dragId);
  requestAnimationFrame(() => card.classList.add('dragging'));
});

boardEl.addEventListener('dragover', e => {
  if (!dragId) return;
  const column = e.target.closest('.column');
  if (!column) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  const list = column.querySelector('.cards');
  const { before } = dropIndex(list, e.clientY);
  if (before) list.insertBefore(indicator, before); else list.appendChild(indicator);
});

boardEl.addEventListener('drop', e => {
  if (!dragId) return;
  const column = e.target.closest('.column');
  if (!column) return;
  e.preventDefault();
  const list = column.querySelector('.cards');
  const { index } = dropIndex(list, e.clientY);
  const id = dragId;
  endDrag();
  update(Board.moveCard(state, id, list.dataset.col, index));
});

boardEl.addEventListener('dragend', endDrag);
boardEl.addEventListener('dragleave', e => {
  if (!boardEl.contains(e.relatedTarget)) indicator.remove();
});

function endDrag() {
  dragId = null;
  indicator.remove();
  boardEl.querySelectorAll('.dragging').forEach(el => el.classList.remove('dragging'));
}

// ---- Card detail modal ----

const dialog = document.getElementById('detail');
const form = document.getElementById('detail-form');
let editingId = null;

function openDetail(id) {
  const card = state.cards[id];
  if (!card) return;
  editingId = id;
  form.elements.title.value = card.title;
  form.elements.description.value = card.description || '';
  form.elements.priority.value = card.priority || 'none';
  form.elements.due.value = card.due || '';
  form.elements.tags.value = (card.tags || []).join(', ');
  const col = state.columns[Board.findColumnIndex(state, id)];
  document.getElementById('detail-col').textContent = col ? 'In ' + col.title : '';
  dialog.showModal();
  form.elements.title.focus();
}

form.addEventListener('submit', e => {
  e.preventDefault();
  if (editingId) {
    update(Board.updateCard(state, editingId, {
      title: form.elements.title.value,
      description: form.elements.description.value,
      priority: form.elements.priority.value,
      due: form.elements.due.value,
      tags: form.elements.tags.value,
    }));
  }
  dialog.close();
});

document.getElementById('detail-cancel').addEventListener('click', () => dialog.close());
document.getElementById('detail-delete').addEventListener('click', () => {
  if (editingId && confirm('Delete this card?')) update(Board.deleteCard(state, editingId));
  dialog.close();
});
dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });
dialog.addEventListener('close', () => { editingId = null; });

render();
