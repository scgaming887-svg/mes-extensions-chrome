/* ============================================================
   PageCustomer - interface de reglage
   ============================================================ */

const DEFAULTS = {
  enabled: false,
  preset: '',
  useColors: false,
  bg: '#ffffff', fg: '#111111', link: '#1a73e8', bgImage: '',
  font: '', zoom: 100, lh: 100, width: 2000, radius: 0,
  bright: 100, contrast: 100, sat: 100,
  invert: false, hideImages: false, noAnim: false,
  css: ''
};

/* ---------- themes ---------- */
const THEMES = [
  { id: '',       name: 'Aucun',   prev: ['#ffffff', '#111111', '#1a73e8'], settings: {} },
  { id: 'dark',   name: 'Nuit',    prev: ['#14161c', '#d8dbe6', '#6cb8ff'],
    settings: { useColors: true, bg: '#14161c', fg: '#d8dbe6', link: '#6cb8ff' } },
  { id: 'sepia',  name: 'Sepia',   prev: ['#f4ecd8', '#4b3a26', '#8b5e34'],
    settings: { useColors: true, bg: '#f4ecd8', fg: '#4b3a26', link: '#8b5e34', sat: 90, font: 'Georgia, serif' } },
  { id: 'neon',   name: 'Neon',    prev: ['#0b0014', '#f2e9ff', '#00ffd5'],
    settings: { useColors: true, bg: '#0b0014', fg: '#f2e9ff', link: '#00ffd5', sat: 160, contrast: 115, radius: 12,
                css: 'h1,h2,h3 { text-shadow: 0 0 10px #ff00e6, 0 0 24px #00ffd5 !important; }' } },
  { id: 'reader', name: 'Lecture', prev: ['#fbfbf9', '#22252b', '#0b6bcb'],
    settings: { useColors: true, bg: '#fbfbf9', fg: '#22252b', link: '#0b6bcb', width: 780, lh: 160,
                font: 'Georgia, serif', noAnim: true } },
  { id: 'pastel', name: 'Pastel',  prev: ['#fdf3f7', '#3d3247', '#c86fa8'],
    settings: { useColors: true, bg: '#fdf3f7', fg: '#3d3247', link: '#c86fa8', radius: 14, sat: 90,
                font: 'Verdana, sans-serif' } }
];

/* ---------- reglages express ---------- */
const QUICK = [
  { id: 'invert',     icon: '🌙', label: 'Sombre',      test: s => s.invert,        apply: s => ({ invert: !s.invert }) },
  { id: 'bigtext',    icon: '🔍', label: 'Gros texte',  test: s => s.zoom > 100,    apply: s => ({ zoom: s.zoom > 100 ? 100 : 130 }) },
  { id: 'column',     icon: '📖', label: 'Colonne',     test: s => s.width < 2000,  apply: s => ({ width: s.width < 2000 ? 2000 : 780 }) },
  { id: 'hideImages', icon: '🚫', label: 'Sans images', test: s => s.hideImages,    apply: s => ({ hideImages: !s.hideImages }) },
  { id: 'noAnim',     icon: '⏸️', label: 'Sans anim',   test: s => s.noAnim,        apply: s => ({ noAnim: !s.noAnim }) }
];

/* champs du formulaire : id -> type de valeur */
const FIELDS = {
  useColors: 'check', bg: 'value', fg: 'value', link: 'value', bgImage: 'value',
  font: 'value', zoom: 'num', lh: 'num', width: 'num', radius: 'num',
  bright: 'num', contrast: 'num', sat: 'num',
  invert: 'check', hideImages: 'check', noAnim: 'check', css: 'value'
};

let host = '';
let scope = 'site';
let store = { global: Object.assign({}, DEFAULTS), sites: {} };

/* ============================================================
   Cible courante (ce site / partout)
   ============================================================ */
function target() {
  if (scope === 'global') return Object.assign({}, DEFAULTS, store.global);
  return Object.assign({}, DEFAULTS, store.sites[host] || store.global || {});
}

function commit(settings) {
  if (scope === 'global') store.global = settings;
  else store.sites[host] = settings;
  chrome.storage.local.set({ global: store.global, sites: store.sites });
  paint(settings);
}

/* ============================================================
   Formulaire
   ============================================================ */
function fillForm(s) {
  document.getElementById('enabled').checked = !!s.enabled;
  for (const id in FIELDS) {
    const el = document.getElementById(id);
    if (!el) continue;
    if (FIELDS[id] === 'check') el.checked = !!s[id];
    else el.value = s[id];
  }
  paint(s);
}

function readForm() {
  /* toute modification manuelle detache du theme choisi */
  const s = {
    enabled: document.getElementById('enabled').checked,
    preset: ''
  };
  for (const id in FIELDS) {
    const el = document.getElementById(id);
    if (!el) continue;
    if (FIELDS[id] === 'check') s[id] = el.checked;
    else if (FIELDS[id] === 'num') s[id] = Number(el.value);
    else s[id] = el.value;
  }
  return s;
}

