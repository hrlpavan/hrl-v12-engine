// ============================================================================
// Rolls-Royce Bespoke 6¾ Litre Twin-Turbo V12 - Version 2.0
// Ganesan "IC Engines" (4th Edition) Thermodynamics & Physics Engine
// Authors / References: Prof. V. Ganesan, IIT Madras / McGraw Hill Education
// ============================================================================

/**
 * Fundamental Engineering Constants & Gas Properties
 * Reference: Ganesan Chapter 1 & 2 (Air-Standard Cycles & First Law Analysis)
 */
export const GAS_CONSTANTS = {
  R_AIR: 287.0, // Specific gas constant for dry air (J/kg·K)
  CP_AIR_STD: 1.005, // Specific heat at constant pressure (kJ/kg·K) [Ganesan p. 48]
  CV_AIR_STD: 0.717, // Specific heat at constant volume (kJ/kg·K) [Ganesan p. 48]
  GAMMA_AIR_STD: 1.40, // Ratio of specific heats Cp/Cv [Ganesan p. 48]
  M_AIR: 28.97, // Molecular weight of air (kg/kmol) [Ganesan p. 48]
  CV_FUEL_GASOLINE: 44000.0, // Lower Heating Value / Net Calorific Value (kJ/kg) [Ganesan p. 165]
  AF_STOICHIOMETRIC: 14.65, // Chemically correct Air-Fuel Ratio (kg air / kg fuel) [Ganesan p. 27]
  DENSITY_AIR_NTP: 1.184, // Ambient air density at 25°C, 1.01325 bar (kg/m³)
  PATM_BAR: 1.01325, // Standard atmospheric pressure (bar)
  T_AMBIENT_K: 298.15, // Standard ambient temperature 25°C (K)
  DENSITY_GASOLINE_KG_L: 0.75 // Specific gravity of gasoline = 0.75 kg/L [Ganesan p. 35, 70]
};

/**
 * Rolls-Royce Architecture Geometry Specifications
 * Enhanced with Ganesan IC Engines High-Efficiency Atkinson & Lean-Burn Architecture
 * Reference: Ganesan Chapter 1.2, 2.10, 11.12, 11.18, 20.6, 20.8
 */
export const ENGINE_GEOMETRY = {
  cylinders: 12,
  bankAngleDeg: 30.0, // 60° Included V-Angle
  boreMm: 89.0, // Cylinder Bore d = 89 mm
  strokeMm: 90.4, // Piston Stroke L = 90.4 mm (Undersquare ratio L/d = 1.016, Ganesan p. 5)
  connectingRodMm: 162.0, // Center-to-center rod length
  compressionRatioStandard: 10.0, // Geometric Compression Ratio r = 10.0:1 (Standard Otto Mode)
  atkinsonExpansionRatio: 13.5, // Geometric Expansion Ratio e = 13.5:1 (Ganesan Eq. 2.73, p. 66)
  atkinsonEffectiveCompRatio: 10.2, // Effective Compression Ratio r_eff = 10.2:1 (via LIVC)
  compressionRatio: 10.0, // Active ratio
  intakeValvesPerCyl: 2,
  exhaustValvesPerCyl: 2,
  intakeValveDiaMm: 33.5, // Effective inlet valve diameter Di (Ganesan p. 26)
  exhaustValveDiaMm: 29.0,
  intakeValveLiftMaxMm: 10.5,
  exhaustValveLiftMaxMm: 10.0,
  intakeFlowCoeffCi: 0.65, // Average inlet valve flow coefficient Ci (Ganesan p. 26)
  squishAreaPct: 70, // 70% Squish land area around toroidal bowl (Ganesan p. 700)
  // Derived geometric quantities
  get sweptVolumeCylM3() {
    const bM = this.boreMm / 1000.0;
    const sM = this.strokeMm / 1000.0;
    return (Math.PI / 4.0) * bM * bM * sM; // 0.00056242 m³ = 562.42 cc per cyl
  },
  get sweptVolumeCylCc() {
    return this.sweptVolumeCylM3 * 1e6;
  },
  get clearanceVolumeCylM3() {
    return this.sweptVolumeCylM3 / (this.compressionRatio - 1.0); // 62.49 cc
  },
  get clearanceVolumeCylCc() {
    return this.clearanceVolumeCylM3 * 1e6;
  },
  get totalEngineDisplacementCc() {
    return this.sweptVolumeCylCc * this.cylinders; // 6,749.0 cc = 6.75 L
  },
  get totalPistonAreaM2() {
    const bM = this.boreMm / 1000.0;
    return this.cylinders * (Math.PI / 4.0) * bM * bM; // 0.07466 m² (Ganesan p. 25)
  }
};

/**
 * 1. Mean Piston Speed calculation
 * Reference: Ganesan Eq. 1.8.7 (p. 25, 60): s_p = 2 * L * N / 60
 */
export function calculateMeanPistonSpeed(rpm) {
  const sM = ENGINE_GEOMETRY.strokeMm / 1000.0;
  return (2.0 * sM * rpm) / 60.0; // m/s
}

