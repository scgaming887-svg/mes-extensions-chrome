/* ============================================================
   FocusBlock - page affichee a la place du site bloque
   ============================================================ */

const params = new URLSearchParams(location.search);
const site = params.get('site') || '';
const until = Number(params.get('until')) || 0;

const QUOTES = [
  'La prochaine notification peut attendre.',
  'Ce que tu allais faire a la place compte plus.',
  'Cinq minutes ici en prennent toujours vingt.',
  'Le temps bloqué est du temps gagné ailleurs.',
  'Ferme cet onglet, ouvre autre chose.'
];

document.getElementById('site').textContent = site ? ('« ' + site + ' »') : '';
document.getElementById('quote').textContent = QUOTES[Math.floor(Math.random() * QUOTES.length)];

const back = document.getElementById('back');
back.addEventListener('click', e => {
  e.preventDefault();
  if (back.classList.contains('ready')) {
    location.href = site ? ('https://' + site) : 'about:blank';
  } else if (history.length > 1) {
    history.back();
  } else {
    location.href = 'https://www.google.com';
  }
});

function tick() {
  const countdown = document.getElementById('countdown');
  const untilEl = document.getElementById('until');
  const title = document.getElementById('title');

  if (!until) { countdown.textContent = ''; untilEl.textContent = ''; return; }

  const remain = until - Date.now();
  if (remain <= 0) {
    title.textContent = 'Débloqué';
    countdown.textContent = '✅';
    untilEl.textContent = '';
    back.textContent = '→ Continuer vers ' + site;
    back.classList.add('ready');
    clearInterval(timer);
    return;
  }

  countdown.textContent = FBCommon.formatDuration(remain);
  untilEl.textContent = 'jusqu\'à ' + FBCommon.formatClock(until);
}

tick();
const timer = setInterval(tick, 1000);
