/* ============================================================
   FocusBlock - popup
   ============================================================ */

const state = {
  selectedSites: new Set(),   /* domaines (cle QUICK_SITES.domain) actives */
  durationMs: 30 * 60 * 1000, /* 30 min par defaut */
  activeDurationPreset: 1     /* index du preset "30 min" */
};

function send(msg) {
  return new Promise(resolve => chrome.runtime.sendMessage(msg, resolve));
}

function flash(text, isErr) {
  const el = document.getElementById('msg');
  el.textContent = text;
  el.className = 'msg' + (isErr ? ' err' : '');
  clearTimeout(flash.t);
  if (!isErr) flash.t = setTimeout(() => { el.textContent = ''; }, 4000);
}

/* ============================================================
   Choix rapides de sites
   ============================================================ */
function renderSites() {
  const box = document.getElementById('sites');
  box.textContent = '';
  FBCommon.QUICK_SITES.forEach(site => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'site' + (state.selectedSites.has(site.domain) ? ' is-on' : '');

    const ic = document.createElement('span');
    ic.className = 'ic';
    ic.textContent = site.icon;
    b.append(ic, document.createTextNode(site.label));

    b.addEventListener('click', () => {
      if (state.selectedSites.has(site.domain)) state.selectedSites.delete(site.domain);
      else state.selectedSites.add(site.domain);
      renderSites();
    });
    box.appendChild(b);
  });
}

/* ============================================================
   Duree
   ============================================================ */
function renderDurations() {
  const box = document.getElementById('durations');
  box.textContent = '';
  FBCommon.DURATION_PRESETS.forEach((preset, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'dur' + (state.activeDurationPreset === i ? ' is-on' : '');
    b.textContent = preset.label;
    b.addEventListener('click', () => {
      const minutes = preset.minutesFn ? preset.minutesFn() : preset.minutes;
      state.durationMs = minutes * 60 * 1000;
      state.activeDurationPreset = i;
      document.getElementById('durationValue').value = '';
      renderDurations();
    });
    box.appendChild(b);
  });
}

const UNIT_MS = { minutes: 60 * 1000, heures: 3600 * 1000, jours: 86400 * 1000 };

function readCustomDuration() {
  const v = Number(document.getElementById('durationValue').value);
  const unit = document.getElementById('durationUnit').value;
  if (!v || v <= 0) return;
  state.durationMs = v * UNIT_MS[unit];
  state.activeDurationPreset = -1;
  renderDurations();
}

document.getElementById('durationValue').addEventListener('input', readCustomDuration);
document.getElementById('durationUnit').addEventListener('change', readCustomDuration);

/* ============================================================
   Liste des blocages actifs
   ============================================================ */
const confirming = new Set(); /* domaines dont le bouton "retirer" attend confirmation */

async function renderActive() {
  const res = await send({ action: 'getBlocks' });
  const blocks = (res && res.blocks) || {};
  const now = Date.now();
  const domains = Object.keys(blocks).filter(d => blocks[d].until > now)
    .sort((a, b) => blocks[a].until - blocks[b].until);

  const box = document.getElementById('active');
  box.textContent = '';

  if (!domains.length) {
    const e = document.createElement('div');
    e.className = 'empty-active';
    e.textContent = 'Rien de bloqué pour l\'instant.';
    box.appendChild(e);
    return;
  }

  domains.forEach(domain => {
    const entry = blocks[domain];
    const row = document.createElement('div');
    row.className = 'block-row';

    const dot = document.createElement('span');
    dot.className = 'dot';

    const info = document.createElement('div');
    info.className = 'info';
    const name = document.createElement('div');
    name.className = 'name';
    name.textContent = entry.label || domain;
    const left = document.createElement('div');
    left.className = 'left';
    left.textContent = FBCommon.formatDuration(entry.until - now) + ' restant · jusqu\'à ' + FBCommon.formatClock(entry.until);
    info.append(name, left);

    const rm = document.createElement('button');
    rm.type = 'button';
    rm.className = 'rm' + (confirming.has(domain) ? ' confirm' : '');
    rm.textContent = confirming.has(domain) ? 'Sûr ? Confirme' : 'Retirer';
    rm.addEventListener('click', async () => {
      if (confirming.has(domain)) {
        confirming.delete(domain);
        await send({ action: 'removeBlock', domain });
        renderActive();
      } else {
        confirming.add(domain);
        renderActive();
        setTimeout(() => { confirming.delete(domain); renderActive(); }, 4000);
      }
    });

    row.append(dot, info, rm);
    box.appendChild(row);
  });
}

/* ============================================================
   Lancer le blocage
   ============================================================ */
document.getElementById('go').addEventListener('click', async () => {
  readCustomDuration();

  const domains = new Set();
  state.selectedSites.forEach(d => {
    domains.add(d);
    const meta = FBCommon.QUICK_SITES.find(s => s.domain === d);
    (meta && meta.extra || []).forEach(x => domains.add(x));
  });
  FBCommon.parseDomainList(document.getElementById('custom').value).forEach(d => domains.add(d));

  if (!domains.size) { flash('Choisis au moins un site, ou tape une adresse.', true); return; }
  if (!state.durationMs || state.durationMs <= 0) { flash('Choisis une durée.', true); return; }

  const btn = document.getElementById('go');
  btn.disabled = true;

  for (const domain of domains) {
    await send({ action: 'addBlock', domain, label: FBCommon.labelFor(domain), durationMs: state.durationMs });
  }

  btn.disabled = false;
  state.selectedSites.clear();
  document.getElementById('custom').value = '';
  renderSites();

  const until = Date.now() + state.durationMs;
  const n = domains.size;
  flash((n > 1 ? n + ' sites bloqués' : '1 site bloqué') + ' jusqu\'à ' + FBCommon.formatClock(until) + '.');
  renderActive();
});

document.getElementById('custom').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('go').click();
});

/* ============================================================
   Demarrage
   ============================================================ */
renderSites();
renderDurations();
renderActive();
setInterval(renderActive, 1000);
