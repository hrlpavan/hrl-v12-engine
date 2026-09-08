// ============================================================================
// HRL V12 Engine Project - 3D Three.js Engine Scene & Procedural Modeling
// High-fidelity 60° V12 Quad-Cam 48V Assembly with Kinematic Articulation
// ============================================================================

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ENGINE_SPECS, CYLINDERS, degToRad } from './kinematics.js';

// Visual scaling factor: 1 meter = 10 units (so 89mm stroke = 0.89 units)
const SCALE = 10.0;
const R = (ENGINE_SPECS.crankRadiusMm / 1000.0) * SCALE; // ~0.445
const L = (ENGINE_SPECS.rodLengthMm / 1000.0) * SCALE;   // ~1.60
const BORE = (ENGINE_SPECS.boreMm / 1000.0) * SCALE;     // ~0.88
const CYL_SPACING = 1.15; // spacing between cylinder centers along Z axis
const BANK_ANGLE = degToRad(30.0); // 30° from vertical

export class V12Scene3D {
  constructor(container) {
    this.container = container;
    this.width = container.clientWidth;
    this.height = container.clientHeight;

    // Three.js primitives
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.clock = new THREE.Clock();

    // Visual options
    this.cutawayMode = 'glass'; // 'glass', 'section', 'solid', 'xray'
    this.overlays = {
      callouts: true,
      combustionFx: true,
      gasFlow: true,
      isolateCyl: null // cylinder id or null
    };

    // Meshes and groups
    this.rootGroup = new THREE.Group();
    this.crankshaftGroup = new THREE.Group();
    this.camshaftsGroup = new THREE.Group();
    this.blockGroup = new THREE.Group();
    this.valvetrainGroup = new THREE.Group();
    this.flywheelMesh = null;
    this.timingDriveGroup = new THREE.Group();
    this.particlesGroup = new THREE.Group();
    this.calloutsGroup = new THREE.Group();

    // Cylinders dynamic parts cache: { id, pistonGroup, rodGroup, inValves, exValves, inSprings, exSprings, sparkGlow, fireMesh, pointLight }
    this.cylinderMeshes = [];

    // Shared materials
    this.materials = {};

    // Clipping plane for section cutaway
    this.sectionClipPlane = new THREE.Plane(new THREE.Vector3(1, 0, 0), 0.05);

    // Gas flow particles
    this.intakeParticles = [];
    this.exhaustParticles = [];

    // Camera preset targets
    this.cameraPresets = {
      hero:    { pos: new THREE.Vector3(4.8, 3.8, 5.2),  target: new THREE.Vector3(0, 0.6, 0) },
      front:   { pos: new THREE.Vector3(0, 1.2, 6.2),    target: new THREE.Vector3(0, 0.5, 0) },
      side:    { pos: new THREE.Vector3(6.5, 1.2, 0.0),  target: new THREE.Vector3(0, 0.4, 0) },
      valley:  { pos: new THREE.Vector3(0, 5.8, 0.2),    target: new THREE.Vector3(0, 0.8, 0) },
      cyl1:    { pos: new THREE.Vector3(1.8, 2.2, 3.2),  target: new THREE.Vector3(0.8, 1.4, 2.8) },
      crank:   { pos: new THREE.Vector3(3.2, -0.6, 2.2), target: new THREE.Vector3(0, -0.2, 0) },
      dohc:    { pos: new THREE.Vector3(2.5, 4.2, 2.0),  target: new THREE.Vector3(0.8, 2.2, 1.0) }
    };

    this._init();
  }

  _init() {
    // 1. Scene - Apple Pro Studio Black
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);
    this.scene.fog = new THREE.FogExp2(0x000000, 0.035);

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(42, this.width / this.height, 0.1, 100);
    const hero = this.cameraPresets.hero;
    this.camera.position.copy(hero.pos);

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.localClippingEnabled = true;
    this.container.appendChild(this.renderer.domElement);

    // 4. Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.target.copy(hero.target);
    this.controls.maxDistance = 25;
    this.controls.minDistance = 1.2;
    this.controls.maxPolarAngle = Math.PI / 2 + 0.15;

    // 5. Lighting & Studio Environment
    this._setupLighting();

    // 6. Materials
    this._initMaterials();

    // 7. Assemble 3D Engine Geometry
    this.scene.add(this.rootGroup);
    this.rootGroup.add(this.crankshaftGroup);
    this.rootGroup.add(this.camshaftsGroup);
    this.rootGroup.add(this.blockGroup);
    this.rootGroup.add(this.valvetrainGroup);
    this.rootGroup.add(this.timingDriveGroup);
    this.rootGroup.add(this.particlesGroup);
    this.rootGroup.add(this.calloutsGroup);

    this._buildCrankshaft();
    this._buildCylindersAndPistons();
    this._buildEngineBlock();
    this._buildQuadCamValvetrain();
    this._buildTimingDrive();
    this._buildGasParticles();
    this._buildCallouts();
    this._buildStudioFloor();

