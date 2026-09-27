import {
  CombatEntity,
  FighterStats,
  FighterState,
  InputState,
  MoveData,
  StageData,
  HitEffect
} from '../types/fighter';
import { soundEngine } from '../audio/soundEngine';
import { FightRenderer } from './threeRenderer';

export class CombatEngine {
  public p1: CombatEntity;
  public p2: CombatEntity;
  public stage: StageData;
  public renderer: FightRenderer | null = null;
  public roundTime: number = 99;
  public roundTimerInterval: number = 60;
  public currentRound: number = 1;
  public maxRoundsToWin: number = 2;
  public isRoundOver: boolean = false;
  public roundWinner: 'p1' | 'p2' | 'DRAW' | null = null;
  public matchWinner: 'p1' | 'p2' | null = null;
  public isPaused: boolean = false;
  public trainingMode: boolean = false;
  public trainingDummyAction: 'STAND' | 'CROUCH' | 'JUMP' | 'AUTO_BLOCK' | 'CPU' = 'AUTO_BLOCK';
  public aiDifficulty: 'NOVICE' | 'WARRIOR' | 'MASTER' = 'WARRIOR';
  public onRoundEndCallback?: (winner: 'p1' | 'p2' | 'DRAW') => void;
  public onMatchEndCallback?: (winner: 'p1' | 'p2') => void;

  public arenaLeft: number = -8.0;
  public arenaRight: number = 8.0;
  public gravity: number = 0.022;
  public frameCount: number = 0;

  constructor(p1Fighter: FighterStats, p2Fighter: FighterStats, stage: StageData) {
    this.stage = JSON.parse(JSON.stringify(stage));
    this.p1 = this.createEntity('p1', p1Fighter, -3.2, 1);
    this.p2 = this.createEntity('p2', p2Fighter, 3.2, -1);
  }

  private createEntity(
    id: 'p1' | 'p2',
    fighter: FighterStats,
    x: number,
    facing: 1 | -1
  ): CombatEntity {
    return {
      id,
      fighter,
      x,
      y: 0,
      vx: 0,
      vy: 0,
      facing,
      health: fighter.maxHealth,
      shadowEnergy: 35, // Starts with some shadow energy
      isShadowForm: false,
      shadowFormTimer: 0,
      guardMeter: 100,
      state: 'IDLE',
      stateFrame: 0,
      currentMove: null,
      hasHitInMove: false,
      isGrounded: true,
      isBlocking: false,
      isParrying: false,
      parryWindow: 0,
      comboCount: 0,
      comboDamage: 0,
      roundsWon: 0,
      rangedCooldown: 0
    };
  }

  public resetRound() {
    this.p1.x = -3.2;
    this.p1.y = 0;
    this.p1.vx = 0;
    this.p1.vy = 0;
    this.p1.facing = 1;
    this.p1.health = this.p1.fighter.maxHealth;
    this.p1.isShadowForm = false;
    this.p1.shadowFormTimer = 0;
    this.p1.state = 'IDLE';
    this.p1.stateFrame = 0;
    this.p1.currentMove = null;
    this.p1.comboCount = 0;
    this.p1.comboDamage = 0;

    this.p2.x = 3.2;
    this.p2.y = 0;
    this.p2.vx = 0;
    this.p2.vy = 0;
    this.p2.facing = -1;
    this.p2.health = this.p2.fighter.maxHealth;
    this.p2.isShadowForm = false;
    this.p2.shadowFormTimer = 0;
    this.p2.state = 'IDLE';
    this.p2.stateFrame = 0;
    this.p2.currentMove = null;
    this.p2.comboCount = 0;
    this.p2.comboDamage = 0;

    this.roundTime = 99;
    this.roundTimerInterval = 60;
    this.isRoundOver = false;
    this.roundWinner = null;
  }

