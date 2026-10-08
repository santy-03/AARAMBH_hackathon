import React, { useState, useEffect } from 'react';
import { Satellite, ShieldAlert, Zap, Globe, Sparkles, Volume2, VolumeX, RotateCcw } from 'lucide-react';
import { HACKATHON_SCENARIOS } from '../physics/scenarios.js';

export default function Header({
  activeScenarioId,
  onSelectScenario,
  threatLevel,
  riskScore,
  hasAppliedManeuver,
  onResetManeuver
}) {
  const [utcTime, setUtcTime] = useState(new Date().toUTCString());
  const [audioMuted, setAudioMuted] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setUtcTime(new Date().toUTCString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const activeScenario = HACKATHON_SCENARIOS.find(s => s.id === activeScenarioId) || HACKATHON_SCENARIOS[0];

  return (
    <header className="w-full bg-slate-900/90 border-b border-slate-800 backdrop-blur-xl px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-40 shadow-xl">
      {/* Brand Title */}
      <div className="flex items-center gap-3">
        <div className="relative p-2.5 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-500/40 text-cyan-400 shadow-lg shadow-cyan-500/10">
          <Satellite className="w-6 h-6 animate-pulse" />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-cyan-400 rounded-full animate-ping" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold tracking-wider text-white font-mono uppercase bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-300 bg-clip-text text-transparent">
              ASTRO-GUARD 3D
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-mono font-semibold rounded bg-cyan-950 text-cyan-400 border border-cyan-700/50">
              ORBITAL SAFETY AI
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono">
            Space Debris Tracking • Conjunction Prediction • Min-Energy Avoidance
          </p>
        </div>
      </div>

      {/* Center Scenario Selector & Threat Status */}
      <div className="flex items-center gap-4">
        {/* Scenario Dropdown */}
        <div className="flex items-center gap-2 bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-700/80">
          <Globe className="w-4 h-4 text-cyan-400" />
          <select
            value={activeScenarioId}
            onChange={(e) => onSelectScenario(e.target.value)}
            className="bg-transparent text-xs font-mono text-slate-200 outline-none cursor-pointer font-semibold pr-2"
          >
            {HACKATHON_SCENARIOS.map(scenario => (
              <option key={scenario.id} value={scenario.id} className="bg-slate-900 text-slate-200">
                {scenario.name}
              </option>
            ))}
          </select>
        </div>

        {/* Threat Level Badge */}
        <div
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg border font-mono text-xs font-bold shadow-lg transition-all"
          style={{
            backgroundColor: `${hasAppliedManeuver ? '#064e3b' : threatLevel?.color}20`,
            borderColor: hasAppliedManeuver ? '#10b981' : threatLevel?.color,
            color: hasAppliedManeuver ? '#34d399' : threatLevel?.color
          }}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>
            {hasAppliedManeuver ? 'SAFE (MANEUVERED)' : threatLevel?.name}
          </span>
          <span className="px-1.5 py-0.5 rounded text-[11px] bg-slate-900/60 font-bold">
            {hasAppliedManeuver ? 'RISK: LOW' : `RISK: ${riskScore}/100`}
          </span>
        </div>
      </div>

      {/* Right Controls & Clock */}
      <div className="flex items-center gap-3">
        {hasAppliedManeuver && (
          <button
            onClick={onResetManeuver}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono border border-slate-700 transition-colors"
            title="Reset Satellite Trajectory to Original Orbit"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Trajectory
          </button>
        )}

        {/* UTC Clock */}
        <div className="hidden lg:flex flex-col items-end text-[11px] font-mono text-slate-400 bg-slate-950/60 px-3 py-1 rounded-lg border border-slate-800">
          <span className="text-slate-200 font-semibold">{utcTime}</span>
          <span className="text-cyan-500 font-mono text-[10px]">LEO-ECI PROPAGATOR ACTIVE</span>
        </div>
      </div>
    </header>
  );
}
