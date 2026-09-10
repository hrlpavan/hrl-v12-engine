/**
 * Rolls-Royce 6.75L Twin-Turbo 60° V12 Engine Core Implementation
 * High Resource Labs (HRL) × Rolls-Royce Collaboration
 * Thermodynamic Reference: Prof. V. Ganesan, "Internal Combustion Engines" (4th Ed.)
 */

#include "v12_engine.h"
#include <math.h>
#include <string.h>

#ifndef M_PI
#define M_PI 3.14159265358979323846
#endif

/* 
 * Firing Order: 1 - 7 - 5 - 11 - 3 - 9 - 6 - 12 - 2 - 8 - 4 - 10
 * Crank interval: 60°
 */
static const double FIRING_OFFSETS[V12_CYLINDER_COUNT] = {
    0.0,   /* Cyl 1  (Bank 1) */
    480.0, /* Cyl 2  (Bank 1) */
    240.0, /* Cyl 3  (Bank 1) */
    600.0, /* Cyl 4  (Bank 1) */
    120.0, /* Cyl 5  (Bank 1) */
    360.0, /* Cyl 6  (Bank 1) */
    60.0,  /* Cyl 7  (Bank 2) */
    540.0, /* Cyl 8  (Bank 2) */
    300.0, /* Cyl 9  (Bank 2) */
    660.0, /* Cyl 10 (Bank 2) */
    180.0, /* Cyl 11 (Bank 2) */
    420.0  /* Cyl 12 (Bank 2) */
};

size_t v12_engine_get_memory_footprint(void) {
    return sizeof(v12_engine_state_t);
}

void v12_engine_init(v12_engine_state_t* engine) {
    if (!engine) return;
    memset(engine, 0, sizeof(v12_engine_state_t));

    for (int i = 0; i < V12_CYLINDER_COUNT; i++) {
        engine->firing_offsets_deg[i] = FIRING_OFFSETS[i];
    }

    engine->rpm = 550.0; /* Idle RPM */
    engine->throttle = 0.05;
    engine->boost_pressure_bar = 0.0;
    engine->mechanical_efficiency = 0.86;
    engine->coolant_temp_c = 90.0;
    engine->exhaust_temp_c = 450.0;
    engine->oil_pressure_bar = 1.8;
    engine->vibration_accel_m_s2 = 0.008;
    engine->sound_spl_dba = 36.2;
    engine->tvd_twist_attenuation = -91.4;

    v12_engine_calculate_fead_belts(engine);
}

void v12_engine_get_cylinder_kinematics(double theta_rad, double* pos_mm, double* vel_m_s, double* acc_m_s2, double* vol_cc) {
    const double R = V12_CRANK_RADIUS_MM;       /* 45.2 mm */
    const double lambda = V12_ROD_TO_STROKE_LAMBDA; /* 0.297368 */

    /* Piston displacement s(theta) from TDC (Ganesan Eq. 2.1) */
    double cos_th = cos(theta_rad);
    double sin_th = sin(theta_rad);
    double term_sqrt = sqrt(1.0 - lambda * lambda * sin_th * sin_th);
    
    double s = R * ((1.0 - cos_th) + (1.0 / lambda) * (1.0 - term_sqrt));
    if (pos_mm) *pos_mm = s;

    /* Instantaneous cylinder volume (Ganesan Eq. 2.3) */
    double bore_cm = V12_BORE_MM / 10.0;
    double piston_area_cm2 = (M_PI / 4.0) * bore_cm * bore_cm;
    double s_cm = s / 10.0;
    if (vol_cc) *vol_cc = V12_CLEARANCE_VOL_CC + (piston_area_cm2 * s_cm);

    /* Velocity and acceleration normalized to omega (Ganesan Eq. 2.5, 2.7) */
    if (vel_m_s) {
        double term_v = sin_th + (lambda * sin(2.0 * theta_rad)) / (2.0 * term_sqrt);
        *vel_m_s = (R / 1000.0) * term_v; /* multiplied by omega externally */
    }
    if (acc_m_s2) {
        double term_a = cos_th + lambda * cos(2.0 * theta_rad);
        *acc_m_s2 = (R / 1000.0) * term_a; /* multiplied by omega^2 externally */
    }
}

