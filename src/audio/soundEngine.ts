class SoundEngine {
  private ctx: AudioContext | null = null;
  private musicInterval: number | null = null;
  private isMuted: boolean = false;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private musicStep: number = 0;
  private isLowHpTension: boolean = false;

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.sfxGain = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();

      this.sfxGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
      this.musicGain.gain.setValueAtTime(0.25, this.ctx.currentTime);

      this.sfxGain.connect(this.ctx.destination);
      this.musicGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.ctx && this.sfxGain && this.musicGain) {
      const now = this.ctx.currentTime;
      this.sfxGain.gain.setValueAtTime(muted ? 0 : 0.7, now);
      this.musicGain.gain.setValueAtTime(muted ? 0 : 0.25, now);
    }
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public playWhoosh(type: 'light' | 'heavy' = 'light') {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'triangle';
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(type === 'light' ? 600 : 350, now);
    filter.Q.setValueAtTime(2.0, now);

    osc.frequency.setValueAtTime(type === 'light' ? 260 : 180, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + (type === 'light' ? 0.12 : 0.22));

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (type === 'light' ? 0.12 : 0.22));

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + (type === 'light' ? 0.12 : 0.22));
  }

  public playLightHit() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    // Punch snap
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.08);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.08);

    // Noise click
    this.playNoiseBurst(0.04, 800, 0.25);
  }

  public playHeavyHit() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    // Sub-bass thud
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.25);

    gain.gain.setValueAtTime(0.8, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.25);

    // Distortion crunch
    this.playNoiseBurst(0.15, 400, 0.5);
  }

  public playBlock() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(750, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.1);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  public playParry() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    // High crystal resonance chime
    const freqs = [1200, 1800, 2400];
    freqs.forEach((f, i) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + i * 0.02);

      gain.gain.setValueAtTime(0.4 / (i + 1), now + i * 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now + i * 0.02);
      osc.stop(now + 0.45);
    });
  }

  public playSpecialHit() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    // Energy laser chirp
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.22);

    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.22);

    this.playNoiseBurst(0.18, 1200, 0.4);
  }

  public playSuperDetonation() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    // Rising energy swell
    const riseOsc = this.ctx.createOscillator();
    const riseGain = this.ctx.createGain();
    riseOsc.type = 'sawtooth';
    riseOsc.frequency.setValueAtTime(80, now);
    riseOsc.frequency.exponentialRampToValueAtTime(1200, now + 0.3);

    riseGain.gain.setValueAtTime(0.1, now);
    riseGain.gain.linearRampToValueAtTime(0.7, now + 0.3);
    riseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

    riseOsc.connect(riseGain);
    riseGain.connect(this.sfxGain);
    riseOsc.start(now);
    riseOsc.stop(now + 0.8);

    // Huge sub explosion at apex
    setTimeout(() => {
      if (!this.ctx || !this.sfxGain || this.isMuted) return;
      const t = this.ctx.currentTime;
      const sub = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(180, t);
      sub.frequency.exponentialRampToValueAtTime(25, t + 0.6);

      subGain.gain.setValueAtTime(1.0, t);
      subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

      sub.connect(subGain);
      subGain.connect(this.sfxGain);
      sub.start(t);
      sub.stop(t + 0.6);
      this.playNoiseBurst(0.4, 300, 0.7);
    }, 280);
  }

  public playWallSplat() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(90, now);
    osc.frequency.exponentialRampToValueAtTime(35, now + 0.2);

    gain.gain.setValueAtTime(0.7, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.2);
    this.playNoiseBurst(0.12, 500, 0.4);
  }

  public playDestruction() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    // Low rumble
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.exponentialRampToValueAtTime(28, now + 0.35);

    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.35);

    // Shatter crumble
    this.playNoiseBurst(0.3, 750, 0.6);
  }

  public playAnnouncer(cue: 'ROUND_1' | 'ROUND_2' | 'FINAL_ROUND' | 'FIGHT' | 'KO' | 'COUNTER' | 'PERFECT') {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    filter.type = 'bandpass';
    filter.Q.value = 5.0;

    let fStart = 300;
    let fEnd = 200;
    let duration = 0.3;

    switch (cue) {
      case 'ROUND_1':
      case 'ROUND_2':
      case 'FINAL_ROUND':
        fStart = 280;
        fEnd = 450;
        duration = 0.4;
        break;
      case 'FIGHT':
        fStart = 450;
        fEnd = 200;
        duration = 0.35;
        break;
      case 'KO':
        fStart = 150;
        fEnd = 50;
        duration = 0.7;
        break;
      case 'COUNTER':
        fStart = 500;
        fEnd = 650;
        duration = 0.25;
        break;
      case 'PERFECT':
        fStart = 600;
        fEnd = 900;
        duration = 0.45;
        break;
    }

    osc.frequency.setValueAtTime(fStart, now);
    osc.frequency.exponentialRampToValueAtTime(fEnd, now + duration);

    filter.frequency.setValueAtTime(fStart * 1.5, now);
    filter.frequency.exponentialRampToValueAtTime(fEnd * 1.5, now + duration);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + duration);
  }

  private playNoiseBurst(duration: number, cutoff: number, volume: number) {
    if (!this.ctx || !this.sfxGain) return;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;

    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    noise.start(now);
  }

  public setTension(isLowHp: boolean) {
    this.isLowHpTension = isLowHp;
  }

  public startCombatMusic() {
    if (this.musicInterval) return;
    this.initCtx();

    // 130 BPM synthwave battle rhythm
    const stepIntervalMs = (60 / 130 / 4) * 1000; // 16th notes ~115ms
    const notesBass = [65.41, 65.41, 77.78, 65.41, 87.31, 65.41, 98.00, 87.31]; // C2, Eb2, F2, G2

    this.musicInterval = window.setInterval(() => {
      if (this.isMuted || !this.ctx || !this.musicGain) return;

      const now = this.ctx.currentTime;
      const step = this.musicStep % 16;
      this.musicStep++;

      // Kick on 0, 4, 8, 12
      if (step % 4 === 0) {
        const kick = this.ctx.createOscillator();
        const kGain = this.ctx.createGain();
        kick.type = 'sine';
        kick.frequency.setValueAtTime(120, now);
        kick.frequency.exponentialRampToValueAtTime(35, now + 0.12);
        kGain.gain.setValueAtTime(0.6, now);
        kGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        kick.connect(kGain);
        kGain.connect(this.musicGain);
        kick.start(now);
        kick.stop(now + 0.12);
      }

      // Snare on 4, 12
      if (step === 4 || step === 12) {
        this.playNoiseBurst(0.08, 1400, 0.25);
      }

      // Hi-hat on every odd 16th note
      if (step % 2 === 1) {
        this.playNoiseBurst(0.03, 5000, 0.12);
      }

      // Bassline arpeggiator
      if (step % 2 === 0) {
        const noteIdx = Math.floor(step / 2) % notesBass.length;
        const freq = notesBass[noteIdx] * (this.isLowHpTension ? 1.5 : 1.0);
        const bass = this.ctx.createOscillator();
        const bFilter = this.ctx.createBiquadFilter();
        const bGain = this.ctx.createGain();

        bass.type = 'sawtooth';
        bFilter.type = 'lowpass';
        bFilter.frequency.setValueAtTime(this.isLowHpTension ? 800 : 450, now);
        bFilter.Q.value = 4.0;

        bass.frequency.setValueAtTime(freq, now);
        bGain.gain.setValueAtTime(0.2, now);
        bGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

        bass.connect(bFilter);
        bFilter.connect(bGain);
        bGain.connect(this.musicGain);

        bass.start(now);
        bass.stop(now + 0.18);
      }
    }, stepIntervalMs);
  }

  public stopCombatMusic() {
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
  }
}

export const soundEngine = new SoundEngine();
