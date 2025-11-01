const rootStyle = document.documentElement.style;
const bgEl = document.getElementById('bg-gradient');
const mistEl = document.getElementById('mist');
const glowEl = document.getElementById('glow');

const MOOD_THEMES = {
  rain: {
    accent: '#6bb4ff',
    accentSoft: 'rgba(107, 180, 255, 0.25)',
    mist: 0.35,
    glow: 0.55,
    gradients: {
      night: ['#0d1b2a', '#162a45', '#274b74'],
      dawn: ['#16223a', '#274a74', '#45688f'],
      day: ['#1a3050', '#2d4a7a', '#4f75a3'],
      dusk: ['#141f35', '#2b3f66', '#433b62'],
    },
  },
  storm: {
    accent: '#9f84ff',
    accentSoft: 'rgba(159, 132, 255, 0.25)',
    mist: 0.45,
    glow: 0.35,
    gradients: {
      night: ['#080b16', '#151d2f', '#2f3355'],
      dawn: ['#14192a', '#2c3556', '#443a70'],
      day: ['#1f2742', '#333660', '#514483'],
      dusk: ['#0d1222', '#262c4a', '#443466'],
    },
  },
  snow: {
    accent: '#b5f1ff',
    accentSoft: 'rgba(181, 241, 255, 0.25)',
    mist: 0.55,
    glow: 0.25,
    gradients: {
      night: ['#0b1a2b', '#12344d', '#3b6287'],
      dawn: ['#11304a', '#2e5675', '#6ea1c4'],
      day: ['#1b4764', '#3b6b8d', '#8db7d0'],
      dusk: ['#0e263c', '#2a4d6c', '#5f7fa0'],
    },
  },
  sunny: {
    accent: '#f5d48e',
    accentSoft: 'rgba(245, 212, 142, 0.28)',
    mist: 0.25,
    glow: 0.8,
    gradients: {
      night: ['#130f24', '#2a1742', '#4c2c5e'],
      dawn: ['#2a1c38', '#5c3f64', '#ffb577'],
      day: ['#1f2a54', '#355c86', '#f2aa65'],
      dusk: ['#1b1838', '#503561', '#f49768'],
    },
  },
};

function lerpColor(a, b, t) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ar = (pa >> 16) & 255;
  const ag = (pa >> 8) & 255;
  const ab = pa & 255;
  const br = (pb >> 16) & 255;
  const bg = (pb >> 8) & 255;
  const bb = pb & 255;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const b = Math.round(ab + (bb - ab) * t);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function mixGradient(palette, t) {
  const stages = ['night', 'dawn', 'day', 'dusk'];
  const segment = Math.floor(t * stages.length);
  const localT = (t * stages.length) - segment;
  const fromKey = stages[segment % stages.length];
  const toKey = stages[(segment + 1) % stages.length];
  const from = palette[fromKey];
  const to = palette[toKey];
  const colours = from.map((color, idx) => lerpColor(color, to[idx], localT));
  return `radial-gradient(circle at 20% 20%, ${colours[2]}33, transparent 60%), radial-gradient(circle at 80% 10%, ${colours[1]}30, transparent 55%), linear-gradient(140deg, ${colours[0]} 0%, ${colours[1]} 55%, ${colours[2]} 100%)`;
}

export function applyMoodVisuals(mood) {
  const theme = MOOD_THEMES[mood] || MOOD_THEMES.rain;
  rootStyle.setProperty('--accent', theme.accent);
  rootStyle.setProperty('--accent-soft', theme.accentSoft);
  mistEl.style.opacity = theme.mist;
  glowEl.style.opacity = theme.glow;
}

export function updateGradientForTime(mood, date = new Date()) {
  const theme = MOOD_THEMES[mood] || MOOD_THEMES.rain;
  const hour = date.getHours() + date.getMinutes() / 60;
  const t = hour / 24; // 0..1
  const gradient = mixGradient(theme.gradients, t);
  rootStyle.setProperty('--bg-gradient', gradient);
  if (bgEl) bgEl.style.background = gradient;
}