/* tout ce qui est purement visuel dans le popup */
function paint(s) {
  document.body.classList.toggle('is-off', !s.enabled);

  document.getElementById('zoom-o').textContent     = s.zoom + '%';
  document.getElementById('lh-o').textContent       = s.lh === 100 ? 'normal' : s.lh + '%';
  document.getElementById('width-o').textContent    = s.width >= 2000 ? 'pleine' : s.width + 'px';
  document.getElementById('radius-o').textContent   = s.radius + 'px';
  document.getElementById('bright-o').textContent   = s.bright + '%';
  document.getElementById('contrast-o').textContent = s.contrast + '%';
  document.getElementById('sat-o').textContent      = s.sat + '%';

  document.getElementById('swatches').classList.toggle('is-off', !s.useColors);

  document.querySelectorAll('.theme').forEach(t =>
    t.classList.toggle('is-active', t.dataset.id === (s.preset || '')));

  document.querySelectorAll('.chip').forEach(c => {
    const q = QUICK.find(x => x.id === c.dataset.id);
    c.classList.toggle('is-on', !!q && q.test(s));
  });

  /* combien de reglages s'ecartent des valeurs par defaut */
  let n = 0;
  for (const k in FIELDS) if (String(s[k]) !== String(DEFAULTS[k])) n++;
  const st = document.getElementById('status');
  if (!s.enabled) st.textContent = 'Desactive';
  else if (n === 0) st.textContent = 'Aucun reglage actif';
  else st.textContent = n + (n > 1 ? ' reglages actifs' : ' reglage actif');
}

function save() {
  commit(readForm());
}

/* ============================================================
   Construction de l'UI
   ============================================================ */
function buildThemes() {
  const grid = document.getElementById('theme-grid');
  THEMES.forEach(t => {
    const b = document.createElement('button');
    b.className = 'theme';
    b.dataset.id = t.id;
    b.title = t.name;

    const prev = document.createElement('span');
    prev.className = 'theme-prev';
    prev.style.background = t.prev[0];
    [['62%', t.prev[1], 1], ['88%', t.prev[1], .45], ['44%', t.prev[2], 1]].forEach(row => {
      const i = document.createElement('i');
      i.style.width = row[0];
      i.style.background = row[1];
      i.style.opacity = row[2];
      prev.appendChild(i);
    });

    const name = document.createElement('span');
    name.className = 'theme-name';
    name.textContent = t.name;

    b.append(prev, name);
    b.addEventListener('click', () => {
      const s = Object.assign({}, DEFAULTS, t.settings, { enabled: true, preset: t.id });
      fillForm(s);
      commit(s);
    });
    grid.appendChild(b);
  });
}

function buildQuick() {
  const box = document.getElementById('quick-chips');
  QUICK.forEach(q => {
    const b = document.createElement('button');
    b.className = 'chip';
    b.dataset.id = q.id;
    b.innerHTML = '';
    const ic = document.createElement('span');
    ic.textContent = q.icon;
    const tx = document.createElement('span');
    tx.textContent = q.label;
    b.append(ic, tx);

    b.addEventListener('click', () => {
      const cur = readForm();
      const s = Object.assign({}, cur, q.apply(cur), { enabled: true });
      fillForm(s);
      commit(s);
    });
    box.appendChild(b);
  });
}

/* ============================================================
   Branchements
   ============================================================ */
document.addEventListener('input', e => {
  if (e.target.closest('main') || e.target.id === 'enabled') save();
});

document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('is-active', t === tab));
    document.querySelectorAll('.panel').forEach(p =>
      p.classList.toggle('is-active', p.id === 'panel-' + tab.dataset.tab));
  });
});

document.querySelectorAll('.seg').forEach(btn => {
  btn.addEventListener('click', () => {
    scope = btn.dataset.scope;
    document.querySelectorAll('.seg').forEach(b => b.classList.toggle('is-active', b === btn));
    document.getElementById('explain').textContent = scope === 'site'
      ? 'Ces reglages ne s\'appliquent qu\'a ce site.'
      : 'Appliques a tous les sites, sauf ceux qui ont leurs propres reglages.';
    fillForm(target());
  });
});

/* clic sur la valeur d'un curseur = retour a la valeur par defaut */
document.querySelectorAll('.pill').forEach(pill => {
  pill.title = 'Remettre par defaut';
  pill.addEventListener('click', () => {
    const id = pill.dataset.reset;
    document.getElementById(id).value = DEFAULTS[id];
    save();
  });
});

document.getElementById('reset').addEventListener('click', () => {
  if (scope === 'site') delete store.sites[host];
  else store.global = Object.assign({}, DEFAULTS);
  chrome.storage.local.set({ global: store.global, sites: store.sites });
  fillForm(target());
});

/* ============================================================
   Demarrage
   ============================================================ */
buildThemes();
buildQuick();

chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
  try {
    host = new URL(tabs[0].url).hostname;
  } catch (e) {
    host = '';
  }
  document.getElementById('host').textContent = host || 'page systeme';

  chrome.storage.local.get({ global: DEFAULTS, sites: {} }, res => {
    store = res;
    fillForm(target());
  });
});
