import React, { useState } from 'react';
import { STAGES } from '../data/stages';
import { StageData } from '../types/fighter';
import { soundEngine } from '../audio/soundEngine';
import { MapPin, ShieldAlert, ArrowRight } from 'lucide-react';

interface StageSelectProps {
  onConfirm: (stage: StageData) => void;
  onBack: () => void;
}

export const StageSelect: React.FC<StageSelectProps> = ({ onConfirm, onBack }) => {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const currentStage = STAGES[selectedIdx];

  const handleSelect = (idx: number) => {
    setSelectedIdx(idx);
    soundEngine.playWhoosh('light');
  };

  const handleFight = () => {
    soundEngine.playSuperDetonation();
    soundEngine.playAnnouncer('FIGHT');
    onConfirm(currentStage);
  };

  return (
    <div className="relative w-full h-full min-h-screen bg-neutral-950 flex flex-col justify-between p-6 md:p-10 font-['Chakra_Petch',sans-serif] text-neutral-100 select-none overflow-y-auto">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-neutral-900 via-neutral-950 to-black pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between border-b border-neutral-800 pb-4">
        <div>
          <h1 className="text-3xl md:text-5xl font-black italic tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-200 to-indigo-400">
            SELECT COMBAT ARENA
          </h1>
          <p className="text-xs md:text-sm text-neutral-400 uppercase tracking-widest mt-1">
            Destructible Physics Environments · Hazard Infiltration
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
            onClick={handleFight}
            className="px-8 py-2.5 bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-500 hover:to-orange-400 text-white font-black text-sm tracking-widest uppercase rounded shadow-lg shadow-red-600/30 flex items-center gap-2 transition-all active:scale-95"
          >
            <span>START FIGHT</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stage Cards Grid */}
      <div className="relative z-10 my-auto py-6 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto w-full">
        {STAGES.map((stage, idx) => {
          const isSelected = selectedIdx === idx;

          return (
            <div
              key={stage.id}
              onClick={() => handleSelect(idx)}
              className={`relative cursor-pointer rounded-2xl overflow-hidden border-2 transition-all p-5 flex flex-col justify-between h-[380px] bg-neutral-900/80 backdrop-blur-sm group ${
                isSelected
                  ? 'border-orange-500 ring-4 ring-orange-500/20 shadow-2xl shadow-orange-500/10 scale-[1.02]'
                  : 'border-neutral-800 hover:border-neutral-600 opacity-80 hover:opacity-100'
              }`}
            >
              {/* Top Bar Indicator */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-orange-400" />
                  <span className="text-xs uppercase tracking-widest font-mono text-neutral-400">
                    Sector 0{idx + 1}
                  </span>
                </div>
                {isSelected && (
                  <span className="bg-orange-500 text-neutral-950 text-[10px] font-black uppercase px-2 py-0.5 rounded">
                    Selected
                  </span>
                )}
              </div>

              {/* Visual Preview Sphere/Color */}
              <div
                className="w-full h-32 rounded-xl my-3 flex items-center justify-center relative overflow-hidden border border-neutral-700/50"
                style={{ backgroundColor: stage.skyColor }}
              >
                <div
                  className="w-24 h-24 rounded-full blur-xl opacity-70 group-hover:scale-125 transition-transform"
                  style={{ backgroundColor: stage.themeColor }}
                />
                <div className="relative text-center px-4">
                  <div className="text-xl font-black tracking-wider text-white drop-shadow">
                    {stage.name}
                  </div>
                  <div className="text-[11px] font-mono text-neutral-300">
                    {stage.subtitle}
                  </div>
                </div>
              </div>

              {/* Description */}
              <p className="text-xs text-neutral-400 line-clamp-3 mb-3 leading-relaxed">
                {stage.description}
              </p>

              {/* Destructible Props List */}
              <div className="border-t border-neutral-800 pt-3">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-neutral-300 uppercase tracking-wider mb-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-orange-400" />
                  <span>Destructible Objects ({stage.props.length})</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {stage.props.map((p) => (
                    <span
                      key={p.id}
                      className="text-[10px] bg-neutral-950 text-neutral-400 px-2 py-0.5 rounded border border-neutral-800 font-mono"
                    >
                      {p.name.replace(/\[.*\]/, '')}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Notes */}
      <div className="relative z-10 text-center text-xs text-neutral-500 font-mono">
        All stages feature dynamic 3D physics fractures, wall splat rebounds, and interactive particle debris.
      </div>
    </div>
  );
};
