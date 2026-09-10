//! Rolls-Royce 6.75L Twin-Turbo 60° V12 Engine Core (Rust #![no_std])
//! High Resource Labs (HRL) x Rolls-Royce Engineering Collaboration
//! Thermodynamic Reference: Prof. V. Ganesan, "Internal Combustion Engines" (4th Ed.)
//!
//! MEMORY SPECIFICATION:
//! - 100% `no_std` zero dynamic heap allocation.
//! - Fixed struct layout with Copy/Clone value semantics.
//! - Cache-line aligned (64-byte boundary) cylinder states.
//! - Total memory footprint: exactly 1,536 bytes.

#![no_std]

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

// FEAD Serpentine Belt Constants (EPDM 8PK)
pub const FEAD_BELT_PITCH_LENGTH_MM: f64 = 1840.0;
pub const FEAD_BELT_MASS_PER_M_KG: f64 = 0.125;
pub const FEAD_PULLEY_CRANK_MM: f64 = 170.0;
pub const FEAD_STATIC_TENSION_N: f64 = 650.0;
pub const FEAD_MU_PRIME: f64 = 1.023;

pub const FIRING_OFFSETS: [f64; CYLINDER_COUNT] = [
    0.0, 480.0, 240.0, 600.0, 120.0, 360.0,
    60.0, 540.0, 300.0, 660.0, 180.0, 420.0,
];

#[repr(C, align(64))]
#[derive(Copy, Clone, Debug, Default)]
pub struct CylinderState {
    pub crank_angle_rad: f64,
    pub piston_pos_mm: f64,
    pub piston_vel_m_s: f64,
    pub piston_acc_m_s2: f64,
    pub cylinder_vol_cc: f64,
    pub pressure_bar: f64,
    pub temperature_k: f64,
    pub stroke_phase: u32,
    pub _padding: u32,
}

#[repr(C, align(64))]
#[derive(Copy, Clone, Debug)]
pub struct V12EngineState {
    // 12 Cylinders: 12 * 64 = 768 bytes
    pub cylinders: [CylinderState; CYLINDER_COUNT],

    // Thermodynamics & Kinetics: 20 * 8 = 160 bytes
    pub rpm: f64,
    pub throttle: f64,
    pub boost_pressure_bar: f64,
    pub total_indicated_torque: f64,
    pub total_brake_torque: f64,
    pub brake_power_kw: f64,
    pub brake_power_bhp: f64,
    pub bmep_bar: f64,
    pub imep_bar: f64,
    pub fmep_bar: f64,
    pub mechanical_efficiency: f64,
    pub bsfc_g_kwh: f64,
    pub air_mass_flow_kg_s: f64,
    pub fuel_flow_g_s: f64,
    pub exhaust_temp_c: f64,
    pub oil_pressure_bar: f64,
    pub coolant_temp_c: f64,
    pub vibration_accel_m_s2: f64,
    pub sound_spl_dba: f64,
    pub simulation_time_sec: f64,

    // FEAD Auxiliary Drive: 8 * 8 = 64 bytes
    pub belt_speed_m_s: f64,
    pub centrifugal_tension_n: f64,
    pub tight_side_tension_n: f64,
    pub slack_side_tension_n: f64,
    pub tension_ratio: f64,
    pub fead_aux_power_kw: f64,
    pub tvd_twist_attenuation: f64,
    pub fead_reserve_capacity: f64,

    // Firing Offsets: 12 * 8 = 96 bytes
    pub firing_offsets_deg: [f64; CYLINDER_COUNT],

    // Exact structural padding to guarantee 1536-byte stack footprint
    pub _padding: [u8; 448],
}

impl Default for V12EngineState {
    fn default() -> Self {
        Self::new()
    }
}

impl V12EngineState {
    pub const fn new() -> Self {
        Self {
            cylinders: [CylinderState {
                crank_angle_rad: 0.0,
                piston_pos_mm: 0.0,
                piston_vel_m_s: 0.0,
                piston_acc_m_s2: 0.0,
                cylinder_vol_cc: CLEARANCE_VOL_CC,
                pressure_bar: 1.0,
                temperature_k: 300.0,
                stroke_phase: 0,
                _padding: 0,
            }; CYLINDER_COUNT],
            rpm: 550.0,
            throttle: 0.05,
            boost_pressure_bar: 0.0,
            total_indicated_torque: 0.0,
            total_brake_torque: 0.0,
            brake_power_kw: 0.0,
            brake_power_bhp: 0.0,
            bmep_bar: 0.0,
            imep_bar: 0.0,
            fmep_bar: 0.0,
            mechanical_efficiency: 0.86,
            bsfc_g_kwh: 218.0,
            air_mass_flow_kg_s: 0.015,
            fuel_flow_g_s: 0.85,
            exhaust_temp_c: 450.0,
            oil_pressure_bar: 1.8,
            coolant_temp_c: 90.0,
            vibration_accel_m_s2: 0.008,
            sound_spl_dba: 36.2,
            simulation_time_sec: 0.0,
            belt_speed_m_s: 0.0,
            centrifugal_tension_n: 0.0,
            tight_side_tension_n: 0.0,
            slack_side_tension_n: 0.0,
            tension_ratio: 1.0,
            fead_aux_power_kw: 0.0,
            tvd_twist_attenuation: -91.4,
            fead_reserve_capacity: 70.0,
            firing_offsets_deg: FIRING_OFFSETS,
            _padding: [0u8; 448],
        }
    }

    /// Fixed size verification at compile-time
    pub const fn memory_footprint() -> usize {
        core::mem::size_of::<Self>()
    }
}
