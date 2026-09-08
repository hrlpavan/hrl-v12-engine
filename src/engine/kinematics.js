// ============================================================================
// Rolls-Royce Bespoke 6¾ Litre Twin-Turbo V12 Engine Project
// Goodwood Engineering Guidelines · 60° V12 DOHC 48-Valve Bi-Turbo
// Firing Order: 1 - 12 - 5 - 8 - 3 - 10 - 6 - 7 - 2 - 11 - 4 - 9
// ============================================================================

export const ENGINE_SPECS = {
  name: "Rolls-Royce Bespoke 6¾ Litre Twin-Turbo V12",
  heritage: "Handcrafted at Goodwood, West Sussex, England",
  type: "60° V12 Twin-Turbocharged Direct Injection 48-Valve",
  displacementL: 6.75, // 6,749 cc
  boreMm: 89.0,
  strokeMm: 90.4, // Undersquare long-stroke for tidal torque
  crankRadiusMm: 45.2, // 90.4 / 2
  rodLengthMm: 162.0,
  compressionRatio: 10.0, // Optimized for twin turbochargers
  valvesPerCyl: 4, // 2 Intake, 2 Exhaust (48 total)
  intakeMaxLiftMm: 10.5,
  exhaustMaxLiftMm: 10.0,
  governedMaxRpm: 6000,
  peakPowerRpm: 5000,
  idleRpm: 600, // Rolls-Royce whisper-quiet idle
  peakPowerBhp: 563, // 563 bhp @ 5,000 RPM (Black Badge: 600 bhp)
  peakTorqueNm: 900, // 900 Nm from 1,600 RPM
  bankAngleDeg: 30.0, // ±30° from vertical, 60° included angle
  firingIntervalDeg: 60.0, // 720° / 12 = 60°
};

// 12 Cylinders Specification
// Bank 1 (Right): 1, 2, 3, 4, 5, 6 (Bank Angle = +30°)
// Bank 2 (Left) : 7, 8, 9, 10, 11, 12 (Bank Angle = -30°)
// Crankpins: 6 throws spaced front-to-back:
// Throws: Pin 1 (0°), Pin 2 (240°), Pin 3 (120°), Pin 4 (120°), Pin 5 (240°), Pin 6 (0°)
export const CYLINDERS = [
  // Right Bank (Bank 1)
  { id: 1,  bank: 'R', pin: 1, zIndex: 0, bankAngle:  30, throwAngle:   0, firingTdc:   0 },
  { id: 2,  bank: 'R', pin: 2, zIndex: 1, bankAngle:  30, throwAngle: 240, firingTdc: 480 },
  { id: 3,  bank: 'R', pin: 3, zIndex: 2, bankAngle:  30, throwAngle: 120, firingTdc: 240 },
  { id: 4,  bank: 'R', pin: 4, zIndex: 3, bankAngle:  30, throwAngle: 120, firingTdc: 600 },
  { id: 5,  bank: 'R', pin: 5, zIndex: 4, bankAngle:  30, throwAngle: 240, firingTdc: 120 },
  { id: 6,  bank: 'R', pin: 6, zIndex: 5, bankAngle:  30, throwAngle:   0, firingTdc: 360 },

  // Left Bank (Bank 2)
  { id: 7,  bank: 'L', pin: 1, zIndex: 0, bankAngle: -30, throwAngle:   0, firingTdc: 420 },
  { id: 8,  bank: 'L', pin: 2, zIndex: 1, bankAngle: -30, throwAngle: 240, firingTdc: 180 },
  { id: 9,  bank: 'L', pin: 3, zIndex: 2, bankAngle: -30, throwAngle: 120, firingTdc: 660 },
  { id: 10, bank: 'L', pin: 4, zIndex: 3, bankAngle: -30, throwAngle: 120, firingTdc: 300 },
  { id: 11, bank: 'L', pin: 5, zIndex: 4, bankAngle: -30, throwAngle: 240, firingTdc: 540 },
  { id: 12, bank: 'L', pin: 6, zIndex: 5, bankAngle: -30, throwAngle:   0, firingTdc:  60 }
];

// Firing order sequence (12-step)
export const FIRING_ORDER = [1, 12, 5, 8, 3, 10, 6, 7, 2, 11, 4, 9];

// Crank throw angles for the 6 pins along the crankshaft
export const CRANK_THROWS = [
  { pin: 1, angleDeg: 0,   cylinders: [1, 7] },
  { pin: 2, angleDeg: 240, cylinders: [2, 8] },
  { pin: 3, angleDeg: 120, cylinders: [3, 9] },
  { pin: 4, angleDeg: 120, cylinders: [4, 10] },
  { pin: 5, angleDeg: 240, cylinders: [5, 11] },
  { pin: 6, angleDeg: 0,   cylinders: [6, 12] }
];

export function normalizeAngle(angle, max = 360) {
  let a = angle % max;
  if (a < 0) a += max;
  return a;
}

export function degToRad(deg) {
  return (deg * Math.PI) / 180.0;
}

export function radToDeg(rad) {
  return (rad * 180.0) / Math.PI;
}

