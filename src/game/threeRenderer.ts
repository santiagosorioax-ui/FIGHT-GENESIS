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

    this.ambientLight = new THREE.AmbientLight(0xfff7ed, 1.6);
    this.scene.add(this.ambientLight);

    this.dirLight = new THREE.DirectionalLight(0xffedd5, 2.0);
    this.dirLight.position.set(4, 12, 6);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 1024;
    this.dirLight.shadow.mapSize.height = 1024;
    this.scene.add(this.dirLight);

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

    // Traditional Stone Tile Floor (matching Shadow Fight 3 courtyard)
    const floorCanvas = document.createElement('canvas');
    floorCanvas.width = 512;
    floorCanvas.height = 512;
    const ctx = floorCanvas.getContext('2d')!;
    ctx.fillStyle = stage.groundColor;
    ctx.fillRect(0, 0, 512, 512);

    // Weathered flagstone tile grid
    ctx.strokeStyle = '#2d241e';
    ctx.lineWidth = 4;
    const tileW = 128;
    const tileH = 64;
    for (let y = 0; y < 512; y += tileH) {
      const offsetX = (y / tileH) % 2 === 0 ? 0 : tileW / 2;
      for (let x = -tileW; x < 512 + tileW; x += tileW) {
        ctx.strokeRect(x + offsetX, y, tileW, tileH);
      }
    }

    const floorTexture = new THREE.CanvasTexture(floorCanvas);
    floorTexture.wrapS = THREE.RepeatWrapping;
    floorTexture.wrapT = THREE.RepeatWrapping;
    floorTexture.repeat.set(6, 4);

    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTexture,
      roughness: 0.8,
      metalness: 0.1
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
    const isKaelen = entity.fighter.id === 'kaelen';

    // Materials
    const torsoColor = new THREE.Color(entity.fighter.primaryColor);
    const secColor = new THREE.Color(entity.fighter.secondaryColor);

    const torsoMat = new THREE.MeshStandardMaterial({
      color: torsoColor,
      roughness: isKaelen ? 0.35 : 0.6,
      metalness: isKaelen ? 0.85 : 0.4
    });

    const skullMat = new THREE.MeshStandardMaterial({
      color: isKaelen ? 0x94a3b8 : 0xd97706,
      roughness: 0.5,
      metalness: isKaelen ? 0.7 : 0.2
    });

    const visorMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(entity.fighter.accentColor)
    });

    const limbMat = new THREE.MeshStandardMaterial({
      color: secColor,
      roughness: 0.5,
      metalness: isKaelen ? 0.75 : 0.3
    });

    // Torso (Armored Chestplate & Lamellar Faulds)
    const torsoGeo = new THREE.BoxGeometry(0.68, 0.95, 0.42);
    const torso = new THREE.Mesh(torsoGeo, torsoMat);
    torso.position.y = 1.35;
    torso.castShadow = true;
    root.add(torso);

    // Head (Helmet / Headband)
    const head = new THREE.Group();
    head.position.set(0, 1.95, 0);

    const skullGeo = new THREE.BoxGeometry(0.36, 0.4, 0.36);
    const skull = new THREE.Mesh(skullGeo, skullMat);
    head.add(skull);

    // Eyes / Shadow Visor (glows cyan in Shadow Form)
    const visorGeo = new THREE.BoxGeometry(0.32, 0.08, 0.08);
    const visor = new THREE.Mesh(visorGeo, visorMat);
    visor.position.set(0, 0.02, 0.18);
    head.add(visor);
    root.add(head);

    // Arms
    const shoulderGeo = new THREE.BoxGeometry(0.3, 0.26, 0.3);
    const armGeo = new THREE.BoxGeometry(0.2, 0.6, 0.2);

    // Left Arm
    const leftArm = new THREE.Group();
    leftArm.position.set(-0.46, 1.65, 0);
    const leftShoulder = new THREE.Mesh(shoulderGeo, limbMat);
    leftArm.add(leftShoulder);
    const leftForearm = new THREE.Mesh(armGeo, torsoMat);
    leftForearm.position.y = -0.35;
    leftForearm.castShadow = true;
    leftArm.add(leftForearm);
    root.add(leftArm);

    // Right Arm
    const rightArm = new THREE.Group();
    rightArm.position.set(0.46, 1.65, 0);
    const rightShoulder = new THREE.Mesh(shoulderGeo, limbMat);
    rightArm.add(rightShoulder);
    const rightForearm = new THREE.Mesh(armGeo, torsoMat);
    rightForearm.position.y = -0.35;
    rightForearm.castShadow = true;
    rightArm.add(rightForearm);

    // Weapons
    const weaponGroup = new THREE.Group();
    if (isKaelen) {
      // Serrated Two-Handed Flamberge
      const bladeGeo = new THREE.BoxGeometry(0.12, 1.6, 0.04);
      const bladeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.2, metalness: 0.95 });
      const blade = new THREE.Mesh(bladeGeo, bladeMat);
      blade.position.y = -0.8;
      blade.castShadow = true;
      weaponGroup.add(blade);

      const crossguardGeo = new THREE.BoxGeometry(0.5, 0.08, 0.1);
      const guardMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.9 });
      const crossguard = new THREE.Mesh(crossguardGeo, guardMat);
      crossguard.position.y = 0.02;
      weaponGroup.add(crossguard);

      weaponGroup.position.set(0.1, -0.4, 0.4);
      weaponGroup.rotation.x = Math.PI / 3;
      rightArm.add(weaponGroup);
    } else {
      // REN ZHAO: Verdant Tempest Guandao Polearm
      const poleGeo = new THREE.CylinderGeometry(0.04, 0.04, 2.2, 8);
      const woodShaftMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.7 });
      const pole = new THREE.Mesh(poleGeo, woodShaftMat);
      pole.position.y = 0.2;
      pole.castShadow = true;
      weaponGroup.add(pole);

      // Curved Naginata Blade
      const bladeGeo = new THREE.BoxGeometry(0.14, 0.8, 0.03);
      const steelMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.95, roughness: 0.2 });
      const curvedBlade = new THREE.Mesh(bladeGeo, steelMat);
      curvedBlade.position.set(0.05, 1.25, 0);
      curvedBlade.rotation.z = -0.15;
      curvedBlade.castShadow = true;
      weaponGroup.add(curvedBlade);

      // Red Decorative Silk Tassel
      const tasselGeo = new THREE.ConeGeometry(0.1, 0.25, 6);
      const tasselMat = new THREE.MeshBasicMaterial({ color: 0xdc2626 });
      const tassel = new THREE.Mesh(tasselGeo, tasselMat);
      tassel.position.set(0, 0.82, 0);
      weaponGroup.add(tassel);

      weaponGroup.position.set(0, -0.3, 0.4);
      weaponGroup.rotation.x = Math.PI / 4;
      rightArm.add(weaponGroup);
    }
    root.add(rightArm);

    // Legs
    const legGeo = new THREE.BoxGeometry(0.24, 0.85, 0.24);

    const leftLeg = new THREE.Group();
    leftLeg.position.set(-0.22, 0.9, 0);
    const leftThigh = new THREE.Mesh(legGeo, torsoMat);
    leftThigh.position.y = -0.42;
    leftThigh.castShadow = true;
    leftLeg.add(leftThigh);
    root.add(leftLeg);

    const rightLeg = new THREE.Group();
    rightLeg.position.set(0.22, 0.9, 0);
    const rightThigh = new THREE.Mesh(legGeo, torsoMat);
    rightThigh.position.y = -0.42;
    rightThigh.castShadow = true;
    rightLeg.add(rightThigh);
    root.add(rightLeg);

    const lightSource = new THREE.PointLight(torsoColor, 1.2, 3.5);
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
        f3d.torso.position.y = 1.35 + breath;
        if (isRen) {
          // Guandao / Naginata guard
          f3d.leftArm.rotation.x = 0.9;
          f3d.leftArm.rotation.z = -0.4;
          f3d.rightArm.rotation.x = 1.1;
          f3d.leftLeg.rotation.x = -0.15;
          f3d.rightLeg.rotation.x = 0.25;
        } else {
          // Flamberge greatsword guard
          f3d.torso.rotation.x = 0.15;
          f3d.leftArm.rotation.x = 0.7;
          f3d.rightArm.rotation.x = 0.6;
          f3d.leftLeg.rotation.x = 0.35;
          f3d.rightLeg.rotation.x = -0.35;
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
