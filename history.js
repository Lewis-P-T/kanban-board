// Undo/redo history over immutable board snapshots. Board states are never mutated, so storing
// references is enough — no deep copies. Works in the browser (window.History_) and Node.
(function (root) {
  const LIMIT = 100;

  function create(present, limit = LIMIT) {
    return { past: [], present, future: [], limit };
  }

  // Record a new present; clears the redo stack and drops the oldest entries beyond `limit`.
  function push(h, next) {
    if (next === h.present) return h;
    const past = [...h.past, h.present].slice(-h.limit);
    return { ...h, past, present: next, future: [] };
  }

  function undo(h) {
    if (!h.past.length) return h;
    return { ...h, past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future] };
  }

  function redo(h) {
    if (!h.future.length) return h;
    return { ...h, past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) };
  }

  const api = { LIMIT, create, push, undo, redo };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.History_ = api;
})(this);
