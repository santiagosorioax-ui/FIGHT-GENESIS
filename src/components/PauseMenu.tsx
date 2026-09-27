import React from 'react';
import { Play, RotateCcw, Home, Users, Volume2, VolumeX } from 'lucide-react';

interface PauseMenuProps {
  onResume: () => void;
  onRestart: () => void;
  onCharacterSelect: () => void;
  onMainMenu: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const PauseMenu: React.FC<PauseMenuProps> = ({
  onResume,
  onRestart,
  onCharacterSelect,
  onMainMenu,
  isMuted,
  onToggleMute
}) => {
  return (
    <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6 font-['Chakra_Petch',sans-serif] text-neutral-100 select-none">
      <div className="max-w-sm w-full bg-neutral-900 border border-neutral-700 rounded-2xl p-6 shadow-2xl flex flex-col items-center text-center">
        <h2 className="text-2xl font-black italic tracking-widest text-amber-400 mb-1">
          BATTLE PAUSED
        </h2>
        <p className="text-xs text-neutral-400 uppercase tracking-widest mb-6">
          Fight Genesis Tactical Intermission
        </p>

        <div className="w-full space-y-2.5">
          <button
            onClick={onResume}
            className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all active:scale-98"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Resume Fight</span>
          </button>

          <button
            onClick={onRestart}
            className="w-full py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl border border-neutral-700 flex items-center justify-center gap-2 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Restart Round</span>
          </button>

          <button
            onClick={onCharacterSelect}
            className="w-full py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl border border-neutral-700 flex items-center justify-center gap-2 transition-colors"
          >
            <Users className="w-4 h-4" />
            <span>Character Select</span>
          </button>

          <button
            onClick={onMainMenu}
            className="w-full py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl border border-neutral-700 flex items-center justify-center gap-2 transition-colors"
          >
            <Home className="w-4 h-4" />
            <span>Quit to Title</span>
          </button>

          <button
            onClick={onToggleMute}
            className="w-full py-2 bg-neutral-950 text-neutral-400 hover:text-white font-mono text-xs rounded-lg border border-neutral-800 flex items-center justify-center gap-2 transition-colors mt-2"
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-red-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
            <span>{isMuted ? 'Audio Muted' : 'Audio Enabled'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
