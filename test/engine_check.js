import assert from 'node:assert/strict';
import { computeEngineState, FIRING_ORDER } from '../src/engine/kinematics.js';
import { computeGanesanThermodynamics, calculateAccessoryBeltDrive } from '../src/engine/thermodynamics.js';
import { audioEngine } from '../src/engine/audio.js';

// 1. Kinematics & 12-Cylinder Firing Order (Goodwood 60° V12)
assert.equal(FIRING_ORDER.length, 12, '12-cylinder firing order must contain 12 cylinders');
const state = computeEngineState(0, 1600);
assert.equal(state.cylinders.length, 12, 'Engine state must contain 12 articulated cylinders');
assert.ok(typeof state.cylinders[0].kinematics.s === 'number', 'Piston slider-crank displacement s must be a number');
assert.ok(state.cylinders[0].pistonFraction >= 0, 'Piston fraction must be >= 0');

// 2. Ganesan Thermodynamics & Dual FEAD Serpentine Belt
const thermo = computeGanesanThermodynamics(1600, 1.0, [], false);
assert.ok(thermo.power.bpDeliveredKw > 0, 'Brake power must be positive at WOT');
assert.ok(thermo.efficiencies.brakeThermalPct > 0, 'Brake thermal efficiency must be positive');

const fead = calculateAccessoryBeltDrive(1600);
assert.ok(fead.totalAuxiliaryPowerKw > 0, 'FEAD auxiliary power must be positive');
assert.ok(fead.linearBeltSpeedMs > 0, 'Belt speed must be positive');

// 3. Fluid-Dynamic Acoustics (Heywood Ch. 6, Benson Ch. 2, Munjal Ch. 3 & 5)
audioEngine.setRpm(600);
const telemIdle = audioEngine.getAcousticTelemetry();
assert.equal(telemIdle.fundamentalHz, 60.0, '600 RPM fundamental firing frequency must be exactly 60.0 Hz');
assert.equal(telemIdle.orders.length, 9, 'Must maintain 9 acoustic orders');

audioEngine.setRpm(1800);
const telemCruise = audioEngine.getAcousticTelemetry();
assert.equal(telemCruise.fundamentalHz, 180.0, '1800 RPM fundamental firing frequency must be exactly 180.0 Hz');

console.log('✓ All 12-cylinder kinematics, thermodynamics, and acoustics checks passed.');