export function calculateSliderCrank(thetaRad, r = 0.0445, L = 0.160, omega = 100) {
  const cosT = Math.cos(thetaRad);
  const sinT = Math.sin(thetaRad);
  const sin2T = Math.sin(2 * thetaRad);
  const cos2T = Math.cos(2 * thetaRad);

  const underRad = L * L - r * r * sinT * sinT;
  const sqrtRad = Math.sqrt(Math.max(0.0001, underRad));

  const x = r * cosT + sqrtRad;
  const xTdc = r + L;
  const xBdc = L - r;
  const s = xTdc - x;

  const v = -omega * (-r * sinT - (r * r * sin2T) / (2 * sqrtRad));

  const a = -omega * omega * (
    r * cosT +
    (r * r * cos2T) / sqrtRad +
    Math.pow(r * r * sin2T, 2) / (4 * Math.pow(underRad, 1.5))
  );

  const sinBeta = (r / L) * sinT;
  const betaRad = Math.asin(Math.max(-1, Math.min(1, sinBeta)));

  return { x, s, v, a, betaRad, xTdc, xBdc, stroke: xTdc - xBdc };
}

export function getCyclePhase(cycleDeg) {
  const deg = normalizeAngle(cycleDeg, 720);

  if (deg < 180) {
    return {
      name: "Combustion",
      code: "POWER",
      color: "#ff3b30",
      progress: deg / 180,
      description: "Power Stroke (Expansion)"
    };
  } else if (deg < 360) {
    return {
      name: "Exhaust",
      code: "EXHAUST",
      color: "#ff9500",
      progress: (deg - 180) / 180,
      description: "Exhaust Stroke (Scavenging)"
    };
  } else if (deg < 540) {
    return {
      name: "Intake",
      code: "INTAKE",
      color: "#007aff",
      progress: (deg - 360) / 180,
      description: "Intake Stroke (Air-Fuel Charge)"
    };
  } else {
    return {
      name: "Compression",
      code: "COMPRESSION",
      color: "#5856d6",
      progress: (deg - 540) / 180,
      description: "Compression Stroke"
    };
  }
}

export function calculateValveLifts(cycleDeg) {
  const deg = normalizeAngle(cycleDeg, 720);

  const intakeOpen = 340;
  const intakeClose = 580;
  const intakeDuration = intakeClose - intakeOpen;
  let intakeLiftNorm = 0;

  if (deg >= intakeOpen && deg <= intakeClose) {
    const angleFromOpen = deg - intakeOpen;
    intakeLiftNorm = Math.pow(Math.sin((angleFromOpen / intakeDuration) * Math.PI), 1.6);
  }

  let exhaustLiftNorm = 0;
  let exDeg = deg;
  if (exDeg < 40) exDeg += 720;

  const exhaustOpen = 140;
  const exhaustClose = 380;
  const exhaustDuration = exhaustClose - exhaustOpen;

  if (deg >= exhaustOpen && deg <= exhaustClose) {
    const angleFromOpen = deg - exhaustOpen;
    exhaustLiftNorm = Math.pow(Math.sin((angleFromOpen / exhaustDuration) * Math.PI), 1.6);
  }

  return {
    intakeNorm: intakeLiftNorm,
    exhaustNorm: exhaustLiftNorm,
    intakeMm: intakeLiftNorm * ENGINE_SPECS.intakeMaxLiftMm,
    exhaustMm: exhaustLiftNorm * ENGINE_SPECS.exhaustMaxLiftMm,
    inOverlap: deg >= 340 && deg <= 380
  };
}

export function calculateChamberPressure(cycleDeg, pistonFraction) {
  const deg = normalizeAngle(cycleDeg, 720);
  const rc = ENGINE_SPECS.compressionRatio;
  const gamma = 1.33;

  const relVol = 1.0 + (rc - 1.0) * Math.max(0, Math.min(1, pistonFraction));

  let pressureBar = 1.0;
  let temperatureK = 300;

  if (deg >= 540) {
    pressureBar = 1.0 * Math.pow(12.5 / relVol, gamma);
    temperatureK = 300 * Math.pow(12.5 / relVol, gamma - 1);

    if (deg >= 705) {
      const burnProgress = (deg - 705) / 30;
      pressureBar += 55 * Math.sin(burnProgress * Math.PI * 0.5);
      temperatureK += 1400 * burnProgress;
    }
  } else if (deg < 180) {
    if (deg < 15) {
      const pPeak = 86.0;
      const tPeak = 2450;
      pressureBar = 28 + (pPeak - 28) * Math.sin((deg / 15) * Math.PI * 0.5);
      temperatureK = 900 + (tPeak - 900) * (deg / 15);
    } else {
      const peakVol = 1.0 + (rc - 1.0) * 0.05;
      pressureBar = 86.0 * Math.pow(peakVol / relVol, 1.28);
      temperatureK = 2450 * Math.pow(peakVol / relVol, 0.28);
    }

    if (deg >= 140) {
      const blowdown = (deg - 140) / 40;
      pressureBar = pressureBar * (1 - blowdown * 0.7) + 1.2 * blowdown * 0.7;
    }
  } else if (deg < 360) {
    pressureBar = 1.08 + 0.12 * Math.sin(((deg - 180) / 180) * Math.PI);
    temperatureK = 850 - 400 * ((deg - 180) / 180);
  } else {
    pressureBar = 0.94 - 0.06 * Math.sin(((deg - 360) / 180) * Math.PI);
    temperatureK = 310 + 20 * (1 - (deg - 360) / 180);
  }

  return {
    pressureBar: Math.max(0.85, pressureBar),
    temperatureK: Math.max(295, Math.round(temperatureK)),
    volumeCm3: Math.round(((ENGINE_SPECS.displacementL * 1000 / 12) * (relVol / rc)) * 10) / 10
  };
}

