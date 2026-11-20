/* ============================================================
   FocusBlock - donnees et utilitaires partages par le popup
   et par la page de blocage.
   ============================================================ */
var FBCommon = (function () {

  /* choix rapides proposes dans le popup */
  const QUICK_SITES = [
    { domain: 'youtube.com',    label: 'YouTube',    icon: '📺' },
    { domain: 'tiktok.com',     label: 'TikTok',     icon: '🎵' },
    { domain: 'snapchat.com',   label: 'Snapchat',   icon: '👻' },
    { domain: 'instagram.com',  label: 'Instagram',  icon: '📷' },
    { domain: 'facebook.com',   label: 'Facebook',   icon: '📘' },
    { domain: 'x.com',          label: 'X / Twitter',icon: '🐦', extra: ['twitter.com'] },
    { domain: 'reddit.com',     label: 'Reddit',     icon: '👽' },
    { domain: 'netflix.com',    label: 'Netflix',    icon: '🎬' }
  ];

  /* presets de duree : valeur fixe en minutes, ou fonction qui calcule
     les minutes au moment du clic (ex. "jusqu'a demain matin") */
  const DURATION_PRESETS = [
    { label: '15 min',  minutes: 15 },
    { label: '30 min',  minutes: 30 },
    { label: '1 h',     minutes: 60 },
    { label: '2 h',     minutes: 120 },
    { label: '4 h',     minutes: 240 },
    { label: 'Jusqu\'à demain 6 h', minutesFn: untilNextSixAM }
  ];

  /* minutes restantes jusqu'a la prochaine occurrence de 6 h du matin,
     heure locale - si on est deja apres 6 h aujourd'hui, c'est demain */
  function untilNextSixAM() {
    const now = new Date();
    const cible = new Date(now);
    cible.setHours(6, 0, 0, 0);
    if (cible.getTime() <= now.getTime()) cible.setDate(cible.getDate() + 1);
    return Math.round((cible.getTime() - now.getTime()) / 60000);
  }

  /* "youtube.com", "https://www.youtube.com/watch?v=xyz", "www.youtube.com"
     -> "youtube.com". Renvoie null si ce n'est pas une adresse plausible. */
  function normalizeDomain(input) {
    let s = (input || '').trim();
    if (!s) return null;
    if (!/^[a-z]+:\/\//i.test(s)) s = 'https://' + s;
    let host;
    try { host = new URL(s).hostname.toLowerCase(); } catch (e) { return null; }
    host = host.replace(/^www\./, '');
    /* au moins un point, pas d'espace, une extension plausible */
    if (!host || host.indexOf('.') === -1 || /\s/.test(host)) return null;
    return host;
  }

  /* un champ peut contenir plusieurs adresses separees par une virgule
     ou un espace : "youtube.com, tiktok.com" */
  function parseDomainList(input) {
    return (input || '')
      .split(/[,\s]+/)
      .map(normalizeDomain)
      .filter(Boolean);
  }

  /* ms -> "2 h 15" / "45 min" / "30 s", pour les comptes a rebours */
  function formatDuration(ms) {
    if (ms == null || ms < 0) ms = 0;
    const s = Math.ceil(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return h + ' h ' + String(m).padStart(2, '0');
    if (m > 0) return m + ' min ' + String(sec).padStart(2, '0') + ' s';
    return sec + ' s';
  }

  /* "14:05" en heure locale, pour dire a quelle heure ca se debloque */
  function formatClock(ts) {
    return new Date(ts).toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' });
  }

  /* nom lisible pour un domaine : celui d'un choix rapide s'il correspond,
     sinon le domaine lui-meme */
  function labelFor(domain) {
    const hit = QUICK_SITES.find(s => s.domain === domain || (s.extra || []).indexOf(domain) !== -1);
    return hit ? hit.label : domain;
  }

  return { QUICK_SITES, DURATION_PRESETS, untilNextSixAM,
           normalizeDomain, parseDomainList, formatDuration, formatClock, labelFor };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = FBCommon;