  public update(p1Input: InputState, p2Input: InputState, isOnlineRemoteP2: boolean = false) {
    if (this.isPaused) return;

    this.frameCount++;

    if (!this.trainingMode && !this.isRoundOver) {
      this.roundTimerInterval--;
      if (this.roundTimerInterval <= 0) {
        this.roundTimerInterval = 60;
        this.roundTime = Math.max(0, this.roundTime - 1);
        if (this.roundTime === 0) {
          this.handleTimeout();
        }
      }
    }

    // Shadow Form Timers
    this.updateShadowFormStatus(this.p1);
    this.updateShadowFormStatus(this.p2);

    // Process inputs
    this.processFighterInput(this.p1, this.p2, p1Input);

    if (!isOnlineRemoteP2) {
      if (this.trainingMode && this.trainingDummyAction !== 'CPU') {
        this.processDummyInput(this.p2, this.p1);
      } else if (p2Input.left || p2Input.right || p2Input.weapon || p2Input.heavy || p2Input.kick || p2Input.special || p2Input.shadow || p2Input.ranged || p2Input.throw || p2Input.up || p2Input.down) {
        this.processFighterInput(this.p2, this.p1, p2Input);
      } else {
        const aiInput = this.computeAIInput(this.p2, this.p1);
        this.processFighterInput(this.p2, this.p1, aiInput);
      }
    }

    // Physics
    this.updatePhysics(this.p1, this.p2);
    this.updatePhysics(this.p2, this.p1);

    // Hits
    this.checkCombatHits(this.p1, this.p2);
    this.checkCombatHits(this.p2, this.p1);

    // Audio tension
    soundEngine.setTension(this.p1.health < 300 || this.p2.health < 300);

    // 3D Render
    if (this.renderer) {
      this.renderer.updateFighterVisuals('p1', this.p1, this.p2);
      this.renderer.updateFighterVisuals('p2', this.p2, this.p1);
      this.renderer.render(this.p1, this.p2);
    }
  }

  private updateShadowFormStatus(entity: CombatEntity) {
    if (entity.rangedCooldown > 0) {
      entity.rangedCooldown--;
    }

    if (entity.isShadowForm) {
      entity.shadowFormTimer--;
      entity.shadowEnergy = Math.max(0, (entity.shadowFormTimer / 280) * 100);

      if (entity.shadowFormTimer <= 0) {
        entity.isShadowForm = false;
        entity.shadowEnergy = 0;
      }
    }
  }

