/* ============================================================
   SnapCoach - moteur d'analyse
   Aucune dependance au navigateur : tout est testable a part.
   Une conversation est une liste de messages
     { de: 'moi' | 'elle', texte: '...', t: <millisecondes> }
   'elle' designe l'autre personne, quel que soit son genre.
   ============================================================ */
(function (racine) {

  const MINUTE = 60000, HEURE = 3600000, JOUR = 86400000;

  /* Reponses sans contenu : elles ferment la conversation au lieu de
     l'ouvrir. Comptees a part, c'est le signal de desinteret le plus fiable. */
  const SECHES = /^(ok|okay|oki|d'?accord|dac|ah|ah ok|mdr+|ptdr+|lol|haha+|hihi|xd|oui|non|ouais|nan|yep|nope|hum|hmm|jsp|cool|nice|bien|bref|slt|salut|yo|ca va|rien|de rien|ok\.|\.|👍|😂|🤣|😅)$/i;

  /* Un message qui pose une question demande une suite : c'est de
     l'investissement dans la conversation, pas de la politesse.
     La limite de mot finale est indispensable : sans elle, « ou » collait
     au debut de « oui » et chaque acquiescement passait pour une question. */
  const QUESTION = /\?|^(quoi|pourquoi|comment|quand|ou|où|qui|c'est quoi|tu fais quoi|et toi|dis moi)\b/i;

  const RIRE = /(mdr|ptdr|lol|haha|hehe|😂|🤣|😅|😆|🙃)/i;
  const CHALEUR = /(😍|🥰|😘|❤|💕|💖|🥺|😊|☺|😉|😏|🔥|beau|belle|mignon|mignonne|manque|hâte|hate)/i;

  /* Propositions de se voir : le seul vrai but d'une conversation. */
  const RENCONTRE = /(se voir|on se voit|te voir|rejoindre|passer|venir|sortir|boire un|café|cafe|resto|ciné|cine|dispo|libre|ce soir|demain soir|weekend|week-end)/i;

  const mots = t => (t || '').trim().split(/\s+/).filter(Boolean).length;
  const moyenne = ns => ns.length ? ns.reduce((a, b) => a + b, 0) / ns.length : 0;

  function mediane(ns) {
    if (!ns.length) return null;
    const s = ns.slice().sort((a, b) => a - b), m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  }

  /* Delai avant CHAQUE reponse : le temps entre le dernier message de
     l'autre et la premiere reaction. Les rafales du meme auteur ne comptent
     qu'une fois, sinon un triple message ferait croire a une reponse
     instantanee suivie de deux delais nuls. */
  function delais(msgs, qui) {
    const out = [];
    for (let i = 1; i < msgs.length; i++) {
      if (msgs[i].de !== qui || msgs[i - 1].de === qui) continue;
      const d = msgs[i].t - msgs[i - 1].t;
      if (d >= 0 && d < 7 * JOUR) out.push(d);
    }
    return out;
  }

  /* Combien de fois quelqu'un a ecrit plusieurs messages d'affilee sans
     recevoir de reponse. Chez l'autre c'est de l'enthousiasme ; chez soi
     c'est de l'insistance. Le meme geste ne se lit pas pareil des deux cotes. */
  function rafales(msgs, qui) {
    let n = 0, suite = 0;
    msgs.forEach(m => {
      if (m.de === qui) { suite++; if (suite === 2) n++; }
      else suite = 0;
    });
    return n;
  }

  function duree(ms) {
    if (ms == null) return null;
    if (ms < MINUTE) return 'quelques secondes';
    if (ms < HEURE) return Math.round(ms / MINUTE) + ' min';
    if (ms < JOUR) return Math.round(ms / HEURE) + ' h';
    const j = Math.round(ms / JOUR);
    return j + (j > 1 ? ' jours' : ' jour');
  }

  /* ============================================================
     Lecture des signaux
     ============================================================ */
  function signaux(msgs) {
    const siens = msgs.filter(m => m.de === 'elle');
    const miens = msgs.filter(m => m.de === 'moi');

    const motsElle = moyenne(siens.map(m => mots(m.texte)));
    const motsMoi = moyenne(miens.map(m => mots(m.texte)));

    return {
      total: msgs.length,
      nElle: siens.length,
      nMoi: miens.length,
      motsElle, motsMoi,
      /* > 1 : elle en ecrit plus que moi */
      equilibre: motsMoi > 0 ? motsElle / motsMoi : (motsElle > 0 ? 2 : 1),
      questionsElle: siens.filter(m => QUESTION.test(m.texte)).length,
      questionsMoi: miens.filter(m => QUESTION.test(m.texte)).length,
      sechesElle: siens.filter(m => SECHES.test((m.texte || '').trim())).length,
      riresElle: siens.filter(m => RIRE.test(m.texte)).length,
      chaleurElle: siens.filter(m => CHALEUR.test(m.texte)).length,
      rencontre: msgs.some(m => RENCONTRE.test(m.texte)),
      delaiElle: mediane(delais(msgs, 'elle')),
      delaiMoi: mediane(delais(msgs, 'moi')),
      rafalesElle: rafales(msgs, 'elle'),
      rafalesMoi: rafales(msgs, 'moi'),
      dernier: msgs.length ? msgs[msgs.length - 1] : null
    };
  }

  /* ============================================================
     Score d'interet
     Chaque critere rapporte ou coute des points, et s'explique en
     francais : un score sans justification ne sert a rien.
     ============================================================ */
  function interet(s) {
    let score = 50;
    const pour = [], contre = [];

    if (s.nElle + s.nMoi < 6) {
      return { score: null, pour: [], contre: [],
               resume: 'Conversation trop courte pour juger. Attends quelques echanges de plus.' };
    }

    /* --- longueur des messages --- */
    if (s.equilibre >= 1.2) { score += 15; pour.push('elle ecrit plus que toi (' + Math.round(s.motsElle) + ' mots contre ' + Math.round(s.motsMoi) + ')'); }
    else if (s.equilibre >= 0.7) { score += 6; pour.push('vous ecrivez autant l\'un que l\'autre'); }
    else if (s.equilibre >= 0.4) { score -= 8; contre.push('ses messages sont plus courts que les tiens'); }
    else { score -= 18; contre.push('elle repond beaucoup plus court que toi (' + Math.round(s.motsElle) + ' mots contre ' + Math.round(s.motsMoi) + ')'); }

    /* --- questions : le meilleur signal d'interet --- */
    const tauxQ = s.nElle ? s.questionsElle / s.nElle : 0;
    if (tauxQ >= 0.25) { score += 18; pour.push('elle te pose des questions (' + s.questionsElle + ')'); }
    else if (s.questionsElle > 0) { score += 7; pour.push('elle t\'a pose ' + s.questionsElle + ' question' + (s.questionsElle > 1 ? 's' : '')); }
    else { score -= 15; contre.push('elle ne te pose aucune question'); }

    /* --- reponses seches --- */
    const tauxSec = s.nElle ? s.sechesElle / s.nElle : 0;
    if (tauxSec >= 0.4) { score -= 20; contre.push('beaucoup de reponses courtes type « ok », « mdr » (' + s.sechesElle + ')'); }
    else if (tauxSec >= 0.2) { score -= 8; contre.push('quelques reponses qui ferment la conversation'); }

    /* --- delais --- */
    if (s.delaiElle != null && s.delaiMoi != null) {
      if (s.delaiElle <= s.delaiMoi * 1.5) { score += 10; pour.push('elle repond aussi vite que toi (' + duree(s.delaiElle) + ')'); }
      else if (s.delaiElle > s.delaiMoi * 4) { score -= 15; contre.push('elle met bien plus de temps a repondre que toi (' + duree(s.delaiElle) + ' contre ' + duree(s.delaiMoi) + ')'); }
    }
    if (s.delaiElle != null && s.delaiElle > JOUR) { score -= 10; contre.push('elle laisse passer plus d\'une journee'); }

    /* --- elle relance d'elle-meme --- */
    if (s.rafalesElle > 0) { score += 12; pour.push('elle t\'a relance sans attendre ta reponse (' + s.rafalesElle + ' fois)'); }

    /* --- ton --- */
    if (s.riresElle >= 2) { score += 6; pour.push('elle rit a ce que tu ecris'); }
    if (s.chaleurElle >= 2) { score += 12; pour.push('son ton est chaleureux (emojis, compliments)'); }

    score = Math.max(0, Math.min(100, Math.round(score)));

    let resume;
    if (score >= 72) resume = 'Elle est clairement interessee. C\'est le moment de proposer quelque chose de concret.';
    else if (score >= 55) resume = 'Bon signe, mais rien n\'est joue. Continue sans en faire trop.';
    else if (score >= 38) resume = 'Tiede. Elle repond par politesse plus que par envie : change d\'angle.';
    else resume = 'Peu d\'interet de son cote pour l\'instant. Lache du lest plutot que d\'insister.';

    return { score, pour, contre, resume };
  }

  /* ============================================================
     Ce qu'il ne faut pas faire
     ============================================================ */
  function alertes(s) {
    const out = [];
    if (s.nElle + s.nMoi < 4) return out;

    if (s.equilibre < 0.5 && s.motsMoi > 8) {
      out.push({ titre: 'Tu ecris beaucoup plus qu\'elle',
                 quoi: 'Tes messages font ' + Math.round(s.motsMoi) + ' mots, les siens ' + Math.round(s.motsElle) + '. Ecris plus court pendant quelques echanges : c\'est a elle de fournir l\'effort maintenant.' });
    }
    if (s.rafalesMoi >= 2) {
      out.push({ titre: 'Tu relances sans attendre sa reponse',
                 quoi: s.rafalesMoi + ' fois, tu as ecrit plusieurs messages d\'affilee sans reponse. Ca donne l\'impression que tu attends. Envoie un message, puis arrete-toi.' });
    }
    if (s.questionsMoi >= 3 && s.questionsElle === 0) {
      out.push({ titre: 'Tu poses toutes les questions',
                 quoi: 'Tu en as pose ' + s.questionsMoi + ', elle aucune. Un interrogatoire fatigue. Raconte quelque chose sur toi et laisse-la rebondir.' });
    }
    if (s.delaiMoi != null && s.delaiElle != null && s.delaiMoi * 4 < s.delaiElle) {
      out.push({ titre: 'Tu reponds bien plus vite qu\'elle',
                 quoi: 'Tu reponds en ' + duree(s.delaiMoi) + ', elle en ' + duree(s.delaiElle) + '. Ne la fais pas attendre expres, mais ne lache pas tout non plus des qu\'elle ecrit.' });
    }
    if (s.sechesElle >= 3 && s.nElle >= 5) {
      out.push({ titre: 'Le sujet ne l\'accroche pas',
                 quoi: 'Elle repond « ok », « mdr », « ouais ». Insister sur ce sujet ne donnera rien : change completement de terrain ou laisse reposer une journee.' });
    }
    if (s.dernier && s.dernier.de === 'moi' && s.rafalesMoi >= 1) {
      out.push({ titre: 'La balle est dans son camp',
                 quoi: 'Le dernier message est de toi. N\'en envoie pas un autre avant qu\'elle reponde : c\'est le reflexe qui fait le plus de degats.' });
    }
    return out;
  }

  /* ============================================================
     Le bon moment
     ============================================================ */
  function moment(s, maintenant) {
    if (!s.dernier) return { etat: 'vide', titre: 'Rien a analyser', quoi: 'Ouvre une conversation pour commencer.' };

    const depuis = maintenant && s.dernier.t ? maintenant - s.dernier.t : null;

    if (s.dernier.de === 'moi') {
      if (depuis != null && depuis > 2 * JOUR) {
        return { etat: 'silence', titre: 'Sans reponse depuis ' + duree(depuis),
                 quoi: 'Elle n\'a pas repondu. Une relance legere est possible, mais une seule, et sur un sujet neuf. Pas de « t\'es la ? ».' };
      }
      return { etat: 'patiente', titre: 'A elle de jouer',
               quoi: 'Tu as ecrit en dernier. Laisse-lui le temps : reecrire maintenant efface tout le terrain gagne.' };
    }

    if (depuis != null && depuis > 12 * HEURE) {
      return { etat: 'tard', titre: 'Elle attend depuis ' + duree(depuis),
               quoi: 'Reponds sans t\'excuser du retard, ca ne fait qu\'attirer l\'attention dessus. Enchaine simplement.' };
    }
    if (depuis != null && depuis < 2 * MINUTE) {
      return { etat: 'vif', titre: 'Elle vient d\'ecrire',
               quoi: 'Vous etes tous les deux en ligne : c\'est le meilleur moment pour un echange vivant. Reponds maintenant.' };
    }
    return { etat: 'a-toi', titre: 'C\'est a toi',
             quoi: 'Reponds quand tu veux dans l\'heure. Inutile de calculer un delai, elle ne compte pas.' };
  }

  /* ============================================================
     Reponses proposees sans Claude
     Des pistes, pas des repliques toutes faites : le but est de
     debloquer, pas de parler a sa place.
     ============================================================ */
  function pistes(s) {
    const out = [];
    const dernier = s.dernier;
    if (!dernier) return out;

    if (dernier.de === 'moi') {
      out.push({ quoi: 'Ne rien envoyer',
                 pourquoi: 'Le dernier message est de toi. Attendre est ici la meilleure reponse possible.' });
      return out;
    }

    if (QUESTION.test(dernier.texte)) {
      out.push({ quoi: 'Reponds a sa question, puis renvoie-lui la pareille',
                 pourquoi: 'Elle a ouvert une porte. Reponds vraiment, en une ou deux phrases, et termine par ta propre question sur le meme sujet.' });
    }
    if (RENCONTRE.test(dernier.texte)) {
      out.push({ quoi: 'Propose un moment precis',
                 pourquoi: 'Le sujet de se voir est deja sur la table. Un jour et une activite valent mieux qu\'un « on se capte ».' });
    }
    if (s.interetHaut) {
      out.push({ quoi: 'Propose de se voir',
                 pourquoi: 'Les signaux sont bons et une conversation ne dure pas eternellement. Un cafe, une heure, quelque chose de facile a accepter.' });
    }
    if (SECHES.test((dernier.texte || '').trim())) {
      out.push({ quoi: 'Change de sujet',
                 pourquoi: 'Sa reponse ferme le sujet actuel. Reviens avec quelque chose de neuf, ou laisse reposer jusqu\'a demain.' });
    }
    if (!out.length) {
      out.push({ quoi: 'Rebondis sur un detail de son message',
                 pourquoi: 'Prends un mot precis de ce qu\'elle vient d\'ecrire et creuse-le. C\'est ce qui distingue une vraie conversation d\'un echange poli.' });
    }
    return out;
  }

  racine.SnapCoach = {
    analyse(msgs, maintenant) {
      const propres = (msgs || []).filter(m => m && m.texte && m.texte.trim());
      const s = signaux(propres);
      const i = interet(s);
      s.interetHaut = i.score != null && i.score >= 72;
      return { signaux: s, interet: i, alertes: alertes(s), moment: moment(s, maintenant || null), pistes: pistes(s) };
    },
    signaux, interet, alertes, moment, pistes,
    mots, mediane, duree, rafales, delais,
    SECHES, QUESTION, RENCONTRE, CHALEUR, RIRE
  };
})(typeof module !== 'undefined' && module.exports ? module.exports : (typeof window !== 'undefined' ? window : globalThis));

if (typeof module !== 'undefined' && module.exports) module.exports = module.exports.SnapCoach;