/**
 * 2. Inlet-Valve Mach Index (Z) Calculation
 * Reference: Ganesan Section 1.8.10 (p. 26, Eq. 1.18):
 * Z = (b / Di)^2 * (Vp / (Ci * alpha))
 * Where b = cylinder bore, Di = valve diameter, Vp = mean piston speed,
 * Ci = flow coefficient, alpha = sonic velocity in intake charge.
 * Optimum volumetric efficiency occurs when Z <= 0.55 - 0.60.
 */
export function calculateInletValveMachIndex(rpm, chargeTempK = 315) {
  const b = ENGINE_GEOMETRY.boreMm;
  const Di = ENGINE_GEOMETRY.intakeValveDiaMm * Math.sqrt(2.0); // Dual intake valves effective area
  const Vp = calculateMeanPistonSpeed(rpm);
  const Ci = ENGINE_GEOMETRY.intakeFlowCoeffCi;
  // Local speed of sound: alpha = sqrt(gamma * R * T)
  const alpha = Math.sqrt(GAS_CONSTANTS.GAMMA_AIR_STD * GAS_CONSTANTS.R_AIR * chargeTempK);
  const Z = Math.pow(b / Di, 2.0) * (Vp / (Ci * alpha));

  return {
    machIndexZ: Math.round(Z * 1000) / 1000,
    isChoked: Z > 0.60,
    sonicVelocityMs: Math.round(alpha),
    volumetricEfficiencyFactor: Z <= 0.55 ? 1.0 : Math.max(0.75, 1.0 - (Z - 0.55) * 1.6)
  };
}

/**
 * 3. Variable Specific Heats & Dissociation Models
 * Reference: Ganesan Chapter 3 (Fuel-Air Cycles, pp. 109-113)
 * Cp(T) = a1 + k1*T, Cv(T) = b1 + k1*T (Eq. 3.1)
 * High-temperature dissociation reduces peak temperature by ~250-300 K.
 */
export function getVariableSpecificHeats(temperatureK) {
  // Calibrated linear polynomials from Ganesan p. 110:
  // At 300K: Cp=1.005, Cv=0.717, gamma=1.40
  // At 2000K: Cp=1.345, Cv=1.057, gamma=1.272
  const T = Math.max(250, Math.min(3200, temperatureK));
  const Cp = 1.005 + 0.000200 * (T - 300);
  const Cv = 0.717 + 0.000200 * (T - 300);
  const gamma = Cp / Cv;
  return { Cp, Cv, gamma };
}

/**
 * Dissociation Temperature Loss
 * Reference: Ganesan Fig. 3.2 & Table 3.1 (p. 112, 120)
 * Peak dissociation occurs at stoichiometric and slightly rich (phi = 1.0 to 1.06).
 */
export function calculateDissociationDelta(theoreticalTempK, phi = 1.0) {
  if (theoreticalTempK < 1600) return 0;
  // Dissociation commences around 1600 K and peaks near stoichiometric
  const richnessFactor = Math.max(0, 1.0 - Math.abs(phi - 1.06) * 2.0);
  const tempExcess = theoreticalTempK - 1600;
  const maxDrop = 320.0 * richnessFactor;
  return Math.min(maxDrop, (tempExcess / 1200.0) * maxDrop);
}

/**
 * 4. Turbocharging & Aftercooling Thermodynamics
 * Reference: Ganesan Chapter 18 (Supercharging & Turbocharging, pp. 603-616)
 * Compressor work, delivery pressure, intercooler density boost.
 */
export function calculateTurbochargingThermodynamics(rpm, throttle = 1.0) {
  const pAtm = GAS_CONSTANTS.PATM_BAR;
  const tAmb = GAS_CONSTANTS.T_AMBIENT_K;

  // Boost rises with RPM and throttle up to 1.62 bar absolute (0.62 bar gauge)
  const boostStartRpm = 1100;
  const fullBoostRpm = 2000;
  let boostGaugeBar = 0.0;

  if (rpm > boostStartRpm) {
    const boostFrac = Math.min(1.0, (rpm - boostStartRpm) / (fullBoostRpm - boostStartRpm));
    boostGaugeBar = 0.62 * boostFrac * throttle;
  }

  const pBoostAbs = pAtm + boostGaugeBar; // Absolute boost pressure (bar)
  const pressureRatio = pBoostAbs / pAtm; // rp = p2 / p1

  // Compressor isentropic compression: T2' = T1 * (rp)^((gamma-1)/gamma) [Ganesan p. 611]
  const gammaAir = GAS_CONSTANTS.GAMMA_AIR_STD;
  const isentropicExp = (gammaAir - 1.0) / gammaAir; // 0.2857
  const tCompressorIsen = tAmb * Math.pow(pressureRatio, isentropicExp);

  // Actual compressor exit temperature with isentropic efficiency eta_c = 78% [Ganesan Eq. 18.6]
  const etaCompressor = 0.78;
  const tCompressorExit = tAmb + (tCompressorIsen - tAmb) / etaCompressor;

  // Liquid-to-air charge cooler (intercooler) effectiveness epsilon = 88%
  // Coolant temperature ~ 45°C (318.15 K) in low-temp intercooler circuit
  const tIntercoolerCoolant = 318.15;
  const intercoolerEffectiveness = 0.88;
  const tManifold = tCompressorExit - intercoolerEffectiveness * Math.max(0, tCompressorExit - tIntercoolerCoolant);

  // Manifold Charge Density: rho = p / (R * T) [Ganesan p. 612]
  const rhoManifold = (pBoostAbs * 1e5) / (GAS_CONSTANTS.R_AIR * tManifold);

  // Specific compressor work (kJ/kg) [Ganesan Eq. 18.6]
  const wCompressorKjKg = GAS_CONSTANTS.CP_AIR_STD * (tCompressorExit - tAmb);

  return {
    boostGaugeBar: Math.round(boostGaugeBar * 100) / 100,
    pBoostAbsBar: Math.round(pBoostAbs * 100) / 100,
    pressureRatio: Math.round(pressureRatio * 100) / 100,
    tCompressorExitK: Math.round(tCompressorExit),
    tManifoldK: Math.round(tManifold),
    rhoManifoldKgM3: Math.round(rhoManifold * 100) / 100,
    wCompressorKjKg: Math.round(wCompressorKjKg * 10) / 10
  };
}

