export type AttackType = 'LIGHT' | 'HEAVY' | 'KICK' | 'SPECIAL' | 'SHADOW_ABILITY' | 'RANGED' | 'THROW';
export type Faction = 'Legion' | 'Dynasty' | 'Heralds';

export interface MoveData {
  id: string;
  name: string;
  type: AttackType;
  damage: number;
  shadowGain: number;
  costShadow: number;
  startupFrames: number;
  activeFrames: number;
  recoveryFrames: number;
  hitstunFrames: number;
  blockstunFrames: number;
  knockback: number;
  launchY?: number;
  wallSplat?: boolean;
  isShadowMove?: boolean;
  description: string;
  command: string;
}

export interface FighterStats {
  id: string;
  name: string;
  title: string;
  faction: Faction;
  weaponName: string;
  weaponType: 'Guandao / Naginata' | 'Two-Handed Flamberge' | 'Iaido Katana' | 'Heavy Broadsword';
  description: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  portraitUrl: string;
  maxHealth: number;
  speed: number;
  jumpForce: number;
  weight: number;
  moves: {
    weapon: MoveData;
    heavy: MoveData;
    kick: MoveData;
    special: MoveData;
    ranged: MoveData;
    shadowAbility: MoveData;
    throw: MoveData;
  };
}

export interface StageProp {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  depth: number;
  health: number;
  maxHealth: number;
  broken: boolean;
  type: 'lantern' | 'barricade' | 'pottery' | 'gate' | 'pillar';
  color: string;
}

export interface StageData {
  id: string;
  name: string;
  subtitle: string;
  backdropUrl: string;
  skyColor: string;
  groundColor: string;
  ambientLight: string;
  themeColor: string;
  props: StageProp[];
  description: string;
}

export type FighterState = 
  | 'IDLE' 
  | 'WALK_FWD' 
  | 'WALK_BACK' 
  | 'CROUCH' 
  | 'JUMP' 
  | 'WEAPON_ATK' 
  | 'HEAVY_ATK' 
  | 'KICK_ATK' 
  | 'SPECIAL_ATK' 
  | 'SHADOW_FORM_ENTER'
  | 'SHADOW_ABILITY' 
  | 'RANGED_ATK'
  | 'THROW'
  | 'BLOCK' 
  | 'PERFECT_PARRY' 
  | 'HITSTUN' 
  | 'KNOCKDOWN' 
  | 'WALL_SPLAT' 
  | 'VICTORY' 
  | 'DEFEAT';

export interface CombatEntity {
  id: 'p1' | 'p2';
  fighter: FighterStats;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  health: number;
  shadowEnergy: number; // 0 - 100 (Shadow Fight 3 Cyan Bar)
  isShadowForm: boolean;
  shadowFormTimer: number; // Duration frames in Shadow Form
  guardMeter: number;
  state: FighterState;
  stateFrame: number;
  currentMove: MoveData | null;
  hasHitInMove: boolean;
  isGrounded: boolean;
  isBlocking: boolean;
  isParrying: boolean;
  parryWindow: number;
  comboCount: number;
  comboDamage: number;
  roundsWon: number;
  rangedCooldown: number;
}

export interface HitEffect {
  x: number;
  y: number;
  z: number;
  color: string;
  size: number;
  type: 'slash' | 'sparks' | 'heavy' | 'parry' | 'shadow' | 'debris';
}

export interface InputState {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  weapon: boolean; // Main weapon strike
  heavy: boolean;  // Heavy strike
  kick: boolean;   // Unarmed kick
  special: boolean;// Martial arts specialty
  shadow: boolean; // Enter Shadow Form / Shadow Ability
  ranged: boolean; // Shuriken / Kunai throw
  throw: boolean;  // Close-up grapple takedown
  parry: boolean;  // Guard / Block
}

export type GameMode = 'ONLINE' | 'LOCAL_VS' | 'ARCADE' | 'TRAINING';
