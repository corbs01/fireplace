export const OPENWEATHER_API_KEY = 'YOUR_OPENWEATHER_API_KEY_HERE';
export const DEFAULT_CITY = 'Christchurch';

const ICONS = {
  thunderstorm: '⛈️',
  drizzle: '🌦️',
  rain: '🌧️',
  snow: '🌨️',
  mist: '🌫️',
  smoke: '🌫️',
  haze: '🌫️',
  dust: '🌫️',
  fog: '🌁',
  sand: '🌫️',
  ash: '🌫️',
  squall: '🌬️',
  tornado: '🌪️',
  clear: '🌕',
  clouds: '☁️',
};

export function iconForCondition(cond = '') {
  const key = cond.toLowerCase();
  return ICONS[key] || '✨';
}

export function moodFromCondition(cond = '') {
  const lc = cond.toLowerCase();
  if (/storm|thunder/.test(lc)) return 'storm';
  if (/snow/.test(lc)) return 'snow';
  if (/rain|drizzle/.test(lc)) return 'rain';
  if (/clear/.test(lc)) return 'sunny';
  return 'rain';
}

function ensureKey() {
  if (!OPENWEATHER_API_KEY || OPENWEATHER_API_KEY.includes('YOUR_')) {
    throw new Error('Add your OPENWEATHER_API_KEY to weather.js');
  }
}

async function requestWeather(url) {
  ensureKey();
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Weather error: ${res.status}`);
  }
  return res.json();
}

export async function fetchWeatherByCity(city) {
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${OPENWEATHER_API_KEY}&units=metric`;
  return requestWeather(url);
}

export async function fetchWeatherByCoords(lat, lon) {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric`;
  return requestWeather(url);
}

export function summariseWeather(data) {
  if (!data) return null;
  const condition = data.weather?.[0] ?? {};
  return {
    name: data.name || '—',
    temp: Math.round(data.main?.temp ?? Number.NaN),
    feelsLike: Math.round(data.main?.feels_like ?? Number.NaN),
    humidity: data.main?.humidity ?? null,
    wind: data.wind?.speed ? Math.round(data.wind.speed * 3.6) : null, // convert m/s → km/h
    condition: condition.main?.toLowerCase() || '',
    description: condition.description || '',
    icon: iconForCondition(condition.main?.toLowerCase()),
  };
}
