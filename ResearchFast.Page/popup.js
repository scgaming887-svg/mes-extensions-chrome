/* ============================================================
   ResearchFast.Page - interface
   ============================================================ */

const DEFAULTS = {
  query: '',
  sites: ['amazon', 'ebay'],
  filters: { minPrice: null, maxPrice: null, minRating: 0, exclude: '', noSponsored: false },
  region: 'ca',
  results: {},
  searchStamp: 0
};

/* adresses de recherche par site et par pays */
const SEARCH = {
  amazon: {
    name: 'Amazon', icon: '📦',
    url: (q, r) => 'https://www.amazon.' + (r === 'com' ? 'com' : r) + '/s?k=' + encodeURIComponent(q)
  },
  ebay: {
    name: 'eBay', icon: '🏷️',
    url: (q, r) => 'https://www.ebay.' + (r === 'com' ? 'com' : r) + '/sch/i.html?_nkw=' + encodeURIComponent(q)
  },
  facebook: {
    name: 'Marketplace', icon: '🛒',
    url: q => 'https://www.facebook.com/marketplace/search/?query=' + encodeURIComponent(q)
  }
};

/* paliers du curseur : definis une seule fois dans rank.js */
const STOPS = RFPRank.STOPS, LAST = RFPRank.LAST, stopIndex = RFPRank.stopIndex;
const MIN_STOPS = RFPRank.MIN_STOPS;

const euros = v => v.toLocaleString('fr-CA') + ' $';

let cfg = JSON.parse(JSON.stringify(DEFAULTS));
let tabId = null;

/* ============================================================
   Rendu
   ============================================================ */
function renderSites() {
  const box = document.getElementById('sites');
  box.textContent = '';
  Object.keys(SEARCH).forEach(id => {
    const s = SEARCH[id];
    const b = document.createElement('button');
    b.className = 'site' + (cfg.sites.indexOf(id) !== -1 ? ' is-on' : '');
    b.type = 'button';

    const ic = document.createElement('span');
    ic.className = 'ic';
    ic.textContent = s.icon;
    b.append(ic, document.createTextNode(s.name));

    b.addEventListener('click', () => {
      const i = cfg.sites.indexOf(id);
      if (i === -1) cfg.sites.push(id);
      else cfg.sites.splice(i, 1);
      renderSites();
      save();
    });
    box.appendChild(b);
  });
}

/* classement recalcule a chaque changement : la ponderation depend du budget */
function ranked() {
  return RFPRank.rank(merged(), cfg.query, cfg.filters, cfg.filters.maxPrice);
}

function refresh() {
  const r = ranked();
  renderResults(r);
  renderBudget(r);
}

/* ---------- curseur de budget ---------- */
function renderBudget(r) {
  r = r || ranked();
  const slider = document.getElementById('budget');
  const val = document.getElementById('budget-val');
  const hint = document.getElementById('budget-hint');
  const max = cfg.filters.maxPrice;

  val.textContent = max == null ? 'sans limite' : euros(max);
  val.className = 'budget-val' + (max == null ? ' no-limit' : '');

  const min = cfg.filters.minPrice;
  const minVal = document.getElementById('min-val');
  minVal.textContent = min == null ? 'aucun' : euros(min);
  minVal.className = 'budget-val' + (min == null ? ' no-limit' : '');
  RFPRank.paintRange(document.getElementById('minPrice'), MIN_STOPS);
  slider.style.setProperty('--fill', Math.round((slider.value / LAST) * 100) + '%');

  const all = r.items;
  document.getElementById('budget-mode').textContent = all.length ? r.mode.label : '';
  if (!all.length) {
    hint.textContent = 'Glisse pour ne garder que ce qui rentre dans ton budget.';
    return;
  }

  const inBudget = all.filter(it => max == null || (it.price != null && it.price <= max));
  hint.textContent = '';

  if (!inBudget.length) {
    const cheapest = all.filter(it => it.price != null).sort((a, b) => a.price - b.price)[0];
    const s = document.createElement('span');
    s.className = 'none';
    s.textContent = 'Rien sous ' + euros(max) + '.';
    hint.append(s);
    if (cheapest) hint.append(' Le moins cher est à ' + euros(Math.round(cheapest.price)) + '.');
    return;
  }

  const b = document.createElement('b');
  b.textContent = inBudget.length + (inBudget.length > 1 ? ' offres' : ' offre');
  if (min != null && max != null)      hint.append(b, ' entre ' + euros(min) + ' et ' + euros(max) + '.');
  else if (min != null)                hint.append(b, ' au-dessus de ' + euros(min) + '.');
  else if (max != null)                hint.append(b, ' dans ton budget.');
  else                                 hint.append(b, ' au total.');
}