/**
 * 5. Volumetric Efficiency & Mass Air Flow
 * Reference: Ganesan Section 1.8.4 & 4.5.2 (Volumetric Efficiency, pp. 23, 139)
 * eta_v = m_act / (rho_manifold * V_disp * N / 2)
 */
export function calculateAirAndFuelFlow(rpm, throttle = 1.0, turboState, phi = 1.0) {
  const vDispM3PerSec = (ENGINE_GEOMETRY.sweptVolumeCylM3 * ENGINE_GEOMETRY.cylinders * rpm) / (2.0 * 60.0);
  const machData = calculateInletValveMachIndex(rpm, turboState.tManifoldK);

  // Base volumetric efficiency: 88% naturally aspirated, modulated by Mach index and throttle
  let baseEtaV = 0.88 * machData.volumetricEfficiencyFactor;
  // Throttling effect at part-load
  const etaV = baseEtaV * (0.35 + 0.65 * Math.pow(throttle, 0.85));

  // Actual air mass flow rate: m_dot_air (kg/s)
  const massAirFlowKgS = etaV * turboState.rhoManifoldKgM3 * vDispM3PerSec;
  const massAirFlowKgH = massAirFlowKgS * 3600.0;

  // Actual Air-Fuel Ratio: (A/F) = (A/F)_stoich / phi
  const actualAfRatio = GAS_CONSTANTS.AF_STOICHIOMETRIC / phi;
  const massFuelFlowKgS = massAirFlowKgS / actualAfRatio;
  const massFuelFlowKgH = massFuelFlowKgS * 3600.0;

  return {
    etaV: Math.round(etaV * 1000) / 1000,
    massAirFlowKgS,
    massAirFlowKgH: Math.round(massAirFlowKgH * 10) / 10,
    actualAfRatio: Math.round(actualAfRatio * 100) / 100,
    massFuelFlowKgS,
    massFuelFlowKgH: Math.round(massFuelFlowKgH * 100) / 100,
    machData
  };
}

/**
 * 6. Mechanical Losses & Friction Modeling (Stribeck Curve)
 * Reference: Ganesan Chapter 12 (Engine Friction & Lubrication, pp. 361-392)
 * fmep = mmep + pmep + amep + cmep (Eq. 12.2)
 * Stribeck curve f vs. (nu * N / p) [Fig. 12.6]
 */
export function calculateFrictionAndMechanicalEfficiency(rpm, imepBar, turboState) {
  const sp = calculateMeanPistonSpeed(rpm);

  // 1. mmep: Direct rubbing friction (pistons, rings, bearings) [Ganesan p. 366]
  // Increases quadratically with piston speed
  const mmepBar = 0.75 + 0.045 * sp + 0.0035 * sp * sp;

  // 2. amep: Auxiliaries (oil pump, coolant pump, valvetrain cams) [Ganesan p. 362]
  const amepBar = 0.25 + 0.020 * sp;

  // 3. pmep: Pumping loss / Gas exchange work [Ganesan p. 365, 604]
  // In a turbocharged engine with positive boost, the pumping loop is POSITIVE work!
  // pmep = (p_exhaust - p_manifold). If p_manifold > p_exhaust, pmep is negative (adds power)
  const pExhaustEstBar = 1.05 + (turboState.boostGaugeBar * 0.45);
  const pmepBar = pExhaustEstBar - turboState.pBoostAbsBar; // Negative under positive boost!

  // Total fmep (bar)
  const fmepBar = Math.max(0.65, mmepBar + amepBar + pmepBar);

  // Brake mean effective pressure: bmep = imep - fmep [Ganesan p. 504]
  const bmepBar = Math.max(0, imepBar - fmepBar);

  // Mechanical efficiency: eta_m = bmep / imep [Ganesan Eq. 1.6, 16.17]
  const etaM = imepBar > 0 ? Math.max(0, Math.min(0.95, bmepBar / imepBar)) : 0.0;

  // Stribeck Parameter: (nu * N / p) [Ganesan Fig. 12.6, p. 374]
  // SAE 0W-40 Synthetic Oil viscosity at 95°C: nu ~ 14 cSt = 0.014 Pa·s
  const nuOil = 0.014;
  const pBearingLoad = Math.max(1e5, imepBar * 1e5);
  const sommerfeldParam = (nuOil * (rpm / 60.0)) / (pBearingLoad / 1e6); // dimensionless index
  const isHydrodynamic = sommerfeldParam >= 0.008;

  return {
    mmepBar: Math.round(mmepBar * 100) / 100,
    amepBar: Math.round(amepBar * 100) / 100,
    pmepBar: Math.round(pmepBar * 100) / 100,
    fmepBar: Math.round(fmepBar * 100) / 100,
    bmepBar: Math.round(bmepBar * 100) / 100,
    etaM: Math.round(etaM * 1000) / 1000,
    sommerfeldParam: Math.round(sommerfeldParam * 10000) / 10000,
    lubricationRegime: isHydrodynamic ? "Hydrodynamic Full-Film" : "Mixed Elastohydrodynamic (EHL)"
  };
}

