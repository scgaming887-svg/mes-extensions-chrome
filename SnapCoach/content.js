/* ============================================================
   SnapCoach - lecture de la conversation et panneau lateral
   Snapchat web ne publie aucune structure stable : les classes sont
   generees et changent a chaque deploiement. On s'accroche donc a ce
   qui ne bouge pas : le role ARIA des lignes de discussion, et la
   position horizontale des bulles (les siennes a gauche, les tiennes
   a droite). Si rien ne sort, l'utilisateur colle la conversation.
   ============================================================ */

const CLES = { actif: true, cle: '', modele: 'claude-opus-5', ton: '' };
let panneau = null, corpsPanneau = null, dernierTexte = '';

/* ============================================================
   Lecture de la page
   ============================================================ */

/* Une bulle de message : du texte, et un cote. Le cote se lit a la
   position du bloc dans la largeur de la liste, pas a une classe. */
function bulles() {
  const zone = document.querySelector('[aria-live], [role="log"], main') || document.body;
  const cands = Array.from(zone.querySelectorAll('[role="row"], [role="listitem"], li, div'));

  const large = zone.getBoundingClientRect();
  if (!large.width) return [];
  const milieu = large.left + large.width / 2;

  const vus = new Set();
  const out = [];

  cands.forEach(n => {
    /* on ne garde que les blocs qui portent du texte directement,
       sinon chaque conteneur parent compterait une fois de plus */
    const propre = Array.from(n.childNodes)
      .filter(c => c.nodeType === 3)
      .map(c => c.textContent.trim())
      .join(' ').trim();
    const texte = propre || (n.children.length === 0 ? (n.textContent || '').trim() : '');
    if (!texte || texte.length < 1 || texte.length > 2000) return;

    const r = n.getBoundingClientRect();
    if (!r.width || r.width > large.width * 0.95) return;

    const cle = texte + '@' + Math.round(r.top);
    if (vus.has(cle)) return;
    vus.add(cle);

    const centre = r.left + r.width / 2;
    out.push({
      de: centre > milieu ? 'moi' : 'elle',
      texte,
      y: r.top + window.scrollY,
      t: 0
    });
  });

  out.sort((a, b) => a.y - b.y);

  /* Faute d'horodatage fiable dans le DOM, on espace les messages d'une
     minute chacun : les delais absolus sont alors faux, mais l'ordre et
     l'alternance restent justes, et c'est ce qui porte l'analyse. */
  const base = Date.now() - out.length * 60000;
  out.forEach((m, i) => { m.t = base + i * 60000; delete m.y; });

  return out;
}

function texteConversation(msgs) {
  return msgs.map(m => (m.de === 'moi' ? 'Moi : ' : 'Elle : ') + m.texte).join('\n');
}

/* ============================================================
   Panneau
   ============================================================ */
function el(tag, cls, txt) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (txt != null) n.textContent = txt;
  return n;
}

function construire() {
  if (panneau) return;

  panneau = el('div', 'snapcoach');
  const tete = el('div', 'sc-tete');
  tete.append(el('span', 'sc-logo', '💬'), el('span', 'sc-titre', 'SnapCoach'));

  const replier = el('button', 'sc-x', '—');
  replier.title = 'Replier';
  replier.addEventListener('click', () => panneau.classList.toggle('sc-replie'));
  tete.appendChild(replier);
  panneau.appendChild(tete);

  corpsPanneau = el('div', 'sc-corps');
  panneau.appendChild(corpsPanneau);

  const pied = el('div', 'sc-pied');
  const bouton = el('button', 'sc-go', 'Analyser la conversation');
  bouton.addEventListener('click', () => analyser());
  pied.appendChild(bouton);
  panneau.appendChild(pied);

  document.body.appendChild(panneau);
}

function jauge(score) {
  const box = el('div', 'sc-jauge');
  if (score == null) {
    box.appendChild(el('div', 'sc-score sc-gris', '—'));
    return box;
  }
  const teinte = score >= 72 ? 'sc-vert' : score >= 55 ? 'sc-jaune' : score >= 38 ? 'sc-orange' : 'sc-rouge';
  box.appendChild(el('div', 'sc-score ' + teinte, String(score)));
  const barre = el('div', 'sc-barre');
  const plein = el('div', 'sc-plein ' + teinte);
  plein.style.width = score + '%';
  barre.appendChild(plein);
  box.appendChild(barre);
  box.appendChild(el('div', 'sc-souslabel', 'niveau d\'intérêt'));
  return box;
}

function section(titre, cls) {
  const s = el('div', 'sc-sec ' + (cls || ''));
  s.appendChild(el('h4', null, titre));
  return s;
}

function liste(items, cls) {
  const ul = el('ul', cls || null);
  items.forEach(t => ul.appendChild(el('li', null, t)));
  return ul;
}

function copiable(texte) {
  const b = el('button', 'sc-copie', 'copier');
  b.addEventListener('click', () => {
    navigator.clipboard.writeText(texte).then(() => {
      b.textContent = 'copié ✓';
      setTimeout(() => { b.textContent = 'copier'; }, 1600);
    }).catch(() => { b.textContent = 'échec'; });
  });
  return b;
}

/* ============================================================
   Rendu
   ============================================================ */
