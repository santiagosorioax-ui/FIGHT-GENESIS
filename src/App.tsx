/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { FIGHTERS } from './data/fighters';
import { STAGES } from './data/stages';
import { FighterStats, StageData, GameMode, InputState } from './types/fighter';
import { CombatEngine } from './game/combatEngine';
import { FightRenderer } from './game/threeRenderer';
import { soundEngine } from './audio/soundEngine';
import { TitleScreen } from './components/TitleScreen';
import { CharacterSelect } from './components/CharacterSelect';
import { StageSelect } from './components/StageSelect';
import { OnlineLobby } from './components/OnlineLobby';
import { FightHUD } from './components/FightHUD';
import { TrainingControls } from './components/TrainingControls';
import { PauseMenu } from './components/PauseMenu';
import { VictoryScreen } from './components/VictoryScreen';

type AppState = 'TITLE' | 'CHAR_SELECT' | 'STAGE_SELECT' | 'ONLINE_LOBBY' | 'FIGHT';

export default function App() {
  const [appState, setAppState] = useState<AppState>('TITLE');
  const [gameMode, setGameMode] = useState<GameMode>('LOCAL_VS');

  // Default original fighters: KAELEN vs REN ZHAO
  const [p1Fighter, setP1Fighter] = useState<FighterStats>(FIGHTERS[0]); // KAELEN
  const [p2Fighter, setP2Fighter] = useState<FighterStats>(FIGHTERS[1]); // REN ZHAO
  const [selectedStage, setSelectedStage] = useState<StageData>(STAGES[0]); // Jade Pagoda Courtyard

  // Online Multiplayer State
  const [onlineSocket, setOnlineSocket] = useState<WebSocket | null>(null);
  const [onlineRoomId, setOnlineRoomId] = useState<string | null>(null);
  const [onlinePlayerSlot, setOnlinePlayerSlot] = useState<1 | 2>(1);
  const [remoteP2Input, setRemoteP2Input] = useState<InputState>({
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
  });

  // Combat Runtime
  const combatCanvasRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<CombatEngine | null>(null);
  const rendererRef = useRef<FightRenderer | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // HUD & Game Feedback States
  const [roundTime, setRoundTime] = useState(99);
  const [currentRound, setCurrentRound] = useState(1);
  const [announcement, setAnnouncement] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [matchEndedWinner, setMatchEndedWinner] = useState<'p1' | 'p2' | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [dummyAction, setDummyAction] = useState<'STAND' | 'CROUCH' | 'JUMP' | 'AUTO_BLOCK' | 'CPU'>('AUTO_BLOCK');

  // Keyboard input tracker
  const keysRef = useRef<{ [key: string]: boolean }>({});
  // Touch button single-frame action trigger
  const touchActionRef = useRef<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        if (appState === 'FIGHT') e.preventDefault();
      }

      if (e.code === 'Escape' && appState === 'FIGHT' && !matchEndedWinner) {
        setIsPaused(prev => !prev);
        soundEngine.playWhoosh('light');
        return;
      }

      keysRef.current[e.code] = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [appState, matchEndedWinner]);

  // Online WebSocket Message Listener
  useEffect(() => {
    if (!onlineSocket || appState !== 'FIGHT') return;

    const handleMessage = (evt: MessageEvent) => {
      try {
        const msg = JSON.parse(evt.data);

        if (msg.type === 'COMBAT_EVENT' && msg.input) {
          setRemoteP2Input(msg.input);
        }

        if (msg.type === 'STAGE_DESTROY') {
          if (rendererRef.current) {
            rendererRef.current.damageStageProp(msg.propId, msg.damage, msg.x, msg.y);
          }
        }

        if (msg.type === 'REMATCH_VOTE') {
          restartFight();
        }
      } catch (err) {
        console.error('Network combat message error:', err);
      }
    };

    onlineSocket.addEventListener('message', handleMessage);
    return () => {
      onlineSocket.removeEventListener('message', handleMessage);
    };
  }, [onlineSocket, appState]);

  // Initialize Combat Loop
  useEffect(() => {
    if (appState !== 'FIGHT' || !combatCanvasRef.current) return;

    const renderer = new FightRenderer(combatCanvasRef.current);
    renderer.initStage(selectedStage);
    rendererRef.current = renderer;

    const engine = new CombatEngine(p1Fighter, p2Fighter, selectedStage);
    engine.renderer = renderer;
    engine.trainingMode = gameMode === 'TRAINING';
    engine.trainingDummyAction = dummyAction;
    engineRef.current = engine;

    soundEngine.startCombatMusic();

    soundEngine.playAnnouncer('ROUND_1');
    setAnnouncement('ROUND 1');
    setTimeout(() => {
      soundEngine.playAnnouncer('FIGHT');
      setAnnouncement('FIGHT!');
      setTimeout(() => setAnnouncement(null), 1000);
    }, 1200);

    engine.onRoundEndCallback = (winner) => {
      setAnnouncement(winner === 'DRAW' ? 'DRAW!' : `${winner.toUpperCase()} WINS ROUND!`);
      setTimeout(() => {
        engine.currentRound++;
        setCurrentRound(engine.currentRound);
        engine.resetRound();
        setAnnouncement(`ROUND ${engine.currentRound}`);
        soundEngine.playAnnouncer(engine.currentRound === 2 ? 'ROUND_2' : 'FINAL_ROUND');
        setTimeout(() => {
          setAnnouncement('FIGHT!');
          soundEngine.playAnnouncer('FIGHT');
          setTimeout(() => setAnnouncement(null), 1000);
        }, 1200);
      }, 2500);
    };

    engine.onMatchEndCallback = (winner) => {
      setMatchEndedWinner(winner);
      setAnnouncement(winner === 'p1' ? 'PLAYER 1 VICTORY!' : 'PLAYER 2 VICTORY!');
      soundEngine.playAnnouncer('KO');
      soundEngine.stopCombatMusic();
    };

    let lastTick = performance.now();
    const targetFpsInterval = 1000 / 60;

    const gameLoop = () => {
      animFrameRef.current = requestAnimationFrame(gameLoop);

      const now = performance.now();
      const delta = now - lastTick;

      if (delta >= targetFpsInterval) {
        lastTick = now - (delta % targetFpsInterval);

        if (!engine.isPaused) {
          const p1Input = pollP1Input();

          let p2Input: InputState;
          if (gameMode === 'ONLINE') {
            p2Input = remoteP2Input;
            if (onlineSocket && onlineSocket.readyState === WebSocket.OPEN) {
              onlineSocket.send(JSON.stringify({
                type: 'COMBAT_EVENT',
                input: p1Input
              }));
            }
          } else {
            p2Input = pollP2Input();
          }

          engine.update(p1Input, p2Input, gameMode === 'ONLINE');
          setRoundTime(engine.roundTime);

          // Clear touch action after frame
          touchActionRef.current = null;
        }
      }
    };

    animFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      soundEngine.stopCombatMusic();
      renderer.dispose();
      rendererRef.current = null;
      engineRef.current = null;
    };
  }, [appState, p1Fighter, p2Fighter, selectedStage, gameMode]);

  const pollP1Input = (): InputState => {
    const k = keysRef.current;
    const touch = touchActionRef.current;

    let input: InputState = {
      left: !!(k['KeyA']),
      right: !!(k['KeyD']),
      up: !!(k['KeyW']),
      down: !!(k['KeyS']),
      weapon: !!(k['KeyJ']) || touch === 'weapon',
      heavy: !!(k['KeyK']) || touch === 'heavy',
      kick: !!(k['KeyU']) || touch === 'kick',
      special: !!(k['KeyL']) || touch === 'special',
      shadow: !!(k['KeyI']) || touch === 'shadow',
      ranged: !!(k['KeyO']) || touch === 'ranged',
      throw: !!(k['Space']),
      parry: !!(k['KeyP'])
    };

    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = gamepads[0];
    if (gp) {
      const axisX = gp.axes[0] || 0;
      const axisY = gp.axes[1] || 0;

      if (axisX < -0.3 || gp.buttons[14]?.pressed) input.left = true;
      if (axisX > 0.3 || gp.buttons[15]?.pressed) input.right = true;
      if (axisY < -0.4 || gp.buttons[12]?.pressed) input.up = true;
      if (axisY > 0.4 || gp.buttons[13]?.pressed) input.down = true;

      if (gp.buttons[2]?.pressed) input.weapon = true; // X / Square
      if (gp.buttons[3]?.pressed) input.heavy = true; // Y / Triangle
      if (gp.buttons[0]?.pressed) input.kick = true; // A / Cross
      if (gp.buttons[1]?.pressed) input.special = true; // B / Circle
      if (gp.buttons[7]?.pressed) input.shadow = true; // RT / R2
      if (gp.buttons[5]?.pressed) input.ranged = true; // RB / R1
      if (gp.buttons[4]?.pressed) input.throw = true; // LB / L1
    }

    return input;
  };

  const pollP2Input = (): InputState => {
    const k = keysRef.current;
    let input: InputState = {
      left: !!(k['ArrowLeft']),
      right: !!(k['ArrowRight']),
      up: !!(k['ArrowUp']),
      down: !!(k['ArrowDown']),
      weapon: !!(k['Numpad1'] || k['Digit1']),
      heavy: !!(k['Numpad2'] || k['Digit2']),
      kick: !!(k['Numpad4'] || k['Digit4']),
      special: !!(k['Numpad3'] || k['Digit3']),
      shadow: !!(k['Numpad5'] || k['Digit5']),
      ranged: !!(k['Numpad6'] || k['Digit6']),
      throw: !!(k['Numpad0'] || k['Digit0']),
      parry: false
    };

    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp2 = gamepads[1];
    if (gp2) {
      const axisX = gp2.axes[0] || 0;
      const axisY = gp2.axes[1] || 0;

      if (axisX < -0.3 || gp2.buttons[14]?.pressed) input.left = true;
      if (axisX > 0.3 || gp2.buttons[15]?.pressed) input.right = true;
      if (axisY < -0.4 || gp2.buttons[12]?.pressed) input.up = true;
      if (axisY > 0.4 || gp2.buttons[13]?.pressed) input.down = true;

      if (gp2.buttons[2]?.pressed) input.weapon = true;
      if (gp2.buttons[3]?.pressed) input.heavy = true;
      if (gp2.buttons[0]?.pressed) input.kick = true;
      if (gp2.buttons[1]?.pressed) input.special = true;
      if (gp2.buttons[7]?.pressed) input.shadow = true;
      if (gp2.buttons[5]?.pressed) input.ranged = true;
      if (gp2.buttons[4]?.pressed) input.throw = true;
    }

    return input;
  };

  const handleSelectGameMode = (mode: GameMode) => {
    setGameMode(mode);
    if (mode === 'ONLINE') {
      setAppState('ONLINE_LOBBY');
    } else {
      setAppState('CHAR_SELECT');
    }
  };

  const handleStartOnlineMatch = (
    socket: WebSocket,
    roomId: string,
    playerSlot: 1 | 2,
    p1: FighterStats,
    p2: FighterStats,
    stage: StageData
  ) => {
    setOnlineSocket(socket);
    setOnlineRoomId(roomId);
    setOnlinePlayerSlot(playerSlot);
    setP1Fighter(p1);
    setP2Fighter(p2);
    setSelectedStage(stage);
    setAppState('FIGHT');
  };

  const handleReturnToTitle = () => {
    setAppState('TITLE');
    soundEngine.stopCombatMusic();
    if (!isMuted) {
      soundEngine.startJapaneseMenuMusic();
    }
  };

  const handleReturnToCharSelect = () => {
    setAppState('CHAR_SELECT');
    soundEngine.stopCombatMusic();
    if (!isMuted) {
      soundEngine.startJapaneseMenuMusic();
    }
  };

  const restartFight = () => {
    if (engineRef.current) {
      engineRef.current.currentRound = 1;
      engineRef.current.p1.roundsWon = 0;
      engineRef.current.p2.roundsWon = 0;
      engineRef.current.resetRound();
      setCurrentRound(1);
      setMatchEndedWinner(null);
      setIsPaused(false);
      soundEngine.startCombatMusic();
      setAnnouncement('ROUND 1');
      soundEngine.playAnnouncer('ROUND_1');
      setTimeout(() => {
        setAnnouncement('FIGHT!');
        soundEngine.playAnnouncer('FIGHT');
        setTimeout(() => setAnnouncement(null), 1000);
      }, 1200);
    }
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    soundEngine.setMuted(nextMuted);
  };

  return (
    <main className="w-full h-screen bg-neutral-950 text-neutral-100 overflow-hidden relative font-['Plus_Jakarta_Sans',sans-serif]">
      {appState === 'TITLE' && (
        <TitleScreen
          onSelectMode={handleSelectGameMode}
          isMuted={isMuted}
          onToggleMute={toggleMute}
        />
      )}

      {appState === 'CHAR_SELECT' && (
        <CharacterSelect
          onConfirm={(p1, p2) => {
            setP1Fighter(p1);
            setP2Fighter(p2);
            setAppState('STAGE_SELECT');
          }}
          onBack={() => setAppState('TITLE')}
          isMultiplayer={gameMode === 'LOCAL_VS'}
        />
      )}

      {appState === 'STAGE_SELECT' && (
        <StageSelect
          onConfirm={(stage) => {
            setSelectedStage(stage);
            setAppState('FIGHT');
          }}
          onBack={() => setAppState('CHAR_SELECT')}
        />
      )}

      {appState === 'ONLINE_LOBBY' && (
        <OnlineLobby
          onStartMatch={handleStartOnlineMatch}
          onBack={() => setAppState('TITLE')}
        />
      )}

      {appState === 'FIGHT' && (
        <div className="relative w-full h-full overflow-hidden select-none bg-black">
          <div ref={combatCanvasRef} className="absolute inset-0 z-0" />

          {engineRef.current && (
            <FightHUD
              p1={engineRef.current.p1}
              p2={engineRef.current.p2}
              roundTime={roundTime}
              currentRound={currentRound}
              gameMode={gameMode}
              announcement={announcement}
              onPauseToggle={() => setIsPaused(prev => !prev)}
              onActionTrigger={(action) => {
                touchActionRef.current = action;
              }}
            />
          )}

          {gameMode === 'TRAINING' && engineRef.current && (
            <TrainingControls
              dummyAction={dummyAction}
              onSelectDummyAction={(action) => {
                setDummyAction(action);
                if (engineRef.current) {
                  engineRef.current.trainingDummyAction = action;
                }
              }}
              onResetPosition={() => {
                if (engineRef.current) {
                  engineRef.current.p1.x = -3.2;
                  engineRef.current.p2.x = 3.2;
                  engineRef.current.p1.health = engineRef.current.p1.fighter.maxHealth;
                  engineRef.current.p2.health = engineRef.current.p2.fighter.maxHealth;
                  engineRef.current.p1.shadowEnergy = 100;
                  engineRef.current.p2.shadowEnergy = 100;
                }
              }}
              p1={engineRef.current.p1}
              p2={engineRef.current.p2}
            />
          )}

          {isPaused && !matchEndedWinner && (
            <PauseMenu
              onResume={() => setIsPaused(false)}
              onRestart={restartFight}
              onCharacterSelect={handleReturnToCharSelect}
              onMainMenu={handleReturnToTitle}
              isMuted={isMuted}
              onToggleMute={toggleMute}
            />
          )}

          {matchEndedWinner && engineRef.current && (
            <VictoryScreen
              winner={matchEndedWinner === 'p1' ? engineRef.current.p1 : engineRef.current.p2}
              loser={matchEndedWinner === 'p1' ? engineRef.current.p2 : engineRef.current.p1}
              onRematch={() => {
                if (gameMode === 'ONLINE' && onlineSocket && onlineSocket.readyState === WebSocket.OPEN) {
                  onlineSocket.send(JSON.stringify({ type: 'REMATCH_VOTE' }));
                }
                restartFight();
              }}
              onCharacterSelect={handleReturnToCharSelect}
              onMainMenu={handleReturnToTitle}
            />
          )}
        </div>
      )}
    </main>
  );
}
