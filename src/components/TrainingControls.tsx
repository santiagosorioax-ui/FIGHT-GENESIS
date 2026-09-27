import React from 'react';
import { CombatEntity } from '../types/fighter';
import { RotateCcw, Activity } from 'lucide-react';

interface TrainingControlsProps {
  dummyAction: 'STAND' | 'CROUCH' | 'JUMP' | 'AUTO_BLOCK' | 'CPU';
  onSelectDummyAction: (action: 'STAND' | 'CROUCH' | 'JUMP' | 'AUTO_BLOCK' | 'CPU') => void;
  onResetPosition: () => void;
  p1: CombatEntity;
  p2: CombatEntity;
}

export const TrainingControls: React.FC<TrainingControlsProps> = ({
  dummyAction,
  onSelectDummyAction,
  onResetPosition,
  p1,
  p2
}) => {
  const currentMove = p1.currentMove;
  const frameAdvantage = currentMove
    ? currentMove.hitstunFrames - (currentMove.activeFrames + currentMove.recoveryFrames)
    : 0;

  return (
    <div className="absolute top-20 left-4 z-30 pointer-events-auto bg-neutral-950/85 border border-neutral-800 rounded-xl p-3.5 backdrop-blur-md font-['Chakra_Petch',sans-serif] text-xs max-w-xs shadow-2xl">
      <div className="flex items-center justify-between border-b border-neutral-800 pb-2 mb-2.5">
        <span className="font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-amber-400" />
          <span>Dojo Diagnostics</span>
        </span>
        <button
          onClick={onResetPosition}
          className="p-1 text-neutral-400 hover:text-white bg-neutral-900 border border-neutral-800 rounded hover:border-neutral-700 transition-colors"
          title="Reset Positions"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Frame Data Display */}
      <div className="bg-neutral-900/90 rounded-lg p-2.5 border border-neutral-800 font-mono space-y-1 mb-3">
        <div className="flex justify-between text-neutral-400">
          <span>Active Move:</span>
          <span className="text-white font-bold">{currentMove ? currentMove.name : 'Neutral'}</span>
        </div>
        <div className="flex justify-between text-neutral-400">
          <span>Startup / Active / Rec:</span>
          <span className="text-white">
            {currentMove ? `${currentMove.startupFrames}f / ${currentMove.activeFrames}f / ${currentMove.recoveryFrames}f` : '-'}
          </span>
        </div>
        <div className="flex justify-between text-neutral-400">
          <span>Hit Advantage:</span>
          <span className={`font-bold ${frameAdvantage > 0 ? 'text-emerald-400' : frameAdvantage < 0 ? 'text-rose-400' : 'text-neutral-300'}`}>
            {currentMove ? `${frameAdvantage > 0 ? '+' : ''}${frameAdvantage}f` : '-'}
          </span>
        </div>
      </div>

      {/* Dummy Action Selector */}
      <div>
        <label className="text-[10px] text-neutral-400 uppercase tracking-widest block mb-1.5 font-bold">
          Dummy Behavior
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {(['AUTO_BLOCK', 'STAND', 'CROUCH', 'JUMP', 'CPU'] as const).map((action) => (
            <button
              key={action}
              onClick={() => onSelectDummyAction(action)}
              className={`py-1 px-2 rounded text-[11px] font-bold uppercase transition-all ${
                dummyAction === action
                  ? 'bg-amber-500 text-neutral-950 shadow-sm'
                  : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
              }`}
            >
              {action.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
