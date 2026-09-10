# Technical Reference 01: Engine Gas Dynamics & Exhaust Blowdown Acoustics
## Source: *Internal Combustion Engine Fundamentals* — Prof. John B. Heywood (McGraw-Hill)

---

### 1. Thermodynamic Overview of the Exhaust Blowdown Process (Heywood Section 6.5 & 6.6)

In an internal combustion engine, the exhaust event is divided into two distinct thermodynamic regimes:
1. **The Blowdown Phase**: Commencing the instant the exhaust valve cracks off its seat prior to Bottom Dead Center (EVO, typically $50^\circ\text{--}60^\circ$ BBDC in the Rolls-Royce 6.75L V12). During blowdown, cylinder pressure $p_{\text{cyl}}$ is significantly higher than exhaust manifold pressure $p_{\text{man}}$ ($p_{\text{cyl}} \approx 4.5\text{--}7.5\text{ bar}$, $p_{\text{man}} \approx 1.1\text{--}1.8\text{ bar}$). This large pressure differential accelerates exhaust gas through the opening valve seat curtain at sonic (choked) or near-sonic velocity, launching an intense, steep-fronted acoustic compression pulse down the exhaust runner.
2. **The Displacement Phase**: Following BDC, the piston rises during the exhaust stroke, mechanically displacing the remaining burned gases at low Mach number ($M < 0.25$) into the manifold.

The acoustic signature of the engine is predominantly governed by the **rate of change of mass flow rate during the blowdown phase** ($\frac{d\dot{m}}{dt}$).

---

### 2. Isentropic Compressible Orifice Flow Model (Heywood Eq. 6.1 – 6.18)

The exhaust valve and seat geometry is modeled as a converging orifice with instantaneous geometric area $A_v(\theta)$ and discharge coefficient $C_d(\theta)$.

#### 2.1 Effective Flow Area ($A_E$)
$$A_E(\theta) = C_d(L_v) \cdot A_v(L_v)$$
Where:
- $L_v(\theta)$ is the instantaneous valve lift as a function of crank angle $\theta$.
- For low lift ($L_v / D_v < 0.125$), flow is governed by the truncated conical curtain:
  $$A_v = \pi D_v L_v \cos \beta$$
  where $D_v$ is the valve head seat diameter ($35.5\text{ mm}$ for Rolls-Royce V12 exhaust) and $\beta$ is the valve seat angle ($45^\circ$).
- For intermediate lift ($0.125 \le L_v / D_v < 0.25$):
  $$A_v = \pi (D_v - L_v \sin \beta \cos \beta) L_v \cos \beta$$
- For high lift ($L_v / D_v \ge 0.25$):
  $$A_v = \frac{\pi}{4} \left(D_p^2 - D_s^2\right)$$
  where $D_p$ is the port throat diameter and $D_s$ is the valve stem diameter ($6.0\text{ mm}$).

#### 2.2 Critical Pressure Ratio for Choking
For combustion gas with specific heat ratio $\gamma \approx 1.33$ and gas constant $R_g = 287.1\text{ J/(kg}\cdot\text{K)}$:
$$\Pi_{\text{crit}} = \left( \frac{p_{\text{crit}}}{p_0} \right) = \left( \frac{2}{\gamma + 1} \right)^{\frac{\gamma}{\gamma - 1}} = \left( \frac{2}{2.33} \right)^{\frac{1.33}{0.33}} \approx 0.540$$

#### 2.3 Instantaneous Mass Flow Rate ($\dot{m}$)
* **Choked Regime** ($\frac{p_{\text{man}}}{p_{\text{cyl}}} \le \Pi_{\text{crit}} \approx 0.540$):
  $$\dot{m}_{\text{blowdown}}(t) = A_E(\theta) \cdot p_{\text{cyl}}(t) \cdot \sqrt{\frac{\gamma}{R_g T_{\text{cyl}}(t)}} \left( \frac{2}{\gamma + 1} \right)^{\frac{\gamma + 1}{2(\gamma - 1)}}$$
  The gas velocity at the valve throat equals the local speed of sound:
  $$u_{\text{throat}} = a^* = \sqrt{\frac{2\gamma}{\gamma + 1} R_g T_{\text{cyl}}}$$

* **Subcritical Regime** ($\frac{p_{\text{man}}}{p_{\text{cyl}}} > \Pi_{\text{crit}}$):
  $$\dot{m}_{\text{blowdown}}(t) = A_E(\theta) \cdot p_{\text{cyl}}(t) \cdot \sqrt{\frac{2\gamma}{(\gamma - 1) R_g T_{\text{cyl}}(t)} \left[ \left(\frac{p_{\text{man}}}{p_{\text{cyl}}}\right)^{\frac{2}{\gamma}} - \left(\frac{p_{\text{man}}}{p_{\text{cyl}}}\right)^{\frac{\gamma + 1}{\gamma}} \right]}$$

---

### 3. Acoustic Wave Generation by Mass Injection into a Duct

According to Lighthill's acoustic analogy and Heywood's duct inlet acoustic boundary:
A time-varying mass flow injected into an exhaust runner of cross-sectional area $A_p$ generates an acoustic pressure pulse $p'(t)$:
$$p'(t) = \frac{a_0}{A_p} \cdot \dot{m}(t) + \frac{\gamma - 1}{a_0} \cdot \dot{Q}(t)$$
Where:
- $a_0$ is the speed of sound in the hot exhaust gas:
  $$a_0 = \sqrt{\gamma R_g T_{\text{exh}}} \approx \sqrt{1.33 \cdot 287.1 \cdot (750 + 273.15)} \approx 625\text{ m/s}$$
- The sound pressure at distance $r$ from an open pipe termination is proportional to the first derivative of mass flow rate:
  $$p_{\text{acoustic}}(r, t) = \frac{\rho_0}{4\pi r} \frac{d\dot{m}}{dt} \left( t - \frac{r}{a_0} \right)$$
- Because the exhaust valve opens rapidly under camshaft actuation, $\frac{d\dot{m}}{dt}$ features a steep positive spike of duration $\sim 2\text{--}4\text{ ms}$, creating the rich harmonic spectrum characteristic of high-performance internal combustion engines.

---

### 4. Rolls-Royce 6.75L V12 Specific Engine Data for Sound Synthesis

| Parameter | Notation | Value | Units |
|---|---|---|---|
| Number of Cylinders | $n_{\text{cyl}}$ | 12 | — |
| V-Angle | $\theta_V$ | 60 | degrees |
| Cylinder Bore | $B$ | 90.4 | mm |
| Piston Stroke | $S$ | 88.3 | mm |
| Engine Displacement | $V_d$ | 6,749 | cc |
| Compression Ratio | $r_c$ | 10.0:1 | — |
| Exhaust Valve Diameter | $D_v$ | 35.5 | mm (2 per cyl) |
| Max Exhaust Valve Lift | $L_{v,\text{max}}$ | 10.5 | mm |
| Exhaust Valve Opening (EVO) | $\theta_{\text{EVO}}$ | 54 | deg BBDC |
| Exhaust Gas Temperature | $T_{\text{exh}}$ | 1,023 | K ($750^\circ\text{C}$) |
| Speed of Sound in Exhaust | $a_{\text{exh}}$ | 625 | m/s |
| Fundamental Firing Frequency | $f_0$ | $N / 10$ | Hz (6 pulses/rev) |
