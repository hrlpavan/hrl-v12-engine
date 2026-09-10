// Package v12 provides a zero-allocation, ultra-low memory engine simulation core
// for the Rolls-Royce 6.75L Twin-Turbo 60° V12.
// High Resource Labs (HRL) x Rolls-Royce Engineering Collaboration
// Thermodynamic Reference: Prof. V. Ganesan, "Internal Combustion Engines" (4th Ed.)
package v12

import (
	"math"
	"unsafe"
)

const (
	CylinderCount        = 12
	BankAngleDeg         = 60.0
	BoreMm               = 89.0
	StrokeMm             = 90.4
	RodLengthMm          = 152.0
	CrankRadiusMm        = StrokeMm / 2.0 // 45.2 mm
	LambdaRatio          = CrankRadiusMm / RodLengthMm // 0.297368
	CompressionRatio     = 10.00
	DisplacementCc       = 6746.96
	ClearanceVolCc       = 62.472

	FeadBeltLengthMm     = 1840.0
	FeadBeltMassPerMKg   = 0.125
	FeadPulleyCrankMm    = 170.0
	FeadStaticTensionN   = 650.0
	FeadMuPrime          = 1.023
)

var FiringOffsets = [CylinderCount]float64{
	0.0, 480.0, 240.0, 600.0, 120.0, 360.0,
	60.0, 540.0, 300.0, 660.0, 180.0, 420.0,
}

// CylinderState is exactly 64 bytes (1 CPU cache line).
type CylinderState struct {
	CrankAngleRad float64
	PistonPosMm   float64
	PistonVelMS   float64
	PistonAccMS2  float64
	CylinderVolCc float64
	PressureBar   float64
	TemperatureK  float64
	StrokePhase   uint32
	_reserved     uint32
}

// EngineState represents the entire engine simulation state.
// Designed with value semantics to guarantee zero heap escapes (0 allocs/op).
type EngineState struct {
	Cylinders [CylinderCount]CylinderState // 768 bytes

	Rpm                  float64
	Throttle             float64
	BoostPressureBar     float64
	TotalIndicatedTorque float64
	TotalBrakeTorque     float64
	BrakePowerKw         float64
	BrakePowerBhp        float64
	BmepBar              float64
	ImepBar              float64
	FmepBar              float64
	MechanicalEfficiency float64
	BsfcGKwh             float64
	AirMassFlowKgS       float64
	FuelFlowGS           float64
	ExhaustTempC         float64
	OilPressureBar       float64
	CoolantTempC         float64
	VibrationAccelMS2    float64
	SoundSplDba          float64
	SimulationTimeSec    float64

	BeltSpeedMS          float64
	CentrifugalTensionN  float64
	TightSideTensionN    float64
	SlackSideTensionN    float64
	TensionRatio         float64
	FeadAuxPowerKw       float64
	TvdTwistAttenuation  float64
	FeadReserveCapacity  float64

	FiringOffsetsDeg     [CylinderCount]float64
	_padding             [448]byte
}

// NewEngine initializes a new engine state value.
func NewEngine() EngineState {
	var e EngineState
	e.Rpm = 550.0
	e.Throttle = 0.05
	e.MechanicalEfficiency = 0.86
	e.BsfcGKwh = 218.0
	e.CoolantTempC = 90.0
	e.ExhaustTempC = 450.0
	e.OilPressureBar = 1.8
	e.VibrationAccelMS2 = 0.008
	e.SoundSplDba = 36.2
	e.TvdTwistAttenuation = -91.4
	e.FiringOffsetsDeg = FiringOffsets
	return e
}

// SizeOfState returns the exact memory footprint of EngineState in bytes.
func SizeOfState() uintptr {
	return unsafe.Sizeof(EngineState{})
}

