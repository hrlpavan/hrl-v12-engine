/**
 * Rolls-Royce 6.75L Twin-Turbo 60° V12 Engine Core (TypeScript / Float64Array Zero-GC)
 * High Resource Labs (HRL) x Rolls-Royce Engineering Collaboration
 * Thermodynamic Reference: Prof. V. Ganesan, "Internal Combustion Engines" (4th Ed.)
 *
 * MEMORY OPTIMIZATION STRATEGY:
 * - Single continuous ArrayBuffer (1536 bytes) with Float64Array / Uint32Array views.
 * - Zero GC object churn inside high-frequency animation / simulation frames.
 */

export const CYLINDER_COUNT = 12;
export const BANK_ANGLE_DEG = 60.0;
export const BORE_MM = 89.0;
export const STROKE_MM = 90.4;
export const ROD_LENGTH_MM = 152.0;
export const CRANK_RADIUS_MM = STROKE_MM / 2.0; // 45.2 mm
export const LAMBDA_RATIO = CRANK_RADIUS_MM / ROD_LENGTH_MM; // 0.297368
export const COMPRESSION_RATIO = 10.00;
export const DISPLACEMENT_CC = 6746.96;
export const CLEARANCE_VOL_CC = 62.472;

export const FEAD_BELT_PITCH_LENGTH_MM = 1840.0;
export const FEAD_BELT_MASS_PER_M_KG = 0.125;
export const FEAD_PULLEY_CRANK_MM = 170.0;
export const FEAD_STATIC_TENSION_N = 650.0;
export const FEAD_MU_PRIME = 1.023;

export const FIRING_OFFSETS: readonly number[] = [
    0.0, 480.0, 240.0, 600.0, 120.0, 360.0,
    60.0, 540.0, 300.0, 660.0, 180.0, 420.0
];

export class V12EngineContinuousBuffer {
    /** Exactly 1,536 bytes fixed continuous memory block */
    public readonly buffer: ArrayBuffer;
    public readonly f64: Float64Array;
    public readonly u32: Uint32Array;

    constructor() {
        this.buffer = new ArrayBuffer(1536);
        this.f64 = new Float64Array(this.buffer);
        this.u32 = new Uint32Array(this.buffer);
        this.init();
    }

    public init(): void {
        // Offset 96 (doubles): RPM = 550.0
        this.f64[96] = 550.0; // rpm
        this.f64[97] = 0.05;  // throttle
        this.f64[106] = 0.86; // mechanical efficiency
        this.f64[107] = 218.0;// bsfc
        this.f64[114] = -91.4;// tvd twist attenuation
    }

    public getMemoryFootprintBytes(): number {
        return this.buffer.byteLength;
    }
}