export class RainField {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.drops = [];
    this.active = true;
    this.speedMultiplier = 1;
    this.resize = this.resize.bind(this);
    this.animate = this.animate.bind(this);
    window.addEventListener('resize', this.resize);
    this.resize();
    this.populate(300);
    requestAnimationFrame(this.animate);
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  populate(count) {
    this.drops = Array.from({ length: count }, () => this.makeDrop());
  }

  makeDrop() {
    return {
      x: Math.random() * this.canvas.width,
      y: Math.random() * this.canvas.height,
      len: 8 + Math.random() * 22,
      speed: 4 + Math.random() * 6,
      width: 0.8 + Math.random() * 1.2,
      alpha: 0.2 + Math.random() * 0.4,
    };
  }

  setActive(flag) {
    this.active = flag;
    if (flag && this.drops.length < 150) this.populate(180);
  }

  setIntensity(multiplier) {
    this.speedMultiplier = multiplier;
    const target = Math.floor(220 * multiplier);
    if (target > this.drops.length) {
      this.drops.push(...Array.from({ length: target - this.drops.length }, () => this.makeDrop()));
    } else if (target < this.drops.length) {
      this.drops.length = target;
    }
  }

  animate() {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (this.active) {
      ctx.strokeStyle = 'rgba(200, 220, 255, 0.7)';
      ctx.lineCap = 'round';
      for (const drop of this.drops) {
        ctx.globalAlpha = drop.alpha;
        ctx.lineWidth = drop.width;
        ctx.beginPath();
        ctx.moveTo(drop.x, drop.y);
        ctx.lineTo(drop.x + 0.4 * drop.len, drop.y + drop.len);
        ctx.stroke();

        drop.x += 0.4 * drop.speed * this.speedMultiplier;
        drop.y += drop.speed * this.speedMultiplier * 2.4;
        if (drop.y > canvas.height + 20) {
          drop.y = -20;
          drop.x = Math.random() * canvas.width;
        }
      }
      ctx.globalAlpha = 1;
    }
    requestAnimationFrame(this.animate);
  }
}

export function showQuote(text, by) {
  const quoteEl = document.getElementById('quote');
  const metaEl = document.getElementById('quoteMeta');
  if (!quoteEl || !metaEl) return;
  quoteEl.classList.remove('visible');
  void quoteEl.offsetWidth; // trigger reflow for animation restart
  quoteEl.textContent = text;
  quoteEl.classList.add('visible');
  metaEl.textContent = by ? `— ${by}` : '';
}

export function setFooterMoodCopy(copy) {
  const footer = document.getElementById('footerMood');
  if (footer) footer.textContent = copy;
}

export function setNickname(name) {
  const display = document.getElementById('nicknameDisplay');
  if (display) display.textContent = name ? `${name}'s desk` : '';
}

export function flashWeatherStatus(message) {
  const descEl = document.getElementById('desc');
  if (descEl) descEl.textContent = message;
}

export function updateWeatherUI(summary) {
  if (!summary) return;
  const cityEl = document.getElementById('city');
  const condEl = document.getElementById('cond');
  const tempEl = document.getElementById('temp');
  const descEl = document.getElementById('desc');
  const humidityEl = document.getElementById('humidity');
  const feelsLikeEl = document.getElementById('feelsLike');
  const windEl = document.getElementById('wind');
  const iconEl = document.getElementById('weatherIcon');

  cityEl.textContent = summary.name;
  condEl.textContent = summary.condition || '—';
  tempEl.textContent = Number.isFinite(summary.temp) ? summary.temp : '--';
  descEl.textContent = summary.description || '';
  humidityEl.textContent = summary.humidity ?? '--';
  feelsLikeEl.textContent = Number.isFinite(summary.feelsLike) ? summary.feelsLike : '--';
  windEl.textContent = summary.wind ?? '--';
  if (iconEl) iconEl.textContent = summary.icon;
}