// Step advances engine physics by dtSec (value receiver & return ensures no heap escaping).
func Step(e EngineState, dtSec, targetRpm, targetThrottle float64) EngineState {
	rpmFilter := 1.0 - math.Exp(-dtSec*5.0)
	e.Rpm += (targetRpm - e.Rpm) * rpmFilter
	e.Throttle += (targetThrottle - e.Throttle) * rpmFilter
	e.SimulationTimeSec += dtSec

	omega := (e.Rpm * 2.0 * math.Pi) / 60.0
	masterCrankAngleDeg := math.Mod(e.SimulationTimeSec*(e.Rpm*6.0), 720.0)

	// Turbo Boost
	if e.Throttle > 0.25 {
		boost := 0.80 * math.Pow(e.Throttle, 1.4) * (e.Rpm / 5250.0)
		if boost > 0.80 {
			boost = 0.80
		}
		e.BoostPressureBar = boost
	} else {
		e.BoostPressureBar = 0.0
	}

	// Ganesan FMEP Chen-Flynn model
	meanPistonSpeed := 2.0 * (StrokeMm / 1000.0) * (e.Rpm / 60.0)
	e.FmepBar = 0.45 + 0.08*meanPistonSpeed + 0.005*(meanPistonSpeed*meanPistonSpeed)

	sumTorque := 0.0
	pistonAreaM2 := (math.Pi / 4.0) * ((BoreMm / 1000.0) * (BoreMm / 1000.0))
	pistonAreaCm2 := (math.Pi / 4.0) * ((BoreMm / 10.0) * (BoreMm / 10.0))

	for i := 0; i < CylinderCount; i++ {
		cylAngleDeg := math.Mod(masterCrankAngleDeg+e.FiringOffsetsDeg[i], 720.0)
		thetaRad := (cylAngleDeg * math.Pi) / 180.0
		e.Cylinders[i].CrankAngleRad = thetaRad

		cosTh := math.Cos(thetaRad)
		sinTh := math.Sin(thetaRad)
		termSqrt := math.Sqrt(math.Max(0.001, 1.0-(LambdaRatio*LambdaRatio)*(sinTh*sinTh)))

		sMm := CrankRadiusMm * ((1.0 - cosTh) + (1.0/LambdaRatio)*(1.0-termSqrt))
		e.Cylinders[i].PistonPosMm = sMm
		e.Cylinders[i].PistonVelMS = (CrankRadiusMm / 1000.0) * (sinTh + (LambdaRatio*math.Sin(2.0*thetaRad))/(2.0*termSqrt)) * omega
		e.Cylinders[i].PistonAccMS2 = (CrankRadiusMm / 1000.0) * (cosTh + LambdaRatio*math.Cos(2.0*thetaRad)) * (omega * omega)
		e.Cylinders[i].CylinderVolCc = ClearanceVolCc + (pistonAreaCm2 * (sMm / 10.0))

		// 4-Stroke cycle
		mapAbs := 1.0 + e.BoostPressureBar
		var pGas, tGas float64
		if cylAngleDeg < 180.0 {
			e.Cylinders[i].StrokePhase = 2 // Power
			prog := cylAngleDeg / 180.0
			pGas = mapAbs*16.5*(0.6+0.4*e.Throttle)*math.Exp(-2.8*prog) + mapAbs
			tGas = 1850.0*math.Exp(-1.2*prog) + 400.0
		} else if cylAngleDeg < 360.0 {
			e.Cylinders[i].StrokePhase = 3 // Exhaust
			pGas = 1.25 + 0.15*e.BoostPressureBar
			tGas = 750.0
		} else if cylAngleDeg < 540.0 {
			e.Cylinders[i].StrokePhase = 0 // Intake
			pGas = mapAbs
			tGas = 315.0
		} else {
			e.Cylinders[i].StrokePhase = 1 // Compression
			prog := (cylAngleDeg - 540.0) / 180.0
			pGas = mapAbs * math.Pow(1.0+9.0*prog, 1.32)
			tGas = 320.0 * math.Pow(1.0+9.0*prog, 0.32)
		}

		e.Cylinders[i].PressureBar = pGas
		e.Cylinders[i].TemperatureK = tGas

		fGasN := (pGas - 1.0) * 1e5 * pistonAreaM2
		fTangential := fGasN * (sinTh + (LambdaRatio*math.Sin(2.0*thetaRad))/2.0)
		cylTorque := fTangential * (CrankRadiusMm / 1000.0)
		if cylTorque > 0 {
			sumTorque += cylTorque
		}
	}

	e.TotalIndicatedTorque = sumTorque
	fricTorque := (e.FmepBar * 1e5 * (DisplacementCc * 1e-6)) / (4.0 * math.Pi)
	netTorque := sumTorque - fricTorque
	if netTorque < 0 {
		netTorque = 0
	}
	if netTorque > 900.0 {
		netTorque = 900.0
	}
	e.TotalBrakeTorque = netTorque
	e.BrakePowerKw = (2.0 * math.Pi * e.Rpm * e.TotalBrakeTorque) / 60000.0
	e.BrakePowerBhp = e.BrakePowerKw * 1.34102

	// FEAD Belts
	rCrankM := (FeadPulleyCrankMm / 2.0) / 1000.0
	vBelt := omega * rCrankM
	e.BeltSpeedMS = vBelt
	mv2 := FeadBeltMassPerMKg * vBelt * vBelt
	e.CentrifugalTensionN = mv2

	rpmNorm := e.Rpm / 1000.0
	pAux := 0.12*math.Pow(rpmNorm, 2.7) + 0.45*(1.0+0.15*rpmNorm) + 0.85*(1.0+0.05*rpmNorm) + 0.15*rpmNorm
	e.FeadAuxPowerKw = pAux

	fDrive := 50.0
	if vBelt > 0.5 {
		fDrive = (pAux * 1000.0) / vBelt
	}
	t2 := FeadStaticTensionN - (fDrive / 2.0) + (mv2 * 0.4)
	if t2 < mv2+80.0 {
		t2 = mv2 + 80.0
	}
	t1 := t2 + fDrive
	e.TightSideTensionN = t1
	e.SlackSideTensionN = t2

	return e
}
