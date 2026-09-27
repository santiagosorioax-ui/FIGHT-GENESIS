import React, { useState } from 'react';
import { FIGHTERS } from '../data/fighters';
import { FighterStats } from '../types/fighter';
import { soundEngine } from '../audio/soundEngine';
import { ArrowRight, Swords, Sparkles, Shield, Footprints } from 'lucide-react';

interface CharacterSelectProps {
  onConfirm: (p1Fighter: FighterStats, p2Fighter: FighterStats) => void;
  onBack: () => void;
  isMultiplayer?: boolean;
}

export const CharacterSelect: React.FC<CharacterSelectProps> = ({
  onConfirm,
  onBack,
  isMultiplayer = false
}) => {
  const [p1Index, setP1Index] = useState(0);
  const [p2Index, setP2Index] = useState(1);

  const p1 = FIGHTERS[p1Index];
  const p2 = FIGHTERS[p2Index];

  const handleSelectP1 = (idx: number) => {
    setP1Index(idx);
    soundEngine.playWhoosh('light');
  };

  const handleSelectP2 = (idx: number) => {
    setP2Index(idx);
    soundEngine.playWhoosh('light');
  };

  const handleStart = () => {
    soundEngine.playWhoosh('heavy');
    soundEngine.playAnnouncer('FIGHT');
    onConfirm(p1, p2);
  };

  return (
    <div className="relative w-full h-full min-h-screen bg-neutral-950 flex flex-col justify-between p-6 md:p-10 font-['Chakra_Petch',sans-serif] text-neutral-100 select-none overflow-y-auto">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-neutral-900 via-neutral-950 to-black pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between border-b border-neutral-800 pb-4">
        <div>
          <h1 className="text-3xl md:text-5xl font-black italic tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-300 to-cyan-400">
            WARRIOR SELECTION
          </h1>
          <p className="text-xs md:text-sm text-neutral-400 uppercase tracking-widest mt-1">
            Shadow Fight 3 · Legion vs Dynasty Factions
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="px-4 py-2 text-xs font-semibold text-neutral-400 hover:text-white border border-neutral-800 hover:border-neutral-600 rounded transition-colors"
          >
            Back
          </button>
          <button
            onClick={handleStart}
            className="px-8 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-neutral-950 font-black text-sm tracking-wider uppercase rounded-lg shadow-lg shadow-amber-500/20 flex items-center gap-2 transition-all active:scale-95"
          >
            <span>Proceed to Duel</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="relative z-10 my-auto py-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center max-w-6xl mx-auto w-full">
        {/* P1 Spotlight */}
        <div className="lg:col-span-4 flex flex-col items-center lg:items-start text-left bg-neutral-900/70 border border-amber-500/40 rounded-2xl p-6 backdrop-blur-md relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
          <span className="text-xs font-mono text-amber-400 uppercase tracking-widest font-bold">
            Player 1 · [{p1.faction}]
          </span>

          <div className="relative w-48 h-48 md:w-56 md:h-56 my-4 rounded-xl overflow-hidden border-2 border-amber-500/60 shadow-2xl shadow-amber-500/10 bg-neutral-950">
            <img
              src={p1.portraitUrl}
              alt={p1.name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          </div>

          <h2 className="text-3xl font-black tracking-wide text-white">
            {p1.name}
          </h2>
          <span className="text-xs text-amber-400 font-semibold uppercase tracking-wider mb-1">
            {p1.title}
          </span>
          <div className="flex items-center gap-1.5 text-xs text-cyan-400 font-mono mb-3">
            <Swords className="w-3.5 h-3.5" />
            <span>{p1.weaponName}</span>
          </div>

          <p className="text-xs text-neutral-400 leading-relaxed line-clamp-3 mb-4">
            {p1.description}
          </p>

          <div className="w-full space-y-2 text-xs font-mono border-t border-neutral-800 pt-3">
            <div className="flex items-center justify-between">
              <span className="text-neutral-400">Weapon Reach</span>
              <span className="text-white font-bold">{p1.weaponType}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-neutral-400">Shadow Ability</span>
              <span className="text-cyan-400 font-bold truncate">{p1.moves.shadowAbility.name}</span>
            </div>
          </div>
        </div>

        {/* Center Grid Selector */}
        <div className="lg:col-span-4 flex flex-col items-center">
          <div className="grid grid-cols-2 gap-4 w-full max-w-xs mb-6">
            {FIGHTERS.map((fighter, idx) => {
              const isP1 = p1Index === idx;
              const isP2 = p2Index === idx;

              return (
                <button
                  key={fighter.id}
                  onClick={() => handleSelectP1(idx)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    handleSelectP2(idx);
                  }}
                  className={`relative aspect-square rounded-2xl overflow-hidden border-2 transition-all active:scale-95 group ${
                    isP1 && isP2
                      ? 'border-purple-500 ring-4 ring-purple-500/30'
                      : isP1
                      ? 'border-amber-500 ring-4 ring-amber-500/30'
                      : isP2
                      ? 'border-cyan-500 ring-4 ring-cyan-500/30'
                      : 'border-neutral-800 hover:border-neutral-600 opacity-70 hover:opacity-100'
                  }`}
                >
                  <img
                    src={fighter.portraitUrl}
                    alt={fighter.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                    <span className="text-xs font-bold text-white tracking-wider">
                      {fighter.name}
                    </span>
                    <div className="flex items-center gap-1">
                      {isP1 && <span className="bg-amber-500 text-black text-[9px] font-black px-1.5 py-0.5 rounded">P1</span>}
                      {isP2 && <span className="bg-cyan-500 text-black text-[9px] font-black px-1.5 py-0.5 rounded">P2</span>}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="text-[11px] text-neutral-400 text-center space-y-1">
            <p>Left Click: <strong className="text-amber-400">Select P1</strong> · Right Click: <strong className="text-cyan-400">Select P2</strong></p>
            <p className="font-mono text-neutral-500">Realistic Martial Arts Physics & Shadow Energy</p>
          </div>
        </div>

        {/* P2 Spotlight */}
        <div className="lg:col-span-4 flex flex-col items-center lg:items-end text-right bg-neutral-900/70 border border-cyan-500/40 rounded-2xl p-6 backdrop-blur-md relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-blue-500" />
          <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest font-bold">
            Player 2 · [{p2.faction}]
          </span>

          <div className="relative w-48 h-48 md:w-56 md:h-56 my-4 rounded-xl overflow-hidden border-2 border-cyan-500/60 shadow-2xl shadow-cyan-500/10 bg-neutral-950">
            <img
              src={p2.portraitUrl}
              alt={p2.name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover scale-x-[-1] group-hover:scale-105 transition-transform duration-500"
            />
          </div>

          <h2 className="text-3xl font-black tracking-wide text-white">
            {p2.name}
          </h2>
          <span className="text-xs text-cyan-400 font-semibold uppercase tracking-wider mb-1">
            {p2.title}
          </span>
          <div className="flex items-center gap-1.5 text-xs text-amber-400 font-mono mb-3 flex-row-reverse">
            <Swords className="w-3.5 h-3.5" />
            <span>{p2.weaponName}</span>
          </div>

          <p className="text-xs text-neutral-400 leading-relaxed line-clamp-3 mb-4">
            {p2.description}
          </p>

          <div className="w-full space-y-2 text-xs font-mono border-t border-neutral-800 pt-3">
            <div className="flex items-center justify-between flex-row-reverse">
              <span className="text-neutral-400">Weapon Reach</span>
              <span className="text-white font-bold">{p2.weaponType}</span>
            </div>
            <div className="flex items-center justify-between flex-row-reverse">
              <span className="text-neutral-400">Shadow Ability</span>
              <span className="text-amber-400 font-bold truncate">{p2.moves.shadowAbility.name}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
