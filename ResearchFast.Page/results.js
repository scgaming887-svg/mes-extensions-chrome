/* ============================================================
   ResearchFast.Page - page de comparaison
   Une colonne par site, remplie au fur et a mesure que les
   onglets de recherche finissent de se scanner.
   ============================================================ */

const DEFAULTS = {
  query: '',
  sites: ['amazon', 'ebay'],
  filters: { minPrice: null, maxPrice: null, minRating: 0, exclude: '', noSponsored: false },
  results: {}
};

/* paliers du curseur : definis une seule fois dans rank.js */
const STOPS = RFPRank.STOPS, LAST = RFPRank.LAST, stopIndex = RFPRank.stopIndex;

const money = v => v == null ? '—'
  : v === 0 ? 'Gratuit'
  : v.toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' $';

let cfg = JSON.parse(JSON.stringify(DEFAULTS));
let sort = 'score';

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

/* ============================================================
   Rendu
   ============================================================ */
function render() {
  const budget = cfg.filters.maxPrice;
  const r = RFPRank.rank(RFPRank.merge(cfg.results), cfg.query, cfg.filters, budget);

  document.getElementById('query').textContent = cfg.query ? '« ' + cfg.query + ' »' : 'Toutes les annonces';
  document.getElementById('budget-val').textContent = budget == null ? 'sans limite' : budget.toLocaleString('fr-CA') + ' $';
  document.getElementById('budget-val').className = 'budget-val' + (budget == null ? ' no-limit' : '');
  const slider = document.getElementById('budget');
  slider.style.setProperty('--fill', Math.round((slider.value / LAST) * 100) + '%');

  const min = cfg.filters.minPrice;
  const minVal = document.getElementById('min-val');
  minVal.textContent = min == null ? 'aucun' : min.toLocaleString('fr-CA') + ' $';
  minVal.className = 'budget-val' + (min == null ? ' no-limit' : '');
  RFPRank.paintRange(document.getElementById('minPrice'), RFPRank.MIN_STOPS);
  document.getElementById('mode').textContent = r.items.length ? r.mode.label : '';

  const inBudget = r.items.filter(it => budget == null || (it.price != null && it.price <= budget));

  /* --- bandeau : etat de chaque site --- */
  const summary = document.getElementById('summary');
  summary.textContent = '';
  const sites = cfg.sites.length ? cfg.sites.slice() : Object.keys(cfg.results);
  Object.keys(cfg.results).forEach(id => { if (sites.indexOf(id) === -1) sites.push(id); });

  sites.forEach(id => {
    const meta = RFPRank.SITES_META[id] || { name: id, icon: '🛍️' };
    const mine = inBudget.filter(it => it.siteId === id);
    const scanned = !!cfg.results[id];

    const chip = el('div', 'chip' + (scanned ? '' : ' waiting'));
    chip.append(el('span', 'dot'), el('span', null, meta.icon + ' ' + meta.name));
    if (scanned) {
      const b = el('b', null, String(mine.length));
      chip.append(b, el('span', null, mine.length > 1 ? 'offres' : 'offre'));
      const cheap = mine.filter(it => it.price != null).sort((a, b2) => a.price - b2.price)[0];
      if (cheap) chip.append(el('span', null, '· dès ' + money(cheap.price)));
    } else {
      chip.append(el('span', null, 'scan en cours…'));
    }
    summary.appendChild(chip);
  });

  /* --- une colonne par site --- */
  const main = document.getElementById('columns');
  main.textContent = '';

  sites.forEach(id => {
    const meta = RFPRank.SITES_META[id] || { name: id, icon: '🛍️', rates: 'rien' };
    let mine = inBudget.filter(it => it.siteId === id);

    if (sort === 'price') mine.sort((a, b) => (a.price == null) - (b.price == null) || a.price - b.price);
    if (sort === 'rating') mine.sort((a, b) => (b.rating || 0) - (a.rating || 0));

    const col = el('div', 'col');

    const head = el('div', 'col-head');
    head.appendChild(el('span', 'ic', meta.icon));
    const name = el('div', 'name');
    name.appendChild(document.createTextNode(meta.name));
    name.appendChild(el('span', 'rates', meta.rates === 'rien'
      ? 'aucune note publiée ici'
      : 'la note porte sur ' + meta.rates));
    head.appendChild(name);
    head.appendChild(el('span', 'count', mine.length + (mine.length > 1 ? ' offres' : ' offre')));
    col.appendChild(head);

    const body = el('div', 'col-body');

    if (!mine.length) {
      const e = el('div', 'empty');
      e.appendChild(el('div', 'big', cfg.results[id] ? '💸' : '⏳'));
      e.appendChild(el('div', null, cfg.results[id]
        ? 'Rien dans ce budget sur ce site.'
        : 'En attente du scan de cet onglet…'));
      body.appendChild(e);
    } else {
      mine.slice(0, 40).forEach((it, i) => body.appendChild(row(it, i === 0 && sort === 'score')));
    }

    col.appendChild(body);
    main.appendChild(col);
  });
}

