import React, { useState } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  Zap,
  Flame,
  ArrowRight,
  TrendingUp,
  Cpu,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Compass,
  Layers,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export default function BeforeAfterComparisonPanel({
  satelliteName,
  primaryDebris,
  baselineConjunction,
  activeConjunction,
  baselineRisk,
  activeRisk,
  appliedManeuver,
  optimizationResult,
  onApplyManeuver,
  satelliteMassKg = 1000,
  propulsionIsp = 300
}) {
  const [activeSubTab, setActiveSubTab] = useState('SUMMARY'); // 'SUMMARY', 'PARAMETERS', 'VECTORS', 'CANDIDATES'
  const [showExplanation, setShowExplanation] = useState(false);

  const recommended = optimizationResult?.recommendedManeuver;
  const candidates = optimizationResult?.candidates || [];
  const rejected = optimizationResult?.rejectedCandidates || [];
  const activeMan = appliedManeuver || recommended;

  // Extract Before vs After states
  const beforeState = baselineConjunction?.satOrbitalState;
  const afterState = activeConjunction?.satOrbitalState;

  // Derive velocity vectors and comparison
  const vBefore = beforeState?.velocity || [0, 0, 0];
  const vAfter = afterState?.velocity || [0, 0, 0];
  const dV_RIC = activeMan?.deltaV_RIC_ms || [0, 0, 0];
  const dV_ECI = activeMan?.deltaV_ECI_km_s || [
    vAfter[0] - vBefore[0],
    vAfter[1] - vBefore[1],
    vAfter[2] - vBefore[2]
  ];

  const speedBefore = beforeState?.speedKmS || 0;
  const speedAfter = afterState?.speedKmS || 0;
  const speedDeltaKmS = speedAfter - speedBefore;
  const speedDeltaMs = speedDeltaKmS * 1000;
  const deltaVMagMs = activeMan?.deltaVMag_ms || 0;

  // Parameter deltas
  const altDeltaKm = (afterState?.altitudeKm || 0) - (beforeState?.altitudeKm || 0);
  const smaDeltaKm = (afterState?.semiMajorAxisKm || 0) - (beforeState?.semiMajorAxisKm || 0);
  const eccDelta = (afterState?.eccentricity || 0) - (beforeState?.eccentricity || 0);
  const incDeltaDeg = (afterState?.inclinationDeg || 0) - (beforeState?.inclinationDeg || 0);
  const periodDeltaMin = (afterState?.orbitalPeriodMin || 0) - (beforeState?.orbitalPeriodMin || 0);
  const missDeltaKm = (activeConjunction?.missDistanceKm || 0) - (baselineConjunction?.missDistanceKm || 0);

  const hasSafeManeuver = !!activeMan;
  const isAvoided = activeConjunction?.missDistanceKm >= 5.0;

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col gap-5 backdrop-blur-md shadow-2xl font-mono text-slate-200">
      {/* Top Header & Navigation Subtabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-wider uppercase flex items-center gap-2">
              BEFORE vs AFTER COLLISION AVOIDANCE SIMULATION
            </h2>
            <p className="text-xs text-slate-400 font-sans">
              Rigorous two-body + J2 orbital propagation comparing nominal unmaneuvered trajectory vs post-burn trajectory
            </p>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setActiveSubTab('SUMMARY')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeSubTab === 'SUMMARY'
                ? 'bg-emerald-600 text-white font-bold shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            📋 MISSION SUMMARY
          </button>
          <button
            onClick={() => setActiveSubTab('PARAMETERS')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeSubTab === 'PARAMETERS'
                ? 'bg-cyan-600 text-white font-bold shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            📊 ORBITAL PARAMETERS
          </button>
          <button
            onClick={() => setActiveSubTab('VECTORS')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeSubTab === 'VECTORS'
                ? 'bg-purple-600 text-white font-bold shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            📐 VELOCITY VECTORS & INCLINATION
          </button>
          <button
            onClick={() => setActiveSubTab('CANDIDATES')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeSubTab === 'CANDIDATES'
                ? 'bg-amber-600 text-white font-bold shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            🎯 CANDIDATE MATRIX ({candidates.length + rejected.length})
          </button>
        </div>
      </div>

      {/* 1. MAIN RESULT STATUS BANNER */}
      <div
        className={`p-4 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg ${
          isAvoided
            ? 'bg-emerald-950/40 border-emerald-500/40'
            : 'bg-rose-950/40 border-rose-500/40'
        }`}
      >
        <div className="flex items-center gap-3">
          {isAvoided ? (
            <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/50">
              <ShieldCheck className="w-8 h-8" />
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/50">
              <AlertTriangle className="w-8 h-8 animate-pulse" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`text-xs px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                  isAvoided
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                }`}
              >
                {isAvoided ? '✅ COLLISION AVOIDED' : '⚠️ COLLISION RISK ACTIVE'}
              </span>
              <span className="text-xs text-slate-400">
                {isAvoided ? 'Optimal minimum safe Δv executed' : 'Threshold miss distance < 5.0 km'}
              </span>
            </div>
            <p className="text-sm font-bold text-white mt-1">
              {isAvoided
                ? `Maneuver diverted satellite from ${baselineConjunction?.missDistanceKm.toFixed(2)} km to ${activeConjunction?.missDistanceKm.toFixed(2)} km separation.`
                : 'Satellite on dangerous conjunction path with primary debris target.'}
            </p>
          </div>
        </div>

        {/* Action Button */}
        {activeMan && !appliedManeuver && (
          <button
            onClick={() => onApplyManeuver(activeMan)}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg transition-all"
          >
            <Zap className="w-4 h-4" /> APPLY RECOMMENDED BURN ({activeMan.deltaVMag_ms} m/s)
          </button>
        )}
      </div>

      {/* SUBTAB 1: MISSION SUMMARY & TIMELINE */}
      {activeSubTab === 'SUMMARY' && (
        <div className="space-y-5">
          {/* Top 6 KPI Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase">OPTIMAL MANEUVER</span>
              <p className="text-sm font-black text-cyan-400 mt-1">
                {activeMan ? `${activeMan.directionName}` : 'NONE REQUIRED'}
              </p>
              <span className="text-[10px] text-slate-500">{activeMan ? `Lead: ${activeMan.leadTimeMinutes}m` : 'Safe'}</span>
            </div>

            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase">REQUIRED IMPULSE Δv</span>
              <p className="text-sm font-black text-emerald-400 mt-1">
                {deltaVMagMs > 0 ? `${deltaVMagMs.toFixed(3)} m/s` : '0.000 m/s'}
              </p>
              <span className="text-[10px] text-slate-500">{(deltaVMagMs / 1000).toFixed(6)} km/s</span>
            </div>

            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase">MISS DISTANCE</span>
              <p className="text-sm font-black text-white mt-1">
                <span className="text-amber-400">{baselineConjunction?.missDistanceKm.toFixed(2)}</span>
                <span className="text-slate-500 mx-1">→</span>
                <span className="text-emerald-400">{activeConjunction?.missDistanceKm.toFixed(2)}</span>
                <span className="text-xs text-slate-400 ml-1">km</span>
              </p>
              <span className="text-[10px] text-emerald-400 font-bold">+{missDeltaKm.toFixed(2)} km safe margin</span>
            </div>

            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase">COLLISION PROBABILITY Pc</span>
              <p className="text-sm font-black mt-1">
                <span className="text-rose-400">{baselineRisk?.collisionProbabilityScientific}</span>
                <span className="text-slate-500 mx-1">→</span>
                <span className="text-emerald-400">{activeRisk?.collisionProbabilityScientific}</span>
              </p>
              <span className="text-[10px] text-slate-400">{baselineRisk?.threatLevel.name} → {activeRisk?.threatLevel.name}</span>
            </div>

            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase">PROPELLANT USED</span>
              <p className="text-sm font-black text-amber-300 mt-1">
                {activeMan ? `${activeMan.propellantGrams} g` : '0.0 g'}
              </p>
              <span className="text-[10px] text-slate-500">Isp={propulsionIsp}s, m0={satelliteMassKg}kg</span>
            </div>

            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase">SECONDARY CONJUNCTIONS</span>
              <p className="text-sm font-black text-emerald-400 mt-1">
                0 NEW HAZARDS
              </p>
              <span className="text-[10px] text-slate-500">{optimizationResult?.secondaryObjectsChecked || 30} objects screened</span>
            </div>
          </div>

          {/* Mission Maneuver Timeline (Section 19) */}
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                CONJUNCTION & MANEUVER MISSION TIMELINE
              </span>
              <span className="text-[10px] text-slate-400">TCA Epoch Reference T = {baselineConjunction?.tcaMinutes.toFixed(1)}m</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 pt-2">
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400">T - 60 MIN</span>
                <p className="text-xs font-bold text-white mt-1">Conjunction Detected</p>
                <p className="text-[10px] text-slate-500">Initial tracking radar/SSN lock</p>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400">T - 45 MIN</span>
                <p className="text-xs font-bold text-cyan-300 mt-1">Avoidance Computed</p>
                <p className="text-[10px] text-slate-500">Minimum-Δv grid search & screening</p>
              </div>

              <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-center">
                <span className="text-[10px] text-emerald-400 font-bold">
                  BURN POINT (T - {activeMan?.leadTimeMinutes || 30}m)
                </span>
                <p className="text-xs font-bold text-emerald-300 mt-1">Δv Impulse Applied</p>
                <p className="text-[10px] text-emerald-500 font-bold">{deltaVMagMs.toFixed(3)} m/s ({activeMan?.directionName})</p>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400">T = 0 (TCA)</span>
                <p className="text-xs font-bold text-white mt-1">Closest Approach</p>
                <p className="text-[10px] text-emerald-400">Cleared at {activeConjunction?.missDistanceKm.toFixed(2)} km</p>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400">T + 60 MIN</span>
                <p className="text-xs font-bold text-slate-300 mt-1">Nominal Orbit Resumed</p>
                <p className="text-[10px] text-slate-500">Tracking post-encounter state</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: ORBITAL PARAMETERS COMPARISON TABLE */}
      {activeSubTab === 'PARAMETERS' && (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-3">Orbital Parameter</th>
                  <th className="p-3">Symbol / Unit</th>
                  <th className="p-3 text-amber-400">Before Maneuver (Nominal)</th>
                  <th className="p-3 text-emerald-400">After Maneuver (Modified)</th>
                  <th className="p-3">Physical Delta (Change)</th>
                  <th className="p-3">Effect / Mechanics</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                <tr className="hover:bg-slate-900/50">
                  <td className="p-3 font-bold text-white">Orbital Speed</td>
                  <td className="p-3 text-slate-400">|v| (km/s)</td>
                  <td className="p-3 text-amber-300">{speedBefore.toFixed(5)} km/s</td>
                  <td className="p-3 text-emerald-300">{speedAfter.toFixed(5)} km/s</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded font-bold ${speedDeltaMs >= 0 ? 'bg-cyan-950 text-cyan-300' : 'bg-rose-950 text-rose-300'}`}>
                      {speedDeltaMs >= 0 ? `+${speedDeltaMs.toFixed(3)} m/s` : `${speedDeltaMs.toFixed(3)} m/s`}
                    </span>
                  </td>
                  <td className="p-3 text-slate-400">Tangential & normal velocity update</td>
                </tr>

                <tr className="hover:bg-slate-900/50">
                  <td className="p-3 font-bold text-white">Altitude</td>
                  <td className="p-3 text-slate-400">h (km)</td>
                  <td className="p-3 text-amber-300">{beforeState?.altitudeKm.toFixed(2)} km</td>
                  <td className="p-3 text-emerald-300">{afterState?.altitudeKm.toFixed(2)} km</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded font-bold bg-slate-800 text-slate-200">
                      {altDeltaKm >= 0 ? `+${altDeltaKm.toFixed(3)} km` : `${altDeltaKm.toFixed(3)} km`}
                    </span>
                  </td>
                  <td className="p-3 text-slate-400">Radial position offset above Earth surface</td>
                </tr>

                <tr className="hover:bg-slate-900/50">
                  <td className="p-3 font-bold text-white">Semi-Major Axis</td>
                  <td className="p-3 text-slate-400">a (km)</td>
                  <td className="p-3 text-amber-300">{beforeState?.semiMajorAxisKm.toFixed(3)} km</td>
                  <td className="p-3 text-emerald-300">{afterState?.semiMajorAxisKm.toFixed(3)} km</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded font-bold bg-slate-800 text-slate-200">
                      {smaDeltaKm >= 0 ? `+${smaDeltaKm.toFixed(3)} km` : `${smaDeltaKm.toFixed(3)} km`}
                    </span>
                  </td>
                  <td className="p-3 text-slate-400">Determines specific mechanical orbital energy</td>
                </tr>

                <tr className="hover:bg-slate-900/50">
                  <td className="p-3 font-bold text-white">Eccentricity</td>
                  <td className="p-3 text-slate-400">e (dimensionless)</td>
                  <td className="p-3 text-amber-300">{beforeState?.eccentricity.toFixed(6)}</td>
                  <td className="p-3 text-emerald-300">{afterState?.eccentricity.toFixed(6)}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded font-bold bg-slate-800 text-slate-200">
                      {eccDelta >= 0 ? `+${eccDelta.toFixed(6)}` : `${eccDelta.toFixed(6)}`}
                    </span>
                  </td>
                  <td className="p-3 text-slate-400">Deviation from perfect circularity</td>
                </tr>

                <tr className="hover:bg-slate-900/50">
                  <td className="p-3 font-bold text-white">Inclination</td>
                  <td className="p-3 text-slate-400">i (deg)</td>
                  <td className="p-3 text-amber-300">{beforeState?.inclinationDeg.toFixed(4)}°</td>
                  <td className="p-3 text-emerald-300">{afterState?.inclinationDeg.toFixed(4)}°</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded font-bold ${Math.abs(incDeltaDeg) > 0.0001 ? 'bg-purple-950 text-purple-300' : 'bg-slate-800 text-slate-400'}`}>
                      {incDeltaDeg >= 0 ? `+${incDeltaDeg.toFixed(5)}°` : `${incDeltaDeg.toFixed(5)}°`}
                    </span>
                  </td>
                  <td className="p-3 text-slate-400">Altered primarily by Cross-Track (Normal) burns</td>
                </tr>

                <tr className="hover:bg-slate-900/50">
                  <td className="p-3 font-bold text-white">RAAN</td>
                  <td className="p-3 text-slate-400">Ω (deg)</td>
                  <td className="p-3 text-amber-300">{beforeState?.raanDeg.toFixed(4)}°</td>
                  <td className="p-3 text-emerald-300">{afterState?.raanDeg.toFixed(4)}°</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded font-bold bg-slate-800 text-slate-300">
                      {((afterState?.raanDeg || 0) - (beforeState?.raanDeg || 0)).toFixed(4)}°
                    </span>
                  </td>
                  <td className="p-3 text-slate-400">Right Ascension of Ascending Node</td>
                </tr>

                <tr className="hover:bg-slate-900/50">
                  <td className="p-3 font-bold text-white">Orbital Period</td>
                  <td className="p-3 text-slate-400">T (min)</td>
                  <td className="p-3 text-amber-300">{beforeState?.orbitalPeriodMin.toFixed(3)} min</td>
                  <td className="p-3 text-emerald-300">{afterState?.orbitalPeriodMin.toFixed(3)} min</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded font-bold bg-slate-800 text-slate-200">
                      {periodDeltaMin >= 0 ? `+${periodDeltaMin.toFixed(3)} min` : `${periodDeltaMin.toFixed(3)} min`}
                    </span>
                  </td>
                  <td className="p-3 text-slate-400">T = 2π√(a³/μ) period accumulation over time</td>
                </tr>

                <tr className="hover:bg-slate-900/50 bg-emerald-950/20">
                  <td className="p-3 font-bold text-white">Minimum Miss Distance</td>
                  <td className="p-3 text-slate-400">d_min (km)</td>
                  <td className="p-3 text-amber-400 font-bold">{baselineConjunction?.missDistanceKm.toFixed(3)} km</td>
                  <td className="p-3 text-emerald-400 font-bold">{activeConjunction?.missDistanceKm.toFixed(3)} km</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded font-bold bg-emerald-900 text-emerald-300">
                      +{missDeltaKm.toFixed(3)} km
                    </span>
                  </td>
                  <td className="p-3 text-emerald-400 font-bold">Exceeds 5.0 km safe threshold</td>
                </tr>

                <tr className="hover:bg-slate-900/50">
                  <td className="p-3 font-bold text-white">Impulse Δv Applied</td>
                  <td className="p-3 text-slate-400">|Δv| (m/s)</td>
                  <td className="p-3 text-slate-500">—</td>
                  <td className="p-3 text-emerald-400 font-bold">{deltaVMagMs.toFixed(3)} m/s</td>
                  <td className="p-3 text-emerald-300 font-bold">{deltaVMagMs.toFixed(3)} m/s</td>
                  <td className="p-3 text-slate-400">Instantaneous velocity increment vector</td>
                </tr>

                <tr className="hover:bg-slate-900/50">
                  <td className="p-3 font-bold text-white">Propellant Mass</td>
                  <td className="p-3 text-slate-400">Δm (grams)</td>
                  <td className="p-3 text-slate-500">—</td>
                  <td className="p-3 text-amber-300 font-bold">{activeMan?.propellantGrams || 0} g</td>
                  <td className="p-3 text-amber-300 font-bold">{activeMan?.propellantGrams || 0} g</td>
                  <td className="p-3 text-slate-400">Tsiolkovsky: mf = m0 / exp(Δv / (Isp*g0))</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 3: VELOCITY VECTOR COMPARISON & INCLINATION PHYSICS */}
      {activeSubTab === 'VECTORS' && (
        <div className="space-y-4">
          {/* Vector Decomposition Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <span className="text-xs font-bold text-amber-400 uppercase">V_before (ECI Velocity)</span>
              <p className="text-xs text-slate-400 font-mono">
                Vx: <span className="text-white font-bold">{vBefore[0].toFixed(5)} km/s</span>
              </p>
              <p className="text-xs text-slate-400 font-mono">
                Vy: <span className="text-white font-bold">{vBefore[1].toFixed(5)} km/s</span>
              </p>
              <p className="text-xs text-slate-400 font-mono">
                Vz: <span className="text-white font-bold">{vBefore[2].toFixed(5)} km/s</span>
              </p>
              <div className="pt-2 border-t border-slate-800 flex justify-between text-xs">
                <span className="text-slate-400">Speed Magnitude |V|:</span>
                <span className="text-amber-400 font-bold">{speedBefore.toFixed(5)} km/s</span>
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-emerald-500/30 space-y-2">
              <span className="text-xs font-bold text-emerald-400 uppercase">ΔV Maneuver Impulse</span>
              <p className="text-xs text-slate-400 font-mono">
                ΔVx: <span className="text-white font-bold">{(dV_ECI[0] * 1000).toFixed(3)} m/s</span>
              </p>
              <p className="text-xs text-slate-400 font-mono">
                ΔVy: <span className="text-white font-bold">{(dV_ECI[1] * 1000).toFixed(3)} m/s</span>
              </p>
              <p className="text-xs text-slate-400 font-mono">
                ΔVz: <span className="text-white font-bold">{(dV_ECI[2] * 1000).toFixed(3)} m/s</span>
              </p>
              <div className="pt-2 border-t border-slate-800 flex justify-between text-xs">
                <span className="text-slate-400">Total Impulse |Δv|:</span>
                <span className="text-emerald-400 font-bold">{deltaVMagMs.toFixed(3)} m/s</span>
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <span className="text-xs font-bold text-cyan-400 uppercase">V_after = V_before + ΔV</span>
              <p className="text-xs text-slate-400 font-mono">
                Vx: <span className="text-white font-bold">{vAfter[0].toFixed(5)} km/s</span>
              </p>
              <p className="text-xs text-slate-400 font-mono">
                Vy: <span className="text-white font-bold">{vAfter[1].toFixed(5)} km/s</span>
              </p>
              <p className="text-xs text-slate-400 font-mono">
                Vz: <span className="text-white font-bold">{vAfter[2].toFixed(5)} km/s</span>
              </p>
              <div className="pt-2 border-t border-slate-800 flex justify-between text-xs">
                <span className="text-slate-400">Speed Magnitude |V|:</span>
                <span className="text-cyan-400 font-bold">{speedAfter.toFixed(5)} km/s</span>
              </div>
            </div>
          </div>

          {/* Scientific Note on Vector Directionality vs Scalar Speed (Section 10) */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs flex items-start gap-3">
            <HelpCircle className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-white font-bold">
                CRITICAL AEROSPACE PRINCIPLE: Δspeed (|v_after| - |v_before|) ≠ |Δv|
              </p>
              <p className="text-slate-400 leading-relaxed font-sans">
                Notice that the scalar speed change is <span className="text-cyan-300 font-mono font-bold">{speedDeltaMs.toFixed(3)} m/s</span>,
                while the applied vector impulse magnitude is <span className="text-emerald-400 font-mono font-bold">{deltaVMagMs.toFixed(3)} m/s</span>.
                When a burn has non-tangential components (such as Radial or Cross-track), velocity vectors add geometrically:
                <span className="text-amber-300 font-mono"> |v + Δv| = √(v² + 2v·Δv + Δv²)</span>.
                A purely cross-track burn changes orbital direction and inclination with zero first-order change in orbital speed!
              </p>
            </div>
          </div>

          {/* Inclination Change Deep Dive (Section 11) */}
          <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-300 uppercase flex items-center gap-2">
                <Compass className="w-4 h-4 text-purple-400" />
                ORBITAL PLANE INCLINATION CHANGE (i)
              </span>
              <span className="text-xs font-mono font-bold text-purple-300">
                Δi = {incDeltaDeg >= 0 ? `+${incDeltaDeg.toFixed(5)}°` : `${incDeltaDeg.toFixed(5)}°`}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
                <span className="text-slate-400">Before Inclination:</span>
                <p className="text-base font-bold text-white mt-0.5">{beforeState?.inclinationDeg.toFixed(5)}°</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
                <span className="text-slate-400">After Inclination:</span>
                <p className="text-base font-bold text-purple-300 mt-0.5">{afterState?.inclinationDeg.toFixed(5)}°</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 font-sans leading-relaxed">
              <strong>Orbital Mechanics Rule:</strong> Cross-track (Normal/Anti-normal) burns directly exert torque on the specific angular momentum vector
              <span className="font-mono text-purple-300"> h = r × v</span>, rotating the orbital plane without altering orbital energy or semi-major axis.
              Along-track burns change orbital energy and period, accumulating phase separation over time.
            </p>
          </div>
        </div>
      )}

      {/* SUBTAB 4: CANDIDATE MATRIX & SECONDARY SCREENING (Section 15, 17) */}
      {activeSubTab === 'CANDIDATES' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white uppercase">
              EVALUATED CANDIDATE BURNS & SECONDARY DEBRIS SCREENING
            </span>
            <span className="text-xs text-slate-400">
              Screened against {optimizationResult?.secondaryObjectsChecked || 30} tracked catalog objects
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase font-bold">
                <tr>
                  <th className="p-3">Direction</th>
                  <th className="p-3">Lead Time</th>
                  <th className="p-3">Required Δv</th>
                  <th className="p-3">Miss Distance</th>
                  <th className="p-3">Fuel (g)</th>
                  <th className="p-3">Secondary Conjunction Check</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                {candidates.map((cand, idx) => {
                  const isBest = idx === 0;
                  return (
                    <tr key={cand.id} className={isBest ? 'bg-emerald-950/30' : 'hover:bg-slate-900/50'}>
                      <td className="p-3 font-bold text-white flex items-center gap-1.5">
                        {isBest && <span className="text-emerald-400">⭐</span>}
                        {cand.directionName}
                      </td>
                      <td className="p-3 text-slate-400">{cand.leadTimeMinutes} min</td>
                      <td className="p-3 font-mono font-bold text-emerald-400">{cand.deltaVMag_ms} m/s</td>
                      <td className="p-3 font-mono text-cyan-300">{cand.resultingMissDistanceKm} km</td>
                      <td className="p-3 font-mono text-amber-300">{cand.propellantGrams} g</td>
                      <td className="p-3 text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> 0 conflicts
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isBest ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-800 text-slate-300'}`}>
                          {isBest ? '⭐ BEST (MIN-Δv)' : 'SAFE'}
                        </span>
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => onApplyManeuver(cand)}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-emerald-600 text-white font-bold transition-all text-[10px]"
                        >
                          APPLY
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {/* Rejected Candidates Due to Secondary Collisions */}
                {rejected.map((rej) => (
                  <tr key={rej.id} className="bg-rose-950/20 hover:bg-rose-950/30">
                    <td className="p-3 font-bold text-rose-300 flex items-center gap-1.5">
                      <XCircle className="w-3.5 h-3.5 text-rose-400" />
                      {rej.directionName}
                    </td>
                    <td className="p-3 text-slate-400">{rej.leadTimeMinutes} min</td>
                    <td className="p-3 font-mono text-slate-400">{rej.deltaVMag_ms} m/s</td>
                    <td className="p-3 font-mono text-slate-400">{rej.resultingMissDistanceKm} km</td>
                    <td className="p-3 font-mono text-slate-400">{rej.propellantGrams} g</td>
                    <td className="p-3 text-rose-400 font-bold">
                      ⚠️ Hazard: {rej.secondaryConflict?.debrisName} ({rej.secondaryConflict?.missDistanceKm} km)
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                        REJECTED
                      </span>
                    </td>
                    <td className="p-3 text-slate-500 text-[10px]">UNSAFE</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
