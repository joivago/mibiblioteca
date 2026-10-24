'use strict';
/* ==========================================================
   Mi biblioteca — interfaz
   Los datos se guardan en el móvil (biblioteca.json) a través
   del puente "Android". En un navegador normal usa localStorage.
   ========================================================== */

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const N = window.Android || null;

/* ---------------- Iconos ---------------- */
const P = {
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  covers: '<rect x="3" y="4" width="7" height="16" rx="1"/><rect x="14" y="4" width="7" height="16" rx="1"/>',
  spines: '<path d="M4 20V5M8 20V8M12 20V4M16.5 20l-2.5-14M20 20V7"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h10"/>',
  back: '<path d="M15 18l-6-6 6-6"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="m13.5 6.5 4 4"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 17-5-5-9 8"/>',
  barcode: '<path d="M4 5v14M7 5v14M10.5 5v14M13 5v14M16.5 5v14M20 5v14"/>',
  pen: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  check: '<path d="M5 12.5 10 17 19 7"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  sort: '<path d="M7 4v16M3.5 7.5 7 4l3.5 3.5M17 20V4M13.5 16.5 17 20l3.5-3.5"/>',
  palette: '<path d="M12 3a9 9 0 1 0 0 18c1.3 0 2-.8 2-1.8 0-1.4-1.2-1.6-1.2-3 0-1 .8-1.7 1.8-1.7H17a4 4 0 0 0 4-4C21 6.4 17 3 12 3z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="15" cy="7.5" r="1"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  upload: '<path d="M12 16V5M7 9.5 12 4.5l5 5M5 20h14"/>',
  wand: '<path d="m15 4 1 2 2 1-2 1-1 2-1-2-2-1 2-1zM4 20 15 9"/>',
  crop: '<path d="M6 2v14a2 2 0 0 0 2 2h14M2 6h14a2 2 0 0 1 2 2v14"/>',
  chevron: '<path d="m9 6 6 6-6 6"/>',
  book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5M8 7h7"/>'
};
const ic = (n, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24">${P[n]}</svg>`;
const STAR = '<path d="M12 2.8l2.75 5.82 6.35.8-4.66 4.4 1.2 6.3L12 17.03 6.36 20.12l1.2-6.3L2.9 9.42l6.35-.8z"/>';

/* ---------------- Utilidades ---------------- */
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const plain = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
function hash(s) { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
function lum(hex) {
  const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex || ''); if (!m) return .5;
  const [r, g, b] = m.slice(1).map(x => { const v = parseInt(x, 16) / 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); });
  return .2126 * r + .7152 * g + .0722 * b;
}
const onColor = hex => lum(hex) > .42 ? '#151515' : '#FFFFFF';
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 2400);
}

/* ---------------- Puente con Android ---------------- */
const pend = {}; let pendN = 0;
window.__resolve = (id, v) => { const f = pend[id]; delete pend[id]; if (f) f(v); };
function native(fn, ...args) {
  return new Promise(res => {
    if (!N || !N[fn]) return res(null);
    const id = 'p' + (++pendN); pend[id] = res;
    try { N[fn](id, ...args); } catch (e) { delete pend[id]; res(null); }
  });
}

/* ---------------- Estado ---------------- */
const DEF_SETTINGS = { theme: 'roble', view: 'portadas', size: 1, sort: 'autor', group: false, filter: 'todos', styles: {} };
const state = { books: [], settings: { ...DEF_SETTINGS }, query: '' };

function load() {
  let raw = '';
  try { raw = N ? N.loadData() : localStorage.getItem('mibiblioteca') || ''; } catch (e) { }
  if (raw) {
    try {
      const d = JSON.parse(raw);
      state.books = Array.isArray(d.books) ? d.books : [];
      state.settings = { ...DEF_SETTINGS, ...(d.settings || {}) };
      state.settings.styles = state.settings.styles || {};
    } catch (e) { toast('No he podido leer los datos guardados'); }
  }
}
const saveNow = () => {
  const json = JSON.stringify({ version: 1, books: state.books, settings: state.settings });
  try { if (N) N.saveData(json); else localStorage.setItem('mibiblioteca', json); }
  catch (e) { toast('No se ha podido guardar'); }
};
const save = debounce(saveNow, 250);
const byId = id => state.books.find(b => b.id === id);

/* ---------------- Editoriales ---------------- */
const DEFAULTS = window.ESTILOS_EDITORIALES || {};
const DEF_KEYS = Object.keys(DEFAULTS).sort((a, b) => b.length - a.length);
const PALETTE = [
  ['#2F4858', '#F2E9DC', '#E0A458'], ['#7A2E2E', '#F5E9D8', '#E8C07D'], ['#1F4E3D', '#EFE8D8', '#D9B44A'],
  ['#3B3355', '#F0EAF7', '#E3A587'], ['#C9B79C', '#2B2118', '#6B3E26'], ['#1D3557', '#F1FAEE', '#E63946'],
  ['#5E503F', '#F4ECE0', '#C6AC8F'], ['#283618', '#FEFAE0', '#DDA15E'], ['#9C2C2C', '#FFF4E6', '#1E1E1E'],
  ['#E9E3D5', '#2A2A2A', '#3D6A8A'], ['#0B3954', '#F0F4F8', '#FF7F11'], ['#6D597A', '#FFF5F0', '#EAAC8B']
];
const TEMPLATES = ['tipo', 'bloque', 'franja', 'bandas', 'marco'];

