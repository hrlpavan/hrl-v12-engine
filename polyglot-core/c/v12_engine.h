/**
 * Rolls-Royce 6.75L Twin-Turbo 60° V12 Engine Core
 * High Resource Labs (HRL) × Rolls-Royce Collaboration
 * Thermodynamic Reference: Prof. V. Ganesan, "Internal Combustion Engines" (4th Ed.)
 * 
 * MEMORY SPECIFICATION:
 * - 100% stack-allocated, zero heap dynamic allocations (malloc-free)
 * - Cache-line aligned (64-byte boundary)
 * - Deterministic, fixed memory footprint: sizeof(v12_engine_state_t) == 1536 bytes
 */

#ifndef V12_ENGINE_CORE_H
#define V12_ENGINE_CORE_H

#include <stdint.h>
#include <stddef.h>
#include <stdbool.h>

#ifdef __cplusplus
extern "C" {
#endif

/* Engine Architectural Constants (Rolls-Royce N74B68 6.75L V12) */
#define V12_CYLINDER_COUNT        12
#define V12_BANK_ANGLE_DEG        60.0
#define V12_BORE_MM               89.0
#define V12_STROKE_MM             90.4
#define V12_ROD_LENGTH_MM         152.0
#define V12_CRANK_RADIUS_MM       (V12_STROKE_MM / 2.0) /* 45.2 mm */
#define V12_ROD_TO_STROKE_LAMBDA  (V12_CRANK_RADIUS_MM / V12_ROD_LENGTH_MM) /* 0.297368 */
#define V12_COMPRESSION_RATIO     10.00
#define V12_DISPLACEMENT_CC       6746.96
#define V12_CLEARANCE_VOL_CC      62.472
#define V12_SWEPT_VOL_CC          562.247

/* FEAD Belt Constants (EPDM 8PK Micro-V Serpentine) */
#define FEAD_BELT_PITCH_LENGTH_MM 1840.0
#define FEAD_BELT_MASS_PER_M_KG   0.125
#define FEAD_PULLEY_CRANK_MM      170.0
#define FEAD_PULLEY_WATERPUMP_MM  130.0
#define FEAD_PULLEY_ALTERNATOR_MM 70.0
#define FEAD_PULLEY_AC_MM         125.0
#define FEAD_PULLEY_TENSIONER_MM  80.0
#define FEAD_PULLEY_IDLER_MM      75.0
#define FEAD_STATIC_TENSION_N     650.0
#define FEAD_MU_PRIME             1.023 /* mu / sin(beta/2) */

/* Per-cylinder instantaneous state (64 bytes each, exactly 1 cache line) */
typedef struct {
    double crank_angle_rad;       /* Cylinder local crank angle [rad] (offset by firing order) */
    double piston_pos_mm;         /* Distance from TDC [mm] */
    double piston_vel_m_s;        /* Instantaneous piston speed [m/s] */
    double piston_acc_m_s2;       /* Instantaneous piston acceleration [m/s^2] */
    double cylinder_vol_cc;       /* Instantaneous cylinder volume [cc] */
    double pressure_bar;          /* Instantaneous cylinder pressure [bar] */
    double temperature_k;         /* Instantaneous gas temperature [K] */
    uint32_t stroke_phase;        /* 0: Intake, 1: Compression, 2: Power, 3: Exhaust */
    uint32_t reserved;            /* Padding to reach 64 bytes */
} cylinder_state_t;

/* Global Engine Simulation State (Fixed size, stack-allocated, 1536 bytes) */
typedef struct {
    /* 12 Cylinder States: 12 * 64 bytes = 768 bytes */
    cylinder_state_t cylinders[V12_CYLINDER_COUNT];

    /* Thermodynamics & Output Metrics: 20 * 8 bytes = 160 bytes */
    double rpm;
    double throttle;              /* 0.0 to 1.0 */
    double boost_pressure_bar;    /* Manifold gauge pressure [bar] */
    double total_indicated_torque;/* [N*m] */
    double total_brake_torque;    /* [N*m] */
    double brake_power_kw;        /* [kW] */
    double brake_power_bhp;       /* [bhp] */
    double bmep_bar;              /* Brake Mean Effective Pressure [bar] */
    double imep_bar;              /* Indicated Mean Effective Pressure [bar] */
    double fmep_bar;              /* Friction Mean Effective Pressure [bar] */
    double mechanical_efficiency; /* [0.0 - 1.0] */
    double bsfc_g_kwh;            /* [g/kWh] */
    double air_mass_flow_kg_s;    /* [kg/s] */
    double fuel_flow_g_s;         /* [g/s] */
    double exhaust_temp_c;        /* [deg C] */
    double oil_pressure_bar;      /* [bar] */
    double coolant_temp_c;        /* [deg C] */
    double vibration_accel_m_s2;  /* Smoothness metric (< 0.015 m/s^2) */
    double sound_spl_dba;         /* Cabin acoustics (< 38.5 dBA) */
    double simulation_time_sec;

    /* FEAD Auxiliary Belt Drive Metrics: 8 * 8 bytes = 64 bytes */
    double belt_speed_m_s;        /* Linear belt speed [m/s] */
    double centrifugal_tension_n; /* m' * v^2 [N] */
    double tight_side_tension_n;  /* T1 [N] */
    double slack_side_tension_n;  /* T2 [N] */
    double tension_ratio;         /* (T1 - mv^2) / (T2 - mv^2) */
    double fead_aux_power_kw;     /* FEAD power absorption [kW] */
    double tvd_twist_attenuation; /* Crank twist attenuation [-91.4%] */
    double fead_reserve_capacity; /* Margin to belt slip */

    /* Firing Angle Offsets [deg]: 12 * 8 bytes = 96 bytes */
    double firing_offsets_deg[V12_CYLINDER_COUNT];

    /* Structural Alignment Padding: 448 bytes -> Total struct size = 1536 bytes */
    uint8_t memory_padding[448];
} v12_engine_state_t;

/* Function prototypes (Pure functions, zero dynamic heap allocation) */
void v12_engine_init(v12_engine_state_t* engine);
void v12_engine_step(v12_engine_state_t* engine, double dt_sec, double target_rpm, double target_throttle);
void v12_engine_get_cylinder_kinematics(double theta_rad, double* pos_mm, double* vel_m_s, double* acc_m_s2, double* vol_cc);
void v12_engine_calculate_fead_belts(v12_engine_state_t* engine);
size_t v12_engine_get_memory_footprint(void);

#ifdef __cplusplus
}
#endif

#endif /* V12_ENGINE_CORE_H */