  private processFighterInput(self: CombatEntity, opp: CombatEntity, input: InputState) {
    if (self.state === 'HITSTUN' || self.state === 'KNOCKDOWN' || self.state === 'WALL_SPLAT' || self.state === 'VICTORY' || self.state === 'DEFEAT') {
      return;
    }

    if (self.parryWindow > 0) {
      self.parryWindow--;
      if (self.parryWindow === 0) self.isParrying = false;
    }

    if (self.state === 'IDLE' || self.state === 'WALK_FWD' || self.state === 'WALK_BACK' || self.state === 'CROUCH') {
      self.facing = opp.x > self.x ? 1 : -1;
    }

    const canAct = self.state === 'IDLE' || self.state === 'WALK_FWD' || self.state === 'WALK_BACK' || self.state === 'CROUCH';

    // 1. Enter Shadow Form or Trigger Shadow Ability
    if (canAct && input.shadow) {
      if (!self.isShadowForm && self.shadowEnergy >= 100) {
        // Transform into Shadow Form!
        self.isShadowForm = true;
        self.shadowFormTimer = 280; // ~4.6 seconds in Shadow Form
        self.state = 'SHADOW_FORM_ENTER';
        self.stateFrame = 0;
        soundEngine.playSuperDetonation();
        soundEngine.playAnnouncer('PERFECT');
        if (this.renderer) {
          this.renderer.triggerShadowFlash();
          this.renderer.triggerHitstop(8);
        }
        return;
      } else if (self.isShadowForm) {
        // Execute Shadow Ability!
        self.state = 'SHADOW_ABILITY';
        self.stateFrame = 0;
        self.currentMove = self.fighter.moves.shadowAbility;
        self.hasHitInMove = false;
        soundEngine.playSuperDetonation();
        if (this.renderer) {
          this.renderer.triggerShadowFlash();
        }
        return;
      }
    }

    // 2. Ranged Throw (Kunai / Throwing Axe)
    if (canAct && input.ranged && self.rangedCooldown === 0) {
      self.state = 'RANGED_ATK';
      self.stateFrame = 0;
      self.currentMove = self.fighter.moves.ranged;
      self.hasHitInMove = false;
      self.rangedCooldown = 120; // 2 seconds cooldown
      soundEngine.playWhoosh('light');
      return;
    }

    // 3. Throw / Grapple
    if (canAct && input.throw) {
      self.state = 'THROW';
      self.stateFrame = 0;
      self.currentMove = self.fighter.moves.throw;
      self.hasHitInMove = false;
      soundEngine.playWhoosh('light');
      return;
    }

    // 4. Special Martial Arts Technique
    if (canAct && input.special) {
      self.state = 'SPECIAL_ATK';
      self.stateFrame = 0;
      self.currentMove = self.fighter.moves.special;
      self.hasHitInMove = false;
      soundEngine.playWhoosh('heavy');
      return;
    }

    // 5. Unarmed Kick
    if (canAct && input.kick) {
      self.state = 'KICK_ATK';
      self.stateFrame = 0;
      self.currentMove = self.fighter.moves.kick;
      self.hasHitInMove = false;
      soundEngine.playWhoosh('light');
      return;
    }

    // 6. Heavy Weapon Attack
    if (canAct && input.heavy) {
      self.state = 'HEAVY_ATK';
      self.stateFrame = 0;
      self.currentMove = self.fighter.moves.heavy;
      self.hasHitInMove = false;
      soundEngine.playWhoosh('heavy');
      return;
    }

    // 7. Light Weapon Slash
    if (canAct && input.weapon) {
      self.state = 'WEAPON_ATK';
      self.stateFrame = 0;
      self.currentMove = self.fighter.moves.weapon;
      self.hasHitInMove = false;
      soundEngine.playWhoosh('light');
      return;
    }

    // 8. Block / Parry
    if (canAct && input.parry) {
      if (!self.isParrying && self.parryWindow === 0) {
        self.isParrying = true;
        self.parryWindow = 5;
      }
      self.state = 'PERFECT_PARRY';
      self.isBlocking = true;
      return;
    } else {
      self.isBlocking = false;
    }

    // Movement & Jump
    if (canAct) {
      if (input.up && self.isGrounded) {
        self.vy = self.fighter.jumpForce;
        self.isGrounded = false;
        self.state = 'JUMP';
        return;
      }

      if (input.down) {
        self.state = 'CROUCH';
        self.vx = 0;
        return;
      }

      const moveFwd = self.facing === 1 ? input.right : input.left;
      const moveBack = self.facing === 1 ? input.left : input.right;

      if (moveFwd) {
        self.vx = self.facing * self.fighter.speed;
        self.state = 'WALK_FWD';
      } else if (moveBack) {
        self.vx = -self.facing * (self.fighter.speed * 0.75);
        self.state = 'WALK_BACK';
        self.isBlocking = true;
      } else {
        self.vx = 0;
        self.state = 'IDLE';
      }
    }
  }

  private updatePhysics(self: CombatEntity, opp: CombatEntity) {
    self.stateFrame++;

    if (!self.isGrounded) {
      self.vy -= this.gravity;
      self.y += self.vy;

      if (self.y <= 0) {
        self.y = 0;
        self.vy = 0;
        self.isGrounded = true;
        if (self.state === 'JUMP') self.state = 'IDLE';
      }
    }

    self.x += self.vx;

    if (self.isGrounded) {
      self.vx *= 0.82;
    }

    // Collision push
    const pushDist = 0.85;
    const dx = opp.x - self.x;
    if (Math.abs(dx) < pushDist && Math.abs(self.y - opp.y) < 1.2) {
      const overlap = pushDist - Math.abs(dx);
      const pushDirection = dx > 0 ? -1 : 1;
      self.x += (pushDirection * overlap) / 2;
      opp.x -= (pushDirection * overlap) / 2;
    }

    // Wall bounds
    if (self.x < this.arenaLeft) {
      self.x = this.arenaLeft;
      if (self.state === 'HITSTUN' && Math.abs(self.vx) > 0.15) {
        this.triggerWallImpact(self, 'left');
      }
    } else if (self.x > this.arenaRight) {
      self.x = this.arenaRight;
      if (self.state === 'HITSTUN' && Math.abs(self.vx) > 0.15) {
        this.triggerWallImpact(self, 'right');
      }
    }

    // Animation lifecycles
    if (self.currentMove) {
      const totalFrames =
        self.currentMove.startupFrames +
        self.currentMove.activeFrames +
        self.currentMove.recoveryFrames;

      if (self.stateFrame >= totalFrames) {
        self.state = 'IDLE';
        self.currentMove = null;
        self.hasHitInMove = false;
        self.stateFrame = 0;
      }
    } else if (self.state === 'SHADOW_FORM_ENTER') {
      if (self.stateFrame >= 24) {
        self.state = 'IDLE';
        self.stateFrame = 0;
      }
    } else if (self.state === 'HITSTUN') {
      if (self.stateFrame >= 20) {
        self.state = 'IDLE';
        self.stateFrame = 0;
        self.comboCount = 0;
        self.comboDamage = 0;
      }
    } else if (self.state === 'WALL_SPLAT') {
      if (self.stateFrame >= 35) {
        self.state = 'IDLE';
        self.stateFrame = 0;
      }
    } else if (self.state === 'PERFECT_PARRY') {
      if (self.stateFrame >= 12) {
        self.state = 'IDLE';
        self.stateFrame = 0;
      }
    }
  }

