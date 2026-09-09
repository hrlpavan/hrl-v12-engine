// ============================================================================
// HRL V12 Engine Project - Procedural Web Audio Synthesizer
// Synthesizes the authentic acoustic profile of a high-revving 6.5L 60° V12
// 6 firing pulses per revolution (Fundamental = RPM / 10 Hz)
// ============================================================================

export class V12AudioEngine {
  constructor() {
    this.ctx = null;
    this.isPlaying = false;
    this.isMuted = true;
    this.masterVolume = 0.6;
    this.currentRpm = 1200;

    // Audio nodes
    this.masterGain = null;
    this.distortionNode = null;
    this.exhaustResonator = null;
    this.exhaustCabinet = null;
    this.lowPass = null;
    this.highPass = null;

    // Oscillators for harmonics
    this.oscillators = [];
    this.noiseNode = null;
    this.noiseGain = null;
  }

  init() {
    if (this.ctx) return;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      console.warn("Web Audio API not supported on this browser.");
      return;
    }

    this.ctx = new AudioContextClass();

    // Master Gain
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.masterVolume, this.ctx.currentTime);

    // Highpass filter to eliminate sub-bass DC pops
    this.highPass = this.ctx.createBiquadFilter();
    this.highPass.type = "highpass";
    this.highPass.frequency.setValueAtTime(45, this.ctx.currentTime);

    // Distortion / WaveShaper for refined internal combustion pulse
    this.distortionNode = this.ctx.createWaveShaper();
    this.distortionNode.curve = this._makeDistortionCurve(10); // Soft, velvety saturation (not harsh)
    this.distortionNode.oversample = "4x";

    // Resonant Header Collector Filter (Goodwood Tuned Baritone Exhaust)
    this.exhaustResonator = this.ctx.createBiquadFilter();
    this.exhaustResonator.type = "peaking";
    this.exhaustResonator.Q.setValueAtTime(2.2, this.ctx.currentTime);
    this.exhaustResonator.gain.setValueAtTime(8, this.ctx.currentTime);

    // Rolls-Royce Acoustic Shielding (Double-bulkhead lowpass filter)
    this.lowPass = this.ctx.createBiquadFilter();
    this.lowPass.type = "lowpass";
    this.lowPass.frequency.setValueAtTime(4200, this.ctx.currentTime);

    // Connect node chain: Sources -> HighPass -> Distortion -> Resonator -> LowPass -> MasterGain -> Destination
    this.highPass.connect(this.distortionNode);
    this.distortionNode.connect(this.exhaustResonator);
    this.exhaustResonator.connect(this.lowPass);
    this.lowPass.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);

    // Setup multi-harmonic oscillators & turbo spool
    this._setupHarmonics();
    this._setupValvetrainNoise();
    this._setupTurbochargerSpool();
  }

  _makeDistortionCurve(amount = 10) {
    const k = typeof amount === 'number' ? amount : 10;
    const nSamples = 4096;
    const curve = new Float32Array(nSamples);
    const deg = Math.PI / 180;

    for (let i = 0; i < nSamples; ++i) {
      const x = (i * 2) / nSamples - 1;
      curve[i] = ((3 + k) * x * 15 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  _setupHarmonics() {
    if (!this.ctx) return;

    // Rolls-Royce Harmonically Balanced Configuration:
    // Emphasizes smooth, warm, low-frequency baritone notes (600 RPM idle = 60 Hz)
    const harmonicConfigs = [
      { order: 1, type: "sine",     gain: 0.35 }, // Crank fundamental rotation
      { order: 2, type: "triangle", gain: 0.28 }, // Second harmonic warmth
      { order: 3, type: "sine",     gain: 0.30 }, // 3-pulse alternation
      { order: 6, type: "triangle", gain: 0.55 }, // Fundamental firing order (Velvety V12 hum)
      { order: 12, type: "sine",    gain: 0.22 }, // 2nd firing harmonic
      { order: 18, type: "sine",    gain: 0.12 }  // High harmonic overtone
    ];

    this.oscillators = harmonicConfigs.map(cfg => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = cfg.type;
      osc.frequency.setValueAtTime(cfg.order * (this.currentRpm / 60), this.ctx.currentTime);
      gain.gain.setValueAtTime(cfg.gain, this.ctx.currentTime);

      osc.connect(gain);
      gain.connect(this.highPass);
      osc.start();

      return { osc, gain, order: cfg.order, baseGain: cfg.gain };
    });
  }

  _setupTurbochargerSpool() {
    if (!this.ctx) return;

    // Twin Turbocharger Spool Whistle (Twin Honeywell/Garrett units)
    this.turboOsc = this.ctx.createOscillator();
    this.turboOsc.type = "sine";
    this.turboOsc.frequency.setValueAtTime(800, this.ctx.currentTime);

    this.turboGain = this.ctx.createGain();
    this.turboGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    this.turboFilter = this.ctx.createBiquadFilter();
    this.turboFilter.type = "bandpass";
    this.turboFilter.frequency.setValueAtTime(1600, this.ctx.currentTime);
    this.turboFilter.Q.setValueAtTime(3.0, this.ctx.currentTime);

    this.turboOsc.connect(this.turboFilter);
    this.turboFilter.connect(this.turboGain);
    this.turboGain.connect(this.masterGain);

    this.turboOsc.start();
  }

  _setupValvetrainNoise() {
    if (!this.ctx) return;

    // White/Pink noise buffer for air induction intake & valvetrain hiss
    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let lastOut = 0.0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + 0.02 * white) / 1.02; // Pink noise approximation
      lastOut = output[i];
      output[i] *= 3.5;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = "bandpass";
    noiseFilter.frequency.setValueAtTime(1400, this.ctx.currentTime);
    noiseFilter.Q.setValueAtTime(2.0, this.ctx.currentTime);

    this.noiseGain = this.ctx.createGain();
    this.noiseGain.gain.setValueAtTime(0.08, this.ctx.currentTime);

    whiteNoise.connect(noiseFilter);
    noiseFilter.connect(this.noiseGain);
    this.noiseGain.connect(this.lowPass);

    whiteNoise.start();
    this.noiseNode = whiteNoise;
  }

  setRpm(rpm) {
    this.currentRpm = Math.max(0, Math.min(10000, rpm));
    if (!this.ctx || this.oscillators.length === 0) return;

    const now = this.ctx.currentTime;
    const crankRevFreq = this.currentRpm / 60.0; // Crank rev/sec
    const isStationary = this.currentRpm < 50;

    // Update each harmonic oscillator frequency smoothly
    this.oscillators.forEach(h => {
      const targetFreq = Math.max(10, h.order * crankRevFreq);
      h.osc.frequency.setTargetAtTime(targetFreq, now, 0.04);

      // Scale harmonic gain with engine speed (high harmonics scream more at high RPM)
      let dynamicGain = h.baseGain;
      if (isStationary) {
        dynamicGain = 0;
      } else {
        const rpmFactor = this.currentRpm / 6500;
        if (h.order >= 12) {
          dynamicGain *= Math.pow(rpmFactor, 1.3);
        } else if (h.order === 1 || h.order === 2) {
          dynamicGain *= Math.max(0.3, 1.4 - rpmFactor * 0.5); // Thicker bass at low RPM
        }
      }
      h.gain.gain.setTargetAtTime(dynamicGain, now, 0.04);
    });

    // Modulate exhaust collector resonance frequency with RPM
    // Resonant baritone peak climbs from ~180 Hz at idle to ~950 Hz at 6000 RPM
    if (this.exhaustResonator) {
      const resonantFreq = 180 + (this.currentRpm / 6000) * 780;
      this.exhaustResonator.frequency.setTargetAtTime(resonantFreq, now, 0.05);
    }

    // Twin Turbocharger Spool Sound
    // Whistle rises smoothly above 1200 RPM up to 2400 Hz
    if (this.turboGain && this.turboOsc && this.turboFilter) {
      if (this.currentRpm > 1100 && !isStationary) {
        const turboFactor = (this.currentRpm - 1100) / 4900;
        const turboFreq = 950 + turboFactor * 1450; // 950 Hz to 2400 Hz
        const turboVol = Math.min(0.18, turboFactor * 0.18);
        this.turboOsc.frequency.setTargetAtTime(turboFreq, now, 0.06);
        this.turboFilter.frequency.setTargetAtTime(turboFreq, now, 0.06);
        this.turboGain.gain.setTargetAtTime(turboVol, now, 0.06);
      } else {
        this.turboGain.gain.setTargetAtTime(0.0, now, 0.05);
      }
    }

    // Valvetrain & induction noise gain (muffled Rolls-Royce acoustic isolation)
    if (this.noiseGain) {
      const noiseLevel = isStationary ? 0 : 0.02 + (this.currentRpm / 6000) * 0.05;
      this.noiseGain.gain.setTargetAtTime(noiseLevel, now, 0.05);
    }
  }

  setVolume(volume) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    if (!this.ctx || !this.masterGain) return;
    if (!this.isMuted) {
      this.masterGain.gain.setTargetAtTime(this.masterVolume, this.ctx.currentTime, 0.02);
    }
  }

  ensureContext() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  start() {
    this.ensureContext();
    this.isPlaying = true;
  }

  toggleMute() {
    this.ensureContext();

    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      const target = this.isMuted ? 0 : this.masterVolume;
      this.masterGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.05);
    }
    return !this.isMuted;
  }

  playBovFlutter() {
    if (this.isMuted || !this.ctx) return;
    const now = this.ctx.currentTime;
    try {
      const flutterOsc = this.ctx.createOscillator();
      const flutterGain = this.ctx.createGain();
      const flutterFilter = this.ctx.createBiquadFilter();

      flutterFilter.type = "bandpass";
      flutterFilter.frequency.setValueAtTime(1800, now);
      flutterFilter.Q.setValueAtTime(3.5, now);

      flutterGain.gain.setValueAtTime(0.12, now);
      flutterGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      flutterOsc.type = "sawtooth";
      flutterOsc.frequency.setValueAtTime(130, now);
      flutterOsc.frequency.exponentialRampToValueAtTime(50, now + 0.4);

      flutterOsc.connect(flutterFilter);
      flutterFilter.connect(flutterGain);
      flutterGain.connect(this.masterGain);

      flutterOsc.start(now);
      flutterOsc.stop(now + 0.42);
    } catch (err) {
      // Audio context may be closed or uninitialized
    }
  }

  blipThrottle(amount = 1600) {
    if (this.isMuted) return;
    const originalRpm = this.currentRpm;
    const targetRpm = Math.min(6000, originalRpm + amount);
    this.setRpm(targetRpm);

    setTimeout(() => {
      this.setRpm(originalRpm);
      this.playBovFlutter();
    }, 450);
  }
}

export const audioEngine = new V12AudioEngine();
