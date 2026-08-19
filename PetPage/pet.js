/* ============================================================
   PetPage - un compagnon qui se promene sur la page
   ------------------------------------------------------------
   Interactions : 1 clic = caresse + petit saut
                  2 clics = on lui donne a manger
                  glisser = on l'attrape et on le lance
   Mini-jeux    : lances depuis le popup (Attrape / Saute / Course)
   ============================================================ */

(function () {

/* Un ancien exemplaire tourne peut-etre encore (extension rechargee sans
   recharger l'onglet) : on nettoie ses elements avant de repartir a neuf. */
document.querySelectorAll(
  '.petpage-pet, .petpage-bubble, .petpage-food, .petpage-particle, ' +
  '.petpage-shield, .petpage-hud, .petpage-card, .petpage-item, .petpage-rival, .petpage-finish'
).forEach(el => el.remove());

const DEFAULTS = {
  enabled: true,
  animal: '🐱',
  petName: 'Mimi',
  size: 48,
  speed: 1,
  follow: true,
  chatty: true,
  disabledSites: [],
  meals: 0,
  petScores: { treats: 0, runner: 0, race: 0 }
};

/* de quoi mange chaque animal */
const FOOD = {
  '🐱': '🐟', '🐶': '🦴', '🦊': '🍗', '🐧': '🐟', '🐹': '🌰', '🐰': '🥕',
  '🐼': '🎋', '🐸': '🪰', '🐢': '🥬', '🦄': '🍩', '🐉': '🍖', '🐥': '🌾',
  '🐨': '🍃', '🦖': '🍖', '🐙': '🦐', '🦉': '🐛', '🐝': '🌻', '🦋': '🌺'
};

const LINES = {
  hello:  ['Coucou !', 'Salut toi 👋', 'Me revoila !'],
  pet:    ['Encore !', 'Ronron... 💛', 'Hihi ça chatouille', '❤️'],
  bored:  ['On fait quoi ?', 'Ça scrolle dur ici...', 'Tu lis quoi ?', 'J\'ai un petit creux...'],
  sleep:  ['Zzz...', '😴'],
  follow: ['Attends-moi !', 'Je te suis !', 'Par ici !'],
  hungry: ['Oh, à manger ! 🤤', 'Pour moi ?!', 'Miam miam miam'],
  full:   ['Merci ! 💛', 'C\'était délicieux', 'Encore un ? 🤤', 'Miam !'],
  jump:   ['Hop !', 'Youpi !', 'Wiii !']
};

const GRAVITY = 0.0022;   /* px / ms^2 */

const pick = arr => arr[(Math.random() * arr.length) | 0];

let cfg = Object.assign({}, DEFAULTS);
let pet = null;

/* ============================================================
   Le compagnon
   ============================================================ */
class Pet {
  constructor(config) {
    this.cfg = config;

    this.el = document.createElement('div');
    this.el.className = 'petpage-pet is-idle';
    this.el.title = config.petName + ' — 1 clic : caresse • 2 clics : nourrir • glisser : attraper';

    this.sprite = document.createElement('span');
    this.sprite.className = 'petpage-sprite';
    this.sprite.textContent = config.animal;
    this.el.appendChild(this.sprite);

    this.bubble = document.createElement('div');
    this.bubble.className = 'petpage-bubble';

    document.body.appendChild(this.el);
    document.body.appendChild(this.bubble);

    this.size = config.size;
    this.x = window.innerWidth / 2;
    this.y = this.ground();
    this.vx = 0;
    this.vy = 0;
    this.dir = 1;
    this.state = 'idle';
    this.timer = 900;
    this.idleFor = 0;

    this.food = null;
    this.eatTimer = 0;
    this.press = null;
    this.dragging = false;
    this.taps = 0;
    this.tapTimer = null;
    this.mouse = { x: 0, y: 0, seen: false };
    this.bubbleTimer = null;
    this.game = null;

    this.applySize();
    this.bindEvents();
    this.say(pick(LINES.hello), 2200);

    this.last = performance.now();
    this.loop = this.loop.bind(this);
    this.raf = requestAnimationFrame(this.loop);
  }

  ground() { return window.innerHeight - this.size - 4; }
  inAir()  { return this.state === 'jumping' || this.state === 'falling'; }

  applySize() {
    this.size = this.cfg.size;
    this.sprite.style.fontSize = this.size + 'px';
    this.el.style.width = this.size + 'px';
    this.el.style.height = this.size + 'px';
  }

  /* ==========================================================
     Souris : clic simple / double clic / glisser
     ========================================================== */
  bindEvents() {
    this.onDown = e => {
      if (this.game) return;
      e.preventDefault();
      this.press = { x: e.clientX, y: e.clientY };
      this.lastDrag = { x: e.clientX, y: e.clientY, t: performance.now() };
    };

    this.onMove = e => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
      this.mouse.seen = true;

      if (!this.press) return;

      /* on ne passe en glisser qu'apres un vrai deplacement */
      if (!this.dragging) {
        const d = Math.hypot(e.clientX - this.press.x, e.clientY - this.press.y);
        if (d < 5) return;
        this.dragging = true;
        this.setState('dragged');
        this.hideBubble();
      }

      this.x = e.clientX - this.size / 2;
      this.y = e.clientY - this.size / 2;

      const now = performance.now();
      const dt = Math.max(now - this.lastDrag.t, 8);
      this.vx = (e.clientX - this.lastDrag.x) / dt;
      this.vy = (e.clientY - this.lastDrag.y) / dt;
      this.lastDrag = { x: e.clientX, y: e.clientY, t: now };
      this.render();
    };

    this.onUp = () => {
      if (!this.press) return;
      this.press = null;

      if (this.dragging) {           /* on le lache : il est projete */
        this.dragging = false;
        this.vx = Math.max(-1.2, Math.min(1.2, this.vx));
        this.vy = Math.max(-1.2, Math.min(1.2, this.vy));
        if (this.vx) this.dir = this.vx > 0 ? 1 : -1;
        this.setState('falling');
        return;
      }

      /* pas de glisser : c'est un tap. On attend un eventuel 2e. */
      this.taps++;
      if (this.taps === 1) {
        this.tapTimer = setTimeout(() => { this.taps = 0; this.caress(); }, 260);
      } else {
        clearTimeout(this.tapTimer);
        this.taps = 0;
        this.feed();
      }
    };

    this.onResize = () => {
      this.x = Math.min(this.x, window.innerWidth - this.size);
      if (this.y > this.ground()) this.y = this.ground();
    };

    this.el.addEventListener('mousedown', this.onDown);
    document.addEventListener('mousemove', this.onMove, true);
    document.addEventListener('mouseup', this.onUp, true);
    window.addEventListener('resize', this.onResize);
  }

  /* ==========================================================
     Actions
     ========================================================== */
  caress() {
    if (this.state === 'sleeping') {
      this.setState('idle');
      this.timer = 800;
      this.say('Hein ? Je dormais pas !', 2000);
      return;
    }
    this.say(pick(LINES.pet), 1800);
    this.particles('💛', 3, -0.25);
    this.jump(0.75);
  }

  jump(power) {
    if (this.state === 'dragged' || this.state === 'eating' || this.inAir()) return;
    const p = power || 1;
    this.vy = -0.55 * p;
    this.vx = this.dir * 0.06 * p;
    this.setState('jumping');
    this.sprite.animate(
      [{ transform: 'scale(.8, 1.25)' }, { transform: 'scale(1.05, .95)' }, { transform: 'scale(1, 1)' }],
      { duration: 280, easing: 'ease-out' }
    );
  }

  /* fait tomber une gamelle du haut de l'ecran */
  feed() {
    if (this.game) return;
    if (this.state === 'eating') { this.say('Attends, je mange ! 😅', 1600); return; }
    if (this.food) { this.say('Y en a deja une !', 1600); return; }

    if (this.state === 'sleeping') this.setState('idle');

    const emoji = FOOD[this.cfg.animal] || '🍎';
    const el = document.createElement('div');
    el.className = 'petpage-food';
    el.textContent = emoji;
    el.style.fontSize = Math.round(this.size * 0.55) + 'px';
    document.body.appendChild(el);

    const spread = 120 + Math.random() * 120;
    const fx = this.x + (Math.random() < 0.5 ? -spread : spread);
    const fSize = this.size * 0.55;

    this.food = {
      el,
      size: fSize,
      x: Math.max(8, Math.min(window.innerWidth - fSize - 8, fx)),
      y: -fSize,
      vy: 0,
      landed: false
    };
    this.drawFood();

    this.say(pick(LINES.hungry), 1800);
    this.idleFor = 0;
  }

  eat() {
    this.setState('eating');
    this.eatTimer = 900;
    this.vx = 0;

    this.sprite.animate(
      [{ transform: 'scale(1,1)' }, { transform: 'scale(1.15,.85)' }, { transform: 'scale(.92,1.08)' },
       { transform: 'scale(1.12,.9)' }, { transform: 'scale(1,1)' }],
      { duration: 900, easing: 'ease-in-out' }
    );

    const f = this.food;
    f.el.animate(
      [{ transform: 'scale(1) rotate(0deg)', opacity: 1 },
       { transform: 'scale(1.25) rotate(-12deg)', opacity: 1, offset: 0.3 },
       { transform: 'scale(0) rotate(20deg)', opacity: 0 }],
      { duration: 700, easing: 'ease-in' }
    );
    setTimeout(() => f.el.remove(), 680);
    this.food = null;

    this.particles('✨', 5, -0.2);
    setTimeout(() => {
      this.particles('💛', 4, -0.28);
      this.say(pick(LINES.full), 2200);
    }, 700);

    chrome.storage.local.get({ meals: 0 }, r => {
      chrome.storage.local.set({ meals: (r.meals || 0) + 1 });
    });
  }

  particles(emoji, count, rise) {
    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.className = 'petpage-particle';
      p.textContent = emoji;
      p.style.fontSize = Math.round(this.size * 0.3) + 'px';
      p.style.left = (this.x + this.size / 2) + 'px';
      p.style.top = (this.y + this.size * 0.2) + 'px';
      document.body.appendChild(p);

      const dx = (Math.random() - 0.5) * this.size * 1.6;
      const dy = (rise || -0.25) * 220 - Math.random() * 40;
      p.animate(
        [{ transform: 'translate(-50%, 0) scale(.5)', opacity: 0 },
         { transform: 'translate(-50%, ' + dy * 0.4 + 'px) scale(1)', opacity: 1, offset: 0.35 },
         { transform: 'translate(calc(-50% + ' + dx + 'px), ' + dy + 'px) scale(.7)', opacity: 0 }],
        { duration: 900 + Math.random() * 400, easing: 'ease-out' }
      );
      setTimeout(() => p.remove(), 1300);
    }
  }

  /* ==========================================================
     Bulles
     ========================================================== */
  say(text, ms) {
    if (!this.cfg.chatty || this.game) return;
    this.bubble.textContent = text;
    this.bubble.classList.add('is-visible');
    this.positionBubble();
    clearTimeout(this.bubbleTimer);
    this.bubbleTimer = setTimeout(() => this.hideBubble(), ms || 2000);
  }

  hideBubble() { this.bubble.classList.remove('is-visible'); }

  positionBubble() {
    if (!this.bubble.classList.contains('is-visible')) return;
    const w = this.bubble.offsetWidth || 100;
    const left = Math.max(4, Math.min(window.innerWidth - w - 4, this.x - 8));
    this.bubble.style.left = left + 'px';
    this.bubble.style.top = Math.max(4, this.y - 34) + 'px';
  }

  /* ==========================================================
     Machine a etats
     ========================================================== */
  setState(s) {
    if (this.state === s) return;
    this.state = s;
    this.el.classList.remove('is-idle', 'is-walking', 'is-sleeping', 'is-eating', 'is-air');
    if (s === 'idle') this.el.classList.add('is-idle');
    if (s === 'walking' || s === 'following' || s === 'seeking') this.el.classList.add('is-walking');
    if (s === 'sleeping') this.el.classList.add('is-sleeping');
    if (s === 'eating') this.el.classList.add('is-eating');
    if (this.inAir()) this.el.classList.add('is-air');
  }

  think(dt) {
    this.timer -= dt;
    if (this.timer > 0) return;

    if (this.state === 'idle') {
      this.idleFor += 1;

      if (Math.random() < 0.15) {           /* saut spontane */
        this.jump(0.9);
        if (this.cfg.chatty && Math.random() < 0.4) this.say(pick(LINES.jump), 1400);
        this.timer = 900;
        return;
      }
      if (this.idleFor > 3 && Math.random() < 0.4) {
        this.setState('sleeping');
        this.say(pick(LINES.sleep), 2500);
        this.timer = 6000 + Math.random() * 6000;
        return;
      }
      if (this.cfg.chatty && Math.random() < 0.3) this.say(pick(LINES.bored), 2400);

      this.dir = Math.random() < 0.5 ? -1 : 1;
      this.setState('walking');
      this.timer = 1200 + Math.random() * 2200;

    } else if (this.state === 'walking') {
      this.setState('idle');
      this.idleFor = 0;
      this.timer = 1000 + Math.random() * 2500;

    } else if (this.state === 'sleeping') {
      this.setState('idle');
      this.idleFor = 0;
      this.timer = 800;
    }
  }

  /* ==========================================================
     Boucle
     ========================================================== */
  update(dt) {
    this.updateFood(dt);

    if (this.state === 'dragged') { this.render(); return; }

    if (this.inAir()) {
      this.vy += GRAVITY * dt;
      this.x += this.vx * dt;
      this.y += this.vy * dt;

      if (this.x <= 0 || this.x >= window.innerWidth - this.size) this.vx *= -0.6;

      const g = this.ground();
      if (this.y >= g) {
        this.y = g;
        this.vy = 0;
        this.vx = 0;
        this.setState('idle');
        this.timer = 600;
        this.squash();
      }
      this.clamp();
      this.render();
      return;
    }

    if (this.state === 'eating') {
      this.eatTimer -= dt;
      if (this.eatTimer <= 0) { this.setState('idle'); this.timer = 900; }
      this.render();
      return;
    }

    if (this.food) {
      const target = this.food.x + this.food.size / 2;
      const dx = target - (this.x + this.size / 2);

      if (Math.abs(dx) < this.size * 0.45 && this.food.landed) { this.eat(); this.render(); return; }

      this.setState('seeking');
      this.dir = dx > 0 ? 1 : -1;
      this.x += this.dir * 0.34 * this.cfg.speed * dt;
      this.idleFor = 0;
      this.clamp();
      this.render();
      return;
    }

    if (this.cfg.follow && this.mouse.seen) {
      const dx = this.mouse.x - (this.x + this.size / 2);
      if (Math.abs(dx) > this.size * 1.5) {
        if (this.state !== 'following') {
          this.setState('following');
          if (Math.random() < 0.2) this.say(pick(LINES.follow), 1600);
        }
        this.dir = dx > 0 ? 1 : -1;
        this.x += this.dir * 0.32 * this.cfg.speed * dt;
        this.idleFor = 0;
        this.timer = 900;

        if (this.mouse.y < this.y - this.size && Math.random() < 0.012) this.jump(1.1);

        this.clamp();
        this.render();
        return;
      }
      if (this.state === 'following') { this.setState('idle'); this.timer = 1200; }
    }

    this.think(dt);

    if (this.state === 'walking') {
      this.x += this.dir * 0.16 * this.cfg.speed * dt;
      if (this.x < 0 || this.x > window.innerWidth - this.size) this.dir *= -1;
    }

    this.clamp();
    this.render();
  }

  updateFood(dt) {
    const f = this.food;
    if (!f || f.landed) return;

    f.vy += GRAVITY * dt;
    f.y += f.vy * dt;

    const g = window.innerHeight - f.size - 6;
    if (f.y >= g) {
      f.y = g;
      f.landed = true;
      f.el.animate(
        [{ transform: 'scale(1.3, .7)' }, { transform: 'scale(.9, 1.1)' }, { transform: 'scale(1, 1)' }],
        { duration: 240, easing: 'ease-out' }
      );
    }
    this.drawFood();
  }

  drawFood() {
    if (!this.food) return;
    this.food.el.style.left = this.food.x + 'px';
    this.food.el.style.top = this.food.y + 'px';
  }

  clamp() {
    this.x = Math.max(0, Math.min(window.innerWidth - this.size, this.x));
    this.y = Math.max(0, Math.min(this.ground(), this.y));
  }

  squash() {
    this.sprite.animate(
      [{ transform: 'scale(1.2, .8)' }, { transform: 'scale(.95, 1.05)' }, { transform: 'scale(1, 1)' }],
      { duration: 260, easing: 'ease-out' }
    );
  }

  render() {
    this.el.style.left = this.x + 'px';
    this.el.style.top = this.y + 'px';
    this.sprite.style.transform = this.dir < 0 ? 'scaleX(-1)' : 'scaleX(1)';
    this.positionBubble();
  }

  loop(t) {
    const dt = Math.min(t - this.last, 60);
    this.last = t;
    if (this.game) this.game.update(dt);
    else this.update(dt);
    this.raf = requestAnimationFrame(this.loop);
  }

  /* ---------- mise a jour depuis le popup ---------- */
  refresh(config) {
    this.cfg = config;
    this.sprite.textContent = config.animal;
    this.el.title = config.petName + ' — 1 clic : caresse • 2 clics : nourrir • glisser : attraper';
    this.applySize();
    this.clamp();
    this.render();
  }

  destroy() {
    if (this.game) this.game.destroy();
    cancelAnimationFrame(this.raf);
    this.el.removeEventListener('mousedown', this.onDown);
    document.removeEventListener('mousemove', this.onMove, true);
    document.removeEventListener('mouseup', this.onUp, true);
    window.removeEventListener('resize', this.onResize);
    clearTimeout(this.bubbleTimer);
    clearTimeout(this.tapTimer);
    if (this.food) this.food.el.remove();
    this.el.remove();
    this.bubble.remove();
  }
}