export function computeEngineState(crankAngleDeg, rpm = 6500) {
  const normCrank = normalizeAngle(crankAngleDeg, 360);
  const cycleCrank = normalizeAngle(crankAngleDeg, 720);
  const omega = (rpm * 2 * Math.PI) / 60.0;

  const rM = ENGINE_SPECS.crankRadiusMm / 1000.0;
  const lM = ENGINE_SPECS.rodLengthMm / 1000.0;

  let activeFiringCylinder = null;
  let minFireDist = Infinity;

  const cylinderStates = CYLINDERS.map(cyl => {
    // Crank angle relative to cylinder's TDC
    const crankAngleFromTdc = normalizeAngle(normCrank - (cyl.throwAngle + cyl.bankAngle), 360);
    const crankAngleRad = degToRad(crankAngleFromTdc);

    // 4-Stroke 720° cycle angle
    const cycleDeg = normalizeAngle(cycleCrank - cyl.firingTdc, 720);

    const kinematics = calculateSliderCrank(crankAngleRad, rM, lM, omega);
    const valves = calculateValveLifts(cycleDeg);
    const phase = getCyclePhase(cycleDeg);

    const pistonFrac = kinematics.s / (2 * rM);
    const thermo = calculateChamberPressure(cycleDeg, pistonFrac);

    const isSparking = cycleDeg >= 705 && cycleDeg <= 725;
    const isCombusting = cycleDeg >= 0 && cycleDeg <= 110;

    if (cycleDeg < 60 && cycleDeg < minFireDist) {
      minFireDist = cycleDeg;
      activeFiringCylinder = cyl.id;
    }

    return {
      ...cyl,
      crankAngleFromTdc,
      cycleDeg,
      kinematics,
      valves,
      phase,
      thermo,
      isSparking,
      isCombusting,
      pistonFraction: pistonFrac
    };
  });

  const camAngleDeg = normalizeAngle(crankAngleDeg * 0.5, 360);

  // Rolls-Royce Power Reserve & Coin Balance
  const powerReserve = calculatePowerReserve(rpm);
  const coinStability = calculateCoinStability(rpm);
  const turboBoost = calculateTurboBoost(rpm);

  return {
    crankAngleDeg: normCrank,
    cycleCrankDeg: cycleCrank,
    camAngleDeg,
    rpm,
    omega,
    activeFiringCylinder: activeFiringCylinder || 1,
    cylinders: cylinderStates,
    powerReservePercent: powerReserve,
    coinStability,
    turboBoost
  };
}

/**
 * Rolls-Royce Power Reserve Calculation
 * 100% at 600 RPM idle, tapering gracefully to 0% at peak power (5000 RPM).
 */
export function calculatePowerReserve(rpm) {
  const idle = ENGINE_SPECS.idleRpm;
  const peak = ENGINE_SPECS.peakPowerRpm;
  if (rpm <= idle) return 100.0;
  const frac = Math.max(0, Math.min(1, (rpm - idle) / (peak - idle)));
  const reserve = 100.0 - Math.pow(frac, 1.25) * 100.0;
  return Math.max(0, Math.min(100, Math.round(reserve * 10) / 10));
}

/**
 * Rolls-Royce Coin Balance Test (Zero Vibration Stability)
 * Analytical primary & secondary force cancellation in 60° V12.
 */
export function calculateCoinStability(rpm) {
  const microVibrationMm = 0.0012 + (rpm / 6000) * 0.0008;
  return {
    stabilityPercent: 100.0,
    status: "Coin Balanced Upright",
    vibrationAmplitudeMm: microVibrationMm,
    primaryForceUnbalanceN: 0.0,
    secondaryForceUnbalanceN: 0.0
  };
}

/**
 * Twin Turbocharger Boost Pressure
 * Direct Injection Bi-Turbo with water-to-air charge cooling
 */
export function calculateTurboBoost(rpm) {
  const boostStart = 1000;
  const fullBoost = 1600;

  let boostBar = 1.0;
  if (rpm > boostStart) {
    const p = Math.min(1, (rpm - boostStart) / (fullBoost - boostStart));
    boostBar = 1.0 + 0.62 * p;
  }
  const boostPsi = Math.max(0, (boostBar - 1.0) * 14.5038);
  return {
    absoluteBar: Math.round(boostBar * 100) / 100,
    relativePsi: Math.round(boostPsi * 10) / 10
  };
}
