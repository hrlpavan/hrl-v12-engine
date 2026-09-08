# 🏎️ HRL V12 Engine Project | 60° Quad-Cam 48V Interactive 3D Simulation

[![Three.js](https://img.shields.io/badge/Three.js-r186-00e5ff.svg?style=flat-square&logo=three.js)](https://threejs.org/)
[![Vite](https://img.shields.io/badge/Vite-6.x-646cff.svg?style=flat-square&logo=vite)](https://vitejs.dev/)
[![Web Audio](https://img.shields.io/badge/Web_Audio-API-ff3b30.svg?style=flat-square)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](./LICENSE)
[![Engine: V12](https://img.shields.io/badge/Engine-6.5L_60°_V12-ff9500.svg?style=flat-square)]()

A state-of-the-art interactive 3D WebGL engineering simulation of a **60° Quad-Cam 48-Valve V12 Four-Stroke Racing Engine** created for the **HRL Engineering Lab**, engineered to dramatically surpass existing engine visualizers with real-time procedural Web Audio sound synthesis, laboratory-grade telemetry, thermodynamic Otto cycle P-V indicator loops, dynamic combustion shaders, and interactive camera presets.

---

## 🌟 Highlights & Feature Matrix

| Feature | Standard V8 Visualizer | **HRL Apex V12 Engine Project** |
| :--- | :--- | :--- |
| **Engine Architecture** | 8-Cylinder 90° Cross-Plane | **12-Cylinder 60° V-Angle (Inherent Primary & Secondary Balance)** |
| **Displacement & Valvetrain** | 5.8L Pushrod / Single Cam | **6.5L Quad-Cam 48-Valve DOHC (4 Camshafts, 48 Compressing Springs)** |
| **Firing Order** | `1-8-4-3-6-5-7-2` (Every 90°) | **`1-12-5-8-3-10-6-7-2-11-4-9` (One power stroke every 60° of crank rotation)** |
| **Acoustics & Sound** | Silent | **Real-Time Procedural Web Audio Synthesizer (800 RPM idle to 9,500 RPM scream)** |
| **Combustion FX** | Static color bar | **In-Cylinder Plasma Sparks + Volumetric Combustion Fireballs + Gas Flow Streams** |
| **Kinematics** | Basic 2D slider-crank | **Live Vector Slider-Crank ($s, v, a$) + 60° Polar Crank End-View with 6 Throws** |
| **Thermodynamics** | Static line curve | **Live P-V Indicator Diagram with Real-Time Otto Cycle State Tracer & Temperature (K)** |
| **Valve Timing** | Static chart | **Interactive Lift Diagram with Overlap Zone and Drag-to-Scrub 720° crank angle control** |
| **Cutaways & Shaders** | Basic transparency | **Glass Refraction, Section Cutaway, Solid Titanium, and CAD X-Ray Hologram** |
| **Camera Presets** | 5 Presets | **7 Presets (`HERO`, `FRONT`, `SIDE`, `VALLEY`, `CYL 1`, `CRANK`, `DOHC`) + Free Orbit** |

---

## 📐 Engineering Specifications

- **Type**: 60° V-Angle Four-Stroke Internal Combustion Engine
- **Displacement**: 6.5 Liters (6,498 cc)
- **Bore $\times$ Stroke**: 88.0 mm $\times$ 89.0 mm
- **Crank Radius $r$**: 44.5 mm
- **Connecting Rod Length $L$**: 160.0 mm ($L/r \approx 3.595$)
- **Compression Ratio**: 12.5 : 1
- **Valvetrain**: DOHC (Quad-Cam), 4 valves per cylinder (48 total: 24 intake, 24 exhaust)
- **Firing Order**: `1 - 12 - 5 - 8 - 3 - 10 - 6 - 7 - 2 - 11 - 4 - 9`
- **Firing Interval**: Exactly 60° of crankshaft rotation between consecutive power strokes
- **Redline**: 9,500 RPM

---

## 🛠️ Key Subsystems

### 1. 3D Mechanical Assembly (`src/engine/scene3d.js`)
- **6-Throw Balanced Crankshaft**: 6 crankpins spaced at 120° intervals in mirrored pairs ($0^\circ, 240^\circ, 120^\circ, 120^\circ, 240^\circ, 0^\circ$), heavy counterweights, 7 main bearing journals, harmonic damper pulley, and rear flywheel with ring gear.
- **12 Articulated Connecting Rods & Pistons**: Forged H-beam rods, bronze wrist pin bushings, 88mm pistons with compression rings, articulated along $\pm 30^\circ$ cylinder bores.
- **Quad-Cam DOHC Valvetrain**: 4 overhead camshafts with 24 cam lobes per bank rotating at $1:2$ half-crank speed, 48 poppet valves, and **48 3D helical springs** that compress and expand dynamically.
- **Dynamic Combustion & Gas Flow FX**: Ignition spark arcs timed at $15^\circ$ BTDC, in-cylinder expanding fireball shaders during the power stroke, and animated cyan intake / red exhaust flow streamlines.

### 2. Procedural Web Audio V12 Engine (`src/engine/audio.js`)
- Recreates the iconic high-harmonic howl of a naturally aspirated 6.5L 60° V12:
  - 6 power pulses per revolution ($f_0 = \text{RPM} / 10\text{ Hz}$).
  - Harmonic overtones ($1f_0$, $2f_0$, $3f_0$, and subharmonic rumble).
  - WaveShaper non-linear saturation for combustion shockwave snap.
  - Peaking exhaust resonator sweeping from 750 Hz to 2,800 Hz tracking engine speed.
  - Throttle Blip button (`REV 🏎️`) for instantaneous supercar revving response.

### 3. Engineering Telemetry Suite (`src/ui/telemetry.js`)
- **Slider-Crank Kinematic Schematic**: Real-time 2D vector drawing of the crank circle, connecting rod, and piston slider with live mathematical values:
  $$s(\theta) = r\cos\theta + \sqrt{L^2 - r^2\sin^2\theta}$$
  $$v(\theta) = -r\omega\left(\sin\theta + \frac{r\sin 2\theta}{2\sqrt{L^2 - r^2\sin^2\theta}}\right)$$
  $$a(\theta) = \text{acceleration in m/s}^2$$
- **60° Crankshaft End-View**: Polar diagram with Bank 1 ($+30^\circ$) and Bank 2 ($-30^\circ$) vectors, all 6 crank throws, and active firing pin glow.
- **Valve Timing & Scrub Diagram**: Lift curves with intake/exhaust overlap; **drag across the chart to scrub the crank angle across all 720°**.
- **Thermodynamic P-V Indicator**: Dynamic Otto cycle pressure-volume loop ($0 - 90\text{ bar}$) with a live tracer tracking the in-cylinder state point.

---

## 📁 Repository Structure

```
├── index.html                 # Main application UI and viewport layout
├── style.css                  # Industrial laboratory theme styles
├── package.json               # Node dependencies & Vite scripts
├── .gitignore                 # Git ignore configuration
├── LICENSE                    # MIT License
├── README.md                  # Comprehensive engineering documentation
└── src/
    ├── main.js                # App lifecycle, animation loop, and UI binding
    ├── engine/
    │   ├── kinematics.js      # Analytical kinematics & Otto cycle thermodynamics
    │   ├── audio.js           # Procedural Web Audio V12 engine acoustics
    │   └── scene3d.js         # 3D Three.js mechanical assembly & shaders
    └── ui/
        └── telemetry.js       # 2D Canvas analytical telemetry displays
```

---

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)

### Installation
```bash
git clone https://github.com/hrlpavan/hrl-v12-engine.git
cd hrl-v12-engine
npm install
```

### Run Locally
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for Production
```bash
npm run build
npm run preview
```

---

## ⌨️ Controls & Shortcuts

| Action | Control |
| :--- | :--- |
| **Orbit / Rotate** | Left Click + Drag |
| **Zoom** | Scroll Wheel / Pinch |
| **Pan** | Right Click + Drag |
| **Play / Pause** | `Space` or Play button |
| **Step Angle** | `←` / `→` or $\pm 15^\circ$ / $+1^\circ$ buttons |
| **Toggle Audio** | `M` or Sound button |
| **Toggle HUD** | `H` key |
| **Scrub Cycle** | Drag across the **Valve Timing** chart |
| **Isolate Cylinder** | Click any pill `(1)` to `(12)` and toggle `ISOLATE` |

---

## 📜 License

Distributed under the MIT License. See [LICENSE](./LICENSE) for more information.

Developed with ❤️ by **Pavan Kumar Sadashiv (HRL Labs)**.