/* ============================================================
   Les mini-jeux
   ============================================================ */
const GAME_META = {
  treats: {
    name: 'Attrape les friandises', icon: '🍬',
    help: 'Bouge la souris : ton compagnon te suit. Rattrape tout avant que ça touche le sol !'
  },
  runner: {
    name: 'Saute les obstacles', icon: '🌵',
    help: 'Espace ou clic pour sauter. Ça va de plus en plus vite.'
  },
  race: {
    name: 'La grande course', icon: '🏁',
    help: 'Clique ou tape Espace le plus vite possible pour battre le rival !'
  }
};

const TREATS = ['🍬', '🍭', '🍪', '🧁', '🍩', '🍎', '🍓', '🥨'];
const ROCKS  = ['🌵', '🪨', '📦', '🔥', '🧱'];

class PetGame {
  constructor(pet, id) {
    this.pet = pet;
    this.id = id;
    this.meta = GAME_META[id];

    this.score = 0;
    this.lives = 3;
    this.time = 0;
    this.ended = false;
    this.items = [];
    this.spawnIn = 700;
    this.speed = 0.32;
    this.vy = 0;
    this.onGround = true;

    this.best = (pet.cfg.petScores && pet.cfg.petScores[id]) || 0;

    this.buildUI();
    this.bind();
    this.setup();
  }

