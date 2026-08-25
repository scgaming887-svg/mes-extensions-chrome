/* ============================================================
   SnapCoach - service worker
   L'appel a l'API Claude se fait ici et nulle part ailleurs : la cle
   n'a ainsi jamais besoin d'exister dans la page Snapchat elle-meme.
   Sans cle configuree, ce fichier ne sert a rien et l'extension
   fonctionne entierement hors ligne avec coach.js.
   ============================================================ */

const API = 'https://api.anthropic.com/v1/messages';
const VERSION_API = '2023-06-01';

/* Ce que Claude doit renvoyer, impose par schema : sans cela il faudrait
   deviner la structure de sa reponse a coups d'expressions regulieres. */
const SCHEMA = {
  type: 'object',
  properties: {
    interet: { type: 'integer', minimum: 0, maximum: 100,
               description: "A quel point l'autre personne semble interessee, de 0 a 100." },
    lecture: { type: 'string',
               description: "Deux phrases maximum : ce que dit vraiment cette conversation." },
    signaux: { type: 'array', items: { type: 'string' }, maxItems: 5,
               description: "Faits precis tires des messages qui justifient le score, cites brievement." },
    alertes: { type: 'array', items: { type: 'string' }, maxItems: 4,
               description: "Erreurs a eviter maintenant. Vide s'il n'y en a pas : ne pas inventer." },
    moment: { type: 'string',
              description: "Quand repondre, et pourquoi ce moment-la." },
    reponses: {
      type: 'array', maxItems: 3,
      items: {
        type: 'object',
        properties: {
          texte: { type: 'string', description: "Le message a envoyer, tel quel." },
          pourquoi: { type: 'string', description: "Une phrase : ce que ce message cherche a produire." }
        },
        required: ['texte', 'pourquoi'],
        additionalProperties: false
      }
    }
  },
  required: ['interet', 'lecture', 'signaux', 'alertes', 'moment', 'reponses'],
  additionalProperties: false
};

const CONSIGNE = [
  "Tu aides quelqu'un a mener une conversation sur Snapchat avec une personne qui l'interesse.",
  "",
  "Tu recois la conversation telle qu'elle s'est deroulee. « moi » est la personne que tu conseilles,",
  "« elle » est l'autre personne, quel que soit son genre.",
  "",
  "Ce qu'on attend de toi :",
  "- Sois honnete sur le niveau d'interet, meme quand la reponse ne fait pas plaisir. Dire a quelqu'un",
  "  que l'autre n'accroche pas lui rend service : il arretera de perdre son temps. Un score gonfle ne",
  "  vaut rien.",
  "- Appuie chaque signal sur un fait present dans les messages : un delai, une question posee, une",
  "  longueur de reponse. Pas d'intuition non justifiee.",
  "- Les reponses que tu proposes doivent sonner comme quelqu'un de vrai : courtes, dans le registre",
  "  deja utilise dans la conversation, sans formule toute faite ni vocabulaire de seduction applique.",
  "  Si la conversation est en argot ou en abrege, suis-la.",
  "- Ne propose jamais de tactique visant a faire pression, culpabiliser, rendre jaloux, ou feindre",
  "  l'indifference pour manipuler. Ca marche mal et ce n'est pas ce qu'on te demande. Conseille",
  "  l'interet sincere, la clarte, et savoir s'arreter quand c'est non.",
  "- Si l'autre personne montre qu'elle n'est pas interessee ou demande qu'on la laisse tranquille,",
  "  dis-le clairement et conseille d'arreter. C'est la seule bonne reponse dans ce cas.",
  "",
  "Reponds en francais, en tutoyant la personne que tu conseilles."
].join('\n');

/* Chaque modele a ses regles : la reflexion adaptative et le reglage
   d'effort n'existent pas sur Haiku 4.5, qui refuse la requete si on les
   envoie. Le repli automatique n'est propose que sur Opus 5. */
function corps(modele, conversation, ton) {
  const body = {
    model: modele,
    max_tokens: 8000,
    system: CONSIGNE + (ton ? '\n\nTon souhaite pour les reponses proposees : ' + ton + '.' : ''),
    messages: [{ role: 'user', content: conversation }],
    output_config: { format: { type: 'json_schema', schema: SCHEMA } }
  };

  if (modele !== 'claude-haiku-4-5') {
    body.thinking = { type: 'adaptive' };
    body.output_config.effort = 'medium';
  }
  return body;
}

function entetes(cle, modele) {
  const h = {
    'content-type': 'application/json',
    'x-api-key': cle,
    'anthropic-version': VERSION_API,
    /* requis pour un appel emis depuis un contexte navigateur */
    'anthropic-dangerous-direct-browser-access': 'true'
  };
  if (modele === 'claude-opus-5') h['anthropic-beta'] = 'server-side-fallback-2026-07-01';
  return h;
}

async function demander(cle, modele, conversation, ton) {
  const body = corps(modele, conversation, ton);
  if (modele === 'claude-opus-5') body.fallbacks = 'default';

  let rep;
  try {
    rep = await fetch(API, { method: 'POST', headers: entetes(cle, modele), body: JSON.stringify(body) });
  } catch (e) {
    return { erreur: 'reseau', message: "Impossible de joindre l'API. Verifie ta connexion." };
  }

  if (!rep.ok) {
    let detail = '';
    try { detail = (await rep.json()).error.message; } catch (e) {}
    if (rep.status === 401) return { erreur: 'cle', message: "Cle API refusee. Verifie-la dans les reglages." };
    if (rep.status === 429) return { erreur: 'quota', message: "Trop de demandes d'un coup. Reessaie dans un instant." };
    if (rep.status === 400) return { erreur: 'requete', message: detail || "Requete refusee par l'API." };
    if (rep.status >= 500) return { erreur: 'serveur', message: "L'API est indisponible pour le moment." };
    return { erreur: 'http', message: 'Erreur ' + rep.status + (detail ? ' : ' + detail : '') };
  }

  const data = await rep.json();

  /* Une reponse peut revenir en 200 tout en ayant ete declinee : il faut
     lire stop_reason avant de toucher au contenu. On retombe alors sur
     l'analyse locale plutot que d'afficher une page vide. */
  if (data.stop_reason === 'refusal') {
    return { erreur: 'refus',
             message: "Claude n'a pas voulu traiter cette conversation. L'analyse locale reste affichee." };
  }

  const bloc = (data.content || []).find(b => b.type === 'text');
  if (!bloc) return { erreur: 'vide', message: "Reponse vide de l'API." };

  let json;
  try { json = JSON.parse(bloc.text); }
  catch (e) { return { erreur: 'format', message: "Reponse illisible de l'API." }; }

  return {
    ok: true,
    avis: json,
    cout: data.usage || null,
    modele: data.model || modele
  };
}

chrome.runtime.onMessage.addListener((msg, envoi, repondre) => {
  if (msg && msg.type === 'coach') {
    chrome.storage.local.get({ cle: '', modele: 'claude-opus-5', ton: '' }, cfg => {
      if (!cfg.cle) {
        repondre({ erreur: 'sanscle', message: 'Aucune cle API configuree.' });
        return;
      }
      demander(cfg.cle, cfg.modele, msg.conversation, cfg.ton).then(repondre);
    });
    return true; /* reponse asynchrone */
  }
});