  private triggerWallImpact(target: CombatEntity, side: 'left' | 'right') {
    target.state = 'WALL_SPLAT';
    target.stateFrame = 0;
    target.vx = side === 'left' ? 0.08 : -0.08;
    target.health = Math.max(0, target.health - 35);

    soundEngine.playWallSplat();
    soundEngine.playDestruction();
    if (this.renderer) {
      this.renderer.triggerShake(0.4);
      this.renderer.spawnHitEffect({
        x: target.x,
        y: target.y + 1.2,
        z: 0,
        color: '#ffffff',
        size: 1.5,
        type: 'debris'
      });
    }

    const impactX = target.x;
    for (const prop of this.stage.props) {
      if (!prop.broken && Math.abs(prop.x - impactX) < 2.5) {
        prop.health = Math.max(0, prop.health - 60);
        if (this.renderer) {
          this.renderer.damageStageProp(prop.id, 60, impactX, target.y + 1.0);
        }
      }
    }

    this.checkHealthState();
  }

  private checkCombatHits(attacker: CombatEntity, defender: CombatEntity) {
    if (!attacker.currentMove || attacker.hasHitInMove) return;

    const { startupFrames, activeFrames } = attacker.currentMove;
    const isHitActive =
      attacker.stateFrame >= startupFrames &&
      attacker.stateFrame < startupFrames + activeFrames;

    if (!isHitActive) return;

    const attackReach = attacker.currentMove.type === 'RANGED'
      ? 12.0 // Full screen
      : attacker.currentMove.type === 'LIGHT' || attacker.currentMove.type === 'KICK'
      ? 1.8
      : 2.3;

    const distX = Math.abs(attacker.x - defender.x);
    const distY = Math.abs(attacker.y - defender.y);
    const inFront = (attacker.facing === 1 && defender.x > attacker.x) || (attacker.facing === -1 && defender.x < attacker.x);

    if (distX <= attackReach && distY <= 1.8 && inFront) {
      attacker.hasHitInMove = true;
      this.resolveHit(attacker, defender);
    }
  }

