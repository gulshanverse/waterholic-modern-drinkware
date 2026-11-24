import type { Daypart } from './circadianTheme';

interface ThemeBus {
  gain: GainNode;
  cleanup: () => void;
}

/**
 * Procedural Web Audio API atmospheric soundscape engine.
 * Synthesizes subtle, organic, seamlessly looping natural soundscapes tied to
 * the active circadian theme:
 *  - 'morning': Soft morning songbirds + gentle dawn breeze
 *  - 'day':     Whisper-soft alpine air & distant glacial flow
 *  - 'evening': Gentle twilight crickets chorus + velvety night air
 *
 * Uses smooth exponential crossfades between themes and respects browser
 * autoplay policies, page visibility, and user mute/volume controls.
 */
export class AtmosphericSoundscapeEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private wetSend: GainNode | null = null;
  private buses: Record<Daypart, ThemeBus> | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private activeDaypart: Daypart = 'day';
  private enabled = false;
  private volume = 0.4;
  private tabHidden = false;
  private unlocked = false;

  private onStateChange?: (unlocked: boolean) => void;

  constructor(onStateChange?: (unlocked: boolean) => void) {
    this.onStateChange = onStateChange;
  }

  public isUnlocked(): boolean {
    return this.unlocked;
  }

  private ensureContext(): boolean {
    if (typeof window === 'undefined') return false;
    if (this.ctx) return true;

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return false;

    const ctx = new AudioCtx();
    this.ctx = ctx;

    // Master bus: warm low-pass rolloff to keep soundscape silky & non-fatiguing
    const masterGain = ctx.createGain();
    masterGain.gain.value = 0;

    const masterFilter = ctx.createBiquadFilter();
    masterFilter.type = 'lowpass';
    masterFilter.frequency.value = 9600;
    masterFilter.Q.value = 0.5;

    // Subtle stereo open-air delay reverb for natural outdoor spaciousness
    const wetSend = ctx.createGain();
    wetSend.gain.value = 0.24;

    const delayL = ctx.createDelay(1.0);
    delayL.delayTime.value = 0.19;
    const delayR = ctx.createDelay(1.0);
    delayR.delayTime.value = 0.29;

    const fbL = ctx.createGain();
    fbL.gain.value = 0.22;
    const fbR = ctx.createGain();
    fbR.gain.value = 0.2;

    const wetFilter = ctx.createBiquadFilter();
    wetFilter.type = 'lowpass';
    wetFilter.frequency.value = 3400;

    const panL = this.createPanner(ctx, -0.7);
    const panR = this.createPanner(ctx, 0.7);

    wetSend.connect(wetFilter);
    wetFilter.connect(delayL);
    wetFilter.connect(delayR);
    delayL.connect(fbL);
    fbL.connect(delayR);
    delayR.connect(fbR);
    fbR.connect(delayL);
    delayL.connect(panL);
    delayR.connect(panR);
    panL.connect(masterFilter);
    panR.connect(masterFilter);

    masterFilter.connect(masterGain);
    masterGain.connect(ctx.destination);

    this.masterGain = masterGain;
    this.wetSend = wetSend;
    this.noiseBuffer = this.createPinkNoiseBuffer(ctx, 4.0);

    // Build all three theme buses once, starting silent at gain 0
    this.buses = {
      morning: this.buildMorningBus(ctx, masterFilter, wetSend),
      day: this.buildDayBus(ctx, masterFilter, wetSend),
      evening: this.buildEveningBus(ctx, masterFilter, wetSend),
    };

    return true;
  }

  private createPanner(ctx: AudioContext, pan: number): AudioNode {
    if (typeof ctx.createStereoPanner === 'function') {
      const p = ctx.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, pan));
      return p;
    }
    const g = ctx.createGain();
    g.gain.value = 1;
    return g;
  }

  private createPinkNoiseBuffer(ctx: AudioContext, seconds: number): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate);

    for (let ch = 0; ch < 2; ch += 1) {
      const data = buffer.getChannelData(ch);
      let b0 = 0;
      let b1 = 0;
      let b2 = 0;
      let b3 = 0;
      let b4 = 0;
      let b5 = 0;
      let b6 = 0;

      for (let i = 0; i < length; i += 1) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        const sample = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.05;
        b6 = white * 0.115926;

        // Smooth edge crossfade window so looping never clicks
        const fadeSamples = Math.min(2048, Math.floor(length * 0.05));
        let env = 1;
        if (i < fadeSamples) env = i / fadeSamples;
        else if (i > length - fadeSamples) env = (length - i) / fadeSamples;
        data[i] = sample * env;
      }
    }
    return buffer;
  }

  /**
   * MORNING: Soft dawn songbirds + warm pine breeze
   */
  private buildMorningBus(
    ctx: AudioContext,
    dryOut: AudioNode,
    wetOut: AudioNode
  ): ThemeBus {
    const busGain = ctx.createGain();
    busGain.gain.value = 0;
    busGain.connect(dryOut);
    busGain.connect(wetOut);

    // 1. Soft morning breeze bed
    const breeze = ctx.createBufferSource();
    breeze.buffer = this.noiseBuffer;
    breeze.loop = true;

    const breezeFilter = ctx.createBiquadFilter();
    breezeFilter.type = 'bandpass';
    breezeFilter.frequency.value = 340;
    breezeFilter.Q.value = 0.75;

    const breezeLfo = ctx.createOscillator();
    breezeLfo.type = 'sine';
    breezeLfo.frequency.value = 0.09;
    const breezeLfoGain = ctx.createGain();
    breezeLfoGain.gain.value = 110;
    breezeLfo.connect(breezeLfoGain);
    breezeLfoGain.connect(breezeFilter.frequency);

    const breezeGain = ctx.createGain();
    breezeGain.gain.value = 0.11;

    breeze.connect(breezeFilter);
    breezeFilter.connect(breezeGain);
    breezeGain.connect(busGain);
    breeze.start();
    breezeLfo.start();

    // 2. Organic looping morning bird phrases
    let disposed = false;
    let timerId: number | null = null;

    const triggerBirdPhrase = () => {
      if (disposed || !this.ctx) return;
      const now = this.ctx.currentTime;
      const shouldSing =
        this.enabled &&
        !this.tabHidden &&
        this.activeDaypart === 'morning' &&
        this.ctx.state === 'running';

      if (shouldSing) {
        const roll = Math.random();
        if (roll < 0.48) {
          this.playSongbirdFlute(this.ctx, busGain, now + 0.04);
        } else if (roll < 0.82) {
          this.playSparrowTrill(this.ctx, busGain, now + 0.04);
        } else {
          this.playDistantMorningDove(this.ctx, busGain, now + 0.05);
        }
      }

      // Natural organic cadence between bird calls (1.5s to 3.8s)
      const nextDelayMs = 1500 + Math.random() * 2300;
      timerId = window.setTimeout(triggerBirdPhrase, nextDelayMs);
    };

    timerId = window.setTimeout(triggerBirdPhrase, 550);

    return {
      gain: busGain,
      cleanup: () => {
        disposed = true;
        if (timerId !== null) window.clearTimeout(timerId);
        try {
          breeze.stop();
          breezeLfo.stop();
        } catch {
          // Ignore already-stopped nodes
        }
      },
    };
  }

  private playSongbirdFlute(ctx: AudioContext, dest: AudioNode, start: number) {
    // 2- or 3-note melodic robin/thrush dawn phrase
    const baseFreq = 2150 + Math.random() * 680;
    const notes = Math.random() > 0.45 ? 3 : 2;
    const panner = this.createPanner(ctx, (Math.random() - 0.5) * 1.25);
    panner.connect(dest);

    let cursor = start;
    for (let i = 0; i < notes; i += 1) {
      const dur = 0.13 + Math.random() * 0.09;
      const osc = ctx.createOscillator();
      osc.type = 'sine';

      const f0 = baseFreq * (i === 0 ? 1.0 : i === 1 ? 1.24 : 1.08);
      const f1 = f0 * (i % 2 === 0 ? 1.16 : 0.88);
      osc.frequency.setValueAtTime(f0, cursor);
      osc.frequency.exponentialRampToValueAtTime(f1, cursor + dur);

      // Gentle vocal vibrato
      const vib = ctx.createOscillator();
      vib.frequency.value = 22 + Math.random() * 8;
      const vibGain = ctx.createGain();
      vibGain.gain.value = 26;
      vib.connect(vibGain);
      vibGain.connect(osc.frequency);

      const env = ctx.createGain();
      const peak = 0.042 + Math.random() * 0.022;
      env.gain.setValueAtTime(0.0001, cursor);
      env.gain.linearRampToValueAtTime(peak, cursor + dur * 0.25);
      env.gain.exponentialRampToValueAtTime(0.0001, cursor + dur);

      osc.connect(env);
      env.connect(panner);
      osc.start(cursor);
      vib.start(cursor);
      osc.stop(cursor + dur + 0.03);
      vib.stop(cursor + dur + 0.03);

      cursor += dur + 0.07 + Math.random() * 0.06;
    }
  }

  private playSparrowTrill(ctx: AudioContext, dest: AudioNode, start: number) {
    // Soft sunlit 3-4 chirp flutter
    const baseFreq = 3100 + Math.random() * 650;
    const chirps = 3 + (Math.random() > 0.55 ? 1 : 0);
    const panner = this.createPanner(ctx, (Math.random() - 0.5) * 1.4);
    panner.connect(dest);

    let cursor = start;
    for (let i = 0; i < chirps; i += 1) {
      const dur = 0.055 + Math.random() * 0.025;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      const fStart = baseFreq + i * 95;
      osc.frequency.setValueAtTime(fStart, cursor);
      osc.frequency.exponentialRampToValueAtTime(fStart * 1.19, cursor + dur * 0.55);
      osc.frequency.exponentialRampToValueAtTime(fStart * 0.94, cursor + dur);

      const env = ctx.createGain();
      const peak = 0.03 + Math.random() * 0.015;
      env.gain.setValueAtTime(0.0001, cursor);
      env.gain.linearRampToValueAtTime(peak, cursor + dur * 0.2);
      env.gain.exponentialRampToValueAtTime(0.0001, cursor + dur);

      osc.connect(env);
      env.connect(panner);
      osc.start(cursor);
      osc.stop(cursor + dur + 0.02);

      cursor += dur + 0.048;
    }
  }

  private playDistantMorningDove(ctx: AudioContext, dest: AudioNode, start: number) {
    // Warm hollow distant coo for lower-mid organic balance
    const panner = this.createPanner(ctx, (Math.random() - 0.5) * 0.9);
    panner.connect(dest);

    const offsets = [0, 0.34, 0.56];
    const durs = [0.26, 0.16, 0.32];
    offsets.forEach((off, idx) => {
      const t = start + off;
      const dur = durs[idx];
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      const f = idx === 0 ? 590 : idx === 1 ? 650 : 535;
      osc.frequency.setValueAtTime(f, t);
      osc.frequency.exponentialRampToValueAtTime(f * 0.93, t + dur);

      const env = ctx.createGain();
      env.gain.setValueAtTime(0.0001, t);
      env.gain.linearRampToValueAtTime(0.024, t + dur * 0.35);
      env.gain.exponentialRampToValueAtTime(0.0001, t + dur);

      osc.connect(env);
      env.connect(panner);
      osc.start(t);
      osc.stop(t + dur + 0.03);
    });
  }

  /**
   * DAY (Midday): Ultra-subtle alpine air & distant glacial shimmer
   */
  private buildDayBus(
    ctx: AudioContext,
    dryOut: AudioNode,
    wetOut: AudioNode
  ): ThemeBus {
    const busGain = ctx.createGain();
    busGain.gain.value = 0;
    busGain.connect(dryOut);
    busGain.connect(wetOut);

    const air = ctx.createBufferSource();
    air.buffer = this.noiseBuffer;
    air.loop = true;

    const filterA = ctx.createBiquadFilter();
    filterA.type = 'bandpass';
    filterA.frequency.value = 460;
    filterA.Q.value = 0.8;

    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 140;
    lfo.connect(lfoGain);
    lfoGain.connect(filterA.frequency);

    const airGain = ctx.createGain();
    airGain.gain.value = 0.095;

    air.connect(filterA);
    filterA.connect(airGain);
    airGain.connect(busGain);
    air.start();
    lfo.start();

    return {
      gain: busGain,
      cleanup: () => {
        try {
          air.stop();
          lfo.stop();
        } catch {
          // Ignore already-stopped nodes
        }
      },
    };
  }

  /**
   * EVENING: Gentle twilight crickets chorus + velvety night air
   */
  private buildEveningBus(
    ctx: AudioContext,
    dryOut: AudioNode,
    wetOut: AudioNode
  ): ThemeBus {
    const busGain = ctx.createGain();
    busGain.gain.value = 0;
    busGain.connect(dryOut);
    busGain.connect(wetOut);

    // 1. Velvety warm night air bed
    const nightAir = ctx.createBufferSource();
    nightAir.buffer = this.noiseBuffer;
    nightAir.loop = true;

    const nightFilter = ctx.createBiquadFilter();
    nightFilter.type = 'lowpass';
    nightFilter.frequency.value = 210;

    const nightGain = ctx.createGain();
    nightGain.gain.value = 0.09;

    nightAir.connect(nightFilter);
    nightFilter.connect(nightGain);
    nightGain.connect(busGain);
    nightAir.start();

    // 2. Multi-voice gentle rhythmic field-cricket chorus loop
    // Each voice plays delicate 3- or 4-pulse stridulation chirps at slightly
    // different pitches, stereo positions, and organic intervals.
    let disposed = false;
    const timers: number[] = [];

    const cricketVoices = [
      { freq: 4120, pan: -0.58, pulses: 4, baseDelayMs: 920, level: 0.022 },
      { freq: 4380, pan: 0.56, pulses: 3, baseDelayMs: 1340, level: 0.019 },
      { freq: 3890, pan: 0.14, pulses: 4, baseDelayMs: 1780, level: 0.015 },
    ];

    cricketVoices.forEach((voice, idx) => {
      const scheduleVoice = () => {
        if (disposed || !this.ctx) return;
        const shouldChirp =
          this.enabled &&
          !this.tabHidden &&
          this.activeDaypart === 'evening' &&
          this.ctx.state === 'running';

        if (shouldChirp) {
          this.playCricketStridulation(
            this.ctx,
            busGain,
            this.ctx.currentTime + 0.03,
            voice.freq + (Math.random() - 0.5) * 45,
            voice.pan,
            voice.pulses,
            voice.level
          );
        }

        const jitter = (Math.random() - 0.5) * 420;
        const id = window.setTimeout(
          scheduleVoice,
          Math.max(680, voice.baseDelayMs + jitter)
        );
        timers[idx] = id;
      };

      timers[idx] = window.setTimeout(scheduleVoice, 240 + idx * 380);
    });

    return {
      gain: busGain,
      cleanup: () => {
        disposed = true;
        timers.forEach((id) => window.clearTimeout(id));
        try {
          nightAir.stop();
        } catch {
          // Ignore already-stopped nodes
        }
      },
    };
  }

  private playCricketStridulation(
    ctx: AudioContext,
    dest: AudioNode,
    start: number,
    carrierHz: number,
    pan: number,
    pulses: number,
    peakLevel: number
  ) {
    const panner = this.createPanner(ctx, pan);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = carrierHz;
    bp.Q.value = 4.2;

    bp.connect(panner);
    panner.connect(dest);

    // Primary carrier + delicate overtone
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = carrierHz;

    const overtone = ctx.createOscillator();
    overtone.type = 'sine';
    overtone.frequency.value = carrierHz * 1.995;

    const overtoneGain = ctx.createGain();
    overtoneGain.gain.value = 0.14;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, start);

    const pulseDur = 0.028;
    const pulseGap = 0.022;
    let cursor = start;

    for (let p = 0; p < pulses; p += 1) {
      env.gain.setValueAtTime(0.0001, cursor);
      env.gain.linearRampToValueAtTime(peakLevel, cursor + pulseDur * 0.35);
      env.gain.exponentialRampToValueAtTime(0.0001, cursor + pulseDur);
      cursor += pulseDur + pulseGap;
    }

    osc.connect(env);
    overtone.connect(overtoneGain);
    overtoneGain.connect(env);
    env.connect(bp);

    const endTime = cursor + 0.04;
    osc.start(start);
    overtone.start(start);
    osc.stop(endTime);
    overtone.stop(endTime);
  }

  public async unlockAndSync(): Promise<boolean> {
    if (!this.ensureContext() || !this.ctx) return false;
    if (this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume();
      } catch {
        return false;
      }
    }
    const nowUnlocked = this.ctx.state === 'running';
    if (nowUnlocked !== this.unlocked) {
      this.unlocked = nowUnlocked;
      this.onStateChange?.(nowUnlocked);
    }
    this.applyFades(1.8);
    return nowUnlocked;
  }

  public setState(params: {
    daypart: Daypart;
    enabled: boolean;
    volume: number;
    tabHidden?: boolean;
  }) {
    const daypartChanged = this.activeDaypart !== params.daypart;
    this.activeDaypart = params.daypart;
    this.enabled = params.enabled;
    this.volume = Math.max(0, Math.min(1, params.volume));
    if (typeof params.tabHidden === 'boolean') {
      this.tabHidden = params.tabHidden;
    }

    if (this.enabled && !this.ctx) {
      this.ensureContext();
    }

    if (this.ctx && this.ctx.state === 'running') {
      this.unlocked = true;
      this.applyFades(daypartChanged ? 1.85 : 1.1);
    } else if (this.ctx && !this.enabled) {
      this.applyFades(0.5);
    }
  }

  private applyFades(fadeSeconds: number) {
    if (!this.ctx || !this.masterGain || !this.buses) return;
    const now = this.ctx.currentTime;
    const tc = Math.max(0.12, fadeSeconds / 3);

    const targetMaster = this.enabled && !this.tabHidden ? this.volume : 0;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setTargetAtTime(targetMaster, now, tc);

    (['morning', 'day', 'evening'] as Daypart[]).forEach((dp) => {
      const bus = this.buses![dp];
      const targetBus = dp === this.activeDaypart && this.enabled ? 1 : 0;
      bus.gain.gain.cancelScheduledValues(now);
      bus.gain.gain.setTargetAtTime(targetBus, now, tc);
    });
  }

  public dispose() {
    if (this.buses) {
      this.buses.morning.cleanup();
      this.buses.day.cleanup();
      this.buses.evening.cleanup();
      this.buses = null;
    }
    if (this.ctx) {
      void this.ctx.close().catch(() => {});
      this.ctx = null;
    }
    this.masterGain = null;
    this.wetSend = null;
    this.unlocked = false;
  }
}