  /* ---------- interface ---------- */
  buildUI() {
    this.shield = document.createElement('div');
    this.shield.className = 'petpage-shield';

    this.hud = document.createElement('div');
    this.hud.className = 'petpage-hud';
    this.hud.innerHTML =
      '<span class="pg-title"></span>' +
      '<span class="pg-stat pg-score"></span>' +
      '<span class="pg-stat pg-extra"></span>' +
      '<button class="pg-quit" type="button">Quitter</button>';

    this.tip = document.createElement('div');
    this.tip.className = 'petpage-tip';
    this.tip.textContent = this.meta.help;

    document.body.append(this.shield, this.hud, this.tip);

    this.hud.querySelector('.pg-title').textContent = this.meta.icon + ' ' + this.meta.name;
    this.hud.querySelector('.pg-quit').addEventListener('click', () => this.destroy());

    setTimeout(() => this.tip.classList.add('is-gone'), 4000);
    this.drawHud();
  }

  drawHud() {
    this.hud.querySelector('.pg-score').textContent = 'Score ' + Math.round(this.score);
    const extra = this.hud.querySelector('.pg-extra');
    if (this.id === 'treats') extra.textContent = '❤️'.repeat(Math.max(0, this.lives));
    else if (this.id === 'runner') extra.textContent = 'Record ' + this.best;
    else extra.textContent = (this.time / 1000).toFixed(1) + ' s';
  }

