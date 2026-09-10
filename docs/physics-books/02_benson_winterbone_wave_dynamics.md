# Technical Reference 02: 1D Unsteady Wave Dynamics & Manifold Superposition
## Source: *The Thermodynamics and Gas Dynamics of Internal Combustion Engines (Vols. I & II)* — Prof. Rowland S. Benson, Prof. D. E. Winterbone, Dr. P. C. Baruah (Oxford University Press)

---

### 1. Governing 1D Unsteady Compressible Flow Equations (Benson Vol. I, Ch. 2)

Gas flow in the intake and exhaust runners of an engine is inherently unsteady, one-dimensional, and non-homentropic due to friction, heat transfer, and area variations:

1. **Continuity Equation**:
   $$\frac{\partial \rho}{\partial t} + \frac{\partial (\rho u)}{\partial x} + \frac{\rho u}{A} \frac{dA}{dx} = 0$$

2. **Momentum Equation**:
   $$\frac{\partial u}{\partial t} + u \frac{\partial u}{\partial x} + \frac{1}{\rho} \frac{\partial p}{\partial x} + G = 0$$
   where $G = \frac{4f}{D} \frac{u^2}{2} \frac{u}{|u|}$ is the wall friction term.

3. **Energy Equation**:
   $$\frac{\partial p}{\partial t} + u \frac{\partial p}{\partial x} - a^2 \left( \frac{\partial \rho}{\partial t} + u \frac{\partial \rho}{\partial x} \right) - (\gamma - 1) \rho (q + u G) = 0$$
   where $q$ is the heat transfer rate per unit mass from pipe walls.

---

### 2. The Method of Characteristics (MoC) & Riemann Invariants (Benson Ch. 3)

The hyperbolic partial differential equations are transformed into ordinary differential equations along characteristic directions in the $(x, t)$ state-plane:

#### 2.1 Characteristic Directions
- **Right-traveling wave ($\text{C}_+$)**:
  $$\frac{dx}{dt} = u + a$$
- **Left-traveling wave ($\text{C}_-$)**:
  $$\frac{dx}{dt} = u - a$$
- **Path-line characteristic ($\text{C}_0$)**:
  $$\frac{dx}{dt} = u$$

#### 2.2 Generalized Riemann Variables ($\lambda, \beta$)
Defining non-dimensional speed of sound $A = a / a_{\text{ref}}$ and non-dimensional velocity $U = u / a_{\text{ref}}$:
$$\lambda = A + \frac{\gamma - 1}{2} U \quad \text{along } \text{C}_+$$
$$\beta = A - \frac{\gamma - 1}{2} U \quad \text{along } \text{C}_-$$

In homentropic flow without friction or heat transfer:
$$d\lambda = 0 \implies \lambda = \text{const} \quad \text{along } \frac{dx}{dt} = u + a$$
$$d\beta = 0 \implies \beta = \text{const} \quad \text{along } \frac{dx}{dt} = u - a$$

The physical pressure and velocity at any point $x$ and time $t$ in the exhaust pipe are reconstructed as:
$$p(x, t) = p_{\text{ref}} \left[ \frac{\lambda(x, t) + \beta(x, t)}{2} \right]^{\frac{2\gamma}{\gamma - 1}}$$
$$u(x, t) = a_{\text{ref}} \left[ \frac{\lambda(x, t) - \beta(x, t)}{\gamma - 1} \right]$$

---

### 3. Manifold Junctions & Multi-Cylinder Wave Superposition (Benson Ch. 7)

In the Rolls-Royce 60° V12 engine:
- Each bank comprises 6 cylinders connected via equal-length primary runners into a **6-into-1 tuned collector** (or twin 3-into-1 per bank) feeding the twin-scroll turbine housing.
- Firing intervals occur strictly every **$60^\circ$ of crankshaft rotation** ($720^\circ / 12 = 60^\circ$).
- Firing order: **1 – 7 – 5 – 11 – 3 – 9 – 6 – 12 – 2 – 8 – 4 – 10**
  - Right Bank (Bank 1): Cylinders 1, 2, 3, 4, 5, 6 (fired at $0^\circ, 480^\circ, 240^\circ, 600^\circ, 120^\circ, 360^\circ$).
  - Left Bank (Bank 2): Cylinders 7, 8, 9, 10, 11, 12 (fired with a precise $60^\circ$ phase offset).

#### 3.1 Superposition of Primary Runner Pulses at Collector
At the junction of $N$ runners of area $A_j$ joining into collector of area $A_c$:
$$\sum_{j=1}^{N} \dot{m}_j = \dot{m}_c$$
When a positive blowdown compression wave arrives at the collector, a reflected rarefaction (expansion) wave travels back toward closed valves, while a transmitted compression wave enters the collector.
Because firing pulses occur every $60^\circ$ ($T_{\text{pulse}} = \frac{60}{6 N} = \frac{10}{N}\text{ sec}$):
The resultant acoustic pressure $p_{\text{collector}}(t)$ is the coherent phase sum of 12 delayed blowdown wave pulses:
$$p_{\text{collector}}(t) = \sum_{k=1}^{12} p_{\text{blowdown}}\left( t - \frac{\theta_k}{\omega} - \tau_{\text{transit}} \right)$$
where $\tau_{\text{transit}} = \frac{L_{\text{runner}}}{a_{\text{exh}}}$ is the acoustic travel time down the runner.

#### 3.2 Acoustic Order Spectrum
Because 12 firing events occur per 2 crankshaft revolutions ($720^\circ$), the fundamental acoustic frequency is the **6th engine order**:
$$f_6 = 6 \times \left( \frac{N}{60} \right) = \frac{N}{10}\text{ Hz}$$
Harmonics appear at integer multiples of the fundamental order:
- **6th Order ($f_6$)**: Dominant deep baritone pulse ($60\text{ Hz}$ at $600\text{ RPM}$ idle, $600\text{ Hz}$ at $6,000\text{ RPM}$).
- **12th Order ($f_{12} = 2 f_6$)**: Secondary firing overtone ($120\text{ Hz}$ at idle).
- **18th Order ($f_{18} = 3 f_6$)**: High-frequency metallic combustion harmonic ($180\text{ Hz}$ at idle).
- **24th, 30th, 36th Orders**: Turbine chop and valve-seat impact overtones.