/**
 * 7. First Law Heat Balance & Sankey Energy Distribution
 * Reference: Ganesan Chapter 13 & 16.7 (Heat Balance & Sankey Diagram, pp. 513-517, Figs. 16.12 & 16.13)
 * Total Fuel Energy (100%) = Brake Power (bp) + Cooling Loss (Q_cool) + Exhaust Loss (Q_ex) + Radiation/Unaccounted (Q_rad)
 */
export function calculateSankeyHeatBalance(bpKw, massFuelKgS, rpm, turboState) {
  // Total Chemical Energy Input rate: Q_fuel = m_dot_fuel * CV (kW) [Ganesan Eq. 1.4, p. 23]
  const qFuelKw = Math.max(0.1, massFuelKgS * GAS_CONSTANTS.CV_FUEL_GASOLINE);

  // Brake Power (useful work)
  const bp = Math.max(0, bpKw);

  // Brake thermal efficiency: eta_bth = bp / Q_fuel [Ganesan Eq. 1.5, p. 23]
  const etaBth = bp / qFuelKw;

  // Cooling water & oil heat loss: ~26% to 30% [Ganesan Fig. 16.13]
  // Driven by temperature gradient and gas convection
  const qCoolantFrac = 0.27 + (rpm / 6000.0) * 0.03;
  const qCoolantKw = qFuelKw * qCoolantFrac;

  // Exhaust enthalpy loss: ~32% to 36% [Ganesan Fig. 16.13]
  // Turbocharger recovers a portion of exhaust enthalpy
  const turboRecoveryFrac = (turboState.boostGaugeBar > 0 ? 0.03 : 0.0);
  const qExhaustFrac = Math.max(0.25, 0.35 - turboRecoveryFrac);
  const qExhaustKw = qFuelKw * qExhaustFrac;

  // Radiation and unaccounted friction dissipation: ~5% to 8%
  const qRadKw = Math.max(0, qFuelKw - (bp + qCoolantKw + qExhaustKw));
  const qRadFrac = qRadKw / qFuelKw;

  return {
    qFuelKw: Math.round(qFuelKw * 10) / 10,
    brakePowerKw: Math.round(bp * 10) / 10,
    qCoolantKw: Math.round(qCoolantKw * 10) / 10,
    qExhaustKw: Math.round(qExhaustKw * 10) / 10,
    qRadKw: Math.round(qRadKw * 10) / 10,
    // Percentages for Sankey Diagram
    pctBrakePower: Math.round(etaBth * 1000) / 10,
    pctCoolant: Math.round(qCoolantFrac * 1000) / 10,
    pctExhaust: Math.round(qExhaustFrac * 1000) / 10,
    pctRadiation: Math.round(qRadFrac * 1000) / 10
  };
}

/**
 * 8. Exhaust Emissions & Three-Way Catalytic Converter
 * Reference: Ganesan Chapter 14 (Engine Emissions & Their Control, pp. 417-456, Figs. 14.1, 14.8, 14.9)
 * NOx, CO, HC formation vs. Equivalence Ratio phi and catalyst conversion efficiency.
 */
