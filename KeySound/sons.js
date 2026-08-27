/* ============================================================
   KeySound - fabrique de sons de touches
   Les sons sont SYNTHETISES, pas enregistres : une extension qui
   embarquerait des fichiers audio pour huit ambiances pèserait
   plusieurs mégaoctets, et chaque son serait figé. Ici tout est
   construit a la volee a partir de quelques nombres.

   Une frappe = deux couches superposees :
     - le BRUIT, un souffle court filtre : c'est le « clic », la
       matiere du contact (plastique, metal, bois) ;
     - le CORPS, une note basse tres breve : c'est la caisse de
       resonance, ce qui fait qu'une touche sonne pleine ou creuse.

   Aucun code de touche n'est enregistre nulle part : seule compte
   la CATEGORIE de la touche (normale, espace, entree, retour).
   ============================================================ */
(function (racine) {

  /* ============================================================
     Les ambiances
     bruit  : { freq, q, gain, duree, type }   type = passe-bande ou passe-bas
     corps  : { onde, freq, gain, duree, glisse }  glisse = freq d'arrivee
     relache: multiplicateurs pour le son de remontee de la touche
     ============================================================ */
  const AMBIANCES = {
    clicky: {
      nom: 'Mécanique clicky', emoji: '⌨️',
      description: 'Le clic net des switchs bleus. Sec, précis, un peu bavard.',
      bruit: { type: 'bandpass', freq: 2800, q: 1.4, gain: 0.5, duree: 0.035 },
      corps: { onde: 'triangle', freq: 185, gain: 0.28, duree: 0.045, glisse: 120 },
      relache: { gain: 0.45, hauteur: 1.25, duree: 0.7 }
    },
    thock: {
      nom: 'Thock profond', emoji: '🥁',
      description: 'Le son grave et feutré des claviers lourds. Rond, posé.',
      bruit: { type: 'lowpass', freq: 900, q: 0.9, gain: 0.42, duree: 0.055 },
      corps: { onde: 'sine', freq: 118, gain: 0.55, duree: 0.095, glisse: 72 },
      relache: { gain: 0.3, hauteur: 1.15, duree: 0.6 }
    },
    creme: {
      nom: 'Crémeux', emoji: '☁️',
      description: 'Doux et amorti, sans agressivité. Pour taper longtemps.',
      bruit: { type: 'lowpass', freq: 1500, q: 0.7, gain: 0.3, duree: 0.04 },
      corps: { onde: 'sine', freq: 150, gain: 0.34, duree: 0.07, glisse: 105 },
      relache: { gain: 0.35, hauteur: 1.2, duree: 0.6 }
    },
    machine: {
      nom: 'Machine à écrire', emoji: '📜',
      description: 'Frappe métallique — et un vrai timbre de retour chariot sur Entrée.',
      bruit: { type: 'bandpass', freq: 3600, q: 1.1, gain: 0.55, duree: 0.03 },
      corps: { onde: 'square', freq: 330, gain: 0.16, duree: 0.035, glisse: 210 },
      relache: { gain: 0.5, hauteur: 1.3, duree: 0.5 },
      timbre: true          /* clochette sur Entree */
    },
    bulle: {
      nom: 'Bulle', emoji: '🫧',
      description: 'Un « pop » rond, sans aucun bruit de matière.',
      bruit: null,
      corps: { onde: 'sine', freq: 880, gain: 0.5, duree: 0.07, glisse: 260 },
      relache: { gain: 0.28, hauteur: 1.5, duree: 0.5 }
    },
    goutte: {
      nom: "Goutte d'eau", emoji: '💧',
      description: 'Une note qui monte, claire et liquide.',
      bruit: null,
      corps: { onde: 'sine', freq: 420, gain: 0.45, duree: 0.1, glisse: 1250 },
      relache: { gain: 0.22, hauteur: 1.4, duree: 0.5 }
    },
    bois: {
      nom: 'Bois', emoji: '🪵',
      description: 'Un toc sec et chaud, comme deux baguettes.',
      bruit: { type: 'bandpass', freq: 1500, q: 2.2, gain: 0.45, duree: 0.03 },
      corps: { onde: 'triangle', freq: 245, gain: 0.4, duree: 0.05, glisse: 175 },
      relache: { gain: 0.32, hauteur: 1.25, duree: 0.55 }
    },
    retro: {
      nom: 'Rétro 8-bit', emoji: '👾',
      description: 'Bip carré de vieille console. Assumé.',
      bruit: null,
      corps: { onde: 'square', freq: 640, gain: 0.2, duree: 0.045, glisse: 640 },
      relache: { gain: 0.4, hauteur: 1.5, duree: 0.5 }
    }
  };

  /* Les touches larges sonnent plus grave et plus plein : c'est ce qui
     distingue une barre d'espace d'une lettre a l'oreille. */
  const CATEGORIES = {
    normale: { hauteur: 1,    gain: 1 },
    espace:  { hauteur: 0.72, gain: 1.25 },
    entree:  { hauteur: 0.85, gain: 1.15 },
    retour:  { hauteur: 1.12, gain: 0.95 },
    modif:   { hauteur: 1.3,  gain: 0.6 }
  };

  /* Quelles touches comptent comme quoi. On lit le nom de la touche,
     jamais le caractere saisi. */
  function categorie(nomTouche) {
    if (nomTouche === ' ' || nomTouche === 'Spacebar') return 'espace';
    if (nomTouche === 'Enter' || nomTouche === 'NumpadEnter') return 'entree';
    if (nomTouche === 'Backspace' || nomTouche === 'Delete') return 'retour';
    if (nomTouche === 'Shift' || nomTouche === 'Control' || nomTouche === 'Alt' ||
        nomTouche === 'Meta' || nomTouche === 'CapsLock' || nomTouche === 'Tab' ||
        nomTouche === 'Escape') return 'modif';
    return 'normale';
  }

  /* Un souffle blanc, fabrique une seule fois et reutilise : en
     regenerer un a chaque frappe couterait cher pour rien. */
  let souffle = null;
  function bufferSouffle(ctx) {
    if (souffle && souffle.sampleRate === ctx.sampleRate) return souffle;
    const n = Math.floor(ctx.sampleRate * 0.12);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) {
      /* le souffle s'eteint tout seul : evite d'avoir a couper net */
      d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    }
    souffle = buf;
    souffle.sampleRate = ctx.sampleRate;
    return buf;
  }

  /* ============================================================
     Une frappe
     ctx     : AudioContext
     sortie  : noeud de destination (gain maitre)
     amb     : ambiance, ou son identifiant
     cat     : categorie de touche
     opts    : { variation 0-1, relache: bool, volume 0-1 }
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

    /* Au volume zero, on ne construit rien du tout. Ce n'est pas qu'une
       economie : les enveloppes se terminent par une rampe
       exponentielle, et une exponentielle ne peut ni partir de zero ni
       y arriver. Programmer l'extinction d'un son inaudible ferait
       donc rouspeter l'API pour rien. */
    if (!(force > 0.0005)) return null;

    const noeuds = [];

    /* --- la couche de bruit : la matiere du contact --- */
    if (a.bruit) {
      const src = ctx.createBufferSource();
      src.buffer = bufferSouffle(ctx);

      const filtre = ctx.createBiquadFilter();
      filtre.type = a.bruit.type;
      filtre.frequency.value = a.bruit.freq * hauteur;
      filtre.Q.value = a.bruit.q;

      const g = ctx.createGain();
      const duree = a.bruit.duree * etirement;
      const pic = a.bruit.gain * force;

      /* attaque quasi instantanee puis extinction : c'est ce profil
         qui fait « clic » plutot que « pshhh » */
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(pic, t0 + 0.001);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + duree);

      src.connect(filtre); filtre.connect(g); g.connect(sortie);
      src.start(t0);
      src.stop(t0 + duree + 0.02);
      noeuds.push(src, filtre, g);
    }

    /* --- la couche de corps : la resonance --- */
    if (a.corps) {
      const osc = ctx.createOscillator();
      osc.type = a.corps.onde;

      const f0 = a.corps.freq * hauteur;
      const f1 = (a.corps.glisse || a.corps.freq) * hauteur;
      const duree = a.corps.duree * etirement;

      osc.frequency.setValueAtTime(f0, t0);
      if (f1 !== f0) osc.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + duree);

      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(a.corps.gain * force, t0 + 0.002);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + duree);

      osc.connect(g); g.connect(sortie);
      osc.start(t0);
      osc.stop(t0 + duree + 0.02);
      noeuds.push(osc, g);
    }

    /* --- la clochette de fin de ligne, sur Entree uniquement --- */
    if (a.timbre && cat === 'entree' && !relache) {
      [1760, 2640].forEach((f, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = f * alea;
        const g = ctx.createGain();
        const pic = (i ? 0.06 : 0.11) * (o.volume == null ? 1 : o.volume);
        g.gain.setValueAtTime(0, t0);
        g.gain.linearRampToValueAtTime(pic, t0 + 0.004);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.45);
        osc.connect(g); g.connect(sortie);
        osc.start(t0);
        osc.stop(t0 + 0.5);
        noeuds.push(osc, g);
      });
    }

    return noeuds;
  }

  racine.KeySound = {
    AMBIANCES, CATEGORIES, categorie, frapper, bufferSouffle,
    liste: () => Object.keys(AMBIANCES)
  };
})(typeof module !== 'undefined' && module.exports ? module.exports : (typeof window !== 'undefined' ? window : globalThis));

if (typeof module !== 'undefined' && module.exports) module.exports = module.exports.KeySound;
