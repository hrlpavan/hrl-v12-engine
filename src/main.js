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
    this.engineRpm = 1600;
    this.playbackRate = 0.05;
    this.selectedCylinderId = 1;
    this.isIsolated = false;
    this.currentTheme = 'light'; // Default to Day Mode
    this.isDynoRunning = false;
    this.cutCylinders = [];
    this.isEcoMode = false;

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
      pvIndicator: document.getElementById('canvas-pv-indicator'),
      dynoCurve: document.getElementById('canvas-dyno-curve'),
      sankeyDiagram: document.getElementById('canvas-sankey-diagram'),
      perfMap: document.getElementById('canvas-perf-map'),
      emissionsMap: document.getElementById('canvas-emissions')
    };

    const onCrankScrub = (scrubCycleDeg) => {
      const selectedCyl = CYLINDERS.find(c => c.id === this.selectedCylinderId) || CYLINDERS[0];
      this.masterCrankAngleDeg = normalizeAngle(scrubCycleDeg + selectedCyl.firingTdc, 720);
    };

    this.telemetry = new TelemetryManager(canvases, onCrankScrub);

    // Wire 3D Raycasting Part Inspector Tooltip HUD
    const tooltipEl = document.getElementById('part-tooltip');
    const tooltipName = document.getElementById('tooltip-part-name');
    const tooltipMetallurgy = document.getElementById('tooltip-part-metallurgy');
    const tooltipTemp = document.getElementById('tooltip-part-temp');
    const tooltipMass = document.getElementById('tooltip-part-mass');
    const tooltipTolerance = document.getElementById('tooltip-part-tolerance');
    const tooltipNote = document.getElementById('tooltip-part-note');
    const btnTooltipClose = document.getElementById('btn-tooltip-close');

    this.scene3d.onPartHover = (partInfo) => {
      if (!partInfo || !tooltipEl) {
        if (tooltipEl) tooltipEl.style.display = 'none';
        return;
      }
      if (tooltipName) tooltipName.textContent = partInfo.name || 'V12 Component';
      if (tooltipMetallurgy) tooltipMetallurgy.textContent = partInfo.metallurgy || 'Aerospace Alloy';
      if (tooltipTemp) tooltipTemp.textContent = partInfo.tempK || '360 K';
      if (tooltipMass) tooltipMass.textContent = partInfo.massGrams || '—';
      if (tooltipTolerance) tooltipTolerance.textContent = partInfo.toleranceMm || '±0.005 mm';
      if (tooltipNote) tooltipNote.textContent = partInfo.heritageNote || '';

      // Cleanly show anchored bottom-left HUD card without cursor obstruction
      tooltipEl.style.display = 'block';
    };

    if (btnTooltipClose) {
      btnTooltipClose.addEventListener('click', (e) => {
        e.stopPropagation();
        if (tooltipEl) tooltipEl.style.display = 'none';
        this.scene3d.clearHighlight();
      });
    }

    this.scene3d.onPartClick = (partInfo) => {
      audioEngine.blipThrottle(0.3);
    };

    this._buildFiringOrderStrip();
    this._bindControls();
    this._bindMorseControls();

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
      audioEngine.blipThrottle(1600);
      rpmDisplay.textContent = Math.min(6000, this.engineRpm + 1600);
      setTimeout(() => {
        rpmDisplay.textContent = this.engineRpm;
      }, 450);
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

    // 11. Consolidated Telemetry Inspector Tabs Switching
    const inspectorTabs = document.querySelectorAll('.inspector-tabs .seg-btn');
    const inspectorPanes = document.querySelectorAll('.inspector-pane');

    inspectorTabs.forEach(btn => {
      btn.addEventListener('click', () => {
        inspectorTabs.forEach(b => b.classList.remove('active'));
        inspectorPanes.forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        const targetPane = document.getElementById(`pane-${btn.dataset.tab}`);
        if (targetPane) targetPane.classList.add('active');
        this.telemetry.resizeCanvases();
      });
    });

    // 12. Inspector Open / Close & Floating Summon Chip
    const inspector = document.getElementById('telemetry-inspector');
    const btnTelemetryToggle = document.getElementById('btn-telemetry-toggle');
    const btnInspectorClose = document.getElementById('btn-inspector-close');
    const btnFloatingTelemetry = document.getElementById('btn-floating-telemetry');

    const setInspectorOpen = (open) => {
      inspector.classList.toggle('collapsed', !open);
      if (btnTelemetryToggle) btnTelemetryToggle.classList.toggle('active', open);
      if (btnFloatingTelemetry) btnFloatingTelemetry.classList.toggle('active', !open);
      if (open) {
        this.telemetry.resizeCanvases();
      }
    };

    if (btnTelemetryToggle) {
      btnTelemetryToggle.addEventListener('click', () => {
        const isCollapsed = inspector.classList.contains('collapsed');
        setInspectorOpen(isCollapsed);
      });
    }

    if (btnInspectorClose) {
      btnInspectorClose.addEventListener('click', () => setInspectorOpen(false));
    }

    if (btnFloatingTelemetry) {
      btnFloatingTelemetry.addEventListener('click', () => setInspectorOpen(true));
    }

    // 13. Zen Mode (Full Engine Focus / Hide HUD)
    const hudOverlay = document.getElementById('hud-overlay');
    const btnZenMode = document.getElementById('btn-zen-mode');
    const btnZenExit = document.getElementById('btn-zen-exit');

    const toggleZenMode = (forcedState) => {
      const isHidden = forcedState !== undefined ? forcedState : !hudOverlay.classList.contains('hud-hidden');
      hudOverlay.classList.toggle('hud-hidden', isHidden);
      document.body.classList.toggle('zen-active', isHidden);
    };

    if (btnZenMode) btnZenMode.addEventListener('click', () => toggleZenMode());
    if (btnZenExit) btnZenExit.addEventListener('click', () => toggleZenMode(false));

    // 14. Exploded View Disassembly Slider (0% - 100%)
    const sliderExploded = document.getElementById('slider-exploded-view');
    const textExploded = document.getElementById('exploded-val-text');
    if (sliderExploded) {
      sliderExploded.addEventListener('input', (e) => {
        const factor = parseFloat(e.target.value);
        this.scene3d.setExplodedFactor(factor);
        if (textExploded) textExploded.textContent = `${Math.round(factor * 100)}%`;
      });
    }

    // 15. Thermal FLIR Mode Toggle
    const btnThermal = document.getElementById('btn-thermal-toggle');
    if (btnThermal) {
      btnThermal.addEventListener('click', () => {
        btnThermal.classList.toggle('active');
        const isThermal = btnThermal.classList.contains('active');
        this.scene3d.setThermalMode(isThermal);
      });
    }

    // 16. Cinematic Drone Auto-Tour
    const btnCameraTour = document.getElementById('btn-camera-tour');
    if (btnCameraTour) {
      btnCameraTour.addEventListener('click', () => {
        const isTour = this.scene3d.toggleAutoTour();
        btnCameraTour.classList.toggle('active', isTour);
      });
    }

    // 17. Automated Dyno Sweep Triggers
    const btnDyno = document.getElementById('btn-dock-dyno-pull');
    const btnDynoRun = document.getElementById('btn-dyno-pull-run');
    if (btnDyno) btnDyno.addEventListener('click', () => this.runDynoPull());
    if (btnDynoRun) btnDynoRun.addEventListener('click', () => this.runDynoPull());

    // 18. 3D Part Inspector Mode Toggle (Opt-in)
    const btnInspectToggle = document.getElementById('btn-inspect-toggle');
    const tooltipEl = document.getElementById('part-tooltip');
    if (btnInspectToggle) {
      btnInspectToggle.addEventListener('click', () => {
        const isEnabled = !btnInspectToggle.classList.contains('active');
        btnInspectToggle.classList.toggle('active', isEnabled);
        this.scene3d.setInspectorEnabled(isEnabled);
        if (!isEnabled && tooltipEl) {
          tooltipEl.style.display = 'none';
        }
      });
    }

    // 18b. Ganesan High-Efficiency Atkinson & Lean Burn Toggle
    const btnEcoToggle = document.getElementById('btn-eco-toggle');
    const btnPaneEcoToggle = document.getElementById('btn-pane-eco-toggle');
    const ecoStatus = document.getElementById('eco-mode-status');
    const paneBtnLabel = document.getElementById('pane-eco-btn-label');
    const cycleBadge = document.getElementById('eco-cycle-badge');

    const toggleEcoMode = () => {
      this.isEcoMode = !this.isEcoMode;
      if (btnEcoToggle) btnEcoToggle.classList.toggle('active', this.isEcoMode);
      if (btnPaneEcoToggle) btnPaneEcoToggle.classList.toggle('active', this.isEcoMode);
      if (ecoStatus) ecoStatus.textContent = this.isEcoMode ? 'Eco (Atkinson)' : 'Standard (Otto)';
      if (paneBtnLabel) paneBtnLabel.textContent = this.isEcoMode ? 'Atkinson Active' : 'Standard Mode';
      if (cycleBadge) cycleBadge.textContent = this.isEcoMode ? 'Atkinson Cycle (e=13.5:1) · Stratified Lean' : 'Standard Otto Cycle · Stoichiometric';
      this.scene3d.setEcoMode(this.isEcoMode);
    };

    if (btnEcoToggle) btnEcoToggle.addEventListener('click', toggleEcoMode);
    if (btnPaneEcoToggle) btnPaneEcoToggle.addEventListener('click', toggleEcoMode);

    // 19. Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        btnPlayPause.click();
      } else if (e.key === 'h' || e.key === 'H') {
        toggleZenMode();
      } else if (e.key === 'Escape') {
        toggleZenMode(false);
      } else if (e.code === 'ArrowRight') {
        document.getElementById('btn-step-fwd-15').click();
      } else if (e.code === 'ArrowLeft') {
        document.getElementById('btn-step-back-15').click();
      } else if (e.key === 'm' || e.key === 'M') {
        btnAudio.click();
      } else if (e.key === 't' || e.key === 'T') {
        setTheme(this.currentTheme === 'light' ? 'dark' : 'light');
      } else if (e.key === 'd' || e.key === 'D') {
        this.runDynoPull();
      } else if (e.key === 'e' || e.key === 'E') {
        toggleEcoMode();
      } else if (e.key === 'i' || e.key === 'I') {
        if (btnInspectToggle) btnInspectToggle.click();
      }
    });
  }

  /**
   * Automated Dyno Pull Sweep Simulation
   * Wide-open throttle sweep from 600 RPM to 6,000 RPM with live boost buildup,
   * 900 Nm tidal torque plateau, and twin turbo blow-off valve flutter on lift-off.
   */
  runDynoPull() {
    if (this.isDynoRunning) return;
    this.isDynoRunning = true;

    // Switch inspector tab to dyno tab so user sees live trace
    const dynoTabBtn = document.querySelector('.inspector-tabs .seg-btn[data-tab="dyno"]');
    if (dynoTabBtn) dynoTabBtn.click();

    const btnDyno = document.getElementById('btn-dock-dyno-pull');
    const btnDynoRun = document.getElementById('btn-dyno-pull-run');
    if (btnDyno) btnDyno.classList.add('dyno-running');
    if (btnDynoRun) btnDynoRun.classList.add('dyno-running');

    this.isPlaying = true;
    if (typeof audioEngine.ensureContext === 'function') audioEngine.ensureContext();
    if (typeof audioEngine.start === 'function') audioEngine.start();
    if (typeof audioEngine.blipThrottle === 'function') audioEngine.blipThrottle(0.95);

    const startRpm = 600;
    const peakRpm = 6000;
    const durationMs = 4200;
    const startTime = performance.now();

    const sweepInterval = setInterval(() => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(1.0, elapsed / durationMs);

      // Smooth power delivery acceleration curve
      const eased = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      this.engineRpm = Math.round(startRpm + (peakRpm - startRpm) * eased);
      audioEngine.setRpm(this.engineRpm);

      const rpmInput = document.getElementById('rpm-slider');
      if (rpmInput) rpmInput.value = this.engineRpm;
      const rpmText = document.getElementById('rpm-display');
      if (rpmText) rpmText.textContent = this.engineRpm;

      if (progress >= 1.0) {
        clearInterval(sweepInterval);
        // Cut throttle and trigger twin turbo blow-off valve flutter!
        audioEngine.playBovFlutter();

        // Ease RPM back down to steady 1,600 RPM
        setTimeout(() => {
          let settleProgress = 0;
          const settleInterval = setInterval(() => {
            settleProgress += 0.05;
            this.engineRpm = Math.round(peakRpm - (peakRpm - 1600) * settleProgress);
            audioEngine.setRpm(this.engineRpm);
            if (rpmInput) rpmInput.value = this.engineRpm;
            if (rpmText) rpmText.textContent = this.engineRpm;

            if (settleProgress >= 1.0) {
              clearInterval(settleInterval);
              this.engineRpm = 1600;
              this.isDynoRunning = false;
              if (btnDyno) btnDyno.classList.remove('dyno-running');
              if (btnDynoRun) btnDynoRun.classList.remove('dyno-running');
            }
          }, 35);
        }, 350);
      }
    }, 25);
  }

  _bindMorseControls() {
    const buttons = document.querySelectorAll('#morse-cyl-buttons .morse-cyl-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const cylId = parseInt(btn.dataset.cyl, 10);
        if (this.cutCylinders.includes(cylId)) {
          this.cutCylinders = this.cutCylinders.filter(id => id !== cylId);
          btn.classList.remove('cut');
        } else {
          this.cutCylinders.push(cylId);
          btn.classList.add('cut');
        }
      });
    });

    const btnReset = document.getElementById('btn-morse-reset');
    if (btnReset) {
      btnReset.addEventListener('click', () => {
        this.cutCylinders = [];
        buttons.forEach(b => b.classList.remove('cut'));
      });
    }

    const btnAuto = document.getElementById('btn-morse-autorun');
    if (btnAuto) {
      btnAuto.addEventListener('click', () => this.runAutoMorseTest());
    }
  }

  runAutoMorseTest() {
    const buttons = document.querySelectorAll('#morse-cyl-buttons .morse-cyl-btn');
    let step = 1;
    this.cutCylinders = [];
    buttons.forEach(b => b.classList.remove('cut'));

    const interval = setInterval(() => {
      if (step > 12) {
        clearInterval(interval);
        this.cutCylinders = [];
        buttons.forEach(b => b.classList.remove('cut'));
        return;
      }
      this.cutCylinders = [step];
      buttons.forEach(b => {
        const id = parseInt(b.dataset.cyl, 10);
        b.classList.toggle('cut', id === step);
      });
      step++;
    }, 320);
  }

  _loop(currentTime) {
    requestAnimationFrame((t) => this._loop(t));

    const dt = Math.min(0.1, (currentTime - this.lastTime) / 1000.0);
    this.lastTime = currentTime;

    if (this.isPlaying) {
      const degPerSec = (this.engineRpm * 360.0) / 60.0;
      this.masterCrankAngleDeg = normalizeAngle(this.masterCrankAngleDeg + degPerSec * this.playbackRate * dt, 720);
    }

    const engineState = computeEngineState(this.masterCrankAngleDeg, this.engineRpm, 1.0, this.cutCylinders, this.isEcoMode);

    this.scene3d.update(engineState);
    this.telemetry.render(engineState, this.selectedCylinderId);
    this._updateHudText(engineState);
  }

  _updateHudText(engineState) {
    const selectedCyl = engineState.cylinders.find(c => c.id === this.selectedCylinderId) || engineState.cylinders[0];

    const headerCyl = document.getElementById('header-cyl-id');
    if (headerCyl) headerCyl.textContent = `Cylinder ${selectedCyl.id} (Bank ${selectedCyl.bank})`;

    const inspectorBadge = document.getElementById('inspector-cyl-badge');
    if (inspectorBadge) inspectorBadge.textContent = `Cylinder ${selectedCyl.id}`;

    const headerCrank = document.getElementById('header-crank-deg');
    if (headerCrank) headerCrank.textContent = `${Math.round(selectedCyl.cycleDeg)}° Crank Position`;

    const kinTdc = document.getElementById('kinematic-after-tdc');
    if (kinTdc) kinTdc.textContent = `${Math.round(selectedCyl.crankAngleFromTdc)}° After TDC`;

    const pvTag = document.getElementById('pv-cyl-tag');
    if (pvTag) pvTag.textContent = `Cyl ${selectedCyl.id}`;

    const strokeNameEl = document.getElementById('header-stroke-name');
    if (strokeNameEl) {
      strokeNameEl.textContent = selectedCyl.phase.name;
      strokeNameEl.className = `status-pill status-${selectedCyl.phase.code.toLowerCase()}`;
    }

    ['intake', 'compression', 'power', 'exhaust'].forEach(code => {
      const badge = document.getElementById(`badge-stroke-${code}`);
      if (badge) {
        badge.classList.toggle('active', selectedCyl.phase.code.toLowerCase() === code);
      }
    });

    document.getElementById('chamber-pressure-val').textContent = selectedCyl.thermo.pressureBar.toFixed(1);
    document.getElementById('chamber-temp-val').textContent = `${selectedCyl.thermo.temperatureK} K`;

    // Ganesan V2.0 Physical and Engineering Readouts
    const ganesan = engineState.ganesan;
    if (ganesan) {
      const elPistonSpeed = document.getElementById('cyl-piston-speed');
      if (elPistonSpeed) elPistonSpeed.textContent = `${ganesan.meanPistonSpeedMs.toFixed(1)} m/s`;

      const elGdiMode = document.getElementById('cyl-gdi-mode');
      if (elGdiMode) elGdiMode.textContent = ganesan.gdiMode;

      const elPhi = document.getElementById('cyl-phi-val');
      if (elPhi) elPhi.textContent = `${ganesan.phi.toFixed(2)} (${ganesan.airFuel.actualAfRatio.toFixed(1)}:1)`;

      const elMaf = document.getElementById('cyl-maf-val');
      if (elMaf) elMaf.textContent = `${ganesan.airFuel.massAirFlowKgH} kg/h`;

      const elMff = document.getElementById('cyl-mff-val');
      if (elMff) elMff.textContent = `${ganesan.airFuel.massFuelFlowKgH} kg/h`;

      // Thermodynamic Indicator Readouts
      const elImep = document.getElementById('thermo-imep-val');
      if (elImep) elImep.textContent = `${ganesan.power.imepBar.toFixed(2)} bar`;

      const elBmep = document.getElementById('thermo-bmep-val');
      if (elBmep) elBmep.textContent = `${ganesan.power.bmepBar.toFixed(2)} bar`;

      const elFmep = document.getElementById('thermo-fmep-val');
      if (elFmep) elFmep.textContent = `${ganesan.power.fmepBar.toFixed(2)} bar`;

      const elEtaM = document.getElementById('thermo-etam-val');
      if (elEtaM) elEtaM.textContent = `${ganesan.efficiencies.mechanicalPct.toFixed(1)}%`;

      const elEtaBth = document.getElementById('thermo-etabth-val');
      if (elEtaBth) elEtaBth.textContent = `${ganesan.efficiencies.brakeThermalPct.toFixed(1)}%`;

      const elEtaRel = document.getElementById('thermo-etarel-val');
      if (elEtaRel) elEtaRel.textContent = `${ganesan.efficiencies.relativePct.toFixed(1)}%`;

      // Sankey Heat Balance Readouts
      const elSqf = document.getElementById('sankey-qfuel');
      if (elSqf) elSqf.textContent = `${ganesan.heatBalance.qFuelKw} kW`;

      const elSbp = document.getElementById('sankey-bp');
      if (elSbp) elSbp.textContent = `${ganesan.heatBalance.brakePowerKw} kW (${ganesan.heatBalance.pctBrakePower}%)`;

      const elSqcool = document.getElementById('sankey-qcool');
      if (elSqcool) elSqcool.textContent = `${ganesan.heatBalance.qCoolantKw} kW (${ganesan.heatBalance.pctCoolant}%)`;

      const elSqex = document.getElementById('sankey-qex');
      if (elSqex) elSqex.textContent = `${ganesan.heatBalance.qExhaustKw} kW (${ganesan.heatBalance.pctExhaust}%)`;

      // Performance Map & Lubrication
      const elPlub = document.getElementById('perf-lub-regime');
      if (elPlub) elPlub.textContent = ganesan.friction.lubricationRegime;

      const elPsom = document.getElementById('perf-sommerfeld');
      if (elPsom) elPsom.textContent = ganesan.friction.sommerfeldParam.toFixed(4);

      const elPbsfc = document.getElementById('perf-bsfc');
      if (elPbsfc) elPbsfc.textContent = `${ganesan.power.bsfcGKwh} g/kWh`;

      const elPbsec = document.getElementById('perf-bsec');
      if (elPbsec) elPbsec.textContent = `${ganesan.power.bsecMjKwh} MJ/kWh`;

      // Valve Mach Index
      const elMach = document.getElementById('valves-mach-index');
      if (elMach) elMach.textContent = ganesan.airFuel.machData.machIndexZ.toFixed(3);

      const elChoke = document.getElementById('valves-choke-status');
      if (elChoke) elChoke.textContent = ganesan.airFuel.machData.isChoked ? 'CHOKED (Z > 0.55)' : 'Optimal (Z ≤ 0.55)';

      const elSonic = document.getElementById('valves-sonic-vel');
      if (elSonic) elSonic.textContent = `${ganesan.airFuel.machData.sonicVelocityMs} m/s`;

      // Morse Test Section
      const allFiringBp = ganesan.power.bpDeliveredKw / (this.cutCylinders.length === 0 ? 1 : Math.max(0.05, (12 - this.cutCylinders.length) / 12));
      const elMbpAll = document.getElementById('morse-bp-all');
      if (elMbpAll) elMbpAll.textContent = `${allFiringBp.toFixed(1)} kW`;

      const elMbpCur = document.getElementById('morse-bp-cur');
      if (elMbpCur) elMbpCur.textContent = `${ganesan.power.bpDeliveredKw.toFixed(1)} kW`;

      const elMipTot = document.getElementById('morse-ip-total');
      if (elMipTot) elMipTot.textContent = `${ganesan.power.ipTotalKw.toFixed(1)} kW`;

      const elMetaM = document.getElementById('morse-eta-m');
      if (elMetaM) elMetaM.textContent = `${ganesan.efficiencies.mechanicalPct.toFixed(1)}%`;

      // Emissions Readouts
      const elEnox = document.getElementById('emiss-nox-val');
      if (elEnox) elEnox.textContent = `${ganesan.emissions.raw.noxPpm} / ${ganesan.emissions.tailpipe.noxPpm} ppm`;

      const elEco = document.getElementById('emiss-co-val');
      if (elEco) elEco.textContent = `${ganesan.emissions.raw.coPct}% / ${ganesan.emissions.tailpipe.coPct}%`;

      const elEhc = document.getElementById('emiss-hc-val');
      if (elEhc) elEhc.textContent = `${ganesan.emissions.raw.hcPpm} / ${ganesan.emissions.tailpipe.hcPpm} ppm`;

      const elEcat = document.getElementById('cat-status-val');
      if (elEcat) elEcat.textContent = `${ganesan.emissions.catalyst.tempC}°C (${ganesan.emissions.catalyst.isLightOff ? 'Light-Off Active' : 'Warming Up'})`;

      // Ganesan Real-World Fuel Economy & Mileage Readouts (Ganesan Sec. 15.5.3, p. 479)
      if (ganesan.mileage) {
        const m = ganesan.mileage;
        const elEcoKml = document.getElementById('eco-mileage-kml');
        if (elEcoKml && m.kmPerLiter != null) elEcoKml.textContent = Number(m.kmPerLiter).toFixed(1);

        const elEcoMpgUs = document.getElementById('eco-mileage-mpg-us');
        if (elEcoMpgUs && m.mpgUs != null) elEcoMpgUs.textContent = Number(m.mpgUs).toFixed(1);

        const elEcoMpgUk = document.getElementById('eco-mileage-mpg-uk');
        const ukVal = m.mpgImperial ?? m.mpgImp;
        if (elEcoMpgUk && ukVal != null) elEcoMpgUk.textContent = Number(ukVal).toFixed(1);

        const elEcoL100 = document.getElementById('eco-mileage-l100km');
        const l100Val = m.litersPer100km ?? m.litersPer100Km;
        if (elEcoL100 && l100Val != null) elEcoL100.textContent = Number(l100Val).toFixed(2);

        const elEcoSavedPct = document.getElementById('eco-fuel-saved-pct');
        if (elEcoSavedPct && m.fuelSavedPct != null) elEcoSavedPct.textContent = `+${Number(m.fuelSavedPct).toFixed(1)}%`;

        const elEcoFuelLh = document.getElementById('eco-fuel-flow-lh');
        if (elEcoFuelLh && m.fuelLitersPerHour != null) elEcoFuelLh.textContent = `${Number(m.fuelLitersPerHour).toFixed(1)} L/h`;

        const elEcoFuelKgh = document.getElementById('eco-fuel-flow-kgh');
        if (elEcoFuelKgh && ganesan.airFuel && ganesan.airFuel.massFuelFlowKgH != null) {
          elEcoFuelKgh.textContent = `${Number(ganesan.airFuel.massFuelFlowKgH).toFixed(1)} kg/h`;
        }

        const elEcoBth = document.getElementById('eco-etabth-val');
        if (elEcoBth) elEcoBth.textContent = `${ganesan.efficiencies.brakeThermalPct.toFixed(1)}%`;

        const elEcoBsfc = document.getElementById('eco-bsfc-val');
        if (elEcoBsfc) elEcoBsfc.textContent = `${ganesan.power.bsfcGKwh} g/kWh`;

        const elEcoAirStd = document.getElementById('eco-eta-airstd-val');
        if (elEcoAirStd) elEcoAirStd.textContent = `${ganesan.efficiencies.airStandardOttoPct.toFixed(1)}% (${this.isEcoMode ? 'Atkinson' : 'Otto'})`;

        const elEcoExp = document.getElementById('eco-expansion-ratio');
        if (elEcoExp) elEcoExp.textContent = `${this.isEcoMode ? '13.5 : 1 (e)' : '10.0 : 1 (r)'}`;

        const elSavingBadge = document.getElementById('eco-saving-badge');
        if (elSavingBadge) {
          elSavingBadge.style.opacity = this.isEcoMode ? '1' : '0.4';
        }
      }

      // FEAD Serpentine Belt & Auxiliary Drive HUD Updates (Ganesan Ch. 12 & 13)
      if (ganesan.feadBelt) {
        const b = ganesan.feadBelt;
        const elFeadPower = document.getElementById('fead-power-total');
        if (elFeadPower) elFeadPower.textContent = b.totalAuxiliaryPowerKw.toFixed(2);

        const elFeadSpeed = document.getElementById('fead-belt-speed');
        if (elFeadSpeed) elFeadSpeed.textContent = `${b.linearBeltSpeedMs.toFixed(1)} m/s (${b.linearBeltSpeedKmh.toFixed(0)} km/h)`;

        const elFeadAmep = document.getElementById('fead-amep-val');
        if (elFeadAmep) elFeadAmep.textContent = `${b.amepBar.toFixed(2)} bar`;

        const elFeadTorque = document.getElementById('fead-torque-val');
        if (elFeadTorque) elFeadTorque.textContent = `${b.totalAuxiliaryTorqueNm.toFixed(1)} Nm`;

        const elFeadT1 = document.getElementById('fead-t1-val');
        if (elFeadT1) elFeadT1.textContent = `${b.tightTensionN} N`;

        const elFeadT2 = document.getElementById('fead-t2-val');
        if (elFeadT2) elFeadT2.textContent = `${b.slackTensionN} N`;

        const elFeadRatio = document.getElementById('fead-ratio-val');
        if (elFeadRatio) elFeadRatio.textContent = b.tensionRatio != null ? b.tensionRatio.toFixed(2) : '1.44';

        const elFeadCent = document.getElementById('fead-centrifugal-val');
        if (elFeadCent) elFeadCent.textContent = `${b.centrifugalTensionN} N`;

        const elFeadTvd = document.getElementById('fead-tvd-val');
        if (elFeadTvd) elFeadTvd.textContent = `-${b.tvdAttenuationPct}% (${b.dampedTorsionalTwistDeg}° twist)`;

        const elFeadWp = document.getElementById('fead-wp-kw');
        if (elFeadWp) elFeadWp.textContent = `${b.waterPumpKw.toFixed(2)} kW (130 mm)`;

        const elFeadAlt = document.getElementById('fead-alt-kw');
        if (elFeadAlt) elFeadAlt.textContent = `${b.alternatorKw.toFixed(2)} kW (70 mm)`;

        const elFeadAc = document.getElementById('fead-ac-kw');
        if (elFeadAc) elFeadAc.textContent = `${b.acCompressorKw.toFixed(2)} kW (125 mm)`;

        const elFeadHyst = document.getElementById('fead-hyst-kw');
        if (elFeadHyst) elFeadHyst.textContent = `${b.beltHysteresisLossKw.toFixed(2)} kW (3.8%)`;
      }
    }

    // Rolls-Royce Power Reserve Gauge update
    const prVal = engineState.powerReservePercent;
    const prDisplay = document.getElementById('power-reserve-val');
    if (prDisplay) prDisplay.textContent = `${Math.round(prVal)}%`;

    const prStatus = document.getElementById('power-reserve-status');
    if (prStatus) {
      prStatus.textContent = prVal >= 95 ? '100% Available' : (prVal >= 50 ? `${Math.round(prVal)}% Reserve` : 'Maximum Output');
    }

    const prFill = document.getElementById('pr-gauge-fill');
    if (prFill) {
      const offset = 62.0 * (1.0 - Math.max(0, Math.min(100, prVal)) / 100.0);
      prFill.style.strokeDashoffset = offset;
    }

    // Rolls-Royce 1906 Coin Balance Test status
    const coinBadge = document.getElementById('coin-status-badge');
    if (coinBadge && engineState.coinStability) {
      coinBadge.textContent = engineState.coinStability.status;
    }

    // Twin Turbocharger Boost Pressure
    const turboVal = document.getElementById('turbo-boost-val');
    if (turboVal && engineState.turboBoost) {
      turboVal.textContent = `${engineState.turboBoost.absoluteBar.toFixed(2)} bar`;
    }

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