    // Handle Resize
    window.addEventListener('resize', () => this.onWindowResize());
  }

  _setupLighting() {
    // Ambient light
    const ambient = new THREE.AmbientLight(0xffffff, 0.75);
    this.scene.add(ambient);

    // Key Light (Crisp cool white rim from top-right)
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.8);
    keyLight.position.set(6, 10, 8);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 25;
    keyLight.shadow.camera.left = -5;
    keyLight.shadow.camera.right = 5;
    keyLight.shadow.camera.top = 5;
    keyLight.shadow.camera.bottom = -5;
    keyLight.shadow.bias = -0.0005;
    this.scene.add(keyLight);

    // Fill Light (Soft cyan/blue for metallic reflections)
    const fillLight = new THREE.DirectionalLight(0x8bc34a, 0.4);
    fillLight.position.set(-6, 5, -6);
    this.scene.add(fillLight);

    const blueRim = new THREE.DirectionalLight(0x4fc3f7, 0.9);
    blueRim.position.set(-8, 3, 5);
    this.scene.add(blueRim);

    // Under-Light (Subtle warm reflection from ground onto crankcase)
    const groundLight = new THREE.DirectionalLight(0xff9800, 0.35);
    groundLight.position.set(0, -6, 0);
    this.scene.add(groundLight);
  }

  _initMaterials() {
    // Polished Billet Steel / Crankshaft
    this.materials.crankshaft = new THREE.MeshStandardMaterial({
      color: 0xd8d8d8,
      metalness: 0.92,
      roughness: 0.18,
      envMapIntensity: 1.5
    });

    // Connecting Rods (Forged Shot-Peened H-Beam)
    this.materials.rod = new THREE.MeshStandardMaterial({
      color: 0x9099a2,
      metalness: 0.85,
      roughness: 0.32
    });

    // Pistons (T6 Aluminum with Bronze Wristpin)
    this.materials.piston = new THREE.MeshStandardMaterial({
      color: 0xdddddd,
      metalness: 0.88,
      roughness: 0.22
    });

    this.materials.wristPin = new THREE.MeshStandardMaterial({
      color: 0xb08d57, // Bronze
      metalness: 0.95,
      roughness: 0.25
    });

    // Cylinder Liners (Cast Iron Honed Bore)
    this.materials.liner = new THREE.MeshStandardMaterial({
      color: 0x60656e,
      metalness: 0.7,
      roughness: 0.35,
      side: THREE.DoubleSide
    });

    // Camshafts & Gears (Hardened Nitrided Steel)
    this.materials.camshaft = new THREE.MeshStandardMaterial({
      color: 0xb5bcc7,
      metalness: 0.92,
      roughness: 0.2
    });

    this.materials.gear = new THREE.MeshStandardMaterial({
      color: 0x4a4f55,
      metalness: 0.88,
      roughness: 0.35
    });

    // Valves: Intake (Polished Steel) & Exhaust (Heat-Treated Titanium Bronze)
    this.materials.intakeValve = new THREE.MeshStandardMaterial({
      color: 0x64b5f6,
      metalness: 0.9,
      roughness: 0.2
    });

    this.materials.exhaustValve = new THREE.MeshStandardMaterial({
      color: 0xff8a65,
      metalness: 0.85,
      roughness: 0.3
    });

    this.materials.spring = new THREE.MeshStandardMaterial({
      color: 0xe0e0e0,
      metalness: 0.95,
      roughness: 0.25
    });

    // Engine Block Material Variants:
    // 1. Refraction Glass Block
    this.materials.blockGlass = new THREE.MeshPhysicalMaterial({
      color: 0x243242,
      metalness: 0.05,
      roughness: 0.12,
      transmission: 0.88,
      ior: 1.48,
      transparent: true,
      opacity: 0.65,
      depthWrite: false
    });

    // 2. Solid Anodized Titanium Block
    this.materials.blockSolid = new THREE.MeshStandardMaterial({
      color: 0x1f242c,
      metalness: 0.85,
      roughness: 0.35
    });

    // 3. Section Cutaway Material (clipping plane enabled)
    this.materials.blockSection = new THREE.MeshStandardMaterial({
      color: 0x2a313d,
      metalness: 0.8,
      roughness: 0.3,
      clippingPlanes: [this.sectionClipPlane],
      clipShadows: true
    });

    // 4. CAD X-Ray Wireframe Hologram
    this.materials.blockXray = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      wireframe: true,
      transparent: true,
      opacity: 0.4
    });

    // Flywheel
    this.materials.flywheel = new THREE.MeshStandardMaterial({
      color: 0x333842,
      metalness: 0.9,
      roughness: 0.35
    });

    // Spark Plug Ceramic & Hex
    this.materials.sparkCeramic = new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.1 });
    this.materials.sparkMetal = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.9, roughness: 0.2 });

    // Spark Flash (Glow)
    this.materials.sparkPlasma = new THREE.MeshBasicMaterial({
      color: 0x64d2ff,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending
    });

    // In-Cylinder Combustion Fire
    this.materials.fire = new THREE.MeshBasicMaterial({
      color: 0xff5722,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });
  }

  _buildStudioFloor() {
    // Apple Pro studio floor
    const grid = new THREE.GridHelper(30, 60, 0x2c2c2e, 0x121214);
    grid.position.y = -1.8;
    this.scene.add(grid);

    // Subtle dark circular ground pad
    const padGeo = new THREE.CylinderGeometry(8, 8.5, 0.1, 48);
    const padMat = new THREE.MeshStandardMaterial({
      color: 0x070709,
      roughness: 0.85,
      metalness: 0.15
    });
    const pad = new THREE.Mesh(padGeo, padMat);
    pad.position.y = -1.85;
    pad.receiveShadow = true;
    this.scene.add(pad);
  }

  _buildCrankshaft() {
    this.crankshaftGroup.position.set(0, 0, 0);

    const crankLength = (CYLINDERS.length / 2) * CYL_SPACING; // ~6.9 units
    const zStart = (crankLength / 2) - (CYL_SPACING / 2); // front-most throw

    // Main central shaft line
    const mainJournalRadius = 0.24;
    const pinRadius = 0.20;
    const pinWidth = 0.38;
    const webThickness = 0.12;

    // Build 6 throws
    // Pin throw angles: 0°, 240°, 120°, 120°, 240°, 0°
    const throwAngles = [0, 240, 120, 120, 240, 0];

    for (let i = 0; i < 6; i++) {
      const pinZ = zStart - i * CYL_SPACING;
      const angleRad = degToRad(throwAngles[i]);

      // Main journal before throw
      const mainGeo = new THREE.CylinderGeometry(mainJournalRadius, mainJournalRadius, 0.22, 24);
      mainGeo.rotateX(Math.PI / 2);
      const mainMesh = new THREE.Mesh(mainGeo, this.materials.crankshaft);
      mainMesh.position.set(0, 0, pinZ + 0.32);
      this.crankshaftGroup.add(mainMesh);

      // Crankpin group (rotates at throw angle around crank centerline)
      const throwSubGroup = new THREE.Group();
      throwSubGroup.position.set(0, 0, pinZ);
      throwSubGroup.rotation.z = angleRad;

      // Crankpin cylinder offset by radius R
      const pinGeo = new THREE.CylinderGeometry(pinRadius, pinRadius, pinWidth, 24);
      pinGeo.rotateX(Math.PI / 2);
      const pinMesh = new THREE.Mesh(pinGeo, this.materials.crankshaft);
      pinMesh.position.set(0, R, 0);
      throwSubGroup.add(pinMesh);

      // Front & Rear Crank Webs with Counterweights
      for (const zOff of [-pinWidth / 2 - webThickness / 2, pinWidth / 2 + webThickness / 2]) {
        // Upper web connecting journal to pin
        const webArmGeo = new THREE.BoxGeometry(0.32, R + 0.2, webThickness);
        const webArm = new THREE.Mesh(webArmGeo, this.materials.crankshaft);
        webArm.position.set(0, R / 2, zOff);
        throwSubGroup.add(webArm);

        // Counterweight (heavy lobe opposite to crankpin)
        const cwGeo = new THREE.CylinderGeometry(0.58, 0.58, webThickness, 16, 1, false, Math.PI * 0.7, Math.PI * 0.6);
        cwGeo.rotateZ(Math.PI / 2);
        const cwMesh = new THREE.Mesh(cwGeo, this.materials.crankshaft);
        cwMesh.position.set(0, -0.32, zOff);
        cwMesh.scale.set(1.2, 0.7, 1.0);
        throwSubGroup.add(cwMesh);
      }

      this.crankshaftGroup.add(throwSubGroup);
    }

    // Rear main journal & Flywheel
    const rearZ = zStart - 5 * CYL_SPACING - 0.45;
    const rearMainGeo = new THREE.CylinderGeometry(mainJournalRadius, mainJournalRadius, 0.4, 24);
    rearMainGeo.rotateX(Math.PI / 2);
    const rearMain = new THREE.Mesh(rearMainGeo, this.materials.crankshaft);
    rearMain.position.set(0, 0, rearZ);
    this.crankshaftGroup.add(rearMain);

    // Billet Steel Flywheel with Ring Gear
    const flywheelGeo = new THREE.CylinderGeometry(1.45, 1.45, 0.28, 48);
    flywheelGeo.rotateX(Math.PI / 2);
    this.flywheelMesh = new THREE.Mesh(flywheelGeo, this.materials.flywheel);
    this.flywheelMesh.position.set(0, 0, rearZ - 0.25);
    this.crankshaftGroup.add(this.flywheelMesh);

    // Ring gear teeth ring
    const ringGeo = new THREE.TorusGeometry(1.44, 0.05, 8, 72);
    const ringMesh = new THREE.Mesh(ringGeo, this.materials.gear);
    ringMesh.position.set(0, 0, rearZ - 0.25);
    this.crankshaftGroup.add(ringMesh);

    // Front Crankshaft Damper Pulley & Helical Timing Drive Gear
    const frontZ = zStart + 0.45;
    const damperGeo = new THREE.CylinderGeometry(0.75, 0.75, 0.22, 32);
    damperGeo.rotateX(Math.PI / 2);
    const damperMesh = new THREE.Mesh(damperGeo, this.materials.flywheel);
    damperMesh.position.set(0, 0, frontZ);
    this.crankshaftGroup.add(damperMesh);

    const crankTimingGearGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.18, 28);
    crankTimingGearGeo.rotateX(Math.PI / 2);
    const crankTimingGear = new THREE.Mesh(crankTimingGearGeo, this.materials.gear);
    crankTimingGear.position.set(0, 0, frontZ - 0.2);
    this.crankshaftGroup.add(crankTimingGear);
  }

  _buildCylindersAndPistons() {
    const crankLength = 6 * CYL_SPACING;
    const zStart = (crankLength / 2) - (CYL_SPACING / 2);

    this.cylinderMeshes = [];

    CYLINDERS.forEach(cyl => {
      const pinIndex = cyl.pin - 1;
      const baseZ = zStart - pinIndex * CYL_SPACING;
      // Slight Z-offset so Bank 1 and Bank 2 connecting rods fit side-by-side on same crankpin
      const zOffset = cyl.bank === 'R' ? 0.08 : -0.08;
      const cylZ = baseZ + zOffset;

      const bankAngleRad = degToRad(cyl.bankAngle); // +30° or -30°

      // Piston Assembly Group
      const pistonGroup = new THREE.Group();

      // Piston Crown & Skirt Geometry
      const pistonRadius = BORE * 0.48; // ~0.42
      const pistonHeight = 0.55;
      const pistonGeo = new THREE.CylinderGeometry(pistonRadius, pistonRadius, pistonHeight, 32);
      const pistonMesh = new THREE.Mesh(pistonGeo, this.materials.piston);
      pistonMesh.castShadow = true;
      pistonGroup.add(pistonMesh);

      // Piston Rings (3 ring grooves)
      for (let r = 0; r < 3; r++) {
        const ringGeo = new THREE.TorusGeometry(pistonRadius + 0.005, 0.012, 6, 32);
        const ring = new THREE.Mesh(ringGeo, this.materials.gear);
        ring.position.y = 0.18 - r * 0.06;
        pistonGroup.add(ring);
      }

      // Wrist Pin (Bronze)
      const pinGeo = new THREE.CylinderGeometry(0.09, 0.09, pistonRadius * 1.8, 16);
      pinGeo.rotateX(Math.PI / 2);
      const pinMesh = new THREE.Mesh(pinGeo, this.materials.wristPin);
      pinMesh.position.y = -0.05;
      pistonGroup.add(pinMesh);

      // In-Cylinder Combustion Fireball (inside combustion chamber at top of piston)
      const fireGeo = new THREE.SphereGeometry(pistonRadius * 0.9, 16, 12);
      const fireMesh = new THREE.Mesh(fireGeo, this.materials.fire.clone());
      fireMesh.position.y = 0.35;
      fireMesh.visible = false;
      pistonGroup.add(fireMesh);

      // In-Cylinder Spark Light (dynamic point light)
      const cylLight = new THREE.PointLight(0xff7700, 0, 3.5);
      cylLight.position.y = 0.45;
      pistonGroup.add(cylLight);

      this.rootGroup.add(pistonGroup);

      // Connecting Rod Assembly Group
      const rodGroup = new THREE.Group();

      // H-Beam central shaft
      const rodWidth = 0.16;
      const rodDepth = 0.12;
      const rodShaftGeo = new THREE.BoxGeometry(rodWidth, L, rodDepth);
      const rodShaft = new THREE.Mesh(rodShaftGeo, this.materials.rod);
      rodShaft.position.y = L / 2;
      rodGroup.add(rodShaft);

      // Big End (around crankpin)
      const bigEndGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.16, 24);
      bigEndGeo.rotateX(Math.PI / 2);
      const bigEnd = new THREE.Mesh(bigEndGeo, this.materials.rod);
      rodGroup.add(bigEnd);

      // Small End (around wristpin)
      const smallEndGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.14, 20);
      smallEndGeo.rotateX(Math.PI / 2);
      const smallEnd = new THREE.Mesh(smallEndGeo, this.materials.rod);
      smallEnd.position.y = L;
      rodGroup.add(smallEnd);

      this.rootGroup.add(rodGroup);

      // Store in cylinder dynamic cache
      this.cylinderMeshes.push({
        id: cyl.id,
        bank: cyl.bank,
        pin: cyl.pin,
        throwAngle: cyl.throwAngle,
        bankAngleRad,
        cylZ,
        pistonGroup,
        rodGroup,
        fireMesh,
        cylLight,
        inValves: [],
        exValves: [],
        inSprings: [],
        exSprings: [],
        sparkGlow: null
      });
    });
  }

  _buildEngineBlock() {
    this.blockGroup.clear();

    const crankLength = 6 * CYL_SPACING;
    const zStart = (crankLength / 2) - (CYL_SPACING / 2);

    // 12 Cast Iron Cylinder Liners (Sleeves)
    CYLINDERS.forEach(cyl => {
      const pinIndex = cyl.pin - 1;
      const baseZ = zStart - pinIndex * CYL_SPACING;
      const zOffset = cyl.bank === 'R' ? 0.08 : -0.08;
      const cylZ = baseZ + zOffset;
      const bankAngleRad = degToRad(cyl.bankAngle);

      const linerRadius = BORE * 0.505; // ~0.444
      const linerHeight = 2.2;
      const linerGeo = new THREE.CylinderGeometry(linerRadius + 0.03, linerRadius, linerHeight, 32, 1, true);

      const liner = new THREE.Mesh(linerGeo, this.materials.liner);
      // Position liner along cylinder bank axis
      const linerCenterDist = R + L - 0.35;
      liner.position.set(
        Math.sin(bankAngleRad) * linerCenterDist,
        Math.cos(bankAngleRad) * linerCenterDist,
        cylZ
      );
      liner.rotation.z = -bankAngleRad;
      this.blockGroup.add(liner);
    });

    // 60° V-Angle Outer Monoblock Casting (styled to match glass/section/solid)
    const blockMat = this._getCurrentBlockMaterial();

    // Crankcase lower saddle
    const crankcaseGeo = new THREE.CylinderGeometry(1.2, 1.25, crankLength + 0.4, 28, 1, false, Math.PI * 0.8, Math.PI * 1.4);
    crankcaseGeo.rotateX(Math.PI / 2);
    const crankcase = new THREE.Mesh(crankcaseGeo, blockMat);
    crankcase.position.set(0, -0.2, 0);
    this.blockGroup.add(crankcase);

    // Right Bank outer casting slab
    const bankRGeo = new THREE.BoxGeometry(0.25, 2.4, crankLength + 0.2);
    const bankR = new THREE.Mesh(bankRGeo, blockMat);
    bankR.position.set(1.55, 1.35, 0);
    bankR.rotation.z = -BANK_ANGLE;
    this.blockGroup.add(bankR);

    // Left Bank outer casting slab
    const bankLGeo = new THREE.BoxGeometry(0.25, 2.4, crankLength + 0.2);
    const bankL = new THREE.Mesh(bankLGeo, blockMat);
    bankL.position.set(-1.55, 1.35, 0);
    bankL.rotation.z = BANK_ANGLE;
    this.blockGroup.add(bankL);

    // Front Timing Cover Plate
    const frontCoverGeo = new THREE.BoxGeometry(2.4, 2.8, 0.15);
    const frontCover = new THREE.Mesh(frontCoverGeo, blockMat);
    frontCover.position.set(0, 0.8, zStart + CYL_SPACING * 0.7);
    this.blockGroup.add(frontCover);

    // Rear Bellhousing Plate
    const rearCoverGeo = new THREE.BoxGeometry(2.6, 2.8, 0.15);
    const rearCover = new THREE.Mesh(rearCoverGeo, blockMat);
    rearCover.position.set(0, 0.8, -zStart - CYL_SPACING * 0.7);
    this.blockGroup.add(rearCover);

    // Deep finned Oil Sump (Pan) at the bottom
    const sumpGeo = new THREE.BoxGeometry(1.8, 0.65, crankLength + 0.3);
    const sump = new THREE.Mesh(sumpGeo, this.materials.blockSolid);
    sump.position.set(0, -1.35, 0);
    this.blockGroup.add(sump);

    // Sump cooling fins
    for (let f = -5; f <= 5; f++) {
      const finGeo = new THREE.BoxGeometry(1.82, 0.04, 0.03);
      const fin = new THREE.Mesh(finGeo, this.materials.gear);
      fin.position.set(0, -1.35 + f * 0.05, 0);
      this.blockGroup.add(fin);
    }
  }

  _buildQuadCamValvetrain() {
    this.valvetrainGroup.clear();
    const crankLength = 6 * CYL_SPACING;
    const zStart = (crankLength / 2) - (CYL_SPACING / 2);

    // DOHC: 4 Camshafts total:
    // Right Bank: Intake Cam (inner valley side) & Exhaust Cam (outer side)
    // Left Bank:  Intake Cam (inner valley side) & Exhaust Cam (outer side)
    const headTopDist = R + L + 0.85;

    // Camshaft configurations
    const camConfigs = [
      // Right Bank (Bank 1)
      { id: 'R_IN', bank: 'R', bankAngle:  BANK_ANGLE, type: 'intake',  xOff: -0.22, yOff: 0.15 },
      { id: 'R_EX', bank: 'R', bankAngle:  BANK_ANGLE, type: 'exhaust', xOff:  0.26, yOff: 0.10 },
      // Left Bank (Bank 2)
      { id: 'L_IN', bank: 'L', bankAngle: -BANK_ANGLE, type: 'intake',  xOff:  0.22, yOff: 0.15 },
      { id: 'L_EX', bank: 'L', bankAngle: -BANK_ANGLE, type: 'exhaust', xOff: -0.26, yOff: 0.10 }
    ];

    this.camshaftMeshes = [];

    camConfigs.forEach(cfg => {
      const camShaftGroup = new THREE.Group();

      // Compute base position of camshaft centerline
      const basePosX = Math.sin(cfg.bankAngle) * headTopDist;
      const basePosY = Math.cos(cfg.bankAngle) * headTopDist;

      // Local offset rotated by bank angle
      const rotX = cfg.xOff * Math.cos(cfg.bankAngle) - cfg.yOff * Math.sin(cfg.bankAngle);
      const rotY = cfg.xOff * Math.sin(cfg.bankAngle) + cfg.yOff * Math.cos(cfg.bankAngle);

      camShaftGroup.position.set(basePosX + rotX, basePosY + rotY, 0);

      // Main Camshaft Bar
      const camBarGeo = new THREE.CylinderGeometry(0.08, 0.08, crankLength + 0.6, 20);
      camBarGeo.rotateX(Math.PI / 2);
      const camBar = new THREE.Mesh(camBarGeo, this.materials.camshaft);
      camShaftGroup.add(camBar);

      // 12 Cam Lobes (2 valves per cylinder x 6 cylinders per bank)
      for (let c = 0; c < 6; c++) {
        const cylZ = zStart - c * CYL_SPACING;
        for (const valveZ of [cylZ - 0.12, cylZ + 0.12]) {
          // Teardrop cam lobe profile
          const lobeGeo = new THREE.CylinderGeometry(0.13, 0.13, 0.08, 16);
          lobeGeo.rotateX(Math.PI / 2);
          const lobe = new THREE.Mesh(lobeGeo, this.materials.camshaft);
          lobe.position.set(0, 0.04, valveZ);
          lobe.scale.set(1.0, 1.45, 1.0); // Egg/teardrop lift profile
          camShaftGroup.add(lobe);
        }
      }

      // Camshaft Sprocket / Timing Gear (Driven at 1/2 crank speed)
      const camGearGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.12, 32);
      camGearGeo.rotateX(Math.PI / 2);
      const camGear = new THREE.Mesh(camGearGeo, this.materials.gear);
      camGear.position.set(0, 0, zStart + 0.35);
      camShaftGroup.add(camGear);

      this.camshaftsGroup.add(camShaftGroup);
      this.camshaftMeshes.push({ cfg, group: camShaftGroup });
    });

    // 48 Valves with Real-time Compressing Helical Springs
    this.cylinderMeshes.forEach(cylMesh => {
      const bankAngle = cylMesh.bankAngleRad;
      const headDist = R + L + 0.65;

      // Cylinder Head Center
      const headX = Math.sin(bankAngle) * headDist;
      const headY = Math.cos(bankAngle) * headDist;
      const z = cylMesh.cylZ;

      // 2 Intake Valves (inner) & 2 Exhaust Valves (outer)
      // Intake valves
      [-0.12, 0.12].forEach(valveZOff => {
        const valveGroup = new THREE.Group();
        const inStemGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.65, 12);
        const inStem = new THREE.Mesh(inStemGeo, this.materials.intakeValve);
        inStem.position.y = 0.325;
        valveGroup.add(inStem);

        // Valve Poppet Disc Head (large intake)
        const inHeadGeo = new THREE.CylinderGeometry(0.17, 0.04, 0.06, 20);
        const inHead = new THREE.Mesh(inHeadGeo, this.materials.intakeValve);
        valveGroup.add(inHead);

        // Helical Wire Spring (3D spiral curve)
        const springCurve = this._createHelicalSpringCurve(0.08, 0.42, 6);
        const springGeo = new THREE.TubeGeometry(springCurve, 40, 0.015, 8, false);
        const springMesh = new THREE.Mesh(springGeo, this.materials.spring);
        springMesh.position.y = 0.12;
        valveGroup.add(springMesh);

        // Position valve in head
        const inOffset = cylMesh.bank === 'R' ? -0.16 : 0.16;
        valveGroup.position.set(
          headX + inOffset * Math.cos(bankAngle),
          headY - inOffset * Math.sin(bankAngle),
          z + valveZOff
        );
        valveGroup.rotation.z = -bankAngle;

        this.valvetrainGroup.add(valveGroup);
        cylMesh.inValves.push(valveGroup);
        cylMesh.inSprings.push(springMesh);
      });

      // Exhaust valves
      [-0.12, 0.12].forEach(valveZOff => {
        const valveGroup = new THREE.Group();
        const exStemGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.65, 12);
        const exStem = new THREE.Mesh(exStemGeo, this.materials.exhaustValve);
        exStem.position.y = 0.325;
        valveGroup.add(exStem);

        // Valve Poppet Disc Head (exhaust)
        const exHeadGeo = new THREE.CylinderGeometry(0.14, 0.04, 0.06, 20);
        const exHead = new THREE.Mesh(exHeadGeo, this.materials.exhaustValve);
        valveGroup.add(exHead);

        // Helical Wire Spring
        const springCurve = this._createHelicalSpringCurve(0.08, 0.42, 6);
        const springGeo = new THREE.TubeGeometry(springCurve, 40, 0.015, 8, false);
        const springMesh = new THREE.Mesh(springGeo, this.materials.spring);
        springMesh.position.y = 0.12;
        valveGroup.add(springMesh);

        // Position exhaust valve in head (outer side)
        const exOffset = cylMesh.bank === 'R' ? 0.18 : -0.18;
        valveGroup.position.set(
          headX + exOffset * Math.cos(bankAngle),
          headY - exOffset * Math.sin(bankAngle),
          z + valveZOff
        );
        valveGroup.rotation.z = -bankAngle;

        this.valvetrainGroup.add(valveGroup);
        cylMesh.exValves.push(valveGroup);
        cylMesh.exSprings.push(springMesh);
      });

      // Central Spark Plug (in pent-roof chamber center between the 4 valves)
      const plugGroup = new THREE.Group();
      const ceramicGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.5, 14);
      const ceramic = new THREE.Mesh(ceramicGeo, this.materials.sparkCeramic);
      ceramic.position.y = 0.25;
      plugGroup.add(ceramic);

      const hexGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.18, 6);
      const hex = new THREE.Mesh(hexGeo, this.materials.sparkMetal);
      hex.position.y = 0.08;
      plugGroup.add(hex);

      // Plasma Spark Tip Glow
      const sparkGlowGeo = new THREE.SphereGeometry(0.08, 12, 12);
      const sparkGlow = new THREE.Mesh(sparkGlowGeo, this.materials.sparkPlasma.clone());
      sparkGlow.position.y = -0.05;
      sparkGlow.visible = false;
      plugGroup.add(sparkGlow);
      cylMesh.sparkGlow = sparkGlow;

      plugGroup.position.set(headX, headY, z);
      plugGroup.rotation.z = -bankAngle;
      this.valvetrainGroup.add(plugGroup);
    });
  }

  _createHelicalSpringCurve(radius, height, coils) {
    const points = [];
    const totalPoints = 60;
    for (let i = 0; i <= totalPoints; i++) {
      const t = i / totalPoints;
      const angle = t * coils * Math.PI * 2;
      const x = radius * Math.cos(angle);
      const z = radius * Math.sin(angle);
      const y = t * height;
      points.push(new THREE.Vector3(x, y, z));
    }
    return new THREE.CatmullRomCurve3(points);
  }

  _buildTimingDrive() {
    this.timingDriveGroup.clear();
    const crankLength = 6 * CYL_SPACING;
    const frontZ = (crankLength / 2) + 0.25;

    // Timing Chain Guide Rails & Tensioners (Carbon-Composite)
    const guideMat = new THREE.MeshStandardMaterial({ color: 0x1a1d22, metalness: 0.4, roughness: 0.6 });

    // Right Bank Timing Chain Guide
    const guideRGeo = new THREE.BoxGeometry(0.08, 2.2, 0.06);
    const guideR = new THREE.Mesh(guideRGeo, guideMat);
    guideR.position.set(1.15, 1.4, frontZ);
    guideR.rotation.z = -BANK_ANGLE * 0.7;
    this.timingDriveGroup.add(guideR);

    // Left Bank Timing Chain Guide
    const guideL = new THREE.Mesh(guideRGeo, guideMat);
    guideL.position.set(-1.15, 1.4, frontZ);
    guideL.rotation.z = BANK_ANGLE * 0.7;
    this.timingDriveGroup.add(guideL);

    // Dual Timing Chain loop (stylized metallic ribbon)
    const chainMat = new THREE.MeshStandardMaterial({ color: 0x9099a2, metalness: 0.9, roughness: 0.3 });
    const chainGeo = new THREE.TorusGeometry(1.6, 0.025, 8, 48);
    const chainMesh = new THREE.Mesh(chainGeo, chainMat);
    chainMesh.position.set(0, 1.3, frontZ);
    chainMesh.scale.set(0.9, 1.4, 1.0);
    this.timingDriveGroup.add(chainMesh);
  }

  _buildGasParticles() {
    this.particlesGroup.clear();
    this.intakeParticles = [];
    this.exhaustParticles = [];

    // Intake Particles (Cyan / Blue fresh air-fuel mixture)
    const intakeMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending
    });

    // Exhaust Particles (Orange / Fire glow)
    const exhaustMat = new THREE.MeshBasicMaterial({
      color: 0xff3d00,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending
    });

    const particleGeo = new THREE.SphereGeometry(0.04, 8, 8);

    // Create 60 intake and 60 exhaust flow particles distributed across cylinders
    for (let i = 0; i < 60; i++) {
      const pIn = new THREE.Mesh(particleGeo, intakeMat);
      pIn.visible = false;
      this.particlesGroup.add(pIn);
      this.intakeParticles.push({ mesh: pIn, progress: Math.random(), cylIndex: i % 12 });

      const pEx = new THREE.Mesh(particleGeo, exhaustMat);
      pEx.visible = false;
      this.particlesGroup.add(pEx);
      this.exhaustParticles.push({ mesh: pEx, progress: Math.random(), cylIndex: i % 12 });
    }
  }

  _buildCallouts() {
    this.calloutsGroup.clear();

    // 3D Visual HUD Callout tags
    const calloutData = [
      { text: "Crankshaft · 120° Billet", pos: new THREE.Vector3(0, -0.4, 2.2) },
      { text: "Quad-Cam DOHC · 48V",      pos: new THREE.Vector3(1.2, 2.8, 1.2) },
      { text: "Pistons · 88mm Forged",    pos: new THREE.Vector3(1.8, 1.2, 0.4) },
      { text: "Flywheel · Pulse Storage", pos: new THREE.Vector3(0, 0.2, -3.4) },
      { text: "1:2 Helical Timing Drive", pos: new THREE.Vector3(0, 1.8, 3.2) }
    ];

    calloutData.forEach(item => {
      const dotGeo = new THREE.SphereGeometry(0.04, 12, 12);
      const dotMat = new THREE.MeshBasicMaterial({ color: 0x2997ff });
      const dot = new THREE.Mesh(dotGeo, dotMat);
      dot.position.copy(item.pos);
      this.calloutsGroup.add(dot);

      // Line leader
      const lineGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0.35, 0.35, 0)
      ]);
      const lineMat = new THREE.LineBasicMaterial({ color: 0x2997ff, transparent: true, opacity: 0.5 });
      const line = new THREE.Line(lineGeo, lineMat);
      line.position.copy(item.pos);
      this.calloutsGroup.add(line);
    });
  }

  _getCurrentBlockMaterial() {
    switch (this.cutawayMode) {
      case 'glass':   return this.materials.blockGlass;
      case 'section': return this.materials.blockSection;
      case 'solid':   return this.materials.blockSolid;
      case 'xray':    return this.materials.blockXray;
      default:        return this.materials.blockGlass;
    }
  }

  setCutawayMode(mode) {
    this.cutawayMode = mode;
    this._buildEngineBlock();
  }

  setOverlay(name, enabled) {
    if (this.overlays.hasOwnProperty(name)) {
      this.overlays[name] = enabled;
      if (name === 'callouts') {
        this.calloutsGroup.visible = enabled;
      }
    }
  }

  isolateCylinder(cylId) {
    this.overlays.isolateCyl = cylId;
  }

  setCameraPreset(presetKey) {
    const preset = this.cameraPresets[presetKey];
    if (!preset) return;

    // Smooth lerp can be driven in update loop or instant
    this.camera.position.copy(preset.pos);
    this.controls.target.copy(preset.target);
    this.controls.update();
  }

  /**
   * Main Kinematic Update Loop - updates all 12 cylinders and rotating parts
   * @param {object} engineState - from computeEngineState(crankAngleDeg, rpm)
   */
  update(engineState) {
    const crankAngleRad = degToRad(engineState.crankAngleDeg);

    // 1. Rotate Crankshaft Group
    this.crankshaftGroup.rotation.z = crankAngleRad;

    // 2. Rotate Camshafts (Quad-cam at 1/2 speed)
    const camAngleRad = degToRad(engineState.camAngleDeg);
    this.camshaftMeshes.forEach(cam => {
      cam.group.rotation.z = camAngleRad;
    });

    // 3. Articulate all 12 Cylinders (Pistons, Connecting Rods, Valves, Fireballs, Sparks)
    this.cylinderMeshes.forEach((cylMesh, idx) => {
      const state = engineState.cylinders[idx];
      const isIsolated = this.overlays.isolateCyl !== null && this.overlays.isolateCyl !== state.id;

      // Dim or hide if isolated
      cylMesh.pistonGroup.visible = !isIsolated;
      cylMesh.rodGroup.visible = !isIsolated;

      // Kinematic piston position along cylinder bore axis
      // state.kinematics.x is distance from crank axis to wrist pin in meters
      // Convert to 3D scene units with SCALE:
      const wristPinDist = state.kinematics.x * SCALE;
      const bankAngle = cylMesh.bankAngleRad;

      // Wrist pin 3D position
      const wristPinX = Math.sin(bankAngle) * wristPinDist;
      const wristPinY = Math.cos(bankAngle) * wristPinDist;
      const cylZ = cylMesh.cylZ;

      // Update Piston 3D Group
      cylMesh.pistonGroup.position.set(wristPinX, wristPinY, cylZ);
      cylMesh.pistonGroup.rotation.z = -bankAngle;

      // Crankpin 3D position for this cylinder's throw:
      // The crank throw angle is cylMesh.throwAngle
      const totalThrowAngleRad = crankAngleRad + degToRad(cylMesh.throwAngle);
      const crankPinX = -Math.sin(totalThrowAngleRad) * R;
      const crankPinY = Math.cos(totalThrowAngleRad) * R;

      // Update Connecting Rod 3D Group
      // Position big end at crankpin
      cylMesh.rodGroup.position.set(crankPinX, crankPinY, cylZ);

      // Rod points towards wristpin (dx, dy)
      const dx = wristPinX - crankPinX;
      const dy = wristPinY - crankPinY;
      const rodAngle = Math.atan2(dx, dy);
      cylMesh.rodGroup.rotation.z = -rodAngle;

      // 4. Valvetrain Lift & Helical Spring Compression
      const inLiftUnits = (state.valves.intakeMm / 1000.0) * SCALE;
      const exLiftUnits = (state.valves.exhaustMm / 1000.0) * SCALE;

      // Depress intake valves down into chamber
      cylMesh.inValves.forEach((v, vIdx) => {
        v.position.y = (R + L + 0.65) * Math.cos(bankAngle) - inLiftUnits * Math.cos(bankAngle);
        v.position.x = (R + L + 0.65) * Math.sin(bankAngle) - inLiftUnits * Math.sin(bankAngle);
        // Compress helical spring visually
        const spring = cylMesh.inSprings[vIdx];
        if (spring) {
          const compFactor = 1.0 - (state.valves.intakeNorm * 0.35);
          spring.scale.set(1.0, compFactor, 1.0);
        }
      });

      // Depress exhaust valves down into chamber
      cylMesh.exValves.forEach((v, vIdx) => {
        v.position.y = (R + L + 0.65) * Math.cos(bankAngle) - exLiftUnits * Math.cos(bankAngle);
        v.position.x = (R + L + 0.65) * Math.sin(bankAngle) - exLiftUnits * Math.sin(bankAngle);
        const spring = cylMesh.exSprings[vIdx];
        if (spring) {
          const compFactor = 1.0 - (state.valves.exhaustNorm * 0.35);
          spring.scale.set(1.0, compFactor, 1.0);
        }
      });

      // 5. In-Cylinder Combustion Fire FX & Spark Discharge
      if (this.overlays.combustionFx && !isIsolated) {
        // Spark plug glow
        if (cylMesh.sparkGlow) {
          cylMesh.sparkGlow.visible = state.isSparking;
          cylMesh.sparkGlow.material.opacity = state.isSparking ? 0.95 : 0.0;
        }

        // Combustion fireball
        if (cylMesh.fireMesh) {
          cylMesh.fireMesh.visible = state.isCombusting;
          if (state.isCombusting) {
            const fireIntensity = Math.sin((state.cycleDeg / 110) * Math.PI);
            cylMesh.fireMesh.material.opacity = fireIntensity * 0.85;
            cylMesh.fireMesh.scale.setScalar(0.9 + fireIntensity * 0.4);
            cylMesh.cylLight.intensity = fireIntensity * 4.5;
          } else {
            cylMesh.cylLight.intensity = 0;
          }
        }
      } else {
        if (cylMesh.sparkGlow) cylMesh.sparkGlow.visible = false;
        if (cylMesh.fireMesh) cylMesh.fireMesh.visible = false;
        cylMesh.cylLight.intensity = 0;
      }
    });

    // 6. Gas Flow Streamlines (Intake & Exhaust particles)
    if (this.overlays.gasFlow) {
      const dt = 0.016;
      this.intakeParticles.forEach(p => {
        const cylState = engineState.cylinders[p.cylIndex];
        const isIntake = cylState.phase.code === 'INTAKE';
        p.mesh.visible = isIntake;
        if (isIntake) {
          p.progress = (p.progress + dt * 2.5) % 1.0;
          const bankAngle = degToRad(cylState.bankAngle);
          const headX = Math.sin(bankAngle) * (R + L + 0.7);
          const headY = Math.cos(bankAngle) * (R + L + 0.7);
          // Stream from intake runner towards valve
          p.mesh.position.set(
            headX + (1.0 - p.progress) * 0.5 * (cylState.bank === 'R' ? -1 : 1),
            headY + (1.0 - p.progress) * 0.4,
            CYLINDERS[p.cylIndex].pin * CYL_SPACING - 3.2
          );
        }
      });

      this.exhaustParticles.forEach(p => {
        const cylState = engineState.cylinders[p.cylIndex];
        const isExhaust = cylState.phase.code === 'EXHAUST';
        p.mesh.visible = isExhaust;
        if (isExhaust) {
          p.progress = (p.progress + dt * 3.0) % 1.0;
          const bankAngle = degToRad(cylState.bankAngle);
          const headX = Math.sin(bankAngle) * (R + L + 0.65);
          const headY = Math.cos(bankAngle) * (R + L + 0.65);
          // Stream outward into exhaust header
          p.mesh.position.set(
            headX + p.progress * 0.8 * (cylState.bank === 'R' ? 1 : -1),
            headY + p.progress * 0.4,
            CYLINDERS[p.cylIndex].pin * CYL_SPACING - 3.2
          );
        }
      });
    } else {
      this.intakeParticles.forEach(p => p.mesh.visible = false);
      this.exhaustParticles.forEach(p => p.mesh.visible = false);
    }

    // 7. Update OrbitControls & Render
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  onWindowResize() {
    this.width = this.container.clientWidth;
    this.height = this.container.clientHeight;
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height);
  }
}
