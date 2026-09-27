import * as THREE from 'three';
import { CombatEntity, StageData, StageProp, HitEffect } from '../types/fighter';

interface Particle {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  rx: number;
  ry: number;
  rz: number;
  life: number;
  maxLife: number;
  gravity: number;
}

interface Fighter3D {
  root: THREE.Group;
  torso: THREE.Mesh;
  head: THREE.Group;
  visor: THREE.Mesh;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  weapon: THREE.Group | null;
  lightSource: THREE.PointLight;
  shadowDecal: THREE.Mesh;
  materials: {
    torsoMat: THREE.MeshStandardMaterial;
    skullMat: THREE.MeshStandardMaterial;
    visorMat: THREE.MeshBasicMaterial;
    limbMat: THREE.MeshStandardMaterial;
  };
}

export class FightRenderer {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private ambientLight: THREE.AmbientLight;
  private dirLight: THREE.DirectionalLight;
  private stageGroup: THREE.Group;
  private fightersGroup: THREE.Group;
  private fxGroup: THREE.Group;
  private stagePropsMap: Map<string, { group: THREE.Group; prop: StageProp; pieces: THREE.Mesh[] }> = new Map();
  private particles: Particle[] = [];
  private fighters: { p1: Fighter3D | null; p2: Fighter3D | null } = { p1: null, p2: null };
  private stageGround: THREE.Mesh | null = null;
  private bgPlane: THREE.Mesh | null = null;

  // Camera Shake & Cinematic FX
  private shakeIntensity: number = 0;
  private shakeDecay: number = 0.9;
  private cameraTarget: THREE.Vector3 = new THREE.Vector3(0, 1.8, 0);
  private shadowFlashTimer: number = 0;
  private hitstopFrames: number = 0;

  constructor(container: HTMLElement) {
    this.container = container;
    const width = container.clientWidth || 1280;
    const height = container.clientHeight || 720;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x111827, 0.02);

    this.camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    this.camera.position.set(0, 1.85, 8.8);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    container.appendChild(this.renderer.domElement);

    this.stageGroup = new THREE.Group();
    this.fightersGroup = new THREE.Group();
    this.fxGroup = new THREE.Group();

    this.scene.add(this.stageGroup);
    this.scene.add(this.fightersGroup);
    this.scene.add(this.fxGroup);

    // Fighting Game 3-Point Studio Lighting matching reference screenshot
    this.ambientLight = new THREE.AmbientLight(0xfff7ed, 1.35);
    this.scene.add(this.ambientLight);

    // Key Light (Sunlight from top-front-right with crisp shadows)
    this.dirLight = new THREE.DirectionalLight(0xffedd5, 2.2);
    this.dirLight.position.set(4, 12, 6);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 2048;
    this.dirLight.shadow.mapSize.height = 2048;
    this.dirLight.shadow.bias = -0.0004;
    this.scene.add(this.dirLight);

    // Rim Backlight (Sharp cool cyan/silver edge lighting on armor and hair from screenshot)
    const rimLight = new THREE.DirectionalLight(0xbae6fd, 1.9);
    rimLight.position.set(-6, 8, -5);
    this.scene.add(rimLight);

    // Ground bounce fill light
    const fillLight = new THREE.DirectionalLight(0xfef3c7, 0.75);
    fillLight.position.set(0, -3, 4);
    this.scene.add(fillLight);