function fillForm() {
  document.getElementById('query').value = cfg.query;
  RFPRank.setupRange(document.getElementById('minPrice'), MIN_STOPS, cfg.filters.minPrice);
  RFPRank.setupSlider(document.getElementById('budget'), cfg.filters.maxPrice);
  document.getElementById('minRating').value = cfg.filters.minRating || 0;
  document.getElementById('exclude').value = cfg.filters.exclude || '';
  document.getElementById('noSponsored').checked = !!cfg.filters.noSponsored;
  document.getElementById('region').value = cfg.region;
  renderSites();
  refresh();
}

function readForm() {
  cfg.query = document.getElementById('query').value.trim();
  cfg.region = document.getElementById('region').value;
  cfg.filters = {
    minPrice: MIN_STOPS[Number(document.getElementById('minPrice').value)],
    maxPrice: STOPS[Number(document.getElementById('budget').value)],
    minRating: Number(document.getElementById('minRating').value),
    exclude: document.getElementById('exclude').value.trim(),
    noSponsored: document.getElementById('noSponsored').checked
  };
}

function save(bouge) {
  readForm();

  /* le minimum ne peut pas passer au-dessus du budget : on rabat l'autre
     curseur et on le remet a sa place a l'ecran */
  const avant = cfg.filters.minPrice + '/' + cfg.filters.maxPrice;
  RFPRank.clampBounds(cfg.filters, bouge);
  if (avant !== cfg.filters.minPrice + '/' + cfg.filters.maxPrice) {
    RFPRank.setupRange(document.getElementById('minPrice'), MIN_STOPS, cfg.filters.minPrice);
    RFPRank.setupSlider(document.getElementById('budget'), cfg.filters.maxPrice);
  }

  chrome.storage.local.set({
    query: cfg.query, sites: cfg.sites, filters: cfg.filters, region: cfg.region
  });
}

/* fusionne les annonces de tous les sites deja scannes */
function merged() {
  return RFPRank.merge(cfg.results);
}

function renderResults(r) {
  r = r || ranked();
  const box = document.getElementById('best');
  box.textContent = '';

  const max = cfg.filters.maxPrice;
  const items = r.items.filter(it => max == null || (it.price != null && it.price <= max));

  if (!items.length) {
    const scanned = r.items.length;
    const e = document.createElement('div');
    e.className = 'empty';
    const b = document.createElement('b');
    const p = document.createElement('div');

    if (scanned) {
      b.textContent = 'Rien dans ce budget';
      p.textContent = scanned + ' offres trouvées, mais toutes au-dessus de '
                    + euros(max) + '. Remonte le curseur.';
    } else {
      b.textContent = 'Aucun scan pour l\'instant';
      p.textContent = 'Tape ce que tu cherches, choisis les sites, puis lance la recherche.';
    }
    e.append(b, p);
    box.appendChild(e);
    return;
  }

  /* un seul site scanne : liste simple. Plusieurs : une section par site. */
  const ids = [];
  items.forEach(it => { if (ids.indexOf(it.siteId) === -1) ids.push(it.siteId); });

  if (ids.length < 2) {
    items.slice(0, 12).forEach((it, i) => box.appendChild(offer(it, i === 0)));
    return;
  }

  ids.forEach(id => {
    const meta = RFPRank.SITES_META[id] || { name: id, icon: '🛍️' };
    const mine = items.filter(it => it.siteId === id);

    const g = document.createElement('div');
    g.className = 'site-group';

    const head = document.createElement('div');
    head.className = 'site-head';
    const ic = document.createElement('span'); ic.className = 'ic'; ic.textContent = meta.icon;
    const nm = document.createElement('span'); nm.className = 'n'; nm.textContent = meta.name;
    const ct = document.createElement('span'); ct.className = 'c';
    ct.textContent = mine.length + (mine.length > 1 ? ' offres' : ' offre');
    head.append(ic, nm, ct);
    g.appendChild(head);

    mine.slice(0, 3).forEach((it, i) => g.appendChild(offer(it, i === 0)));
    box.appendChild(g);
  });
}

