/* ============================================================
   ResearchFast.Page - lit la page de resultats affichee,
   en extrait les annonces, les classe et montre les meilleures.
   ------------------------------------------------------------
   Tout est construit en DOM (jamais innerHTML) : Facebook et
   Amazon imposent Trusted Types, qui bloquerait innerHTML.
   ============================================================ */

(function () {

/* un exemplaire precedent tourne peut-etre encore */
document.querySelectorAll('#rfp-panel, .rfp-launcher, .rfp-toast').forEach(el => el.remove());

/* ============================================================
   Outils
   ============================================================ */
const txt = el => ((el && el.textContent) || '').replace(/\s+/g, ' ').trim();

/* minuscules sans accents, pour comparer "Écran" et "ecran" */
const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/* "1 299,99 $" / "$1,299.99" / "12.50 EUR" -> 1299.99 */
function parsePrice(text) {
  if (!text) return null;
  const t = String(text).replace(/ /g, ' ');
  const m = t.match(/(\d{1,3}(?:[ .,]\d{3})*(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)/);
  if (!m) return null;

  let s = m[1];
  const last = Math.max(s.lastIndexOf('.'), s.lastIndexOf(','));
  if (last > -1 && s.length - last - 1 <= 2 && s.length - last - 1 > 0) {
    s = s.slice(0, last).replace(/[ .,]/g, '') + '.' + s.slice(last + 1);
  } else {
    s = s.replace(/[ .,]/g, '');
  }
  const v = parseFloat(s);
  return isFinite(v) && v > 0 ? v : null;
}

function money(v) {
  if (v == null) return '—';
  return v.toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' $';
}

const first = (root, selectors) => {
  for (const s of selectors) {
    const el = root.querySelector(s);
    if (el) return el;
  }
  return null;
};

/* ============================================================
   Lecteurs par site
   ============================================================ */
const SITES = [

  /* ---------------- Amazon ---------------- */
  {
    id: 'amazon', name: 'Amazon', delay: 1200,
    test: h => /(^|\.)amazon\./.test(h),
    parse() {
      const cards = document.querySelectorAll(
        'div[data-component-type="s-search-result"], div.s-result-item[data-asin]:not([data-asin=""])');
      const out = [];

      cards.forEach(card => {
        const titleEl = first(card, ['h2 a span', 'h2 span', '[data-cy="title-recipe"] span', 'h2']);
        const title = txt(titleEl);
        if (!title) return;

        const priceEl = first(card, ['.a-price > .a-offscreen', '.a-price .a-offscreen', '.a-color-price']);
        const price = parsePrice(txt(priceEl));

        const link = first(card, ['h2 a', 'a.a-link-normal.s-no-outline', 'a.a-link-normal']);
        const img = card.querySelector('img.s-image');

        const rateEl = first(card, ['i.a-icon-star-small span', 'span.a-icon-alt', 'i.a-icon-star span']);
        const rating = rateEl ? parsePrice(txt(rateEl)) : null;

        const revEl = first(card, ['span.a-size-base.s-underline-text', 'a[href*="customerReviews"] span']);
        const reviews = revEl ? parsePrice(txt(revEl)) : null;

        const sponsored = /sponsoris|sponsored|gesponsert/i.test(txt(card).slice(0, 200));

        out.push({
          title, price,
          url: link ? link.href : location.href,
          img: img ? img.src : '',
          rating: rating && rating <= 5 ? rating : null,
          reviews: reviews || null,
          note: sponsored ? 'sponsorisé' : ''
        });
      });
      return out;
    }
  },

  /* ---------------- eBay ---------------- */
  {
    id: 'ebay', name: 'eBay', delay: 900,
    test: h => /(^|\.)ebay\./.test(h),
    parse() {
      const out = [];
      document.querySelectorAll('li.s-item, li.s-card, .srp-results li[data-viewport]').forEach(card => {
        const title = txt(first(card, ['.s-item__title', '.s-card__title', 'h3']));
        if (!title || /^shop on ebay$/i.test(title)) return;

        const price = parsePrice(txt(first(card, ['.s-item__price', '.s-card__price'])));
        const link = first(card, ['a.s-item__link', 'a.s-card__link', 'a[href*="/itm/"]']);
        const img = first(card, ['.s-item__image img', 'img']);
        const ship = txt(first(card, ['.s-item__shipping', '.s-item__logisticsCost']));

        out.push({
          title, price,
          url: link ? link.href : location.href,
          img: img ? (img.src || img.dataset.src || '') : '',
          rating: null, reviews: null,
          note: /gratuit|free/i.test(ship) ? 'livraison gratuite' : ''
        });
      });
      return out;
    }
  },

  /* ---------------- Facebook Marketplace ---------------- */
  {
    id: 'facebook', name: 'Marketplace', delay: 2600,
    test: h => /(^|\.)facebook\./.test(h),
    parse() {
      const out = [];
      const seen = new Set();

      document.querySelectorAll('a[href*="/marketplace/item/"]').forEach(link => {
        const id = (link.getAttribute('href').match(/item\/(\d+)/) || [])[1];
        if (!id || seen.has(id)) return;
        seen.add(id);

        /* Marketplace n'a pas de classes stables : on lit les lignes de texte
           de la carte et on devine le prix et le titre. */
        const lines = [];
        link.querySelectorAll('span, div').forEach(n => {
          if (n.children.length === 0) {
            const t = txt(n);
            if (t && !lines.includes(t)) lines.push(t);
          }
        });
        if (!lines.length) return;

        const priceLine = lines.find(l => /^\s*(gratuit|free|[\d\s.,]*\s*\$|\$\s*[\d\s.,]+)/i.test(l));
        const price = /gratuit|free/i.test(priceLine || '') ? 0 : parsePrice(priceLine);

        const title = lines
          .filter(l => l !== priceLine && l.length > 3)
          .sort((a, b) => b.length - a.length)[0] || lines[0];

        const place = lines.find(l => l !== title && l !== priceLine && l.length < 40) || '';
        const img = link.querySelector('img');

        out.push({
          title, price,
          url: link.href,
          img: img ? img.src : '',
          rating: null, reviews: null,
          note: place
        });
      });
      return out;
    }
  },

  /* ---------------- n'importe quel autre site ---------------- */
  {
    id: 'generic', name: 'Cette page', delay: 1400, generic: true,
    test: () => true,
    parse() {
      const out = [];
      const seen = new Set();
      const RE = /(?:\$|€|£|CAD|USD)\s*\d|\d[\d\s.,]*\s*(?:\$|€|£)/;

      /* on cherche les petits blocs de texte qui ressemblent a un prix,
         puis on remonte jusqu'a la carte produit qui les contient */
      document.querySelectorAll('span, div, p, strong, b').forEach(node => {
        if (node.children.length) return;
        const t = txt(node);
        if (t.length > 24 || !RE.test(t)) return;

        const price = parsePrice(t);
        if (!price) return;

        let card = node, link = null, depth = 0;
        while (card && depth < 7) {
          link = card.querySelector && card.querySelector('a[href]');
          if (link && txt(card).length > t.length + 10) break;
          card = card.parentElement;
          depth++;
        }
        if (!card || !link) return;

        const url = link.href;
        if (!url || seen.has(url)) return;
        seen.add(url);

        const title = (txt(link) || txt(card)).replace(t, '').trim().slice(0, 140);
        if (title.length < 6) return;

        const img = card.querySelector('img');
        out.push({
          title, price, url,
          img: img ? img.src : '',
          rating: null, reviews: null, note: ''
        });
      });
      return out.slice(0, 120);
    }
  }
];

const SITE = SITES.find(s => s.test(location.hostname)) || SITES[SITES.length - 1];

/* ============================================================
   Classement
   ============================================================ */
function score(items, query, filters) {
  const words = norm(query).split(/\s+/).filter(w => w.length > 1);
  const bans = norm(filters.exclude || '').split(/[\s,]+/).filter(Boolean);

  let kept = items.filter(it => {
    const t = norm(it.title);
    if (bans.some(b => t.includes(b))) return false;
    if (filters.minPrice && it.price != null && it.price < filters.minPrice) return false;
    /* le budget maximum n'est PAS applique ici : il est reglable en direct
       au curseur, sans avoir a rescanner la page. */
    if (filters.minRating && (it.rating || 0) < filters.minRating) return false;
    if (filters.noSponsored && it.note === 'sponsorisé') return false;
    return true;
  });

  /* pertinence : combien de mots de la recherche sont dans le titre */
  kept.forEach(it => {
    const t = norm(it.title);
    const hits = words.filter(w => t.includes(w));
    it.match = words.length ? hits.length / words.length : 1;
    if (!words.length || !hits.length) return;

    const firstHit = Math.min.apply(null, hits.map(w => t.indexOf(w)));
    const accessory = t.search(/\b(pour|for|compatible|adapte)\b/);

    /* "Étui de rangement POUR casque bluetooth" : les mots cherches arrivent
       apres un "pour", c'est un accessoire, pas le produit demande. */
    if (accessory > -1 && firstHit > accessory) it.match *= 0.4;
    else if (firstHit <= 20) it.match = Math.min(1, it.match * 1.15);
  });

  if (words.length) {
    /* un titre sans aucun mot de la recherche n'a rien a faire la */
    kept = kept.filter(it => it.match > 0);
    const strict = kept.filter(it => it.match >= 0.5);
    if (strict.length >= 3) kept = strict;
  }

  const prices = kept.map(it => it.price).filter(p => p != null);
  const lo = Math.min.apply(null, prices.length ? prices : [0]);
  const hi = Math.max.apply(null, prices.length ? prices : [1]);
  const span = hi - lo || 1;

  kept.forEach(it => {
    const cheap = it.price == null ? 0.35 : 1 - (it.price - lo) / span;
    const stars = it.rating ? it.rating / 5 : 0.55;
    const trust = it.reviews ? Math.min(1, Math.log10(it.reviews + 1) / 3.2) : 0.4;
    it.score = Math.round((it.match * 0.34 + cheap * 0.38 + stars * 0.17 + trust * 0.11) * 100);
  });

  return kept.sort((a, b) => b.score - a.score);
}

/* ============================================================
   Le panneau
   ============================================================ */
/* mêmes paliers que dans le popup : fins en bas, larges en haut, puis "sans limite" */
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

function stopIndex(value) {
  if (value == null) return LAST;
  let best = 0;
  for (let i = 0; i < LAST; i++) if (Math.abs(STOPS[i] - value) < Math.abs(STOPS[best] - value)) best = i;
  return best;
}

let panel = null;
let state = { all: [], query: '', sort: 'score', budget: null };

/* les annonces qui rentrent dans le budget courant */
function visible() {
  const b = state.budget;
  return state.all.filter(it => b == null || (it.price != null && it.price <= b));
}

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

function buildPanel() {
  if (panel) panel.remove();

  panel = el('div');
  panel.id = 'rfp-panel';

  /* --- en-tete --- */
  const head = el('div', 'rfp-head');
  const brand = el('div', 'rfp-brand');
  brand.append(el('span', 'rfp-logo', '🔎'), el('span', null, 'ResearchFast'));
  const close = el('button', 'rfp-close', '×');
  close.title = 'Fermer';
  close.addEventListener('click', () => { panel.remove(); panel = null; });
  head.append(brand, close);

  const q = el('div', 'rfp-query', state.query ? '« ' + state.query + ' »' : 'Toutes les annonces');

  /* --- curseur de budget --- */
  const bud = el('div', 'rfp-budget');
  const bTop = el('div', 'rfp-budget-top');
  const bVal = el('span', 'rfp-budget-val');
  bTop.append(el('span', 'rfp-budget-lbl', 'Budget max'), bVal);

  const range = document.createElement('input');
  range.type = 'range';
  range.className = 'rfp-range';
  range.min = 0;
  range.max = LAST;
  range.step = 1;
  range.value = stopIndex(state.budget);
  range.addEventListener('input', () => {
    state.budget = STOPS[Number(range.value)];
    paintBudget();
    renderList();
    saveBudget();
  });
  bud.append(bTop, range);

  /* --- barre de tri --- */
  const bar = el('div', 'rfp-bar');
  const count = el('span', 'rfp-count');
  const sort = el('select', 'rfp-sort');
  [['score', 'Meilleure offre'], ['price', 'Prix croissant'],
   ['rating', 'Mieux notés'], ['title', 'Alphabétique']].forEach(o => {
    const opt = el('option', null, o[1]);
    opt.value = o[0];
    sort.appendChild(opt);
  });
  sort.value = state.sort;
  sort.addEventListener('change', () => { state.sort = sort.value; renderList(); });
  bar.append(count, sort);

  const list = el('div', 'rfp-list');

  /* --- pied --- */
  const foot = el('div', 'rfp-foot');
  const again = el('button', 'rfp-btn', '↻ Rescanner');
  again.addEventListener('click', () => run(true));
  const more = el('button', 'rfp-btn', '⬇ Charger plus');
  more.title = 'Fait défiler la page pour charger d\'autres annonces, puis rescanne';
  more.addEventListener('click', loadMore);
  foot.append(again, more);

  panel.append(head, q, bud, bar, list, foot);
  document.body.appendChild(panel);

  panel._count = count;
  panel._list = list;
  panel._range = range;
  panel._bval = bVal;
  paintBudget();
}

function paintBudget() {
  if (!panel) return;
  const b = state.budget;
  panel._bval.textContent = b == null ? 'sans limite' : b.toLocaleString('fr-CA') + ' $';
  panel._bval.classList.toggle('is-open', b == null);
  panel._range.style.setProperty('--fill', Math.round((panel._range.value / LAST) * 100) + '%');
}

/* le budget suit dans le popup, et inversement */
function saveBudget() {
  clearTimeout(saveBudget.t);
  saveBudget.t = setTimeout(() => {
    chrome.storage.local.get({ filters: {} }, r => {
      const f = r.filters || {};
      f.maxPrice = state.budget;
      chrome.storage.local.set({ filters: f });
    });
  }, 250);
}

function renderList() {
  const list = panel._list;
  list.textContent = '';

  const items = visible();
  if (state.sort === 'price') items.sort((a, b) => (a.price == null) - (b.price == null) || a.price - b.price);
  if (state.sort === 'rating') items.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  if (state.sort === 'title') items.sort((a, b) => a.title.localeCompare(b.title));

  panel._count.textContent = items.length + (items.length > 1 ? ' offres' : ' offre')
    + (state.budget != null && items.length < state.all.length
        ? ' sur ' + state.all.length : '');

  if (!items.length) {
    const empty = el('div', 'rfp-empty');
    const cheap = state.all.filter(it => it.price != null).sort((a, b) => a.price - b.price)[0];

    if (state.all.length && state.budget != null) {
      empty.append(
        el('div', 'rfp-empty-icon', '💸'),
        el('div', null, 'Rien sous ' + state.budget.toLocaleString('fr-CA') + ' $.'),
        el('div', 'rfp-empty-sub', cheap
          ? 'Le moins cher ici est à ' + Math.round(cheap.price).toLocaleString('fr-CA') + ' $.'
          : 'Remonte le curseur.'));
    } else {
      empty.append(
        el('div', 'rfp-empty-icon', '🤷'),
        el('div', null, 'Rien trouvé sur cette page.'),
        el('div', 'rfp-empty-sub', 'Lance une recherche sur le site, puis rescanne.'));
    }
    list.appendChild(empty);
    return;
  }

  items.slice(0, 60).forEach((it, i) => {
    const row = el('a', 'rfp-item' + (i === 0 && state.sort === 'score' ? ' is-best' : ''));
    row.href = it.url;
    row.target = '_blank';
    row.rel = 'noopener';

    if (it.img) {
      const im = el('img', 'rfp-img');
      im.src = it.img;
      im.loading = 'lazy';
      row.appendChild(im);
    } else {
      row.appendChild(el('div', 'rfp-img rfp-noimg', '📦'));
    }

    const mid = el('div', 'rfp-mid');
    mid.appendChild(el('div', 'rfp-title', it.title));

    const meta = el('div', 'rfp-meta');
    if (it.rating) meta.appendChild(el('span', 'rfp-star', '★ ' + it.rating.toFixed(1)));
    if (it.reviews) meta.appendChild(el('span', null, '(' + it.reviews.toLocaleString('fr-CA') + ')'));
    if (it.note) meta.appendChild(el('span', 'rfp-note', it.note));
    meta.appendChild(el('span', 'rfp-badge', SITE.name));
    mid.appendChild(meta);

    const right = el('div', 'rfp-right');
    right.appendChild(el('div', 'rfp-price', it.price === 0 ? 'Gratuit' : money(it.price)));
    right.appendChild(el('div', 'rfp-score', it.score + ' pts'));

    row.append(mid, right);
    if (i === 0 && state.sort === 'score') row.appendChild(el('div', 'rfp-ribbon', 'MEILLEURE OFFRE'));
    list.appendChild(row);
  });
}

function toast(message) {
  document.querySelectorAll('.rfp-toast').forEach(t => t.remove());
  const t = el('div', 'rfp-toast', message);
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}

/* fait defiler pour declencher le chargement paresseux, puis rescanne */
function loadMore() {
  const y = window.scrollY;
  window.scrollTo(0, document.body.scrollHeight);
  toast('Chargement des annonces suivantes...');
  setTimeout(() => {
    window.scrollTo(0, y);
    run(true);
  }, 1800);
}

/* ============================================================
   Scan
   ============================================================ */
function run(silent) {
  chrome.storage.local.get({ query: '', filters: {}, results: {} }, cfg => {
    let raw = [];
    try {
      raw = SITE.parse() || [];
    } catch (e) {
      toast('Lecture impossible sur cette page.');
      return;
    }

    /* le lecteur generique sert de secours si le lecteur du site ne donne rien */
    if (!raw.length && !SITE.generic) {
      try { raw = SITES[SITES.length - 1].parse() || []; } catch (e) { raw = []; }
    }

    const filters = cfg.filters || {};
    state.query = cfg.query || '';
    state.budget = filters.maxPrice != null ? filters.maxPrice : null;
    state.all = score(raw, state.query, filters);

    /* on enregistre la liste complete, pas celle filtree par le budget :
       le curseur du popup doit pouvoir la reparcourir sans rescanner. */
    const results = cfg.results || {};
    results[SITE.id] = {
      site: SITE.name,
      url: location.href,
      when: Date.now(),
      items: state.all.slice(0, 40)
    };
    chrome.storage.local.set({ results, pending: false });

    buildPanel();
    renderList();

    if (!silent && !state.all.length) toast('Aucune annonce reconnue ici.');
  });
}

/* bouton flottant discret quand on n'a rien demande */
function launcher() {
  const b = el('button', 'rfp-launcher', '🔎');
  b.title = 'ResearchFast : scanner cette page';
  b.addEventListener('click', () => { b.remove(); run(false); });
  document.body.appendChild(b);
}

/* ============================================================
   Demarrage
   ============================================================ */
chrome.storage.local.get({ query: '', pending: false }, cfg => {
  if (cfg.pending && cfg.query) setTimeout(() => run(true), SITE.delay);
  else launcher();
});

/* si le budget est bouge depuis le popup, le panneau suit */
chrome.storage.onChanged.addListener(ch => {
  if (!ch.filters || !panel) return;
  const max = (ch.filters.newValue || {}).maxPrice;
  const value = max != null ? max : null;
  if (value === state.budget) return;
  state.budget = value;
  panel._range.value = stopIndex(value);
  paintBudget();
  renderList();
});

chrome.runtime.onMessage.addListener((msg, sender, respond) => {
  if (msg.action === 'scan') {
    run(false);
    respond({ ok: true, handled: true, site: SITE.name });
  } else if (msg.action === 'ping') {
    respond({ ok: true, handled: true, site: SITE.name });
  } else {
    respond({ ok: false, reason: 'unknown' });
  }
  return true;
});

})();
