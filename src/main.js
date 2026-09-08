// ============================================================================
// HRL V12 Engine Project - Master Controller & Application Orchestration
// Connects 3D Scene, Kinematics, Web Audio, and Analytical Telemetry
// ============================================================================

import { computeEngineState, FIRING_ORDER, CYLINDERS, normalizeAngle } from './engine/kinematics.js';
import { audioEngine } from './engine/audio.js';
import { V12Scene3D } from './engine/scene3d.js';
import { TelemetryManager } from './ui/telemetry.js';

class V12Application {
  constructor() {
    // Engine State
    this.isPlaying = true;
    this.masterCrankAngleDeg = 0.0;
    this.engineRpm = 7200;
    this.playbackRate = 0.05; // 1/20th speed default (like reference)
    this.selectedCylinderId = 1;
    this.isIsolated = false;

    // Subsystems
    this.scene3d = null;
    this.telemetry = null;

    // Timing
    this.lastTime = performance.now();

    this.init();
  }

  init() {
    const container = document.getElementById('canvas-container');
    this.scene3d = new V12Scene3D(container);

    // Canvases for 2D Telemetry
    const canvases = {
      sliderCrank: document.getElementById('canvas-slider-crank'),
      crankEndView: document.getElementById('canvas-crank-end'),
      valveTiming: document.getElementById('canvas-valve-timing'),
      pvIndicator: document.getElementById('canvas-pv-indicator')
    };

    // Callback when dragging valve timing diagram
    const onCrankScrub = (scrubCycleDeg) => {
      // Find offset for selected cylinder so that cycleDeg matches scrubCycleDeg
      const selectedCyl = CYLINDERS.find(c => c.id === this.selectedCylinderId) || CYLINDERS[0];
      this.masterCrankAngleDeg = normalizeAngle(scrubCycleDeg + selectedCyl.firingTdc, 720);
    };

    this.telemetry = new TelemetryManager(canvases, onCrankScrub);

    // Build Firing Order Strip in DOM
    this._buildFiringOrderStrip();

    // Wire up UI events
    this._bindControls();

    // Start Animation Loop
    requestAnimationFrame((t) => this._loop(t));
  }

  _buildFiringOrderStrip() {
    const strip = document.getElementById('firing-order-strip');
    strip.innerHTML = '';

    FIRING_ORDER.forEach(cylId => {
      const pill = document.createElement('div');
      pill.className = `fo-pill ${cylId === this.selectedCylinderId ? 'selected' : ''}`;
      pill.textContent = cylId;
      pill.dataset.cylId = cylId;

      pill.addEventListener('click', () => {
        this.selectedCylinderId = cylId;
        this._updatePillSelection();
        if (this.isIsolated) {
          this.scene3d.isolateCylinder(cylId);
        }
      });

      strip.appendChild(pill);
    });
  }

  _updatePillSelection() {
    const pills = document.querySelectorAll('.fo-pill');
    pills.forEach(p => {
      const id = parseInt(p.dataset.cylId, 10);
      p.classList.toggle('selected', id === this.selectedCylinderId);
    });
  }

