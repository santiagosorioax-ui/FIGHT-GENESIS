import React from 'react';
import { CombatEntity, GameMode } from '../types/fighter';
import { Pause, ChevronRight, ChevronLeft, Swords, Footprints, Sparkles, Crosshair } from 'lucide-react';

interface FightHUDProps {
  p1: CombatEntity;
  p2: CombatEntity;
  roundTime: number;
  currentRound: number;
  gameMode: GameMode;
  pingMs?: number;
  announcement?: string | null;
  onPauseToggle: () => void;
  onActionTrigger?: (action: 'weapon' | 'kick' | 'heavy' | 'shadow' | 'ranged') => void;
}

export const FightHUD: React.FC<FightHUDProps> = ({
  p1,
  p2,
  roundTime,
  currentRound,
  gameMode,
  pingMs,
  announcement,
  onPauseToggle,
  onActionTrigger
}) => {
  const p1HpPercent = Math.max(0, (p1.health / p1.fighter.maxHealth) * 100);
  const p2HpPercent = Math.max(0, (p2.health / p2.fighter.maxHealth) * 100);

  // Shadow Energy is 0 - 100%
  const p1ShadowPercent = Math.min(100, Math.max(0, p1.shadowEnergy));
  const p2ShadowPercent = Math.min(100, Math.max(0, p2.shadowEnergy));

  const isP1ShadowReady = p1.shadowEnergy >= 100 || p1.isShadowForm;
  const isP2ShadowReady = p2.shadowEnergy >= 100 || p2.isShadowForm;

  return (
    <div className="absolute inset-0 pointer-events-none select-none flex flex-col justify-between p-3 md:p-6 z-20 font-['Chakra_Petch',sans-serif]">
      {/* Top Header: Exact Shadow Fight 3 Health & Shadow Bar Layout */}
      <div className="w-full max-w-6xl mx-auto flex items-start justify-between gap-2 md:gap-6">
        {/* Left Side: P1 (TAIGA) */}
        <div className="flex-1 flex flex-col items-start">
          {/* Fighter Name & Faction Header */}
          <div className="flex items-center gap-2 mb-1">
            <div className="flex text-amber-400">
              <ChevronRight className="w-4 h-4 -mr-2 text-amber-500/80" />
              <ChevronRight className="w-4 h-4 text-amber-400" />
            </div>
            <span className="text-base md:text-xl font-black tracking-widest text-white drop-shadow uppercase">
              {p1.fighter.name}
            </span>
            <span className="text-[10px] text-neutral-400 font-mono hidden sm:inline">
              [{p1.fighter.faction}]
            </span>
            {p1.isShadowForm && (
              <span className="bg-cyan-500/30 text-cyan-300 border border-cyan-400 px-1.5 py-0.2 rounded text-[10px] font-bold tracking-widest animate-pulse">
                SHADOW FORM
              </span>
            )}
          </div>

          {/* Main Health Bar (Orange Gradient with Metallic Bevel) */}
          <div className="relative w-full h-5 md:h-6 bg-neutral-950 border border-neutral-700/80 overflow-hidden shadow-lg rounded-xs">
            {/* Red Delayed Bar */}
            <div
              className="absolute inset-y-0 left-0 bg-red-900/90 transition-all duration-500"
              style={{ width: `${p1HpPercent}%` }}
            />
            {/* Active Gold/Orange Bar from SF3 */}
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-600 via-orange-500 to-amber-400 transition-all duration-75 shadow-inner"
              style={{ width: `${p1HpPercent}%` }}
            />
            {/* Shimmer line */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-white/30" />
          </div>

          {/* Shadow Energy Bar (Luminous Cyan) */}
          <div className="relative w-full h-2 md:h-2.5 bg-neutral-950 border border-neutral-800 mt-1 overflow-hidden rounded-xs">
            <div
              className={`h-full transition-all duration-150 ${
                isP1ShadowReady
                  ? 'bg-gradient-to-r from-cyan-400 via-sky-300 to-teal-200 shadow-md shadow-cyan-400 animate-pulse'
                  : 'bg-cyan-600/90'
              }`}
              style={{ width: `${p1ShadowPercent}%` }}
            />
          </div>

          {/* SF3 Round Win Indicators (3 ticks) */}
          <div className="flex items-center gap-1 mt-1.5 ml-0.5">
            <div
              className={`w-4 h-1.5 rounded-xs border border-neutral-700 transition-colors ${
                p1.roundsWon >= 1 ? 'bg-amber-400 border-amber-300 shadow-xs shadow-amber-400' : 'bg-neutral-900'
              }`}
            />
            <div
              className={`w-4 h-1.5 rounded-xs border border-neutral-700 transition-colors ${
                p1.roundsWon >= 2 ? 'bg-amber-400 border-amber-300 shadow-xs shadow-amber-400' : 'bg-neutral-900'
              }`}
            />
            <div
              className={`w-4 h-1.5 rounded-xs border border-neutral-700 transition-colors ${
                p1.roundsWon >= 3 ? 'bg-amber-400 border-amber-300 shadow-xs shadow-amber-400' : 'bg-neutral-900'
              }`}
            />
            <span className="text-[10px] font-mono text-neutral-400 ml-2">
              HP: {Math.ceil(p1.health)}
            </span>
          </div>
        </div>

        {/* Center: Pause Button & Round Timer from SF3 */}
        <div className="flex flex-col items-center shrink-0 px-2 pt-0.5">
          {/* Pause Button || */}
          <button
            onClick={onPauseToggle}
            className="pointer-events-auto w-7 h-5 flex items-center justify-center text-neutral-400 hover:text-white transition-colors mb-0.5 cursor-pointer"
            title="Pause"
          >
            <Pause className="w-3.5 h-3.5 fill-current" />
          </button>

          {/* Digital Timer matching screenshot */}
          <div className="text-3xl md:text-4xl font-mono font-black text-cyan-300 drop-shadow leading-none tabular-nums">
            {roundTime < 10 ? `0${roundTime}` : roundTime}
          </div>

          {pingMs !== undefined && (
            <div className="text-[9px] font-mono text-emerald-400 mt-0.5">
              {pingMs}ms
            </div>
          )}
        </div>

        {/* Right Side: P2 (TSUNAMI) */}
        <div className="flex-1 flex flex-col items-end">
          {/* Fighter Name & Faction Header (Mirrored) */}
          <div className="flex items-center gap-2 mb-1 flex-row-reverse">
            <div className="flex text-amber-400 flex-row-reverse">
              <ChevronLeft className="w-4 h-4 -ml-2 text-amber-500/80" />
              <ChevronLeft className="w-4 h-4 text-amber-400" />
            </div>
            <span className="text-base md:text-xl font-black tracking-widest text-white drop-shadow uppercase">
              {p2.fighter.name}
            </span>
            <span className="text-[10px] text-neutral-400 font-mono hidden sm:inline">
              [{p2.fighter.faction}]
            </span>
            {p2.isShadowForm && (
              <span className="bg-cyan-500/30 text-cyan-300 border border-cyan-400 px-1.5 py-0.2 rounded text-[10px] font-bold tracking-widest animate-pulse">
                SHADOW FORM
              </span>
            )}
          </div>

          {/* Main Health Bar (Mirrored) */}
          <div className="relative w-full h-5 md:h-6 bg-neutral-950 border border-neutral-700/80 overflow-hidden shadow-lg rounded-xs">
            <div
              className="absolute inset-y-0 right-0 bg-red-900/90 transition-all duration-500"
              style={{ width: `${p2HpPercent}%` }}
            />
            <div
              className="absolute inset-y-0 right-0 bg-gradient-to-l from-amber-600 via-orange-500 to-amber-400 transition-all duration-75 shadow-inner"
              style={{ width: `${p2HpPercent}%` }}
            />
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-white/30" />
          </div>

          {/* Shadow Energy Bar (Mirrored) */}
          <div className="relative w-full h-2 md:h-2.5 bg-neutral-950 border border-neutral-800 mt-1 overflow-hidden rounded-xs">
            <div
              className={`h-full transition-all duration-150 ml-auto ${
                isP2ShadowReady
                  ? 'bg-gradient-to-l from-cyan-400 via-sky-300 to-teal-200 shadow-md shadow-cyan-400 animate-pulse'
                  : 'bg-cyan-600/90'
              }`}
              style={{ width: `${p2ShadowPercent}%` }}
            />
          </div>

          {/* SF3 Round Win Indicators (Mirrored) */}
          <div className="flex items-center gap-1 mt-1.5 mr-0.5 flex-row-reverse">
            <div
              className={`w-4 h-1.5 rounded-xs border border-neutral-700 transition-colors ${
                p2.roundsWon >= 1 ? 'bg-amber-400 border-amber-300 shadow-xs shadow-amber-400' : 'bg-neutral-900'
              }`}
            />
            <div
              className={`w-4 h-1.5 rounded-xs border border-neutral-700 transition-colors ${
                p2.roundsWon >= 2 ? 'bg-amber-400 border-amber-300 shadow-xs shadow-amber-400' : 'bg-neutral-900'
              }`}
            />
            <div
              className={`w-4 h-1.5 rounded-xs border border-neutral-700 transition-colors ${
                p2.roundsWon >= 3 ? 'bg-amber-400 border-amber-300 shadow-xs shadow-amber-400' : 'bg-neutral-900'
              }`}
            />
            <span className="text-[10px] font-mono text-neutral-400 mr-2">
              HP: {Math.ceil(p2.health)}
            </span>
          </div>
        </div>
      </div>

      {/* Mid-Screen Announcements & Combo Strings */}
      <div className="w-full flex justify-between items-center px-4 md:px-12 my-auto pointer-events-none">
        {/* P1 Combo Counter */}
        <div className="min-w-[140px]">
          {p1.comboCount > 1 && (
            <div className="animate-bounce flex flex-col items-start bg-neutral-950/80 border-l-4 border-amber-500 p-2 rounded-r backdrop-blur-xs">
              <span className="text-2xl md:text-3xl font-black italic tracking-tighter text-amber-400 drop-shadow">
                {p1.comboCount} COMBO
              </span>
              <span className="text-xs font-mono text-neutral-300">
                {p1.comboDamage} DAMAGE
              </span>
            </div>
          )}
          {p1.state === 'PERFECT_PARRY' && (
            <div className="text-xs font-bold text-cyan-400 uppercase tracking-widest bg-cyan-950/80 px-2 py-1 rounded border border-cyan-400/50 animate-pulse">
              BLOCKED / PARRY
            </div>
          )}
        </div>

        {/* Center Callout */}
        {announcement && (
          <div className="text-center animate-in zoom-in-75 duration-200">
            <h1 className="text-3xl md:text-5xl font-black italic tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-orange-400 to-amber-200 drop-shadow-[0_4px_20px_rgba(245,158,11,0.7)]">
              {announcement}
            </h1>
          </div>
        )}

        {/* P2 Combo Counter */}
        <div className="min-w-[140px] flex flex-col items-end">
          {p2.comboCount > 1 && (
            <div className="animate-bounce flex flex-col items-end bg-neutral-950/80 border-r-4 border-amber-500 p-2 rounded-l backdrop-blur-xs">
              <span className="text-2xl md:text-3xl font-black italic tracking-tighter text-amber-400 drop-shadow">
                {p2.comboCount} COMBO
              </span>
              <span className="text-xs font-mono text-neutral-300">
                {p2.comboDamage} DAMAGE
              </span>
            </div>
          )}
          {p2.state === 'PERFECT_PARRY' && (
            <div className="text-xs font-bold text-cyan-400 uppercase tracking-widest bg-cyan-950/80 px-2 py-1 rounded border border-cyan-400/50 animate-pulse">
              BLOCKED / PARRY
            </div>
          )}
        </div>
      </div>

      {/* Bottom Area: Controls Reference Dock + Touch Action Buttons from SF3 */}
      <div className="w-full max-w-6xl mx-auto flex items-end justify-between gap-4">
        {/* Left: Directional Controls Display (from SF3 screenshot) */}
        <div className="hidden md:flex items-center gap-3 bg-neutral-950/70 border border-neutral-800/80 rounded-xl px-4 py-2.5 text-xs text-neutral-300 backdrop-blur-xs font-mono">
          <div className="flex items-center gap-1">
            <kbd className="bg-neutral-800 px-1.5 py-0.5 rounded text-white font-bold">W</kbd>
            <kbd className="bg-neutral-800 px-1.5 py-0.5 rounded text-white font-bold">A</kbd>
            <kbd className="bg-neutral-800 px-1.5 py-0.5 rounded text-white font-bold">S</kbd>
            <kbd className="bg-neutral-800 px-1.5 py-0.5 rounded text-white font-bold">D</kbd>
          </div>
          <span className="text-neutral-400">Move / Jump / Crouch</span>
        </div>

        {/* Right: Action Buttons matching the SF3 right-side layout */}
        <div className="flex items-center gap-2 pointer-events-auto ml-auto">
          {/* Weapon Strike Button */}
          <button
            onClick={() => onActionTrigger?.('weapon')}
            className="flex flex-col items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-full bg-neutral-900/90 border-2 border-amber-500/80 hover:border-amber-400 text-amber-400 active:scale-90 transition-all shadow-lg shadow-amber-500/20"
            title="Weapon Slash [J]"
          >
            <Swords className="w-5 h-5" />
            <span className="text-[9px] font-mono text-white font-bold">J</span>
          </button>

          {/* Unarmed Kick Button */}
          <button
            onClick={() => onActionTrigger?.('kick')}
            className="flex flex-col items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-full bg-neutral-900/90 border-2 border-neutral-600 hover:border-neutral-400 text-neutral-200 active:scale-90 transition-all shadow-lg"
            title="Martial Kick [U]"
          >
            <Footprints className="w-5 h-5" />
            <span className="text-[9px] font-mono text-white font-bold">U</span>
          </button>

          {/* Heavy Attack Button */}
          <button
            onClick={() => onActionTrigger?.('heavy')}
            className="flex flex-col items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-full bg-neutral-900/90 border-2 border-orange-500/80 hover:border-orange-400 text-orange-400 active:scale-90 transition-all shadow-lg"
            title="Heavy Attack [K]"
          >
            <span className="text-xs font-black">HVY</span>
            <span className="text-[9px] font-mono text-white font-bold">K</span>
          </button>

          {/* Ranged Weapon Button */}
          <button
            onClick={() => onActionTrigger?.('ranged')}
            className="flex flex-col items-center justify-center w-11 h-11 md:w-13 md:h-13 rounded-full bg-neutral-900/90 border-2 border-neutral-700 hover:border-neutral-500 text-neutral-300 active:scale-90 transition-all shadow-lg"
            title="Ranged Throw [O]"
          >
            <Crosshair className="w-4 h-4" />
            <span className="text-[8px] font-mono text-neutral-300 font-bold">O</span>
          </button>

          {/* Shadow Form Vortex Button (Iconic SF3 Shadow Vortex) */}
          <button
            onClick={() => onActionTrigger?.('shadow')}
            disabled={!isP1ShadowReady}
            className={`flex flex-col items-center justify-center w-14 h-14 md:w-16 md:h-16 rounded-full border-2 transition-all active:scale-90 shadow-xl ${
              isP1ShadowReady
                ? 'bg-cyan-950/90 border-cyan-400 text-cyan-300 shadow-cyan-400/40 animate-pulse cursor-pointer ring-4 ring-cyan-500/20'
                : 'bg-neutral-900/60 border-neutral-800 text-neutral-600 opacity-40 cursor-not-allowed'
            }`}
            title="Shadow Form / Shadow Ability [I]"
          >
            <Sparkles className="w-6 h-6 animate-spin [animation-duration:6s]" />
            <span className="text-[9px] font-mono font-bold tracking-wider">
              {p1.isShadowForm ? 'BURST' : 'SHADOW'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
