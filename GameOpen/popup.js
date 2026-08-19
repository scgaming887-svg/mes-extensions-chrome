/* ============================================================
   GameOpen - lanceur d'apps + mini-jeux
   ============================================================ */

const DEFAULT_APPS = [
  { name: 'Roblox',    icon: '🟥', proto: 'roblox://',                 web: 'https://www.roblox.com/home' },
  { name: 'Discord',   icon: '💬', proto: 'discord://',                web: 'https://discord.com/app' },
  { name: 'Steam',     icon: '🎮', proto: 'steam://open/main',         web: 'https://store.steampowered.com' },
  { name: 'Spotify',   icon: '🎵', proto: 'spotify://',                web: 'https://open.spotify.com' },
  { name: 'Epic',      icon: '⚫', proto: 'com.epicgames.launcher://', web: 'https://store.epicgames.com' },
  { name: 'Minecraft', icon: '🟩', proto: 'minecraft://',              web: 'https://www.minecraft.net' },
  { name: 'Twitch',    icon: '🟣', proto: 'twitch://',                 web: 'https://www.twitch.tv' },
  { name: 'VS Code',   icon: '🔵', proto: 'vscode://',                 web: 'https://vscode.dev' },
  { name: 'YouTube',   icon: '▶️', proto: '',                          web: 'https://www.youtube.com' }
];

/* ---------- Onglets ---------- */
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('is-active', t === tab));
    document.querySelectorAll('.panel').forEach(p =>
      p.classList.toggle('is-active', p.id === 'panel-' + tab.dataset.tab));
    if (tab.dataset.tab !== 'games') Game.pause();
  });
});

/* ============================================================
   1. LANCEUR D'APPLICATIONS
   ============================================================ */

const grid = document.getElementById('app-grid');
let apps = [];

function loadApps() {
  chrome.storage.local.get({ apps: DEFAULT_APPS }, res => {
    apps = res.apps;
    renderApps();
  });
}

function saveApps() {
  chrome.storage.local.set({ apps });
  renderApps();
}

function renderApps() {
  grid.innerHTML = '';
  apps.forEach((app, i) => {
    const btn = document.createElement('button');
    btn.className = 'app';
    btn.title = app.proto
      ? 'Clic : ouvrir l’app  •  Clic droit : ' + app.web
      : 'Ouvrir ' + app.web;

    const emoji = document.createElement('span');
    emoji.className = 'emoji';
    emoji.textContent = app.icon || '📦';
    const name = document.createElement('span');
    name.className = 'name';
    name.textContent = app.name;
    btn.append(emoji, name);

    btn.addEventListener('click', () => launch(app, btn));
    btn.addEventListener('contextmenu', e => {
      e.preventDefault();
      if (app.web) chrome.tabs.create({ url: app.web });
    });

    const kill = document.createElement('button');
    kill.className = 'kill';
    kill.textContent = '×';
    kill.title = 'Retirer';
    kill.addEventListener('click', e => {
      e.stopPropagation();
      apps.splice(i, 1);
      saveApps();
    });
    btn.appendChild(kill);
    grid.appendChild(btn);
  });
}

/* Lance un protocole systeme via une iframe cachee : Chrome affiche
   la boite de dialogue "Ouvrir <App> ?" sans quitter le popup.
   Sans protocole defini, on retombe sur le site web.                 */
function launch(app, btn) {
  if (!app.proto) {
    if (app.web) chrome.tabs.create({ url: app.web });
    return;
  }
  const frame = document.createElement('iframe');
  frame.style.display = 'none';
  frame.src = app.proto;
  document.body.appendChild(frame);
  setTimeout(() => frame.remove(), 2000);

  btn.animate(
    [{ transform: 'scale(1)' }, { transform: 'scale(.88)' }, { transform: 'scale(1)' }],
    { duration: 220 }
  );
}

document.getElementById('add-app').addEventListener('click', () => {
  const name  = document.getElementById('new-name').value.trim();
  const icon  = document.getElementById('new-icon').value.trim() || '📦';
  const proto = document.getElementById('new-proto').value.trim();
  const web   = document.getElementById('new-web').value.trim();
  if (!name || (!proto && !web)) return;
  apps.push({ name, icon, proto, web });
  saveApps();
  ['new-name', 'new-icon', 'new-proto', 'new-web'].forEach(id => {
    document.getElementById(id).value = '';
  });
});

document.getElementById('reset-apps').addEventListener('click', () => {
  apps = DEFAULT_APPS.slice();
  saveApps();
});

loadApps();

/* ============================================================
   2. MINI-JEUX (Snake + Casse-brique)
   ============================================================ */

