import React from 'react';
import { CombatEntity } from '../types/fighter';
import { Trophy, RotateCcw, Home, Users } from 'lucide-react';

interface VictoryScreenProps {
  winner: CombatEntity;
  loser: CombatEntity;
  onRematch: () => void;
  onCharacterSelect: () => void;
  onMainMenu: () => void;
}

export const VictoryScreen: React.FC<VictoryScreenProps> = ({
  winner,
  loser,
  onRematch,
  onCharacterSelect,
  onMainMenu
}) => {
  return (
    <div className="absolute inset-0 z-40 bg-black/85 backdrop-blur-md flex items-center justify-center p-6 font-['Chakra_Petch',sans-serif] select-none text-neutral-100">
      <div className="max-w-2xl w-full bg-neutral-900 border-2 border-amber-500/50 rounded-2xl p-6 md:p-8 shadow-2xl shadow-amber-500/20 relative overflow-hidden flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-300">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-300" />

        <div className="w-16 h-16 rounded-full bg-amber-500/20 border-2 border-amber-500 flex items-center justify-center text-amber-400 mb-4 shadow-lg shadow-amber-500/30">
          <Trophy className="w-8 h-8" />
        </div>

        <span className="text-xs uppercase tracking-widest text-amber-400 font-bold mb-1">
          Battle Concluded
        </span>
        <h1 className="text-4xl md:text-5xl font-black italic tracking-wider text-white mb-2">
          {winner.fighter.name} WINS!
        </h1>
        <p className="text-xs text-neutral-400 uppercase tracking-widest mb-6">
          {winner.fighter.title} · Complete Victory
        </p>

        {/* Winner & Loser Showcase */}
        <div className="grid grid-cols-2 gap-4 w-full max-w-md my-4">
          <div className="bg-neutral-950 p-4 rounded-xl border border-amber-500/40 flex flex-col items-center">
            <div className="w-20 h-20 rounded-lg overflow-hidden border border-amber-500 mb-2">
              <img
                src={winner.fighter.portraitUrl}
                alt={winner.fighter.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-xs font-bold text-amber-400">{winner.fighter.name}</span>
            <span className="text-[10px] text-emerald-400 font-mono">WINNER ({winner.roundsWon} Rounds)</span>
          </div>

          <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 opacity-60 flex flex-col items-center">
            <div className="w-20 h-20 rounded-lg overflow-hidden border border-neutral-700 mb-2">
              <img
                src={loser.fighter.portraitUrl}
                alt={loser.fighter.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover grayscale"
              />
            </div>
            <span className="text-xs font-bold text-neutral-300">{loser.fighter.name}</span>
            <span className="text-[10px] text-rose-400 font-mono">DEFEATED ({loser.roundsWon} Rounds)</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 w-full max-w-md mt-6">
          <button
            onClick={onRematch}
            className="flex-1 py-3 px-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-neutral-950 font-black text-xs tracking-wider uppercase rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Rematch</span>
          </button>
          <button
            onClick={onCharacterSelect}
            className="py-3 px-4 bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs tracking-wider uppercase rounded-xl border border-neutral-700 flex items-center justify-center gap-2 transition-colors"
          >
            <Users className="w-4 h-4" />
            <span>Fighter Select</span>
          </button>
          <button
            onClick={onMainMenu}
            className="py-3 px-4 bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs tracking-wider uppercase rounded-xl border border-neutral-700 flex items-center justify-center gap-2 transition-colors"
          >
            <Home className="w-4 h-4" />
            <span>Menu</span>
          </button>
        </div>
      </div>
    </div>
  );
};
