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

  return { rank, weights, qualityOf, norm, median };
})();

/* utilisable aussi bien dans le popup que dans la page */
if (typeof module !== 'undefined' && module.exports) module.exports = RFPRank;