    window.addEventListener('resize', this.onResize);
  }

  private onResize = () => {
    if (!this.container) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  public initStage(stage: StageData) {
    while (this.stageGroup.children.length > 0) {
      this.stageGroup.remove(this.stageGroup.children[0]);
    }
    this.stagePropsMap.clear();

    this.scene.background = new THREE.Color(stage.skyColor);
    if (this.scene.fog) {
      this.scene.fog.color = new THREE.Color(stage.skyColor);
    }
    this.ambientLight.color = new THREE.Color(stage.ambientLight);

    // Cinematic Stage Backdrop image plane (Temple Courtyard / Dojo / Fortress)
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(stage.backdropUrl, (bgTexture) => {
      bgTexture.colorSpace = THREE.SRGBColorSpace;
      const bgGeo = new THREE.PlaneGeometry(24, 12);
      const bgMat = new THREE.MeshBasicMaterial({ map: bgTexture, depthWrite: false });
      this.bgPlane = new THREE.Mesh(bgGeo, bgMat);
      this.bgPlane.position.set(0, 4.5, -4.5);
      this.stageGroup.add(this.bgPlane);
    });

    // Traditional Stone Paver Patio Floor matching the user screenshot exactly
    const floorCanvas = document.createElement('canvas');
    floorCanvas.width = 1024;
    floorCanvas.height = 1024;
    const ctx = floorCanvas.getContext('2d')!;

    // Warm sand/limestone paver base from the reference photo
    ctx.fillStyle = '#c7b28a';
    ctx.fillRect(0, 0, 1024, 1024);

    // Alternating weathered paver stone shades
    const tileW = 256;
    const tileH = 128;
    const tileColors = ['#ccb78f', '#be9e71', '#c3ab83', '#baa075', '#c8b38d'];

    for (let y = 0; y < 1024; y += tileH) {
      const rowIdx = Math.floor(y / tileH);
      const offsetX = rowIdx % 2 === 0 ? 0 : tileW / 2;
      for (let x = -tileW; x < 1024 + tileW; x += tileW) {
        const color = tileColors[(Math.floor((x + 1000) / tileW) + rowIdx * 3) % tileColors.length];
        ctx.fillStyle = color;
        ctx.fillRect(x + offsetX + 3, y + 3, tileW - 6, tileH - 6);

        // Stone texture grain & subtle cracks
        ctx.fillStyle = 'rgba(0,0,0,0.04)';
        ctx.fillRect(x + offsetX + 8, y + 8, tileW - 16, tileH - 16);

        // Dark charcoal brown mortar joint
        ctx.strokeStyle = '#382918';
        ctx.lineWidth = 4;
        ctx.strokeRect(x + offsetX, y, tileW, tileH);
      }
    }

    const floorTexture = new THREE.CanvasTexture(floorCanvas);
    floorTexture.wrapS = THREE.RepeatWrapping;
    floorTexture.wrapT = THREE.RepeatWrapping;
    floorTexture.repeat.set(5, 4);

    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTexture,
      roughness: 0.75,
      metalness: 0.08
    });

    const floorGeo = new THREE.PlaneGeometry(36, 16);
    this.stageGround = new THREE.Mesh(floorGeo, floorMat);
    this.stageGround.rotation.x = -Math.PI / 2;
    this.stageGround.position.y = 0;
    this.stageGround.receiveShadow = true;
    this.stageGroup.add(this.stageGround);

    // Destructible Stage Props (Stone Lanterns, Ceramic Urns, Bamboo Gates)
    for (const prop of stage.props) {
      const propGroup = new THREE.Group();
      propGroup.position.set(prop.x, prop.y, prop.z);
      const pieces: THREE.Mesh[] = [];

      if (prop.type === 'lantern') {
        // Ancient Stone Lantern with glowing aperture
        const baseGeo = new THREE.BoxGeometry(prop.width, 0.4, prop.depth);
        const stoneMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.9 });
        const base = new THREE.Mesh(baseGeo, stoneMat);
        base.position.y = -prop.height / 2 + 0.2;
        propGroup.add(base);

        const pillarGeo = new THREE.CylinderGeometry(prop.width * 0.35, prop.width * 0.4, prop.height * 0.6, 6);
        const pillar = new THREE.Mesh(pillarGeo, stoneMat);
        pillar.castShadow = true;
        propGroup.add(pillar);
        pieces.push(pillar);

        const lightBoxGeo = new THREE.BoxGeometry(prop.width * 0.7, 0.6, prop.depth * 0.7);
        const glowMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
        const lanternLight = new THREE.Mesh(lightBoxGeo, glowMat);
        lanternLight.position.y = prop.height * 0.25;
        propGroup.add(lanternLight);
        pieces.push(lanternLight);

        const roofGeo = new THREE.ConeGeometry(prop.width * 0.8, 0.4, 6);
        const roof = new THREE.Mesh(roofGeo, stoneMat);
        roof.position.y = prop.height * 0.55;
        propGroup.add(roof);
        pieces.push(roof);

      } else if (prop.type === 'pottery') {
        // Ceramic Clay Urn
        const potGeo = new THREE.CylinderGeometry(prop.width * 0.35, prop.width * 0.5, prop.height, 12);
        const clayMat = new THREE.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.6 });
        const pot = new THREE.Mesh(potGeo, clayMat);
        pot.castShadow = true;
        propGroup.add(pot);
        pieces.push(pot);

      } else {
        // Bamboo / Wood Barricade
        const woodGeo = new THREE.BoxGeometry(prop.width, prop.height, prop.depth);
        const woodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.85 });
        const bar = new THREE.Mesh(woodGeo, woodMat);
        bar.castShadow = true;
        propGroup.add(bar);
        pieces.push(bar);
      }

      this.stageGroup.add(propGroup);
      this.stagePropsMap.set(prop.id, { group: propGroup, prop, pieces });
    }
  }

  public createFighter(entity: CombatEntity): Fighter3D {
    const root = new THREE.Group();
    const isTaiga = entity.fighter.id === 'kaelen';

    // Core Materials matching reference screenshot
    // TAIGA: Polished steel plate, brass trims, dark crimson tunic & pants, auburn hair
    // TSUNAMI: Emerald/gold lamellar armor, red sash belt, white baggy pants, bronze circlet helmet
    const torsoMat = new THREE.MeshStandardMaterial({
      color: isTaiga ? 0xd1d5db : 0x059669,
      roughness: isTaiga ? 0.25 : 0.6,
      metalness: isTaiga ? 0.92 : 0.35
    });

    const skullMat = new THREE.MeshStandardMaterial({
      color: isTaiga ? 0x9a3412 : 0xb45309, // Taiga: auburn hair; Tsunami: bronze helmet
      roughness: isTaiga ? 0.85 : 0.35,
      metalness: isTaiga ? 0.05 : 0.8
    });

    const visorMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(entity.fighter.accentColor)
    });

    const limbMat = new THREE.MeshStandardMaterial({
      color: isTaiga ? 0x7f1d1d : 0xf8fafc, // Taiga: dark crimson fabric; Tsunami: white baggy martial pants
      roughness: 0.7,
      metalness: 0.1
    });

    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      metalness: 0.85,
      roughness: 0.3
    });

    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xf5d0b5,
      roughness: 0.75
    });

    const steelMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.95,
      roughness: 0.2
    });

    // 1. ANATOMICAL TORSO & CHESTPLATE (Smooth rounded curves, NO cubic boxes)
    const torsoGroup = new THREE.Group();
    torsoGroup.position.y = 1.35;

    // Muscular chest cuirass (tapered anatomical cylinder)
    const chestGeo = new THREE.CylinderGeometry(0.35, 0.27, 0.58, 20);
    const chest = new THREE.Mesh(chestGeo, torsoMat);
    chest.position.y = 0.12;
    chest.castShadow = true;
    torsoGroup.add(chest);

    // Anatomical Pectoral / Rib Plating (curved rounded breastplate)
    const pecGeo = new THREE.SphereGeometry(0.18, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.7);
    const leftPec = new THREE.Mesh(pecGeo, isTaiga ? steelMat : torsoMat);
    leftPec.position.set(-0.13, 0.22, 0.16);
    leftPec.rotation.x = Math.PI / 4;
    leftPec.scale.set(1.1, 0.8, 0.5);
    torsoGroup.add(leftPec);

    const rightPec = new THREE.Mesh(pecGeo, isTaiga ? steelMat : torsoMat);
    rightPec.position.set(0.13, 0.22, 0.16);
    rightPec.rotation.x = Math.PI / 4;
    rightPec.scale.set(1.1, 0.8, 0.5);
    torsoGroup.add(rightPec);

    // Abdomen / Tassets (tapered lower torso)
    const waistGeo = new THREE.CylinderGeometry(0.27, 0.31, 0.38, 20);
    const waist = new THREE.Mesh(waistGeo, isTaiga ? torsoMat : limbMat);
    waist.position.y = -0.3;
    waist.castShadow = true;
    torsoGroup.add(waist);

    // Anatomical Neck
    const neckGeo = new THREE.CylinderGeometry(0.12, 0.135, 0.2, 16);
    const neck = new THREE.Mesh(neckGeo, skinMat);
    neck.position.y = 0.44;
    torsoGroup.add(neck);

    if (isTaiga) {
      // KAELEN: Golden Gorget Ring & Chest Trim
      const gorgetGeo = new THREE.TorusGeometry(0.18, 0.04, 12, 24);
      const gorget = new THREE.Mesh(gorgetGeo, goldMat);
      gorget.position.set(0, 0.4, 0.04);
      gorget.rotation.x = Math.PI / 2.3;
      torsoGroup.add(gorget);

      // Steel Cuirass Medial Ridge
      const ridgeGeo = new THREE.CylinderGeometry(0.025, 0.035, 0.52, 12);
      const ridge = new THREE.Mesh(ridgeGeo, goldMat);
      ridge.position.set(0, 0.12, 0.22);
      torsoGroup.add(ridge);
    } else {
      // REN ZHAO: Crimson Red Waist Sash Belt from screenshot
      const sashGeo = new THREE.TorusGeometry(0.31, 0.07, 14, 24);
      const sashMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.65 });
      const sash = new THREE.Mesh(sashGeo, sashMat);
      sash.position.set(0, -0.22, 0);
      sash.rotation.x = Math.PI / 2;
      torsoGroup.add(sash);

      // Gold scale trim on chest
      const trimGeo = new THREE.CylinderGeometry(0.355, 0.355, 0.12, 20);
      const trim = new THREE.Mesh(trimGeo, goldMat);
      trim.position.set(0, 0.18, 0);
      torsoGroup.add(trim);
    }
    root.add(torsoGroup);
    const torso = chest; // Reference for animation position

    // 2. REALISTIC ANATOMICAL HEAD & HAIR/HELMET (Smooth rounded cranium)
    const head = new THREE.Group();
    head.position.set(0, 1.95, 0);

    // Anatomical Human Cranium & Face
    const headGeo = new THREE.SphereGeometry(0.19, 24, 20);
    const face = new THREE.Mesh(headGeo, skinMat);
    face.scale.set(0.92, 1.15, 1.05);
    head.add(face);

    // Jaw / Chin contour
    const chinGeo = new THREE.CylinderGeometry(0.11, 0.08, 0.14, 16);
    const chin = new THREE.Mesh(chinGeo, skinMat);
    chin.position.set(0, -0.12, 0.06);
    head.add(chin);

    if (isTaiga) {
      // KAELEN: Sculpted layered auburn/reddish hair (smooth rounded volume)
      const hairCrownGeo = new THREE.SphereGeometry(0.205, 20, 16);
      const hairCrown = new THREE.Mesh(hairCrownGeo, skullMat);
      hairCrown.position.set(0, 0.06, -0.02);
      hairCrown.scale.set(0.96, 1.05, 1.02);
      head.add(hairCrown);

      // Layered hair locks
      const lockGeo = new THREE.ConeGeometry(0.06, 0.16, 8);
      for (let h = -2; h <= 2; h++) {
        const lock = new THREE.Mesh(lockGeo, skullMat);
        lock.position.set(h * 0.06, 0.18, 0.14);
        lock.rotation.set(-0.35, 0, h * 0.2);
        head.add(lock);
      }
    } else {
      // REN ZHAO: Bronze warrior helmet / headband with crest and flowing topknot plume
      const domeGeo = new THREE.SphereGeometry(0.21, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.55);
      const dome = new THREE.Mesh(domeGeo, skullMat);
      dome.position.set(0, 0.06, 0);
      head.add(dome);

      const headbandGeo = new THREE.TorusGeometry(0.205, 0.035, 12, 24);
      const headband = new THREE.Mesh(headbandGeo, goldMat);
      headband.position.set(0, 0.05, 0.02);
      headband.rotation.x = Math.PI / 2.2;
      head.add(headband);

      // Topknot plume
      const topknotGeo = new THREE.CylinderGeometry(0.04, 0.08, 0.32, 12);
      const topknotMat = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.9 });
      const topknot = new THREE.Mesh(topknotGeo, topknotMat);
      topknot.position.set(0, 0.28, -0.08);
      topknot.rotation.x = -0.25;
      head.add(topknot);

      const redTie = new THREE.TorusGeometry(0.06, 0.025, 8, 16);
      const redTieMesh = new THREE.Mesh(redTie, new THREE.MeshBasicMaterial({ color: 0xdc2626 }));
      redTieMesh.position.set(0, 0.18, -0.05);
      head.add(redTieMesh);
    }

    // Eyes / Shadow Visor (glows cyan in Shadow Form)
    const visorGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.26, 12);
    const visor = new THREE.Mesh(visorGeo, visorMat);
    visor.position.set(0, 0.02, 0.18);
    visor.rotation.z = Math.PI / 2;
    head.add(visor);
    root.add(head);

    // 3. ANATOMICAL SMOOTH ARMS & CURVED PAULDRONS
    // Curved Spherical Pauldron (Shoulder Plate)
    const pauldronGeo = new THREE.SphereGeometry(0.22, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.65);
    const upperArmGeo = new THREE.CapsuleGeometry(0.105, 0.28, 12, 16);
    const forearmGeo = new THREE.CylinderGeometry(0.085, 0.11, 0.36, 16);
    const handGeo = new THREE.SphereGeometry(0.085, 12, 12);

    // Left Arm
    const leftArm = new THREE.Group();
    leftArm.position.set(-0.46, 1.65, 0);

    const leftPauldron = new THREE.Mesh(pauldronGeo, isTaiga ? goldMat : torsoMat);
    leftPauldron.rotation.z = Math.PI / 3;
    leftPauldron.position.set(-0.06, 0.06, 0);
    leftArm.add(leftPauldron);

    const leftUpperArm = new THREE.Mesh(upperArmGeo, isTaiga ? torsoMat : limbMat);
    leftUpperArm.position.y = -0.16;
    leftUpperArm.castShadow = true;
    leftArm.add(leftUpperArm);

    const leftForearm = new THREE.Mesh(forearmGeo, isTaiga ? steelMat : skinMat);
    leftForearm.position.y = -0.44;
    leftForearm.castShadow = true;
    leftArm.add(leftForearm);

    const leftHand = new THREE.Mesh(handGeo, isTaiga ? steelMat : skinMat);
    leftHand.position.y = -0.64;
    leftArm.add(leftHand);
    root.add(leftArm);

    // Right Arm
    const rightArm = new THREE.Group();
    rightArm.position.set(0.46, 1.65, 0);

    const rightPauldron = new THREE.Mesh(pauldronGeo, isTaiga ? goldMat : torsoMat);
    rightPauldron.rotation.z = -Math.PI / 3;
    rightPauldron.position.set(0.06, 0.06, 0);
    rightArm.add(rightPauldron);

    const rightUpperArm = new THREE.Mesh(upperArmGeo, isTaiga ? torsoMat : limbMat);
    rightUpperArm.position.y = -0.16;
    rightUpperArm.castShadow = true;
    rightArm.add(rightUpperArm);

    const rightForearm = new THREE.Mesh(forearmGeo, isTaiga ? steelMat : skinMat);
    rightForearm.position.y = -0.44;
    rightForearm.castShadow = true;
    rightArm.add(rightForearm);

    const rightHand = new THREE.Mesh(handGeo, isTaiga ? steelMat : skinMat);
    rightHand.position.y = -0.64;
    rightArm.add(rightHand);

    // 4. WEAPONS (Authentic Replicas of Reference Image)
    const weaponGroup = new THREE.Group();
    if (isTaiga) {
      // KAELEN: Wavy Sinusoidal Flamberge Greatsword
      const flambergeBlade = new THREE.Group();
      const waveCount = 11;
      const segH = 0.16;
      for (let w = 0; w < waveCount; w++) {
        // Continuous smooth sinusoidal wave curve
        const waveOffset = Math.sin(w * 1.35) * 0.04;
        const segGeo = new THREE.CylinderGeometry(0.055, 0.065, segH, 12);
        const seg = new THREE.Mesh(segGeo, steelMat);
        seg.position.set(waveOffset, -w * segH - 0.12, 0);
        seg.rotation.z = Math.cos(w * 1.35) * 0.22;
        seg.scale.set(0.45, 1.0, 1.8);
        seg.castShadow = true;
        flambergeBlade.add(seg);
      }
      weaponGroup.add(flambergeBlade);

      // Long two-handed cylindrical leather wrapped grip
      const hiltGeo = new THREE.CylinderGeometry(0.028, 0.032, 0.58, 12);
      const hiltMat = new THREE.MeshStandardMaterial({ color: 0x3d2012, roughness: 0.85 });
      const hilt = new THREE.Mesh(hiltGeo, hiltMat);
      hilt.position.y = 0.26;
      weaponGroup.add(hilt);

      // Spherical brass pommel
      const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 12), goldMat);
      pommel.position.y = 0.56;
      weaponGroup.add(pommel);

      // Golden curved crossguard with tapered quillons
      const guardGeo = new THREE.CylinderGeometry(0.035, 0.045, 0.62, 12);
      const crossguard = new THREE.Mesh(guardGeo, goldMat);
      crossguard.rotation.z = Math.PI / 2;
      crossguard.position.y = -0.02;
      weaponGroup.add(crossguard);

      weaponGroup.position.set(0.1, -0.4, 0.35);
      weaponGroup.rotation.x = Math.PI / 3.2;
      rightArm.add(weaponGroup);
    } else {
      // REN ZHAO: Verdant Tempest Guandao Polearm with Silk Tassel
      const poleGeo = new THREE.CylinderGeometry(0.032, 0.032, 2.4, 16);
      const woodShaftMat = new THREE.MeshStandardMaterial({ color: 0x271810, roughness: 0.7 });
      const pole = new THREE.Mesh(poleGeo, woodShaftMat);
      pole.position.y = 0.2;
      pole.castShadow = true;
      weaponGroup.add(pole);

      // Turned brass collar rings
      const ringGeo = new THREE.TorusGeometry(0.045, 0.015, 8, 16);
      const ring1 = new THREE.Mesh(ringGeo, goldMat);
      ring1.position.y = 0.98;
      ring1.rotation.x = Math.PI / 2;
      weaponGroup.add(ring1);

      // Red Silk Tassel (Cascading smooth cone)
      const tasselGeo = new THREE.ConeGeometry(0.09, 0.32, 12);
      const tasselMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
      const tassel = new THREE.Mesh(tasselGeo, tasselMat);
      tassel.position.set(0, 0.82, 0);
      weaponGroup.add(tassel);

      // Smooth curved Guandao falchion blade with spiked back hook
      const bladeGeo = new THREE.CylinderGeometry(0.02, 0.18, 0.92, 16);
      const curvedBlade = new THREE.Mesh(bladeGeo, steelMat);
      curvedBlade.position.set(0.08, 1.42, 0);
      curvedBlade.rotation.z = -0.22;
      curvedBlade.scale.set(0.25, 1.0, 1.5);
      curvedBlade.castShadow = true;
      weaponGroup.add(curvedBlade);

      weaponGroup.position.set(0, -0.3, 0.4);
      weaponGroup.rotation.x = Math.PI / 4;
      rightArm.add(weaponGroup);
    }
    root.add(rightArm);

    // 5. ANATOMICAL SMOOTH LEGS & BOOTS (Capsules & Cylinders, NO boxes)
    const thighGeo = new THREE.CapsuleGeometry(0.135, 0.44, 14, 16);
    const kneeGeo = new THREE.SphereGeometry(0.115, 14, 14);
    const calfGeo = new THREE.CylinderGeometry(0.125, 0.095, 0.44, 16);
    const footGeo = new THREE.CapsuleGeometry(0.095, 0.22, 10, 14);

    const bootMat = new THREE.MeshStandardMaterial({
      color: isTaiga ? 0x475569 : 0x3d2012, // Steel greaves vs brown leather boots
      metalness: isTaiga ? 0.88 : 0.15,
      roughness: 0.45
    });

    // Left Leg
    const leftLeg = new THREE.Group();
    leftLeg.position.set(-0.22, 0.9, 0);

    const leftThigh = new THREE.Mesh(thighGeo, limbMat);
    leftThigh.position.y = -0.28;
    leftThigh.castShadow = true;
    leftLeg.add(leftThigh);

    const leftKnee = new THREE.Mesh(kneeGeo, isTaiga ? steelMat : goldMat);
    leftKnee.position.set(0, -0.52, 0.04);
    leftLeg.add(leftKnee);

    const leftCalf = new THREE.Mesh(calfGeo, isTaiga ? steelMat : bootMat);
    leftCalf.position.y = -0.74;
    leftCalf.castShadow = true;
    leftLeg.add(leftCalf);

    const leftFoot = new THREE.Mesh(footGeo, bootMat);
    leftFoot.position.set(0, -0.96, 0.08);
    leftFoot.rotation.x = Math.PI / 2.2;
    leftLeg.add(leftFoot);
    root.add(leftLeg);

    // Right Leg
    const rightLeg = new THREE.Group();
    rightLeg.position.set(0.22, 0.9, 0);

    const rightThigh = new THREE.Mesh(thighGeo, limbMat);
    rightThigh.position.y = -0.28;
    rightThigh.castShadow = true;
    rightLeg.add(rightThigh);

    const rightKnee = new THREE.Mesh(kneeGeo, isTaiga ? steelMat : goldMat);
    rightKnee.position.set(0, -0.52, 0.04);
    rightLeg.add(rightKnee);

    const rightCalf = new THREE.Mesh(calfGeo, isTaiga ? steelMat : bootMat);
    rightCalf.position.y = -0.74;
    rightCalf.castShadow = true;
    rightLeg.add(rightCalf);

    const rightFoot = new THREE.Mesh(footGeo, bootMat);
    rightFoot.position.set(0, -0.96, 0.08);
    rightFoot.rotation.x = Math.PI / 2.2;
    rightLeg.add(rightFoot);
    root.add(rightLeg);

    const lightSource = new THREE.PointLight(isTaiga ? 0xffedd5 : 0xd1fae5, 1.2, 3.5);
    lightSource.position.set(0, 1.5, 0.5);
    root.add(lightSource);

    const shadowGeo = new THREE.CircleGeometry(0.55, 16);
    const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.5 });
    const shadowDecal = new THREE.Mesh(shadowGeo, shadowMat);
    shadowDecal.rotation.x = -Math.PI / 2;
    shadowDecal.position.y = 0.01;
    this.stageGroup.add(shadowDecal);

    this.fightersGroup.add(root);

    return {
      root,
      torso,
      head,
      visor,
      leftArm,
      rightArm,
      leftLeg,
      rightLeg,
      weapon: weaponGroup,
      lightSource,
      shadowDecal,
      materials: {
        torsoMat,
        skullMat,
        visorMat,
        limbMat
      }
    };
  }

  public updateFighterVisuals(
    slot: 'p1' | 'p2',
    entity: CombatEntity,
    opponent: CombatEntity
  ) {
    let f3d = this.fighters[slot];
    if (!f3d) {
      f3d = this.createFighter(entity);
      this.fighters[slot] = f3d;
    }

    f3d.root.position.set(entity.x, entity.y, 0);
    f3d.shadowDecal.position.set(entity.x, 0.01, 0);
    f3d.root.scale.set(entity.facing, 1, 1);

    // SHADOW FORM TRANSFORMATION (Iconic Shadow Fight 3 Silhouette)
    if (entity.isShadowForm) {
      f3d.materials.torsoMat.color.set(0x050508);
      f3d.materials.skullMat.color.set(0x050508);
      f3d.materials.limbMat.color.set(0x050508);
      f3d.materials.visorMat.color.set(0x22d3ee); // Glowing cyan eyes!
      f3d.lightSource.color.set(0x06b6d4);
      f3d.lightSource.intensity = 2.5;

      // Spawn periodic shadow vapor particles around the body
      if (Math.random() < 0.35) {
        this.spawnShadowVapor(entity.x, entity.y + 1.2);
      }
    } else {
      // Revert to natural armor
      f3d.materials.torsoMat.color.set(entity.fighter.primaryColor);
      f3d.materials.skullMat.color.set(entity.fighter.id === 'kaelen' ? 0x94a3b8 : 0xd97706);
      f3d.materials.limbMat.color.set(entity.fighter.secondaryColor);
      f3d.materials.visorMat.color.set(entity.fighter.accentColor);
      f3d.lightSource.color.set(entity.fighter.primaryColor);
      f3d.lightSource.intensity = 1.2;
    }

    if (this.hitstopFrames > 0) return;

    // Martial Arts Animations
    const time = performance.now() * 0.005;
    const { state, stateFrame } = entity;
    const isRen = entity.fighter.id === 'ren';

    // Reset base limb rotations
    f3d.torso.rotation.set(0, 0, 0);
    f3d.torso.position.y = 1.35;
    f3d.head.rotation.set(0, 0, 0);
    f3d.leftArm.rotation.set(0, 0, 0);
    f3d.rightArm.rotation.set(0, 0, 0);
    f3d.leftLeg.rotation.set(0, 0, 0);
    f3d.rightLeg.rotation.set(0, 0, 0);

    switch (state) {
      case 'IDLE':
        const breath = Math.sin(time * 3) * 0.03;
        if (isRen) {
          // TSUNAMI: Martial Crane Stance from reference screenshot
          // Right leg raised high in ready-kick, polearm held diagonally
          f3d.torso.rotation.x = -0.08;
          f3d.torso.position.y = 1.42 + breath;
          f3d.leftLeg.rotation.x = -0.12;
          f3d.rightLeg.rotation.x = 1.18; // High raised knee
          f3d.leftArm.rotation.x = 1.35;
          f3d.leftArm.rotation.z = -0.3;
          f3d.rightArm.rotation.x = 1.65;
          f3d.rightArm.rotation.z = 0.22;
        } else {
          // TAIGA: Low Two-Handed Fencing Ready Stance from reference screenshot
          // Knees bent, left leg back, wavy flamberge aimed forward towards Tsunami
          f3d.torso.rotation.x = 0.24;
          f3d.torso.position.y = 1.22 + breath;
          f3d.leftLeg.rotation.x = -0.45;
          f3d.rightLeg.rotation.x = 0.48;
          f3d.leftArm.rotation.x = 0.98;
          f3d.leftArm.rotation.z = 0.25;
          f3d.rightArm.rotation.x = 1.08;
          f3d.rightArm.rotation.z = -0.15;
        }
        break;

      case 'WALK_FWD':
        const walkFwd = Math.sin(time * 7);
        f3d.torso.position.y = 1.35 + Math.abs(walkFwd) * 0.04;
        f3d.leftLeg.rotation.x = walkFwd * 0.55;
        f3d.rightLeg.rotation.x = -walkFwd * 0.55;
        f3d.leftArm.rotation.x = 0.8 - walkFwd * 0.3;
        f3d.rightArm.rotation.x = 0.8 + walkFwd * 0.3;
        break;

      case 'WALK_BACK':
        const walkBack = Math.sin(time * 6);
        f3d.torso.position.y = 1.35 + Math.abs(walkBack) * 0.03;
        f3d.leftLeg.rotation.x = -walkBack * 0.45;
        f3d.rightLeg.rotation.x = walkBack * 0.45;
        f3d.leftArm.rotation.x = 0.9;
        f3d.rightArm.rotation.x = 0.9;
        break;

      case 'CROUCH':
        f3d.torso.position.y = 0.95;
        f3d.leftLeg.rotation.x = 1.15;
        f3d.rightLeg.rotation.x = 1.15;
        f3d.leftArm.rotation.x = 0.9;
        f3d.rightArm.rotation.x = 0.9;
        break;

      case 'JUMP':
        f3d.torso.position.y = 1.35;
        // Acrobatic flying posture from the user screenshot!
        f3d.leftLeg.rotation.x = -0.6;
        f3d.rightLeg.rotation.x = 0.8;
        f3d.rightArm.rotation.x = 2.4;
        break;

      case 'WEAPON_ATK':
        // Fast polearm thrust or sword cleave
        const wProg = stateFrame / 17;
        const wExtend = Math.sin(wProg * Math.PI);
        f3d.torso.rotation.y = 0.35 * wExtend;
        f3d.rightArm.rotation.x = 1.57 * wExtend + 0.4;
        f3d.rightArm.position.z = 0.5 * wExtend;
        break;

      case 'HEAVY_ATK':
        // Heavy overhead two-handed smash
        const hProg = stateFrame / 30;
        if (hProg < 0.35) {
          f3d.torso.rotation.x = -0.4;
          f3d.rightArm.rotation.x = 2.8;
          f3d.leftArm.rotation.x = 2.6;
        } else {
          const smash = Math.sin((hProg - 0.35) / 0.65 * Math.PI);
          f3d.torso.rotation.x = 0.4 * smash;
          f3d.rightArm.rotation.x = 0.8;
          f3d.leftArm.rotation.x = 0.8;
          f3d.rightArm.position.z = 0.6 * smash;
        }
        break;

      case 'KICK_ATK':
        // Acrobatic mid-air flying kick
        const kProg = stateFrame / 19;
        const kExtend = Math.sin(kProg * Math.PI);
        f3d.leftLeg.rotation.x = 1.8 * kExtend;
        f3d.torso.rotation.x = -0.3 * kExtend;
        break;

      case 'SPECIAL_ATK':
        // Dynasty sweep or Legion shoulder barge
        const spProg = stateFrame / 33;
        f3d.torso.rotation.y = spProg * Math.PI * 2;
        f3d.rightArm.rotation.x = 1.6;
        break;

      case 'SHADOW_FORM_ENTER':
      case 'SHADOW_ABILITY':
        // Cinematic Shadow Form Ascension
        const sProg = stateFrame / 50;
        f3d.torso.position.y = 1.7 + Math.sin(sProg * 10) * 0.15;
        f3d.leftArm.rotation.x = 2.5;
        f3d.rightArm.rotation.x = 2.5;
        f3d.leftLeg.rotation.x = -0.4;
        f3d.rightLeg.rotation.x = 0.3;
        break;

      case 'RANGED_ATK':
        // Shuriken / Kunai Throw
        const rProg = stateFrame / 22;
        f3d.rightArm.rotation.x = Math.sin(rProg * Math.PI) * 2.2;
        break;

      case 'BLOCK':
      case 'PERFECT_PARRY':
        f3d.leftArm.rotation.x = 1.4;
        f3d.rightArm.rotation.x = 1.5;
        f3d.torso.position.z = -0.12;
        break;

      case 'HITSTUN':
        f3d.torso.rotation.x = -0.4;
        f3d.head.rotation.x = -0.6;
        break;

      case 'KNOCKDOWN':
      case 'WALL_SPLAT':
        f3d.torso.rotation.z = 1.57 * entity.facing;
        f3d.torso.position.y = 0.25;
        break;

      case 'VICTORY':
        f3d.torso.position.y = 1.4;
        f3d.rightArm.rotation.x = 2.6;
        break;

      case 'DEFEAT':
        f3d.torso.rotation.x = 1.2;
        f3d.torso.position.y = 0.2;
        break;
    }
  }

  public triggerHitstop(frames: number = 6) {
    this.hitstopFrames = frames;
  }

  public triggerShadowFlash() {
    this.shadowFlashTimer = 35;
    this.triggerShake(0.5);
  }

  public triggerShake(intensity: number = 0.3) {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
  }

  public spawnShadowVapor(x: number, y: number) {
    const pGeo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
    const pMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.6 });
    const mesh = new THREE.Mesh(pGeo, pMat);
    mesh.position.set(x + (Math.random() - 0.5) * 0.4, y + (Math.random() - 0.5) * 0.6, 0);

    this.particles.push({
      mesh,
      vx: (Math.random() - 0.5) * 0.04,
      vy: Math.random() * 0.06 + 0.02,
      vz: (Math.random() - 0.5) * 0.04,
      rx: 0.1,
      ry: 0.1,
      rz: 0.1,
      life: 0,
      maxLife: 25,
      gravity: -0.002
    });
    this.fxGroup.add(mesh);
  }

  public spawnHitEffect(effect: HitEffect) {
    const pCount = effect.type === 'shadow' ? 28 : effect.type === 'heavy' ? 16 : 8;
    const color = new THREE.Color(effect.color);

    for (let i = 0; i < pCount; i++) {
      const pGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
      const pMat = new THREE.MeshBasicMaterial({ color });
      const mesh = new THREE.Mesh(pGeo, pMat);

      mesh.position.set(
        effect.x + (Math.random() - 0.5) * 0.25,
        effect.y + (Math.random() - 0.5) * 0.25,
        effect.z + (Math.random() - 0.5) * 0.25
      );

      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 0.22 + 0.1;

      this.particles.push({
        mesh,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed + 0.06,
        vz: (Math.random() - 0.5) * speed,
        rx: Math.random() * 0.2,
        ry: Math.random() * 0.2,
        rz: Math.random() * 0.2,
        life: 0,
        maxLife: Math.floor(Math.random() * 18 + 14),
        gravity: 0.012
      });

      this.fxGroup.add(mesh);
    }

    // Shadow / Parry Energy Shockwave Ring
    if (effect.type === 'shadow' || effect.type === 'parry' || effect.type === 'heavy') {
      const ringGeo = new THREE.RingGeometry(0.1, 0.25, 24);
      const ringMat = new THREE.MeshBasicMaterial({
        color: effect.type === 'shadow' ? 0x06b6d4 : color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.set(effect.x, effect.y, effect.z + 0.1);

      this.particles.push({
        mesh: ring,
        vx: 0,
        vy: 0,
        vz: 0,
        rx: 0,
        ry: 0,
        rz: 0,
        life: 0,
        maxLife: 15,
        gravity: 0
      });
      this.fxGroup.add(ring);
    }
  }

  public damageStageProp(propId: string, damage: number, impactX: number, impactY: number) {
    const item = this.stagePropsMap.get(propId);
    if (!item) return;

    item.prop.health = Math.max(0, item.prop.health - damage);

    const debrisColor = new THREE.Color(item.prop.color);
    const chunkCount = item.prop.health <= 0 ? 22 : 6;

    for (let i = 0; i < chunkCount; i++) {
      const dSize = Math.random() * 0.14 + 0.06;
      const dGeo = new THREE.BoxGeometry(dSize, dSize, dSize);
      const dMat = new THREE.MeshStandardMaterial({ color: debrisColor, roughness: 0.85 });
      const dMesh = new THREE.Mesh(dGeo, dMat);

      dMesh.position.set(
        impactX + (Math.random() - 0.5) * 0.4,
        impactY + (Math.random() - 0.5) * 0.4,
        item.prop.z + (Math.random() - 0.5) * 0.4
      );

      const angle = (Math.random() - 0.5) * Math.PI;
      const speed = Math.random() * 0.18 + 0.08;

      this.particles.push({
        mesh: dMesh,
        vx: Math.cos(angle) * speed,
        vy: Math.random() * 0.22 + 0.1,
        vz: (Math.random() - 0.5) * speed,
        rx: Math.random() * 0.25,
        ry: Math.random() * 0.25,
        rz: Math.random() * 0.25,
        life: 0,
        maxLife: 40,
        gravity: 0.015
      });
      this.fxGroup.add(dMesh);
    }

    if (item.prop.health <= 0 && !item.prop.broken) {
      item.prop.broken = true;
      item.pieces.forEach((piece) => {
        piece.rotation.z += (Math.random() - 0.5) * 0.6;
        piece.position.y = Math.max(0.1, piece.position.y - 0.35);
      });
    }
  }

  public render(p1: CombatEntity, p2: CombatEntity) {
    if (this.hitstopFrames > 0) {
      this.hitstopFrames--;
    }

    // Dynamic Camera (frames both fighters cleanly as in Shadow Fight 3)
    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2 + 1.5;
    const dist = Math.abs(p1.x - p2.x);

    const targetCamX = midX * 0.55;
    const targetCamY = Math.max(1.7, midY * 0.6);
    const targetCamZ = Math.min(10.5, Math.max(6.8, 5.0 + dist * 0.65));

    this.camera.position.x += (targetCamX - this.camera.position.x) * 0.09;
    this.camera.position.y += (targetCamY - this.camera.position.y) * 0.09;
    this.camera.position.z += (targetCamZ - this.camera.position.z) * 0.09;

    this.cameraTarget.set(midX, midY, 0);
    this.camera.lookAt(this.cameraTarget);

    if (this.shakeIntensity > 0.01) {
      this.camera.position.x += (Math.random() - 0.5) * this.shakeIntensity;
      this.camera.position.y += (Math.random() - 0.5) * this.shakeIntensity;
      this.shakeIntensity *= this.shakeDecay;
    }

    // Shadow Flash Effect (Darkens background into mystical cyan atmosphere)
    if (this.shadowFlashTimer > 0) {
      this.shadowFlashTimer--;
      this.ambientLight.intensity = 0.3;
    } else {
      this.ambientLight.intensity = 1.6;
    }

    // Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life++;

      if (p.mesh.geometry instanceof THREE.RingGeometry) {
        p.mesh.scale.multiplyScalar(1.15);
        const mat = p.mesh.material as THREE.MeshBasicMaterial;
        mat.opacity = 1 - p.life / p.maxLife;
      } else {
        p.mesh.position.x += p.vx;
        p.mesh.position.y += p.vy;
        p.mesh.position.z += p.vz;
        p.vy -= p.gravity;

        p.mesh.rotation.x += p.rx;
        p.mesh.rotation.y += p.ry;
        p.mesh.rotation.z += p.rz;

        if (p.mesh.position.y < 0.05) {
          p.mesh.position.y = 0.05;
          p.vy = -p.vy * 0.35;
          p.vx *= 0.8;
          p.vz *= 0.8;
        }
      }

      if (p.life >= p.maxLife) {
        this.fxGroup.remove(p.mesh);
        p.mesh.geometry.dispose();
        if (Array.isArray(p.mesh.material)) {
          p.mesh.material.forEach(m => m.dispose());
        } else {
          p.mesh.material.dispose();
        }
        this.particles.splice(i, 1);
      }
    }

    this.renderer.render(this.scene, this.camera);
  }

  public dispose() {
    window.removeEventListener('resize', this.onResize);
    this.renderer.dispose();
    if (this.container && this.renderer.domElement) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