void v12_engine_calculate_fead_belts(v12_engine_state_t* engine) {
    if (!engine) return;

    double omega = (engine->rpm * 2.0 * M_PI) / 60.0;
    double r_crank_m = (FEAD_PULLEY_CRANK_MM / 2.0) / 1000.0; /* 0.085 m */
    double v_belt = omega * r_crank_m;
    engine->belt_speed_m_s = v_belt;

    /* Euler-Eytelwein centrifugal relief: m' * v^2 */
    double mv2 = FEAD_BELT_MASS_PER_M_KG * v_belt * v_belt;
    engine->centrifugal_tension_n = mv2;

    /* Auxiliary absorbed power (Water pump + Alternator + AC + Friction) */
    double rpm_norm = engine->rpm / 1000.0;
    double p_wp = 0.12 * pow(rpm_norm, 2.7);
    double p_alt = 0.45 * (1.0 + 0.15 * rpm_norm);
    double p_ac = 0.85 * (1.0 + 0.05 * rpm_norm);
    double p_fric = 0.15 * rpm_norm;
    double p_total_kw = p_wp + p_alt + p_ac + p_fric;
    engine->fead_aux_power_kw = p_total_kw;

    /* Effective belt driving force F_drive = P / v */
    double f_drive = (v_belt > 0.5) ? ((p_total_kw * 1000.0) / v_belt) : 50.0;

    /* Euler-Eytelwein tension distribution around tight alternator wrap (88 deg = 1.536 rad) */
    double wrap_rad = (88.0 * M_PI) / 180.0;
    double e_mutheta = exp(FEAD_MU_PRIME * wrap_rad); /* e^(1.023 * 1.536) ≈ 4.81 */

    /* T1 - T2 = F_drive; (T1 - mv2) / (T2 - mv2) <= e^(mu'*theta) */
    double t2_slack = FEAD_STATIC_TENSION_N - (f_drive / 2.0) + (mv2 * 0.4);
    if (t2_slack < mv2 + 80.0) t2_slack = mv2 + 80.0; /* Prevent belt flap */
    double t1_tight = t2_slack + f_drive;

    engine->tight_side_tension_n = t1_tight;
    engine->slack_side_tension_n = t2_slack;
    
    double eff_t1 = (t1_tight - mv2 > 1.0) ? (t1_tight - mv2) : 1.0;
    double eff_t2 = (t2_slack - mv2 > 1.0) ? (t2_slack - mv2) : 1.0;
    engine->tension_ratio = eff_t1 / eff_t2;
    engine->fead_reserve_capacity = (e_mutheta - engine->tension_ratio) / e_mutheta * 100.0;
}