  bind() {
    this.onKey = e => {
      if (e.key === 'Escape') { this.destroy(); return; }
      if (e.key === ' ' || e.key === 'ArrowUp') {
        e.preventDefault();
        this.action();
      }
    };
    this.onClick = e => {
      if (e.target.closest('.petpage-hud, .petpage-card')) return;
      e.preventDefault();
      this.action();
    };
    document.addEventListener('keydown', this.onKey, true);
    this.shield.addEventListener('mousedown', this.onClick);
  }

  action() {
    if (this.ended) return;
    if (this.id === 'runner' && this.onGround) {
      this.vy = -0.62;
      this.onGround = false;
      this.pet.el.classList.add('is-air');
    }
    if (this.id === 'race') {
      this.pet.x += 9;
      this.pet.dir = 1;
      this.pet.el.classList.add('is-walking');
    }
  }

  /* ---------- mise en place ---------- */
  setup() {
    const p = this.pet;
    p.hideBubble();
    p.setState('idle');
    p.el.classList.remove('is-sleeping', 'is-eating');
    if (p.food) { p.food.el.remove(); p.food = null; }

    p.y = p.ground();
    p.dir = 1;

    if (this.id === 'treats') p.x = window.innerWidth / 2;
    if (this.id === 'runner') p.x = window.innerWidth * 0.16;

    if (this.id === 'race') {
      p.x = 24;
      this.finishX = window.innerWidth - 90;

      this.rival = document.createElement('div');
      this.rival.className = 'petpage-rival';
      this.rival.textContent = p.cfg.animal;
      this.rival.style.fontSize = p.size + 'px';
      document.body.appendChild(this.rival);
      this.rivalX = 24;
      /* le rival met environ 9 secondes a parcourir la piste */
      this.rivalSpeed = (this.finishX - 24) / 9000;

      this.flag = document.createElement('div');
      this.flag.className = 'petpage-finish';
      this.flag.textContent = '🏁';
      this.flag.style.left = this.finishX + 'px';
      document.body.appendChild(this.flag);
    }
    p.render();
  }

