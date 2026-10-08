import React from 'react';
import { AlertCircle, Gauge, Activity, Compass, Zap, CheckCircle2 } from 'lucide-react';
import { DEFAULT_SAFE_DISTANCE_KM } from '../physics/constants.js';

export default function RiskAssessmentCard({
  conjunction,
  riskAssessment,
  hasAppliedManeuver
}) {
  if (!conjunction || !riskAssessment) return null;

  const { missDistanceKm, relativeVelocityKmS, relativeVelocityMs, ricOffsetKm, tcaMinutes } = conjunction;
  const { riskScore, pcString, threatLevel, isUnsafe, kineticEnergyScore } = riskAssessment;

  const isSafe = !isUnsafe || hasAppliedManeuver;

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col gap-4 backdrop-blur-md shadow-2xl">
      {/* Title Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2 font-mono">
          <Gauge className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-bold text-white tracking-wider uppercase">
            CONJUNCTION RISK ANALYTICS
          </h2>
        </div>
        <span className="text-[10px] font-mono text-slate-400">
          SAFE THRESHOLD: {DEFAULT_SAFE_DISTANCE_KM.toFixed(1)} KM
        </span>
      </div>

      {/* Main Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
        {/* Risk Score Gauge Box */}
        <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800/80 flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 uppercase">COLLISION RISK SCORE</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className={`text-2xl font-black ${isSafe ? 'text-emerald-400' : 'text-rose-400'}`}>
              {hasAppliedManeuver ? '12' : riskScore}
            </span>
            <span className="text-xs text-slate-500">/ 100</span>
          </div>
          {/* Visual Mini Progress Bar */}
          <div className="w-full h-1.5 bg-slate-800 rounded-full mt-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isSafe ? 'bg-emerald-500' : 'bg-rose-500'
              }`}
              style={{ width: `${hasAppliedManeuver ? 12 : riskScore}%` }}
            />
          </div>
        </div>

        {/* Miss Distance Box */}
        <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800/80 flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 uppercase">CLOSEST APPROACH (TCA)</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className={`text-2xl font-black ${missDistanceKm < DEFAULT_SAFE_DISTANCE_KM && !hasAppliedManeuver ? 'text-rose-400' : 'text-emerald-400'}`}>
              {missDistanceKm.toFixed(2)}
            </span>
            <span className="text-xs text-slate-400">km</span>
          </div>
          <span className="text-[10px] text-slate-400">
            {missDistanceKm < DEFAULT_SAFE_DISTANCE_KM && !hasAppliedManeuver ? '⚠️ BELOW SAFE THRESHOLD' : '✅ SAFE DISTANCE'}
          </span>
        </div>

        {/* Probability of Collision Pc */}
        <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800/80 flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 uppercase">PROBABILITY (Pc)</span>
          <div className="text-xl font-bold text-amber-300 mt-1">
            {hasAppliedManeuver ? '1.2e-7' : pcString}
          </div>
          <span className="text-[10px] text-slate-400">2D Enc. Covariance</span>
        </div>

        {/* Relative Velocity */}
        <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800/80 flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 uppercase">RELATIVE SPEED</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-bold text-sky-300">
              {relativeVelocityKmS.toFixed(2)}
            </span>
            <span className="text-xs text-slate-400">km/s</span>
          </div>
          <span className="text-[10px] text-slate-400">
            Impact: {relativeVelocityMs.toFixed(0)} m/s
          </span>
        </div>
      </div>

      {/* RIC Frame Breakdown (Radial, In-track, Cross-track) */}
      <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 font-mono text-xs space-y-2">
        <div className="flex items-center justify-between text-slate-400 border-b border-slate-800/60 pb-1.5">
          <div className="flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-semibold text-slate-300">RIC ORBITAL FRAME OFFSETS AT TCA</span>
          </div>
          <span className="text-[10px] text-slate-500">Radial • In-Track • Cross-Track</span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center pt-1">
          <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
            <p className="text-[10px] text-slate-400">RADIAL (ΔR)</p>
            <p className="font-bold text-slate-200 mt-0.5">{ricOffsetKm.radial >= 0 ? '+' : ''}{ricOffsetKm.radial.toFixed(2)} km</p>
            <p className="text-[9px] text-slate-500">Altitude Delta</p>
          </div>
          <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
            <p className="text-[10px] text-slate-400">IN-TRACK (ΔI)</p>
            <p className="font-bold text-slate-200 mt-0.5">{ricOffsetKm.intrack >= 0 ? '+' : ''}{ricOffsetKm.intrack.toFixed(2)} km</p>
            <p className="text-[9px] text-slate-500">Along-Orbit Delta</p>
          </div>
          <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
            <p className="text-[10px] text-slate-400">CROSS-TRACK (ΔC)</p>
            <p className="font-bold text-slate-200 mt-0.5">{ricOffsetKm.crosstrack >= 0 ? '+' : ''}{ricOffsetKm.crosstrack.toFixed(2)} km</p>
            <p className="text-[9px] text-slate-500">Out-of-Plane Delta</p>
          </div>
        </div>
      </div>
    </div>
  );
}