function afficher(local, avis, etat) {
  corpsPanneau.textContent = '';

  if (etat) corpsPanneau.appendChild(el('div', 'sc-etat', etat));

  const score = avis ? avis.interet : (local ? local.interet.score : null);
  corpsPanneau.appendChild(jauge(score));

  const resume = avis ? avis.lecture : (local ? local.interet.resume : '');
  if (resume) corpsPanneau.appendChild(el('p', 'sc-resume', resume));

  /* --- signaux --- */
  const sig = avis ? avis.signaux
                   : (local ? local.interet.pour.concat(local.interet.contre) : []);
  if (sig.length) {
    const s = section('Ce que montre la conversation');
    s.appendChild(liste(sig, 'sc-signaux'));
    corpsPanneau.appendChild(s);
  }

  /* --- reponses --- */
  const rep = avis ? avis.reponses : null;
  if (rep && rep.length) {
    const s = section('Réponses possibles');
    rep.forEach(r => {
      const c = el('div', 'sc-rep');
      const haut = el('div', 'sc-rep-haut');
      haut.appendChild(el('div', 'sc-rep-txt', r.texte));
      haut.appendChild(copiable(r.texte));
      c.appendChild(haut);
      c.appendChild(el('div', 'sc-rep-pq', r.pourquoi));
      s.appendChild(c);
    });
    corpsPanneau.appendChild(s);
  } else if (local && local.pistes.length) {
    const s = section('Quoi répondre');
    local.pistes.forEach(p => {
      const c = el('div', 'sc-rep');
      c.appendChild(el('div', 'sc-rep-txt', p.quoi));
      c.appendChild(el('div', 'sc-rep-pq', p.pourquoi));
      s.appendChild(c);
    });
    corpsPanneau.appendChild(s);
  }

  /* --- alertes --- */
  const al = avis ? avis.alertes.map(a => ({ titre: a, quoi: '' }))
                  : (local ? local.alertes : []);
  if (al.length) {
    const s = section('À ne pas faire', 'sc-danger');
    al.forEach(a => {
      const c = el('div', 'sc-alerte');
      c.appendChild(el('div', 'sc-alerte-t', a.titre));
      if (a.quoi) c.appendChild(el('div', 'sc-alerte-q', a.quoi));
      s.appendChild(c);
    });
    corpsPanneau.appendChild(s);
  }

  /* --- moment --- */
  const mo = avis ? avis.moment : (local ? local.moment.titre + ' — ' + local.moment.quoi : '');
  if (mo) {
    const s = section('Le bon moment');
    s.appendChild(el('p', 'sc-moment', mo));
    corpsPanneau.appendChild(s);
  }
}

function coller() {
  corpsPanneau.textContent = '';
  corpsPanneau.appendChild(el('p', 'sc-vide',
    "Je n'arrive pas à lire cette conversation depuis la page. Colle-la ici : une ligne par message, en commençant par « Moi : » ou « Elle : »."));

  const zone = el('textarea', 'sc-zone');
  zone.placeholder = 'Moi : salut ça va ?\nElle : ça va et toi ?';
  corpsPanneau.appendChild(zone);

  const go = el('button', 'sc-go sc-go-inline', 'Analyser ce texte');
  go.addEventListener('click', () => {
    const msgs = zone.value.split('\n').map(l => {
      const m = l.match(/^\s*(moi|elle|lui|me|her|him)\s*[:\-]\s*(.+)$/i);
      if (!m) return null;
      return { de: /^(moi|me)$/i.test(m[1]) ? 'moi' : 'elle', texte: m[2].trim(), t: 0 };
    }).filter(Boolean);

    if (msgs.length < 2) {
      corpsPanneau.appendChild(el('p', 'sc-err', 'Il faut au moins deux messages, préfixés par « Moi : » ou « Elle : ».'));
      return;
    }
    const base = Date.now() - msgs.length * 60000;
    msgs.forEach((m, i) => { m.t = base + i * 60000; });
    lancer(msgs);
  });
  corpsPanneau.appendChild(go);
}

function lancer(msgs) {
  const local = SnapCoach.analyse(msgs, Date.now());
  const texte = texteConversation(msgs);

  chrome.storage.local.get(CLES, cfg => {
    if (!cfg.cle) {
      afficher(local, null, 'Analyse locale — ajoute une clé API dans les réglages pour un avis de Claude.');
      return;
    }

    afficher(local, null, 'Analyse locale affichée. Claude réfléchit…');
    corpsPanneau.classList.add('sc-attente');

    chrome.runtime.sendMessage({ type: 'coach', conversation: texte }, rep => {
      corpsPanneau.classList.remove('sc-attente');
      if (chrome.runtime.lastError) {
        afficher(local, null, 'Analyse locale — extension à recharger.');
        return;
      }
      if (!rep || rep.erreur) {
        afficher(local, null, 'Analyse locale — ' + ((rep && rep.message) || 'Claude indisponible.'));
        return;
      }
      afficher(local, rep.avis, 'Analysé par ' + (rep.modele || 'Claude') + '.');
    });
  });
}

function analyser() {
  construire();
  const msgs = bulles();
  if (msgs.length < 2) { coller(); return; }
  dernierTexte = texteConversation(msgs);
  lancer(msgs);
}

/* ============================================================
   Demarrage
   ============================================================ */
chrome.storage.local.get(CLES, cfg => {
  if (cfg.actif === false) return;
  construire();
  corpsPanneau.appendChild(el('p', 'sc-vide',
    'Ouvre une conversation, puis clique sur « Analyser la conversation ».'));
});

chrome.runtime.onMessage.addListener(msg => {
  if (msg && msg.type === 'analyser') analyser();
});