function normPub(s) {
  return plain(s)
    .replace(/[&.,]/g, ' ')
    .replace(/\b(editorial|editora|ediciones|edicions|edicion|editions|editores|ed|s ?a ?u|s ?a|s ?l ?u|s ?l|grupo|sello)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}
function pubKey(pub) {
  const n = normPub(pub);
  if (!n) return '';
  for (const k of DEF_KEYS) if ((' ' + n + ' ').includes(' ' + k + ' ')) return k;
  return n;
}
function styleFor(pub) {
  const k = pubKey(pub);
  const user = state.settings.styles[k];
  let st = user || DEFAULTS[k];
  if (!st) {
    const p = PALETTE[hash(k || 'x') % PALETTE.length];
    st = { bg: p[0], fg: p[1], ac: p[2], t: TEMPLATES[hash(k + 't') % TEMPLATES.length], f: hash(k + 'f') % 2 ? 'serif' : 'sans' };
  }
  return { key: k, bg: st.bg, fg: st.fg, ac: st.ac, t: st.t || 'tipo', f: st.f || 'sans', acfg: onColor(st.ac) };
}
const styleVars = st => `--bg:${st.bg};--fg:${st.fg};--ac:${st.ac};--acfg:${st.acfg}`;
function pubName(pub) { const k = pubKey(pub); return (DEFAULTS[k] && normPub(pub) === k) ? DEFAULTS[k].n : (pub || ''); }

/* ---------------- Portadas y lomos ---------------- */
function coverSrc(b) {
  const p = b && b.portada; if (!p) return '';
  if (/^(data:|https?:|blob:)/.test(p)) return p;
  return '/' + p.replace(/^\/+/, '');
}
function genCover(b, st) {
  st = st || styleFor(b.editorial);
  return `<div class="gcw"><div class="gc t-${st.t} f-${st.f}" style="${styleVars(st)}">
    <div class="gc-a">${esc(b.autor || '')}</div>
    <div class="gc-t">${esc(b.titulo || 'Sin título')}</div>
    <div class="gc-p">${esc(pubName(b.editorial) || '')}</div></div></div>`;
}
function coverHTML(b, extraCls = '') {
  const src = coverSrc(b);
  const inner = src ? `<img src="${esc(src)}" alt="" loading="lazy" data-fallback="${esc(b.id || '')}">` : genCover(b);
  return `<div class="cv ${extraCls}">${inner}</div>`;
}
// Si una portada guardada no carga, se dibuja la de la editorial
document.addEventListener('error', e => {
  const img = e.target;
  if (img.tagName !== 'IMG' || !img.dataset || img.dataset.fallback === undefined) return;
  const b = byId(img.dataset.fallback) || { titulo: '', autor: '', editorial: '' };
  const d = document.createElement('div'); d.innerHTML = genCover(b);
  img.replaceWith(d.firstElementChild);
}, true);

function spineDims(b, size) {
  const pages = parseInt(b.paginas, 10) || 260;
  const w = Math.max(15, Math.min(48, 11 + pages / 15)) * size;
  const h = 186 * size * (0.86 + (hash(b.id || b.titulo) % 15) / 100);
  return { w: Math.round(w), h: Math.round(h) };
}
function spineHTML(b, w, h) {
  const st = styleFor(b.editorial);
  const fs = Math.max(6.5, Math.min(12.5, w * 0.36));
  const seal = (pubName(b.editorial) || '·').trim().charAt(0).toUpperCase();
  const bands = st.t === 'franja' ? '<div class="sp-band"></div>' : st.t === 'bandas' ? '<div class="sp-band a"></div><div class="sp-band b"></div>' : '';
  return `<div class="sp t-${st.t} f-${st.f}${w >= 34 ? ' wide' : ''}" style="${styleVars(st)};width:${w}px;height:${h}px;font-size:${fs}px">
    ${bands}<div class="sp-in">${b.autor ? `<span class="sp-a">${esc(shortAuthor(b.autor))}</span>` : ''}<span class="sp-t">${esc(b.titulo || 'Sin título')}</span></div>
    <div class="sp-seal">${esc(seal)}</div></div>`;
}
function shortAuthor(a) {
  const first = String(a).split(/[,;&]| y /)[0].trim();
  const parts = first.split(/\s+/);
  return parts.length > 2 ? parts.slice(1).join(' ') : parts.slice(-1)[0] || first;
}

/* ---------------- Orden, filtro y grupos ---------------- */
const SORTS = {
  autor: { c: 'Autor', n: 'Autor (A–Z)', f: (a, b) => cmp(a.autor, b.autor) || cmp(titleKey(a.titulo), titleKey(b.titulo)) },
  titulo: { c: 'Título', n: 'Título (A–Z)', f: (a, b) => cmp(titleKey(a.titulo), titleKey(b.titulo)) },
  editorial: { c: 'Editorial', n: 'Editorial y título (A–Z)', f: (a, b) => cmp(pubName(a.editorial), pubName(b.editorial)) || cmp(titleKey(a.titulo), titleKey(b.titulo)) },
  anio: { c: 'Año', n: 'Año de publicación', f: (a, b) => (parseInt(a.anio) || 9999) - (parseInt(b.anio) || 9999) || cmp(a.autor, b.autor) },
  nota: { c: 'Nota', n: 'Mi puntuación', f: (a, b) => (b.nota || 0) - (a.nota || 0) || cmp(titleKey(a.titulo), titleKey(b.titulo)) },
  recientes: { c: 'Recientes', n: 'Añadidos recientemente', f: (a, b) => (b.creado || 0) - (a.creado || 0) }
};
const collator = new Intl.Collator('es', { sensitivity: 'base', numeric: true });
const cmp = (a, b) => { const x = (a || '').trim(), y = (b || '').trim(); if (!x && y) return 1; if (x && !y) return -1; return collator.compare(x, y); };
const titleKey = t => String(t || '').replace(/^(el|la|los|las|lo|un|una|unos|unas|the|a|an|l')\s+/i, '');

function visibleBooks() {
  const s = state.settings, q = plain(state.query).trim();
  let list = state.books.filter(b => s.filter === 'todos' || (b.estado || 'pendiente') === s.filter);
  if (q) list = list.filter(b => plain([b.titulo, b.subtitulo, b.autor, b.editorial, b.coleccion, b.isbn].join(' ')).includes(q));
  return list.sort((SORTS[s.sort] || SORTS.autor).f);
}
function groups(list) {
  if (!state.settings.group) return [{ key: '', title: null, books: list }];
  const m = new Map();
  for (const b of list) {
    const k = pubKey(b.editorial) || '~';
    if (!m.has(k)) m.set(k, { key: k, title: k === '~' ? 'Sin editorial' : pubName(b.editorial), books: [] });
    m.get(k).books.push(b);
  }
  return [...m.values()].sort((a, b) => a.key === '~' ? 1 : b.key === '~' ? -1 : collator.compare(a.title, b.title));
}

/* ---------------- Estantería ---------------- */
function applyTheme() {
  document.body.dataset.theme = state.settings.theme;
  document.documentElement.style.setProperty('--size', state.settings.size);
  const cs = getComputedStyle(document.body);
  if (N && N.setBarColor) N.setBarColor(cs.getPropertyValue('--bar').trim() || '#ffffff', cs.getPropertyValue('--barlight').trim() === '1');
}

function renderHeader() {
  const total = state.books.length, leidos = state.books.filter(b => b.estado === 'leido').length;
  $('#count').textContent = total ? `${total} ${total === 1 ? 'libro' : 'libros'} · ${leidos} ${leidos === 1 ? 'leído' : 'leídos'}` : 'Tu estantería está esperando';
  $$('#filt button').forEach(b => b.classList.toggle('on', b.dataset.f === state.settings.filter));
  $('#bSort').innerHTML = ic('sort') + esc(SORTS[state.settings.sort].c) + (state.settings.group ? ' · Ed.' : '');
  $('#bView').innerHTML = ic(state.settings.view === 'lomos' ? 'covers' : 'spines');
}

function render() {
  renderHeader();
  const box = $('#shelves');
  const s = state.settings, size = +s.size || 1;
  const W = (box.clientWidth || window.innerWidth - 20) - 28;
  const spines = s.view === 'lomos';
  let html = '', rowH = spines ? 186 * size : 114 * size;

  if (!state.books.length) {
    html = `<div class="emptystate"><h2>Tu estantería está vacía</h2>
      <p>Escanea el código de barras de un libro o búscalo por su título para colocarlo en la balda.</p>
      <div class="btns"><button class="btn" data-act="scan">${ic('barcode')}Escanear</button>
      <button class="btn sec" data-act="add">${ic('search')}Buscar</button></div></div>`;
  } else {
    const list = visibleBooks();
    if (!list.length) html = `<div class="emptystate"><p>${state.query ? 'Ningún libro coincide con la búsqueda.' : s.filter === 'leido' ? 'Todavía no has marcado ningún libro como leído.' : 'No tienes libros pendientes. ¡Enhorabuena!'}</p></div>`;
    for (const g of groups(list)) {
      html += '<section class="group">';
      if (g.title) {
        const st = g.key === '~' ? { bg: 'var(--ui2)', fg: 'var(--uiink)' } : styleFor(g.books[0].editorial);
        html += `<div class="plate"><span class="tag" style="--pbg:${st.bg};--pfg:${st.fg}">${esc(g.title)}</span><span class="n">${g.books.length}</span></div>`;
      }
      // Reparte los libros en baldas según el ancho de la pantalla
      const rows = []; let cur = [], used = 0;
      const gap = spines ? 1 : Math.round(9 * size);
      for (const b of g.books) {
        const w = spines ? spineDims(b, size).w : Math.round(76 * size);
        if (cur.length && used + w > W) { rows.push(cur); cur = []; used = 0; }
        cur.push(b); used += w + gap;
      }
      if (cur.length) rows.push(cur);
      for (const r of rows) {
        html += `<div class="row"><div class="books${spines ? ' spines' : ''}">`;
        for (const b of r) {
          const mark = b.estado === 'leido' ? '<span class="mark"></span>' : '';
          if (spines) { const d = spineDims(b, size); html += `<div class="bk" data-id="${b.id}">${spineHTML(b, d.w, d.h)}</div>`; }
          else html += `<div class="bk" data-id="${b.id}">${mark}${coverHTML(b)}</div>`;
        }
        html += '</div><div class="plank"></div></div>';
      }
      html += '</section>';
    }
  }
  // Baldas vacías hasta llenar la pantalla, para que parezca una librería
  box.innerHTML = html;
  const missing = Math.max(0, Math.ceil((window.innerHeight - box.getBoundingClientRect().bottom) / (rowH + 33)));
  if (missing) box.insertAdjacentHTML('beforeend', '<div class="row empty"><div class="books"></div><div class="plank"></div></div>'.repeat(Math.min(missing, 8)));
}

/* ---------------- Capas (pantallas, hojas) ---------------- */
const stack = [];
function openLayer(html, kind = 'full', onClose) {
  const ov = document.createElement('div');
  ov.className = 'ov ' + kind;
  ov.innerHTML = kind === 'sheet' ? `<div class="panel"><div class="grab"></div>${html}</div>` : html;
  $('#layer').appendChild(ov);
  const entry = { ov, onClose };
  stack.push(entry);
  if (kind === 'sheet') ov.addEventListener('click', e => { if (e.target === ov) closeLayer(); });
  $$('[data-close]', ov).forEach(b => b.addEventListener('click', () => closeLayer()));
  return ov;
}
function closeLayer() {
  const e = stack.pop(); if (!e) return false;
  e.ov.classList.add('out');
  setTimeout(() => e.ov.remove(), 190);
  if (e.onClose) e.onClose();
  return true;
}
window.handleBack = () => {
  if (stack.length) { closeLayer(); return true; }
  if (!$('#searchbar').hidden) { toggleSearch(false); return true; }
  return false;
};
function confirmBox(title, text, okText = 'Aceptar', danger = false) {
  return new Promise(res => {
    let done = false;
    const ov = openLayer(`<h2 style="margin:4px 0 8px;font-size:19px">${esc(title)}</h2>
      <p class="muted" style="margin:0 0 20px;line-height:1.45">${esc(text)}</p>
      <div style="display:flex;gap:10px"><button class="btn sec" style="flex:1" data-no>Cancelar</button>
      <button class="btn ${danger ? 'danger' : ''}" style="flex:1" data-yes>${esc(okText)}</button></div>`, 'sheet', () => { if (!done) res(false); });
    $('[data-no]', ov).onclick = () => closeLayer();
    $('[data-yes]', ov).onclick = () => { done = true; res(true); closeLayer(); };
  });
}

/* ---------------- Ficha del libro ---------------- */
function openDetail(id) {
  const b = byId(id); if (!b) return;
  const st = styleFor(b.editorial);
  const src = coverSrc(b);
  const fecha = b.creado ? new Date(b.creado).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  const facts = [
    ['Editorial', pubName(b.editorial)], ['Colección', b.coleccion], ['Año', b.anio], ['Páginas', b.paginas],
    ['ISBN', b.isbn], ['Idioma', langName(b.idioma)], ['En tu estantería', fecha && 'desde el ' + fecha]
  ].filter(f => f[1]);
  const ov = openLayer(`
    <div class="bar"><button class="ib" data-close>${ic('back')}</button><h2></h2>
      <button class="ib" data-edit>${ic('edit')}</button><button class="ib" data-del>${ic('trash')}</button></div>
    <div class="scroll">
      <div class="hero">${src ? `<div class="bgblur" style="background-image:url('${esc(src)}')"></div>` : `<div class="bgblur" style="background:${st.bg}"></div>`}
        ${coverHTML(b)}</div>
      <div class="pad" style="padding-top:4px">
        <div class="dtitle">${esc(b.titulo || 'Sin título')}</div>
        ${b.subtitulo ? `<div class="dsub">${esc(b.subtitulo)}</div>` : ''}
        <div class="dauthor">${esc(b.autor || 'Autor desconocido')}</div>
        ${b.editorial ? `<div class="pubpill"><span style="--pbg:${st.bg};--pfg:${st.fg}">${esc(pubName(b.editorial))}</span></div>` : ''}

        <div class="status">
          <button data-st="pendiente">${ic('clock')}Pendiente</button>
          <button data-st="leido">${ic('check')}Leído</button>
        </div>
        <div class="readdate" ${b.estado === 'leido' ? '' : 'hidden'}>Lo terminé el <input type="date" value="${esc(b.fechaLeido || '')}"></div>

        <div class="stars"></div>
        <div class="ratelabel"></div>

        <h3 class="sec">Mi reseña</h3>
        <textarea class="review" placeholder="¿Qué te ha parecido?">${esc(b.resena || '')}</textarea>
        <div class="saved"></div>

        <h3 class="sec">Sinopsis</h3>
        ${b.sinopsis ? `<div class="synopsis">${esc(b.sinopsis)}</div>`
      : `<div class="muted" style="font-size:14.5px">Sin sinopsis. Puedes escribirla tocando ${ic('edit')} arriba.</div>`}

        <h3 class="sec">Datos del libro</h3>
        <dl class="facts">${facts.map(f => `<dt>${f[0]}</dt><dd>${esc(f[1])}</dd>`).join('')}</dl>
      </div>
    </div>`);

  // Estado
  const paintStatus = () => {
    $$('.status button', ov).forEach(x => x.classList.toggle('on', (b.estado || 'pendiente') === x.dataset.st));
    $('.readdate', ov).hidden = b.estado !== 'leido';
  };
  $$('.status button', ov).forEach(x => x.onclick = () => {
    b.estado = x.dataset.st;
    if (b.estado === 'leido' && !b.fechaLeido) { b.fechaLeido = new Date().toISOString().slice(0, 10); $('.readdate input', ov).value = b.fechaLeido; }
    paintStatus(); save(); render();
  });
  $('.readdate input', ov).onchange = e => { b.fechaLeido = e.target.value; save(); };
  paintStatus();

  // Puntuación
  starWidget($('.stars', ov), $('.ratelabel', ov), b.nota || 0, v => { b.nota = v; save(); if (state.settings.sort === 'nota') render(); });

  // Reseña
  const saved = $('.saved', ov);
  const saveReview = debounce(() => { save(); saved.textContent = 'Guardado ✓'; setTimeout(() => saved.textContent = '', 1500); }, 600);
  $('.review', ov).oninput = e => { b.resena = e.target.value; saved.textContent = 'Escribiendo…'; saveReview(); };

  // Sinopsis larga
  const syn = $('.synopsis', ov), more = $('.more', ov);
  if (syn && more) requestAnimationFrame(() => {
    if (syn.scrollHeight > syn.clientHeight + 4) { more.hidden = false; more.onclick = () => { syn.classList.remove('clamp'); more.hidden = true; }; }
  });

  $('[data-edit]', ov).onclick = () => openEdit(b, null, () => { closeLayer(); openDetail(b.id); });
  $('[data-del]', ov).onclick = async () => {
    if (!await confirmBox('¿Quitar este libro?', `“${b.titulo}” desaparecerá de tu estantería, con su puntuación y su reseña.`, 'Quitar', true)) return;
    if (b.portada && N && !/^(data:|https?:)/.test(b.portada)) N.deleteCover(b.portada);
    state.books = state.books.filter(x => x.id !== b.id);
    saveNow(); render(); closeLayer(); toast('Libro quitado');
  };
}

function starWidget(box, label, value, onChange) {
  const words = ['Sin puntuar', 'Muy malo', 'Malo', 'Regular', 'Bueno', 'Muy bueno', 'Excelente', 'Muy recomendable', 'Imprescindible', 'Obra maestra', 'Obra maestra'];
  const paint = v => {
    box.innerHTML = [1, 2, 3, 4, 5].map(i => {
      const f = Math.max(0, Math.min(1, v - (i - 1)));
      return `<span class="st" data-i="${i}"><svg class="base" viewBox="0 0 24 24">${STAR}</svg><span class="fill" style="width:${f * 100}%"><svg viewBox="0 0 24 24">${STAR}</svg></span></span>`;
    }).join('');
    label.textContent = v ? `${String(v).replace('.', ',')} de 5 · ${words[Math.round(v * 2)]}` : 'Toca las estrellas para puntuar (admite medias)';
  };
  const at = x => {
    for (const s of $$('.st', box)) {
      const r = s.getBoundingClientRect();
      if (x <= r.right + 3) return (+s.dataset.i - 1) + (x < r.left + r.width / 2 ? .5 : 1);
    }
    return 5;
  };
  let dragging = false, startV = value, moved = false;
  box.onpointerdown = e => { dragging = true; moved = false; startV = value; box.setPointerCapture(e.pointerId); const v = at(e.clientX); paint(v); box._v = v; };
  box.onpointermove = e => { if (!dragging) return; moved = true; const v = Math.max(.5, at(e.clientX)); paint(v); box._v = v; };
  box.onpointerup = () => {
    if (!dragging) return; dragging = false;
    let v = box._v; if (!moved && v === startV) v = 0; // tocar la misma nota la quita
    value = v; paint(v); onChange(v);
  };
  paint(value);
}
function langName(c) {
  const m = { es: 'Español', en: 'Inglés', fr: 'Francés', it: 'Italiano', de: 'Alemán', pt: 'Portugués', ca: 'Catalán', gl: 'Gallego', eu: 'Euskera' };
  return m[(c || '').toLowerCase()] || c || '';
}

/* ---------------- Editar / nuevo ---------------- */
const FIELDS = [
  ['titulo', 'Título'], ['subtitulo', 'Subtítulo'], ['autor', 'Autor'], ['editorial', 'Editorial'], ['coleccion', 'Colección'],
  ['anio', 'Año', 'num'], ['paginas', 'Páginas', 'num'], ['isbn', 'ISBN'], ['idioma', 'Idioma (es, en…)']
];
function openEdit(book, preset, afterSave) {
  const isNew = !book;
  const d = Object.assign({ titulo: '', subtitulo: '', autor: '', editorial: '', coleccion: '', anio: '', paginas: '', isbn: '', idioma: 'es', sinopsis: '', portada: '' }, book || {}, preset || {});
  const draft = { portada: d.portada || '', candidatos: (preset && preset.covers) || [], cambio: false };
  const pubs = [...new Set(state.books.map(b => b.editorial).filter(Boolean))].sort(collator.compare);
  const f = (k, l, t) => `<div class="field"><label>${l}</label><input data-k="${k}" ${t === 'num' ? 'inputmode="numeric"' : ''} ${k === 'editorial' ? 'list="pubs"' : ''} value="${esc(d[k])}"></div>`;
  const ov = openLayer(`
    <div class="bar"><button class="ib" data-close>${ic('close')}</button><h2>${isNew ? 'Nuevo libro' : 'Editar libro'}</h2>
      <button class="btn" data-save>Guardar</button></div>
    <div class="scroll"><div class="pad">
      <div class="coveredit"><div class="cvbox"></div>
        <div class="acts">
          <button class="btn sec" data-c="buscar">${ic('search')}Buscar portada</button>
          <button class="btn sec" data-c="foto">${ic('camera')}Hacer foto</button>
          <button class="btn sec" data-c="galeria">${ic('image')}De la galería</button>
          <button class="btn sec" data-c="recortar" hidden>${ic('crop')}Recortar</button>
          <button class="btn sec" data-c="generada">${ic('wand')}Usar la de la editorial</button>
        </div></div>
      <div class="dl-note muted" style="font-size:13px;margin:-8px 0 14px" hidden></div>
      ${f('titulo', 'Título')}${f('subtitulo', 'Subtítulo')}${f('autor', 'Autor')}
      ${f('editorial', 'Editorial')}<datalist id="pubs">${pubs.map(p => `<option value="${esc(p)}">`).join('')}</datalist>
      ${f('coleccion', 'Colección')}
      <div class="two">${f('anio', 'Año', 'num')}${f('paginas', 'Páginas', 'num')}</div>
      <div class="two">${f('isbn', 'ISBN')}${f('idioma', 'Idioma')}</div>
      <div class="field"><label style="display:flex;align-items:center">Sinopsis<button class="more" data-refetch style="margin:0 0 0 auto">Buscar la completa</button></label><textarea data-k="sinopsis">${esc(d.sinopsis)}</textarea></div>
    </div></div>`);

  const read = () => { const o = {}; $$('[data-k]', ov).forEach(i => o[i.dataset.k] = i.value.trim()); return o; };
  const note = $('.dl-note', ov);
  const paintCover = () => {
    const tmp = Object.assign({}, read(), { id: '', portada: draft.portada });
    let html;
    if (!draft.portada && draft.candidatos.length) html = `<div class="cv"><img src="${esc(draft.candidatos[0])}" alt=""></div>`;
    else html = coverHTML(tmp);
    $('.cvbox', ov).innerHTML = html;
    const img = $('.cvbox img', ov);
    if (img) img.onerror = () => { $('.cvbox', ov).innerHTML = `<div class="cv">${genCover(tmp)}</div>`; };
    $('[data-c="recortar"]', ov).hidden = !(draft.portada && !/^https?:/.test(draft.portada));
  };
  paintCover();
  const syn = $('[data-k="sinopsis"]', ov);
  const grow = () => { syn.style.height = 'auto'; syn.style.height = Math.max(160, syn.scrollHeight + 4) + 'px'; };
  syn.addEventListener('input', grow); requestAnimationFrame(grow);
  $('[data-refetch]', ov).onclick = async e => {
    const isbn = cleanIsbn($('[data-k="isbn"]', ov).value);
    if (isbn.length < 10) { toast('Pon el ISBN para buscarla'); return; }
    const btn = e.currentTarget; btn.textContent = 'Buscando…';
    const r = (await byIsbn(isbn).catch(() => []))[0];
    btn.textContent = 'Buscar la completa';
    if (r && r.sinopsis && r.sinopsis.length > syn.value.trim().length) { syn.value = r.sinopsis; grow(); toast('Sinopsis actualizada'); }
    else toast('No he encontrado una sinopsis más completa');
  };
  $$('[data-k="titulo"],[data-k="autor"],[data-k="editorial"]', ov).forEach(i => i.addEventListener('input', debounce(paintCover, 300)));

  const setLocal = path => { if (path) { draft.portada = path; draft.candidatos = []; draft.cambio = true; paintCover(); } };
  $$('[data-c]', ov).forEach(btn => btn.onclick = async () => {
    const c = btn.dataset.c;
    if (c === 'generada') { draft.portada = ''; draft.candidatos = []; draft.cambio = true; paintCover(); return; }
    if (c === 'buscar') {
      const v = read();
      const picked = await pickCover(v);
      if (picked) {
        note.hidden = false; note.textContent = 'Descargando la portada…';
        const path = N ? await native('downloadCover', JSON.stringify(picked)) : picked[0];
        note.hidden = true;
        if (path) setLocal(path); else toast('No he podido descargar esa portada');
      }
      return;
    }
    if (!N) { toast('Disponible en el móvil'); return; }
    if (c === 'foto' || c === 'galeria') {
      const path = await native(c === 'foto' ? 'takePhoto' : 'pickImage');
      if (path) { const cropped = await cropImage(path); setLocal(cropped || path); }
      return;
    }
    if (c === 'recortar') { const cropped = await cropImage(draft.portada); if (cropped) setLocal(cropped); }
  });

  $('[data-save]', ov).onclick = async () => {
    const v = read();
    if (!v.titulo) { toast('Ponle al menos un título'); $('[data-k="titulo"]', ov).focus(); return; }
    v.isbn = v.isbn.replace(/[^0-9Xx]/g, '').toUpperCase();
    const target = book || { id: uid(), creado: Date.now(), estado: 'pendiente', nota: 0, resena: '' };
    if (isNew && v.isbn && state.books.some(x => x.isbn === v.isbn)) {
      if (!await confirmBox('Ya lo tienes', 'Hay un libro con ese mismo ISBN en tu estantería. ¿Añadirlo otra vez?', 'Añadir igualmente')) return;
    }
    const old = target.portada;
    Object.assign(target, v);
    if (draft.cambio || isNew) {
      target.portada = draft.portada;
      if (old && old !== draft.portada && N && !/^(data:|https?:)/.test(old)) N.deleteCover(old);
    }
    if (isNew) state.books.push(target);
    saveNow(); render(); closeLayer();
    if (isNew) closeAllAdd();
    toast(isNew ? 'Colocado en la estantería' : 'Cambios guardados');
    // Descarga de la portada en segundo plano
    if (!target.portada && draft.candidatos.length) {
      const path = N ? await native('downloadCover', JSON.stringify(draft.candidatos)) : draft.candidatos[0];
      if (path) { target.portada = path; saveNow(); render(); }
    }
    if (afterSave) afterSave();
  };
}

/* ---------------- Recortar portada ---------------- */
function cropImage(path) {
  return new Promise(resolve => {
    let done = false;
    const ov = openLayer(`
      <div class="bar"><button class="ib" data-close>${ic('close')}</button><h2>Recortar portada</h2>
        <button class="btn" data-ok>Hecho</button></div>
      <div class="cropwrap"><img alt=""><div class="cropbox"><span class="h tl"></span><span class="h tr"></span><span class="h bl"></span><span class="h br"></span></div></div>
      <div class="note" style="padding:12px">Arrastra las esquinas hasta que el marco coincida con la portada.</div>`, 'full', () => { if (!done) resolve(null); });
    const wrap = $('.cropwrap', ov), img = $('img', wrap), box = $('.cropbox', wrap);
    let fit = null, r = null;
    img.onload = () => {
      const W = wrap.clientWidth, H = wrap.clientHeight, s = Math.min(W / img.naturalWidth, H / img.naturalHeight) * .94;
      const w = img.naturalWidth * s, h = img.naturalHeight * s;
      fit = { x: (W - w) / 2, y: (H - h) / 2, w, h, s };
      Object.assign(img.style, { left: fit.x + 'px', top: fit.y + 'px', width: w + 'px', height: h + 'px' });
      r = { x: fit.x + w * .06, y: fit.y + h * .06, w: w * .88, h: h * .88 };
      paint();
    };
    img.onerror = () => { toast('No he podido abrir la imagen'); closeLayer(); };
    img.src = coverSrc({ portada: path });
    const paint = () => Object.assign(box.style, { left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px' });
    let drag = null;
    wrap.onpointerdown = e => {
      if (!r) return;
      const h = e.target.classList.contains('h') ? [...e.target.classList].find(c => c.length === 2) : (e.target === box ? 'move' : null);
      if (!h) return;
      drag = { h, x: e.clientX, y: e.clientY, r: { ...r } }; wrap.setPointerCapture(e.pointerId);
    };
    wrap.onpointermove = e => {
      if (!drag) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y, o = drag.r, min = 40;
      let { x, y, w, h } = o;
      if (drag.h === 'move') { x = o.x + dx; y = o.y + dy; }
      if (drag.h.includes('l')) { x = Math.min(o.x + dx, o.x + o.w - min); w = o.x + o.w - x; }
      if (drag.h.includes('r') && drag.h !== 'move') w = Math.max(min, o.w + dx);
      if (drag.h.includes('t')) { y = Math.min(o.y + dy, o.y + o.h - min); h = o.y + o.h - y; }
      if (drag.h.includes('b')) h = Math.max(min, o.h + dy);
      // dentro de la imagen
      x = Math.max(fit.x, Math.min(x, fit.x + fit.w - w)); y = Math.max(fit.y, Math.min(y, fit.y + fit.h - h));
      w = Math.min(w, fit.x + fit.w - x); h = Math.min(h, fit.y + fit.h - y);
      r = { x, y, w, h }; paint();
    };
    wrap.onpointerup = () => { drag = null; };
    $('[data-ok]', ov).onclick = () => {
      if (!fit) return;
      const sx = (r.x - fit.x) / fit.s, sy = (r.y - fit.y) / fit.s, sw = r.w / fit.s, sh = r.h / fit.s;
      const c = document.createElement('canvas');
      const scale = Math.min(1, 1200 / sh);
      c.width = Math.round(sw * scale); c.height = Math.round(sh * scale);
      c.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height);
      let out = null;
      try {
        const data = c.toDataURL('image/jpeg', .9);
        out = N ? N.saveCoverData(data) : data;
      } catch (e) { toast('No se ha podido recortar'); }
      done = true;
      if (out && N && path !== out && !/^(data:|https?:)/.test(path)) N.deleteCover(path);
      resolve(out || null); closeLayer();
    };
  });
}

/* ---------------- Buscar libros en internet ---------------- */
async function fetchJSON(url, ms = 12000) {
  const c = new AbortController(); const t = setTimeout(() => c.abort(), ms);
  try { const r = await fetch(url, { signal: c.signal }); if (!r.ok) throw new Error('HTTP ' + r.status); return await r.json(); }
  finally { clearTimeout(t); }
}
const cleanIsbn = s => String(s || '').replace(/[^0-9Xx]/g, '').toUpperCase();
const looksIsbn = s => { const c = cleanIsbn(s); return (c.length === 10 || c.length === 13) && /^[\d\s-]*[\dXx][\s]*$/.test(String(s).trim()); };
const stripHtml = s => { const d = document.createElement('div'); d.innerHTML = String(s || '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n\n'); return d.textContent.replace(/\n{3,}/g, '\n\n').trim(); };
const httpsify = u => u ? u.replace(/^http:\/\//, 'https://') : u;
const olCover = isbn => `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`;

function gbMap(it) {
  const v = it.volumeInfo || {}, ids = v.industryIdentifiers || [];
  const i13 = (ids.find(x => x.type === 'ISBN_13') || {}).identifier, i10 = (ids.find(x => x.type === 'ISBN_10') || {}).identifier;
  let img = v.imageLinks && (v.imageLinks.thumbnail || v.imageLinks.smallThumbnail);
  img = httpsify(img || '').replace('&edge=curl', '');
  const covers = img ? [img.replace(/zoom=\d/, 'zoom=1') + '&fife=w800', img] : [];
  return {
    titulo: v.title || '', subtitulo: v.subtitle || '', autor: (v.authors || []).join(', '), editorial: v.publisher || '',
    anio: (v.publishedDate || '').slice(0, 4), paginas: v.pageCount || '', isbn: i13 || i10 || '', idioma: v.language || '',
    sinopsis: stripHtml(v.description), covers, thumb: img
  };
}
async function googleSearch(q) {
  const j = await fetchJSON(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=20&printType=books&country=ES`);
  return (j.items || []).map(gbMap);
}
async function olIsbn(isbn) {
  const j = await fetchJSON(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`, 8000);
  const d = j['ISBN:' + isbn]; if (!d) return null;
  return {
    titulo: d.title || '', subtitulo: d.subtitle || '', autor: (d.authors || []).map(a => a.name).join(', '),
    editorial: ((d.publishers || [])[0] || {}).name || '', anio: ((d.publish_date || '').match(/\d{4}/) || [''])[0],
    paginas: d.number_of_pages || '', isbn, idioma: '', sinopsis: '',
    covers: d.cover ? [d.cover.large || d.cover.medium].filter(Boolean) : [], thumb: d.cover ? (d.cover.medium || d.cover.small) : ''
  };
}
async function olSearch(q) {
  const j = await fetchJSON(`https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=15&fields=title,author_name,publisher,first_publish_year,isbn,cover_i,number_of_pages_median`, 10000);
  return (j.docs || []).map(d => ({
    titulo: d.title || '', subtitulo: '', autor: (d.author_name || []).join(', '), editorial: (d.publisher || [])[0] || '',
    anio: d.first_publish_year || '', paginas: d.number_of_pages_median || '',
    isbn: (d.isbn || []).find(x => x.length === 13 && /^97[89]84/.test(x)) || (d.isbn || []).find(x => x.length === 13) || '',
    idioma: '', sinopsis: '', covers: d.cover_i ? [`https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg`] : [],
    thumb: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg` : ''
  }));
}
function merge(a, b) {
  if (!a) return b; if (!b) return a;
  const o = { ...a };
  for (const k of Object.keys(b)) if (k !== 'covers' && !o[k] && b[k]) o[k] = b[k];
  o.covers = [...new Set([...(a.covers || []), ...(b.covers || [])])];
  o.thumb = a.thumb || b.thumb;
  return o;
}
function toIsbn10(i13) {
  if (i13.length !== 13 || !i13.startsWith('978')) return '';
  const b = i13.slice(3, 12); let s = 0;
  for (let k = 0; k < 9; k++) s += (10 - k) * +b[k];
  const d = (11 - s % 11) % 11;
  return b + (d === 10 ? 'X' : String(d));
}
// "SHARPE, TOM" -> "Tom Sharpe"; "WILT" -> "Wilt"
function niceName(s) {
  s = String(s || '').trim(); if (!s) return '';
  if (/^[^,]+,\s*[^,]+$/.test(s)) { const [ap, no] = s.split(','); s = no.trim() + ' ' + ap.trim(); }
  if (s === s.toUpperCase()) s = s.toLowerCase().replace(/(^|[\s.'-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase());
  return s;
}
function niceTitle(s) {
  s = String(s || '').trim();
  if (s && s === s.toUpperCase() && /\p{L}/u.test(s)) { s = s.toLowerCase(); s = s.charAt(0).toUpperCase() + s.slice(1); }
  return s;
}
// todostuslibros.com: catálogo de las librerías españolas (lo lee la parte nativa)
async function ttlIsbn(isbn) {
  if (!N || !N.httpGet) return null;
  const html = await native('httpGet', 'https://www.todostuslibros.com/busquedas?keyword=' + isbn);
  if (!html) return null;
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const canon = (doc.querySelector('link[rel="canonical"]') || {}).getAttribute?.('href') || '';
  if (!/\/libros\//.test(canon)) return null;
  const meta = n => { const m = doc.querySelector(`meta[property="${n}"],meta[name="${n}"]`); return m ? (m.getAttribute('content') || '').trim() : ''; };
  const h1 = doc.querySelector('h1');
  const titulo = niceTitle((h1 && h1.textContent.replace(/\s+/g, ' ').trim()) || meta('og:title'));
  if (!titulo) return null;
  const txt = a => a ? a.textContent.replace(/\s+/g, ' ').trim() : '';
  const body = (doc.body ? doc.body.textContent : '').replace(/\s+/g, ' ');
  let img = meta('og:image'); if (img && img.startsWith('//')) img = 'https:' + img;
  return {
    titulo, subtitulo: '', autor: niceName(txt(doc.querySelector('a[href*="/creador/"]'))),
    editorial: niceName(txt(doc.querySelector('a[href*="/editoriales/"]'))).replace(/[\s,]+S\.?\s?[AL]\.?(\s?U\.?)?$/i, ''),
    coleccion: niceName(txt(doc.querySelector('a[href*="/colecciones/"],a[href*="/coleccion/"]'))),
    anio: (body.match(/(?:publicaci[oó]n|edici[oó]n)\s*:?\s*(?:\d{1,2}[\/-]\d{1,2}[\/-])?((?:19|20)\d{2})/i) || [])[1] || '',
    paginas: (body.match(/p[aá]ginas?\s*:?\s*(\d{2,4})/i) || [])[1] || '',
    isbn, idioma: 'es', sinopsis: ttlSynopsis(doc) || meta('description') || meta('og:description'),
    covers: img ? [img] : [], thumb: img
  };
}
// La sinopsis completa va debajo del título «Descripción» y antes de «Sobre autoría»
function ttlSynopsis(doc) {
  // 1) Bloque de la sinopsis por su id («Leer todo» abre #collapseSynopsis)
  const clean = t => (t || '').replace(/\b(Leer todo|Leer menos|Leer más)\b/gi, ' ').replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').replace(/\n{2,}/g, '\n\n').trim();
  const byId = ['#synopsis', '#collapseSynopsis', '[id*="ynopsis"]', '.synopsis', '[class*="synopsis"]']
    .flatMap(s => [...doc.querySelectorAll(s)]).map(el => {
      const ps = el.querySelectorAll('p');
      return clean(ps.length ? [...ps].map(p => p.textContent).join('\n\n') : el.textContent);
    }).filter(t => t.length > 40).sort((a, b) => b.length - a.length);
  if (byId.length) {
    let best = byId[0];
    // si el bloque largo es solo la continuación del avance, se unen
    const short = byId.find(t => t !== best && t.length < best.length);
    if (short && !best.includes(short.slice(0, 40)) && !short.includes(best.slice(0, 40))) best = short + ' ' + best;
    if (best.length > 60) return best;
  }
  // 2) Lo que va debajo del título «Descripción»
  const isHead = el => /^H[1-6]$/.test(el.tagName) || /^(descripci[oó]n|sobre autor[ií]a|sobre el autor|ficha t[eé]cnica|opiniones|otros libros)/i.test((el.textContent || '').trim()) && (el.textContent || '').trim().length < 40;
  const head = [...doc.querySelectorAll('h1,h2,h3,h4,h5,h6,strong,b,span,div,p,dt')]
    .find(el => /^descripci[oó]n:?$/i.test((el.textContent || '').trim()));
  const parts = [];
  if (head) {
    let el = head;
    // si el título no tiene hermanos detrás, sube un nivel
    while (el && !el.nextElementSibling && el.parentElement && el.parentElement !== doc.body) el = el.parentElement;
    for (let s = el && el.nextElementSibling; s; s = s.nextElementSibling) {
      if (isHead(s)) break;
      const blocks = s.querySelectorAll('p');
      const texts = blocks.length ? [...blocks].map(p => p.textContent) : [s.textContent];
      for (const t of texts) { const x = t.replace(/\s+/g, ' ').trim(); if (x) parts.push(x); }
      if (parts.join(' ').length > 6000) break;
    }
  }
  let txt = parts.join('\n\n').trim();
  if (txt.length < 60) {
    const body = (doc.body ? doc.body.textContent : '').replace(/\s+/g, ' ');
    const m = body.match(/Descripci[oó]n:?\s+(.{60,6000}?)\s+(?:Sobre autor[ií]a|Sobre el autor|Ficha t[eé]cnica|Opiniones|Otros libros)/i);
    txt = m ? m[1].trim() : '';
  }
  return txt;
}
async function olSearchIsbn(isbn) {
  const r = await olSearch('isbn:' + isbn).catch(() => []);
  return r[0] ? { ...r[0], isbn } : null;
}
async function gbIsbn(isbn) {
  let g = await googleSearch('isbn:' + isbn).catch(() => []);
  if (!g.length) {
    const i10 = toIsbn10(isbn);
    const extra = await googleSearch(isbn).catch(() => []);
    g = extra.filter(x => x.isbn === isbn || (i10 && x.isbn === i10));
  }
  return g;
}
async function byIsbn(raw) {
  const isbn = cleanIsbn(raw);
  const [g, t, o] = await Promise.all([
    gbIsbn(isbn),
    ttlIsbn(isbn).catch(() => null),
    olIsbn(isbn).catch(() => null).then(x => x || olSearchIsbn(isbn))
  ]);
  // Google da buena sinopsis; todostuslibros, la editorial y los datos de la edición española
  let r = g[0] || null;
  if (r && t) { const gs = r.sinopsis || ''; r = merge(r, t); if ((t.sinopsis || '').length > gs.length) r.sinopsis = t.sinopsis; if (t.editorial) r.editorial = t.editorial; if (t.coleccion) r.coleccion = t.coleccion; }
  else r = r || t;
  r = merge(r, o);
  if (!r) return [];
  r.isbn = isbn;
  r.covers = [...new Set([...(r.covers || []), olCover(isbn)])];
  return [r];
}
async function searchBooks(q) {
  if (looksIsbn(q)) return byIsbn(q);
  let res = await googleSearch(q).catch(() => null);
  if (!res || res.length < 4) {
    const ol = await olSearch(q).catch(() => []);
    res = [...(res || []), ...ol];
  }
  if (res === null) throw new Error('red');
  return res;
}
async function enrich(r) {
  if (!r.isbn) return r;
  if (!r.editorial || !r.paginas || !r.covers.length) {
    try { r = merge(r, await olIsbn(r.isbn)); } catch (e) { }
  }
  r.covers = [...new Set([...(r.covers || []), olCover(r.isbn)])];
  return r;
}

/* ---------------- Añadir ---------------- */
let addOv = null;
function closeAllAdd() { while (addOv && stack.some(s => s.ov === addOv)) closeLayer(); addOv = null; }
function openAdd(autoScan) {
  addOv = openLayer(`
    <div class="bar"><button class="ib" data-close>${ic('close')}</button><h2>Añadir libro</h2></div>
    <div class="scroll"><div class="pad">
      <div class="bigbtns">
        <button class="bigbtn" data-scan>${ic('barcode')}Escanear el código de barras</button>
        <button class="bigbtn" data-manual>${ic('pen')}Escribirlo a mano</button>
      </div>
      <div class="searchrow"><input type="search" placeholder="Título, autor o ISBN" enterkeyhint="search"><button class="btn">${ic('search')}</button></div>
      <div class="results"><div class="note">Busca por título y autor para encontrar tu edición.<br>Si tiene código de barras, escanearlo da la edición exacta.</div></div>
    </div></div>`, 'full', () => { addOv = null; });
  const ov = addOv, input = $('.searchrow input', ov), out = $('.results', ov);
  const go = async (q) => {
    q = (q || input.value).trim(); if (!q) return;
    input.value = q; input.blur();
    out.innerHTML = `<div class="loading"><div class="spin"></div></div>${looksIsbn(q) ? `<div class="note" style="padding-top:0">Buscando el ISBN ${esc(cleanIsbn(q))}…</div>` : ''}`;
    let res;
    try { res = await searchBooks(q); }
    catch (e) { out.innerHTML = '<div class="note">No hay conexión con el buscador. Comprueba internet o añádelo a mano.</div>'; return; }
    if (!res.length) {
      out.innerHTML = `<div class="note">No he encontrado nada para ${looksIsbn(q) ? 'el ISBN' : ''} “${esc(q)}”.${looksIsbn(q) ? '<br>Prueba a buscarlo por título y autor.' : ''}</div>
        <div style="text-align:center"><button class="btn sec" data-m>${ic('pen')}Añadirlo a mano</button></div>`;
      $('[data-m]', out).onclick = () => openEdit(null, looksIsbn(q) ? { isbn: cleanIsbn(q) } : { titulo: q });
      return;
    }
    out.innerHTML = res.map((r, i) => {
      const own = r.isbn && state.books.some(b => b.isbn === r.isbn);
      return `<div class="res" data-i="${i}"><div class="thumb">${r.thumb ? `<img src="${esc(r.thumb)}" alt="" loading="lazy">` : genCover({ ...r, id: '' })}</div>
        <div style="min-width:0"><div class="t">${esc(r.titulo)}${r.subtitulo ? `<span class="muted" style="font-weight:400">. ${esc(r.subtitulo)}</span>` : ''}</div>
        <div class="a">${esc(r.autor || 'Autor desconocido')}</div>
        <div class="m">${esc([r.editorial, r.anio, r.paginas && r.paginas + ' págs.'].filter(Boolean).join(' · '))}</div>
        ${own ? '<span class="own">Ya está en tu estantería</span>' : ''}</div></div>`;
    }).join('');
    $$('.res', out).forEach(el => el.onclick = async () => {
      el.style.opacity = .5;
      const r = await enrich({ ...res[+el.dataset.i] });
      el.style.opacity = 1;
      openEdit(null, r);
    });
  };
  input.onkeydown = e => { if (e.key === 'Enter') go(); };
  $('.searchrow .btn', ov).onclick = () => go();
  $('[data-manual]', ov).onclick = () => openEdit(null, {});
  const scan = async () => {
    if (!N) { toast('El escáner funciona en el móvil'); return; }
    const code = await native('scanBarcode');
    if (code) go(code);
  };
  $('[data-scan]', ov).onclick = scan;
  if (autoScan) scan();
}

/* ---------------- Elegir portada ---------------- */
function pickCover(v) {
  return new Promise(resolve => {
    let done = false;
    const q0 = [v.titulo, v.autor].filter(Boolean).join(' ');
    const ov = openLayer(`
      <div class="bar"><button class="ib" data-close>${ic('back')}</button><h2>Buscar portada</h2></div>
      <div class="scroll"><div class="pad">
        <div class="muted" style="font-size:13.5px;line-height:1.45">Busca tu edición: en cada portada pone la editorial.</div>
        <div class="searchrow"><input type="search" value="${esc(q0)}" enterkeyhint="search"><button class="btn">${ic('search')}</button></div>
        <div class="out"></div>
      </div></div>`, 'full', () => { if (!done) resolve(null); });
    const input = $('input', ov), out = $('.out', ov);
    const go = async () => {
      const q = input.value.trim(); if (!q) return;
      out.innerHTML = '<div class="loading"><div class="spin"></div></div>';
      let opts = [];
      try {
        const isbn = cleanIsbn(v.isbn);
        const tasks = [googleSearch(q).catch(() => []), olSearch(q).catch(() => [])];
        if (isbn.length >= 10) tasks.push(byIsbn(isbn).catch(() => []));
        const [g, o, i = []] = await Promise.all(tasks);
        const seen = new Set();
        for (const r of [...i, ...g, ...o]) {
          if (!r.covers.length || seen.has(r.covers[0])) continue; seen.add(r.covers[0]);
          opts.push({ urls: r.covers, thumb: r.thumb || r.covers[r.covers.length - 1], lab: [pubName(r.editorial), r.anio].filter(Boolean).join(' · ') });
        }
        if (isbn.length >= 10 && !opts.length) opts.push({ urls: [olCover(isbn)], thumb: olCover(isbn), lab: 'Open Library' });
      } catch (e) { }
      if (!opts.length) { out.innerHTML = '<div class="note">No he encontrado portadas. Prueba a hacerle una foto.</div>'; return; }
      out.innerHTML = '<div class="covergrid">' + opts.map((o, k) => `<button class="opt" data-k="${k}"><img src="${esc(o.thumb)}" alt="" loading="lazy">${o.lab ? `<span class="lab">${esc(o.lab)}</span>` : ''}</button>`).join('') + '</div>';
      $$('.opt img', out).forEach(im => im.onerror = () => im.closest('.opt').remove());
      $$('.opt', out).forEach(b => b.onclick = () => { done = true; resolve(opts[+b.dataset.k].urls); closeLayer(); });
    };
    input.onkeydown = e => { if (e.key === 'Enter') { input.blur(); go(); } };
    $('.searchrow .btn', ov).onclick = go;
    go();
  });
}

/* ---------------- Ordenar ---------------- */
function openSort() {
  const s = state.settings;
  const ov = openLayer(`<h2 style="margin:0 0 6px;font-size:19px">Ordenar estantería</h2>
    <div class="opts">${Object.entries(SORTS).map(([k, v]) => `<div class="o ${s.sort === k ? 'on' : ''}" data-s="${k}"><span class="rd"></span>${v.n}</div>`).join('')}</div>
    <div class="switchrow" data-g><div class="txt">Separar por editorial<small>Cada editorial en sus propias baldas</small></div><div class="sw ${s.group ? 'on' : ''}"></div></div>`, 'sheet');
  $$('.o', ov).forEach(o => o.onclick = () => { s.sort = o.dataset.s; save(); render(); closeLayer(); });
  $('[data-g]', ov).onclick = () => { s.group = !s.group; $('.sw', ov).classList.toggle('on', s.group); save(); render(); };
}

/* ---------------- Ajustes ---------------- */
const THEMES = [
  ['roble', 'Roble claro'], ['nogal', 'Nogal oscuro'], ['nordica', 'Nórdica blanca'], ['clasica', 'Biblioteca clásica'],
  ['noche', 'Noche'], ['industrial', 'Industrial'], ['arena', 'Arena']
];
function themePreview(t) {
  // Las variables están en body[data-theme], así que se leen con un body temporal
  const prev = document.body.dataset.theme; document.body.dataset.theme = t;
  const cs = getComputedStyle(document.body);
  const v = n => cs.getPropertyValue(n).trim();
  const out = { wall: v('--wall'), img: v('--wall-img'), top: v('--plank-top'), plank: v('--plank'), edge: v('--plank-edge'), case: v('--case') };
  document.body.dataset.theme = prev;
  const cols = ['#E8B92F', '#F3EEE3', '#1E2A44', '#B22B27', '#141414', '#2F6B8A', '#EDE5D3'];
  const hs = [46, 52, 44, 56, 49, 41, 53];
  return `<div class="pv" style="background:${out.img && out.img !== 'none' ? out.img + ',' : ''}${out.wall};border-left:5px solid ${out.case};border-right:5px solid ${out.case}">
    ${cols.map((c, i) => `<i style="background:${c};height:${hs[i]}px"></i>`).join('')}
    <div class="pl" style="background:linear-gradient(${out.top} 0 3px, ${out.plank} 3px);border-bottom:2px solid ${out.edge}"></div></div>`;
}
function openSettings() {
  const s = state.settings;
  const ov = openLayer(`
    <div class="bar"><button class="ib" data-close>${ic('back')}</button><h2>Ajustes</h2></div>
    <div class="scroll"><div class="pad" style="padding-top:2px">
      <h3 class="sec">Vista</h3>
      <div class="pick" data-view><button data-v="portadas">Portadas</button><button data-v="lomos">Lomos</button></div>
      <h3 class="sec">Tamaño de los libros</h3>
      <div class="rangerow"><span style="font-size:12px">A</span><input type="range" min="0.6" max="1.5" step="0.05" value="${s.size}"><span style="font-size:20px">A</span></div>
      <h3 class="sec">Tema de la estantería</h3>
      <div class="themes">${THEMES.map(([k, n]) => `<div class="th ${s.theme === k ? 'on' : ''}" data-t="${k}">${themePreview(k)}<div class="nm">${n}</div></div>`).join('')}</div>
      <h3 class="sec">Editoriales</h3>
      <div class="listrow" data-styles>${ic('palette')}<div class="nm">Estilos de editorial<small>Colores de lomos y portadas dibujadas</small></div>${ic('chevron')}</div>
      <h3 class="sec">Copia de seguridad</h3>
      <div class="listrow" data-exp>${ic('download')}<div class="nm">Guardar copia<small>Libros, reseñas y portadas en un archivo</small></div></div>
      <div class="listrow" data-imp>${ic('upload')}<div class="nm">Recuperar copia<small>Sustituye lo que hay ahora en la app</small></div></div>
      <p class="muted" style="font-size:12.5px;margin-top:26px;text-align:center">Mi biblioteca 1.0 · Datos de libros de Google Books y Open Library</p>
    </div></div>`);
  const paintView = () => $$('[data-view] button', ov).forEach(b => b.classList.toggle('on', b.dataset.v === s.view));
  $$('[data-view] button', ov).forEach(b => b.onclick = () => { s.view = b.dataset.v; paintView(); save(); render(); });
  paintView();
  $('input[type=range]', ov).oninput = e => { s.size = +e.target.value; applyTheme(); render(); save(); };
  $$('.th', ov).forEach(t => t.onclick = () => {
    s.theme = t.dataset.t; $$('.th', ov).forEach(x => x.classList.toggle('on', x === t)); applyTheme(); render(); save();
  });
  $('[data-styles]', ov).onclick = openStyles;
  $('[data-exp]', ov).onclick = async () => {
    if (!N) { toast('Disponible en el móvil'); return; }
    saveNow();
    const d = new Date().toISOString().slice(0, 10);
    const r = await native('exportBackup', `mi-biblioteca-${d}.json`);
    if (r === 'ok') toast('Copia guardada'); else if (r) toast('No se ha podido guardar la copia');
  };
  $('[data-imp]', ov).onclick = async () => {
    if (!N) { toast('Disponible en el móvil'); return; }
    if (!await confirmBox('¿Recuperar una copia?', 'Lo que tienes ahora en la estantería se sustituirá por lo que haya en el archivo.', 'Elegir archivo', true)) return;
    const r = await native('importBackup');
    if (r === 'error') toast('Ese archivo no es una copia de Mi biblioteca');
  };
}

function openStyles() {
  const keys = new Map();
  for (const b of state.books) { const k = pubKey(b.editorial); if (k && !keys.has(k)) keys.set(k, b.editorial); }
  const mine = [...keys.entries()].sort((a, b) => collator.compare(pubName(a[1]), pubName(b[1])));
  const others = Object.entries(DEFAULTS).filter(([k]) => !keys.has(k)).map(([k, v]) => [k, v.n]).sort((a, b) => collator.compare(a[1], b[1]));
  const sample = (pub, name) => ({ id: 'x' + pub, titulo: 'Título', autor: 'Autor', editorial: name, paginas: 300 });
  const row = ([k, name]) => {
    const smp = sample(k, name);
    return `<div class="listrow" data-k="${esc(k)}" data-n="${esc(name)}"><div class="minis"><div class="cv">${genCover(smp)}</div>${spineHTML(smp, 16, 54)}</div>
      <div class="nm">${esc(pubName(name))}${state.settings.styles[k] ? '<small>Personalizado</small>' : ''}</div>${ic('chevron')}</div>`;
  };
  const ov = openLayer(`
    <div class="bar"><button class="ib" data-close>${ic('back')}</button><h2>Estilos de editorial</h2></div>
    <div class="scroll"><div class="pad" style="padding-top:4px">
      <p class="muted" style="font-size:13.5px;line-height:1.45;margin:8px 0 0">Se usan en la vista de lomos y en los libros que no tienen foto de portada.</p>
      ${mine.length ? `<h3 class="sec">En tu estantería</h3>${mine.map(row).join('')}` : ''}
      <h3 class="sec">Otras editoriales</h3>${others.map(row).join('')}
    </div></div>`);
  $$('.listrow', ov).forEach(r => r.onclick = () => openStyleEdit(r.dataset.k, r.dataset.n, () => { closeLayer(); openStyles(); }));
}

function openStyleEdit(key, name, onDone) {
  const cur = styleFor(name);
  const st = { bg: cur.bg, fg: cur.fg, ac: cur.ac, t: cur.t, f: cur.f };
  const smp = { id: 'p' + key, titulo: 'El nombre del libro', autor: 'Nombre Apellido', editorial: name, paginas: 420 };
  const ov = openLayer(`
    <div class="bar"><button class="ib" data-close>${ic('back')}</button><h2>${esc(pubName(name))}</h2><button class="btn" data-ok>Guardar</button></div>
    <div class="scroll"><div class="pad">
      <div class="stylepreview"></div>
      <h3 class="sec">Colores</h3>
      <div class="colors">
        <label><input type="color" data-c="bg" value="${st.bg}">Fondo</label>
        <label><input type="color" data-c="fg" value="${st.fg}">Texto</label>
        <label><input type="color" data-c="ac" value="${st.ac}">Acento</label>
      </div>
      <h3 class="sec">Diseño</h3>
      <div class="pick" data-t>${[['tipo', 'Tipográfico'], ['bloque', 'Bloque'], ['franja', 'Franja'], ['bandas', 'Bandas'], ['marco', 'Marco']].map(([k, n]) => `<button data-v="${k}">${n}</button>`).join('')}</div>
      <h3 class="sec">Letra</h3>
      <div class="pick" data-f><button data-v="serif">Clásica</button><button data-v="sans">Moderna</button></div>
      <div style="margin-top:30px;text-align:center"><button class="btn sec" data-reset>Volver al estilo original</button></div>
    </div></div>`);
  const preview = () => {
    const old = state.settings.styles[key];
    state.settings.styles[key] = st;
    $('.stylepreview', ov).innerHTML = `<div class="cv">${genCover(smp)}</div>${spineHTML(smp, 34, 165)}`;
    if (old) state.settings.styles[key] = old; else delete state.settings.styles[key];
    $$('[data-t] button', ov).forEach(b => b.classList.toggle('on', b.dataset.v === st.t));
    $$('[data-f] button', ov).forEach(b => b.classList.toggle('on', b.dataset.v === st.f));
  };
  $$('[data-c]', ov).forEach(i => i.oninput = () => { st[i.dataset.c] = i.value.toUpperCase(); preview(); });
  $$('[data-t] button', ov).forEach(b => b.onclick = () => { st.t = b.dataset.v; preview(); });
  $$('[data-f] button', ov).forEach(b => b.onclick = () => { st.f = b.dataset.v; preview(); });
  $('[data-ok]', ov).onclick = () => { state.settings.styles[key] = { ...st }; saveNow(); render(); closeLayer(); onDone && onDone(); toast('Estilo guardado'); };
  $('[data-reset]', ov).onclick = () => { delete state.settings.styles[key]; saveNow(); render(); closeLayer(); onDone && onDone(); toast('Estilo original'); };
  preview();
}

/* ---------------- Búsqueda en la colección ---------------- */
function toggleSearch(show) {
  const bar = $('#searchbar'), q = $('#q');
  bar.hidden = !show;
  if (show) setTimeout(() => q.focus(), 50);
  else { q.value = ''; state.query = ''; render(); }
}

/* ---------------- Arranque ---------------- */
function init() {
  load();
  $('#bSearch').innerHTML = ic('search');
  $('#bMenu').innerHTML = ic('menu');
  $('#fab').innerHTML = ic('plus');
  applyTheme();
  render();

  $('#shelves').addEventListener('click', e => {
    const bk = e.target.closest('.bk'); if (bk) return openDetail(bk.dataset.id);
    const act = e.target.closest('[data-act]');
    if (act) openAdd(act.dataset.act === 'scan');
  });
  $('#fab').onclick = () => openAdd(false);
  $('#bMenu').onclick = openSettings;
  $('#bSort').onclick = openSort;
  $('#bView').onclick = () => { state.settings.view = state.settings.view === 'lomos' ? 'portadas' : 'lomos'; save(); render(); };
  $('#bSearch').onclick = () => toggleSearch($('#searchbar').hidden);
  $('#q').oninput = debounce(e => { state.query = e.target.value; render(); }, 150);
  $$('#filt button').forEach(b => b.onclick = () => { state.settings.filter = b.dataset.f; save(); render(); });
  let lastW = window.innerWidth;
  window.addEventListener('resize', debounce(() => { if (window.innerWidth !== lastW) { lastW = window.innerWidth; render(); } }, 150));
}
init();
