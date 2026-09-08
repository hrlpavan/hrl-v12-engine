// ============================================================================
// HRL V12 Engine Project - Master Controller & Application Orchestration
// Apple Design System · Zero Emojis · Clean SVG Vector Graphics
// ============================================================================

import { computeEngineState, FIRING_ORDER, CYLINDERS, normalizeAngle } from './engine/kinematics.js';
import { audioEngine } from './engine/audio.js';
import { V12Scene3D } from './engine/scene3d.js';
import { TelemetryManager } from './ui/telemetry.js';

class V12Application {
  constructor() {
    this.isPlaying = true;
    this.masterCrankAngleDeg = 0.0;
    this.engineRpm = 7200;
    this.playbackRate = 0.05;
    this.selectedCylinderId = 1;
    this.isIsolated = false;
    this.currentTheme = 'light'; // Default to Day Mode

    this.scene3d = null;
    this.telemetry = null;
    this.lastTime = performance.now();

    this.init();
  }

  init() {
    // Set root theme attribute
    document.documentElement.setAttribute('data-theme', 'light');

    const container = document.getElementById('canvas-container');
    this.scene3d = new V12Scene3D(container);
    this.scene3d.setTheme('light');

    const canvases = {
      sliderCrank: document.getElementById('canvas-slider-crank'),
      crankEndView: document.getElementById('canvas-crank-end'),
      valveTiming: document.getElementById('canvas-valve-timing'),
      pvIndicator: document.getElementById('canvas-pv-indicator')
    };

    const onCrankScrub = (scrubCycleDeg) => {
      const selectedCyl = CYLINDERS.find(c => c.id === this.selectedCylinderId) || CYLINDERS[0];
      this.masterCrankAngleDeg = normalizeAngle(scrubCycleDeg + selectedCyl.firingTdc, 720);
    };

    this.telemetry = new TelemetryManager(canvases, onCrankScrub);

    this._buildFiringOrderStrip();
    this._bindControls();

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
    // 1. Play / Pause with Apple SVG toggle
    const btnPlayPause = document.getElementById('btn-play-pause');
    const playSvg = document.getElementById('play-icon-svg');

    const updatePlayPauseSvg = (playing) => {
      if (playing) {
        // Pause icon (two vertical bars)
        playSvg.innerHTML = `
          <rect x="6" y="5" width="4" height="14" rx="1"></rect>
          <rect x="14" y="5" width="4" height="14" rx="1"></rect>
        `;
        btnPlayPause.classList.add('primary-circle');
      } else {
        // Play icon (triangle)
        playSvg.innerHTML = `
          <polygon points="7 4 19 12 7 20 7 4"></polygon>
        `;
        btnPlayPause.classList.remove('primary-circle');
      }
    };

    btnPlayPause.addEventListener('click', () => {
      this.isPlaying = !this.isPlaying;
      updatePlayPauseSvg(this.isPlaying);
    });

    // 2. Step Buttons
    document.getElementById('btn-step-back-15').addEventListener('click', () => {
      this.isPlaying = false;
      this.masterCrankAngleDeg = normalizeAngle(this.masterCrankAngleDeg - 15, 720);
      updatePlayPauseSvg(false);
    });

    document.getElementById('btn-step-fwd-15').addEventListener('click', () => {
      this.isPlaying = false;
      this.masterCrankAngleDeg = normalizeAngle(this.masterCrankAngleDeg + 15, 720);
      updatePlayPauseSvg(false);
    });

    document.getElementById('btn-step-fwd-1').addEventListener('click', () => {
      this.isPlaying = false;
      this.masterCrankAngleDeg = normalizeAngle(this.masterCrankAngleDeg + 1, 720);
      updatePlayPauseSvg(false);
    });

    // 3. RPM Slider
    const rpmSlider = document.getElementById('rpm-slider');
    const rpmDisplay = document.getElementById('rpm-display');

    rpmSlider.addEventListener('input', (e) => {
      this.engineRpm = parseInt(e.target.value, 10);
      rpmDisplay.textContent = this.engineRpm;
      audioEngine.setRpm(this.engineRpm);
    });

    // 4. Playback Speed Slider
    const speedSlider = document.getElementById('playback-speed');
    const speedText = document.getElementById('playback-rate-text');

    speedSlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      this.playbackRate = val;
      if (val >= 0.95) {
        speedText.textContent = '1x';
      } else {
        const denom = Math.round(1 / val);
        speedText.textContent = `1/${denom}`;
      }
    });

    // 5. Audio Synthesizer Controls (Vector SVG without emojis)
    const btnAudio = document.getElementById('btn-audio-toggle');
    const audioStatusText = document.getElementById('audio-status-text');
    const audioVol = document.getElementById('audio-volume');
    const btnThrottleBlip = document.getElementById('btn-throttle-blip');
    const muteLine1 = document.getElementById('audio-mute-line');
    const muteLine2 = document.getElementById('audio-mute-line-2');
    const audioWaves = document.getElementById('audio-waves');

    btnAudio.addEventListener('click', () => {
      const unmuted = audioEngine.toggleMute();
      audioStatusText.textContent = unmuted ? 'Audio On' : 'Audio Off';
      btnAudio.classList.toggle('active', unmuted);

      if (muteLine1 && muteLine2 && audioWaves) {
        muteLine1.style.display = unmuted ? 'none' : 'block';
        muteLine2.style.display = unmuted ? 'none' : 'block';
        audioWaves.style.display = unmuted ? 'block' : 'none';
      }
    });

    audioVol.addEventListener('input', (e) => {
      audioEngine.setVolume(parseFloat(e.target.value));
    });

    btnThrottleBlip.addEventListener('click', () => {
      audioEngine.blipThrottle(2200);
      rpmDisplay.textContent = Math.min(9500, this.engineRpm + 2200);
      setTimeout(() => {
        rpmDisplay.textContent = this.engineRpm;
      }, 400);
    });

    // 6. Camera Presets
    const camButtons = document.querySelectorAll('.camera-segment .seg-btn');
    camButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        camButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.scene3d.setCameraPreset(btn.dataset.camera);
      });
    });

    // 7. Cutaway Selector
    const cutawayButtons = document.querySelectorAll('.cutaway-segment .seg-btn');
    cutawayButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        cutawayButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.scene3d.setCutawayMode(btn.dataset.cutaway);
      });
    });

    // 8. Overlays Toggles
    const overlayButtons = document.querySelectorAll('.toggle-pill[data-overlay]');
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

    // 10. Theme Mode Toggle (Day / Dark)
    const btnThemeLight = document.getElementById('btn-theme-light');
    const btnThemeDark = document.getElementById('btn-theme-dark');

    const setTheme = (theme) => {
      this.currentTheme = theme;
      document.documentElement.setAttribute('data-theme', theme);
      if (btnThemeLight) btnThemeLight.classList.toggle('active', theme === 'light');
      if (btnThemeDark) btnThemeDark.classList.toggle('active', theme === 'dark');
      this.scene3d.setTheme(theme);
      this.telemetry.setTheme(theme);
    };

    if (btnThemeLight) btnThemeLight.addEventListener('click', () => setTheme('light'));
    if (btnThemeDark) btnThemeDark.addEventListener('click', () => setTheme('dark'));

    // 11. Keyboard Shortcuts
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
      } else if (e.key === 't' || e.key === 'T') {
        setTheme(this.currentTheme === 'light' ? 'dark' : 'light');
      }
    });
  }

  _loop(currentTime) {
    requestAnimationFrame((t) => this._loop(t));

    const dt = Math.min(0.1, (currentTime - this.lastTime) / 1000.0);
    this.lastTime = currentTime;

    if (this.isPlaying) {
      const degPerSec = (this.engineRpm * 360.0) / 60.0;
      this.masterCrankAngleDeg = normalizeAngle(this.masterCrankAngleDeg + degPerSec * this.playbackRate * dt, 720);
    }

    const engineState = computeEngineState(this.masterCrankAngleDeg, this.engineRpm);

    this.scene3d.update(engineState);
    this.telemetry.render(engineState, this.selectedCylinderId);
    this._updateHudText(engineState);
  }

  _updateHudText(engineState) {
    const selectedCyl = engineState.cylinders.find(c => c.id === this.selectedCylinderId) || engineState.cylinders[0];

    document.getElementById('header-cyl-id').textContent = `Cylinder ${selectedCyl.id} (Bank ${selectedCyl.bank})`;
    document.getElementById('header-crank-deg').textContent = `${Math.round(selectedCyl.cycleDeg)}° Crank Position`;
    document.getElementById('kinematic-after-tdc').textContent = `${Math.round(selectedCyl.crankAngleFromTdc)}° After TDC`;
    document.getElementById('pv-cyl-tag').textContent = `Cyl ${selectedCyl.id}`;

    const strokeNameEl = document.getElementById('header-stroke-name');
    strokeNameEl.textContent = selectedCyl.phase.name;
    strokeNameEl.className = `status-pill status-${selectedCyl.phase.code.toLowerCase()}`;

    ['intake', 'compression', 'power', 'exhaust'].forEach(code => {
      const badge = document.getElementById(`badge-stroke-${code}`);
      if (badge) {
        badge.classList.toggle('active', selectedCyl.phase.code.toLowerCase() === code);
      }
    });

    document.getElementById('chamber-pressure-val').textContent = selectedCyl.thermo.pressureBar.toFixed(1);
    document.getElementById('chamber-temp-val').textContent = `${selectedCyl.thermo.temperatureK} K`;

    const pills = document.querySelectorAll('.fo-pill');
    pills.forEach(p => {
      const id = parseInt(p.dataset.cylId, 10);
      const isFiring = (id === engineState.activeFiringCylinder);
      p.classList.toggle('firing', isFiring);
    });
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new V12Application();
});