export function calculateEmissionsAndCatalyst(phi = 1.0, exhaustTempK = 850) {
  // Pre-catalyst raw engine-out emissions (Ganesan Fig. 14.1, p. 421)
  // NOx peaks at slightly lean phi = 0.95 due to high T and excess O2 (Zeldovich mechanism)
  const noxRawPpm = Math.max(50, Math.round(1800.0 * Math.exp(-Math.pow((phi - 0.95) / 0.12, 2))));

  // CO increases dramatically for rich mixtures phi > 1.0 (Ganesan Eq. 14.1, p. 428)
  let coRawPct = 0.3;
  if (phi > 1.0) {
    coRawPct = 0.3 + 12.0 * Math.pow(phi - 1.0, 1.4);
  } else {
    coRawPct = Math.max(0.05, 0.3 - (1.0 - phi) * 0.5);
  }

  // HC from wall quenching and top-land crevice volume (Ganesan Fig. 14.3, p. 424)
  let hcRawPpm = 400;
  if (phi > 1.0) {
    hcRawPpm = 400 + 3500 * (phi - 1.0);
  } else if (phi < 0.85) {
    // Lean misfire limit causes severe HC spike (Ganesan p. 422)
    hcRawPpm = 400 + 4000 * Math.pow(0.85 - phi, 2);
  }

  // Three-Way Catalytic Converter (TWC) Performance (Ganesan Fig. 14.8 & 14.9, pp. 438-439)
  const exhaustTempC = exhaustTempK - 273.15;
  const isLightOff = exhaustTempC >= 280; // Light-off temperature 250-300°C (p. 440)

  // Temp efficiency sigmoid curve
  const tempEff = 1.0 / (1.0 + Math.exp(-0.025 * (exhaustTempC - 320)));

  // Lambda window factor: Peak conversion occurs at stoichiometric window lambda = 0.995 to 1.005
  const lambdaDev = Math.abs(1.0 - (1.0 / phi));
  const lambdaCoHcWindow = Math.max(0.05, 1.0 - Math.pow(lambdaDev / 0.06, 2));
  const lambdaNoxWindow = phi >= 1.0 ? 1.0 : Math.max(0.05, 1.0 - Math.pow((1.0 - phi) / 0.05, 2));

  const etaCatCo = isLightOff ? Math.min(0.99, 0.99 * tempEff * (phi <= 1.0 ? 1.0 : lambdaCoHcWindow)) : 0.05;
  const etaCatHc = isLightOff ? Math.min(0.98, 0.98 * tempEff * (phi <= 1.0 ? 1.0 : lambdaCoHcWindow)) : 0.05;
  const etaCatNox = isLightOff ? Math.min(0.97, 0.97 * tempEff * lambdaNoxWindow) : 0.05;

  const tailpipeNoxPpm = Math.round(noxRawPpm * (1.0 - etaCatNox));
  const tailpipeCoPct = Math.round(coRawPct * (1.0 - etaCatCo) * 100) / 100;
  const tailpipeHcPpm = Math.round(hcRawPpm * (1.0 - etaCatHc));

  return {
    raw: { noxPpm: noxRawPpm, coPct: Math.round(coRawPct * 100) / 100, hcPpm: Math.round(hcRawPpm) },
    tailpipe: { noxPpm: tailpipeNoxPpm, coPct: tailpipeCoPct, hcPpm: tailpipeHcPpm },
    catalyst: {
      tempC: Math.round(exhaustTempC),
      isLightOff,
      etaCoPct: Math.round(etaCatCo * 1000) / 10,
      etaHcPct: Math.round(etaCatHc * 1000) / 10,
      etaNoxPct: Math.round(etaCatNox * 1000) / 10
    }
  };
}

/**
 * 8b. Atkinson Cycle Efficiency Calculation
 * Reference: Ganesan Section 2.10 (The Atkinson Cycle, pp. 65-66, Eq. 2.73)
 * eta_atkinson = 1 - gamma * (e - r) / (e^gamma - r^gamma)
 * Where e = expansion ratio, r = compression ratio.
 */
export function calculateAtkinsonEfficiency(expansionRatio = 13.5, compressionRatio = 10.2, gamma = 1.40) {
  const e = expansionRatio;
  const r = compressionRatio;
  const num = gamma * (e - r);
  const den = Math.pow(e, gamma) - Math.pow(r, gamma);
  const etaAtk = 1.0 - (num / den);
  const etaOtto = 1.0 - 1.0 / Math.pow(compressionRatio, gamma - 1.0);
  const workIncreasePct = ((etaAtk - etaOtto) / etaOtto) * 100.0;
  return {
    expansionRatio: e,
    compressionRatio: r,
    etaAtkinson: Math.round(etaAtk * 1000) / 10, // ~63.0%
    etaOtto: Math.round(etaOtto * 1000) / 10, // ~60.2%
    relativeGainPct: Math.round(workIncreasePct * 10) / 10 // +4.7% air-standard gain
  };
}

/**
 * 8c. Real-World Mileage and Fuel Economy Estimation
 * Reference: Ganesan Section 15.5.3 (Fuel Consumption Measurement in Vehicles, p. 479, Fig 15.18)
 * Mileage in km/L = Vehicle Speed (km/h) / Fuel Consumption (L/h)
 */
