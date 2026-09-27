import React, { useState, useEffect } from 'react';
import courtyardBg from '../assets/images/sf3_temple_courtyard_1790470389380.jpg';
import { GameMode } from '../types/fighter';
import { soundEngine } from '../audio/soundEngine';
import { Globe, Users, Bot, BookOpen, Keyboard, Swords } from 'lucide-react';

interface TitleScreenProps {
  onSelectMode: (mode: GameMode) => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onSelectMode,
  isMuted,
  onToggleMute
}) => {
  const [showControlsModal, setShowControlsModal] = useState(false);

  // Play Japanese flute music on first gesture without any buttons
  useEffect(() => {
    soundEngine.unlockAudioContext();
    if (!isMuted) {
      soundEngine.startJapaneseMenuMusic();
    }

    const startMusic = () => {
      soundEngine.unlockAudioContext();
      if (!isMuted) {
        soundEngine.startJapaneseMenuMusic();
      }
    };

    window.addEventListener('click', startMusic, { once: true });
    window.addEventListener('keydown', startMusic, { once: true });

    return () => {
      window.removeEventListener('click', startMusic);
      window.removeEventListener('keydown', startMusic);
    };
  }, [isMuted]);

  const handleSelect = (mode: GameMode) => {
    soundEngine.playWhoosh('heavy');
    if (mode !== 'LOCAL_VS' && mode !== 'TRAINING') {
      soundEngine.stopJapaneseMenuMusic();
    }
    onSelectMode(mode);
  };

  return (
    <div className="relative w-full h-full min-h-screen bg-neutral-950 flex flex-col justify-between p-6 md:p-12 font-['Chakra_Petch',sans-serif] text-neutral-100 select-none overflow-hidden">
      {/* Background Courtyard Environment without any pink leaves */}
      <div className="absolute inset-0 z-0">
        <img
          src={courtyardBg}
          alt="Temple Courtyard"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover filter brightness-60 contrast-115 scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/70 to-black/45" />
      </div>

      {/* Top Header Bar */}
      <header className="relative z-10 flex items-center justify-between border-b border-neutral-800/80 pb-4 backdrop-blur-xs">
        <div className="flex items-center gap-3">
          <span className="text-xl md:text-2xl font-black italic tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-300 to-cyan-400">
            FIGHT GENESIS
          </span>
          <span className="text-[10px] font-mono bg-neutral-900/90 text-amber-300 border border-neutral-700 px-2.5 py-0.5 rounded uppercase tracking-wider hidden sm:inline">
            PC Fighting Game
          </span>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              soundEngine.playWhoosh('light');
              setShowControlsModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-700 rounded-lg text-xs font-semibold text-neutral-300 transition-colors cursor-pointer"
          >
            <Keyboard className="w-3.5 h-3.5 text-amber-400" />
            <span>Controls</span>
          </button>
        </div>
      </header>

      {/* Hero Title & Lore */}
      <div className="relative z-10 max-w-4xl my-auto text-left py-8">
        <div className="inline-flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-widest text-amber-400 mb-2">
          <Swords className="w-3.5 h-3.5" />
          <span>Combate Táctico con Armas · Físicas en Tiempo Real</span>
        </div>

        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black italic tracking-tighter text-white drop-shadow-[0_10px_35px_rgba(0,0,0,0.9)] leading-none mb-4">
          FIGHT GENESIS
        </h1>

        <p className="text-sm md:text-base text-neutral-300 max-w-xl leading-relaxed mb-8 drop-shadow font-['Plus_Jakarta_Sans']">
          Juego de combate para PC con armas tradicionales, transformación en Modo Sombra y arenas 3D destructibles con físicas realistas.
        </p>

        {/* Game Mode Selection Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl">
          <button
            onClick={() => handleSelect('ONLINE')}
            className="group relative bg-neutral-900/85 hover:bg-neutral-850 border border-cyan-500/40 hover:border-cyan-400 p-5 rounded-2xl flex flex-col justify-between text-left backdrop-blur-md transition-all hover:scale-[1.02] shadow-xl hover:shadow-cyan-500/10 active:scale-98 cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 mb-4 group-hover:scale-110 transition-transform">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest block mb-0.5">Online Real-Time</span>
              <h3 className="text-lg font-bold text-white">Duelo Multijugador</h3>
              <p className="text-xs text-neutral-400 mt-1">Partidas rápidas o salas privadas por código.</p>
            </div>
          </button>

          <button
            onClick={() => handleSelect('LOCAL_VS')}
            className="group relative bg-neutral-900/85 hover:bg-neutral-850 border border-amber-500/40 hover:border-amber-400 p-5 rounded-2xl flex flex-col justify-between text-left backdrop-blur-md transition-all hover:scale-[1.02] shadow-xl hover:shadow-amber-500/10 active:scale-98 cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mb-4 group-hover:scale-110 transition-transform">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-mono text-amber-400 uppercase tracking-widest block mb-0.5">PC Compartido</span>
              <h3 className="text-lg font-bold text-white">Versus Local</h3>
              <p className="text-xs text-neutral-400 mt-1">2 jugadores: Kaelen Vance vs Ren Zhao.</p>
            </div>
          </button>

          <button
            onClick={() => handleSelect('ARCADE')}
            className="group relative bg-neutral-900/85 hover:bg-neutral-850 border border-orange-500/40 hover:border-orange-400 p-5 rounded-2xl flex flex-col justify-between text-left backdrop-blur-md transition-all hover:scale-[1.02] shadow-xl hover:shadow-orange-500/10 active:scale-98 cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400 mb-4 group-hover:scale-110 transition-transform">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-mono text-orange-400 uppercase tracking-widest block mb-0.5">Duelo Individual</span>
              <h3 className="text-lg font-bold text-white">Duelo vs IA</h3>
              <p className="text-xs text-neutral-400 mt-1">Lucha contra oponentes con inteligencia artificial.</p>
            </div>
          </button>

          <button
            onClick={() => handleSelect('TRAINING')}
            className="group relative bg-neutral-900/85 hover:bg-neutral-850 border border-emerald-500/40 hover:border-emerald-400 p-5 rounded-2xl flex flex-col justify-between text-left backdrop-blur-md transition-all hover:scale-[1.02] shadow-xl hover:shadow-emerald-500/10 active:scale-98 cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-4 group-hover:scale-110 transition-transform">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-mono text-emerald-400 uppercase tracking-widest block mb-0.5">Dojo Marcial</span>
              <h3 className="text-lg font-bold text-white">Entrenamiento</h3>
              <p className="text-xs text-neutral-400 mt-1">Practica el espaciado, desvíos y combos.</p>
            </div>
          </button>
        </div>
      </div>

      {/* Footer Info */}
      <footer className="relative z-10 flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-500 border-t border-neutral-800/80 pt-4 font-mono gap-2">
        <div>Fight Genesis © 2026 · Motor de Combate para PC</div>
        <div className="flex items-center gap-3">
          <span>Flauta Shakuhachi & Campanas Rin Gong</span>
          <span>·</span>
          <span>Arenas 3D Destructibles</span>
        </div>
      </footer>

      {/* Controls Modal */}
      {showControlsModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-neutral-900 border border-neutral-700 rounded-2xl max-w-xl w-full p-6 shadow-2xl relative">
            <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
              <Keyboard className="w-5 h-5 text-amber-400" />
              <span>Mapa de Controles de Combate</span>
            </h2>
            <p className="text-xs text-neutral-400 mb-4">Configuración de teclado de PC y mandos.</p>

            <div className="space-y-4 text-xs font-mono">
              <div className="bg-neutral-950 p-3.5 rounded-lg border border-neutral-800">
                <span className="text-amber-400 font-bold block mb-2 font-['Chakra_Petch']">JUGADOR 1 (WASD + Teclas de Acción)</span>
                <div className="grid grid-cols-2 gap-2 text-neutral-300">
                  <div><kbd className="bg-neutral-800 px-1.5 py-0.5 rounded text-white">WASD</kbd> Moverse / Saltar / Agacharse</div>
                  <div><kbd className="bg-neutral-800 px-1.5 py-0.5 rounded text-white">J</kbd> Tajo de Arma</div>
                  <div><kbd className="bg-neutral-800 px-1.5 py-0.5 rounded text-white">K</kbd> Golpe Pesado</div>
                  <div><kbd className="bg-neutral-800 px-1.5 py-0.5 rounded text-white">U</kbd> Patada Marcial</div>
                  <div><kbd className="bg-neutral-800 px-1.5 py-0.5 rounded text-white">L</kbd> Técnica Especial</div>
                  <div><kbd className="bg-neutral-800 px-1.5 py-0.5 rounded text-white">O</kbd> Arma Arrojadiza</div>
                  <div><kbd className="bg-neutral-800 px-1.5 py-0.5 rounded text-white">I</kbd> <strong className="text-cyan-400">Modo Sombra / Habilidad</strong></div>
                  <div><kbd className="bg-neutral-800 px-1.5 py-0.5 rounded text-white">Espacio</kbd> Agarre / Derribo</div>
                </div>
              </div>

              <div className="bg-neutral-950 p-3.5 rounded-lg border border-neutral-800">
                <span className="text-cyan-400 font-bold block mb-2 font-['Chakra_Petch']">JUGADOR 2 (Modo Versus Local)</span>
                <div className="grid grid-cols-2 gap-2 text-neutral-300">
                  <div><kbd className="bg-neutral-800 px-1.5 py-0.5 rounded text-white">Flechas</kbd> Moverse / Saltar / Agacharse</div>
                  <div><kbd className="bg-neutral-800 px-1.5 py-0.5 rounded text-white">Numpad 1</kbd> Tajo de Arma</div>
                  <div><kbd className="bg-neutral-800 px-1.5 py-0.5 rounded text-white">Numpad 2</kbd> Golpe Pesado</div>
                  <div><kbd className="bg-neutral-800 px-1.5 py-0.5 rounded text-white">Numpad 4</kbd> Patada</div>
                  <div><kbd className="bg-neutral-800 px-1.5 py-0.5 rounded text-white">Numpad 3</kbd> Técnica Especial</div>
                  <div><kbd className="bg-neutral-800 px-1.5 py-0.5 rounded text-white">Numpad 5</kbd> <strong className="text-cyan-400">Habilidad de Sombra</strong></div>
                  <div><kbd className="bg-neutral-800 px-1.5 py-0.5 rounded text-white">Numpad 0</kbd> Agarre</div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowControlsModal(false)}
              className="mt-6 w-full py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
