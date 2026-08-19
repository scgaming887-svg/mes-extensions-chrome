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
  meals: 0
};

const ANIMALS = ['🐱', '🐶', '🦊', '🐧', '🐹', '🐰', '🐼', '🐸', '🐢', '🦄', '🐉', '🐥',
                 '🐨', '🦖', '🐙', '🦉', '🐝', '🦋'];

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

function fillForm() {
  document.getElementById('enabled').checked = cfg.enabled;
  document.getElementById('preview').textContent = cfg.animal;
  document.getElementById('petName').value = cfg.petName;
  document.getElementById('size').value = cfg.size;
  document.getElementById('speed').value = cfg.speed;
  document.getElementById('follow').checked = cfg.follow;
  document.getElementById('chatty').checked = cfg.chatty;
  renderAnimals();
  refreshOutputs();
  renderMeals();
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
    chatty:  document.getElementById('chatty').checked
  };
  Object.assign(cfg, patch);
  chrome.storage.local.set(patch);
}

document.addEventListener('input', save);

/* ---------- actions envoyees a la page ---------- */
function flash(text) {
  const el = document.getElementById('msg');
  el.textContent = text;
  clearTimeout(flash.t);
  flash.t = setTimeout(() => { el.textContent = ''; }, 2200);
}

function send(action, okText) {
  if (tabId === null) { flash('Impossible sur cette page.'); return; }

  chrome.tabs.sendMessage(tabId, { action }, res => {
    if (chrome.runtime.lastError) {
      /* script absent ou orphelin (extension rechargee) : on le reinjecte */
      revive(action, okText);
      return;
    }
    if (!res || !res.ok) {
      flash(res && res.reason === 'off'
        ? 'Il est desactive sur ce site.'
        : 'Recharge la page (F5) puis reessaie.');
      return;
    }
    flash(okText);
  });
}

function revive(action, okText) {
  flash('Reconnexion...');
  if (!chrome.scripting) { flash('Recharge la page (F5).'); return; }

  chrome.scripting.insertCSS({ target: { tabId }, files: ['pet.css'] }, () => {
    void chrome.runtime.lastError;
    chrome.scripting.executeScript({ target: { tabId }, files: ['pet.js'] }, () => {
      if (chrome.runtime.lastError) { flash('Impossible sur cette page.'); return; }
      setTimeout(() => {
        chrome.tabs.sendMessage(tabId, { action }, res => {
          if (chrome.runtime.lastError || !res || !res.ok) flash('Recharge la page (F5) puis reessaie.');
          else flash(okText);
        });
      }, 350);
    });
  });
}

document.getElementById('do-feed').addEventListener('click', () => send('feed', 'Repas servi ! 🍖'));
document.getElementById('do-jump').addEventListener('click', () => send('jump', 'Hop ! ⬆️'));

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
});

/* ---------- demarrage ---------- */
chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
  const tab = tabs[0];
  try {
    host = new URL(tab.url).hostname;
    tabId = tab.id;
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
