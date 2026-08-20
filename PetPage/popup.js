/* ============================================================
   PetPage - interface de reglage
   ============================================================ */

const DEFAULTS = {
  enabled: true,
  animal: '🐱',
  petName: 'Mimi',
  size: 48,
  speed: 1,
  follow: true,
  chatty: true,
  disabledSites: [],
  meals: 0,
  petScores: { treats: 0, runner: 0, race: 0 },
  lastFed: 0,
  hungerSpeed: 'normal'
};

const GAMES = [
  { id: 'treats', icon: '🍬', name: 'Attrape les friandises' },
  { id: 'runner', icon: '🌵', name: 'Saute les obstacles' },
  { id: 'race',   icon: '🏁', name: 'La grande course' }
];

const ANIMALS = ['🐱', '🐶', '🦊', '🐧', '🐹', '🐰', '🐼', '🐸', '🐢', '🦄', '🐉', '🐥',
                 '🐨', '🦖', '🐙', '🦉', '🐝', '🦋'];


/* Memes seuils que dans pet.js : si tu changes l un, change l autre. */
const HUNGER_MS = { lent: 8 * 3600e3, normal: 3 * 3600e3, rapide: 25 * 60e3 };
const MOOD_TEXT = {
  ok:     { icon: '😊', text: 'Repu et content' },
  hungry: { icon: '🍽️', text: 'Un petit creux' },
  lying:  { icon: '😪', text: 'Affamé — il s’est allongé' },
  angry:  { icon: '😠', text: 'Fâché ! Nourris-le' }
};

function hungerNow() {
  const span = HUNGER_MS[cfg.hungerSpeed] || HUNGER_MS.normal;
  if (!cfg.lastFed) return 0.3;
  return Math.max(0, Math.min(1, (Date.now() - cfg.lastFed) / span));
}

const moodKey = h => h < 0.45 ? 'ok' : h < 0.7 ? 'hungry' : h < 0.9 ? 'lying' : 'angry';

function duree(ms) {
  const min = Math.round(ms / 60000);
  if (min < 1) return 'moins d’une minute';
  if (min < 60) return min + ' min';
  const h = Math.floor(min / 60), r = min % 60;
  return r ? h + ' h ' + r + ' min' : h + ' h';
}

function renderMood() {
  const h = hungerNow();
  const key = moodKey(h);
  const m = MOOD_TEXT[key];

  document.getElementById('mood-icon').textContent = m.icon;
  document.getElementById('mood-label').textContent = m.text;

  const fill = document.getElementById('gauge-fill');
  fill.style.width = Math.round(h * 100) + '%';
  fill.className = 'is-' + key;

  const span = HUNGER_MS[cfg.hungerSpeed] || HUNGER_MS.normal;
  const sub = document.getElementById('mood-sub');
  if (key === 'angry') sub.textContent = 'Il refuse les câlins tant qu’il n’a pas mangé.';
  else if (key === 'lying') sub.textContent = 'Il se fâchera dans ' + duree((0.9 - h) * span) + '.';
  else sub.textContent = 'Il s’allongera de faim dans ' + duree((0.7 - h) * span) + '.';
}

let cfg = Object.assign({}, DEFAULTS);
let host = '';
let tabId = null;

/* ---------- rendu ---------- */
function renderAnimals() {
  const box = document.getElementById('animals');
  box.innerHTML = '';
  ANIMALS.forEach(a => {
    const b = document.createElement('button');
    b.className = 'animal' + (a === cfg.animal ? ' is-active' : '');
    b.textContent = a;
    b.addEventListener('click', () => {
      cfg.animal = a;
      document.getElementById('preview').textContent = a;
      renderAnimals();
      chrome.storage.local.set({ animal: a });
    });
    box.appendChild(b);
  });
}

function renderGames() {
  const box = document.getElementById('games');
  box.innerHTML = '';
  GAMES.forEach(g => {
    const best = (cfg.petScores && cfg.petScores[g.id]) || 0;

    const b = document.createElement('button');
    b.className = 'game-btn';
    b.title = 'Lancer sur la page ouverte';

    const ic = document.createElement('span'); ic.className = 'gi'; ic.textContent = g.icon;
    const nm = document.createElement('span'); nm.className = 'gn'; nm.textContent = g.name;
    const bs = document.createElement('span'); bs.className = 'gb';
    if (best > 0) { bs.textContent = 'record '; const s = document.createElement('b'); s.textContent = best; bs.appendChild(s); }
    else bs.textContent = 'jamais joué';

    b.append(ic, nm, bs);
    b.addEventListener('click', () => launchGame(g));
    box.appendChild(b);
  });
}

/* lance le jeu dans l'onglet puis referme le popup pour laisser voir la page */
function launchGame(g) {
  send({ action: 'minigame', game: g.id }, 'C\'est parti !', () => setTimeout(window.close, 250));
}

function fillForm() {
  renderGames();
  document.getElementById('enabled').checked = cfg.enabled;
  document.getElementById('preview').textContent = cfg.animal;
  document.getElementById('petName').value = cfg.petName;
  document.getElementById('size').value = cfg.size;
  document.getElementById('speed').value = cfg.speed;
  document.getElementById('follow').checked = cfg.follow;
  document.getElementById('chatty').checked = cfg.chatty;
  document.getElementById('hungerSpeed').value = cfg.hungerSpeed || 'normal';
  renderAnimals();
  refreshOutputs();
  renderMeals();
  renderMood();
  renderSiteButton();
}

