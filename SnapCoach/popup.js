/* SnapCoach - reglages. Tout est enregistre a la volee : pas de bouton
   « valider » a oublier de cliquer. */

const DEFAUTS = { actif: true, cle: '', modele: 'claude-opus-5', ton: '' };

const $ = i => document.getElementById(i);
const note = (txt, err) => {
  const n = $('note');
  n.textContent = txt || '';
  n.className = 'note' + (err ? ' err' : '');
};

function etatCle(cle) {
  const b = $('etat-cle');
  const ok = !!(cle && cle.trim());
  b.textContent = ok ? 'connecté' : 'hors ligne';
  b.className = 'badge' + (ok ? ' on' : '');
}

chrome.storage.local.get(DEFAUTS, cfg => {
  $('actif').checked = cfg.actif !== false;
  $('cle').value = cfg.cle || '';
  $('modele').value = cfg.modele || 'claude-opus-5';
  $('ton').value = cfg.ton || '';
  etatCle(cfg.cle);
});

$('actif').addEventListener('change', e => {
  chrome.storage.local.set({ actif: e.target.checked });
  note(e.target.checked ? 'Panneau activé — recharge Snapchat.' : 'Panneau masqué — recharge Snapchat.');
});

$('cle').addEventListener('input', e => {
  const v = e.target.value.trim();
  chrome.storage.local.set({ cle: v });
  etatCle(v);
  if (!v) { note('Clé retirée. Analyse locale uniquement.'); return; }
  /* Une cle Anthropic commence par sk-ant- : le dire tout de suite evite
     de decouvrir la faute de frappe au moment d'une analyse. */
  if (v.indexOf('sk-ant-') !== 0) note('Cette clé ne ressemble pas à une clé Anthropic (sk-ant-…).', true);
  else note('Clé enregistrée.');
});

$('modele').addEventListener('change', e => {
  chrome.storage.local.set({ modele: e.target.value });
  note('Modèle enregistré.');
});

$('ton').addEventListener('change', e => {
  chrome.storage.local.set({ ton: e.target.value });
  note('Ton enregistré.');
});

$('analyser').addEventListener('click', () => {
  chrome.tabs.query({ url: '*://web.snapchat.com/*' }, onglets => {
    if (!onglets.length) {
      note('Aucun onglet Snapchat ouvert. Va sur web.snapchat.com.', true);
      return;
    }
    chrome.tabs.update(onglets[0].id, { active: true });
    chrome.tabs.sendMessage(onglets[0].id, { type: 'analyser' }, () => {
      if (chrome.runtime.lastError) note('Recharge la page Snapchat, puis réessaie.', true);
      else window.close();
    });
  });
});
