// ============================================================================
// Rolls-Royce Bespoke 6¾ Litre Twin-Turbo V12 - Version 2.0
// 2D Engineering Telemetry & Analytical Diagrams Core
// Reference: Prof. V. Ganesan, "IC Engines" (4th Edition), IIT Madras / McGraw Hill
// ============================================================================

import {
  ENGINE_SPECS,
  calculateValveLifts,
  calculateChamberPressure,
  normalizeAngle,
  degToRad,
  DYNO_CURVE_DATA,
  ENGINE_GEOMETRY,
  GAS_CONSTANTS,
  calculateMeanPistonSpeed
} from '../engine/kinematics.js';

export class TelemetryManager {
  constructor(canvases, onCrankScrub) {
    this.canvases = canvases;
    this.sliderCrankCanvas = canvases.sliderCrank;
    this.crankEndViewCanvas = canvases.crankEndView;
    this.valveTimingCanvas = canvases.valveTiming;
    this.pvIndicatorCanvas = canvases.pvIndicator;
    this.dynoCurveCanvas = canvases.dynoCurve;
    this.sankeyCanvas = canvases.sankeyDiagram;
    this.perfMapCanvas = canvases.perfMap;
    this.emissionsCanvas = canvases.emissionsMap;

    this.onCrankScrub = onCrankScrub;
    this.theme = 'light'; // Default to Day Mode

    this.ctxSlider = this.sliderCrankCanvas ? this.sliderCrankCanvas.getContext('2d') : null;
    this.ctxCrank = this.crankEndViewCanvas ? this.crankEndViewCanvas.getContext('2d') : null;
    this.ctxValve = this.valveTimingCanvas ? this.valveTimingCanvas.getContext('2d') : null;
    this.ctxPv = this.pvIndicatorCanvas ? this.pvIndicatorCanvas.getContext('2d') : null;
    this.ctxDyno = this.dynoCurveCanvas ? this.dynoCurveCanvas.getContext('2d') : null;
    this.ctxSankey = this.sankeyCanvas ? this.sankeyCanvas.getContext('2d') : null;
    this.ctxPerfMap = this.perfMapCanvas ? this.perfMapCanvas.getContext('2d') : null;
    this.ctxEmissions = this.emissionsCanvas ? this.emissionsCanvas.getContext('2d') : null;

    this._setupCanvasResolution();
    this._setupInteractions();
    this._precomputeCurves();
  }

  setTheme(theme = 'light') {
    this.theme = theme;
  }

  _getColors() {
    const isLight = this.theme === 'light';
    return {
      textPrimary: isLight ? '#1d1d1f' : '#f5f5f7',
      textSecondary: isLight ? '#424245' : '#94a3b8',
      textTertiary: isLight ? '#6e6e73' : '#64748b',
      gridLine: isLight ? '#d2d2d7' : '#334155',
      cardBg: isLight ? 'rgba(255, 255, 255, 0.7)' : 'rgba(20, 20, 25, 0.7)',
      crankCircle: isLight ? '#c7c7cc' : '#263238',
      crankCenter: isLight ? '#0071e3' : '#00e5ff',
      pistonFill: isLight ? '#e5e5ea' : '#37474f',
      pistonStroke: isLight ? '#86868b' : '#78909c',
      rodStroke: isLight ? '#0071e3' : '#90caf9',
      pvActual: isLight ? '#0071e3' : '#00e5ff',
      pvAirStd: isLight ? '#86868b' : '#64748b',
      pvPumping: isLight ? 'rgba(52, 199, 89, 0.15)' : 'rgba(52, 199, 89, 0.25)',
      red: '#ff3b30',
      orange: '#ff9500',
      blue: '#0071e3',
      green: '#34c759',
      purple: '#af52de',
      sankeyFuel: isLight ? '#86868b' : '#a1a1a6',
      sankeyWork: isLight ? '#34c759' : '#30d158',
      sankeyCoolant: isLight ? '#0071e3' : '#0a84ff',
      sankeyExhaust: isLight ? '#ff9500' : '#ff9f0a',
      sankeyRad: isLight ? '#af52de' : '#bf5af2'
    };
  }

  _setupCanvasResolution() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const all = [
      this.sliderCrankCanvas,
      this.crankEndViewCanvas,
      this.valveTimingCanvas,
      this.pvIndicatorCanvas,
      this.dynoCurveCanvas,
      this.sankeyCanvas,
      this.perfMapCanvas,
      this.emissionsCanvas
    ];

