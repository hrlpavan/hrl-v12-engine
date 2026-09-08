// ============================================================================
// HRL V12 Engine Project - 2D Engineering Telemetry & Analytical Diagrams
// Kinematic Slider-Crank, 60° Crank End-View, Valve Timing, P-V Indicator
// ============================================================================

import { ENGINE_SPECS, calculateValveLifts, calculateChamberPressure, normalizeAngle, degToRad } from '../engine/kinematics.js';

export class TelemetryManager {
  constructor(canvases, onCrankScrub) {
    this.sliderCrankCanvas = canvases.sliderCrank;
    this.crankEndViewCanvas = canvases.crankEndView;
    this.valveTimingCanvas = canvases.valveTiming;
    this.pvIndicatorCanvas = canvases.pvIndicator;
    this.onCrankScrub = onCrankScrub;

    this.ctxSlider = this.sliderCrankCanvas.getContext('2d');
    this.ctxCrank = this.crankEndViewCanvas.getContext('2d');
    this.ctxValve = this.valveTimingCanvas.getContext('2d');
    this.ctxPv = this.pvIndicatorCanvas.getContext('2d');

    this._setupCanvasResolution();
    this._setupInteractions();
    this._precomputeCurves();
  }

  _setupCanvasResolution() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    [this.sliderCrankCanvas, this.crankEndViewCanvas, this.valveTimingCanvas, this.pvIndicatorCanvas].forEach(canvas => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
    });
  }

  _setupInteractions() {
    let isDragging = false;

    const handleScrub = (e) => {
      const rect = this.valveTimingCanvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const scrubCycleDeg = Math.max(0, Math.min(720, x * 720));
      if (this.onCrankScrub) {
        this.onCrankScrub(scrubCycleDeg);
      }
    };

    this.valveTimingCanvas.addEventListener('mousedown', (e) => {
      isDragging = true;
      handleScrub(e);
    });

    window.addEventListener('mousemove', (e) => {
      if (isDragging) handleScrub(e);
    });

    window.addEventListener('mouseup', () => {
      isDragging = false;
    });
  }

  _precomputeCurves() {
    // Precompute valve lift curves across 720°
    this.valveCurveData = [];
    this.pvCurveData = [];

    const rM = ENGINE_SPECS.crankRadiusMm / 1000.0;
    const lM = ENGINE_SPECS.rodLengthMm / 1000.0;

    for (let deg = 0; deg <= 720; deg += 2) {
      const valves = calculateValveLifts(deg);
      // Piston fraction
      const rad = degToRad(deg);
      const underRad = lM * lM - rM * rM * Math.sin(rad) * Math.sin(rad);
      const x = rM * Math.cos(rad) + Math.sqrt(Math.max(0.0001, underRad));
      const s = (rM + lM) - x;
      const frac = s / (2 * rM);

      const thermo = calculateChamberPressure(deg, frac);

      this.valveCurveData.push({ deg, intake: valves.intakeNorm, exhaust: valves.exhaustNorm, pistonFrac: frac });
      this.pvCurveData.push({ deg, frac, pressure: thermo.pressureBar, vol: thermo.volumeCm3 });
    }
  }

  /**
   * Main telemetry update call from animation loop
   */
  render(engineState, selectedCylId = 1) {
    const selectedCyl = engineState.cylinders.find(c => c.id === selectedCylId) || engineState.cylinders[0];

    this._renderSliderCrank(selectedCyl);
    this._renderCrankEndView(engineState, selectedCyl);
    this._renderValveTiming(selectedCyl);
    this._renderPvIndicator(selectedCyl);
  }

  /**
   * 1. 2D Slider-Crank Kinematic Schematic
   */
  _renderSliderCrank(cyl) {
    const ctx = this.ctxSlider;
    const w = this.sliderCrankCanvas.clientWidth;
    const h = this.sliderCrankCanvas.clientHeight;
    ctx.clearRect(0, 0, w, h);

    // Coordinate system: horizontal layout
    // Crank center on left, cylinder bore & piston slider on right
    const crankX = 42;
    const crankY = h / 2 + 10;
    const rScale = 28; // scale for crank radius (44.5mm)
    const lScale = (ENGINE_SPECS.rodLengthMm / ENGINE_SPECS.crankRadiusMm) * rScale; // ~100px

    const crankAngleRad = degToRad(cyl.crankAngleFromTdc);

    // Crank circle
    ctx.beginPath();
    ctx.arc(crankX, crankY, rScale, 0, Math.PI * 2);
    ctx.strokeStyle = '#263238';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Crank Center pin
    ctx.beginPath();
    ctx.arc(crankX, crankY, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#00e5ff';
    ctx.fill();

    // Crankpin Position
    // 0 rad = TDC (points directly right towards cylinder)
    const pinX = crankX + rScale * Math.cos(crankAngleRad);
    const pinY = crankY - rScale * Math.sin(crankAngleRad);

    // Crank Arm
    ctx.beginPath();
    ctx.moveTo(crankX, crankY);
    ctx.lineTo(pinX, pinY);
    ctx.strokeStyle = '#ff3b30';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(pinX, pinY, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // Piston wristpin position along bore axis (horizontal line Y = crankY)
    const sinT = Math.sin(crankAngleRad);
    const underRad = lScale * lScale - rScale * rScale * sinT * sinT;
    const wristX = pinX + Math.sqrt(Math.max(0, underRad));
    const wristY = crankY;

    // Connecting Rod
    ctx.beginPath();
    ctx.moveTo(pinX, pinY);
    ctx.lineTo(wristX, wristY);
    ctx.strokeStyle = '#90caf9';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Piston Slider Box
    const pWidth = 32;
    const pHeight = 24;
    ctx.fillStyle = '#37474f';
    ctx.strokeStyle = '#78909c';
    ctx.lineWidth = 1.5;
    ctx.fillRect(wristX - 6, wristY - pHeight / 2, pWidth, pHeight);
    ctx.strokeRect(wristX - 6, wristY - pHeight / 2, pWidth, pHeight);

    // Wrist pin
    ctx.beginPath();
    ctx.arc(wristX, wristY, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#ffb300';
    ctx.fill();

    // Bore Guidelines & Stroke Dimension
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(crankX + rScale + lScale - 2 * rScale, crankY - pHeight / 2 - 4);
    ctx.lineTo(crankX + rScale + lScale + 25, crankY - pHeight / 2 - 4);
    ctx.moveTo(crankX + rScale + lScale - 2 * rScale, crankY + pHeight / 2 + 4);
    ctx.lineTo(crankX + rScale + lScale + 25, crankY + pHeight / 2 + 4);
    ctx.stroke();
    ctx.setLineDash([]);

    // Telemetry text
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillText(`s = ${(cyl.kinematics.s * 1000).toFixed(1)} mm`, 10, 16);
    ctx.fillText(`v = ${(cyl.kinematics.v).toFixed(2)} m/s`, 95, 16);
    ctx.fillText(`a = ${(cyl.kinematics.a).toFixed(0)} m/s²`, 175, 16);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.fillText(`${Math.round(cyl.crankAngleFromTdc)}° AFTER TDC`, w - 85, 30);
  }

  /**
   * 2. 60° V12 Crankshaft End-View (Cross-Plane / 120° polar front view)
   */
  _renderCrankEndView(engineState, activeCyl) {
    const ctx = this.ctxCrank;
    const w = this.crankEndViewCanvas.clientWidth;
    const h = this.crankEndViewCanvas.clientHeight;
    ctx.clearRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2 + 10;
    const radius = 38;

    // Bank axes at ±30° from vertical (60° included angle)
    const bankRRad = -degToRad(60); // Right Bank vector
    const bankLRad = -degToRad(120); // Left Bank vector

    // Draw Bank Axis Lines
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);

    // Right Bank line
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(bankRRad) * (radius + 24), cy + Math.sin(bankRRad) * (radius + 24));
    ctx.stroke();

    // Left Bank line
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(bankLRad) * (radius + 24), cy + Math.sin(bankLRad) * (radius + 24));
    ctx.stroke();
    ctx.setLineDash([]);

    // Bank Labels
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.fillStyle = '#64748b';
    ctx.fillText('R BANK +30°', cx + 20, 20);
    ctx.fillText('L BANK -30°', cx - 78, 20);

    // Crank orbit circle
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Center crank journal
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#00e5ff';
    ctx.fill();

    // Draw 6 Throws at 120° intervals (Throws: 1&6 @ 0°, 3&4 @ 120°, 2&5 @ 240°)
    const masterCrankRad = degToRad(engineState.crankAngleDeg);

    const throwPins = [
      { label: "1-6", angle: 0,   pins: [1, 6] },
      { label: "3-4", angle: 120, pins: [3, 4] },
      { label: "2-5", angle: 240, pins: [2, 5] }
    ];

    throwPins.forEach(tp => {
      const currentThrowAngle = masterCrankRad + degToRad(tp.angle);
      const px = cx + radius * Math.cos(currentThrowAngle);
      const py = cy + radius * Math.sin(currentThrowAngle);

      const isActive = tp.pins.includes(activeCyl.pin);

      // Web arm
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(px, py);
      ctx.strokeStyle = isActive ? '#ff3b30' : '#475569';
      ctx.lineWidth = isActive ? 2.5 : 1.5;
      ctx.stroke();

      // Pin circle
      ctx.beginPath();
      ctx.arc(px, py, isActive ? 6 : 4.5, 0, Math.PI * 2);
      ctx.fillStyle = isActive ? '#ff3b30' : '#94a3b8';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Pin label
      ctx.fillStyle = isActive ? '#ff3b30' : '#94a3b8';
      ctx.font = '8px "JetBrains Mono", monospace';
      ctx.fillText(tp.label, px + (px > cx ? 6 : -18), py + (py > cy ? 10 : -6));
    });
  }

  /**
   * 3. Valve Timing & Cam Lift Curve with Drag-to-Scrub Cursor
   */
  _renderValveTiming(cyl) {
    const ctx = this.ctxValve;
    const w = this.valveTimingCanvas.clientWidth;
    const h = this.valveTimingCanvas.clientHeight;
    ctx.clearRect(0, 0, w, h);

    const padLeft = 25;
    const padRight = 15;
    const padTop = 15;
    const padBottom = 22;
    const plotW = w - padLeft - padRight;
    const plotH = h - padTop - padBottom;

    // Stroke Background Bands (Power, Exhaust, Intake, Compression)
    const strokes = [
      { name: "EXPANSION", color: "rgba(255, 59, 48, 0.08)", x0: 0,   x1: 180 },
      { name: "EXHAUST",   color: "rgba(255, 149, 0, 0.08)", x0: 180, x1: 360 },
      { name: "INTAKE",    color: "rgba(0, 122, 255, 0.08)", x0: 360, x1: 540 },
      { name: "COMPR",     color: "rgba(88, 86, 214, 0.08)", x0: 540, x1: 720 }
    ];

    strokes.forEach(s => {
      const sx0 = padLeft + (s.x0 / 720) * plotW;
      const sw = ((s.x1 - s.x0) / 720) * plotW;
      ctx.fillStyle = s.color;
      ctx.fillRect(sx0, padTop, sw, plotH);

      ctx.fillStyle = '#64748b';
      ctx.font = '8px "JetBrains Mono", monospace';
      ctx.fillText(s.name, sx0 + sw / 2 - 18, padTop + 10);
    });

    // Grid baseline
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padLeft, padTop + plotH);
    ctx.lineTo(padLeft + plotW, padTop + plotH);
    ctx.stroke();

    // Plot Curves:
    // Piston Displacement (dashed gray)
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    this.valveCurveData.forEach((pt, i) => {
      const x = padLeft + (pt.deg / 720) * plotW;
      const y = padTop + plotH - pt.pistonFrac * (plotH * 0.7);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.setLineDash([]);

    // Exhaust Lift Curve (orange)
    ctx.strokeStyle = '#ff9500';
    ctx.lineWidth = 2;
    ctx.beginPath();
    let exStarted = false;
    this.valveCurveData.forEach(pt => {
      if (pt.exhaust > 0) {
        const x = padLeft + (pt.deg / 720) * plotW;
        const y = padTop + plotH - pt.exhaust * (plotH * 0.85);
        if (!exStarted) {
          ctx.moveTo(x, padTop + plotH);
          exStarted = true;
        }
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    // Intake Lift Curve (blue)
    ctx.strokeStyle = '#007aff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    let inStarted = false;
    this.valveCurveData.forEach(pt => {
      if (pt.intake > 0) {
        const x = padLeft + (pt.deg / 720) * plotW;
        const y = padTop + plotH - pt.intake * (plotH * 0.85);
        if (!inStarted) {
          ctx.moveTo(x, padTop + plotH);
          inStarted = true;
        }
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    // Current Cylinder Crank Angle Scrub Cursor
    const cursorX = padLeft + (cyl.cycleDeg / 720) * plotW;
    ctx.strokeStyle = '#ff3b30';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cursorX, padTop);
    ctx.lineTo(cursorX, padTop + plotH);
    ctx.stroke();

    // Cursor scrubber handle
    ctx.fillStyle = '#ff3b30';
    ctx.beginPath();
    ctx.arc(cursorX, padTop, 4, 0, Math.PI * 2);
    ctx.fill();

    // Live Readout Bar
    ctx.fillStyle = '#94a3b8';
    ctx.font = '8.5px "JetBrains Mono", monospace';
    ctx.fillText(`PISTON ${(cyl.pistonFraction * 100).toFixed(0)}%`, padLeft, h - 6);
    ctx.fillStyle = '#007aff';
    ctx.fillText(`IN ${(cyl.valves.intakeNorm).toFixed(2)}`, padLeft + 70, h - 6);
    ctx.fillStyle = '#ff9500';
    ctx.fillText(`EX ${(cyl.valves.exhaustNorm).toFixed(2)}`, padLeft + 120, h - 6);
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText(`${Math.round(cyl.cycleDeg)}° CRANK`, w - 65, h - 6);
  }

  /**
   * 4. Thermodynamic P-V Indicator Diagram (Otto Loop)
   */
  _renderPvIndicator(cyl) {
    const ctx = this.ctxPv;
    const w = this.pvIndicatorCanvas.clientWidth;
    const h = this.pvIndicatorCanvas.clientHeight;
    ctx.clearRect(0, 0, w, h);

    const padLeft = 28;
    const padRight = 15;
    const padTop = 15;
    const padBottom = 20;
    const plotW = w - padLeft - padRight;
    const plotH = h - padTop - padBottom;

    // Pressure scale: 0 to 90 bar
    const maxBar = 90;

    // Axes
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padLeft, padTop);
    ctx.lineTo(padLeft, padTop + plotH);
    ctx.lineTo(padLeft + plotW, padTop + plotH);
    ctx.stroke();

    // Axis labels
    ctx.fillStyle = '#64748b';
    ctx.font = '8px "JetBrains Mono", monospace';
    ctx.fillText('90', 8, padTop + 8);
    ctx.fillText('0', 12, padTop + plotH);
    ctx.fillText('BAR', 6, padTop + plotH / 2);
    ctx.fillText('TDC (Vc)', padLeft, padTop + plotH + 12);
    ctx.fillText('BDC (Vmax)', padLeft + plotW - 45, padTop + plotH + 12);

    // Draw full Otto Cycle PV curve
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    this.pvCurveData.forEach((pt, i) => {
      const vx = padLeft + pt.frac * plotW;
      const py = padTop + plotH - (Math.min(maxBar, pt.pressure) / maxBar) * plotH;
      if (i === 0) ctx.moveTo(vx, py);
      else ctx.lineTo(vx, py);
    });
    ctx.stroke();

    // Current Operating Point (Live tracer ball)
    const currentFrac = cyl.pistonFraction;
    const currentPressure = cyl.thermo.pressureBar;
    const curX = padLeft + currentFrac * plotW;
    const curY = padTop + plotH - (Math.min(maxBar, currentPressure) / maxBar) * plotH;

    // Glow pulse
    ctx.beginPath();
    ctx.arc(curX, curY, 7, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 59, 48, 0.35)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(curX, curY, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#ff3b30';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Real-time Pressure & Temp badge
    ctx.fillStyle = '#ff3b30';
    ctx.font = 'bold 9.5px "JetBrains Mono", monospace';
    ctx.fillText(`${currentPressure.toFixed(1)} BAR`, curX + 8, Math.max(padTop + 12, curY - 5));
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '8.5px "JetBrains Mono", monospace';
    ctx.fillText(`${cyl.thermo.temperatureK} K`, curX + 8, Math.max(padTop + 24, curY + 7));
  }
}
