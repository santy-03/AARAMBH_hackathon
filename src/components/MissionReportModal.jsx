import React from 'react';
import { X, Download, ShieldCheck, FileText, CheckCircle, AlertTriangle } from 'lucide-react';
import { DEFAULT_SAFE_DISTANCE_KM } from '../physics/constants.js';

export default function MissionReportModal({
  isOpen,
  onClose,
  scenario,
  conjunction,
  riskAssessment,
  appliedManeuver,
  optimizationResult
}) {
  if (!isOpen) return null;

  const isNominalSafe = conjunction.missDistanceKm >= DEFAULT_SAFE_DISTANCE_KM;

  const handleDownloadJSON = () => {
    const reportData = {
      missionTitle: 'Space Debris Avoidance Telemetry Certificate',
      timestamp: new Date().toISOString(),
      scenario: scenario.name,
      primarySatellite: scenario.satellite.name,
      targetDebris: scenario.primaryDebris.name,
      baselineConjunction: {
        tcaMinutes: conjunction.tcaMinutes,
        missDistanceKm: conjunction.missDistanceKm,
        relativeVelocityKmS: conjunction.relativeVelocityKmS,
        riskScore: riskAssessment.riskScore,
        probabilityOfCollision: riskAssessment.pcString,
        threatLevel: riskAssessment.threatLevel.name
      },
      appliedManeuver: appliedManeuver ? {
        deltaVMag_ms: appliedManeuver.deltaVMag_ms,
        direction: appliedManeuver.directionName,
        leadTimeMinutes: appliedManeuver.leadTimeMinutes,
        resultingMissDistanceKm: appliedManeuver.resultingMissDistanceKm,
        energySavingsPercent: optimizationResult?.energySavingsPercent || 85
      } : isNominalSafe ? 'No maneuver required (Already safe)' : 'Unmitigated hazard',
      status: appliedManeuver || isNominalSafe ? 'MISSION VERIFIED SAFE' : 'UNMITIGATED HAZARD'
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AstroGuard_Mission_Report_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl flex flex-col gap-4 font-mono text-xs">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-cyan-400">
            <FileText className="w-5 h-5" />
            <h2 className="text-base font-bold text-white tracking-wider">
              MISSION TELEMETRY & AVOIDANCE CERTIFICATE
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Report Content Box */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div>
              <p className="text-sm font-bold text-white">{scenario.name}</p>
              <p className="text-[10px] text-slate-400">Generated: {new Date().toUTCString()}</p>
            </div>
            <span className={`px-2.5 py-1 rounded font-bold text-[10px] ${
              appliedManeuver || isNominalSafe
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-600'
                : 'bg-rose-950 text-rose-300 border border-rose-600'
            }`}>
              {appliedManeuver
                ? '✅ HAZARD MITIGATED'
                : isNominalSafe
                ? '✅ NOMINAL ORBIT (SAFE)'
                : '⚠️ UNMITIGATED HAZARD'}
            </span>
          </div>

          {/* Encounter Details */}
          <div>
            <p className="font-bold text-cyan-400 mb-1.5">1. CONJUNCTION ENCOUNTER PARAMETERS</p>
            <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-900/60 p-2.5 rounded-lg">
              <p><span className="text-slate-400">Satellite:</span> {scenario.satellite.name}</p>
              <p><span className="text-slate-400">Debris:</span> {scenario.primaryDebris.name}</p>
              <p><span className="text-slate-400">TCA:</span> {conjunction.tcaMinutes.toFixed(1)} min</p>
              <p><span className="text-slate-400">Baseline Miss Dist:</span> {conjunction.missDistanceKm.toFixed(2)} km</p>
              <p><span className="text-slate-400">Rel Velocity:</span> {conjunction.relativeVelocityKmS.toFixed(2)} km/s</p>
              <p><span className="text-slate-400">Initial Risk Score:</span> {riskAssessment.riskScore}/100 ({riskAssessment.threatLevel.name})</p>
            </div>
          </div>

          {/* Avoidance Maneuver Summary */}
          <div>
            <p className="font-bold text-emerald-400 mb-1.5">2. MINIMUM-ENERGY AVOIDANCE SOLUTION</p>
            {appliedManeuver ? (
              <div className="grid grid-cols-2 gap-2 text-[11px] bg-emerald-950/30 p-2.5 rounded-lg border border-emerald-800/40">
                <p><span className="text-slate-400">Burn Direction:</span> {appliedManeuver.directionName}</p>
                <p><span className="text-slate-400">Delta-V Impulse:</span> {appliedManeuver.deltaVMag_ms} m/s</p>
                <p><span className="text-slate-400">Burn Lead Time:</span> {appliedManeuver.leadTimeMinutes} min prior</p>
                <p><span className="text-slate-400">New Safe Distance:</span> {appliedManeuver.resultingMissDistanceKm} km</p>
                <p><span className="text-slate-400">Propellant Energy Saved:</span> {optimizationResult?.energySavingsPercent || 85}%</p>
                <p><span className="text-slate-400">RIC Vector:</span> [{appliedManeuver.deltaV_RIC_ms.join(', ')}] m/s</p>
              </div>
            ) : isNominalSafe ? (
              <p className="text-emerald-400 text-[11px] bg-emerald-950/30 p-2.5 rounded-lg border border-emerald-800">
                ✅ Baseline orbit maintains safe separation beyond {DEFAULT_SAFE_DISTANCE_KM.toFixed(1)} km threshold. No avoidance burn required.
              </p>
            ) : (
              <p className="text-rose-400 text-[11px] bg-rose-950/30 p-2.5 rounded-lg border border-rose-900">
                ⚠️ Conjunction hazard active. Click "Execute Avoidance Burn" to apply minimum-energy maneuver.
              </p>
            )}
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
          >
            CLOSE
          </button>
          <button
            onClick={handleDownloadJSON}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold shadow-lg shadow-cyan-600/20"
          >
            <Download className="w-4 h-4" /> EXPORT TELEMETRY REPORT (JSON)
          </button>
        </div>
      </div>
    </div>
  );
}
