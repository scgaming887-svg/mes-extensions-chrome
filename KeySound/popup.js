/* KeySound - reglages et ecoute des ambiances.
   Le popup joue les apercus lui-meme : il charge la meme fabrique de
   sons que la page, donc ce qu'on entend ici est exactement ce qu'on
   entendra en tapant. */

const DEFAUTS = {
  actif: true,
  ambiance: 'thock',
  volume: 0.5,
  variation: 0.12,
  espace: 1,
  relache: true,
  motsDePasse: false,
  sitesMuets: []
};

const $ = i => document.getElementById(i);
let cfg = Object.assign({}, DEFAUTS);
let hoteCourant = '';

let ctx = null, maitre = null;
function audio() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    maitre = ctx.createGain();
    maitre.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

/* Un apercu joue une petite phrase plutot qu'une seule touche : c'est
   l'enchainement qui permet de juger un son de clavier, pas un clic isole. */
function ecouter(id) {
  const c = audio();
  const phrase = ['a', 'z', 'e', ' ', 'r', 'Enter'];
  phrase.forEach((t, i) => {
    setTimeout(() => {
      KeySound.frapper(c, maitre, id, KeySound.categorie(t),
                       { variation: cfg.variation, volume: cfg.volume, espace: cfg.espace });
      if (cfg.relache) {
        setTimeout(() => KeySound.frapper(c, maitre, id, KeySound.categorie(t),
                                          { variation: cfg.variation, volume: cfg.volume,
                                            espace: cfg.espace, relache: true }), 55);
      }
    }, i * 115);
  });
}

const note = (txt, err) => {
  const n = $('note');
  n.textContent = txt || '';
  n.className = 'note' + (err ? ' err' : '');
};

/* ============================================================
   La grille des ambiances
   ============================================================ */
function grille() {
  const g = $('grille');
  g.textContent = '';

  KeySound.liste().forEach(id => {
    const a = KeySound.AMBIANCES[id];
    const carte = document.createElement('button');
    carte.className = 'carte' + (id === cfg.ambiance ? ' choisie' : '');
    carte.dataset.id = id;

    const haut = document.createElement('div');
    haut.className = 'carte-haut';
    const em = document.createElement('span');
    em.className = 'em';
    em.textContent = a.emoji;
    const nom = document.createElement('span');
    nom.className = 'nom';
    nom.textContent = a.nom;
    haut.append(em, nom);

    const desc = document.createElement('p');
    desc.className = 'desc';
    desc.textContent = a.description;

    carte.append(haut, desc);
    carte.addEventListener('click', () => {
      cfg.ambiance = id;
      chrome.storage.local.set({ ambiance: id });
      [...g.children].forEach(c => c.classList.remove('choisie'));
      carte.classList.add('choisie');
      ecouter(id);
      note(a.nom + ' — appliqué.');
    });

    g.appendChild(carte);
  });
}

/* ============================================================
   Chargement
   ============================================================ */
chrome.storage.local.get(DEFAUTS, c => {
  cfg = Object.assign({}, DEFAUTS, c);

  $('actif').checked = cfg.actif !== false;
  $('volume').value = Math.round(cfg.volume * 100);
  $('v-volume').textContent = Math.round(cfg.volume * 100) + ' %';
  $('variation').value = Math.round(cfg.variation * 100);
  $('v-variation').textContent = Math.round(cfg.variation * 100) + ' %';
  $('espace').value = Math.round(cfg.espace * 100);
  $('v-espace').textContent = Math.round(cfg.espace * 100) + ' %';
  $('relache').checked = cfg.relache !== false;
  $('motsDePasse').checked = !!cfg.motsDePasse;

  grille();
  etatSite();
});

/* ============================================================
   Branchements
   ============================================================ */
$('actif').addEventListener('change', e => {
  cfg.actif = e.target.checked;
  chrome.storage.local.set({ actif: cfg.actif });
  note(cfg.actif ? 'Son activé.' : 'Son coupé partout.');
});

$('volume').addEventListener('input', e => {
  cfg.volume = Number(e.target.value) / 100;
  $('v-volume').textContent = e.target.value + ' %';
  chrome.storage.local.set({ volume: cfg.volume });
});
$('volume').addEventListener('change', () => ecouter(cfg.ambiance));

$('variation').addEventListener('input', e => {
  cfg.variation = Number(e.target.value) / 100;
  $('v-variation').textContent = e.target.value + ' %';
  chrome.storage.local.set({ variation: cfg.variation });
});
$('variation').addEventListener('change', () => ecouter(cfg.ambiance));

$('espace').addEventListener('input', e => {
  cfg.espace = Number(e.target.value) / 100;
  $('v-espace').textContent = e.target.value + ' %';
  chrome.storage.local.set({ espace: cfg.espace });
});
$('espace').addEventListener('change', () => ecouter(cfg.ambiance));

$('relache').addEventListener('change', e => {
  cfg.relache = e.target.checked;
  chrome.storage.local.set({ relache: cfg.relache });
  ecouter(cfg.ambiance);
});

$('motsDePasse').addEventListener('change', e => {
  cfg.motsDePasse = e.target.checked;
  chrome.storage.local.set({ motsDePasse: cfg.motsDePasse });
  note(cfg.motsDePasse ? 'Muet dans les champs de mot de passe.' : 'Son actif partout.');
});

/* ============================================================
   Couper sur un site precis
   ============================================================ */
function etatSite() {
  chrome.tabs.query({ active: true, currentWindow: true }, ongl => {
    const url = ongl[0] && ongl[0].url;
    if (!url || !/^https?:/.test(url)) {
      $('muet-site').disabled = true;
      $('etat-site').textContent = 'Aucune page web active.';
      return;
    }
    hoteCourant = new URL(url).hostname.replace(/^www\./, '');
    const coupe = (cfg.sitesMuets || []).indexOf(hoteCourant) > -1;
    $('muet-site').disabled = false;
    $('muet-site').textContent = coupe ? 'Réactiver sur ' + hoteCourant : 'Couper sur ' + hoteCourant;
    $('etat-site').textContent = coupe ? 'Muet ici.' : '';
  });
}

$('muet-site').addEventListener('click', () => {
  if (!hoteCourant) return;
  const l = (cfg.sitesMuets || []).slice();
  const i = l.indexOf(hoteCourant);
  if (i > -1) l.splice(i, 1); else l.push(hoteCourant);
  cfg.sitesMuets = l;
  chrome.storage.local.set({ sitesMuets: l }, etatSite);
});