    all.forEach(canvas => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const w = rect.width > 0 ? rect.width : (canvas.clientWidth || 280);
      const h = rect.height > 0 ? rect.height : (canvas.clientHeight || 120);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      const ctx = canvas.getContext('2d');
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    });
  }

  resizeCanvases() {
    this._setupCanvasResolution();
  }

  _setupInteractions() {
    let isDragging = false;

    const handleScrub = (e) => {
      if (!this.valveTimingCanvas) return;
      const rect = this.valveTimingCanvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const scrubCycleDeg = Math.max(0, Math.min(720, x * 720));
      if (this.onCrankScrub) {
        this.onCrankScrub(scrubCycleDeg);
      }
    };

    if (this.valveTimingCanvas) {
      this.valveTimingCanvas.addEventListener('mousedown', (e) => {
        isDragging = true;
        handleScrub(e);
      });
    }

    window.addEventListener('mousemove', (e) => {
      if (isDragging) handleScrub(e);
    });

    window.addEventListener('mouseup', () => {
      isDragging = false;
    });
  }

  _precomputeCurves() {
    this.valveCurveDataOtto = [];
    this.pvCurveDataOtto = [];
    this.pvAirStdDataOtto = [];

    this.valveCurveDataEco = [];
    this.pvCurveDataEco = [];
    this.pvAirStdDataEco = [];

    const rM = ENGINE_GEOMETRY.strokeMm / 2000.0;
    const lM = ENGINE_GEOMETRY.connectingRodMm / 1000.0;
    const rc = ENGINE_GEOMETRY.compressionRatioStandard || 10.0;
    const rcEco = ENGINE_GEOMETRY.atkinsonEffectiveCompRatio || 10.2;
    const expRatioEco = ENGINE_GEOMETRY.atkinsonExpansionRatio || 13.5;

    // Precompute Valve and Actual PV Indicator curves over 720° (both Otto and Atkinson Eco)
    for (let deg = 0; deg <= 720; deg += 2) {
      const rad = degToRad(deg);
      const underRad = lM * lM - rM * rM * Math.sin(rad) * Math.sin(rad);
      const x = rM * Math.cos(rad) + Math.sqrt(Math.max(0.0001, underRad));
      const s = (rM + lM) - x;
      const frac = s / (2 * rM);

      // Standard Otto
      const valvesOtto = calculateValveLifts(deg, false);
      const thermoOtto = calculateChamberPressure(deg, frac, false, false);
      this.valveCurveDataOtto.push({ deg, intake: valvesOtto.intakeNorm, exhaust: valvesOtto.exhaustNorm, pistonFrac: frac });
      this.pvCurveDataOtto.push({ deg, frac, pressure: thermoOtto.pressureBar, vol: thermoOtto.volumeCm3 });

      // Ganesan Atkinson Eco
      const valvesEco = calculateValveLifts(deg, true);
      const thermoEco = calculateChamberPressure(deg, frac, false, true);
      this.valveCurveDataEco.push({ deg, intake: valvesEco.intakeNorm, exhaust: valvesEco.exhaustNorm, pistonFrac: frac });
      this.pvCurveDataEco.push({ deg, frac, pressure: thermoEco.pressureBar, vol: thermoEco.volumeCm3 });
    }

    this.valveCurveData = this.valveCurveDataOtto;
    this.pvCurveData = this.pvCurveDataOtto;

    // Precompute Air-Standard Otto Cycle (Ganesan Section 2.5, pp. 52-55)
    const p1 = 1.0;
    const p3 = 86.0;

    for (let i = 0; i <= 50; i++) {
      const frac = i / 50; // 0 = TDC, 1 = BDC
      const relV = 1.0 + (rc - 1.0) * frac;
      const pComp = p1 * Math.pow(rc / relV, 1.4);
      const pExp = p3 * Math.pow(1.0 / relV, 1.4);
      this.pvAirStdDataOtto.push({ frac, pComp, pExp });
    }
    this.pvAirStdData = this.pvAirStdDataOtto;

    // Precompute Air-Standard Atkinson Cycle (Ganesan Section 2.10, pp. 65-66, Eq. 2.73)
    const p3Eco = 74.0;
    for (let i = 0; i <= 50; i++) {
      const frac = i / 50;
      const relV = 1.0 + (rcEco - 1.0) * frac;
      const pComp = p1 * Math.pow(rcEco / relV, 1.4);
      const pExp = p3Eco * Math.pow(1.0 / (1.0 + (expRatioEco - 1.0) * (frac * (rcEco / expRatioEco))), 1.36);
      this.pvAirStdDataEco.push({ frac, pComp, pExp });
    }
  }

  render(engineState, selectedCylId = 1) {
    const selectedCyl = engineState.cylinders.find(c => c.id === selectedCylId) || engineState.cylinders[0];

    this._renderSliderCrank(selectedCyl);
    this._renderCrankEndView(engineState, selectedCyl);
    this._renderValveTiming(selectedCyl, engineState);
    this._renderPvIndicator(selectedCyl, engineState);
    if (this.dynoCurveCanvas) {
      this._renderDynoCurve(engineState);
    }
    if (this.sankeyCanvas) {
      this._renderSankeyDiagram(engineState);
    }
    if (this.perfMapCanvas) {
      this._renderPerformanceMap(engineState);
    }
    if (this.emissionsCanvas) {
      this._renderEmissionsMap(engineState);
    }
  }

  /**
   * 1. Slider-Crank Kinematics Schematic
   * Reference: Ganesan Section 1.2.2 & Chapter 16.2
   */
  _renderSliderCrank(cyl) {
    if (!this.sliderCrankCanvas || !this.ctxSlider) return;
    const ctx = this.ctxSlider;
    const w = this.sliderCrankCanvas.clientWidth;
    const h = this.sliderCrankCanvas.clientHeight;
    ctx.clearRect(0, 0, w, h);

    const colors = this._getColors();
    const crankX = 42;
    const crankY = h / 2 + 10;
    const rScale = 28;
    const lScale = (ENGINE_GEOMETRY.connectingRodMm / (ENGINE_GEOMETRY.strokeMm / 2)) * rScale;

    const crankAngleRad = degToRad(cyl.crankAngleFromTdc);

    // Crank orbit circle
    ctx.beginPath();
    ctx.arc(crankX, crankY, rScale, 0, Math.PI * 2);
    ctx.strokeStyle = colors.crankCircle;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Center pin
    ctx.beginPath();
    ctx.arc(crankX, crankY, 3, 0, Math.PI * 2);
    ctx.fillStyle = colors.crankCenter;
    ctx.fill();

    // Crankpin Position
    const pinX = crankX + rScale * Math.cos(crankAngleRad);
    const pinY = crankY - rScale * Math.sin(crankAngleRad);

    // Crank Arm
    ctx.beginPath();
    ctx.moveTo(crankX, crankY);
    ctx.lineTo(pinX, pinY);
    ctx.strokeStyle = colors.red;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(pinX, pinY, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = colors.red;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Piston wristpin position
    const sinT = Math.sin(crankAngleRad);
    const underRad = lScale * lScale - rScale * rScale * sinT * sinT;
    const wristX = pinX + Math.sqrt(Math.max(0, underRad));
    const wristY = crankY;

    // Connecting Rod
    ctx.beginPath();
    ctx.moveTo(pinX, pinY);
    ctx.lineTo(wristX, wristY);
    ctx.strokeStyle = colors.rodStroke;
    ctx.lineWidth = 2.2;
    ctx.stroke();

    // Piston Slider Box
    const pWidth = 32;
    const pHeight = 24;
    ctx.fillStyle = colors.pistonFill;
    ctx.strokeStyle = colors.pistonStroke;
    ctx.lineWidth = 1.5;
    ctx.fillRect(wristX - 6, wristY - pHeight / 2, pWidth, pHeight);
    ctx.strokeRect(wristX - 6, wristY - pHeight / 2, pWidth, pHeight);

    // Wrist pin
    ctx.beginPath();
    ctx.arc(wristX, wristY, 3, 0, Math.PI * 2);
    ctx.fillStyle = colors.orange;
    ctx.fill();

    // Bore Guidelines
    ctx.strokeStyle = colors.gridLine;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(crankX + rScale + lScale - 2 * rScale, crankY - pHeight / 2 - 4);
    ctx.lineTo(crankX + rScale + lScale + 25, crankY - pHeight / 2 - 4);
    ctx.moveTo(crankX + rScale + lScale - 2 * rScale, crankY + pHeight / 2 + 4);
    ctx.lineTo(crankX + rScale + lScale + 25, crankY + pHeight / 2 + 4);
    ctx.stroke();
    ctx.setLineDash([]);

    // Data readouts
    ctx.fillStyle = colors.textPrimary;
    ctx.font = '9.5px "JetBrains Mono", monospace';
    ctx.fillText(`s ${(cyl.kinematics.s * 1000).toFixed(1)} mm`, 10, 16);
    ctx.fillText(`v ${(cyl.kinematics.v).toFixed(2)} m/s`, 95, 16);
    ctx.fillText(`a ${(cyl.kinematics.a).toFixed(0)} m/s²`, 175, 16);

    ctx.fillStyle = colors.textSecondary;
    ctx.font = '8.5px "JetBrains Mono", monospace';
    ctx.fillText(`${Math.round(cyl.crankAngleFromTdc)}° ATDC`, w - 75, 30);
  }

  /**
   * 2. 60° Crankshaft End-View (Polar Balancing)
   * Reference: Ganesan Section 1.5.6 & Chapter 10.13
   */
  _renderCrankEndView(engineState, activeCyl) {
    if (!this.crankEndViewCanvas || !this.ctxCrank) return;
    const ctx = this.ctxCrank;
    const w = this.crankEndViewCanvas.clientWidth;
    const h = this.crankEndViewCanvas.clientHeight;
    ctx.clearRect(0, 0, w, h);

    const colors = this._getColors();
    const cx = w / 2;
    const cy = h / 2 + 10;
    const radius = 38;

    const bankRRad = -degToRad(60);
    const bankLRad = -degToRad(120);

    // Bank Axis Lines
    ctx.strokeStyle = colors.gridLine;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(bankRRad) * (radius + 24), cy + Math.sin(bankRRad) * (radius + 24));
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(bankLRad) * (radius + 24), cy + Math.sin(bankLRad) * (radius + 24));
    ctx.stroke();
    ctx.setLineDash([]);

    // Bank Labels
    ctx.font = '9px "SF Pro Text", -apple-system, sans-serif';
    ctx.fillStyle = colors.textSecondary;
    ctx.fillText('Bank 1 (R) +30°', cx + 16, 20);
    ctx.fillText('Bank 2 (L) -30°', cx - 85, 20);

    // Crank orbit circle
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = colors.crankCircle;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Center journal
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fillStyle = colors.crankCenter;
    ctx.fill();

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

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(px, py);
      ctx.strokeStyle = isActive ? colors.red : colors.gridLine;
      ctx.lineWidth = isActive ? 2.5 : 1.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(px, py, isActive ? 5.5 : 4, 0, Math.PI * 2);
      ctx.fillStyle = isActive ? colors.red : (this.theme === 'light' ? '#86868b' : '#94a3b8');
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = isActive ? colors.red : colors.textSecondary;
      ctx.font = '8.5px "JetBrains Mono", monospace';
      ctx.fillText(tp.label, px + (px > cx ? 6 : -18), py + (py > cy ? 10 : -6));
    });
  }

  /**
   * 3. Valve Timing & Inlet-Valve Mach Index (Z)
   * Reference: Ganesan Section 1.8.10 (p. 26), Fig. 1.16 & Fig. 4.10 (p. 140)
   */
  _renderValveTiming(cyl, engineState) {
    if (!this.valveTimingCanvas || !this.ctxValve) return;
    const ctx = this.ctxValve;
    const w = this.valveTimingCanvas.clientWidth;
    const h = this.valveTimingCanvas.clientHeight;
    ctx.clearRect(0, 0, w, h);

    const colors = this._getColors();
    const padLeft = 25;
    const padRight = 55; // Right margin for Mach Index meter
    const padTop = 15;
    const padBottom = 22;
    const plotW = w - padLeft - padRight;
    const plotH = h - padTop - padBottom;

    // Stroke Background Bands
    const strokes = [
      { name: "Power",   color: "rgba(255, 59, 48, 0.08)", x0: 0,   x1: 180 },
      { name: "Exhaust", color: "rgba(255, 149, 0, 0.08)", x0: 180, x1: 360 },
      { name: "Intake",  color: "rgba(0, 113, 227, 0.08)", x0: 360, x1: 540 },
      { name: "Compr",   color: "rgba(175, 82, 222, 0.08)", x0: 540, x1: 720 }
    ];

    strokes.forEach(s => {
      const sx0 = padLeft + (s.x0 / 720) * plotW;
      const sw = ((s.x1 - s.x0) / 720) * plotW;
      ctx.fillStyle = s.color;
      ctx.fillRect(sx0, padTop, sw, plotH);

      ctx.fillStyle = colors.textTertiary;
      ctx.font = '8px "SF Pro Text", -apple-system, sans-serif';
      ctx.fillText(s.name, sx0 + sw / 2 - 14, padTop + 10);
    });

    // Valve Overlap Shaded Region
    // Standard Otto: 340° to 380° (40° overlap, Ganesan p. 140)
    // Atkinson Eco: 350° to 370° (20° overlap per Ganesan Section 20.7.5, p. 672)
    const isEco = engineState && engineState.isEcoMode;
    const activeValveData = isEco ? this.valveCurveDataEco : this.valveCurveDataOtto;

    const ovStart = isEco ? 350 : 340;
    const ovEnd = isEco ? 370 : 380;
    const ovDuration = ovEnd - ovStart;
    const ovX0 = padLeft + (ovStart / 720) * plotW;
    const ovW = (ovDuration / 720) * plotW;
    ctx.fillStyle = isEco ? 'rgba(52, 199, 89, 0.28)' : 'rgba(52, 199, 89, 0.22)';
    ctx.fillRect(ovX0, padTop, ovW, plotH);
    ctx.fillStyle = colors.green;
    ctx.font = 'bold 7.5px "JetBrains Mono", monospace';
    ctx.fillText(isEco ? "ATKINSON 20°" : "OVERLAP 40°", ovX0 - (isEco ? 10 : 6), padTop + plotH - 6);

    // If Eco Mode, annotate LIVC marker (Late Intake Valve Closing at 600° vs 580°)
    if (isEco) {
      const livcX = padLeft + (600 / 720) * plotW;
      ctx.strokeStyle = colors.blue;
      ctx.lineWidth = 1.2;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(livcX, padTop + 22);
      ctx.lineTo(livcX, padTop + plotH);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = colors.blue;
      ctx.font = 'bold 7.5px "JetBrains Mono", monospace';
      ctx.fillText("LIVC 600°", livcX - 18, padTop + 18);
    }

    // Baseline
    ctx.strokeStyle = colors.gridLine;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padLeft, padTop + plotH);
    ctx.lineTo(padLeft + plotW, padTop + plotH);
    ctx.stroke();

    // Piston Displacement curve
    ctx.strokeStyle = colors.textTertiary;
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    activeValveData.forEach((pt, i) => {
      const x = padLeft + (pt.deg / 720) * plotW;
      const y = padTop + plotH - pt.pistonFrac * (plotH * 0.7);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.setLineDash([]);

    // Exhaust Lift Curve
    ctx.strokeStyle = colors.orange;
    ctx.lineWidth = 2;
    ctx.beginPath();
    let exStarted = false;
    activeValveData.forEach(pt => {
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

    // Intake Lift Curve
    ctx.strokeStyle = colors.blue;
    ctx.lineWidth = 2;
    ctx.beginPath();
    let inStarted = false;
    activeValveData.forEach(pt => {
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

    // Crank Scrubber Cursor
    const cursorX = padLeft + (cyl.cycleDeg / 720) * plotW;
    ctx.strokeStyle = colors.red;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cursorX, padTop);
    ctx.lineTo(cursorX, padTop + plotH);
    ctx.stroke();

    ctx.fillStyle = colors.red;
    ctx.beginPath();
    ctx.arc(cursorX, padTop, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Mach Index (Z) Meter on the right (Ganesan Eq. 1.18, p. 26)
    const machData = engineState.ganesan ? engineState.ganesan.airFuel.machData : { machIndexZ: 0.38, isChoked: false };
    const meterX = w - padRight + 12;
    const meterY = padTop + 8;
    const meterH = plotH - 12;
    const meterW = 10;

    // Track
    ctx.fillStyle = colors.cardBg;
    ctx.fillRect(meterX, meterY, meterW, meterH);
    ctx.strokeStyle = colors.gridLine;
    ctx.strokeRect(meterX, meterY, meterW, meterH);

    // Fill level (0.0 to 0.80 range, choke line at 0.55)
    const zNorm = Math.min(1.0, machData.machIndexZ / 0.80);
    const fillH = zNorm * meterH;
    ctx.fillStyle = machData.machIndexZ > 0.55 ? colors.red : (machData.machIndexZ > 0.45 ? colors.orange : colors.green);
    ctx.fillRect(meterX, meterY + meterH - fillH, meterW, fillH);

    // Choke threshold line at Z = 0.55
    const chokeY = meterY + meterH - (0.55 / 0.80) * meterH;
    ctx.strokeStyle = colors.red;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(meterX - 2, chokeY);
    ctx.lineTo(meterX + meterW + 2, chokeY);
    ctx.stroke();

    ctx.fillStyle = colors.textPrimary;
    ctx.font = '8px "JetBrains Mono", monospace';
    ctx.fillText(`Z: ${machData.machIndexZ.toFixed(2)}`, meterX - 8, meterY - 2);
    ctx.fillStyle = colors.textTertiary;
    ctx.font = '7px "SF Pro Text", -apple-system, sans-serif';
    ctx.fillText(`lim 0.55`, meterX - 4, chokeY - 2);

    // Live Readout Bar
    ctx.fillStyle = colors.textSecondary;
    ctx.font = '8.5px "JetBrains Mono", monospace';
    ctx.fillText(`Piston ${(cyl.pistonFraction * 100).toFixed(0)}%`, padLeft, h - 6);
    ctx.fillStyle = colors.blue;
    ctx.fillText(`IN ${(cyl.valves.intakeNorm).toFixed(2)}`, padLeft + 70, h - 6);
    ctx.fillStyle = colors.orange;
    ctx.fillText(`EX ${(cyl.valves.exhaustNorm).toFixed(2)}`, padLeft + 120, h - 6);
    ctx.fillStyle = colors.textPrimary;
    ctx.fillText(`${Math.round(cyl.cycleDeg)}° Crank`, padLeft + 175, h - 6);
  }

  /**
   * 4. Thermodynamic P-V Indicator & P-θ Diagram
   * Reference: Ganesan Chapter 2, 3, 4, 16.2.1, 18.7 (pp. 52, 133, 501, 604)
   * Shows Actual Cycle with Time Loss, Heat Loss, Blowdown, and Positive Turbo Pumping Loop!
   */
  _renderPvIndicator(cyl, engineState) {
    if (!this.pvIndicatorCanvas || !this.ctxPv) return;
    const ctx = this.ctxPv;
    const w = this.pvIndicatorCanvas.clientWidth;
    const h = this.pvIndicatorCanvas.clientHeight;
    ctx.clearRect(0, 0, w, h);

    const colors = this._getColors();
    const padLeft = 32;
    const padRight = 15;
    const padTop = 15;
    const padBottom = 22;
    const plotW = w - padLeft - padRight;
    const plotH = h - padTop - padBottom;
    const maxBar = 95;

    // Axes
    ctx.strokeStyle = colors.gridLine;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padLeft, padTop);
    ctx.lineTo(padLeft, padTop + plotH);
    ctx.lineTo(padLeft + plotW, padTop + plotH);
    ctx.stroke();

    ctx.fillStyle = colors.textTertiary;
    ctx.font = '8px "SF Pro Text", -apple-system, sans-serif';
    ctx.fillText('95', 8, padTop + 8);
    ctx.fillText('0', 14, padTop + plotH);
    ctx.fillText('bar', 8, padTop + plotH / 2);
    ctx.fillText('TDC (Vc)', padLeft, padTop + plotH + 14);
    ctx.fillText('BDC (Vmax)', padLeft + plotW - 48, padTop + plotH + 14);

    // 1. Air-Standard Cycle (Dashed reference: Otto 60.2% vs Atkinson 63.0%, Ganesan p. 53, 66)
    const isEco = engineState && engineState.isEcoMode;
    const airStdData = isEco ? this.pvAirStdDataEco : this.pvAirStdDataOtto;
    const pvCurve = isEco ? this.pvCurveDataEco : this.pvCurveDataOtto;
    const peakP = isEco ? 74.0 : 86.0;

    ctx.strokeStyle = colors.pvAirStd;
    ctx.lineWidth = 1.0;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    airStdData.forEach((pt, i) => {
      const vx = padLeft + pt.frac * plotW;
      const py = padTop + plotH - (Math.min(maxBar, pt.pComp) / maxBar) * plotH;
      if (i === 0) ctx.moveTo(vx, py);
      else ctx.lineTo(vx, py);
    });
    // Top constant volume heat addition (TDC)
    ctx.lineTo(padLeft, padTop + plotH - (Math.min(maxBar, peakP) / maxBar) * plotH);
    // Expansion stroke
    for (let i = airStdData.length - 1; i >= 0; i--) {
      const pt = airStdData[i];
      const vx = padLeft + pt.frac * plotW;
      const py = padTop + plotH - (Math.min(maxBar, pt.pExp) / maxBar) * plotH;
      ctx.lineTo(vx, py);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);

    // 2. Positive Turbocharged Pumping Loop Shading (Ganesan Fig. 18.4, p. 605)
    const turbo = engineState.ganesan ? engineState.ganesan.turbo : { pBoostAbsBar: 1.62, boostGaugeBar: 0.62 };
    const pBoost = turbo.pBoostAbsBar;
    const pExh = 1.05 + turbo.boostGaugeBar * 0.45;
    const yBoost = padTop + plotH - (pBoost / maxBar) * plotH;
    const yExh = padTop + plotH - (pExh / maxBar) * plotH;

    if (pBoost > pExh) {
      ctx.fillStyle = colors.pvPumping;
      ctx.fillRect(padLeft, Math.min(yBoost, yExh), plotW, Math.abs(yExh - yBoost));
      ctx.fillStyle = colors.green;
      ctx.font = '7.5px "JetBrains Mono", monospace';
      ctx.fillText("+ΔW PUMPING", padLeft + plotW / 2 - 25, Math.max(yBoost, yExh) - 3);
    }

    // 3. Actual Cycle Loop with Time/Heat Losses (Solid curve, Ganesan Fig. 4.1 & 4.8)
    ctx.strokeStyle = colors.pvActual;
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    pvCurve.forEach((pt, i) => {
      const vx = padLeft + pt.frac * plotW;
      const py = padTop + plotH - (Math.min(maxBar, pt.pressure) / maxBar) * plotH;
      if (i === 0) ctx.moveTo(vx, py);
      else ctx.lineTo(vx, py);
    });
    ctx.stroke();

    // 4. Current State Point Tracer
    const currentFrac = cyl.pistonFraction;
    const currentPressure = cyl.thermo.pressureBar;
    const curX = padLeft + currentFrac * plotW;
    const curY = padTop + plotH - (Math.min(maxBar, currentPressure) / maxBar) * plotH;

    ctx.beginPath();
    ctx.arc(curX, curY, 6, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 59, 48, 0.3)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(curX, curY, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = colors.red;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = colors.red;
    ctx.font = 'bold 9.5px "JetBrains Mono", monospace';
    ctx.fillText(`${currentPressure.toFixed(1)} bar`, curX + 8, Math.max(padTop + 12, curY - 5));
    ctx.fillStyle = colors.textPrimary;
    ctx.font = '8.5px "JetBrains Mono", monospace';
    ctx.fillText(`${cyl.thermo.temperatureK} K`, curX + 8, Math.max(padTop + 24, curY + 7));

    // Annotated Legends (Ganesan Actual vs Air-Standard)
    ctx.fillStyle = colors.pvAirStd;
    ctx.font = '7.5px "SF Pro Text", -apple-system, sans-serif';
    ctx.fillText(isEco ? "-- Air-Std Atkinson (η=63.0%)" : "-- Air-Std Otto (η=60.2%)", padLeft + 6, padTop + 12);
    ctx.fillStyle = colors.pvActual;
    ctx.fillText(isEco ? "— Atkinson Lean Burn Loop" : "— Actual Turbo Cycle", padLeft + 6, padTop + 23);
  }

  /**
   * 5. Ganesan First Law Heat Balance & Sankey Energy Flow Diagram
   * Reference: Ganesan Section 16.7 (pp. 513-517, Figs. 16.12 & 16.13)
   * 100% Fuel Energy -> Brake Work (bp) + Cooling Loss (Q_cool) + Exhaust Enthalpy (Q_ex) + Rad/Friction (Q_rad)
   */
  _renderSankeyDiagram(engineState) {
    if (!this.sankeyCanvas || !this.ctxSankey) return;
    const ctx = this.ctxSankey;
    const w = this.sankeyCanvas.clientWidth;
    const h = this.sankeyCanvas.clientHeight;
    ctx.clearRect(0, 0, w, h);

    const colors = this._getColors();
    const hb = engineState.ganesan ? engineState.ganesan.heatBalance : {
      qFuelKw: 520,
      brakePowerKw: 170,
      qCoolantKw: 145,
      qExhaustKw: 172,
      qRadKw: 33,
      pctBrakePower: 32.7,
      pctCoolant: 27.9,
      pctExhaust: 33.1,
      pctRadiation: 6.3
    };

    const padLeft = 14;
    const padRight = 14;
    const padTop = 18;
    const padBottom = 22;

    const totalWidth = w - padLeft - padRight;
    const trunkH = h - padTop - padBottom;
    const startX = padLeft + totalWidth / 2;
    const startY = h - padBottom;

    // Stream proportions
    const pWork = hb.pctBrakePower / 100.0;
    const pCool = hb.pctCoolant / 100.0;
    const pExh = hb.pctExhaust / 100.0;
    const pRad = hb.pctRadiation / 100.0;

    // Draw Main Input Fuel Energy Trunk at bottom
    const trunkWidth = 55;
    ctx.fillStyle = colors.sankeyFuel;
    ctx.fillRect(startX - trunkWidth / 2, startY - 20, trunkWidth, 20);

    // Left Branch: Cooling Water Loss
    const coolW = trunkWidth * pCool;
    ctx.fillStyle = colors.sankeyCoolant;
    ctx.beginPath();
    ctx.moveTo(startX - trunkWidth / 2, startY - 20);
    ctx.bezierCurveTo(startX - trunkWidth / 2 - 30, startY - 50, padLeft + 20, startY - 60, padLeft + 10, startY - 75);
    ctx.lineTo(padLeft + 10, startY - 75 - coolW);
    ctx.bezierCurveTo(padLeft + 20, startY - 60 - coolW, startX - trunkWidth / 2, startY - 20 - coolW, startX - trunkWidth / 2 + coolW, startY - 20);
    ctx.closePath();
    ctx.fill();

    // Right Branch: Exhaust Gas Loss
    const exhW = trunkWidth * pExh;
    ctx.fillStyle = colors.sankeyExhaust;
    ctx.beginPath();
    ctx.moveTo(startX + trunkWidth / 2, startY - 20);
    ctx.bezierCurveTo(startX + trunkWidth / 2 + 30, startY - 50, w - padRight - 20, startY - 60, w - padRight - 10, startY - 75);
    ctx.lineTo(w - padRight - 10, startY - 75 - exhW);
    ctx.bezierCurveTo(w - padRight - 20, startY - 60 - exhW, startX + trunkWidth / 2, startY - 20 - exhW, startX + trunkWidth / 2 - exhW, startY - 20);
    ctx.closePath();
    ctx.fill();

    // Center-Top Trunk: Useful Brake Work
    const workW = trunkWidth * pWork;
    ctx.fillStyle = colors.sankeyWork;
    ctx.beginPath();
    ctx.moveTo(startX - workW / 2, startY - 20);
    ctx.lineTo(startX - workW / 2, padTop + 14);
    ctx.lineTo(startX + workW / 2, padTop + 14);
    ctx.lineTo(startX + workW / 2, startY - 20);
    ctx.closePath();
    ctx.fill();

    // Stream Labels
    ctx.font = 'bold 9px "JetBrains Mono", monospace';

    // Top: Brake Power (bp)
    ctx.fillStyle = colors.sankeyWork;
    ctx.textAlign = 'center';
    ctx.fillText(`BRAKE WORK: ${hb.pctBrakePower}% (${hb.brakePowerKw} kW)`, startX, padTop + 8);

    // Left: Coolant
    ctx.fillStyle = colors.sankeyCoolant;
    ctx.textAlign = 'left';
    ctx.fillText(`COOLANT`, padLeft + 6, startY - 82);
    ctx.font = '8px "JetBrains Mono", monospace';
    ctx.fillText(`${hb.pctCoolant}% · ${hb.qCoolantKw} kW`, padLeft + 6, startY - 72);

    // Right: Exhaust
    ctx.fillStyle = colors.sankeyExhaust;
    ctx.textAlign = 'right';
    ctx.font = 'bold 9px "JetBrains Mono", monospace';
    ctx.fillText(`EXHAUST`, w - padRight - 6, startY - 82);
    ctx.font = '8px "JetBrains Mono", monospace';
    ctx.fillText(`${hb.pctExhaust}% · ${hb.qExhaustKw} kW`, w - padRight - 6, startY - 72);

    // Bottom: Fuel Chemical Energy Input
    ctx.fillStyle = colors.textPrimary;
    ctx.textAlign = 'center';
    ctx.font = 'bold 9px "JetBrains Mono", monospace';
    ctx.fillText(`100% FUEL ENERGY: ${hb.qFuelKw} kW (LHV 44.0 MJ/kg)`, startX, h - 6);
  }

  /**
   * 6. Ganesan Engine Performance Map & Stribeck Lubrication Regime
   * Reference: Ganesan Fig. 16.14 (p. 517) & Fig. 12.6 (p. 374)
   * 2D BMEP vs Mean Piston Speed with constant BSFC contours
   */
  _renderPerformanceMap(engineState) {
    if (!this.perfMapCanvas || !this.ctxPerfMap) return;
    const ctx = this.ctxPerfMap;
    const w = this.perfMapCanvas.clientWidth;
    const h = this.perfMapCanvas.clientHeight;
    ctx.clearRect(0, 0, w, h);

    const colors = this._getColors();
    const padLeft = 32;
    const padRight = 16;
    const padTop = 18;
    const padBottom = 26;
    const plotW = w - padLeft - padRight;
    const plotH = h - padTop - padBottom;

    const maxBmep = 20.0; // bar
    const maxPistonSpeed = 22.0; // m/s

    // Axes
    ctx.strokeStyle = colors.gridLine;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padLeft, padTop);
    ctx.lineTo(padLeft, padTop + plotH);
    ctx.lineTo(padLeft + plotW, padTop + plotH);
    ctx.stroke();

    ctx.fillStyle = colors.textTertiary;
    ctx.font = '8px "SF Pro Text", -apple-system, sans-serif';
    ctx.fillText('20', 10, padTop + 8);
    ctx.fillText('10', 10, padTop + plotH / 2);
    ctx.fillText('0', 16, padTop + plotH);
    ctx.fillText('bmep (bar)', 8, padTop - 6);
    ctx.fillText('Mean Piston Speed sp (m/s)', padLeft + plotW / 2 - 40, padTop + plotH + 16);

    // Gridlines
    [5, 10, 15, 20].forEach(bVal => {
      const y = padTop + plotH - (bVal / maxBmep) * plotH;
      ctx.beginPath();
      ctx.setLineDash([2, 4]);
      ctx.moveTo(padLeft, y);
      ctx.lineTo(padLeft + plotW, y);
      ctx.stroke();
    });
    ctx.setLineDash([]);

    // Full Throttle Envelope Curve (Ganesan Fig. 16.14)
    ctx.strokeStyle = colors.textPrimary;
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    const fullThrottlePts = [
      { sp: 2.0, bmep: 11.0 },
      { sp: 6.0, bmep: 16.8 },
      { sp: 10.0, bmep: 16.8 },
      { sp: 14.0, bmep: 15.6 },
      { sp: 18.0, bmep: 13.8 },
      { sp: 20.0, bmep: 11.5 }
    ];
    fullThrottlePts.forEach((pt, i) => {
      const x = padLeft + (pt.sp / maxPistonSpeed) * plotW;
      const y = padTop + plotH - (pt.bmep / maxBmep) * plotH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Constant BSFC Contours (Island of minimum BSFC = 198 g/kWh in Eco vs 230 g/kWh in Standard, Ganesan p. 517)
    const isEco = engineState && engineState.isEcoMode;
    const contours = isEco ? [
      { label: "198 (Eco)", rx: 20, ry: 13, cx: 8.8, cy: 13.5, col: colors.green },
      { label: "210", rx: 34, ry: 22, cx: 9.0, cy: 13.5, col: colors.blue },
      { label: "230", rx: 55, ry: 33, cx: 9.3, cy: 13.0, col: colors.orange },
      { label: "280", rx: 82, ry: 46, cx: 9.8, cy: 12.0, col: colors.purple }
    ] : [
      { label: "230", rx: 25, ry: 16, cx: 9.0, cy: 14.0, col: colors.green },
      { label: "250", rx: 42, ry: 26, cx: 9.2, cy: 13.5, col: colors.blue },
      { label: "280", rx: 65, ry: 38, cx: 9.5, cy: 12.5, col: colors.orange },
      { label: "340", rx: 90, ry: 50, cx: 10.0, cy: 11.0, col: colors.purple }
    ];

    contours.forEach(c => {
      const cxPx = padLeft + (c.cx / maxPistonSpeed) * plotW;
      const cyPx = padTop + plotH - (c.cy / maxBmep) * plotH;
      ctx.strokeStyle = c.col;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(cxPx, cyPx, c.rx, c.ry, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = c.col;
      ctx.font = '7.5px "JetBrains Mono", monospace';
      ctx.fillText(c.label, cxPx + c.rx - 10, cyPx);
    });

    // Current Operating Crosshair
    const currentSp = calculateMeanPistonSpeed(engineState.rpm);
    const currentBmep = engineState.ganesan ? engineState.ganesan.power.bmepBar : 16.8;
    const curX = padLeft + (currentSp / maxPistonSpeed) * plotW;
    const curY = padTop + plotH - (currentBmep / maxBmep) * plotH;

    ctx.strokeStyle = colors.red;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(curX - 6, curY);
    ctx.lineTo(curX + 6, curY);
    ctx.moveTo(curX, curY - 6);
    ctx.lineTo(curX, curY + 6);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(curX, curY, 4, 0, Math.PI * 2);
    ctx.fillStyle = colors.red;
    ctx.fill();

    // Top Header: Active Point Stats
    ctx.fillStyle = colors.textPrimary;
    ctx.font = 'bold 9px "JetBrains Mono", monospace';
    const bsfcVal = engineState.ganesan ? engineState.ganesan.power.bsfcGKwh : 235;
    const modeTag = isEco ? "Atkinson Eco · " : "";
    ctx.fillText(`${modeTag}sp: ${currentSp.toFixed(1)} m/s · BMEP: ${currentBmep.toFixed(1)} bar · BSFC: ${bsfcVal} g/kWh`, padLeft + 6, padTop - 5);
  }

  /**
   * 7. Emissions & Three-Way Catalytic Converter
   * Reference: Ganesan Chapter 14 (pp. 417-456, Figs. 14.1, 14.8, 14.9)
   */
  _renderEmissionsMap(engineState) {
    if (!this.emissionsCanvas || !this.ctxEmissions) return;
    const ctx = this.ctxEmissions;
    const w = this.emissionsCanvas.clientWidth;
    const h = this.emissionsCanvas.clientHeight;
    ctx.clearRect(0, 0, w, h);

    const colors = this._getColors();
    const padLeft = 32;
    const padRight = 16;
    const padTop = 18;
    const padBottom = 24;
    const plotW = w - padLeft - padRight;
    const plotH = h - padTop - padBottom;

    const minPhi = 0.7;
    const maxPhi = 1.3;

    // Axes
    ctx.strokeStyle = colors.gridLine;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padLeft, padTop);
    ctx.lineTo(padLeft, padTop + plotH);
    ctx.lineTo(padLeft + plotW, padTop + plotH);
    ctx.stroke();

    // Stoichiometric Line phi = 1.0 (lambda = 1.0)
    const stoichX = padLeft + ((1.0 - minPhi) / (maxPhi - minPhi)) * plotW;
    ctx.strokeStyle = colors.gridLine;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(stoichX, padTop);
    ctx.lineTo(stoichX, padTop + plotH);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = colors.textTertiary;
    ctx.font = '7.5px "SF Pro Text", -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('LEAN', padLeft + plotW * 0.25, padTop + 10);
    ctx.fillText('RICH', padLeft + plotW * 0.75, padTop + 10);
    ctx.fillText('φ=1.00 (Stoich)', stoichX, padTop + plotH + 14);

    // 1. NOx Curve (Green/Blue, peaks at phi = 0.95)
    ctx.strokeStyle = colors.blue;
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    for (let p = minPhi; p <= maxPhi; p += 0.02) {
      const x = padLeft + ((p - minPhi) / (maxPhi - minPhi)) * plotW;
      const nox = Math.exp(-Math.pow((p - 0.95) / 0.12, 2));
      const y = padTop + plotH - nox * (plotH * 0.88);
      if (p === minPhi) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // 2. CO Curve (Red, spikes for phi > 1.0)
    ctx.strokeStyle = colors.red;
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    for (let p = minPhi; p <= maxPhi; p += 0.02) {
      const x = padLeft + ((p - minPhi) / (maxPhi - minPhi)) * plotW;
      let co = 0.05;
      if (p > 1.0) co = 0.05 + Math.pow((p - 1.0) / 0.3, 1.4) * 0.9;
      const y = padTop + plotH - co * plotH;
      if (p === minPhi) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // 3. HC Curve (Orange, rises in rich and in lean misfire)
    ctx.strokeStyle = colors.orange;
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    for (let p = minPhi; p <= maxPhi; p += 0.02) {
      const x = padLeft + ((p - minPhi) / (maxPhi - minPhi)) * plotW;
      let hc = 0.15;
      if (p > 1.0) hc = 0.15 + (p - 1.0) * 2.2;
      else if (p < 0.85) hc = 0.15 + Math.pow((0.85 - p) / 0.15, 2) * 0.8;
      const y = padTop + plotH - Math.min(1.0, hc) * plotH;
      if (p === minPhi) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Active phi point
    const curPhi = engineState.ganesan ? engineState.ganesan.phi : 1.0;
    const curX = padLeft + ((curPhi - minPhi) / (maxPhi - minPhi)) * plotW;
    ctx.strokeStyle = colors.textPrimary;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(curX, padTop);
    ctx.lineTo(curX, padTop + plotH);
    ctx.stroke();
    ctx.setLineDash([]);

    // Header Legend
    ctx.textAlign = 'left';
    ctx.font = 'bold 8.5px "JetBrains Mono", monospace';
    ctx.fillStyle = colors.blue;
    ctx.fillText('NOx', padLeft + 6, padTop - 5);
    ctx.fillStyle = colors.red;
    ctx.fillText('CO', padLeft + 40, padTop - 5);
    ctx.fillStyle = colors.orange;
    ctx.fillText('HC', padLeft + 68, padTop - 5);

    const emissions = engineState.ganesan ? engineState.ganesan.emissions : null;
    if (emissions) {
      ctx.fillStyle = colors.textPrimary;
      ctx.fillText(`φ: ${curPhi.toFixed(2)} · TWC η: ${emissions.catalyst.etaCoPct}%`, padLeft + 105, padTop - 5);
    }
  }

  /**
   * 8. Rolls-Royce 6¾L V12 Dyno Performance Map (Torque Plateau & Power Curve)
   */
  _renderDynoCurve(engineState) {
    if (!this.dynoCurveCanvas || !this.ctxDyno) return;
    const ctx = this.ctxDyno;
    const w = this.dynoCurveCanvas.clientWidth;
    const h = this.dynoCurveCanvas.clientHeight;
    ctx.clearRect(0, 0, w, h);

    const colors = this._getColors();
    const padLeft = 36;
    const padRight = 36;
    const padTop = 22;
    const padBottom = 22;
    const plotW = w - padLeft - padRight;
    const plotH = h - padTop - padBottom;

    const minRpm = 600;
    const maxRpm = 6000;
    const maxTorque = 1000;
    const maxPower = 650;

    // Draw gridlines
    ctx.strokeStyle = colors.gridLine;
    ctx.lineWidth = 0.75;

    [250, 500, 750, 900, 1000].forEach(tVal => {
      const y = padTop + plotH - (tVal / maxTorque) * plotH;
      ctx.beginPath();
      ctx.setLineDash([2, 4]);
      ctx.moveTo(padLeft, y);
      ctx.lineTo(padLeft + plotW, y);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = colors.textTertiary;
      ctx.font = '8px "JetBrains Mono", monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`${tVal}`, padLeft - 4, y + 3);
    });

    [1000, 2000, 3000, 4000, 5000, 6000].forEach(rpmVal => {
      const x = padLeft + ((rpmVal - minRpm) / (maxRpm - minRpm)) * plotW;
      ctx.beginPath();
      ctx.setLineDash([2, 4]);
      ctx.moveTo(x, padTop);
      ctx.lineTo(x, padTop + plotH);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = colors.textTertiary;
      ctx.font = '8px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${rpmVal / 1000}k`, x, padTop + plotH + 12);
    });

    [150, 300, 450, 563, 600].forEach(pVal => {
      const y = padTop + plotH - (pVal / maxPower) * plotH;
      ctx.fillStyle = colors.orange;
      ctx.font = '8px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`${pVal}`, padLeft + plotW + 4, y + 3);
    });

    // Plot Torque Curve (Blue, 900 Nm plateau)
    ctx.beginPath();
    ctx.strokeStyle = colors.blue;
    ctx.lineWidth = 2.2;
    DYNO_CURVE_DATA.forEach((pt, i) => {
      const x = padLeft + ((pt.rpm - minRpm) / (maxRpm - minRpm)) * plotW;
      const y = padTop + plotH - (pt.torqueNm / maxTorque) * plotH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Plot Horsepower Curve (Amber-Orange)
    ctx.beginPath();
    ctx.strokeStyle = colors.orange;
    ctx.lineWidth = 2.2;
    DYNO_CURVE_DATA.forEach((pt, i) => {
      const x = padLeft + ((pt.rpm - minRpm) / (maxRpm - minRpm)) * plotW;
      const y = padTop + plotH - (pt.bhp / maxPower) * plotH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Active Engine Operating Tracer
    const curRpm = engineState.rpm;
    const dyno = engineState.dyno || { torqueNm: 900, bhp: 563, bmepBar: 16.8 };
    const curX = padLeft + ((curRpm - minRpm) / (maxRpm - minRpm)) * plotW;
    const curYTorque = padTop + plotH - (dyno.torqueNm / maxTorque) * plotH;
    const curYPower = padTop + plotH - (dyno.bhp / maxPower) * plotH;

    ctx.strokeStyle = colors.textPrimary;
    ctx.lineWidth = 1.0;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(curX, padTop);
    ctx.lineTo(curX, padTop + plotH);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.arc(curX, curYTorque, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = colors.blue;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(curX, curYPower, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = colors.orange;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.font = 'bold 9px "JetBrains Mono", monospace';
    ctx.fillStyle = colors.blue;
    ctx.fillText(`TORQUE: ${dyno.torqueNm} Nm`, padLeft + 6, padTop + 4);

    ctx.fillStyle = colors.orange;
    ctx.fillText(`POWER: ${dyno.bhp} bhp`, padLeft + 125, padTop + 4);

    ctx.fillStyle = colors.textSecondary;
    ctx.font = '8px "JetBrains Mono", monospace';
    const boostAbs = engineState.ganesan ? engineState.ganesan.turbo.pBoostAbsBar : 1.62;
    ctx.fillText(`BMEP: ${dyno.bmepBar} bar · BOOST: ${boostAbs.toFixed(2)} bar`, padLeft + 225, padTop + 4);
  }
}
