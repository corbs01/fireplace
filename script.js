import { AmbientAudio, describeMoodAudio } from './audio.js';
import { RainField, applyMoodVisuals, updateGradientForTime, showQuote, setFooterMoodCopy, setNickname, flashWeatherStatus, updateWeatherUI } from './ui.js';
import { storage, getCustomQuotes, setCustomQuotes, getSnippets, setSnippets, getIncludeSnippets, setIncludeSnippets } from './storage.js';
import { fetchWeatherByCity, fetchWeatherByCoords, summariseWeather, DEFAULT_CITY, moodFromCondition } from './weather.js';

console.log('🌧 Keep calm and code on.');

document.body.classList.add('loaded');
const container = document.querySelector('.container');
requestAnimationFrame(() => container?.classList.add('ready'));

const clockEl = document.getElementById('clock');
const cityInput = document.getElementById('cityInput');
const fetchBtn = document.getElementById('fetchBtn');
const geoBtn = document.getElementById('geoBtn');
const audioBtn = document.getElementById('audioBtn');
const audioIcon = document.getElementById('audioIcon');
const audioLabel = document.getElementById('audioLabel');
const moodButtons = Array.from(document.querySelectorAll('.mood-btn'));
const nicknameInput = document.getElementById('nicknameInput');
const saveNicknameBtn = document.getElementById('saveNickname');
const includeSnippetsToggle = document.getElementById('includeSnippets');
const prevQuoteBtn = document.getElementById('prevQuote');
const nextQuoteBtn = document.getElementById('nextQuote');
const refreshQuotesBtn = document.getElementById('refreshQuotes');
const addCustomBtn = document.getElementById('addCustom');
const customInput = document.getElementById('customInput');
const languageSelect = document.getElementById('languageSelect');
const saveSnippetBtn = document.getElementById('saveSnippet');
const clearSnippetBtn = document.getElementById('clearSnippet');

let currentMood = storage.mood || 'rain';
let weatherSuggestsRain = true;
let userInteractedMood = false;

const rainField = new RainField(document.getElementById('rain-canvas'));
const ambientAudio = new AmbientAudio(onAudioStateChange);

const MOOD_INTENSITY = {
  rain: 1,
  storm: 1.4,
  snow: 0.6,
  sunny: 0.2,
};

function onAudioStateChange(enabled) {
  if (enabled) {
    audioBtn.setAttribute('aria-pressed', 'true');
    audioIcon.textContent = '🔊';
    audioLabel.textContent = 'Sound On';
  } else {
    audioBtn.setAttribute('aria-pressed', 'false');
    audioIcon.textContent = '🔇';
    audioLabel.textContent = 'Sound Off';
  }
}

function updateClock() {
  const now = new Date();
  clockEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  updateGradientForTime(currentMood, now);
}
setInterval(updateClock, 60 * 1000);
updateClock();

function setMood(mood, { fromWeather = false } = {}) {
  if (!['rain', 'storm', 'snow', 'sunny'].includes(mood)) mood = 'rain';
  currentMood = mood;
  applyMoodVisuals(mood);
  updateGradientForTime(mood);
  ambientAudio.setMood(mood);
  setFooterMoodCopy(`${mood.charAt(0).toUpperCase() + mood.slice(1)} mood • ${describeMoodAudio(mood)}`);

  moodButtons.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.mood === mood);
  });

  if (!fromWeather) {
    storage.mood = mood;
    userInteractedMood = true;
  }

  const rainActive = weatherSuggestsRain || mood !== 'sunny';
  rainField.setActive(rainActive);
  const intensity = weatherSuggestsRain ? Math.max(1, MOOD_INTENSITY[mood]) : MOOD_INTENSITY[mood];
  rainField.setIntensity(intensity);
}

moodButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    const mood = btn.dataset.mood;
    setMood(mood);
  });
});

function handleWeather(data) {
  const summary = summariseWeather(data);
  updateWeatherUI(summary);
  const isRaining = /rain|drizzle|thunderstorm/.test(summary.condition);
  weatherSuggestsRain = isRaining;
  const suggestedMood = moodFromCondition(summary.condition);
  if (!userInteractedMood) {
    setMood(suggestedMood, { fromWeather: true });
  } else {
    setMood(currentMood, { fromWeather: true });
  }
}

async function getWeatherByCity(city) {
  try {
    const data = await fetchWeatherByCity(city);
    handleWeather(data);
  } catch (err) {
    flashWeatherStatus(err.message || 'Weather unavailable.');
  }
}

async function getWeatherByLocation() {
  if (!navigator.geolocation) {
    alert('Geolocation is not supported in this browser.');
    return;
  }
  navigator.geolocation.getCurrentPosition(async (position) => {
    try {
      const data = await fetchWeatherByCoords(position.coords.latitude, position.coords.longitude);
      handleWeather(data);
      if (data?.name) {
        cityInput.value = data.name;
        storage.city = data.name;
      }
    } catch (err) {
      flashWeatherStatus(err.message || 'Weather unavailable.');
    }
  }, () => {
    alert('Location permission denied.');
  });
}

fetchBtn?.addEventListener('click', () => {
  const city = cityInput.value.trim() || DEFAULT_CITY;
  storage.city = city;
  getWeatherByCity(city);
});

geoBtn?.addEventListener('click', () => {
  getWeatherByLocation();
});

audioBtn?.addEventListener('click', async () => {
  if (ambientAudio.enabled) {
    ambientAudio.disable();
    storage.audio = 'off';
  } else {
    const started = await ambientAudio.enable();
    if (started) {
      storage.audio = 'on';
    }
  }
});

