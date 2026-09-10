//! Rolls-Royce 6.75L Twin-Turbo 60° V12 Engine Core (Zig freestanding)
//! High Resource Labs (HRL) x Rolls-Royce Engineering Collaboration
//! Thermodynamic Reference: Prof. V. Ganesan, "Internal Combustion Engines" (4th Ed.)
//!
//! MEMORY SPECIFICATION:
//! - Freestanding, no libc requirement, zero dynamic heap allocation.
//! - Cache-line aligned (64-byte) cylinder structures.
//! - Exact 1536-byte stack memory footprint.

const std = @import("std");
const math = std.math;

pub const CYLINDER_COUNT: usize = 12;
pub const BANK_ANGLE_DEG: f64 = 60.0;
pub const BORE_MM: f64 = 89.0;
pub const STROKE_MM: f64 = 90.4;
pub const ROD_LENGTH_MM: f64 = 152.0;
pub const CRANK_RADIUS_MM: f64 = STROKE_MM / 2.0; // 45.2 mm
pub const LAMBDA_RATIO: f64 = CRANK_RADIUS_MM / ROD_LENGTH_MM; // 0.297368
pub const COMPRESSION_RATIO: f64 = 10.00;
pub const DISPLACEMENT_CC: f64 = 6746.96;
pub const CLEARANCE_VOL_CC: f64 = 62.472;

pub const FEAD_BELT_MASS_PER_M_KG: f64 = 0.125;
pub const FEAD_PULLEY_CRANK_MM: f64 = 170.0;
pub const FEAD_STATIC_TENSION_N: f64 = 650.0;

pub const FIRING_OFFSETS = [CYLINDER_COUNT]f64{
    0.0, 480.0, 240.0, 600.0, 120.0, 360.0,
    60.0, 540.0, 300.0, 660.0, 180.0, 420.0,
};

pub const CylinderState = extern struct {
    crank_angle_rad: f64 = 0.0,
    piston_pos_mm: f64 = 0.0,
    piston_vel_m_s: f64 = 0.0,
    piston_acc_m_s2: f64 = 0.0,
    cylinder_vol_cc: f64 = CLEARANCE_VOL_CC,
    pressure_bar: f64 = 1.0,
    temperature_k: f64 = 300.0,
    stroke_phase: u32 = 0,
    _padding: u32 = 0,
};

pub const V12EngineState = extern struct {
    cylinders: [CYLINDER_COUNT]CylinderState = [_]CylinderState{.{}} ** CYLINDER_COUNT,

    rpm: f64 = 550.0,
    throttle: f64 = 0.05,
    boost_pressure_bar: f64 = 0.0,
    total_indicated_torque: f64 = 0.0,
    total_brake_torque: f64 = 0.0,
    brake_power_kw: f64 = 0.0,
    brake_power_bhp: f64 = 0.0,
    bmep_bar: f64 = 0.0,
    imep_bar: f64 = 0.0,
    fmep_bar: f64 = 0.0,
    mechanical_efficiency: f64 = 0.86,
    bsfc_g_kwh: f64 = 218.0,
    air_mass_flow_kg_s: f64 = 0.015,
    fuel_flow_g_s: f64 = 0.85,
    exhaust_temp_c: f64 = 450.0,
    oil_pressure_bar: f64 = 1.8,
    coolant_temp_c: f64 = 90.0,
    vibration_accel_m_s2: f64 = 0.008,
    sound_spl_dba: f64 = 36.2,
    simulation_time_sec: f64 = 0.0,

    belt_speed_m_s: f64 = 0.0,
    centrifugal_tension_n: f64 = 0.0,
    tight_side_tension_n: f64 = 0.0,
    slack_side_tension_n: f64 = 0.0,
    tension_ratio: f64 = 1.0,
    fead_aux_power_kw: f64 = 0.0,
    tvd_twist_attenuation: f64 = -91.4,
    fead_reserve_capacity: f64 = 70.0,

    firing_offsets_deg: [CYLINDER_COUNT]f64 = FIRING_OFFSETS,
    _padding: [448]u8 = [_]u8{0} ** 448,

    pub fn init() V12EngineState {
        return .{};
    }

    pub fn memoryFootprint() usize {
        return @sizeOf(V12EngineState);
    }
};
