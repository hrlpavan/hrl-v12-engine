# Master Technical Manifesto: Rolls-Royce 6.75L Twin-Turbo V12 Acoustic Physics Engine
## Unified Synthesis of Fluid Mechanics, Gas Dynamics, Duct Acoustics & Powertrain Refinement

---

### 1. Executive Summary & Physics Architecture

This manifesto establishes the complete physical and mathematical foundation for synthesizing the authentic, whisper-quiet acoustic signature of the **Rolls-Royce 6.75-litre Twin-Turbo 60° V12** engine.

Unlike generic racing engine audio engines that rely on simple synthetic sawtooth waves or looped wav samples, this acoustic engine calculates the sound in real time from **first-principles fluid mechanics**:
1. **Heywood Isentropic Valve Orifice Model**: Computes the high-pressure gas blowdown pulse upon exhaust valve opening (EVO).
2. **Benson & Winterbone 1D Wave Characteristics**: Superimposes the 12 cylinder blowdown pulses phased at exact $60^\circ$ firing intervals into a 6-into-1 tuned collector.
3. **Harrison Turbocharger Turbine Damping**: Models the acoustic low-pass filtering of the twin-scroll turbine wheels and compressor blade-pass whistle ($f_{\text{BPF}}$).
4. **Munjal Transfer Matrix Method (TMM) Silencer**: Computes the real-time four-pole transmission loss ($TL(f)$) across dual Helmholtz cancellation chambers and active exhaust bypass valves.
5. **White Viscous Boundary Layer & Structural Radiation**: Incorporates pipe wall viscous shear loss and deep-skirt aluminum block structural attenuation.

---

### 2. The 5-Layer Fluid-Dynamic Sound Synthesis Pipeline

```
+--------------------------------------------------------------------------------------------------+
| LAYER 1: Cylinder Blowdown Pulse Generator (Heywood Ch. 6)                                       |
| - Sonic/Subsonic isentropic orifice flow: m_dot(t) = Cd * Av(theta) * P_cyl * sqrt(gamma/RT)    |
| - Non-linear pressure wave pulse with rapid pressure-rise front                                  |
+--------------------------------------------------------------------------------------------------+
                                                |
                                                v
+--------------------------------------------------------------------------------------------------+
| LAYER 2: 12-Cylinder Manifold Superposition (Benson & Winterbone Vol. I)                         |
| - 12 cylinders firing every 60 deg crank rotation (Firing Order 1-7-5-11-3-9-6-12-2-8-4-10)       |
| - Fundamental 6th Engine Order: f_6 = N / 10 Hz (60 Hz at 600 RPM, 600 Hz at 6000 RPM)          |
| - Coherent harmonic sum of 6th, 12th, 18th, 24th, 30th, 36th acoustic orders                     |
+--------------------------------------------------------------------------------------------------+
                                                |
                                                v
+--------------------------------------------------------------------------------------------------+
| LAYER 3: Twin-Scroll Turbocharger Acoustic Stage (Harrison Ch. 4 / Baart)                        |
| - Turbine wheel low-pass damping: Cutoff ~ 650 Hz (absorbs sharp combustion spikes)              |
| - Twin compressor Blade Pass Frequency (BPF) whistle: f_BPF = Z_blades * N_turbo / 60            |
+--------------------------------------------------------------------------------------------------+
                                                |
                                                v
+--------------------------------------------------------------------------------------------------+
| LAYER 4: Munjal 4-Pole Exhaust Silencer & Helmholtz Resonator (Munjal Ch. 3 & 5)                 |
| - Dual Helmholtz side-branch resonators canceling 6th order boom (60 Hz) and 12th order (120 Hz) |
| - Active Exhaust Valve Modes:                                                                    |
|   * Quiet Luxury Mode: Valves closed -> TL >= 34 dB, whisper-quiet cabin (< 38 dBA)              |
|   * Dynamic Cruise Mode: Valves open -> TL ~ 16 dB, velvety baritone purr                        |
+--------------------------------------------------------------------------------------------------+
                                                |
                                                v
+--------------------------------------------------------------------------------------------------+
| LAYER 5: Viscous Duct Dissipation & Block Structural Attenuation (White Ch. 6 / Harrison Ch. 5)  |
| - High-frequency boundary layer shear dissipation: alpha_tube ~ sqrt(omega * nu / 2) / (D * c)   |
| - AlSi7Mg0.3 cylinder block structural isolation (> 30 dB attenuation above 1.5 kHz)             |
| - Precision mechanical clicking (hydraulic tappets + timing chain meshing)                       |
+--------------------------------------------------------------------------------------------------+
                                                |
                                                v
                                      [ Physical Audio Output ]
```

