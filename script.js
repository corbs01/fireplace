/* =============================
   Rainy-Night Dashboard (Vanilla JS)
   — ambient visuals + procedural rain audio + live weather + quotes/snippets
   ============================= */

// ---------- CONFIG ----------
const OPENWEATHER_API_KEY = "YOUR_OPENWEATHER_API_KEY_HERE"; // <-- add your key
const DEFAULT_CITY = "Christchurch"; // gentle NZ default for you :)

// ---------- DOM ----------
const canvas = document.getElementById('rain-canvas');
const ctx = canvas.getContext('2d');
const moodBtn = document.getElementById('moodBtn');
const moodLabel = document.getElementById('moodLabel');
const audioBtn = document.getElementById('audioBtn');
const audioIcon = document.getElementById('audioIcon');
const audioLabel = document.getElementById('audioLabel');
const clockEl = document.getElementById('clock');

const cityEl = document.getElementById('city');
const condEl = document.getElementById('cond');
const tempEl = document.getElementById('temp');
const descEl = document.getElementById('desc');

const cityInput = document.getElementById('cityInput');
const fetchBtn = document.getElementById('fetchBtn');
const geoBtn = document.getElementById('geoBtn');

const quoteEl = document.getElementById('quote');
const quoteMeta = document.getElementById('quoteMeta');
const prevQuote = document.getElementById('prevQuote');
const nextQuote = document.getElementById('nextQuote');

const snippetEl = document.getElementById('snippet');
const snippetInput = document.getElementById('snippetInput');
const saveSnippetBtn = document.getElementById('saveSnippet');
const includeSnippets = document.getElementById('includeSnippets');
const addCustomBtn = document.getElementById('addCustom');
const customInput = document.getElementById('customInput');

// ---------- CLOCK ----------
function updateClock(){
  const now = new Date();
  const opts = {hour:'2-digit', minute:'2-digit'};
  clockEl.textContent = now.toLocaleTimeString([], opts);
}
setInterval(updateClock, 1000); updateClock();

// ---------- MOOD ----------
const MOODS = ['Rain','Calm','Night','Clear'];
let moodIndex = 0;
function setMood(idx){
  moodIndex = (idx+MOODS.length)%MOODS.length;
  moodLabel.textContent = MOODS[moodIndex];
  document.documentElement.style.setProperty('--accent', ['#FFCFA3','#CFFFB0','#B8C7FF','#FFD28D'][moodIndex]);
  document.documentElement.style.setProperty('--accent-2', ['#8DA9C4','#98B2A6','#9AA6E0','#7EC8E3'][moodIndex]);
}
moodBtn.addEventListener('click', ()=> setMood(moodIndex+1));
setMood(0);

// ---------- CANVAS RAIN ----------
let W = 0, H = 0, drops = [], raining = true;
function resize(){
  W = canvas.width = window.innerWidth;
  H = canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize); resize();

function makeDrops(count){
  drops = [];
  for(let i=0;i<count;i++){
    drops.push({
      x: Math.random()*W,
      y: Math.random()*H,
      len: 10 + Math.random()*20,
      spd: 0.5 + Math.random()*1.5,
      thick: 0.6 + Math.random()*1.1,
      alpha: 0.2 + Math.random()*0.3
    });
  }
}
makeDrops(240);

function render(){
  ctx.clearRect(0,0,W,H);
  if(raining){
    ctx.strokeStyle = 'rgba(200,220,255,0.6)';
    ctx.lineCap = 'round';
    for(const d of drops){
      ctx.globalAlpha = d.alpha;
      ctx.lineWidth = d.thick;
      ctx.beginPath();
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x+0.6*d.len, d.y+d.len);
      ctx.stroke();

      d.x += 0.2*d.spd; d.y += 3.2*d.spd;
      if(d.y > H+20){ d.y = -20; d.x = Math.random()*W; }
    }
    ctx.globalAlpha = 1;
  }
  requestAnimationFrame(render);
}
render();

// ---------- PROCEDURAL RAIN AUDIO (Web Audio API) ----------
let audioCtx, gainNode, filterNode, noiseNode;
let audioEnabled = false;

