const SOUND_BANK = {
  rain: {
    url: 'https://cdn.pixabay.com/download/audio/2023/05/15/audio_c7d429b5f2.mp3?filename=soft-rain-146362.mp3',
    volume: 0.45,
  },
  storm: {
    url: 'https://cdn.pixabay.com/download/audio/2021/11/04/audio_bb2e495003.mp3?filename=rain-and-thunder-ambient-110117.mp3',
    volume: 0.5,
  },
  snow: {
    url: 'https://cdn.pixabay.com/download/audio/2022/03/16/audio_6ed9a4216f.mp3?filename=wind-blowing-112188.mp3',
    volume: 0.4,
  },
  sunny: {
    url: 'https://cdn.pixabay.com/download/audio/2021/08/08/audio_0d077f8e61.mp3?filename=forest-lullaby-110624.mp3',
    volume: 0.42,
  },
};

function buildAudio(url, volume) {
  const audio = new Audio(url);
  audio.loop = true;
  audio.preload = 'auto';
  audio.crossOrigin = 'anonymous';
  audio.volume = volume;
  return audio;
}

export class AmbientAudio {
  constructor(onStateChange) {
    this.onStateChange = onStateChange;
    this.currentMood = 'rain';
    this.enabled = false;
    this.elements = new Map();
  }

  getAudio(mood) {
    if (!SOUND_BANK[mood]) mood = 'rain';
    if (!this.elements.has(mood)) {
      const { url, volume } = SOUND_BANK[mood];
      this.elements.set(mood, buildAudio(url, volume));
    }
    return this.elements.get(mood);
  }

  setMood(mood) {
    if (!SOUND_BANK[mood]) mood = 'rain';
    if (this.currentMood === mood) return;
    const previous = this.getAudio(this.currentMood);
    this.currentMood = mood;
    if (this.enabled) {
      this.fadeOut(previous);
      this.playCurrent().catch(() => {});
    }
  }

  async enable() {
    this.enabled = true;
    try {
      await this.playCurrent();
      this.onStateChange?.(true);
      return true;
    } catch (err) {
      console.warn('Unable to start ambient audio', err);
      this.enabled = false;
      this.onStateChange?.(false, err);
      return false;
    }
  }

  disable() {
    this.enabled = false;
    const audio = this.getAudio(this.currentMood);
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    this.onStateChange?.(false);
  }

  async playCurrent() {
    const audio = this.getAudio(this.currentMood);
    const others = [...this.elements.entries()].filter(([key]) => key !== this.currentMood);
    others.forEach(([, el]) => this.fadeOut(el));
    audio.volume = SOUND_BANK[this.currentMood].volume;
    try {
      await audio.play();
    } catch (err) {
      throw err;
    }
    return audio;
  }

  fadeOut(audio) {
    if (!audio) return;
    audio.volume = 0;
    audio.pause();
  }
}

export function describeMoodAudio(mood) {
  switch (mood) {
    case 'storm':
      return 'Rain with distant thunder';
    case 'snow':
      return 'Crystalline hush with gentle wind';
    case 'sunny':
      return 'Sun-warmed forest lullaby';
    default:
      return 'Soft summer rain';
  }
}