---

### 3. Exact Mathematical Equations for Sound Synthesis

#### 3.1 Harmonic Order Frequencies & Firing Intervals
For an engine running at $N\text{ RPM}$ with crankshaft angular velocity $\omega = \frac{2\pi N}{60}\text{ rad/s}$:
- Firing interval: $\Delta t_{\text{fire}} = \frac{720^\circ}{12 \cdot 6 N} = \frac{10}{N}\text{ seconds}$
- Order $k$ frequency: $f_k = k \times \left( \frac{N}{60} \right)\text{ Hz}$
- The dominant acoustic orders are integer multiples of 6:
  - **Order 6** ($k=6$): $f_6 = \frac{N}{10}\text{ Hz}$ (Fundamental 6-pulse combustion note)
  - **Order 12** ($k=12$): $f_{12} = \frac{N}{5}\text{ Hz}$ (First overtone, velvety resonance)
  - **Order 18** ($k=18$): $f_{18} = \frac{3N}{10}\text{ Hz}$ (Second overtone)
  - **Order 24** ($k=24$): $f_{24} = \frac{2N}{5}\text{ Hz}$ (High-frequency baritone sheen)

#### 3.2 Dynamic Harmonic Amplitudes
The pressure amplitude of order $k$ is determined by the Fourier decomposition of the blowdown pulse train:
$$A_k(N) = A_{k,\text{base}} \cdot \left[ 1 + \chi_k \left( \frac{N}{6000} \right)^{\beta_k} \right] \cdot 10^{-\frac{TL(f_k)}{20}}$$
Where:
- $TL(f)$ is the Munjal Transmission Loss in decibels at frequency $f$.
- In **Quiet Luxury Mode**, $TL(f_6) \ge 34\text{ dB}$, attenuating the fundamental idle boom and leaving only a whisper.
- In **Dynamic Cruise Mode**, $TL(f_6) \approx 16\text{ dB}$, allowing the resonant 60° V12 timbre to be enjoyed.

#### 3.3 Turbocharger Compressor Whistle
$$f_{\text{spool}} = 850 + \left( \frac{N - 900}{5100} \right) \cdot 1,550\text{ Hz}$$
$$Gain_{\text{spool}} = \max\left(0, \frac{N - 1000}{5000}\right) \times 0.14$$

---

### 4. Cross-Reference Index

| Reference Code | Author | Book Title | Chapters |
|---|---|---|---|
| `REF-01-HEYWOOD` | John B. Heywood | *Internal Combustion Engine Fundamentals* | Ch. 6, 7, 13 |
| `REF-02-BENSON` | Rowland S. Benson | *Gas Dynamics of IC Engines (Vols. I & II)* | Ch. 2, 3, 7 |
| `REF-03-MUNJAL` | M. L. Munjal | *Acoustics of Ducts and Mufflers (2nd Ed.)* | Ch. 2, 3, 4, 5 |
| `REF-04-WHITE` | Frank M. White | *Fluid Mechanics (8th Ed.)* | Ch. 6, 9 |
| `REF-05-HARRISON` | Matthew Harrison | *Vehicle Refinement: Controlling NVH* | Ch. 4, 5 |