  /* ---------- boucle ---------- */
  update(dt) {
    if (this.ended) return;
    this.time += dt;

    if (this.id === 'treats') this.updateTreats(dt);
    else if (this.id === 'runner') this.updateRunner(dt);
    else this.updateRace(dt);

    this.pet.render();
    this.drawHud();
  }

  /* --- Attrape les friandises --- */
  updateTreats(dt) {
    const p = this.pet;

    /* le compagnon suit la souris, en plus rapide que d'habitude */
    const target = p.mouse.x - p.size / 2;
    p.x += (target - p.x) * Math.min(1, dt / 90);
    p.x = Math.max(0, Math.min(window.innerWidth - p.size, p.x));
    p.dir = target > p.x ? 1 : -1;
    p.el.classList.add('is-walking');

    this.spawnIn -= dt;
    if (this.spawnIn <= 0) {
      this.spawnIn = Math.max(320, 850 - this.time / 60);
      this.spawn(pick(TREATS), 0.10 + Math.random() * 0.06 + this.time / 900000);
    }

    const catchY = p.y + p.size * 0.35;
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      it.y += it.v * dt;
      it.el.style.top = it.y + 'px';

      const hit = it.y + it.size > catchY &&
                  Math.abs((it.x + it.size / 2) - (p.x + p.size / 2)) < (p.size + it.size) * 0.42;

      if (hit) {
        this.score += 10;
        p.particles('✨', 3, -0.22);
        it.el.remove();
        this.items.splice(i, 1);
      } else if (it.y > window.innerHeight - it.size) {
        this.lives--;
        it.el.animate([{ opacity: 1 }, { opacity: 0, transform: 'scale(.5)' }], { duration: 200 });
        setTimeout(() => it.el.remove(), 190);
        this.items.splice(i, 1);
        if (this.lives <= 0) this.finish('Perdu !');
      }
    }
  }

  /* --- Saute les obstacles --- */
  updateRunner(dt) {
    const p = this.pet;
    const g = p.ground();

    this.speed = 0.30 + this.time / 90000;
    this.score += dt * 0.012;

    if (!this.onGround) {
      this.vy += GRAVITY * dt;
      p.y += this.vy * dt;
      if (p.y >= g) {
        p.y = g;
        this.vy = 0;
        this.onGround = true;
        p.el.classList.remove('is-air');
        p.squash();
      }
    } else {
      p.el.classList.add('is-walking');
    }

    this.spawnIn -= dt;
    if (this.spawnIn <= 0) {
      this.spawnIn = 900 + Math.random() * 900 - Math.min(500, this.time / 40);
      const size = p.size * (0.5 + Math.random() * 0.3);
      const el = document.createElement('div');
      el.className = 'petpage-item';
      el.textContent = pick(ROCKS);
      el.style.fontSize = size + 'px';
      el.style.top = (window.innerHeight - size - 4) + 'px';
      document.body.appendChild(el);
      this.items.push({ el, x: window.innerWidth + size, y: 0, size, v: 0 });
    }

    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      it.x -= this.speed * dt;
      it.el.style.left = it.x + 'px';

      const near = Math.abs((it.x + it.size / 2) - (p.x + p.size / 2)) < (p.size + it.size) * 0.34;
      const low  = p.y > g - it.size * 0.75;
      if (near && low) { this.finish('Aïe ! 💥'); return; }

      if (it.x < -it.size) { it.el.remove(); this.items.splice(i, 1); }
    }
  }

  /* --- La grande course --- */
  updateRace(dt) {
    const p = this.pet;

    this.rivalX += this.rivalSpeed * dt;
    this.rival.style.left = this.rivalX + 'px';
    this.rival.style.top = (p.ground() - p.size * 0.9) + 'px';

    this.score = Math.max(0, Math.round((20000 - this.time) / 100));

    if (p.x >= this.finishX) {
      p.x = this.finishX;
      this.finish('Gagné ! 🏆', true);
    } else if (this.rivalX >= this.finishX) {
      this.score = 0;
      this.finish('Le rival a gagné...');
    }
  }

  spawn(emoji, v) {
    const size = this.pet.size * 0.6;
    const el = document.createElement('div');
    el.className = 'petpage-item';
    el.textContent = emoji;
    el.style.fontSize = size + 'px';
    const x = 20 + Math.random() * (window.innerWidth - size - 40);
    el.style.left = x + 'px';
    el.style.top = '-40px';
    document.body.appendChild(el);
    this.items.push({ el, x, y: -40, size, v });
  }

  /* ---------- fin de partie ---------- */
  finish(msg, won) {
    if (this.ended) return;
    this.ended = true;
    this.score = Math.round(this.score);

    const record = this.score > this.best;
    if (record) {
      const scores = Object.assign({}, this.pet.cfg.petScores || {});
      scores[this.id] = this.score;
      this.pet.cfg.petScores = scores;
      chrome.storage.local.set({ petScores: scores });
      this.best = this.score;
    }

    if (won) this.pet.particles('🎉', 8, -0.3);

    const card = document.createElement('div');
    card.className = 'petpage-card';
    card.innerHTML =
      '<div class="pc-title"></div>' +
      '<div class="pc-score"></div>' +
      '<div class="pc-best"></div>' +
      '<div class="pc-btns">' +
        '<button class="pc-again" type="button">Rejouer</button>' +
        '<button class="pc-close" type="button">Fermer</button>' +
      '</div>';
    card.querySelector('.pc-title').textContent = msg;
    card.querySelector('.pc-score').textContent = this.score + ' points';
    card.querySelector('.pc-best').textContent = record ? '🏆 Nouveau record !' : 'Record : ' + this.best;
    document.body.appendChild(card);
    this.card = card;

    card.querySelector('.pc-again').addEventListener('click', () => {
      const id = this.id, p = this.pet;
      this.destroy();
      p.game = new PetGame(p, id);
    });
    card.querySelector('.pc-close').addEventListener('click', () => this.destroy());
  }

  destroy() {
    document.removeEventListener('keydown', this.onKey, true);
    this.items.forEach(it => it.el.remove());
    this.items = [];
    [this.shield, this.hud, this.tip, this.card, this.rival, this.flag]
      .forEach(el => { if (el) el.remove(); });

    const p = this.pet;
    p.game = null;
    p.el.classList.remove('is-air');
    p.y = p.ground();
    p.setState('idle');
    p.timer = 800;
    p.render();
  }
}

