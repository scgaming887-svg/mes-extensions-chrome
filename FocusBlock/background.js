/* ============================================================
   FocusBlock - service worker
   ------------------------------------------------------------
   Toute la logique de blocage vit ici, pas dans le popup : les
   regles declarativeNetRequest et les alarmes doivent survivre
   meme quand le popup est ferme (il l'est presque tout le temps).
   Le popup ne fait qu'envoyer des messages et lire le stockage.
   ============================================================ */

const PREFIX = 'unblock:';
const SWEEP = 'focusblock-sweep';

/* adresse -> regle declarativeNetRequest + alarme de deblocage */
async function addBlock(domain, label, durationMs) {
  const data = await chrome.storage.local.get({ blocks: {}, nextRuleId: 1 });
  const blocks = data.blocks;
  const existing = blocks[domain];
  const ruleId = existing ? existing.ruleId : data.nextRuleId;
  const nextRuleId = existing ? data.nextRuleId : data.nextRuleId + 1;

  const now = Date.now();
  /* si le site est deja bloque, on prolonge a partir de MAINTENANT plutot
     que d'additionner : re-cliquer "1 h" doit donner "1 h a partir de
     maintenant", pas rallonger une fin de blocage deja entamee de facon
     imprevisible */
  const until = now + durationMs;

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [ruleId],
    addRules: [{
      id: ruleId,
      priority: 1,
      action: {
        type: 'redirect',
        redirect: { extensionPath: '/blocked.html?site=' + encodeURIComponent(domain) + '&until=' + until }
      },
      condition: {
        /* "||domaine^" : la boutique ET tous ses sous-domaines, quel que
           soit le protocole - la syntaxe standard des bloqueurs */
        urlFilter: '||' + domain + '^',
        resourceTypes: ['main_frame', 'sub_frame']
      }
    }]
  });

  blocks[domain] = { until, label: label || domain, ruleId, startedAt: now, duration: durationMs };
  await chrome.storage.local.set({ blocks, nextRuleId });
  await chrome.alarms.create(PREFIX + domain, { when: until });
}

async function removeBlock(domain) {
  const data = await chrome.storage.local.get({ blocks: {} });
  const entry = data.blocks[domain];
  if (!entry) return;

  await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: [entry.ruleId] });
  delete data.blocks[domain];
  await chrome.storage.local.set({ blocks: data.blocks });
  await chrome.alarms.clear(PREFIX + domain);
}

/* filet de securite : une alarme peut rater son heure si l'ordinateur
   dormait, et un redemarrage du navigateur peut laisser une regle sans
   alarme en memoire. On repasse sur tout au demarrage et chaque minute. */
async function sweep() {
  const data = await chrome.storage.local.get({ blocks: {} });
  const now = Date.now();
  const perimes = Object.keys(data.blocks).filter(d => data.blocks[d].until <= now);
  for (const domain of perimes) await removeBlock(domain);
}

chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name.indexOf(PREFIX) === 0) removeBlock(alarm.name.slice(PREFIX.length));
  else if (alarm.name === SWEEP) sweep();
});

chrome.runtime.onInstalled.addListener(() => {
  sweep();
  chrome.alarms.create(SWEEP, { periodInMinutes: 1 });
});
chrome.runtime.onStartup.addListener(() => {
  sweep();
  chrome.alarms.create(SWEEP, { periodInMinutes: 1 });
});

/* ============================================================
   Messages depuis le popup
   ============================================================ */
chrome.runtime.onMessage.addListener((msg, sender, respond) => {
  (async () => {
    try {
      if (msg.action === 'addBlock') {
        await addBlock(msg.domain, msg.label, msg.durationMs);
        respond({ ok: true });
      } else if (msg.action === 'removeBlock') {
        await removeBlock(msg.domain);
        respond({ ok: true });
      } else if (msg.action === 'getBlocks') {
        await sweep();
        const data = await chrome.storage.local.get({ blocks: {} });
        respond({ ok: true, blocks: data.blocks });
      } else {
        respond({ ok: false, reason: 'unknown' });
      }
    } catch (e) {
      respond({ ok: false, reason: String(e && e.message || e) });
    }
  })();
  return true; /* reponse asynchrone */
});