const canvas   = document.getElementById('canvas');
const ctx      = canvas.getContext('2d');
const scoreEl  = document.getElementById('score');
const bestEl   = document.getElementById('best');
const overlay  = document.getElementById('overlay');
const oText    = document.getElementById('overlay-text');
const oBtn     = document.getElementById('overlay-btn');
const controls = document.getElementById('controls');

const W = canvas.width, H = canvas.height;

const Game = {
  current: 'snake',
  running: false,
  raf: null,
  score: 0,
  best: { snake: 0, breakout: 0 },

  select(name) {
    this.stop();
    this.current = name;
    document.querySelectorAll('.chip').forEach(c =>
      c.classList.toggle('is-active', c.dataset.game === name));
    controls.textContent = name === 'snake'
      ? 'Fleches ou WASD pour diriger le serpent.'
      : 'Souris ou fleches pour deplacer la raquette.';
    bestEl.textContent = this.best[name];
    this.score = 0;
    scoreEl.textContent = 0;
    Engines[name].init();
    Engines[name].draw();
    this.showOverlay(name === 'snake' ? 'Snake' : 'Casse-brique', 'Jouer');
  },

  setScore(n) {
    this.score = n;
    scoreEl.textContent = n;
    if (n > this.best[this.current]) {
      this.best[this.current] = n;
      bestEl.textContent = n;
      chrome.storage.local.set({ best: this.best });
    }
  },

  start() {
    this.stop();
    Engines[this.current].init();
    this.setScore(0);
    this.running = true;
    overlay.classList.add('hidden');
    let last = performance.now();
    const loop = t => {
      if (!this.running) return;
      const dt = Math.min(t - last, 100);
      last = t;
      Engines[this.current].update(dt);
      Engines[this.current].draw();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  },

  stop()  { this.running = false; cancelAnimationFrame(this.raf); },
  pause() { this.stop(); },

  over(msg) {
    this.stop();
    this.showOverlay(msg + ' Score : ' + this.score, 'Rejouer');
  },

  showOverlay(text, label) {
    oText.textContent = text;
    oBtn.textContent = label;
    overlay.classList.remove('hidden');
  }
};

/* ---------- Snake ---------- */
const CELL = 16, COLS = W / CELL, ROWS = H / CELL;

const Snake = {
  body: [], dir: { x: 1, y: 0 }, next: { x: 1, y: 0 }, food: null, acc: 0, step: 130,

  init() {
    this.body = [{ x: 5, y: 8 }, { x: 4, y: 8 }, { x: 3, y: 8 }];
    this.dir  = { x: 1, y: 0 };
    this.next = { x: 1, y: 0 };
    this.step = 130;
    this.acc  = 0;
    this.placeFood();
  },

  placeFood() {
    do {
      this.food = { x: (Math.random() * COLS) | 0, y: (Math.random() * ROWS) | 0 };
    } while (this.body.some(s => s.x === this.food.x && s.y === this.food.y));
  },

  update(dt) {
    this.acc += dt;
    if (this.acc < this.step) return;
    this.acc = 0;
    this.dir = this.next;

    const head = { x: this.body[0].x + this.dir.x, y: this.body[0].y + this.dir.y };
    if (head.x < 0 || head.y < 0 || head.x >= COLS || head.y >= ROWS ||
        this.body.some(s => s.x === head.x && s.y === head.y)) {
      Game.over('Perdu !');
      return;
    }
    this.body.unshift(head);

    if (head.x === this.food.x && head.y === this.food.y) {
      Game.setScore(Game.score + 10);
      this.step = Math.max(60, this.step - 3);
      this.placeFood();
    } else {
      this.body.pop();
    }
  },

  draw() {
    ctx.fillStyle = '#0c0d13';
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = 'rgba(255,255,255,.03)';
    for (let i = 1; i < COLS; i++) {
      ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, H); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * CELL); ctx.lineTo(W, i * CELL); ctx.stroke();
    }

    if (this.food) {
      ctx.fillStyle = '#ff6b6b';
      ctx.beginPath();
      ctx.arc(this.food.x * CELL + CELL / 2, this.food.y * CELL + CELL / 2, CELL / 2 - 2, 0, Math.PI * 2);
      ctx.fill();
    }

    this.body.forEach((s, i) => {
      ctx.fillStyle = i === 0 ? '#00d2a0' : 'hsl(165 60% ' + (45 - Math.min(i, 20)) + '%)';
      ctx.fillRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2);
    });
  },

  key(k) {
    const map = {
      ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
      w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0]
    };
    const v = map[k] || map[String(k).toLowerCase()];
    if (!v) return;
    if (v[0] === -this.dir.x && v[1] === -this.dir.y) return; // demi-tour interdit
    this.next = { x: v[0], y: v[1] };
  }
};

