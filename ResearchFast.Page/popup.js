/* ============================================================
   ResearchFast.Page - interface
   ============================================================ */

const DEFAULTS = {
  query: '',
  sites: ['amazon', 'ebay'],
  filters: { minPrice: null, maxPrice: null, minRating: 0, exclude: '', noSponsored: false },
  region: 'ca',
  results: {},
  pending: false
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

/* Paliers du curseur : fins sur les petits prix, larges ensuite,
   et une derniere position "sans limite". */
const STOPS = (function () {
  const s = [];
  for (let v = 5;    v < 50;    v += 5)   s.push(v);
  for (let v = 50;   v < 200;   v += 10)  s.push(v);
  for (let v = 200;  v < 500;   v += 25)  s.push(v);
  for (let v = 500;  v < 1000;  v += 50)  s.push(v);
  for (let v = 1000; v <= 5000; v += 250) s.push(v);
  s.push(null);
  return s;
})();
const LAST = STOPS.length - 1;

const stopIndex = value => {
  if (value == null) return LAST;
  let best = 0;
  for (let i = 0; i < LAST; i++) if (Math.abs(STOPS[i] - value) < Math.abs(STOPS[best] - value)) best = i;
  return best;
};

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

/* ---------- curseur de budget ---------- */
function renderBudget() {
  const slider = document.getElementById('budget');
  const val = document.getElementById('budget-val');
  const hint = document.getElementById('budget-hint');
  const max = cfg.filters.maxPrice;

  val.textContent = max == null ? 'sans limite' : euros(max);
  val.className = 'budget-val' + (max == null ? ' no-limit' : '');
  slider.style.setProperty('--fill', Math.round((slider.value / LAST) * 100) + '%');

  const all = merged();
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
  hint.append(b, max == null ? ' au total.' : ' dans ton budget.');
}

function fillForm() {
  document.getElementById('query').value = cfg.query;
  document.getElementById('budget').value = stopIndex(cfg.filters.maxPrice);
  document.getElementById('minPrice').value = cfg.filters.minPrice != null ? cfg.filters.minPrice : '';
  document.getElementById('minRating').value = cfg.filters.minRating || 0;
  document.getElementById('exclude').value = cfg.filters.exclude || '';
  document.getElementById('noSponsored').checked = !!cfg.filters.noSponsored;
  document.getElementById('region').value = cfg.region;
  renderSites();
  renderResults();
  renderBudget();
}

function readForm() {
  const num = id => {
    const v = document.getElementById(id).value.trim();
    return v === '' ? null : Number(v);
  };
  cfg.query = document.getElementById('query').value.trim();
  cfg.region = document.getElementById('region').value;
  cfg.filters = {
    minPrice: num('minPrice'),
    maxPrice: STOPS[Number(document.getElementById('budget').value)],
    minRating: Number(document.getElementById('minRating').value),
    exclude: document.getElementById('exclude').value.trim(),
    noSponsored: document.getElementById('noSponsored').checked
  };
}

function save() {
  readForm();
  chrome.storage.local.set({
    query: cfg.query, sites: cfg.sites, filters: cfg.filters, region: cfg.region
  });
}

/* fusionne les annonces de tous les sites deja scannes */
function merged() {
  const all = [];
  Object.keys(cfg.results || {}).forEach(site => {
    const r = cfg.results[site];
    (r.items || []).forEach(it => all.push(Object.assign({ site: r.site }, it)));
  });
  return all.sort((a, b) => (b.score || 0) - (a.score || 0));
}

function renderResults() {
  const box = document.getElementById('best');
  box.textContent = '';

  const max = cfg.filters.maxPrice;
  const items = merged().filter(it => max == null || (it.price != null && it.price <= max));

  if (!items.length) {
    const scanned = merged().length;
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

  items.slice(0, 12).forEach((it, i) => {
    const a = document.createElement('a');
    a.className = 'res' + (i === 0 ? ' top' : '');
    a.href = it.url;
    a.target = '_blank';
    a.rel = 'noopener';

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
    m.textContent = [it.site, it.rating ? '★ ' + it.rating.toFixed(1) : null, it.note || null]
      .filter(Boolean).join(' · ');
    mid.append(t, m);

    const p = document.createElement('div');
    p.className = 'p';
    p.textContent = it.price == null ? '—'
      : it.price === 0 ? 'Gratuit'
      : it.price.toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' $';

    a.append(mid, p);
    box.appendChild(a);
  });
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
  chrome.storage.local.set({ results: {}, pending: true }, () => {
    cfg.results = {};
    renderResults();

    cfg.sites.forEach((id, i) => {
      const url = SEARCH[id].url(cfg.query, cfg.region);
      chrome.tabs.create({ url, active: i === 0 });
    });
    flash('Recherche lancée sur ' + cfg.sites.length + ' site(s).');
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

document.getElementById('clear').addEventListener('click', () => {
  cfg.results = {};
  chrome.storage.local.set({ results: {} });
  renderResults();
});

document.addEventListener('input', () => { save(); renderBudget(); renderResults(); });

document.getElementById('query').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('go').click();
});

chrome.storage.onChanged.addListener(ch => {
  if (ch.results) { cfg.results = ch.results.newValue || {}; renderResults(); renderBudget(); }
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