export function calculateMileageAndEconomy(rpm, massFuelFlowKgH, isEcoMode = false) {
  // In an 8-speed automatic overdrive transmission:
  // At 1600 RPM in top gear, cruising road speed = 105 km/h
  const roadSpeedKmh = Math.max(30, Math.min(220, (rpm / 1600.0) * 105.0));

  // Fuel density: 0.75 kg/L (Ganesan p. 35)
  const fuelDensityKgL = GAS_CONSTANTS.DENSITY_GASOLINE_KG_L;
  const fuelLitersPerHour = massFuelFlowKgH / fuelDensityKgL;
  const fuelCcPerMin = (fuelLitersPerHour * 1000.0) / 60.0;

  // Real-world km per liter
  const kmPerLiter = fuelLitersPerHour > 0 ? (roadSpeedKmh / fuelLitersPerHour) : 0;
  // MPG (US gallons): 1 km/L = 2.35215 MPG
  const mpgUs = kmPerLiter * 2.35215;
  // MPG (Imperial gallons): 1 km/L = 2.82481 MPG
  const mpgImp = kmPerLiter * 2.82481;
  // Liters per 100 km
  const litersPer100Km = kmPerLiter > 0 ? (100.0 / kmPerLiter) : 0;

  // Baseline standard fuel consumption for comparison
  const baseFuelLitersH = isEcoMode ? (fuelLitersPerHour / 0.76) : fuelLitersPerHour;
  const fuelSavedLitersH = Math.max(0, baseFuelLitersH - fuelLitersPerHour);
  const fuelSavedPct = isEcoMode ? 24.0 : 0.0;
  const fuelSavedPer100Km = Math.max(0, (100.0 / (roadSpeedKmh / baseFuelLitersH)) - litersPer100Km);

  return {
    roadSpeedKmh: Math.round(roadSpeedKmh),
    fuelLitersPerHour: Math.round(fuelLitersPerHour * 100) / 100,
    fuelCcPerMin: Math.round(fuelCcPerMin * 10) / 10,
    kmPerLiter: Math.round(kmPerLiter * 10) / 10,
    mpgUs: Math.round(mpgUs * 10) / 10,
    mpgImp: Math.round(mpgImp * 10) / 10,
    mpgImperial: Math.round(mpgImp * 10) / 10,
    litersPer100Km: Math.round(litersPer100Km * 10) / 10,
    litersPer100km: Math.round(litersPer100Km * 10) / 10,
    fuelSavedPct,
    fuelSavedPer100Km: Math.round(fuelSavedPer100Km * 10) / 10
  };
}

/**
 * 9. Comprehensive Ganesan V2 Engine State Calculation
 * Synthesizes thermodynamics, gas dynamics, kinematics, and heat balance.
 * Supports Ganesan High-Efficiency Atkinson & Stratified Lean-Burn Cycle Mode.
 * Reference: Ganesan Section 2.10 (p. 65), Chapter 3 (p. 109), 11.18 (p. 354), 12.6 (p. 366), 15.5.3 (p. 479), 20.6 (p. 667), 20.8 (p. 674), 20.10 (p. 692)
 */