function row(it, best) {
  const a = el('a', 'item' + (best ? ' best' : ''));
  a.href = it.url;
  a.target = '_blank';
  a.rel = 'noopener';
  a.title = 'Score ' + it.score + '/100';

  if (it.img) {
    const im = el('img');
    im.src = it.img;
    im.loading = 'lazy';
    a.appendChild(im);
  } else {
    a.appendChild(el('div', 'noimg', '📦'));
  }

  const mid = el('div', 'mid');
  mid.appendChild(el('div', 't', it.title));

  const m = el('div', 'm');
  const lab = RFPRank.ratingLabel(it);
  if (lab) {
    m.appendChild(el('span', 'k-' + lab.kind, lab.text));
    if (lab.sub) m.appendChild(el('span', null, lab.sub));
  }
  if (it.note) m.appendChild(el('span', null, it.note));
  mid.appendChild(m);

  const right = el('div', 'right');
  right.appendChild(el('div', 'p', money(it.price)));
  right.appendChild(el('div', 's', it.why || (it.score + ' pts')));

  a.append(mid, right);
  if (best) a.appendChild(el('div', 'ribbon', 'MEILLEURE OFFRE'));
  return a;
}

/* ============================================================
   Branchements
   ============================================================ */
/* les deux bornes ne peuvent pas se croiser */
function bornes(qui) {
  RFPRank.clampBounds(cfg.filters, qui);
  RFPRank.setupRange(document.getElementById('minPrice'), RFPRank.MIN_STOPS, cfg.filters.minPrice);
  RFPRank.setupSlider(document.getElementById('budget'), cfg.filters.maxPrice);
  chrome.storage.local.set({ filters: cfg.filters });
  render();
}

document.getElementById('budget').addEventListener('input', e => {
  cfg.filters.maxPrice = STOPS[Number(e.target.value)];
  bornes('max');
});

document.getElementById('minPrice').addEventListener('input', e => {
  cfg.filters.minPrice = RFPRank.MIN_STOPS[Number(e.target.value)];
  bornes('min');
});

document.getElementById('sort').addEventListener('change', e => {
  sort = e.target.value;
  render();
});

document.getElementById('reload').addEventListener('click', () => load());

/* les onglets de recherche remplissent le stockage au fil de l'eau */
chrome.storage.onChanged.addListener(ch => {
  if (ch.results) { cfg.results = ch.results.newValue || {}; render(); }
  if (ch.filters) {
    cfg.filters = ch.filters.newValue || cfg.filters;
    RFPRank.setupRange(document.getElementById('minPrice'), RFPRank.MIN_STOPS, cfg.filters.minPrice);
    RFPRank.setupSlider(document.getElementById('budget'), cfg.filters.maxPrice);
    render();
  }
});

function load() {
  chrome.storage.local.get(DEFAULTS, res => {
    cfg = Object.assign({}, DEFAULTS, res);
    cfg.filters = Object.assign({}, DEFAULTS.filters, res.filters || {});
    cfg.results = res.results || {};
    RFPRank.setupRange(document.getElementById('minPrice'), RFPRank.MIN_STOPS, cfg.filters.minPrice);
    RFPRank.setupSlider(document.getElementById('budget'), cfg.filters.maxPrice);
    render();
  });
}

load();
