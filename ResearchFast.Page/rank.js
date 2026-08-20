/* ============================================================
   ResearchFast.Page - le classement, partage par le popup
   et par le script injecte dans la page.
   ------------------------------------------------------------
   L'idee : la ponderation depend de ton budget.
     budget serre       -> le prix decide
     budget dans la moyenne -> prix et qualite a parts egales
     budget confortable -> la qualite decide, tu peux te la payer
   ============================================================ */

var RFPRank = (function () {

  const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  /* ---------- paliers du curseur de budget ----------
     Fins sur les petits prix, de plus en plus larges ensuite, jusqu'a
     100 000 $ puis une position "sans limite". Definis ici une seule fois :
     le popup, la page de comparaison et le panneau s'en servent tous. */
  const STOPS = (function () {
    const s = [];
    for (let v = 5;     v < 50;      v += 5)     s.push(v);
    for (let v = 50;    v < 200;     v += 10)    s.push(v);
    for (let v = 200;   v < 500;     v += 25)    s.push(v);
    for (let v = 500;   v < 1000;    v += 50)    s.push(v);
    for (let v = 1000;  v < 5000;    v += 250)   s.push(v);
    for (let v = 5000;  v < 10000;   v += 500)   s.push(v);
    for (let v = 10000; v < 25000;   v += 1000)  s.push(v);
    for (let v = 25000; v <= 100000; v += 5000)  s.push(v);
    s.push(null);
    return s;
  })();
  const LAST = STOPS.length - 1;

  /* Memes paliers pour le prix minimum, mais "aucun" se trouve en bas
     de la course au lieu du haut : la position 0 veut dire "pas de minimum". */
  const MIN_STOPS = [null].concat(STOPS.slice(0, LAST));
  const MIN_LAST = MIN_STOPS.length - 1;

  /* position du palier le plus proche d'une valeur, dans n'importe quelle liste */
  function indexIn(list, value) {
    if (value == null) return list.indexOf(null);
    let best = -1;
    for (let i = 0; i < list.length; i++) {
      if (list[i] == null) continue;
      if (best < 0 || Math.abs(list[i] - value) < Math.abs(list[best] - value)) best = i;
    }
    return best < 0 ? 0 : best;
  }

  const stopIndex = value => indexIn(STOPS, value);
  const minIndex  = value => indexIn(MIN_STOPS, value);

  /* prepare un curseur : bornes, position et remplissage, sans dependre du HTML */
  function setupRange(slider, list, value) {
    const last = list.length - 1;
    slider.min = 0;
    slider.max = last;
    slider.step = 1;
    slider.value = indexIn(list, value);
    paintRange(slider, list);
  }

  function paintRange(slider, list) {
    const last = list.length - 1;
    slider.style.setProperty('--fill', Math.round((slider.value / last) * 100) + '%');
  }

  const setupSlider = (slider, value) => setupRange(slider, STOPS, value);

  /* Le minimum ne peut pas depasser le maximum : on rabat celui qu'on
     ne vient PAS de bouger, pour que le curseur suive le doigt. */
  function clampBounds(filters, bouge) {
    if (filters.minPrice == null || filters.maxPrice == null) return filters;
    if (filters.minPrice <= filters.maxPrice) return filters;
    if (bouge === 'min') filters.maxPrice = filters.minPrice;
    else filters.minPrice = filters.maxPrice;
    return filters;
  }

  /* les sites connus, au meme endroit pour les trois interfaces */
  const SITES_META = {
    amazon:   { name: 'Amazon',      icon: '📦', rates: 'le produit' },
    ebay:     { name: 'eBay',        icon: '🏷️', rates: 'le vendeur' },
    facebook: { name: 'Marketplace', icon: '🛒', rates: 'rien' },
    generic:  { name: 'Autre site',  icon: '🛍️', rates: 'rien' }
  };

  /* rassemble les annonces de tous les sites deja scannes */
  function merge(results) {
    const all = [];
    Object.keys(results || {}).forEach(id => {
      const r = results[id] || {};
      (r.items || []).forEach(it => all.push(Object.assign({ siteId: id, site: r.site }, it)));
    });
    return all;
  }

  function median(nums) {
    if (!nums.length) return null;
    const a = nums.slice().sort((x, y) => x - y);
    const m = a.length >> 1;
    return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
  }

  /* ---------- ou se situe ton budget par rapport au marche ? ---------- */
  function weights(budget, prices) {
    const med = median(prices);

    if (budget == null || med == null) {
      return { key: 'free', match: 0.30, price: 0.25, quality: 0.45,
               label: 'Sans budget : priorité à la qualité' };
    }
    const ratio = budget / med;

    if (ratio < 0.8) {
      return { key: 'cheap', match: 0.28, price: 0.47, quality: 0.25,
               label: 'Budget serré : priorité au prix' };
    }
    if (ratio < 1.6) {
      return { key: 'mixed', match: 0.30, price: 0.33, quality: 0.37,
               label: 'Budget moyen : prix et qualité à parts égales' };
    }
    return { key: 'quality', match: 0.30, price: 0.18, quality: 0.52,
             label: 'Budget confortable : priorité à la qualité' };
  }

  /* ---------- qualite : note + solidite de cette note ---------- */
  function qualityOf(it) {
    if (it.rating == null && !it.reviews) return 0.5;      /* inconnue : neutre */
    /* 2,5 etoiles = 0 ; 5 etoiles = 1 */
    const stars = it.rating != null ? Math.max(0, Math.min(1, (it.rating - 2.5) / 2.5)) : 0.5;
    /* 1 avis ne vaut pas 5 000 avis */
    const trust = it.reviews ? Math.min(1, Math.log10(it.reviews + 1) / 3.2) : 0.35;
    return stars * 0.7 + trust * 0.3;
  }

  /* ---------- prix ---------- */
  function priceScoreOf(price, budget, lo, hi) {
    if (price == null) return 0.35;

    /* sans budget : on compare au reste des resultats, moins cher = mieux */
    if (budget == null) return hi > lo ? 1 - (price - lo) / (hi - lo) : 0.7;

    /* avec un budget : moins cher reste mieux, mais depenser ce qu'on a
       prevu n'est pas une faute -> la penalite est plafonnee a 0,4 */
    return Math.max(0.4, 1 - 0.6 * (price / budget));
  }

  /* ============================================================
     classement complet
     ============================================================ */
  function rank(items, query, filters, budget) {
    filters = filters || {};
    const words = norm(query).split(/\s+/).filter(w => w.length > 1);
    const bans = norm(filters.exclude || '').split(/[\s,]+/).filter(Boolean);

    let kept = items.filter(it => {
      const t = norm(it.title);
      if (bans.some(b => t.includes(b))) return false;
      if (filters.minPrice && it.price != null && it.price < filters.minPrice) return false;
      if (filters.minRating && (it.rating || 0) < filters.minRating) return false;
      if (filters.noSponsored && it.note === 'sponsorisé') return false;
      return true;
      /* le budget n'exclut rien ici : il change la ponderation, et
         c'est l'affichage qui coupe. On peut donc bouger le curseur
         sans relire la page. */
    });

    /* ---- pertinence ---- */
    kept.forEach(it => {
      const t = norm(it.title);
      const hits = words.filter(w => t.includes(w));
      it.match = words.length ? hits.length / words.length : 1;
      if (!words.length || !hits.length) return;

      const firstHit = Math.min.apply(null, hits.map(w => t.indexOf(w)));
      const accessory = t.search(/\b(pour|for|compatible|adapte)\b/);

      /* "Étui de rangement POUR casque bluetooth" : accessoire, pas le produit */
      if (accessory > -1 && firstHit > accessory) it.match *= 0.4;
      else if (firstHit <= 20) it.match = Math.min(1, it.match * 1.15);
    });

    if (words.length) {
      kept = kept.filter(it => it.match > 0);
      const strict = kept.filter(it => it.match >= 0.5);
      if (strict.length >= 3) kept = strict;
    }

    /* ---- notation ---- */
    const prices = kept.map(it => it.price).filter(p => p != null);
    const w = weights(budget, prices);
    const lo = prices.length ? Math.min.apply(null, prices) : 0;
    const hi = prices.length ? Math.max.apply(null, prices) : 1;

    kept.forEach(it => {
      it.quality = qualityOf(it);
      it.priceScore = priceScoreOf(it.price, budget, lo, hi);
      it.score = Math.round((it.match * w.match
                           + it.priceScore * w.price
                           + it.quality * w.quality) * 100);

      /* Garde-fou : meme en chasse au prix, un article mal note ne prend
         pas la premiere place. Un rabais ne rachete pas 3 etoiles. */
      if (it.rating != null && it.rating < 3.5) {
        it.score = Math.round(it.score * (it.rating < 3 ? 0.65 : 0.8));
      }

      it.why = (budget != null && it.price != null)
        ? Math.round((it.price / budget) * 100) + ' % du budget'
        : '';
    });

    kept.sort((a, b) => b.score - a.score);

    return {
      items: kept,
      mode: w,
      median: median(prices),
      cheapest: prices.length ? lo : null
    };
  }

  /* ---------- comment afficher la note, selon sa nature ----------
     Amazon note le produit, eBay note le vendeur, Marketplace ne note rien.
     Les melanger sans le dire serait trompeur. */
  function ratingLabel(it) {
    if (it.ratingKind === 'seller' && it.sellerPct != null) {
      return {
        kind: 'seller',
        text: 'vendeur ' + String(it.sellerPct).replace('.', ',') + ' %',
        sub: it.reviews ? it.reviews.toLocaleString('fr-CA') + ' ventes' : ''
      };
    }
    if (it.rating != null) {
      return {
        kind: 'product',
        text: '★ ' + it.rating.toFixed(1),
        sub: it.reviews ? it.reviews.toLocaleString('fr-CA') + ' avis' : ''
      };
    }
    /* Le site ne publie aucune note sur ses pages de resultats (Marketplace) :
       inutile de repeter "non noté" sur chaque ligne, l'en-tete le dit deja. */
    const meta = SITES_META[it.siteId];
    if (meta && meta.rates === 'rien') return null;

    /* Ici une note etait attendue mais n'a pas ete lue : ca, il faut le dire. */
    return { kind: 'none', text: 'note vendeur indisponible', sub: '' };
  }

  return { rank, weights, qualityOf, ratingLabel, merge, norm, median, SITES_META,
           STOPS, LAST, stopIndex, setupSlider,
           MIN_STOPS, MIN_LAST, minIndex, setupRange, paintRange, clampBounds };
})();

/* utilisable aussi bien dans le popup que dans la page */
if (typeof module !== 'undefined' && module.exports) module.exports = RFPRank;