/* ============================================================
   Synchronisation avec les reglages
   ============================================================ */
function activeHere(config) {
  return config.enabled && config.disabledSites.indexOf(location.hostname) === -1;
}

function sync(res) {
  const wasGame = pet && pet.game;
  cfg = Object.assign({}, DEFAULTS, res);
  cfg.disabledSites = cfg.disabledSites || [];
  cfg.petScores = cfg.petScores || { treats: 0, runner: 0, race: 0 };

  if (!activeHere(cfg)) {
    if (pet) { pet.destroy(); pet = null; }
    return;
  }
  if (!pet) pet = new Pet(cfg);
  else if (!wasGame) pet.refresh(cfg);
  else pet.cfg = cfg;   /* partie en cours : on ne bouscule rien */
}

function start() {
  chrome.storage.local.get(DEFAULTS, sync);
}

chrome.storage.onChanged.addListener(() => {
  chrome.storage.local.get(DEFAULTS, sync);
});

/* messages venant du popup */
function handle(msg, respond) {
  if (!pet) {
    respond({ ok: false, reason: activeHere(cfg) ? 'none' : 'off' });
    return;
  }
  if (msg.action === 'feed') pet.feed();
  if (msg.action === 'jump') pet.jump(1.3);
  if (msg.action === 'minigame') {
    if (pet.game) pet.game.destroy();
    pet.game = new PetGame(pet, msg.game);
  }
  respond({ ok: true });
}

chrome.runtime.onMessage.addListener((msg, sender, respond) => {
  if (pet) { handle(msg, respond); return true; }
  chrome.storage.local.get(DEFAULTS, res => { sync(res); handle(msg, respond); });
  return true;
});

if (document.body) start();
else document.addEventListener('DOMContentLoaded', start);

})();