function refreshOutputs() {
  document.getElementById('size-o').textContent = document.getElementById('size').value + 'px';
  document.getElementById('speed-o').textContent = 'x' + Number(document.getElementById('speed').value).toFixed(1);
}

function renderMeals() {
  const n = cfg.meals || 0;
  document.getElementById('meals').textContent = '🍽️ ' + n + (n > 1 ? ' repas' : ' repas');
}

function renderSiteButton() {
  const btn = document.getElementById('toggle-site');
  const off = cfg.disabledSites.indexOf(host) !== -1;
  btn.textContent = off ? 'Reactiver sur ce site' : 'Desactiver sur ce site';
  btn.style.color = off ? 'var(--accent)' : '';
}

/* ---------- sauvegarde ---------- */
function save() {
  refreshOutputs();
  const patch = {
    enabled: document.getElementById('enabled').checked,
    petName: document.getElementById('petName').value || 'Mon pote',
    size:    Number(document.getElementById('size').value),
    speed:   Number(document.getElementById('speed').value),
    follow:  document.getElementById('follow').checked,
    chatty:  document.getElementById('chatty').checked,
    hungerSpeed: document.getElementById('hungerSpeed').value
  };
  Object.assign(cfg, patch);
  chrome.storage.local.set(patch);
  renderMood();
}

document.addEventListener('input', save);

/* ---------- actions envoyees a la page ---------- */
function flash(text) {
  const el = document.getElementById('msg');
  el.textContent = text;
  clearTimeout(flash.t);
  flash.t = setTimeout(() => { el.textContent = ''; }, 2200);
}

/* Une reponse sans "handled" vient d'une ancienne version du script :
   elle repond OK sans rien faire. On la traite comme un echec. */
function send(msg, okText, onOk, retried) {
  if (tabId === null) { flash('Impossible sur cette page.'); return; }

  chrome.tabs.sendMessage(tabId, msg, res => {
    if (chrome.runtime.lastError) {
      /* script absent ou orphelin (extension rechargee) : on le reinjecte */
      revive(msg, okText, onOk);
      return;
    }
    if (res && res.ok && !res.handled) {
      if (!retried) revive(msg, okText, onOk, true);
      else flash('Ancienne version sur la page : recharge-la (F5).');
      return;
    }
    if (!res || !res.ok) {
      if (res && res.reason === 'off') flash('Il est desactive sur ce site.');
      else if (res && res.reason === 'unknown') flash('Recharge la page (F5).');
      else flash('Recharge la page (F5) puis reessaie.');
      return;
    }
    flash(okText);
    if (onOk) onOk();
  });
}

function revive(msg, okText, onOk, stale) {
  flash(stale ? 'Mise a jour de la page...' : 'Reconnexion...');
  if (!chrome.scripting) { flash('Recharge la page (F5).'); return; }

  chrome.scripting.insertCSS({ target: { tabId }, files: ['pet.css'] }, () => {
    void chrome.runtime.lastError;
    chrome.scripting.executeScript({ target: { tabId }, files: ['pet.js'] }, () => {
      if (chrome.runtime.lastError) { flash('Impossible sur cette page.'); return; }
      setTimeout(() => send(msg, okText, onOk, true), 400);
    });
  });
}

document.getElementById('do-feed').addEventListener('click', () => send({ action: 'feed' }, 'Repas servi ! 🍖'));
document.getElementById('do-jump').addEventListener('click', () => send({ action: 'jump' }, 'Hop ! ⬆️'));

document.getElementById('toggle-site').addEventListener('click', () => {
  if (!host) return;
  const i = cfg.disabledSites.indexOf(host);
  if (i === -1) cfg.disabledSites.push(host);
  else cfg.disabledSites.splice(i, 1);
  renderSiteButton();
  chrome.storage.local.set({ disabledSites: cfg.disabledSites });
});

/* le compteur de repas bouge pendant que le popup est ouvert */
chrome.storage.onChanged.addListener(changes => {
  if (changes.meals) {
    cfg.meals = changes.meals.newValue;
    renderMeals();
  }
  if (changes.lastFed) {
    cfg.lastFed = changes.lastFed.newValue;
    renderMood();
  }
  if (changes.petScores) {
    cfg.petScores = changes.petScores.newValue;
    renderGames();
  }
});

/* la faim court avec l'horloge : on rafraichit tant que le popup est ouvert */
setInterval(renderMood, 5000);

/* ---------- demarrage ---------- */
chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
  const tab = tabs && tabs[0];
  /* l'id doit etre pris hors du try : sans lui, plus aucun bouton ne marche */
  if (tab) tabId = tab.id;
  try {
    host = new URL(tab.url).hostname;
  } catch (e) {
    host = '';
  }
  document.getElementById('host').textContent = host || 'page systeme';

  chrome.storage.local.get(DEFAULTS, res => {
    cfg = Object.assign({}, DEFAULTS, res);
    cfg.disabledSites = cfg.disabledSites || [];
    fillForm();
  });
});