/* une ligne de resultat */
function offer(it, top) {
  const a = document.createElement('a');
  a.className = 'res' + (top ? ' top' : '');
  a.href = it.url;
  a.target = '_blank';
  a.rel = 'noopener';
  a.title = 'Score ' + it.score + '/100';

  if (it.img) {
    const im = document.createElement('img');
    im.src = it.img;
    a.appendChild(im);
  } else {
    const d = document.createElement('div');
    d.className = 'noimg';
    d.textContent = '📦';
    a.appendChild(d);
  }

  const mid = document.createElement('div');
  mid.className = 'mid';
  const t = document.createElement('div');
  t.className = 't';
  t.textContent = it.title;

  const m = document.createElement('div');
  m.className = 'm';
  const lab = RFPRank.ratingLabel(it);
  if (lab) {
    const k = document.createElement('span');
    k.className = 'k-' + lab.kind;
    k.textContent = lab.text;
    m.appendChild(k);
  }
  if (it.note) m.appendChild(document.createTextNode(' · ' + it.note));
  mid.append(t, m);

  const p = document.createElement('div');
  p.className = 'p';
  p.textContent = it.price == null ? '—' : it.price === 0 ? 'Gratuit'
    : it.price.toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' $';

  a.append(mid, p);
  return a;
}

function flash(text) {
  const el = document.getElementById('msg');
  el.textContent = text;
  clearTimeout(flash.t);
  flash.t = setTimeout(() => { el.textContent = ''; }, 3000);
}

/* ============================================================
   Actions
   ============================================================ */

/* lance la recherche : ouvre un onglet par site, le premier au premier plan */
document.getElementById('go').addEventListener('click', () => {
  save();
  if (!cfg.query) { flash('Écris d\'abord ce que tu cherches.'); return; }
  if (!cfg.sites.length) { flash('Choisis au moins un site.'); return; }

  /* on repart d'une ardoise propre pour cette recherche */
  /* marqueur unique de cette recherche : chaque site scanne une fois pour lui */
  chrome.storage.local.set({ results: {}, searchStamp: Date.now() }, () => {
    cfg.results = {};
    refresh();

    /* plusieurs sites : la page de comparaison passe devant et se remplit
       toute seule pendant que les onglets de recherche scannent en fond. */
    const compare = cfg.sites.length > 1;
    if (compare) chrome.tabs.create({ url: chrome.runtime.getURL('results.html'), active: true });

    cfg.sites.forEach((id, i) => {
      const url = SEARCH[id].url(cfg.query, cfg.region);
      chrome.tabs.create({ url, active: !compare && i === 0 });
    });
    flash(compare
      ? 'Comparaison de ' + cfg.sites.length + ' sites en cours...'
      : 'Recherche lancée sur 1 site.');
    setTimeout(() => window.close(), 600);
  });
});

/* scanne la page deja ouverte, quelle qu'elle soit */
document.getElementById('scan').addEventListener('click', () => {
  save();
  if (tabId === null) { flash('Impossible sur cette page.'); return; }

  chrome.tabs.sendMessage(tabId, { action: 'scan' }, res => {
    if (chrome.runtime.lastError || !res || !res.handled) {
      inject(() => {
        chrome.tabs.sendMessage(tabId, { action: 'scan' }, r2 => {
          if (chrome.runtime.lastError || !r2 || !r2.handled) flash('Recharge la page (F5) puis réessaie.');
          else { flash('Scan de ' + r2.site + '...'); setTimeout(() => window.close(), 500); }
        });
      });
      return;
    }
    flash('Scan de ' + res.site + '...');
    setTimeout(() => window.close(), 500);
  });
});

/* le script n'est pas present sur ce site : on l'injecte a la demande */
function inject(then) {
  if (!chrome.scripting) { flash('Recharge la page (F5).'); return; }
  chrome.scripting.insertCSS({ target: { tabId }, files: ['panel.css'] }, () => {
    void chrome.runtime.lastError;
    chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] }, () => {
      if (chrome.runtime.lastError) { flash('Impossible sur cette page.'); return; }
      setTimeout(then, 400);
    });
  });
}

document.getElementById('compare').addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('results.html') });
  window.close();
});

document.getElementById('clear').addEventListener('click', () => {
  cfg.results = {};
  chrome.storage.local.set({ results: {} });
  refresh();
});

document.addEventListener('input', e => {
  const id = e.target && e.target.id;
  save(id === 'minPrice' ? 'min' : id === 'budget' ? 'max' : null);
  refresh();
});

document.getElementById('query').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('go').click();
});

chrome.storage.onChanged.addListener(ch => {
  if (ch.results) { cfg.results = ch.results.newValue || {}; refresh(); }
});

/* ============================================================
   Demarrage
   ============================================================ */
chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
  const tab = tabs && tabs[0];
  if (tab) tabId = tab.id;

  chrome.storage.local.get(DEFAULTS, res => {
    cfg = Object.assign({}, DEFAULTS, res);
    cfg.filters = Object.assign({}, DEFAULTS.filters, res.filters || {});
    cfg.sites = res.sites && res.sites.length ? res.sites : DEFAULTS.sites.slice();
    cfg.results = res.results || {};
    fillForm();
  });
});
