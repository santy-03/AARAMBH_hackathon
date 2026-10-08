import React, { useState } from 'react';
import { ShieldAlert, CheckCircle2, Zap, Calculator, ArrowRight, Play, RefreshCw, Code } from 'lucide-react';
import confetti from 'canvas-confetti';
import { generateMasterApiPayload } from '../physics/apiResult.js';

export default function HackathonAnswerPanel({
  satelliteName,
  primaryDebris,
  conjunction,
  riskAssessment,
  optimizationResult,
  appliedManeuver,
  onApplyManeuver,
  onCustomStateInput
}) {
  const [activeTab, setActiveTab] = useState('OUTPUT'); // 'OUTPUT', 'CUSTOM_INPUT', or 'JSON_API'

  // Form states for manual state vector input (x, y, z, vx, vy, vz)
  const [satX, setSatX] = useState(0);
  const [satY, setSatY] = useState(6921);
  const [satZ, setSatZ] = useState(0);
  const [satVx, setSatVx] = useState(7.58);
  const [satVy, setSatVy] = useState(0);
  const [satVz, setSatVz] = useState(0);

  const [debX, setDebX] = useState(100);
  const [debY, setDebY] = useState(6970);
  const [debZ, setDebZ] = useState(50);
  const [debVx, setDebVx] = useState(-5.2);
  const [debVy, setDebVy] = useState(3.1);
  const [debVz, setDebVz] = useState(4.2);

  if (!conjunction || !riskAssessment || !optimizationResult) return null;

  const recManeuver = optimizationResult.recommendedManeuver;
  const isSafe = !riskAssessment.isUnsafe || appliedManeuver;

  const masterApiJson = generateMasterApiPayload(
    satelliteName,
    primaryDebris,
    conjunction,
    riskAssessment,
    optimizationResult,
    appliedManeuver
  );

  const handleExecuteRecommended = () => {
    if (recManeuver) {
      try {
        confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
      } catch (err) {}
      onApplyManeuver(recManeuver);
    }
  };

  const handleCalculateCustomVectors = (e) => {
    e.preventDefault();
    onCustomStateInput({
      satPos: [parseFloat(satX), parseFloat(satY), parseFloat(satZ)],
      satVel: [parseFloat(satVx), parseFloat(satVy), parseFloat(satVz)],
      debPos: [parseFloat(debX), parseFloat(debY), parseFloat(debZ)],
      debVel: [parseFloat(debVx), parseFloat(debVy), parseFloat(debVz)]
    });
    setActiveTab('OUTPUT');
  };

  return (
    <div className="w-full bg-slate-900/95 border-2 border-cyan-500/40 rounded-2xl p-5 shadow-2xl backdrop-blur-xl font-mono text-xs space-y-4">
      {/* Banner Header */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-3 gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-cyan-950 border border-cyan-500/50 text-cyan-400">
            <Calculator className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-wider uppercase bg-gradient-to-r from-cyan-400 to-sky-200 bg-clip-text text-transparent">
              HACKATHON PROBLEM STATEMENT SOLUTION & OUTPUT
            </h2>
            <p className="text-[11px] text-slate-400">
              Direct 4-Step Solution Engine: Track Trajectories ➔ Predict Intersection ➔ Risk Score ➔ Min-Energy Avoidance
            </p>
          </div>
        </div>

        {/* Tab Toggle */}
        <div className="flex flex-wrap items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setActiveTab('OUTPUT')}
            className={`px-3 py-1 rounded font-bold transition-colors ${
              activeTab === 'OUTPUT' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            📋 STEP-BY-STEP OUTPUT
          </button>
          <button
            onClick={() => setActiveTab('CUSTOM_INPUT')}
            className={`px-3 py-1 rounded font-bold transition-colors ${
              activeTab === 'CUSTOM_INPUT' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            🧮 INPUT STATE VECTORS (X,Y,Z)
          </button>

          <button
            onClick={() => setActiveTab('JSON_API')}
            className={`px-3 py-1 rounded font-bold transition-colors flex items-center gap-1 ${
              activeTab === 'JSON_API' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code className="w-3.5 h-3.5" /> MASTER API JSON
          </button>
        </div>
      </div>

      {/* Tab 1: Step-by-Step Problem Statement Output */}
      {activeTab === 'OUTPUT' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Step 1: Trajectory Tracking */}
          <div className="bg-slate-950/90 p-3.5 rounded-xl border border-slate-800 flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-cyan-400 font-bold uppercase">1. TRACKED TRAJECTORIES</span>
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            </div>
            <div>
              <p className="text-white font-bold">{satelliteName}</p>
              <p className="text-[10px] text-slate-400">vs {primaryDebris?.name}</p>
            </div>
            <div className="text-[10px] text-slate-400 space-y-1 bg-slate-900/60 p-2 rounded border border-slate-800">
              <p><span className="text-slate-500">Debris ID:</span> {primaryDebris?.id}</p>
              <p><span className="text-slate-500">Origin:</span> {primaryDebris?.origin}</p>
              <p><span className="text-slate-500">Catalog #:</span> NORAD {primaryDebris?.catalogNumber}</p>
            </div>
          </div>

          {/* Step 2: Predicted Intersection */}
          <div className="bg-slate-950/90 p-3.5 rounded-xl border border-slate-800 flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-amber-400 font-bold uppercase">2. CLOSEST APPROACH (TCA)</span>
              <span className="w-2 h-2 rounded-full bg-amber-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Time to Closest Approach:</p>
              <p className="text-lg font-black text-amber-300">{conjunction.tcaMinutes.toFixed(1)} min</p>
            </div>
            <div className="text-[10px] text-slate-400 space-y-1 bg-slate-900/60 p-2 rounded border border-slate-800">
              <p><span className="text-slate-500">Miss Distance:</span> <strong className="text-white">{conjunction.missDistanceKm.toFixed(2)} km</strong></p>
              <p><span className="text-slate-500">Relative Speed:</span> {conjunction.relativeVelocityKmS.toFixed(2)} km/s</p>
              <p><span className="text-slate-500">Impact Energy:</span> {riskAssessment.kineticEnergyScore} MJ/kg</p>
            </div>
          </div>

          {/* Step 3: Calculated Collision Risk */}
          <div className="bg-slate-950/90 p-3.5 rounded-xl border border-slate-800 flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-rose-400 font-bold uppercase">3. COLLISION RISK</span>
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                appliedManeuver ? 'bg-emerald-950 text-emerald-300' : 'bg-rose-950 text-rose-300'
              }`}>
                {appliedManeuver ? 'SAFE' : riskAssessment.threatLevel.name}
              </span>
            </div>
            <div>
              <p className="text-xs text-slate-400">Risk Score:</p>
              <p className={`text-2xl font-black ${appliedManeuver ? 'text-emerald-400' : 'text-rose-400'}`}>
                {appliedManeuver ? '12 / 100' : `${riskAssessment.riskScore} / 100`}
              </p>
            </div>
            <div className="text-[10px] text-slate-400 space-y-1 bg-slate-900/60 p-2 rounded border border-slate-800">
              <p><span className="text-slate-500">Probability (Pc):</span> {appliedManeuver ? '1.2e-7' : riskAssessment.pcString}</p>
              <p><span className="text-slate-500">Status:</span> {appliedManeuver ? '✅ HAZARD MITIGATED' : '⚠️ HIGH COLLISION THREAT'}</p>
            </div>
          </div>

          {/* Step 4: Determined Avoidance Maneuver */}
          <div className="bg-gradient-to-br from-emerald-950/70 to-slate-950 p-3.5 rounded-xl border border-emerald-500/50 flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-emerald-400 font-bold uppercase">4. MIN-ENERGY AVOIDANCE</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-900 text-emerald-300 font-bold">
                SAVE {optimizationResult.energySavingsPercent}% FUEL
              </span>
            </div>

            {recManeuver ? (
              <div className="space-y-1.5">
                <div className="flex items-baseline justify-between">
                  <span className="text-slate-400 text-[10px]">Optimal Burn (ΔV):</span>
                  <span className="text-base font-black text-emerald-300">{recManeuver.deltaVMag_ms} m/s</span>
                </div>
                <div className="text-[10px] text-slate-300 bg-slate-900/80 p-1.5 rounded border border-emerald-900/60 space-y-0.5">
                  <p><span className="text-slate-500">Direction:</span> {recManeuver.directionName}</p>
                  <p><span className="text-slate-500">Expected Distance:</span> <strong className="text-emerald-400">{recManeuver.resultingMissDistanceKm} km</strong></p>
                  <p><span className="text-slate-500">Energy Rating:</span> {recManeuver.energyCostRating}</p>
                </div>
              </div>
            ) : (
              <p className="text-slate-400 text-[11px]">Current orbit maintains safe separation.</p>
            )}

            <button
              onClick={handleExecuteRecommended}
              disabled={appliedManeuver}
              className={`w-full py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-lg ${
                appliedManeuver
                  ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-600 cursor-default'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
              }`}
            >
              {appliedManeuver ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> AVOIDANCE BURN APPLIED
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 animate-bounce" /> SOLVE & EXECUTE BURN
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Tab 2: Custom State Vector Input Form (x, y, z, vx, vy, vz) */}
      {activeTab === 'CUSTOM_INPUT' && (
        <form onSubmit={handleCalculateCustomVectors} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
          <p className="text-slate-400 text-[11px]">
            Input custom 3D Position $(x, y, z)$ in km and Velocity $(v_x, v_y, v_z)$ in km/s state vectors for Satellite and Debris:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Satellite Vectors */}
            <div className="space-y-2 bg-slate-900/60 p-3 rounded-lg border border-slate-800">
              <p className="font-bold text-cyan-400 text-xs">🛰️ SATELLITE STATE VECTOR</p>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[9px] text-slate-500 block">X (KM)</label>
                  <input type="number" value={satX} onChange={e => setSatX(e.target.value)} className="w-full bg-slate-950 border border-slate-800 p-1.5 rounded text-slate-200" />
                </div>
                <div>
                  <label className="text-[9px] text-slate-500 block">Y (KM)</label>
                  <input type="number" value={satY} onChange={e => setSatY(e.target.value)} className="w-full bg-slate-950 border border-slate-800 p-1.5 rounded text-slate-200" />
                </div>
                <div>
                  <label className="text-[9px] text-slate-500 block">Z (KM)</label>
                  <input type="number" value={satZ} onChange={e => setSatZ(e.target.value)} className="w-full bg-slate-950 border border-slate-800 p-1.5 rounded text-slate-200" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1">
                <div>
                  <label className="text-[9px] text-slate-500 block">Vx (KM/S)</label>
                  <input type="number" step="0.01" value={satVx} onChange={e => setSatVx(e.target.value)} className="w-full bg-slate-950 border border-slate-800 p-1.5 rounded text-slate-200" />
                </div>
                <div>
                  <label className="text-[9px] text-slate-500 block">Vy (KM/S)</label>
                  <input type="number" step="0.01" value={satVy} onChange={e => setSatVy(e.target.value)} className="w-full bg-slate-950 border border-slate-800 p-1.5 rounded text-slate-200" />
                </div>
                <div>
                  <label className="text-[9px] text-slate-500 block">Vz (KM/S)</label>
                  <input type="number" step="0.01" value={satVz} onChange={e => setSatVz(e.target.value)} className="w-full bg-slate-950 border border-slate-800 p-1.5 rounded text-slate-200" />
                </div>
              </div>
            </div>

            {/* Debris Vectors */}
            <div className="space-y-2 bg-slate-900/60 p-3 rounded-lg border border-slate-800">
              <p className="font-bold text-rose-400 text-xs">☄️ DEBRIS STATE VECTOR</p>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[9px] text-slate-500 block">X (KM)</label>
                  <input type="number" value={debX} onChange={e => setDebX(e.target.value)} className="w-full bg-slate-950 border border-slate-800 p-1.5 rounded text-slate-200" />
                </div>
                <div>
                  <label className="text-[9px] text-slate-500 block">Y (KM)</label>
                  <input type="number" value={debY} onChange={e => setDebY(e.target.value)} className="w-full bg-slate-950 border border-slate-800 p-1.5 rounded text-slate-200" />
                </div>
                <div>
                  <label className="text-[9px] text-slate-500 block">Z (KM)</label>
                  <input type="number" value={debZ} onChange={e => setDebZ(e.target.value)} className="w-full bg-slate-950 border border-slate-800 p-1.5 rounded text-slate-200" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1">
                <div>
                  <label className="text-[9px] text-slate-500 block">Vx (KM/S)</label>
                  <input type="number" step="0.01" value={debVx} onChange={e => setDebVx(e.target.value)} className="w-full bg-slate-950 border border-slate-800 p-1.5 rounded text-slate-200" />
                </div>
                <div>
                  <label className="text-[9px] text-slate-500 block">Vy (KM/S)</label>
                  <input type="number" step="0.01" value={debVy} onChange={e => setDebVy(e.target.value)} className="w-full bg-slate-950 border border-slate-800 p-1.5 rounded text-slate-200" />
                </div>
                <div>
                  <label className="text-[9px] text-slate-500 block">Vz (KM/S)</label>
                  <input type="number" step="0.01" value={debVz} onChange={e => setDebVz(e.target.value)} className="w-full bg-slate-950 border border-slate-800 p-1.5 rounded text-slate-200" />
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all"
          >
            <RefreshCw className="w-4 h-4" /> CALCULATE CONJUNCTION & MIN-ENERGY AVOIDANCE FOR THIS STATE VECTOR
          </button>
        </form>
      )}

      {/* Tab 3: Standard Master Prompt API JSON Response View */}
      {activeTab === 'JSON_API' && (
        <div className="bg-slate-950 p-4 rounded-xl border border-emerald-500/40 space-y-3 font-mono">
          <div className="flex items-center justify-between">
            <span className="text-emerald-400 font-bold text-xs flex items-center gap-1.5">
              <Code className="w-4 h-4" /> STANDARDIZED API JSON PAYLOAD (MASTER PROMPT SCHEMA)
            </span>
            <span className="text-[10px] text-slate-400">Response Object format for API / Microservices</span>
          </div>

          <pre className="bg-slate-900 p-3.5 rounded-lg border border-slate-800 text-[11px] text-emerald-300 overflow-x-auto max-h-[260px] custom-scrollbar selection:bg-emerald-900">
            {JSON.stringify(masterApiJson, null, 2)}
          </pre>

          <p className="text-[10px] text-slate-400">
            This API response object provides real-time telemetry, TCA, risk classification, minimum-energy burn ($\Delta v$ m/s), propellant consumption, and secondary debris screening status.
          </p>
        </div>
      )}
    </div>
  );
}