function createRain(){
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  // Pink-ish noise buffer
  const bufferSize = 2 * audioCtx.sampleRate;
  const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const out = noiseBuffer.getChannelData(0);

  // Voss-McCartney style pink-ish noise approximation
  let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
  for (let i=0; i<bufferSize; i++) {
    const white = Math.random()*2-1;
    b0 = 0.99886*b0 + white*0.0555179;
    b1 = 0.99332*b1 + white*0.0750759;
    b2 = 0.96900*b2 + white*0.1538520;
    b3 = 0.86650*b3 + white*0.3104856;
    b4 = 0.55000*b4 + white*0.5329522;
    b5 = -0.7616*b5 - white*0.0168980;
    const pink = b0+b1+b2+b3+b4+b5+b6 + white*0.5362;
    b6 = white*0.115926;
    out[i] = pink*0.09; // base amplitude
  }

  noiseNode = audioCtx.createBufferSource();
  noiseNode.buffer = noiseBuffer;
  noiseNode.loop = true;

  filterNode = audioCtx.createBiquadFilter();
  filterNode.type = 'lowpass';
  filterNode.frequency.value = 2200; // soft rain
  filterNode.Q.value = 0.0001;

  gainNode = audioCtx.createGain();
  gainNode.gain.value = 0.28; // gentle volume

  noiseNode.connect(filterNode).connect(gainNode).connect(audioCtx.destination);
}

async function enableAudio(){
  if(!audioCtx){ createRain(); }
  if(audioCtx.state === 'suspended') await audioCtx.resume();
  noiseNode.start(0);
  audioEnabled = true;
  audioBtn.setAttribute('aria-pressed','true');
  audioIcon.textContent = '🔊';
  audioLabel.textContent = 'Sound On';
}

async function disableAudio(){
  if(!audioCtx) return;
  try{ noiseNode.stop(); }catch{}
  audioEnabled = false;
  audioBtn.setAttribute('aria-pressed','false');
  audioIcon.textContent = '🔇';
  audioLabel.textContent = 'Sound Off';
  // Recreate on next start (BufferSource can’t be restarted)
  noiseNode.disconnect();
  createRain();
}

audioBtn.addEventListener('click', ()=>{
  if(audioEnabled) disableAudio(); else enableAudio();
  localStorage.setItem('ambientAudio', audioEnabled ? 'on' : 'off');
});

// ---------- WEATHER ----------
async function fetchWeatherByCity(city){
  if(!OPENWEATHER_API_KEY || OPENWEATHER_API_KEY.includes('YOUR_')){
    descEl.textContent = 'Add your OPENWEATHER_API_KEY in script.js';
    return;
  }
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${OPENWEATHER_API_KEY}&units=metric`;
  const res = await fetch(url);
  if(!res.ok){ throw new Error('Weather fetch failed'); }
  return res.json();
}

async function fetchWeatherByCoords(lat, lon){
  if(!OPENWEATHER_API_KEY || OPENWEATHER_API_KEY.includes('YOUR_')){
    descEl.textContent = 'Add your OPENWEATHER_API_KEY in script.js';
    return;
  }
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric`;
  const res = await fetch(url);
  if(!res.ok){ throw new Error('Weather fetch failed'); }
  return res.json();
}

function applyWeather(data){
  if(!data) return;
  const name = data.name;
  const temp = Math.round(data.main?.temp ?? 0);
  const cond = (data.weather?.[0]?.main || '').toLowerCase();
  const desc = data.weather?.[0]?.description || '';

  cityEl.textContent = name || '—';
  tempEl.textContent = isFinite(temp) ? temp : '--';
  condEl.textContent = cond || '—';
  descEl.textContent = desc;

  const rainingNow = /rain|drizzle|thunderstorm/.test(cond);
  setRaining(rainingNow);
  if(rainingNow){
    // gentle bump in volume + denser drops
    if(audioEnabled){ gainNode.gain.linearRampToValueAtTime(0.35, audioCtx.currentTime+1); }
    makeDrops(320);
  }else{
    if(audioEnabled){ gainNode.gain.linearRampToValueAtTime(0.22, audioCtx.currentTime+1); }
    makeDrops(180);
  }
}

function setRaining(is){
  raining = is;
  document.getElementById('mist').style.opacity = is ? 0.25 : 0.35;
}