void v12_engine_step(v12_engine_state_t* engine, double dt_sec, double target_rpm, double target_throttle) {
    if (!engine) return;

    /* Slewing engine state toward targets */
    double rpm_filter = 1.0 - exp(-dt_sec * 5.0);
    engine->rpm += (target_rpm - engine->rpm) * rpm_filter;
    engine->throttle += (target_throttle - engine->throttle) * rpm_filter;
    engine->simulation_time_sec += dt_sec;

    double omega = (engine->rpm * 2.0 * M_PI) / 60.0;
    double master_crank_angle_deg = fmod(engine->simulation_time_sec * (engine->rpm * 6.0), 720.0);

    /* Twin turbo boost curve: max 0.8 bar gauge */
    double boost_target = (engine->throttle > 0.25) ? (0.80 * pow(engine->throttle, 1.4) * (engine->rpm / 5250.0)) : 0.0;
    if (boost_target > 0.80) boost_target = 0.80;
    engine->boost_pressure_bar = boost_target;

    /* Prof. V. Ganesan FMEP estimation: Chen-Flynn model */
    double mean_piston_speed = 2.0 * (V12_STROKE_MM / 1000.0) * (engine->rpm / 60.0);
    double fmep = 0.45 + 0.08 * mean_piston_speed + 0.005 * (mean_piston_speed * mean_piston_speed);
    engine->fmep_bar = fmep;

    double sum_indicated_torque = 0.0;

    for (int i = 0; i < V12_CYLINDER_COUNT; i++) {
        cylinder_state_t* cyl = &engine->cylinders[i];
        double cyl_angle_deg = fmod(master_crank_angle_deg + engine->firing_offsets_deg[i], 720.0);
        double theta_rad = (cyl_angle_deg * M_PI) / 180.0;
        cyl->crank_angle_rad = theta_rad;

        /* Kinematics */
        double s_mm, v_norm, a_norm, v_cc;
        v12_engine_get_cylinder_kinematics(theta_rad, &s_mm, &v_norm, &a_norm, &v_cc);
        cyl->piston_pos_mm = s_mm;
        cyl->piston_vel_m_s = v_norm * omega;
        cyl->piston_acc_m_s2 = a_norm * omega * omega;
        cyl->cylinder_vol_cc = v_cc;

        /* Determine 4-stroke phase */
        if (cyl_angle_deg < 180.0) cyl->stroke_phase = 2;      /* Power (0-180) */
        else if (cyl_angle_deg < 360.0) cyl->stroke_phase = 3; /* Exhaust (180-360) */
        else if (cyl_angle_deg < 540.0) cyl->stroke_phase = 0; /* Intake (360-540) */
        else cyl->stroke_phase = 1;                            /* Compression (540-720) */

        /* Thermodynamic pressure modeling (Polytropic expansion/compression) */
        double map_abs = 1.0 + engine->boost_pressure_bar;
        double p_gas = 1.0;
        double t_gas = 300.0;

        if (cyl->stroke_phase == 1) { /* Compression */
            double progress = (cyl_angle_deg - 540.0) / 180.0;
            p_gas = map_abs * pow(1.0 + 9.0 * progress, 1.32);
            t_gas = 320.0 * pow(1.0 + 9.0 * progress, 0.32);
        } else if (cyl->stroke_phase == 2) { /* Power */
            double peak_p = map_abs * 16.5 * (0.6 + 0.4 * engine->throttle);
            double progress = (cyl_angle_deg) / 180.0;
            p_gas = peak_p * exp(-2.8 * progress) + map_abs;
            t_gas = 1850.0 * exp(-1.2 * progress) + 400.0;
        } else if (cyl->stroke_phase == 3) { /* Exhaust */
            p_gas = 1.25 + 0.15 * engine->boost_pressure_bar;
            t_gas = 750.0;
        } else { /* Intake */
            p_gas = map_abs;
            t_gas = 315.0;
        }

        cyl->pressure_bar = p_gas;
        cyl->temperature_k = t_gas;

        /* Piston force and tangential crank torque contribution */
        double piston_area_m2 = (M_PI / 4.0) * (V12_BORE_MM / 1000.0) * (V12_BORE_MM / 1000.0);
        double f_gas_n = (p_gas - 1.0) * 1e5 * piston_area_m2;
        double f_tangential = f_gas_n * (sin(theta_rad) + (V12_ROD_TO_STROKE_LAMBDA * sin(2.0 * theta_rad)) / 2.0);
        double cyl_torque = f_tangential * (V12_CRANK_RADIUS_MM / 1000.0);
        if (cyl_torque > 0.0) sum_indicated_torque += cyl_torque;
    }

    engine->total_indicated_torque = sum_indicated_torque;
    double friction_torque = (engine->fmep_bar * 1e5 * (V12_DISPLACEMENT_CC * 1e-6)) / (4.0 * M_PI);
    double net_brake_torque = engine->total_indicated_torque - friction_torque;
    if (net_brake_torque < 0.0) net_brake_torque = 0.0;

    /* Cap to Rolls-Royce rated limit: 900 N*m */
    if (net_brake_torque > 900.0) net_brake_torque = 900.0;
    engine->total_brake_torque = net_brake_torque;

    /* Brake Power: P = 2 * pi * N * tau / 60,000 [kW] */
    engine->brake_power_kw = (2.0 * M_PI * engine->rpm * engine->total_brake_torque) / 60000.0;
    engine->brake_power_bhp = engine->brake_power_kw * 1.34102;

    /* BMEP = (2 * pi * n_R * tau) / Vd */
    engine->bmep_bar = (4.0 * M_PI * engine->total_brake_torque) / (V12_DISPLACEMENT_CC * 1e-6 * 1e5);
    engine->imep_bar = engine->bmep_bar + engine->fmep_bar;
    engine->mechanical_efficiency = (engine->imep_bar > 0.1) ? (engine->bmep_bar / engine->imep_bar) : 0.85;

    /* BSFC sweet spot: 218 g/kWh */
    engine->bsfc_g_kwh = 218.0 + 35.0 * pow((engine->rpm - 2200.0) / 3000.0, 2.0);

    /* FEAD Auxiliary drive */
    v12_engine_calculate_fead_belts(engine);

    /* NVH and Acoustics */
    engine->vibration_accel_m_s2 = 0.005 + 0.003 * (engine->rpm / 5000.0);
    engine->sound_spl_dba = 36.0 + 4.5 * (engine->rpm / 5250.0) * (0.8 + 0.2 * engine->throttle);
}
