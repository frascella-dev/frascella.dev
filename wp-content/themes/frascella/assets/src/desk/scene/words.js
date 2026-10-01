// The words the desk itself says (the lamp's levels, the drawing app's buttons, labels and
// messages), in the page's language: <html lang> picks the table (it, the default, or en), and
// window.frascellaDeskWords, if the page sets it before the scene starts, overrides any key, so
// the theme can feed them from inc/content/*.php. `{name}` in a value is filled by fmt().
// The Italian is the prototype's, unchanged.
const IT = {
  lampLevels: ['piena', 'media', 'spenta'],
  padHint: 'Disegna sullo schermo del tablet. «fatto» o Esc per tornare.',
  app: 'app di disegno sullo schermo del tablet',
  canvas: 'la tela: disegna con il dito, il mouse o la penna',
  done: 'fatto',
  actions: 'azioni', adjust: 'regolazioni', select: 'selezione', transform: 'trasforma',
  notInDraft: '{name} · non in questa bozza',
  tools: 'strumenti', brush: 'pennello', smudge: 'sfumino', eraser: 'gomma', layers: 'livelli', color: 'colore',
  brushGroup: 'pennello', size: 'dimensione', eyedropper: 'contagocce', opacity: 'opacità', undo: 'annulla', redo: 'ripeti',
  brushes: 'pennelli', ink: 'penna a inchiostro', air: 'aerografo', pencil: 'matita',
  disc: "disco dei colori: tinta sull'anello, saturazione e luminosità nel quadrato",
  addLayer: 'aggiungi un livello', layerList: 'livelli, dal più alto', layerCount: '{n} di {max}',
  clearLayer: 'svuota il livello', deleteLayer: 'elimina', deleteNamed: 'elimina {name}', clearNamed: 'svuota {name}',
  layer: 'Livello {n}', layerAdded: '{name} aggiunto', layerDeleted: '{name} eliminato',
  active: 'attivo', tapToDraw: 'tocca per disegnarci', hidden: ' · nascosto', showNamed: 'mostra {name}',
  eyedropperOn: 'contagocce: tocca la tela', eyedropperOff: 'contagocce spento',
  custom: 'personalizzato',
  colors: ['inchiostro', 'grafite', 'pietra', 'carta', 'vermiglio', 'oro', 'rosso scuro', 'pesca', 'blu profondo', 'azzurro', 'verde', 'bianco'],
};
const EN = {
  lampLevels: ['full', 'dim', 'off'],
  padHint: 'Draw on the tablet screen. Press "done" or Esc to go back.',
  app: "drawing app on the tablet's screen",
  canvas: 'the canvas: draw with your finger, the mouse or a pen',
  done: 'done',
  actions: 'actions', adjust: 'adjustments', select: 'selection', transform: 'transform',
  notInDraft: '{name} · not in this sketch',
  tools: 'tools', brush: 'brush', smudge: 'smudge', eraser: 'eraser', layers: 'layers', color: 'colour',
  brushGroup: 'brush', size: 'size', eyedropper: 'eyedropper', opacity: 'opacity', undo: 'undo', redo: 'redo',
  brushes: 'brushes', ink: 'ink pen', air: 'airbrush', pencil: 'pencil',
  disc: 'colour disc: hue on the ring, saturation and brightness in the square',
  addLayer: 'add a layer', layerList: 'layers, top first', layerCount: '{n} of {max}',
  clearLayer: 'clear the layer', deleteLayer: 'delete', deleteNamed: 'delete {name}', clearNamed: 'clear {name}',
  layer: 'Layer {n}', layerAdded: '{name} added', layerDeleted: '{name} deleted',
  active: 'active', tapToDraw: 'tap to draw on it', hidden: ' · hidden', showNamed: 'show {name}',
  eyedropperOn: 'eyedropper: tap the canvas', eyedropperOff: 'eyedropper off',
  custom: 'custom',
  colors: ['ink', 'graphite', 'stone', 'paper', 'vermilion', 'gold', 'dark red', 'peach', 'deep blue', 'sky blue', 'green', 'white'],
};

let table = null;
/** The words for this page (read once, when the scene starts). */
export function words() {
  if (table) return table;
  const lang = (document.documentElement.lang || 'it').slice(0, 2).toLowerCase();
  const extra = typeof window !== 'undefined' && window.frascellaDeskWords && typeof window.frascellaDeskWords === 'object' ? window.frascellaDeskWords : {};
  table = { ...(lang === 'en' ? EN : IT), ...extra };
  return table;
}
/** words()[key] with {name} placeholders filled from `vars`. */
export function fmt(key, vars = {}) {
  return String(words()[key] ?? key).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}
