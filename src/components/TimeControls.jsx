import React from 'react';
import { Play, Pause, RotateCcw, FastForward, SkipForward, AlertCircle } from 'lucide-react';

export default function TimeControls({
  simTimeSeconds,
  isPlaying,
  playbackSpeed,
  tcaMinutes,
  onTogglePlay,
  onChangeSpeed,
  onResetTime,
  onStepForward,
  onJumpToTCA
}) {
  const currentMinutes = (simTimeSeconds / 60).toFixed(1);
  const tcaMinFormatted = tcaMinutes ? tcaMinutes.toFixed(1) : '--';

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 backdrop-blur-md px-5 py-3 rounded-xl flex flex-wrap items-center justify-between gap-4 shadow-xl">
      {/* Time Display */}
      <div className="flex items-center gap-4 font-mono">
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider">SIMULATION TIME (T+)</span>
          <span className="text-lg font-bold text-cyan-400">
            {Math.floor(simTimeSeconds / 60)}m {Math.floor(simTimeSeconds % 60).toString().padStart(2, '0')}s
          </span>
        </div>

        <div className="h-8 w-px bg-slate-800" />

        <div className="flex flex-col">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider">TIME TO TCA</span>
          <span className={`text-base font-bold ${simTimeSeconds / 60 > tcaMinutes ? 'text-slate-500' : 'text-amber-400'}`}>
            {simTimeSeconds / 60 > tcaMinutes
              ? 'PASSED TCA'
              : `${(tcaMinutes - simTimeSeconds / 60).toFixed(1)} min`}
          </span>
        </div>
      </div>

      {/* Playback Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={onResetTime}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
          title="Reset to T=0"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <button
          onClick={onTogglePlay}
          className={`px-4 py-2 rounded-lg font-mono font-semibold text-xs flex items-center gap-2 transition-all shadow-lg ${
            isPlaying
              ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/20'
              : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-600/20'
          }`}
        >
          {isPlaying ? (
            <>
              <Pause className="w-4 h-4" /> PAUSE SIM
            </>
          ) : (
            <>
              <Play className="w-4 h-4" /> START SIM
            </>
          )}
        </button>

        <button
          onClick={onStepForward}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
          title="Step Forward +1 minute"
        >
          <SkipForward className="w-4 h-4" />
        </button>

        {/* Speed Multiplier Options */}
        <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800 text-xs font-mono ml-2">
          {[1, 5, 20, 60, 300].map(s => (
            <button
              key={s}
              onClick={() => onChangeSpeed(s)}
              className={`px-2 py-0.5 rounded transition-colors ${
                playbackSpeed === s ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      {/* Jump to TCA Shortcut */}
      <button
        onClick={onJumpToTCA}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-600/50 text-xs font-mono font-semibold transition-all shadow-lg shadow-amber-950/40"
      >
        <AlertCircle className="w-3.5 h-3.5" />
        JUMP TO TCA ({tcaMinFormatted} MIN)
      </button>
    </div>
  );
}