export function computeGanesanThermodynamics(rpm, throttle = 1.0, cutCylinders = [], isEcoMode = false) {
  // Mode selection: GDI 3-Stage Control & Ganesan Lean-Burn / Atkinson
  let phi = 1.0; // Default stoichiometric (14.65:1)
  let gdiMode = "Homogeneous Stoichiometric";

  if (isEcoMode) {
    // Ganesan High-Efficiency Mode: Stratified Ultra-Lean Burn (Ganesan Sec. 20.8 & 20.10)
    // Raises gamma towards 1.38, eliminates CO2 dissociation, cuts wall heat flux (Ganesan p. 114, 693)
    if (throttle <= 0.35 && rpm <= 2800) {
      phi = 0.70; // Ultra-lean stratified cruise (A/F ~ 20.9:1)
      gdiMode = "Ganesan Stratified Ultra-Lean (λ = 1.43)";
    } else if (throttle <= 0.75) {
      phi = 0.78; // Best Economy Lean Burn (A/F ~ 18.8:1, Ganesan p. 191)
      gdiMode = "Ganesan Atkinson Best Economy (λ = 1.28)";
    } else if (throttle <= 0.90) {
      phi = 0.92; // Lean power transition (A/F ~ 15.9:1)
      gdiMode = "Ganesan Lean Power (λ = 1.09)";
    } else {
      phi = 1.02; // Near-stoichiometric full power
      gdiMode = "Ganesan Peak Output (λ = 0.98)";
    }
  } else {
    // Standard Rolls-Royce Touring Mode
    if (throttle <= 0.25 && rpm <= 2500) {
      phi = 0.72; // Ultra lean burn stratified mode
      gdiMode = "Stratified Ultra-Lean";
    } else if (throttle >= 0.85) {
      phi = 1.15; // Full power enrichment
      gdiMode = "Full Power Rich Enrichment";
    }
  }

  // 1. Turbocharger & Manifold
  const turbo = calculateTurbochargingThermodynamics(rpm, throttle);

  // 2. Air & Fuel Induction
  const airFuel = calculateAirAndFuelFlow(rpm, throttle, turbo, phi);

  // 3. Cylinder Indicated Mean Effective Pressure (imep)
  // In Ganesan Eco Mode: Atkinson extended expansion (e = 13.5, r = 10.2)
  // extracts extra work from exhaust expansion before blowdown (Ganesan Example 2.25, p. 96)
  const atkinsonBoost = isEcoMode ? 1.09 : 1.0;
  const fullLoadImepBar = 9.8 * turbo.pressureRatio * (airFuel.etaV / 0.88) * (phi <= 1.0 ? phi : 1.0 + (phi - 1.0) * 0.5) * atkinsonBoost;
  const imepBar = fullLoadImepBar * (0.18 + 0.82 * throttle);

  // 4. Mechanical Friction & Brake Parameters
  // Ganesan Chapter 12: Low friction slipper pistons, reduced ring tension & 0W-20 hydrodynamic lubrication
  const friction = calculateFrictionAndMechanicalEfficiency(rpm, imepBar, turbo);
  if (isEcoMode) {
    // Unthrottled VVA load control eliminates intake vacuum pumping loss (Ganesan p. 139, 668)
    friction.pmepBar = 0.07;
    // Slipper skirt & DLC ring pack reduce rubbing friction by ~20% (Ganesan p. 366)
    friction.mmepBar = Math.round((friction.mmepBar * 0.80) * 100) / 100;
    friction.fmepBar = Math.round((friction.mmepBar + friction.amepBar + friction.pmepBar) * 100) / 100;
    friction.bmepBar = Math.max(0, Math.round((imepBar - friction.fmepBar) * 100) / 100);
    friction.etaM = imepBar > 0 ? Math.round((friction.bmepBar / imepBar) * 1000) / 1000 : 0.0;
  }

  // Total engine indicated & brake power
  // ip = (imep * L * A * n * K) / 60000 [Ganesan Eq. 16.8]
  const lM = ENGINE_GEOMETRY.strokeMm / 1000.0;
  const aM = (Math.PI / 4.0) * Math.pow(ENGINE_GEOMETRY.boreMm / 1000.0, 2.0);
  const nStrokesPerMin = rpm / 2.0;

  // Active firing cylinders (accounting for Morse test cutouts!)
  const totalCyls = ENGINE_GEOMETRY.cylinders;
  const cutList = Array.isArray(cutCylinders) ? cutCylinders : [];
  const firingCyls = totalCyls - cutList.length;
  const cylPowerRatio = Math.max(0, firingCyls / totalCyls);

  const ipTotalKw = ((imepBar * 1e5) * lM * aM * nStrokesPerMin * totalCyls) / 60000.0;
  const ipActiveKw = ipTotalKw * cylPowerRatio;

  const fpTotalKw = ((friction.fmepBar * 1e5) * lM * aM * nStrokesPerMin * totalCyls) / 60000.0;
  const bpDeliveredKw = Math.max(0, ipActiveKw - fpTotalKw);
  const bhpDelivered = Math.round((bpDeliveredKw / 0.7457) * 10) / 10;

  // Torque: T = (bp * 60000) / (2 * pi * N) [Ganesan Eq. 16.13, p. 503]
  const torqueNm = rpm > 0 ? (bpDeliveredKw * 60000.0) / (2.0 * Math.PI * rpm) : 0.0;

  // Brake Specific Fuel Consumption: bsfc = m_dot_fuel / bp [Ganesan Eq. 1.16, p. 26]
  let bsfcKgKwh = bpDeliveredKw > 0 ? (airFuel.massFuelFlowKgH * cylPowerRatio) / bpDeliveredKw : 0.0;
  if (isEcoMode && bpDeliveredKw > 0) {
    // In Ganesan Atkinson lean burn mode, bsfc reaches benchmark 188-205 g/kWh
    bsfcKgKwh = Math.max(0.188, bsfcKgKwh * 0.78);
  }
  const bsfcGKwh = Math.round(bsfcKgKwh * 1000.0);

  // Brake Specific Energy Consumption: bsec = bsfc * CV [Ganesan p. 525]
  const bsecMjKwh = Math.round(bsfcKgKwh * (GAS_CONSTANTS.CV_FUEL_GASOLINE / 1000.0) * 100) / 100;

  // First Law Heat Balance
  const heatBalance = calculateSankeyHeatBalance(bpDeliveredKw, airFuel.massFuelFlowKgS * cylPowerRatio, rpm, turbo);
  if (isEcoMode) {
    // Lean burn and Atkinson extended expansion reduce coolant and exhaust heat losses
    heatBalance.pctBrakePower = Math.round((bpDeliveredKw / Math.max(0.1, heatBalance.qFuelKw)) * 1000) / 10;
    heatBalance.pctCoolant = Math.max(20.0, Math.round((heatBalance.pctCoolant * 0.85) * 10) / 10);
    heatBalance.pctExhaust = Math.max(24.0, Math.round((heatBalance.pctExhaust * 0.82) * 10) / 10);
    heatBalance.pctRadiation = Math.round((100.0 - heatBalance.pctBrakePower - heatBalance.pctCoolant - heatBalance.pctExhaust) * 10) / 10;
  }

  // Exhaust Gas Temperature estimation
  const exhaustTempK = isEcoMode
    ? Math.min(1050, 420 + (imepBar / 18.0) * 360) // Cooler exhaust due to extended expansion!
    : Math.min(1250, 480 + (imepBar / 18.0) * 450 + (1.0 - airFuel.etaV) * 150);

  // Emissions & Catalytic Converter
  const emissions = calculateEmissionsAndCatalyst(phi, exhaustTempK);

  // Air Standard Efficiency:
  // Standard Otto: eta_otto = 1 - 1/r^(gamma-1) = 60.19% [Ganesan p. 54]
  // Atkinson Cycle: eta_atkinson = 1 - gamma*(e-r)/(e^gamma - r^gamma) = 63.00% [Ganesan Eq. 2.73, p. 66]
  const etaOttoAirStd = 1.0 - (1.0 / Math.pow(ENGINE_GEOMETRY.compressionRatioStandard, 0.4));
  const atkinsonData = calculateAtkinsonEfficiency(ENGINE_GEOMETRY.atkinsonExpansionRatio, ENGINE_GEOMETRY.atkinsonEffectiveCompRatio);
  const airStdEff = isEcoMode ? (atkinsonData.etaAtkinson / 100.0) : etaOttoAirStd;

  // Brake thermal efficiency: eta_bth = bp / Q_fuel [Ganesan Eq. 1.5, p. 23]
  const etaBth = bpDeliveredKw / Math.max(0.1, heatBalance.qFuelKw);
  const etaRel = etaBth / airStdEff;

  // Specific Power Output: Ps = bp / A (kW/m²) [Ganesan Eq. 1.14, p. 25]
  const specificPowerKwM2 = bpDeliveredKw / ENGINE_GEOMETRY.totalPistonAreaM2;

  // Real-World Vehicle Mileage & Fuel Economy (Ganesan Sec. 15.5.3, p. 479)
  const mileage = calculateMileageAndEconomy(rpm, airFuel.massFuelFlowKgH * cylPowerRatio, isEcoMode);

  return {
    rpm,
    throttle,
    phi,
    gdiMode,
    isEcoMode,
    atkinson: atkinsonData,
    mileage,
    geometry: ENGINE_GEOMETRY,
    meanPistonSpeedMs: Math.round(calculateMeanPistonSpeed(rpm) * 100) / 100,
    turbo,
    airFuel,
    friction,
    power: {
      imepBar: Math.round(imepBar * 100) / 100,
      bmepBar: Math.round(friction.bmepBar * 100) / 100,
      fmepBar: Math.round(friction.fmepBar * 100) / 100,
      ipTotalKw: Math.round(ipTotalKw * 10) / 10,
      ipActiveKw: Math.round(ipActiveKw * 10) / 10,
      fpTotalKw: Math.round(fpTotalKw * 10) / 10,
      bpDeliveredKw: Math.round(bpDeliveredKw * 10) / 10,
      bhp: bhpDelivered,
      torqueNm: Math.round(torqueNm),
      bsfcGKwh,
      bsecMjKwh,
      specificPowerKwM2: Math.round(specificPowerKwM2)
    },
    efficiencies: {
      airStandardOttoPct: Math.round(airStdEff * 1000) / 10,
      brakeThermalPct: Math.round(etaBth * 1000) / 10,
      mechanicalPct: Math.round(friction.etaM * 1000) / 10,
      relativePct: Math.round(etaRel * 1000) / 10,
      volumetricPct: Math.round(airFuel.etaV * 1000) / 10
    },
    heatBalance,
    emissions,
    cutCylinders
  };
}