  private resolveHit(attacker: CombatEntity, defender: CombatEntity) {
    const move = attacker.currentMove!;

    // Parry
    if (defender.isParrying && defender.parryWindow > 0) {
      defender.shadowEnergy = Math.min(100, defender.shadowEnergy + 25);
      defender.state = 'PERFECT_PARRY';
      defender.stateFrame = 0;
      attacker.state = 'HITSTUN';
      attacker.stateFrame = 0;
      attacker.vx = -attacker.facing * 0.15;

      soundEngine.playParry();
      soundEngine.playAnnouncer('PERFECT');
      if (this.renderer) {
        this.renderer.triggerShake(0.25);
        this.renderer.triggerHitstop(8);
        this.renderer.spawnHitEffect({
          x: (attacker.x + defender.x) / 2,
          y: defender.y + 1.2,
          z: 0.1,
          color: '#22d3ee',
          size: 1.8,
          type: 'parry'
        });
      }
      return;
    }

    // Block
    if (defender.isBlocking && move.type !== 'THROW') {
      const chipDamage = Math.floor(move.damage * 0.12);
      defender.health = Math.max(0, defender.health - chipDamage);
      defender.vx = attacker.facing * (move.knockback * 0.4);

      attacker.shadowEnergy = Math.min(100, attacker.shadowEnergy + move.shadowGain * 0.5);

      soundEngine.playBlock();
      if (this.renderer) {
        this.renderer.triggerHitstop(3);
        this.renderer.spawnHitEffect({
          x: (attacker.x + defender.x) / 2,
          y: defender.y + 1.3,
          z: 0.1,
          color: '#e2e8f0',
          size: 0.8,
          type: 'sparks'
        });
      }
      this.checkHealthState();
      return;
    }

    // Damage & Shadow Boost
    const isCounter = defender.currentMove && defender.stateFrame < defender.currentMove.startupFrames;
    const shadowFormBuff = attacker.isShadowForm ? 1.3 : 1.0;
    const counterBuff = isCounter ? 1.25 : 1.0;
    const scaling = Math.max(0.6, 1.0 - defender.comboCount * 0.1);

    const finalDamage = Math.floor(move.damage * shadowFormBuff * counterBuff * scaling);

    defender.health = Math.max(0, defender.health - finalDamage);
    defender.state = 'HITSTUN';
    defender.stateFrame = 0;
    defender.comboCount++;
    defender.comboDamage += finalDamage;
    defender.vx = attacker.facing * (move.knockback / defender.fighter.weight);

    if (move.launchY) {
      defender.vy = move.launchY;
      defender.isGrounded = false;
      defender.state = 'JUMP';
    }

    // Shadow Energy accumulation
    attacker.shadowEnergy = Math.min(100, attacker.shadowEnergy + move.shadowGain);
    defender.shadowEnergy = Math.min(100, defender.shadowEnergy + Math.floor(move.shadowGain * 0.7));

    // SFX
    if (move.type === 'LIGHT' || move.type === 'KICK') {
      soundEngine.playLightHit();
    } else if (move.type === 'HEAVY' || move.type === 'THROW') {
      soundEngine.playHeavyHit();
    } else if (move.type === 'SPECIAL' || move.type === 'RANGED') {
      soundEngine.playSpecialHit();
    } else if (move.type === 'SHADOW_ABILITY') {
      soundEngine.playSuperDetonation();
    }

    if (isCounter) {
      soundEngine.playAnnouncer('COUNTER');
    }

    if (this.renderer) {
      const hitstop = move.type === 'SHADOW_ABILITY' ? 10 : move.type === 'HEAVY' ? 6 : 4;
      this.renderer.triggerHitstop(hitstop);
      this.renderer.triggerShake(move.type === 'SHADOW_ABILITY' ? 0.6 : move.type === 'HEAVY' ? 0.35 : 0.18);
      this.renderer.spawnHitEffect({
        x: (attacker.x + defender.x) / 2,
        y: defender.y + 1.3,
        z: 0.1,
        color: attacker.isShadowForm ? '#06b6d4' : attacker.fighter.accentColor,
        size: move.type === 'SHADOW_ABILITY' ? 2.5 : 1.2,
        type: attacker.isShadowForm ? 'shadow' : 'heavy'
      });
    }

    // Damage destructible props
    for (const prop of this.stage.props) {
      if (!prop.broken && Math.abs(prop.x - defender.x) < 2.0) {
        prop.health = Math.max(0, prop.health - Math.floor(finalDamage * 0.5));
        if (this.renderer) {
          this.renderer.damageStageProp(prop.id, Math.floor(finalDamage * 0.5), defender.x, defender.y + 1.0);
        }
      }
    }

    this.checkHealthState();
  }

  private checkHealthState() {
    if (this.isRoundOver) return;

    if (this.p1.health <= 0 || this.p2.health <= 0) {
      this.isRoundOver = true;
      soundEngine.playAnnouncer('KO');

      if (this.p1.health <= 0 && this.p2.health <= 0) {
        this.roundWinner = 'DRAW';
      } else if (this.p1.health <= 0) {
        this.roundWinner = 'p2';
        this.p2.roundsWon++;
        this.p2.state = 'VICTORY';
        this.p1.state = 'DEFEAT';
      } else {
        this.roundWinner = 'p1';
        this.p1.roundsWon++;
        this.p1.state = 'VICTORY';
        this.p2.state = 'DEFEAT';
      }

      if (this.renderer) this.renderer.triggerShake(0.7);

      if (this.p1.roundsWon >= this.maxRoundsToWin) {
        this.matchWinner = 'p1';
        if (this.onMatchEndCallback) this.onMatchEndCallback('p1');
      } else if (this.p2.roundsWon >= this.maxRoundsToWin) {
        this.matchWinner = 'p2';
        if (this.onMatchEndCallback) this.onMatchEndCallback('p2');
      } else {
        if (this.onRoundEndCallback && this.roundWinner) {
          this.onRoundEndCallback(this.roundWinner);
        }
      }
    }
  }

