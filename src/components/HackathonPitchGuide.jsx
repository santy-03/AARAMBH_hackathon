import React, { useState } from 'react';
import { Satellite, Search, Trophy, Sparkles, CheckCircle2, ArrowRight, Activity, Zap } from 'lucide-react';
import { POPULAR_LIVE_SATELLITES, fetchLiveSatelliteByNoradId } from '../physics/celestrakApi.js';

export default function HackathonPitchGuide({
  activeSatellite,
  onSelectLiveSatellite,
  riskAssessment,
  hasAppliedManeuver,
  onExecuteRecommendedManeuver
}) {
  const [noradSearch, setNoradSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(1);

  const handleNoradFetch = async (e) => {
    e.preventDefault();
    if (!noradSearch) return;

    setIsLoading(true);
    const sat = await fetchLiveSatelliteByNoradId(noradSearch.trim());
    setIsLoading(false);

    if (sat) {
      onSelectLiveSatellite(sat);
      setNoradSearch('');
    } else {
      alert(`Could not fetch live TLE for NORAD ID "${noradSearch}". Try 25544 (ISS) or 20580 (Hubble).`);
    }
  };

  return (
    <div className="w-full bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-900 border-b border-cyan-500/30 px-6 py-3 font-mono text-xs shadow-xl">
      <div className="max-w-[1800px] mx-auto flex flex-wrap items-center justify-between gap-4">
        {/* Left: Hackathon Pitch Header & Live Satellite Selector */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-gradient-to-r from-amber-500/20 to-yellow-600/20 px-3 py-1.5 rounded-lg border border-amber-500/50 text-amber-300 font-bold">
            <Trophy className="w-4 h-4 text-amber-400 animate-bounce" />
            <span>HACKATHON DEMO MODE</span>
          </div>

          {/* Live Satellite Dropdown Picker */}
          <div className="flex items-center gap-2 bg-slate-950/90 px-3 py-1.5 rounded-lg border border-slate-700">
            <Satellite className="w-4 h-4 text-cyan-400" />
            <span className="text-slate-400 text-[11px]">ACTIVE REAL SATELLITE:</span>
            <select
              value={activeSatellite?.noradId || 25544}
              onChange={(e) => {
                const selected = POPULAR_LIVE_SATELLITES.find(s => s.noradId === parseInt(e.target.value));
                if (selected) onSelectLiveSatellite(selected);
              }}
              className="bg-transparent text-cyan-300 font-bold outline-none cursor-pointer text-xs"
            >
              {POPULAR_LIVE_SATELLITES.map(sat => (
                <option key={sat.noradId} value={sat.noradId} className="bg-slate-900 text-slate-200">
                  {sat.name} (NORAD {sat.noradId})
                </option>
              ))}
            </select>
          </div>

          {/* NORAD Live Search Input */}
          <form onSubmit={handleNoradFetch} className="flex items-center gap-1.5 bg-slate-950/90 px-2.5 py-1 rounded-lg border border-slate-800">
            <input
              type="text"
              placeholder="Enter NORAD ID (e.g. 25544)..."
              value={noradSearch}
              onChange={e => setNoradSearch(e.target.value)}
              className="bg-transparent text-slate-200 text-[11px] outline-none w-36 placeholder:text-slate-600"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="px-2 py-0.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-[10px] transition-colors"
            >
              {isLoading ? 'FETCHING...' : 'LIVE FETCH'}
            </button>
          </form>
        </div>

        {/* Right: 4-Step Presentation Workflow Guidance */}
        <div className="flex items-center gap-3">
          <div className="hidden xl:flex items-center gap-2 bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800 text-[11px]">
            <span className={`px-2 py-0.5 rounded font-bold ${activeStep === 1 ? 'bg-cyan-600 text-white' : 'text-slate-400'}`}>
              1. TRACK SATELLITE
            </span>
            <ArrowRight className="w-3 h-3 text-slate-600" />
            <span className={`px-2 py-0.5 rounded font-bold ${activeStep === 2 ? 'bg-rose-600 text-white' : 'text-slate-400'}`}>
              2. DETECT HAZARD
            </span>
            <ArrowRight className="w-3 h-3 text-slate-600" />
            <span className={`px-2 py-0.5 rounded font-bold ${hasAppliedManeuver ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}>
              3. MIN-ENERGY AVOID
            </span>
          </div>

          {!hasAppliedManeuver && (
            <button
              onClick={onExecuteRecommendedManeuver}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all animate-pulse"
            >
              <Zap className="w-3.5 h-3.5" /> 1-CLICK AVOIDANCE BURN
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