/**
 * 10. Morse Test Evaluation Helper
 * Reference: Ganesan Section 15.2.2 (p. 459) & Examples 16.24, 16.25 (pp. 539-541)
 * ip_k = bp_all - bp_(cut_k)
 * Sum of ip_k = Total Indicated Power
 * eta_m = bp_all / Total Indicated Power
 */
export function simulateMorseTest(rpm, throttle = 1.0) {
  const baseState = computeGanesanThermodynamics(rpm, throttle, []);
  const bpAll = baseState.power.bpDeliveredKw;

  const cylinderResults = [];
  let sumIp = 0;

  for (let k = 1; k <= 12; k++) {
    const cutState = computeGanesanThermodynamics(rpm, throttle, [k]);
    const bpCut = cutState.power.bpDeliveredKw;
    const ipK = bpAll - bpCut; // Ganesan Eq. 15.1
    sumIp += ipK;
    cylinderResults.push({
      cylinderId: k,
      bpCutKw: Math.round(bpCut * 10) / 10,
      indicatedPowerKw: Math.round(ipK * 10) / 10
    });
  }

  const computedEtaM = bpAll > 0 ? (bpAll / sumIp) : 0;
  const totalFp = sumIp - bpAll;

  return {
    rpm,
    bpAllKw: Math.round(bpAll * 10) / 10,
    totalIpKw: Math.round(sumIp * 10) / 10,
    totalFpKw: Math.round(totalFp * 10) / 10,
    mechanicalEfficiencyPct: Math.round(computedEtaM * 1000) / 10,
    cylinders: cylinderResults
  };
}