/* ---------- Casse-brique ---------- */
const Breakout = {
  pad: { x: W / 2 - 30, w: 60, h: 8, speed: 0 },
  ball: { x: W / 2, y: H - 40, vx: 0.18, vy: -0.24, r: 5 },
  bricks: [],

  init() {
    this.pad = { x: W / 2 - 30, w: 60, h: 8, speed: 0 };
    this.ball = { x: W / 2, y: H - 40, vx: 0.18, vy: -0.24, r: 5 };
    this.bricks = [];
    const cols = 8, rows = 5, bw = W / cols, bh = 14;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        this.bricks.push({ x: c * bw, y: 30 + r * bh, w: bw - 3, h: bh - 3, hue: 260 - r * 28 });
      }
    }
  },

  update(dt) {
    const b = this.ball;
    this.pad.x = Math.max(0, Math.min(W - this.pad.w, this.pad.x + this.pad.speed * dt));

    b.x += b.vx * dt;
    b.y += b.vy * dt;

    if (b.x < b.r || b.x > W - b.r) { b.vx *= -1; b.x = Math.max(b.r, Math.min(W - b.r, b.x)); }
    if (b.y < b.r) { b.vy *= -1; b.y = b.r; }
    if (b.y > H) { Game.over('Balle perdue !'); return; }

    const py = H - 18;
    if (b.y + b.r > py && b.y < py + this.pad.h && b.x > this.pad.x && b.x < this.pad.x + this.pad.w) {
      const hit = (b.x - (this.pad.x + this.pad.w / 2)) / (this.pad.w / 2);
      const sp  = Math.hypot(b.vx, b.vy) * 1.02;
      b.vx = sp * hit * 0.8;
      b.vy = -Math.abs(sp * (1 - Math.abs(hit) * 0.4));
      b.y  = py - b.r;
    }

    for (let i = 0; i < this.bricks.length; i++) {
      const k = this.bricks[i];
      if (b.x > k.x && b.x < k.x + k.w && b.y - b.r < k.y + k.h && b.y + b.r > k.y) {
        this.bricks.splice(i, 1);
        b.vy *= -1;
        Game.setScore(Game.score + 5);
        break;
      }
    }
    if (!this.bricks.length) Game.over('Gagne ! 🎉');
  },

  draw() {
    ctx.fillStyle = '#0c0d13';
    ctx.fillRect(0, 0, W, H);

    this.bricks.forEach(k => {
      ctx.fillStyle = 'hsl(' + k.hue + ' 70% 60%)';
      ctx.fillRect(k.x + 1, k.y, k.w, k.h);
    });

    ctx.fillStyle = '#e8e9f0';
    ctx.fillRect(this.pad.x, H - 18, this.pad.w, this.pad.h);

    ctx.fillStyle = '#00d2a0';
    ctx.beginPath();
    ctx.arc(this.ball.x, this.ball.y, this.ball.r, 0, Math.PI * 2);
    ctx.fill();
  },

  key(k, down) {
    if (k === 'ArrowLeft'  || k === 'a') this.pad.speed = down ? -0.5 : 0;
    if (k === 'ArrowRight' || k === 'd') this.pad.speed = down ?  0.5 : 0;
  }
};

const Engines = { snake: Snake, breakout: Breakout };

/* ---------- Entrees ---------- */
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  if (e.key === ' ') {
    e.preventDefault();
    if (!Game.running) Game.start();
    return;
  }
  if (!Game.running) return;
  if (Engines[Game.current].key) Engines[Game.current].key(e.key, true);
  if (e.key.indexOf('Arrow') === 0) e.preventDefault();
});

document.addEventListener('keyup', e => {
  if (Game.running && Engines[Game.current].key) Engines[Game.current].key(e.key, false);
});

canvas.addEventListener('mousemove', e => {
  if (Game.current !== 'breakout') return;
  const r = canvas.getBoundingClientRect();
  Breakout.pad.x = Math.max(0, Math.min(W - Breakout.pad.w, e.clientX - r.left - Breakout.pad.w / 2));
});

oBtn.addEventListener('click', () => Game.start());

document.querySelectorAll('.chip').forEach(c =>
  c.addEventListener('click', () => Game.select(c.dataset.game)));

chrome.storage.local.get({ best: { snake: 0, breakout: 0 } }, res => {
  Game.best = res.best;
  Game.select('snake');
});
