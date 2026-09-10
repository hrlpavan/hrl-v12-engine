# Technical Reference 04: Fluid Mechanics, Boundary Layers & Compressible Flow
## Source: *Fluid Mechanics (8th/9th Edition)* — Prof. Frank M. White (McGraw-Hill)

---

### 1. Viscous Boundary Layer Dissipation in Exhaust Ducts (White Ch. 6)

As acoustic pressure waves and high-velocity exhaust gases travel down the exhaust runner and tailpipe, viscous friction and thermal conduction along the pipe boundary layer extract energy from the acoustic field, attenuating high-frequency pulse peaks.

#### 1.1 Classical Acoustic Attenuation Coefficient ($\alpha$)
For a gas with dynamic viscosity $\mu$, thermal conductivity $k$, and specific heat at constant pressure $C_p$:
$$\alpha_{\text{bulk}} = \frac{\omega^2}{2 \rho_0 c_0^3} \left[ \frac{4}{3}\mu + (\gamma - 1)\frac{k}{C_p} \right]$$

In circular ducts of diameter $D$, the wall boundary layer friction dominates:
$$\alpha_{\text{tube}}(\omega) = \frac{1}{D c_0} \sqrt{\frac{\omega \nu}{2}} \left[ 1 + \frac{\gamma - 1}{\sqrt{Pr}} \right]$$
where:
- $\nu = \mu / \rho_0$ is the kinematic viscosity of exhaust gas at $750^\circ\text{C}$ ($\sim 1.2 \times 10^{-4}\text{ m}^2/\text{s}$).
- $Pr = \frac{\mu C_p}{k} \approx 0.71$ is the Prandtl number.
- High-frequency harmonics decay exponentially as $e^{-\alpha_{\text{tube}} x}$, softening the metallic edge of the raw cylinder blowdown pulse as it traverses the $3.8\text{ meter}$ exhaust tract of the Rolls-Royce chassis.

---

### 2. Compressible Fanno Flow in Exhaust Pipes (White Ch. 9)

Flow in the constant-area exhaust pipe with wall friction is governed by 1D adiabatic Fanno line relations:
$$\frac{4\bar{f} L^*}{D} = \frac{1 - M^2}{\gamma M^2} + \frac{\gamma + 1}{2\gamma} \ln \left( \frac{(\gamma + 1) M^2}{2 + (\gamma - 1)M^2} \right)$$
Where:
- $\bar{f}$ is the Darcy-Weisbach friction factor (typically $0.022\text{--}0.028$ in rough carbon-coated stainless steel runners).
- The pressure drop along runner length $\Delta x$ is:
  $$\Delta p = f \frac{\Delta x}{D} \frac{\rho_0 U^2}{2}$$
- Mean gas velocity in the exhaust tailpipe varies from $U_0 \approx 12\text{ m/s}$ at idle to $U_0 \approx 85\text{ m/s}$ at $6,000\text{ RPM}$ wide-open throttle ($M \approx 0.02\text{--}0.14$).

---

### 3. Aeroacoustic Jet Noise at Tailpipe Exit (Lighthill's Eighth Power Law)

At the tailpipe exit into ambient air, turbulent mixing of the hot high-velocity exhaust jet with quiescent atmosphere generates broadband aeroacoustic hiss:
Total acoustic power radiated by turbulent quadrupole sources:
$$W_{\text{jet}} = K \cdot \frac{\rho_0^2 U_{\text{exit}}^8 D_{\text{pipe}}^2}{\rho_{\text{amb}} c_{\text{amb}}^5}$$
Where:
- $K \approx 10^{-4}$ is Lighthill's empirical jet noise constant.
- At low engine speeds ($U_{\text{exit}} < 20\text{ m/s}$), jet noise is imperceptible ($< 35\text{ dBA}$), ensuring the whisper-quiet Rolls-Royce character.
- At high engine speeds ($U_{\text{exit}} \approx 75\text{ m/s}$), jet turbulence introduces a soft, broadband rushing air texture beneath the resonant firing orders.

---

### 4. Convective Doppler Shift in Exhaust Duct Flow

Because the medium is moving at mean velocity $U_0$, acoustic waves traveling downstream experience a convective wavelength stretching:
$$f_{\text{observed}} = f_{\text{source}} \cdot (1 \pm M)$$
For an exhaust gas Mach number $M \approx 0.08$ at cruise, this causes an acoustic frequency broadening $\Delta f / f_0 \approx \pm 8\%$, softening discrete harmonic spikes into a lush, full-bodied timbre.
