/* ============================================================
   KeySound - ecoute des frappes dans la page
   Ce script ne lit JAMAIS ce que tu tapes. Il regarde le nom de la
   touche uniquement pour choisir entre cinq sons (normale, espace,
   entree, retour, modificateur), puis l'oublie. Rien n'est
   enregistre, rien n'est envoye.
   ============================================================ */

const DEFAUTS = {
  actif: true,
  ambiance: 'thock',
  volume: 0.5,
  variation: 0.12,
  espace: 1,              /* dose de reverberation, 1 = celle de l'ambiance */
  relache: true,          /* jouer aussi le son de remontee */
  motsDePasse: false,     /* rester muet dans les champs de mot de passe */
  sitesMuets: []
};

let cfg = Object.assign({}, DEFAUTS);
let ctx = null, maitre = null;
let enCours = 0;                 /* voix simultanees, pour ne pas saturer */
const MAX_VOIX = 16;
const enfoncees = new Set();     /* evite les repetitions quand on garde une touche */

/* Le contexte audio ne peut demarrer qu'apres un geste de
   l'utilisateur. Une frappe EST un geste : on le cree donc a la
   premiere touche, pas au chargement de la page. */
function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    maitre = ctx.createGain();
    maitre.gain.value = 1;
    maitre.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function muet() {
  if (!cfg.actif) return true;
  const hote = location.hostname.replace(/^www\./, '');
  return (cfg.sitesMuets || []).indexOf(hote) > -1;
}

/* Un champ de mot de passe peut rester silencieux : le rythme des
   frappes en dit deja trop pour qu'on le sonorise sans le demander. */
function champSensible(cible) {
  if (!cfg.motsDePasse) return false;
  if (!cible) return false;
  const t = (cible.type || '').toLowerCase();
  return t === 'password' ||
         (cible.getAttribute && /current-password|new-password/.test(cible.getAttribute('autocomplete') || ''));
}

function jouer(nomTouche, cible, relache) {
  if (muet() || champSensible(cible)) return;
  if (enCours >= MAX_VOIX) return;

  const c = audio();
  if (!c) return;

  const cat = KeySound.categorie(nomTouche);
  enCours++;
  const noeuds = KeySound.frapper(c, maitre, cfg.ambiance, cat, {
    variation: cfg.variation,
    volume: cfg.volume,
    espace: cfg.espace,
    relache: relache
  });
  /* On libere la place peu apres la fin du son. Retenir un emplacement
     bien plus longtemps que la duree reelle ferait sauter des notes a
     quelqu'un qui tape vite, surtout avec le son de remontee actif qui
     double le nombre de voix. */
  setTimeout(() => { enCours = Math.max(0, enCours - 1); }, 250);
  return noeuds;
}

document.addEventListener('keydown', e => {
  /* garder une touche enfoncee ne doit pas mitrailler */
  if (e.repeat) return;
  if (enfoncees.has(e.code || e.key)) return;
  enfoncees.add(e.code || e.key);
  jouer(e.key, e.target, false);
}, true);

document.addEventListener('keyup', e => {
  enfoncees.delete(e.code || e.key);
  if (cfg.relache) jouer(e.key, e.target, true);
}, true);

/* si la fenetre perd le focus, on oublie les touches restees « enfoncees » */
window.addEventListener('blur', () => enfoncees.clear());

/* ============================================================
   Reglages
   ============================================================ */
chrome.storage.local.get(DEFAUTS, c => { cfg = Object.assign({}, DEFAUTS, c); });

chrome.storage.onChanged.addListener(ch => {
  Object.keys(ch).forEach(k => {
    if (k in DEFAUTS) cfg[k] = ch[k].newValue;
  });
});

/* L'apercu est joue par le popup lui-meme, qui charge la meme fabrique
   de sons : pas besoin qu'un onglet compatible soit ouvert pour
   ecouter les ambiances avant de choisir. */