  _bindControls() {
    // 1. Play / Pause
    const btnPlayPause = document.getElementById('btn-play-pause');
    const playIcon = document.getElementById('play-pause-icon');
    const playText = document.getElementById('play-pause-text');

    btnPlayPause.addEventListener('click', () => {
      this.isPlaying = !this.isPlaying;
      playIcon.textContent = this.isPlaying ? '■' : '▶';
      playText.textContent = this.isPlaying ? 'PAUSE' : 'PLAY';
      btnPlayPause.classList.toggle('btn-primary', this.isPlaying);
    });

    // 2. Step Buttons
    document.getElementById('btn-step-back-15').addEventListener('click', () => {
      this.isPlaying = false;
      this.masterCrankAngleDeg = normalizeAngle(this.masterCrankAngleDeg - 15, 720);
      playIcon.textContent = '▶';
      playText.textContent = 'PLAY';
      btnPlayPause.classList.remove('btn-primary');
    });

    document.getElementById('btn-step-fwd-15').addEventListener('click', () => {
      this.isPlaying = false;
      this.masterCrankAngleDeg = normalizeAngle(this.masterCrankAngleDeg + 15, 720);
      playIcon.textContent = '▶';
      playText.textContent = 'PLAY';
      btnPlayPause.classList.remove('btn-primary');
    });

    document.getElementById('btn-step-fwd-1').addEventListener('click', () => {
      this.isPlaying = false;
      this.masterCrankAngleDeg = normalizeAngle(this.masterCrankAngleDeg + 1, 720);
      playIcon.textContent = '▶';
      playText.textContent = 'PLAY';
      btnPlayPause.classList.remove('btn-primary');
    });

    // 3. RPM Slider
    const rpmSlider = document.getElementById('rpm-slider');
    const rpmDisplay = document.getElementById('rpm-display');
    const hudSpeedLabel = document.getElementById('hud-speed-label');
    const redlineBadge = document.getElementById('redline-badge');

    rpmSlider.addEventListener('input', (e) => {
      this.engineRpm = parseInt(e.target.value, 10);
      rpmDisplay.textContent = this.engineRpm;
      hudSpeedLabel.textContent = `${this.engineRpm} RPM`;

      audioEngine.setRpm(this.engineRpm);

      if (this.engineRpm >= 8500) {
        redlineBadge.textContent = 'REDLINE WARNING';
        redlineBadge.classList.add('in-redline');
      } else if (this.engineRpm >= 6000) {
        redlineBadge.textContent = 'PEAK POWER';
        redlineBadge.classList.remove('in-redline');
      } else if (this.engineRpm <= 1000) {
        redlineBadge.textContent = 'IDLE';
        redlineBadge.classList.remove('in-redline');
      } else {
        redlineBadge.textContent = 'NORMAL';
        redlineBadge.classList.remove('in-redline');
      }
    });

    // 4. Playback Speed Slider
    const speedSlider = document.getElementById('playback-speed');
    const speedText = document.getElementById('playback-rate-text');

    speedSlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      this.playbackRate = val;
      if (val >= 0.95) {
        speedText.textContent = '1x REAL-TIME';
      } else {
        const denom = Math.round(1 / val);
        speedText.textContent = `1/${denom} SPEED`;
      }
    });

    // 5. Audio Synthesizer Controls
    const btnAudio = document.getElementById('btn-audio-toggle');
    const audioStatusText = document.getElementById('audio-status-text');
    const audioVol = document.getElementById('audio-volume');
    const btnThrottleBlip = document.getElementById('btn-throttle-blip');

    btnAudio.addEventListener('click', () => {
      const unmuted = audioEngine.toggleMute();
      audioStatusText.textContent = unmuted ? 'V12 AUDIO: ON' : 'V12 AUDIO: MUTED';
      btnAudio.classList.toggle('btn-primary', unmuted);
    });

    audioVol.addEventListener('input', (e) => {
      audioEngine.setVolume(parseFloat(e.target.value));
    });

    btnThrottleBlip.addEventListener('click', () => {
      audioEngine.blipThrottle(2200);
      // Visual tachometer bump
      rpmDisplay.textContent = Math.min(9500, this.engineRpm + 2200);
      setTimeout(() => {
        rpmDisplay.textContent = this.engineRpm;
      }, 400);
    });

    // 6. Camera Presets
    const camButtons = document.querySelectorAll('.segmented-group button[data-camera]');
    camButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        camButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.scene3d.setCameraPreset(btn.dataset.camera);
      });
    });

    // 7. Cutaway Selector
    const cutawayButtons = document.querySelectorAll('.segmented-group button[data-cutaway]');
    cutawayButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        cutawayButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.scene3d.setCutawayMode(btn.dataset.cutaway);
      });
    });

    // 8. Overlays Toggles
    const overlayButtons = document.querySelectorAll('.toggle-btn[data-overlay]');
    overlayButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const overlayName = btn.dataset.overlay;
        const isActive = !btn.classList.contains('active');
        btn.classList.toggle('active', isActive);
        this.scene3d.setOverlay(overlayName, isActive);
      });
    });

    // 9. Isolate Toggle
    const btnIsolate = document.getElementById('btn-isolate-toggle');
    btnIsolate.addEventListener('click', () => {
      this.isIsolated = !this.isIsolated;
      btnIsolate.classList.toggle('active', this.isIsolated);
      this.scene3d.isolateCylinder(this.isIsolated ? this.selectedCylinderId : null);
    });

    // 10. Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        btnPlayPause.click();
      } else if (e.key === 'h' || e.key === 'H') {
        document.getElementById('hud-overlay').classList.toggle('hud-hidden');
      } else if (e.code === 'ArrowRight') {
        document.getElementById('btn-step-fwd-15').click();
      } else if (e.code === 'ArrowLeft') {
        document.getElementById('btn-step-back-15').click();
      } else if (e.key === 'm' || e.key === 'M') {
        btnAudio.click();
      }
    });
  }

  _loop(currentTime) {
    requestAnimationFrame((t) => this._loop(t));

    const dt = Math.min(0.1, (currentTime - this.lastTime) / 1000.0);
    this.lastTime = currentTime;

    // Advance Crankshaft Angle if Playing
    if (this.isPlaying) {
      // (engineRpm * 360 / 60) gives degrees per second
      const degPerSec = (this.engineRpm * 360.0) / 60.0;
      this.masterCrankAngleDeg = normalizeAngle(this.masterCrankAngleDeg + degPerSec * this.playbackRate * dt, 720);
    }

    // Compute complete analytical state for all 12 cylinders
    const engineState = computeEngineState(this.masterCrankAngleDeg, this.engineRpm);

    // Update 3D Scene
    this.scene3d.update(engineState);

    // Update 2D Telemetry Canvases
    this.telemetry.render(engineState, this.selectedCylinderId);

    // Update HUD Textual Badges
    this._updateHudText(engineState);
  }

  _updateHudText(engineState) {
    const selectedCyl = engineState.cylinders.find(c => c.id === this.selectedCylinderId) || engineState.cylinders[0];

    // Cylinder Header Tag
    document.getElementById('header-cyl-id').textContent = `CYLINDER ${selectedCyl.id} (BANK ${selectedCyl.bank})`;
    document.getElementById('header-crank-deg').textContent = `${Math.round(selectedCyl.cycleDeg)}° CRANK`;
    document.getElementById('kinematic-after-tdc').textContent = `${Math.round(selectedCyl.crankAngleFromTdc)}° AFTER TDC`;
    document.getElementById('pv-cyl-tag').textContent = `CYL ${selectedCyl.id}`;

    // Active Stroke
    const strokeNameEl = document.getElementById('header-stroke-name');
    strokeNameEl.textContent = selectedCyl.phase.name;
    strokeNameEl.className = `stroke-name-large stroke-${selectedCyl.phase.code.toLowerCase()}`;

    // Stroke Badges
    ['intake', 'compression', 'power', 'exhaust'].forEach(code => {
      const badge = document.getElementById(`badge-stroke-${code}`);
      if (badge) {
        badge.classList.toggle('active', selectedCyl.phase.code.toLowerCase() === code);
      }
    });

    // Chamber Pressure & Temperature
    document.getElementById('chamber-pressure-val').textContent = selectedCyl.thermo.pressureBar.toFixed(1);
    document.getElementById('chamber-temp-val').textContent = `${selectedCyl.thermo.temperatureK} K`;

    // Highlight active firing cylinder in the bottom strip
    const pills = document.querySelectorAll('.fo-pill');
    pills.forEach(p => {
      const id = parseInt(p.dataset.cylId, 10);
      const isFiring = (id === engineState.activeFiringCylinder);
      p.classList.toggle('firing', isFiring);
    });
  }
}

// Instantiate on DOM load
window.addEventListener('DOMContentLoaded', () => {
  new V12Application();
});
