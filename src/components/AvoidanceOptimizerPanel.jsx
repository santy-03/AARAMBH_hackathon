import React, { useState } from 'react';
import { Zap, ShieldCheck, Flame, Cpu, ArrowUpRight, Check, Sliders, Play } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function AvoidanceOptimizerPanel({
  optimizationResult,
  appliedManeuver,
  onApplyManeuver,
  onCustomManeuver
}) {
  const [activeTab, setActiveTab] = useState('OPTIMAL'); // 'OPTIMAL', 'COMPARISON', 'SANDBOX'

  // Custom sandbox slider values
  const [customPrograde, setCustomPrograde] = useState(2.0);
  const [customNormal, setCustomNormal] = useState(0.0);
  const [customRadial, setCustomRadial] = useState(0.0);
  const [customLeadMin, setCustomLeadMin] = useState(30);

  if (!optimizationResult) return null;

  const { recommendedManeuver, candidates, energySavingsPercent, isAlreadySafe } = optimizationResult;

  const handleExecuteBurn = (maneuver) => {
    if (!maneuver) return;

    // Trigger celebratory confetti effect
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (err) {
      console.log('Confetti effect');
    }

    onApplyManeuver(maneuver);
  };

  const handleRunSandbox = () => {
    onCustomManeuver({
      progradeMs: customPrograde,
      normalMs: customNormal,
      radialMs: customRadial,
      leadMin: customLeadMin
    });
  };

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col gap-4 backdrop-blur-md shadow-2xl">
      {/* Header & Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2 font-mono">
          <Cpu className="w-4 h-4 text-emerald-400 animate-pulse" />
          <h2 className="text-sm font-bold text-white tracking-wider uppercase">
            MIN-ENERGY AVOIDANCE SOLVER
          </h2>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-mono">
          <button
            onClick={() => setActiveTab('OPTIMAL')}
            className={`px-3 py-1 rounded transition-colors ${
              activeTab === 'OPTIMAL' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            🚀 OPTIMAL BURN
          </button>
          <button
            onClick={() => setActiveTab('COMPARISON')}
            className={`px-3 py-1 rounded transition-colors ${
              activeTab === 'COMPARISON' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            📊 MATRIX ({candidates.length})
          </button>
          <button
            onClick={() => setActiveTab('SANDBOX')}
            className={`px-3 py-1 rounded transition-colors ${
              activeTab === 'SANDBOX' ? 'bg-purple-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            🎛️ SANDBOX
          </button>
        </div>
      </div>

      {/* Tab 1: Recommended Optimal Burn */}
      {activeTab === 'OPTIMAL' && (
        <div className="flex flex-col gap-3 font-mono">
          {isAlreadySafe ? (
            <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-3">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
              <div>
                <p className="font-bold text-sm">NO MANEUVER REQUIRED</p>
                <p className="text-slate-400">Current trajectory maintains safe separation beyond threshold.</p>
              </div>
            </div>
          ) : recommendedManeuver ? (
            <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-950/70 via-slate-900 to-cyan-950/50 border border-emerald-500/50 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded text-[10px] bg-emerald-900 text-emerald-300 font-bold border border-emerald-600/50">
                    ENERGY MINIMIZED SOLUTION
                  </span>
                  <span className="px-2.5 py-0.5 rounded text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-800">
                    SAVE {energySavingsPercent}% PROPELLANT
                  </span>
                </div>
                <span className="text-xs text-slate-400">Lead Time: {recommendedManeuver.leadTimeMinutes} min</span>
              </div>

              {/* Delta V metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400">DELTA-V MAGNITUDE</span>
                  <p className="text-xl font-black text-emerald-400 mt-0.5">
                    {recommendedManeuver.deltaVMag_ms} <span className="text-xs font-normal text-slate-400">m/s</span>
                  </p>
                </div>
                <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400">BURN DIRECTION</span>
                  <p className="text-sm font-bold text-cyan-300 mt-0.5">
                    {recommendedManeuver.directionName}
                  </p>
                </div>
                <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400">EXPECTED SAFE DISTANCE</span>
                  <p className="text-xl font-black text-emerald-400 mt-0.5">
                    {recommendedManeuver.resultingMissDistanceKm} <span className="text-xs font-normal text-slate-400">km</span>
                  </p>
                </div>
                <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400">ENERGY COST RATING</span>
                  <p className="text-sm font-bold text-amber-300 mt-0.5">
                    {recommendedManeuver.energyCostRating}
                  </p>
                </div>
              </div>

              {/* Vector components */}
              <div className="text-xs text-slate-400 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 flex justify-between items-center">
                <span>RIC Thrust Vector: [{recommendedManeuver.deltaV_RIC_ms.join(', ')}] m/s</span>
                <span className="text-[10px] text-slate-500">{recommendedManeuver.description}</span>
              </div>

              {/* Execute Action Button */}
              <button
                onClick={() => handleExecuteBurn(recommendedManeuver)}
                disabled={appliedManeuver}
                className={`w-full py-3 px-4 rounded-xl font-mono font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-xl ${
                  appliedManeuver
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-700 cursor-default'
                    : 'bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-emerald-600/30 active:scale-[0.99]'
                }`}
              >
                {appliedManeuver ? (
                  <>
                    <Check className="w-5 h-5" /> OPTIMIZED AVOIDANCE BURN APPLIED
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5 animate-bounce" /> EXECUTE MIN-ENERGY AVOIDANCE BURN ({recommendedManeuver.deltaVMag_ms} m/s)
                  </>
                )}
              </button>
            </div>
          ) : null}
        </div>
      )}

      {/* Tab 2: Candidate Matrix */}
      {activeTab === 'COMPARISON' && (
        <div className="flex flex-col gap-2 font-mono text-xs max-h-[260px] overflow-y-auto custom-scrollbar pr-1">
          <div className="grid grid-cols-5 font-bold text-slate-400 border-b border-slate-800 pb-2 px-2">
            <span>Direction</span>
            <span>Lead Time</span>
            <span>Delta-V</span>
            <span>New Distance</span>
            <span>Action</span>
          </div>

          {candidates.map((cand, idx) => (
            <div
              key={cand.id}
              className={`grid grid-cols-5 items-center p-2 rounded-lg border transition-colors ${
                idx === 0
                  ? 'bg-emerald-950/40 border-emerald-700 text-emerald-300'
                  : 'bg-slate-950/40 border-slate-800 text-slate-300 hover:bg-slate-800/80'
              }`}
            >
              <div className="flex items-center gap-1 font-bold">
                {idx === 0 && <span className="text-[9px] bg-emerald-900 text-emerald-300 px-1 rounded">BEST</span>}
                <span>{cand.directionName}</span>
              </div>
              <span className="text-slate-400">{cand.leadTimeMinutes} min</span>
              <span className="font-bold text-cyan-400">{cand.deltaVMag_ms} m/s</span>
              <span className="font-bold text-emerald-400">{cand.resultingMissDistanceKm} km</span>
              <button
                onClick={() => handleExecuteBurn(cand)}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-cyan-600 hover:text-white text-slate-300 transition-colors text-[10px] font-bold"
              >
                SELECT
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Tab 3: Manual Thruster Sandbox */}
      {activeTab === 'SANDBOX' && (
        <div className="flex flex-col gap-3 font-mono text-xs bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
          <p className="text-slate-400 text-[11px]">
            Manually test custom orbital impulse vector components in the RIC (Radial, In-track, Cross-track) frame.
          </p>

          <div className="space-y-3">
            {/* Prograde slider */}
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>In-Track (Prograde / Retrograde):</span>
                <span className="font-bold text-cyan-400">{customPrograde} m/s</span>
              </div>
              <input
                type="range"
                min="-10"
                max="10"
                step="0.2"
                value={customPrograde}
                onChange={e => setCustomPrograde(parseFloat(e.target.value))}
                className="w-full accent-cyan-500"
              />
            </div>

            {/* Normal slider */}
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Cross-Track (Normal / Antinormal):</span>
                <span className="font-bold text-purple-400">{customNormal} m/s</span>
              </div>
              <input
                type="range"
                min="-10"
                max="10"
                step="0.2"
                value={customNormal}
                onChange={e => setCustomNormal(parseFloat(e.target.value))}
                className="w-full accent-purple-500"
              />
            </div>

            {/* Radial slider */}
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Radial (Out / In):</span>
                <span className="font-bold text-amber-400">{customRadial} m/s</span>
              </div>
              <input
                type="range"
                min="-10"
                max="10"
                step="0.2"
                value={customRadial}
                onChange={e => setCustomRadial(parseFloat(e.target.value))}
                className="w-full accent-amber-500"
              />
            </div>

            {/* Lead Time slider */}
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Burn Lead Time before TCA:</span>
                <span className="font-bold text-emerald-400">{customLeadMin} min</span>
              </div>
              <input
                type="range"
                min="5"
                max="60"
                step="5"
                value={customLeadMin}
                onChange={e => setCustomLeadMin(parseInt(e.target.value))}
                className="w-full accent-emerald-500"
              />
            </div>
          </div>

          <button
            onClick={handleRunSandbox}
            className="w-full py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all"
          >
            <Play className="w-4 h-4" /> TEST CUSTOM MANEUVER IN SIMULATION
          </button>
        </div>
      )}
    </div>
  );
}
