import React, { useState } from 'react';
import { Search, AlertTriangle, ShieldCheck, Flame, Radio, Crosshair, PlusCircle } from 'lucide-react';

export default function DebrisMonitorPanel({
  primaryDebris,
  bgDebrisCatalog,
  customDebrisList,
  selectedDebrisId,
  onSelectDebris,
  onOpenAddModal,
  conjunction,
  riskAssessment,
  hasAppliedManeuver
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTier, setFilterTier] = useState('ALL');

  // Combine primary hazard debris, custom detected debris, and catalog with unique key IDs
  const allDebrisList = [
    ...(customDebrisList || []),
    { ...primaryDebris, isPrimaryHazard: true, uniqueKey: `primary_${primaryDebris?.id}` },
    ...(bgDebrisCatalog || []).map((item, idx) => ({ ...item, uniqueKey: `bg_${item.id}_${idx}` }))
  ];

  const filteredDebris = allDebrisList.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.id.toLowerCase().includes(searchQuery.toLowerCase());
    if (filterTier === 'PRIMARY') return matchesSearch && item.isPrimaryHazard;
    if (filterTier === 'NEW') return matchesSearch && item.id.startsWith('NEW');
    return matchesSearch;
  });

  return (
    <div className="w-full h-full bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col gap-3 backdrop-blur-md shadow-2xl overflow-hidden">
      {/* Header & Add Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
          <h2 className="text-sm font-bold font-mono text-white tracking-wider uppercase">
            TRACKED DEBRIS CATALOG ({allDebrisList.length})
          </h2>
        </div>

        {/* Detect / Inject New Debris Button */}
        <button
          onClick={onOpenAddModal}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-bold shadow-lg shadow-rose-950/40 transition-all hover:scale-105"
        >
          <PlusCircle className="w-3.5 h-3.5" /> DETECT DEBRIS
        </button>
      </div>

      {/* Search & Filter bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-xs font-mono">
          <Search className="w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search Debris ID, NORAD..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-slate-200 outline-none placeholder:text-slate-600"
          />
        </div>
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-[11px] font-mono">
          <button
            onClick={() => setFilterTier('ALL')}
            className={`px-2 py-0.5 rounded ${filterTier === 'ALL' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            ALL
          </button>
          <button
            onClick={() => setFilterTier('PRIMARY')}
            className={`px-2 py-0.5 rounded ${filterTier === 'PRIMARY' ? 'bg-rose-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            HAZARDS
          </button>
        </div>
      </div>

      {/* Primary Hazard Highlight Banner */}
      {primaryDebris && (
        <div
          onClick={() => onSelectDebris(primaryDebris.id, 'DEBRIS')}
          className={`p-3 rounded-lg border transition-all cursor-pointer shadow-lg ${
            hasAppliedManeuver
              ? 'bg-emerald-950/60 border-emerald-500/50 hover:border-emerald-400'
              : 'bg-rose-950/70 border-rose-500/60 hover:border-rose-400 animate-pulse'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2 font-mono text-xs font-bold text-rose-300">
              <AlertTriangle className={`w-4 h-4 ${hasAppliedManeuver ? 'text-emerald-400' : 'text-rose-400'}`} />
              <span>PRIMARY CONJUNCTION HAZARD</span>
            </div>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
              hasAppliedManeuver ? 'bg-emerald-900 text-emerald-300' : 'bg-rose-900 text-rose-200'
            }`}>
              {hasAppliedManeuver ? 'SAFE' : riskAssessment?.threatLevel?.name}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs font-mono">
            <div>
              <p className="font-bold text-white text-sm">{primaryDebris.name}</p>
              <p className="text-[11px] text-slate-400">ID: {primaryDebris.id} • {primaryDebris.origin}</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-slate-400">TCA Miss Distance</p>
              <p className={`text-base font-bold ${hasAppliedManeuver ? 'text-emerald-400' : 'text-rose-400'}`}>
                {conjunction ? `${conjunction.missDistanceKm.toFixed(2)} km` : '--'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Scrollable Debris List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar max-h-[300px]">
        {filteredDebris.map(item => {
          const isSelected = selectedDebrisId === item.id;
          const isPrimary = item.isPrimaryHazard;
          const isNewlyDetected = item.id.startsWith('NEW');

          return (
            <div
              key={item.uniqueKey || item.id}
              onClick={() => onSelectDebris(item.id, 'DEBRIS')}
              className={`p-2.5 rounded-lg border text-xs font-mono transition-all cursor-pointer flex items-center justify-between ${
                isSelected
                  ? 'bg-cyan-950/80 border-cyan-500 text-white shadow-lg'
                  : isNewlyDetected
                  ? 'bg-amber-950/40 border-amber-500/80 text-amber-200 hover:bg-amber-900/60'
                  : isPrimary
                  ? 'bg-rose-950/30 border-rose-900/60 text-slate-200 hover:bg-slate-800'
                  : 'bg-slate-950/50 border-slate-800 text-slate-300 hover:bg-slate-800/80'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className={`w-2 h-2 rounded-full ${isNewlyDetected ? 'bg-amber-400 animate-ping' : isPrimary ? 'bg-rose-500 animate-ping' : 'bg-slate-500'}`} />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{item.name}</span>
                    {isNewlyDetected && (
                      <span className="text-[9px] bg-amber-950 text-amber-300 px-1.5 py-0.2 rounded border border-amber-700 font-bold">
                        NEWLY DETECTED
                      </span>
                    )}
                    {isPrimary && (
                      <span className="text-[9px] bg-rose-950 text-rose-300 px-1.5 py-0.2 rounded border border-rose-800">
                        TARGET
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400">
                    ID: {item.id} • Size: {item.sizeMeters}m
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-500">{item.isLeo ? 'LEO' : 'GEO'}</span>
                <Crosshair className="w-3.5 h-3.5 text-slate-500 hover:text-cyan-400 transition-colors" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
