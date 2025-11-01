const PREFIX = 'rainy-night::';

function safeGetStorage() {
  try {
    return window.localStorage;
  } catch (err) {
    console.warn('Local storage unavailable', err);
    return null;
  }
}

const store = safeGetStorage();

function withPrefix(key) {
  return `${PREFIX}${key}`;
}

export function getItem(key, fallback = null) {
  if (!store) return fallback;
  try {
    const raw = store.getItem(withPrefix(key));
    return raw === null ? fallback : JSON.parse(raw);
  } catch (err) {
    console.warn('Failed to parse storage key', key, err);
    return fallback;
  }
}

export function setItem(key, value) {
  if (!store) return;
  try {
    store.setItem(withPrefix(key), JSON.stringify(value));
  } catch (err) {
    console.warn('Failed to save storage key', key, err);
  }
}

export const storage = {
  get mood() {
    return getItem('mood', 'rain');
  },
  set mood(val) {
    setItem('mood', val);
  },
  get audio() {
    return getItem('audio', 'on');
  },
  set audio(val) {
    setItem('audio', val);
  },
  get city() {
    return getItem('city', 'Christchurch');
  },
  set city(val) {
    setItem('city', val);
  },
  get nickname() {
    return getItem('nickname', '');
  },
  set nickname(val) {
    setItem('nickname', val);
  },
};

export function getCustomQuotes() {
  return getItem('customQuotes', []);
}

export function setCustomQuotes(arr) {
  setItem('customQuotes', arr);
}

export function getSnippets() {
  return getItem('snippets', []);
}

export function setSnippets(arr) {
  setItem('snippets', arr);
}

export function getIncludeSnippets() {
  return getItem('includeSnippets', false);
}

export function setIncludeSnippets(flag) {
  setItem('includeSnippets', !!flag);
}
