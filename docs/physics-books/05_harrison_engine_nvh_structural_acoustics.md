# Technical Reference 05: Powertrain NVH, Mechanical Noise & Structural Acoustics
## Source: *Vehicle Refinement: Controlling Noise and Vibration in Road Vehicles* — Matthew Harrison (Elsevier Butterworth-Heinemann)

---

### 1. Powertrain Noise Decomposition (Harrison Ch. 4)

The total acoustic sound power radiated by an operating internal combustion engine is partitioned into three distinct physical mechanisms:
$$L_{p,\text{total}} = 10 \log_{10} \left( 10^{L_{\text{combustion}}/10} + 10^{L_{\text{mechanical}}/10} + 10^{L_{\text{aero}}/10} \right)$$

---

### 2. Combustion Noise & Cylinder Pressure Spectrum

Combustion noise originates from the rapid rate of cylinder pressure rise during deflagration:
$$P_{\text{combustion}} \propto \left( \frac{dp}{d\theta} \right)_{\text{max}}$$

1. **Combustion Pressure Spectrum**:
   - In smooth Atkinson-cycle / stratified gasoline combustion (as in the Rolls-Royce V12), peak pressure rise rates are limited to $\left(\frac{dp}{d\theta}\right)_{\text{max}} \le 2.5\text{ bar/deg}$ (unlike diesel knock which exceeds $8\text{--}12\text{ bar/deg}$).
   - The cylinder pressure spectrum decays smoothly at a rate of $-30\text{ dB/decade}$ above $800\text{ Hz}$, eliminating harsh metallic clatter.

2. **Block Structural Attenuation Transfer Function ($H_{\text{block}}(\omega)$)**:
   - The combustion pressure force $F_{\text{gas}}(t) = p(\theta) \cdot \frac{\pi B^2}{4}$ excites the cylinder liner, which transmits vibration through the cast aluminum-silicon water jackets and crankcase skirt.
   - The structural transmission loss of the deep-skirt AlSi7Mg0.3 block is modeled as:
     $$TL_{\text{block}}(f) = 20 \log_{10}\left( 1 + \left(\frac{f}{f_{\text{ring}}}\right)^2 \right) + 26\text{ dB}$$
     where $f_{\text{ring}} \approx 1,400\text{ Hz}$ is the primary block structural breathing mode.
   - At high frequencies ($> 2,000\text{ Hz}$), the block attenuates in-cylinder combustion noise by $> 32\text{ dB}$.

---

### 3. Mechanical Noise Sources (Harrison Ch. 5)

#### 3.1 Piston Slap Impact Acoustics
During the expansion stroke, the angularity of the connecting rod creates a transverse side-thrust force $F_{\text{thrust}}(\theta)$:
$$F_{\text{thrust}}(\theta) = F_{\text{gas}}(\theta) \cdot \tan \phi = F_{\text{gas}}(\theta) \cdot \frac{\lambda \sin \theta}{\sqrt{1 - \lambda^2 \sin^2 \theta}}$$
where $\lambda = R / L \approx 0.278$.
- As the piston passes through Top Dead Center (TDC), the side force reverses from minor thrust face to major thrust face.
- The piston accelerates across the radial clearance gap ($\delta \approx 25\text{--}35\ \mu\text{m}$), impacting the cast iron liner:
  $$E_{\text{slap}} = \frac{1}{2} m_{\text{piston}} v_{\text{transverse}}^2$$
- In the Rolls-Royce V12, polymer-graphite coated slipper skirts and a $0.8\text{ mm}$ wrist-pin offset reduce $v_{\text{transverse}}$ by $68\%$, dampening piston slap into an imperceptible whisper ($< 22\text{ dBA}$).

#### 3.2 Valvetrain Bucket Tappet & Cam Impact
- Impact between the hardened chilled cast-iron camshaft lobes and the DLC-coated hydraulic bucket tappets produces high-frequency impulsive clicks:
  $$F_{\text{tappet}}(t) = m_{\text{valve}} \ddot{y}_{\text{cam}}(t) + k_{\text{spring}} y(t)$$
- Hydraulic lash adjusters maintain zero clearance ($0.000\text{ mm}$ mechanical lash), eliminating audible valvetrain rattle and leaving only a delicate, precision Swiss-watch ticking.

#### 3.3 Timing Chain Meshing Frequency
- Driven by duplex bush roller chains over 21-tooth crank and 42-tooth cam sprockets:
  $$f_{\text{mesh}} = Z_{\text{crank}} \times \left( \frac{N}{60} \right) = 21 \times \left( \frac{N}{60} \right)\text{ Hz}$$
- At $600\text{ RPM}$ idle: $f_{\text{mesh}} = 210\text{ Hz}$.
- At $3,000\text{ RPM}$ cruise: $f_{\text{mesh}} = 1,050\text{ Hz}$.
- Rubber-damped composite guide shoes absorb $85\%$ of the link-impact energy.

---

### 4. Turbocharger Aeroacoustics: Blade Pass Frequency & Turbine Filtering

The twin twin-scroll turbochargers introduce two major acoustic signatures:

1. **Turbine Acoustic Damping**:
   - The exhaust turbine rotor acts as a non-linear continuous acoustic restrictor. Exhaust gas expansion across the nozzle ring and turbine blades smooths the sharp $\frac{d\dot{m}}{dt}$ blowdown spikes, acting as a low-pass filter with cutoff frequency $f_{\text{turbine}} \approx 650\text{ Hz}$. This explains why turbo engines possess a much deeper, warmer baritone exhaust than naturally aspirated engines.

2. **Compressor Blade Pass Frequency (BPF Whistle)**:
   - For a compressor wheel with $Z_{\text{blades}} = 6 \text{ full} + 6 \text{ splitter} = 12$ blades spinning at $N_{\text{turbo}} = 25,000\text{--}140,000\text{ RPM}$:
     $$f_{\text{BPF}} = Z_{\text{blades}} \times \frac{N_{\text{turbo}}}{60}$$
   - At idle ($N_{\text{turbo}} \approx 20,000\text{ RPM}$): $f_{\text{BPF}} = 12 \times \frac{20000}{60} = 4,000\text{ Hz}$ (inaudible due to low boost pressure).
   - Under spool/load ($N_{\text{turbo}} \approx 90,000\text{ RPM}$): $f_{\text{BPF}} \approx 18\text{ kHz}$, with audible sub-harmonic air-rush around $1,200\text{--}2,400\text{ Hz}$ through the carbon-composite airbox.