fetchBtn.addEventListener('click', async ()=>{
  const city = cityInput.value.trim() || DEFAULT_CITY;
  localStorage.setItem('city', city);
  try{ const data = await fetchWeatherByCity(city); applyWeather(data); }
  catch{ descEl.textContent = 'Could not get weather (city)'; }
});

geoBtn.addEventListener('click', ()=>{
  if(!navigator.geolocation){ alert('Geolocation not supported'); return; }
  navigator.geolocation.getCurrentPosition(async (pos)=>{
    try{
      const data = await fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude);
      applyWeather(data);
      localStorage.setItem('city', data?.name || '');
      cityInput.value = data?.name || '';
    }catch{ descEl.textContent = 'Could not get weather (location)'; }
  }, ()=> alert('Location permission denied'));
});

// ---------- QUOTES / AFFIRMATIONS / SNIPPETS ----------
const baseQuotes = [
  { text: "Simplicity is the soul of efficiency.", by: "Austin Freeman" },
  { text: "Code is like poetry—readable and meaningful.", by: "Unknown" },
  { text: "Small steps nightly beat big sprints rarely.", by: "Calm Coder" },
  { text: "// Remember: you’re learning, and that’s enough.", by: "You" },
  { text: "Make it work, make it right, make it fast.", by: "Kent Beck" },
  { text: "Delete code bravely; clarity loves space.", by: "Calm Coder" },
];

function getCustomQuotes(){ return JSON.parse(localStorage.getItem('customQuotes')||'[]'); }
function setCustomQuotes(arr){ localStorage.setItem('customQuotes', JSON.stringify(arr)); }
function getProudSnippets(){ return JSON.parse(localStorage.getItem('proudSnippets')||'[]'); }

let allItems = [];
let idx = 0;
let rotTimer;

function rebuildRotation(){
  allItems = [...baseQuotes, ...getCustomQuotes()];
  if(includeSnippets.checked){
    const snips = getProudSnippets().map(s => ({text:s, by:"Snippet"}));
    allItems = [...allItems, ...snips];
  }
  if(allItems.length === 0){
    allItems = [{text:"Add your first calming thought on the right →", by:"Helper"}];
  }
  idx = Math.min(idx, allItems.length-1);
  showCurrent();
}

function showCurrent(){
  const item = allItems[idx];
  quoteEl.textContent = item.text;
  quoteMeta.textContent = item.by ? `— ${item.by}` : '';
}

function next(){ idx = (idx+1)%allItems.length; showCurrent(); }
function prev(){ idx = (idx-1+allItems.length)%allItems.length; showCurrent(); }

prevQuote.addEventListener('click', prev);
nextQuote.addEventListener('click', next);

function startRotation(){
  if(rotTimer) clearInterval(rotTimer);
  rotTimer = setInterval(next, 16000);
}

addCustomBtn.addEventListener('click', ()=>{
  const t = customInput.value.trim();
  if(!t) return;
  const arr = getCustomQuotes();
  arr.push({text:t, by:"You"});
  setCustomQuotes(arr);
  customInput.value = '';
  rebuildRotation();
});

saveSnippetBtn.addEventListener('click', ()=>{
  const s = snippetInput.value.trim();
  if(!s) return;
  const arr = getProudSnippets();
  arr.push(s);
  localStorage.setItem('proudSnippets', JSON.stringify(arr));
  snippetEl.textContent = s;
  snippetInput.value = '';
  rebuildRotation();
});

includeSnippets.addEventListener('change', ()=>{
  localStorage.setItem('includeSnippets', includeSnippets.checked ? '1' : '0');
  rebuildRotation();
});

// ---------- INIT ----------
(async function init(){
  // restore prefs
  const savedCity = localStorage.getItem('city') || DEFAULT_CITY;
  cityInput.value = savedCity;
  includeSnippets.checked = localStorage.getItem('includeSnippets') === '1';

  const audioPref = localStorage.getItem('ambientAudio') || 'on';
  if (audioPref === 'on') {
    try { await enableAudio(); } catch { /* user gesture needed; button will work */ }
  }

  rebuildRotation(); startRotation();

  // try weather
  try{
    const data = await fetchWeatherByCity(savedCity);
    applyWeather(data);
  }catch{
    descEl.textContent = 'Weather unavailable (city). You can still enjoy the vibes.';
    setRaining(true);
  }
})();
