/* ============================================================
   KeySound - fabrique de sons de touches
   Les sons sont SYNTHETISES, pas enregistres : huit ambiances en
   fichiers audio pèseraient plusieurs mégaoctets et seraient figées.
   Ici tout est construit a la volee a partir de quelques nombres.

   Une frappe empile jusqu'a quatre couches. Les deux premieres font
   le bruit ; les deux dernieres font qu'il devient agreable :

     BRUIT     un souffle court filtre — la matiere du contact
     CORPS     une note grave tres breve — la caisse de resonance
     RESONANCE une queue qui traine apres le contact. C'est elle qui
               fait la difference entre un « clac » sec et un son
               dans lequel l'oreille a envie de rester.
     AIR       un scintillement aigu tres discret — la sensation de
               proximite, de micro pose juste a cote du clavier.

   Le tout passe par un espace (petite reverberation) et une position
   stereo qui bouge legerement a chaque frappe : c'est ce qui donne
   l'impression que le son se produit autour de la tete plutot que
   dans un haut-parleur.

   Aucun code de touche n'est enregistre nulle part : seule compte
   la CATEGORIE de la touche (normale, espace, entree, retour).
   ============================================================ */
(function (racine) {

  /* ============================================================
     Les ambiances
     attaque  : douceur de l'attaque, en secondes. Court = claquant,
                long = feutre. C'est le reglage le plus audible.
     bruit    : { type, freq, q, gain, duree }
     corps    : { onde, freq, gain, duree, glisse }
     resonance: { onde, freq, gain, duree }   la queue qui traine
     air      : { freq, gain, duree }         le scintillement
     espace   : dose de reverberation, 0 a 1
     stereo   : largeur du deplacement gauche/droite, 0 a 1
     ============================================================ */
  const AMBIANCES = {
    thock: {
      nom: 'Thock profond', emoji: '🥁',
      description: 'Grave, rond, avec une longue résonance de caisse. Le classique.',
      attaque: 0.004,
      bruit: { type: 'lowpass', freq: 780, q: 0.9, gain: 0.34, duree: 0.06 },
      corps: { onde: 'sine', freq: 112, gain: 0.6, duree: 0.14, glisse: 68 },
      resonance: { onde: 'sine', freq: 224, gain: 0.14, duree: 0.42 },
      air: { freq: 5200, gain: 0.035, duree: 0.05 },
      espace: 0.3, stereo: 0.35,
      relache: { gain: 0.32, hauteur: 1.12, duree: 0.55 }
    },
    marbre: {
      nom: 'Marbre', emoji: '🪨',
      description: 'Une bille de verre sur du marbre. Résonance longue et cristalline.',
      attaque: 0.002,
      bruit: { type: 'bandpass', freq: 2200, q: 1.8, gain: 0.3, duree: 0.03 },
      corps: { onde: 'sine', freq: 320, gain: 0.42, duree: 0.16, glisse: 250 },
      resonance: { onde: 'sine', freq: 1180, gain: 0.13, duree: 0.75 },
      air: { freq: 7400, gain: 0.05, duree: 0.07 },
      espace: 0.55, stereo: 0.5,
      relache: { gain: 0.3, hauteur: 1.3, duree: 0.5 }
    },
    velours: {
      nom: 'Velours', emoji: '🫧',
      description: "Presque pas de clic, juste une pression sourde et de l'air. Très doux.",
      attaque: 0.012,
      bruit: { type: 'lowpass', freq: 420, q: 0.7, gain: 0.3, duree: 0.09 },
      corps: { onde: 'sine', freq: 96, gain: 0.5, duree: 0.19, glisse: 62 },
      resonance: { onde: 'sine', freq: 168, gain: 0.1, duree: 0.5 },
      air: { freq: 3200, gain: 0.03, duree: 0.11 },
      espace: 0.45, stereo: 0.4,
      relache: { gain: 0.28, hauteur: 1.1, duree: 0.6 }
    },
    creme: {
      nom: 'Crémeux', emoji: '☁️',
      description: 'Amorti et chaleureux, sans aucune agressivité. Pour taper des heures.',
      attaque: 0.006,
      bruit: { type: 'lowpass', freq: 1250, q: 0.7, gain: 0.3, duree: 0.05 },
      corps: { onde: 'sine', freq: 146, gain: 0.44, duree: 0.13, glisse: 100 },
      resonance: { onde: 'triangle', freq: 292, gain: 0.1, duree: 0.34 },
      air: { freq: 4600, gain: 0.03, duree: 0.06 },
      espace: 0.32, stereo: 0.32,
      relache: { gain: 0.3, hauteur: 1.15, duree: 0.55 }
    },
    clicky: {
      nom: 'Mécanique clicky', emoji: '⌨️',
      description: 'Le clic net des switchs bleus, mais avec du corps sous le clic.',
      attaque: 0.0015,
      bruit: { type: 'bandpass', freq: 2700, q: 1.5, gain: 0.42, duree: 0.035 },
      corps: { onde: 'triangle', freq: 180, gain: 0.34, duree: 0.08, glisse: 118 },
      resonance: { onde: 'sine', freq: 430, gain: 0.08, duree: 0.22 },
      air: { freq: 6400, gain: 0.045, duree: 0.04 },
      espace: 0.2, stereo: 0.3,
      relache: { gain: 0.42, hauteur: 1.22, duree: 0.6 }
    },
    bois: {
      nom: 'Bois', emoji: '🪵',
      description: 'Un toc sec et chaud, avec la résonance courte du bois plein.',
      attaque: 0.002,
      bruit: { type: 'bandpass', freq: 1450, q: 2.2, gain: 0.36, duree: 0.032 },
      corps: { onde: 'triangle', freq: 238, gain: 0.46, duree: 0.1, glisse: 172 },
      resonance: { onde: 'sine', freq: 620, gain: 0.1, duree: 0.28 },
      air: { freq: 5600, gain: 0.03, duree: 0.045 },
      espace: 0.28, stereo: 0.34,
      relache: { gain: 0.32, hauteur: 1.2, duree: 0.55 }
    },
    pluie: {
      nom: 'Pluie', emoji: '🌧️',
      description: "Des gouttes qui tombent dans une pièce calme. Beaucoup d'espace.",
      attaque: 0.003,
      bruit: { type: 'bandpass', freq: 3400, q: 3, gain: 0.16, duree: 0.02 },
      corps: { onde: 'sine', freq: 480, gain: 0.4, duree: 0.11, glisse: 1150 },
      resonance: { onde: 'sine', freq: 2100, gain: 0.06, duree: 0.4 },
      air: { freq: 8200, gain: 0.04, duree: 0.05 },
      espace: 0.68, stereo: 0.6,
      relache: { gain: 0.24, hauteur: 1.35, duree: 0.5 }
    },
    bulle: {
      nom: 'Bulle', emoji: '🎈',
      description: 'Un « pop » rond et élastique, sans bruit de matière.',
      attaque: 0.003,
      bruit: null,
      corps: { onde: 'sine', freq: 840, gain: 0.52, duree: 0.09, glisse: 240 },
      resonance: { onde: 'sine', freq: 300, gain: 0.09, duree: 0.3 },
      air: null,
      espace: 0.35, stereo: 0.45,
      relache: { gain: 0.26, hauteur: 1.45, duree: 0.5 }
    },
    machine: {
      nom: 'Machine à écrire', emoji: '📜',
      description: 'Frappe métallique — et un vrai timbre de retour chariot sur Entrée.',
      attaque: 0.0015,
      bruit: { type: 'bandpass', freq: 3500, q: 1.2, gain: 0.5, duree: 0.03 },
      corps: { onde: 'square', freq: 325, gain: 0.16, duree: 0.045, glisse: 205 },
      resonance: { onde: 'triangle', freq: 890, gain: 0.07, duree: 0.25 },
      air: { freq: 7000, gain: 0.05, duree: 0.04 },
      espace: 0.4, stereo: 0.4,
      relache: { gain: 0.48, hauteur: 1.28, duree: 0.5 },
      timbre: true
    },
    retro: {
      nom: 'Rétro 8-bit', emoji: '👾',
      description: 'Bip carré de vieille console. Assumé, et un peu réverbéré.',
      attaque: 0.002,
      bruit: null,
      corps: { onde: 'square', freq: 630, gain: 0.19, duree: 0.05, glisse: 630 },
      resonance: { onde: 'square', freq: 1260, gain: 0.04, duree: 0.14 },
      air: null,
      espace: 0.3, stereo: 0.4,
      relache: { gain: 0.4, hauteur: 1.5, duree: 0.5 }
    }
  };

  /* Les touches larges sonnent plus grave et plus plein : c'est ce qui
     distingue une barre d'espace d'une lettre a l'oreille. */
  const CATEGORIES = {
    normale: { hauteur: 1,    gain: 1 },
    espace:  { hauteur: 0.7,  gain: 1.3 },
    entree:  { hauteur: 0.84, gain: 1.18 },
    retour:  { hauteur: 1.14, gain: 0.95 },
    modif:   { hauteur: 1.32, gain: 0.6 }
  };

  /* On lit le nom de la touche, jamais le caractere saisi. */
  function categorie(nomTouche) {
    if (nomTouche === ' ' || nomTouche === 'Spacebar') return 'espace';
    if (nomTouche === 'Enter' || nomTouche === 'NumpadEnter') return 'entree';
    if (nomTouche === 'Backspace' || nomTouche === 'Delete') return 'retour';
    if (nomTouche === 'Shift' || nomTouche === 'Control' || nomTouche === 'Alt' ||
        nomTouche === 'Meta' || nomTouche === 'CapsLock' || nomTouche === 'Tab' ||
        nomTouche === 'Escape') return 'modif';
    return 'normale';
  }

  /* Un souffle blanc, fabrique une seule fois et reutilise. */
  let souffle = null;
  function bufferSouffle(ctx) {
    if (souffle && souffle.tauxKS === ctx.sampleRate) return souffle;
    const n = Math.floor(ctx.sampleRate * 0.12);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    souffle = buf;
    souffle.tauxKS = ctx.sampleRate;
    return buf;
  }

  /* ============================================================
     L'espace
     Une petite piece, fabriquee comme un souffle qui s'eteint. Sans
     elle les sons semblent colles a l'oreille, ce qui fatigue vite ;
     avec elle ils ont l'air de se produire quelque part.
     Un seul exemplaire par contexte : la reverberation est de loin la
     piece la plus couteuse, la refabriquer a chaque touche serait
     absurde.
     ============================================================ */
  function empreinte(ctx) {
    const duree = 0.5;
    const n = Math.floor(ctx.sampleRate * duree);
    const buf = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < n; i++) {
        const t = i / n;
        /* decroissance rapide : une piece calme, pas une cathedrale */
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 3.2);
      }
    }
    return buf;
  }

  function espaceDe(ctx, sortie) {
    if (!ctx.createConvolver) return null;
    if (ctx.espaceKS && ctx.espaceKS.sortie === sortie) return ctx.espaceKS;
    const conv = ctx.createConvolver();
    conv.buffer = empreinte(ctx);
    const g = ctx.createGain();
    g.gain.value = 1;
    conv.connect(g);
    g.connect(sortie);
    ctx.espaceKS = { conv, gain: g, sortie };
    return ctx.espaceKS;
  }

  /* ============================================================
     Une frappe
     ============================================================ */
  function frapper(ctx, sortie, amb, cat, opts) {
    const a = typeof amb === 'string' ? AMBIANCES[amb] : amb;
    if (!a) return null;

    const c = CATEGORIES[cat] || CATEGORIES.normale;
    const o = opts || {};
    const t0 = ctx.currentTime;
    const relache = !!o.relache;

    /* Deux frappes identiques sonnent faux : on decale legerement la
       hauteur a chaque fois. Sans cela l'oreille entend une machine. */
    const v = o.variation == null ? 0.12 : o.variation;
    const alea = 1 + (Math.random() * 2 - 1) * v;

    const hauteur = c.hauteur * alea * (relache ? (a.relache.hauteur || 1.2) : 1);
    const force = c.gain * (o.volume == null ? 1 : o.volume) *
                  (relache ? (a.relache.gain || 0.4) : 1);
    const etirement = relache ? (a.relache.duree || 0.6) : 1;

    /* Au volume zero on ne construit rien du tout. Ce n'est pas qu'une
       economie : les enveloppes se terminent par une rampe
       exponentielle, et une exponentielle ne peut ni partir de zero ni
       y arriver. */
    if (!(force > 0.0005)) return null;

    const attaque = (a.attaque || 0.003) * (relache ? 0.7 : 1);
    const noeuds = [];

    /* --- ou tout se rejoint : une position dans l'espace --- */
    let entree = sortie;
    let pan = null;
    if (ctx.createStereoPanner) {
      pan = ctx.createStereoPanner();
      /* chaque frappe tombe a un endroit legerement different */
      const largeur = o.stereo == null ? (a.stereo || 0) : (a.stereo || 0) * o.stereo;
      pan.pan.value = (Math.random() * 2 - 1) * largeur;
      pan.connect(sortie);
      entree = pan;
      noeuds.push(pan);
    }

    /* --- et un peu de piece autour --- */
    let envoiEspace = null;
    const doseEspace = (a.espace || 0) * (o.espace == null ? 1 : o.espace);
    if (doseEspace > 0.01) {
      const piece = espaceDe(ctx, sortie);
      if (piece) {
        envoiEspace = ctx.createGain();
        envoiEspace.gain.value = doseEspace * (relache ? 0.6 : 1);
        envoiEspace.connect(piece.conv);
        noeuds.push(envoiEspace);

        /* Avec un panoramique, l'envoi se branche une seule fois, apres
           lui : la reverberation herite ainsi de la position stereo.
           Sans panoramique, il faudra brancher chaque couche dessus. */
        if (pan) { pan.connect(envoiEspace); envoiEspace = null; }
      }
    }

    /* enveloppe commune : attaque douce puis extinction progressive */
    const enveloppe = (g, pic, duree) => {
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(pic, t0 + attaque);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + attaque + duree);
    };
    const brancher = n2 => {
      n2.connect(entree);
      if (envoiEspace) n2.connect(envoiEspace);
    };

    /* --- la matiere du contact --- */
    if (a.bruit) {
      const src = ctx.createBufferSource();
      src.buffer = bufferSouffle(ctx);

      const filtre = ctx.createBiquadFilter();
      filtre.type = a.bruit.type;
      filtre.frequency.value = a.bruit.freq * hauteur;
      filtre.Q.value = a.bruit.q;

      const g = ctx.createGain();
      const duree = a.bruit.duree * etirement;
      enveloppe(g, a.bruit.gain * force, duree);

      src.connect(filtre); filtre.connect(g); brancher(g);
      src.start(t0);
      src.stop(t0 + attaque + duree + 0.02);
      noeuds.push(src, filtre, g);
    }

    /* --- la caisse de resonance --- */
    if (a.corps) {
      const osc = ctx.createOscillator();
      osc.type = a.corps.onde;

      const f0 = a.corps.freq * hauteur;
      const f1 = (a.corps.glisse || a.corps.freq) * hauteur;
      const duree = a.corps.duree * etirement;

      osc.frequency.setValueAtTime(f0, t0);
      if (f1 !== f0) osc.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + duree);

      const g = ctx.createGain();
      enveloppe(g, a.corps.gain * force, duree);

      osc.connect(g); brancher(g);
      osc.start(t0);
      osc.stop(t0 + attaque + duree + 0.02);
      noeuds.push(osc, g);
    }

    /* --- la queue qui traine : le coeur du plaisir d'ecoute --- */
    if (a.resonance) {
      const osc = ctx.createOscillator();
      osc.type = a.resonance.onde || 'sine';
      /* legerement desaccordee : une resonance parfaitement juste
         sonne synthetique */
      osc.frequency.value = a.resonance.freq * hauteur * (1 + (Math.random() - 0.5) * 0.02);

      const g = ctx.createGain();
      const duree = a.resonance.duree * etirement;
      enveloppe(g, a.resonance.gain * force, duree);

      osc.connect(g); brancher(g);
      osc.start(t0);
      osc.stop(t0 + attaque + duree + 0.02);
      noeuds.push(osc, g);
    }

    /* --- le scintillement de proximite --- */
    if (a.air && !relache) {
      const src = ctx.createBufferSource();
      src.buffer = bufferSouffle(ctx);

      const filtre = ctx.createBiquadFilter();
      filtre.type = 'highpass';
      filtre.frequency.value = a.air.freq;
      filtre.Q.value = 0.7;

      const g = ctx.createGain();
      enveloppe(g, a.air.gain * force, a.air.duree);

      src.connect(filtre); filtre.connect(g); brancher(g);
      src.start(t0);
      src.stop(t0 + attaque + a.air.duree + 0.02);
      noeuds.push(src, filtre, g);
    }

    /* --- la clochette de fin de ligne, sur Entree uniquement --- */
    if (a.timbre && cat === 'entree' && !relache) {
      [1760, 2640].forEach((f, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = f * alea;
        const g = ctx.createGain();
        const pic = (i ? 0.055 : 0.1) * (o.volume == null ? 1 : o.volume);
        g.gain.setValueAtTime(0, t0);
        g.gain.linearRampToValueAtTime(pic, t0 + 0.004);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.55);
        osc.connect(g); brancher(g);
        osc.start(t0);
        osc.stop(t0 + 0.6);
        noeuds.push(osc, g);
      });
    }

    return noeuds;
  }

  racine.KeySound = {
    AMBIANCES, CATEGORIES, categorie, frapper, bufferSouffle, empreinte, espaceDe,
    liste: () => Object.keys(AMBIANCES)
  };
})(typeof module !== 'undefined' && module.exports ? module.exports : (typeof window !== 'undefined' ? window : globalThis));

if (typeof module !== 'undefined' && module.exports) module.exports = module.exports.KeySound;
