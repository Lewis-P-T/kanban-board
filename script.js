const STORAGE_KEY = 'kanban-board:v1';

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Board.isValid(s)) return s;
  } catch (e) { /* fall through to a fresh board */ }
  return Board.createBoard();
}

function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* storage unavailable */ }
}

let state = load();

function update(next) {
  state = next;
  save();
  render();
}

const boardEl = document.getElementById('board');

function render() {
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
    col.cardIds.forEach(id => {
      const card = state.cards[id];
      const li = document.createElement('li');
      li.className = 'card';
      const title = document.createElement('span');
      title.className = 'title';
      title.textContent = card.title;
      li.appendChild(title);

      const actions = document.createElement('div');
      actions.className = 'actions';
      actions.append(
        button('←', 'Move left', colIdx === 0, () => update(Board.shiftCard(state, id, -1))),
        button('→', 'Move right', colIdx === state.columns.length - 1, () => update(Board.shiftCard(state, id, 1))),
        button('✕', 'Delete', false, () => update(Board.deleteCard(state, id))),
      );
      li.appendChild(actions);
      list.appendChild(li);
    });
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

render();