  private handleTimeout() {
    if (this.isRoundOver) return;
    this.isRoundOver = true;
    soundEngine.playAnnouncer('KO');

    if (this.p1.health === this.p2.health) {
      this.roundWinner = 'DRAW';
    } else if (this.p1.health > this.p2.health) {
      this.roundWinner = 'p1';
      this.p1.roundsWon++;
    } else {
      this.roundWinner = 'p2';
      this.p2.roundsWon++;
    }

    if (this.p1.roundsWon >= this.maxRoundsToWin) {
      this.matchWinner = 'p1';
      if (this.onMatchEndCallback) this.onMatchEndCallback('p1');
    } else if (this.p2.roundsWon >= this.maxRoundsToWin) {
      this.matchWinner = 'p2';
      if (this.onMatchEndCallback) this.onMatchEndCallback('p2');
    } else {
      if (this.onRoundEndCallback && this.roundWinner) {
        this.onRoundEndCallback(this.roundWinner);
      }
    }
  }

  private computeAIInput(ai: CombatEntity, target: CombatEntity): InputState {
    const input: InputState = {
      left: false,
      right: false,
      up: false,
      down: false,
      weapon: false,
      heavy: false,
      kick: false,
      special: false,
      shadow: false,
      ranged: false,
      throw: false,
      parry: false
    };

    const dist = Math.abs(ai.x - target.x);
    const targetInFront = (ai.facing === 1 && target.x > ai.x) || (ai.facing === -1 && target.x < ai.x);

    const reactFreq = this.aiDifficulty === 'MASTER' ? 8 : this.aiDifficulty === 'WARRIOR' ? 14 : 22;
    if (this.frameCount % reactFreq !== 0) return input;

    // 1. Activate Shadow Form or Shadow Ability
    if ((ai.shadowEnergy >= 100 || ai.isShadowForm) && dist < 2.5 && targetInFront) {
      input.shadow = true;
      return input;
    }

    // 2. Anti-Air when target jumps
    if (!target.isGrounded && dist < 2.0) {
      input.special = true;
      return input;
    }

    // 3. Parry / Block incoming attacks
    if (target.currentMove && dist < 2.2) {
      const parryChance = this.aiDifficulty === 'MASTER' ? 0.6 : 0.35;
      if (Math.random() < parryChance) {
        input.parry = true;
        return input;
      }
      if (ai.facing === 1) input.left = true;
      else input.right = true;
      return input;
    }

    // 4. Ranged attack from far
    if (dist > 4.5 && ai.rangedCooldown === 0) {
      input.ranged = true;
      return input;
    }

    // 5. Spacing
    if (dist > 2.4) {
      if (target.x > ai.x) input.right = true;
      else input.left = true;
    } else if (dist < 1.0) {
      if (Math.random() < 0.4) input.throw = true;
      else input.kick = true;
    } else {
      if (Math.random() < 0.5) input.heavy = true;
      else input.weapon = true;
    }

    return input;
  }

  private processDummyInput(dummy: CombatEntity, opponent: CombatEntity) {
    if (this.trainingDummyAction === 'AUTO_BLOCK') {
      if (opponent.currentMove) {
        dummy.isBlocking = true;
        dummy.state = 'BLOCK';
      } else {
        dummy.isBlocking = false;
        dummy.state = 'IDLE';
      }
    } else if (this.trainingDummyAction === 'CROUCH') {
      dummy.state = 'CROUCH';
    } else if (this.trainingDummyAction === 'JUMP') {
      if (dummy.isGrounded) {
        dummy.vy = dummy.fighter.jumpForce;
        dummy.isGrounded = false;
        dummy.state = 'JUMP';
      }
    } else {
      dummy.state = 'IDLE';
    }
  }
}
