import React, { useState, useEffect, useRef } from 'react';
import { FIGHTERS } from '../data/fighters';
import { STAGES } from '../data/stages';
import { FighterStats, StageData } from '../types/fighter';
import { soundEngine } from '../audio/soundEngine';
import { Globe, Users, Play, Copy, Check, ArrowLeft, RefreshCw, Radio } from 'lucide-react';

interface OnlineLobbyProps {
  onStartMatch: (
    socket: WebSocket,
    roomId: string,
    playerSlot: 1 | 2,
    p1Fighter: FighterStats,
    p2Fighter: FighterStats,
    stage: StageData
  ) => void;
  onBack: () => void;
}

export const OnlineLobby: React.FC<OnlineLobbyProps> = ({ onStartMatch, onBack }) => {
  const [playerName, setPlayerName] = useState(() => 'Fighter_' + Math.floor(Math.random() * 900 + 100));
  const [selectedFighter, setSelectedFighter] = useState<FighterStats>(FIGHTERS[0]);
  const [joinCode, setJoinCode] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [createdRoomCode, setCreatedRoomCode] = useState<string | null>(null);
  const [opponent, setOpponent] = useState<{ name: string; fighterId: string } | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [opponentReady, setOpponentReady] = useState(false);
  const [ping, setPing] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);
  const pingIntervalRef = useRef<number | null>(null);

  // Initialize WebSocket connection
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      console.log('Connected to Fight Genesis Battle Server');
      // Ping loop for netcode latency
      pingIntervalRef.current = window.setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'PING', timestamp: Date.now() }));
        }
      }, 2000);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'PONG') {
          const latency = Date.now() - data.timestamp;
          setPing(Math.round(latency / 2));
          return;
        }

        if (data.type === 'ROOM_CREATED') {
          setCreatedRoomCode(data.roomId);
          setIsSearching(false);
          setErrorMsg(null);
          return;
        }

        if (data.type === 'ROOM_JOINED') {
          setCreatedRoomCode(data.roomId);
          setOpponent(data.opponent);
          setIsSearching(false);
          setErrorMsg(null);
          return;
        }

        if (data.type === 'OPPONENT_JOINED') {
          setOpponent(data.opponent);
          soundEngine.playWhoosh('heavy');
          return;
        }

        if (data.type === 'MATCH_FOUND') {
          soundEngine.playAnnouncer('FIGHT');
          const oppFighter = FIGHTERS.find(f => f.id === data.opponent.fighterId) || FIGHTERS[1];
          const stg = STAGES.find(s => s.id === data.stageId) || STAGES[0];

          if (data.playerSlot === 1) {
            onStartMatch(ws, data.roomId, 1, selectedFighter, oppFighter, stg);
          } else {
            onStartMatch(ws, data.roomId, 2, oppFighter, selectedFighter, stg);
          }
          return;
        }

        if (data.type === 'FIGHTER_SELECTED') {
          setOpponent(prev => prev ? { ...prev, fighterId: data.fighterId } : null);
          return;
        }

        if (data.type === 'PLAYER_READY_STATUS') {
          setOpponentReady(data.ready);
          return;
        }

        if (data.type === 'START_MATCH_COUNTDOWN') {
          soundEngine.playAnnouncer('FIGHT');
          const oppFighter = FIGHTERS.find(f => f.id === opponent?.fighterId) || FIGHTERS[1];
          const stg = STAGES.find(s => s.id === data.stageId) || STAGES[0];

          onStartMatch(ws, createdRoomCode || 'ROOM', 1, selectedFighter, oppFighter, stg);
          return;
        }

        if (data.type === 'OPPONENT_DISCONNECTED') {
          setOpponent(null);
          setOpponentReady(false);
          setErrorMsg('Opponent left the lobby.');
          return;
        }

        if (data.type === 'ERROR') {
          setErrorMsg(data.message);
          setIsSearching(false);
        }
      } catch (err) {
        console.error('WS Message parsing error:', err);
      }
    };

    ws.onerror = () => {
      setErrorMsg('Failed to connect to battle netcode server.');
    };

    return () => {
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [selectedFighter]);

  const handleQuickMatch = () => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      setErrorMsg('Netcode server disconnected. Retrying...');
      return;
    }
    setIsSearching(true);
    setErrorMsg(null);
    soundEngine.playWhoosh('light');
    socketRef.current.send(JSON.stringify({
      type: 'QUICK_MATCH',
      name: playerName,
      fighterId: selectedFighter.id
    }));
  };

  const handleCancelQuickMatch = () => {
    setIsSearching(false);
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'CANCEL_MATCHMAKING' }));
    }
  };

  const handleCreateRoom = () => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
    setErrorMsg(null);
    soundEngine.playWhoosh('light');
    socketRef.current.send(JSON.stringify({
      type: 'CREATE_ROOM',
      name: playerName,
      fighterId: selectedFighter.id,
      stageId: 'cyber_colosseum'
    }));
  };

  const handleJoinRoom = () => {
    if (!joinCode.trim()) return;
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
    setErrorMsg(null);
    soundEngine.playWhoosh('light');
    socketRef.current.send(JSON.stringify({
      type: 'JOIN_ROOM',
      roomId: joinCode.trim().toUpperCase(),
      name: playerName,
      fighterId: selectedFighter.id
    }));
  };

  const toggleReady = () => {
    const nextReady = !isReady;
    setIsReady(nextReady);
    soundEngine.playWhoosh('heavy');
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'READY_TOGGLE',
        ready: nextReady
      }));
    }
  };

  const copyRoomCode = () => {
    if (createdRoomCode) {
      navigator.clipboard.writeText(createdRoomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="relative w-full h-full min-h-screen bg-neutral-950 flex flex-col justify-between p-6 md:p-10 font-['Chakra_Petch',sans-serif] text-neutral-100 select-none overflow-y-auto">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-neutral-900 via-neutral-950 to-black pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between border-b border-neutral-800 pb-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 text-neutral-400 hover:text-white border border-neutral-800 hover:border-neutral-600 rounded transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl md:text-5xl font-black italic tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-200 to-cyan-400">
              ONLINE BATTLE LOBBY
            </h1>
            <p className="text-xs md:text-sm text-neutral-400 uppercase tracking-widest mt-1">
              Deterministic WebSocket Netcode · Real-Time Peer Clashes
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {ping !== null && (
            <div className="flex items-center gap-2 bg-neutral-900 px-3 py-1.5 rounded-lg border border-neutral-800 text-xs font-mono text-emerald-400">
              <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>NET: {ping}ms</span>
            </div>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="relative z-10 my-2 max-w-xl mx-auto bg-red-950/80 border border-red-500/50 text-red-300 text-xs px-4 py-2.5 rounded-lg text-center font-mono">
          {errorMsg}
        </div>
      )}

      {/* Main Grid */}
      <div className="relative z-10 my-auto py-6 grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-6xl mx-auto w-full">
        {/* Left Column: Player Identity & Character Select */}
        <div className="lg:col-span-5 bg-neutral-900/60 border border-neutral-800 rounded-2xl p-6 backdrop-blur-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-400 mb-4 flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>Pilot Credentials</span>
            </h3>

            <div className="mb-5">
              <label className="text-xs text-neutral-400 uppercase tracking-wider block mb-1">
                Fighter Call-sign
              </label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={16}
                className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-hidden focus:border-emerald-500"
              />
            </div>

            <label className="text-xs text-neutral-400 uppercase tracking-wider block mb-2">
              Select Fighter
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {FIGHTERS.map((f) => {
                const isSelected = selectedFighter.id === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => {
                      setSelectedFighter(f);
                      soundEngine.playWhoosh('light');
                    }}
                    className={`relative p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all ${
                      isSelected
                        ? 'bg-neutral-900 border-emerald-500 ring-2 ring-emerald-500/30'
                        : 'bg-neutral-950/80 border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    <img
                      src={f.portraitUrl}
                      alt={f.name}
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-lg object-cover"
                    />
                    <div className="overflow-hidden">
                      <div className="text-xs font-bold text-white truncate">{f.name}</div>
                      <div className="text-[10px] text-neutral-400 truncate">{f.faction} · {f.weaponType}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t border-neutral-800/80 pt-4 mt-6">
            <div className="text-xs text-neutral-400 leading-relaxed font-mono">
              Ready to deploy <strong className="text-emerald-400">{selectedFighter.name}</strong> into combat.
            </div>
          </div>
        </div>

        {/* Right Column: Matchmaking, Room Creation, or Active Lobby */}
        <div className="lg:col-span-7 bg-neutral-900/60 border border-neutral-800 rounded-2xl p-6 backdrop-blur-sm flex flex-col justify-between">
          {!createdRoomCode ? (
            <div className="space-y-6">
              {/* Quick Matchmaking Section */}
              <div className="bg-neutral-950 p-5 rounded-xl border border-neutral-800">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-base font-bold text-white">Ranked Quick Match</h4>
                    <p className="text-xs text-neutral-400">Instantly search for an opponent across the network.</p>
                  </div>
                  <Globe className="w-5 h-5 text-emerald-400" />
                </div>

                {isSearching ? (
                  <div className="flex items-center justify-between bg-neutral-900 p-3 rounded-lg border border-emerald-500/40">
                    <div className="flex items-center gap-3">
                      <RefreshCw className="w-4 h-4 text-emerald-400 animate-spin" />
                      <span className="text-xs font-mono text-emerald-300">Searching for combatant...</span>
                    </div>
                    <button
                      onClick={handleCancelQuickMatch}
                      className="text-xs text-red-400 hover:text-red-300 font-bold px-2 py-1"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleQuickMatch}
                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black tracking-widest text-sm uppercase rounded-lg shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all active:scale-98"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Find Match Now</span>
                  </button>
                )}
              </div>

              {/* Private Custom Rooms Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Create Room */}
                <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 flex flex-col justify-between">
                  <div>
                    <h5 className="text-sm font-bold text-white mb-1">Host Private Room</h5>
                    <p className="text-xs text-neutral-400 mb-4">Create a battle room and share the 4-digit code.</p>
                  </div>
                  <button
                    onClick={handleCreateRoom}
                    className="w-full py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs uppercase tracking-wider rounded-lg border border-neutral-700 transition-colors"
                  >
                    Generate Room
                  </button>
                </div>

                {/* Join Room */}
                <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 flex flex-col justify-between">
                  <div>
                    <h5 className="text-sm font-bold text-white mb-1">Join via Code</h5>
                    <p className="text-xs text-neutral-400 mb-2">Enter code provided by the host.</p>
                    <input
                      type="text"
                      placeholder="e.g. FG42"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      maxLength={4}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-1.5 text-center text-white font-mono font-bold tracking-widest text-sm mb-3 focus:outline-hidden focus:border-emerald-500 uppercase"
                    />
                  </div>
                  <button
                    onClick={handleJoinRoom}
                    disabled={!joinCode.trim()}
                    className="w-full py-2.5 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 text-white font-bold text-xs uppercase tracking-wider rounded-lg border border-neutral-700 transition-colors"
                  >
                    Connect
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Active Room Waiting Screen */
            <div className="space-y-6">
              <div className="bg-neutral-950 p-5 rounded-xl border border-neutral-800 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-neutral-400 uppercase tracking-widest block">Room Access Code</span>
                  <span className="text-3xl font-black font-mono tracking-widest text-emerald-400">{createdRoomCode}</span>
                </div>
                <button
                  onClick={copyRoomCode}
                  className="flex items-center gap-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 px-3 py-1.5 rounded-lg text-xs font-mono text-neutral-300 transition-colors"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Copied!' : 'Copy Code'}</span>
                </button>
              </div>

              {/* Opponent Status */}
              <div className="bg-neutral-950 p-5 rounded-xl border border-neutral-800">
                <span className="text-xs text-neutral-400 uppercase tracking-wider block mb-3">Opponent Status</span>
                {opponent ? (
                  <div className="flex items-center justify-between bg-neutral-900 p-3 rounded-lg border border-neutral-800">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-cyan-950 border border-cyan-500 flex items-center justify-center font-bold text-cyan-400">
                        P2
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white">{opponent.name}</div>
                        <div className="text-xs text-neutral-400 uppercase font-mono">{opponent.fighterId}</div>
                      </div>
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded ${opponentReady ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-neutral-800 text-neutral-400'}`}>
                      {opponentReady ? 'READY' : 'CHOOSING'}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 text-neutral-500 text-xs py-4 justify-center">
                    <RefreshCw className="w-4 h-4 animate-spin text-neutral-500" />
                    <span>Waiting for opponent to connect using code {createdRoomCode}...</span>
                  </div>
                )}
              </div>

              {/* Ready Button */}
              <button
                onClick={toggleReady}
                className={`w-full py-3.5 font-black text-sm uppercase tracking-widest rounded-xl transition-all shadow-lg active:scale-98 ${
                  isReady
                    ? 'bg-neutral-800 text-neutral-300 border border-neutral-700'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-neutral-950 shadow-emerald-500/20'
                }`}
              >
                {isReady ? 'Ready! Waiting for Opponent...' : 'Click When Ready to Fight!'}
              </button>
            </div>
          )}

          <div className="border-t border-neutral-800/80 pt-4 mt-6 flex items-center justify-between text-xs text-neutral-500 font-mono">
            <span>Server: US-East Relay</span>
            <span>Rollback Simulation Enabled</span>
          </div>
        </div>
      </div>
    </div>
  );
};
