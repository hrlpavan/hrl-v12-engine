# HRL x Rolls-Royce Bespoke 6¾ Litre Twin-Turbo V12
### Interactive 3D WebGL CAD, Kinematic & Thermodynamics Simulation Platform
*Grounded in the Engineering Principles of Prof. V. Ganesan, "Internal Combustion Engines" (4th Edition), IIT Madras / McGraw-Hill*

[![Three.js](https://img.shields.io/badge/Three.js-r186-0071e3.svg?style=flat-square&logo=three.js)](https://threejs.org/)
[![Vite](https://img.shields.io/badge/Vite-8.x-646cff.svg?style=flat-square&logo=vite)](https://vitejs.dev/)
[![Web Audio](https://img.shields.io/badge/Web_Audio-API-ff453a.svg?style=flat-square)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
[![Design](https://img.shields.io/badge/Design-Apple_Pro_System-86868b.svg?style=flat-square)](https://www.apple.com)
[![Thermodynamics](https://img.shields.io/badge/Thermodynamics-Prof._V._Ganesan_IC_Engines-34c759.svg?style=flat-square)](https://www.mheducation.co.in)
[![License: MIT](https://img.shields.io/badge/License-MIT-30d158.svg?style=flat-square)](./LICENSE)

---

## 1. Executive Summary & Vision

The **HRL x Rolls-Royce Bespoke 6¾ Litre Twin-Turbo V12 Interactive Platform** is a laboratory-grade, open-source 3D digital twin and engineering simulation of a bespoke 60° twin-turbocharged V12 internal combustion powertrain. Designed by **Pavan Kumar Sadashiv** under the **HRL International** open-source engineering initiative, this simulation combines:

1. **Photorealistic Three.js / WebGL CAD Visualization**: Complete physical articulation of 12 articulated pistons, H-beam connecting rods, 6-throw balanced crankshaft, 48 poppet valves with dynamic compressing helical springs, quad overhead camshafts, 350-bar GDI rails, twin intercooled turbochargers, and catalytic downpipes.
2. **Prof. V. Ganesan Thermodynamic Engine**: Analytical air-standard and fuel-air cycle models, Atkinson continuous late-intake valve closing (LIVC), toroidal squish chamber combustion, swirl control valve (SCV) helical flow, liquid-cooled exhaust gas recirculation (EGR), Morse multi-cylinder cut tests, and tailpipe emission kinetics.
3. **Procedural Web Audio Acoustic Synthesizer**: Zero-sample, real-time procedural physical sound synthesis modeling 6 fundamental firing pulses per crank revolution, harmonic baritone collector resonance, turbo spool whistle, and blow-off valve flutter.
4. **Apple Pro Glassmorphic HUD**: Fluid telemetry with 9 specialized analytical panes, real-time P-V indicator curves, BSFC performance maps, Sankey heat balances, and the iconic **Sir Henry Royce 1906 Coin Balance Test**.

---

## 2. Engineering Specifications Matrix

| Parameter | Goodwood Bespoke V12 Specification | Ganesan High-Efficiency Atkinson Mode |
| :--- | :--- | :--- |
| **Engine Architecture** | 60° Included V-Angle, 12 Cylinders | 60° Included V-Angle, 12 Cylinders |
| **Total Displacement** | **6,749 cc (6¾ Litres)** | **6,749 cc (6¾ Litres)** |
| **Bore x Stroke** | 89.0 mm x 90.4 mm (Undersquare $L/d = 1.016$) | 89.0 mm x 90.4 mm |
| **Connecting Rod Length** | 162.0 mm (Rod-to-Crank Ratio $\lambda = 3.584$) | 162.0 mm |
| **Compression Ratio** | $10.0 : 1$ (Geometric Otto) | $r_{	ext{eff}} = 10.2 : 1$, Expansion $e = 13.5 : 1$ |
| **Air-Standard Efficiency** | $\eta_{	ext{otto}} = 60.19\%$ (Ganesan Eq. 2.26) | $\eta_{	ext{atkinson}} = 63.00\%$ (Ganesan Eq. 2.73) |
| **Valvetrain** | Quad-Cam DOHC, 48 Valves (4 Valves/Cylinder) | Dual VVA with Late Intake Valve Closing (600° LIVC) |
| **Fuel Delivery** | Twin Rail Direct Injection (350 bar) | Stratified Ultra-Lean Burn ($\lambda = 1.43$, A/F 20.9:1) |
| **Induction & Boost** | Parallel Twin Turbochargers (1.62 bar abs) | Twin-Turbo + Helical Swirl Control Valves (SCV) |
| **Combustion Chamber** | Pent-Roof Chamber with Central Spark | Toroidal Squish Donut Bowl (70% Quench Land) |
| **Peak Torque / Power** | 900 Nm @ 1,600 RPM / 420 kW (563 hp) | 760 Nm @ 1,600 RPM / 365 kW |
| **Cruising Fuel Economy** | 11.9 km/L (28.0 US MPG) | **14.8 km/L (34.8 US MPG, +24.0% Fuel Saved)** |
| **Firing Order** | 1 - 12 - 5 - 8 - 3 - 10 - 6 - 7 - 2 - 11 - 4 - 9 | 1 - 12 - 5 - 8 - 3 - 10 - 6 - 7 - 2 - 11 - 4 - 9 |

---

## 3. Grounding in Prof. V. Ganesan "IC Engines" (4th Edition)

Every mathematical model and 3D geometric subsystem directly adheres to the formulations authored by **Prof. V. Ganesan (IIT Madras)**:

### 1. Extended Expansion Atkinson Cycle (Ganesan Sec. 2.10, Eq. 2.73, pp. 65-66)
- The application implements Late Intake Valve Closing (LIVC), delaying intake valve seal from 580° into the compression stroke to 600°.
- The expansion ratio ($e = 13.5:1$) exceeds the effective compression ratio ($r = 10.2:1$), utilizing additional work energy that would otherwise be discarded as exhaust heat:
$$\eta_{	ext{atkinson}} = 1 - \gamma rac{e - r}{e^\gamma - r^\gamma} = 63.00\%$$
- Compared to the standard Otto cycle ($60.19\%$), this yields a **+2.81% absolute thermodynamic efficiency leap**.

### 2. Toroidal Squish Combustion Bowl (Ganesan Sec. 11.18.1, Fig. 11.19d & Sec. 20.6)
- The piston crown geometry models a precision annular squish quench land covering **70% of the cylinder bore area**.
- As the piston approaches TDC, gas trapped in the annular margin is squirted radially inward at high velocity into a recessed toroidal bowl cavity, generating a vertical smoke-ring vortex.
- A central conical pip prevents wall wetting and guides fuel spray from the 350-bar piezoelectric direct injector directly toward the spark plug gap.

### 3. Dual-Path Intake Runners & Swirl Control Valves (Ganesan Sec. 20.8.6, Fig. 20.10)
- Each cylinder features dual intake ports: a primary helical swirl port and a secondary straight port.
- An electronic servo-actuated operating spindle controls 12 butterfly flaps. At low-load and cruising conditions, the secondary flaps close completely, forcing all intake air through the tangential helical port to accelerate charge swirl and prevent lean misfires down to $\phi = 0.70$.

### 4. Liquid-Cooled Exhaust Gas Recirculation (EGR) (Ganesan Sec. 14.18)
- A dedicated 3D stainless steel heat exchanger mounted in the engine valley cools inert exhaust gas to 330 K before reintroduction into the intake plenum.
- Recirculated exhaust acts as a thermal sink, reducing peak combustion temperatures below the 1,800 K Zeldovich threshold and cutting raw engine-out $	ext{NO}_x$ emissions by over **68%**.

### 5. Variable Valve Actuation (VVA) Unthrottled Load Control (Ganesan Sec. 20.7.5)
- Throttling losses are eliminated by utilizing intake valve duration and lift variation to regulate inducted mass airflow, converting traditional negative intake pumping loops into positive energy scavenging under boost ($\Delta W_{	ext{pumping}} > 0$).

### 6. Low-Friction Slipper Skirt & Hydrodynamic Lubrication (Ganesan Sec. 12.6.1 & 12.9)
- Modeled with shortened slipper skirts and graphite friction-reducing coatings, reducing piston friction mean effective pressure ($fmep$) to maintain a **92.4% mechanical efficiency** ($\eta_m$).
- Sommerfeld number analysis ($S = 0.042$) verifies stable thick-film hydrodynamic bearing lubrication across all 7 main crank journals.

### 7. Inlet-Valve Mach Index Sonic Choking Control (Ganesan Sec. 1.3.4, Eq. 1.25)
- Inlet valve Mach index ($Z$) is continuously tracked:
$$Z = \left(rac{d}{D_i}ight)^2 rac{V_p}{C_i \cdot a}$$
- At 1,600 RPM cruising speed, $Z = 0.178 \le 0.55$, ensuring zero sonic choking across intake ports and optimal volumetric efficiency ($\eta_v = 94.2\%$).

---

## 4. Laboratory-Grade Telemetry HUD

The analytical inspector provides 9 real-time instrumentation tabs:

1. **Cyl (Cylinder Inspector)**: Active phase, crank angle from TDC, chamber pressure ($P$), instantaneous gas temperature ($K$), mean piston speed, equivalence ratio ($\phi$), and mass flows.
2. **Motion (Kinematics)**: Slider-crank analytical displacement $s(	heta)$, velocity $v(	heta)$, and acceleration $a(	heta)$ coupled with a 60° polar crankshaft end-view vector display.
3. **P-V (Indicator Loop)**: Dynamic $P$-$V$ curve comparing real-time in-cylinder pressure against theoretical air-standard Otto ($60.2\%$) and Atkinson ($63.0\%$) cycles with positive boost pumping loop shading.
4. **Heat (Sankey Balance)**: Real-time energy distribution between Brake Power ($32.8\%$), Cooling Jacket ($28.2\%$), Exhaust Gas ($33.6\%$), and Radiation ($5.4\%$).
5. **Map (BSFC Performance)**: Speed vs. BMEP contours featuring the high-efficiency **198 g/kWh Atkinson Eco Island** and live operating crosshair.
6. **Valves (Timing & Mach)**: 720° lift curves, late intake closing markers, overlap region, and live Mach index $Z$ choking status.
7. **Dyno (Power & Torque)**: Automated wide-open throttle dyno sweep from 600 to 6,000 RPM displaying the 900 Nm tidal plateau.
8. **Emiss (Catalytic Kinetics)**: Pre-catalyst vs. tailpipe $	ext{NO}_x$, $	ext{CO}$, and $	ext{HC}$ concentrations with 3-way catalytic converter light-off status ($> 280^\circ	ext{C}$).
9. **Eco (Ganesan Efficiency)**: Hero real-world mileage dashboard (km/L, US MPG, UK Imperial MPG, L/100km, % fuel saved) with interactive Ganesan verification cards.

---

## 5. Procedural Web Audio Engine

- **Zero External Audio Samples**: Completely synthesized using the Web Audio API.
- **Harmonic Firing Synthesis**: 6 power pulses per crank revolution ($f_0 = 	ext{RPM} / 10	ext{ Hz}$).
- **V12 Baritone Collector Resonance**: Peaking bandpass filter sweeps from 180 Hz to 950 Hz, capturing the authoritative Goodwood exhaust baritone.
- **Twin Turbocharger Whistle & BOV Flutter**: Bandpass-filtered whistle scaling smoothly above 1,100 RPM, transitioning into multi-pulse blow-off valve flutter upon throttle lift-off.

---

## 6. Quickstart & Local Setup

### Prerequisites
- Node.js (v18.0.0 or higher recommended)
- Modern WebGL2-compatible browser (Chrome, Safari, Firefox, Edge)

### Installation
```bash
# Clone the repository
git clone https://github.com/hrlpavan/hrl-x-rolls-royce.git
cd hrl-x-rolls-royce

# Install dependencies
npm install

# Start local development server
npm run dev
```

Open your browser to **`http://localhost:5173`**.

### Building for Production
```bash
npm run build
npm run preview
```

---

## 7. Keyboard Shortcuts

| Key | Action |
| :--- | :--- |
| **`Space`** | Toggle Engine Play / Pause |
| **`E`** | Toggle Ganesan Atkinson & Stratified Lean Burn Eco Mode |
| **`D`** | Trigger Automated Dyno Pull Sweep (600 to 6,000 RPM) |
| **`I`** | Toggle 3D Raycasting Part Inspector |
| **`H`** | Toggle Zen Mode (Full 3D Engine Focus / Hide HUD) |
| **`T`** | Toggle Theme Mode (Daylight White / Dark Starlight) |
| **`M`** | Toggle Procedural Web Audio Mute / Unmute |
| **`←` / `→`** | Step Crank Angle by $\pm 15^\circ$ |

---

## 8. Open Source Ecosystem Charter & Public Usage Notice

> **IMPORTANT LEGAL & USAGE NOTICE**
> 
> * **100% Open Source**: This software is released under the **MIT License**. You are free to adopt, modify, integrate, inspect, and deploy this codebase for academic research, education, computational engineering, and commercial software projects without restriction.
> * **Attribution & Educational Intent**: This project represents an independent engineering research simulation grounded in the academic publications of Prof. V. Ganesan (*Internal Combustion Engines*, McGraw-Hill) and public historical engineering literature regarding 60° V12 engine architecture.
> * **Trademark Notice**: Rolls-Royce and any related corporate marks are trademarks of their respective owners. Their mention in this repository refers solely to historical architectural compatibility and engineering design principles, and does not imply official partnership, sponsorship, or corporate affiliation.

---

*Architected and maintained by **Pavan Kumar Sadashiv** • Mangaluru, Karnataka, India*  
*Founder & Managing Director, **HRL International Private Limited***