const baseQuotes = [
  { text: 'Simplicity is the soul of efficiency.', by: 'Austin Freeman' },
  { text: 'Code is like poetry—readable and meaningful.', by: 'Unknown' },
  { text: 'Small steps nightly beat big sprints rarely.', by: 'Calm Coder' },
  { text: '// Remember: you’re learning, and that’s enough.', by: 'You' },
  { text: 'Make it work, make it right, make it fast.', by: 'Kent Beck' },
  { text: 'Delete code bravely; clarity loves space.', by: 'Calm Coder' },
  { text: 'Refactor the mind before the code.', by: 'Night Owl' },
  { text: 'Debug patiently. Celebrate quietly. Repeat.', by: 'Rainy Night' },
];

let fetchedQuotes = [];
let rotationItems = [];
let rotationIndex = 0;
let rotationTimer;

function buildRotation() {
  const customs = getCustomQuotes();
  const snippets = getSnippets();
  const includeSnippets = includeSnippetsToggle.checked;
  const snippetItems = includeSnippets
    ? snippets.map((entry) => ({ text: entry.code, by: `Snippet • ${entry.language.toUpperCase()}` }))
    : [];

  rotationItems = [...fetchedQuotes, ...baseQuotes, ...customs, ...snippetItems];
  if (rotationItems.length === 0) {
    rotationItems = [{ text: 'Add your first calming thought →', by: 'Helper' }];
  }
  rotationIndex = rotationIndex % rotationItems.length;
  showRotationItem();
  restartRotationTimer();
}

function showRotationItem() {
  const item = rotationItems[rotationIndex];
  showQuote(item.text, item.by);
}

function nextQuote() {
  rotationIndex = (rotationIndex + 1) % rotationItems.length;
  showRotationItem();
}

function prevQuote() {
  rotationIndex = (rotationIndex - 1 + rotationItems.length) % rotationItems.length;
  showRotationItem();
}

function restartRotationTimer() {
  clearInterval(rotationTimer);
  rotationTimer = setInterval(nextQuote, 15000);
}

prevQuoteBtn?.addEventListener('click', () => {
  prevQuote();
  restartRotationTimer();
});

nextQuoteBtn?.addEventListener('click', () => {
  nextQuote();
  restartRotationTimer();
});

refreshQuotesBtn?.addEventListener('click', async () => {
  await fetchZenQuotes();
});

addCustomBtn?.addEventListener('click', () => {
  const text = customInput.value.trim();
  if (!text) return;
  const quotes = getCustomQuotes();
  quotes.push({ text, by: 'You' });
  setCustomQuotes(quotes);
  customInput.value = '';
  buildRotation();
});

includeSnippetsToggle?.addEventListener('change', () => {
  const checked = includeSnippetsToggle.checked;
  setIncludeSnippets(checked);
  buildRotation();
});

async function fetchZenQuotes() {
  try {
    const response = await fetch('https://zenquotes.io/api/quotes');
    const data = await response.json();
    if (Array.isArray(data)) {
      fetchedQuotes = data.slice(0, 30).map((item) => ({ text: item.q, by: item.a }));
    }
  } catch (err) {
    console.warn('Could not fetch ZenQuotes', err);
    fetchedQuotes = [];
  }
  buildRotation();
}

const defaultSnippet = `// Tonight's tiny win\nconst breathe = (inhale = 4, exhale = 6) => {\n  console.log('inhale…');\n  setTimeout(() => console.log('exhale…'), inhale * 1000);\n};\nbreathe();`;

let editor;
function initEditor() {
  const saved = getSnippets();
  const initial = saved.length ? saved[saved.length - 1].code : defaultSnippet;
  editor = CodeMirror(document.getElementById('editor'), {
    value: initial,
    mode: languageSelect.value,
    theme: 'material-darker',
    lineNumbers: true,
    lineWrapping: true,
    tabSize: 2,
    indentUnit: 2,
    viewportMargin: Infinity,
  });
}

initEditor();

languageSelect?.addEventListener('change', () => {
  editor.setOption('mode', languageSelect.value);
});

saveSnippetBtn?.addEventListener('click', () => {
  const code = editor.getValue().trim();
  if (!code) return;
  const language = languageSelect.value || 'javascript';
  const snippets = getSnippets();
  snippets.push({ code, language, savedAt: new Date().toISOString() });
  setSnippets(snippets.slice(-20));
  buildRotation();
});

clearSnippetBtn?.addEventListener('click', () => {
  editor.setValue('');
  setSnippets([]);
  buildRotation();
});

saveNicknameBtn?.addEventListener('click', () => {
  const name = nicknameInput.value.trim();
  storage.nickname = name;
  setNickname(name);
});

function restoreState() {
  cityInput.value = storage.city || DEFAULT_CITY;
  includeSnippetsToggle.checked = getIncludeSnippets();
  nicknameInput.value = storage.nickname || '';
  setNickname(storage.nickname || '');
  setMood(currentMood, { fromWeather: true });
}

async function init() {
  restoreState();

  if (storage.audio !== 'off') {
    ambientAudio.enable().then((started) => {
      storage.audio = started ? 'on' : 'off';
    });
  }

  await fetchZenQuotes();
  buildRotation();

  await getWeatherByCity(storage.city || DEFAULT_CITY);
}

init();

window.addEventListener('focus', () => updateGradientForTime(currentMood));

document.addEventListener('visibilitychange', () => {
  if (document.hidden && ambientAudio.enabled) {
    ambientAudio.disable();
  } else if (!document.hidden && storage.audio !== 'off') {
    ambientAudio.enable();
  }
});
