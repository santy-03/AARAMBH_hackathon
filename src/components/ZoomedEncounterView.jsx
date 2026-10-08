import React, { useEffect, useRef } from 'react';
import { Target, ShieldCheck, AlertTriangle, ZoomIn } from 'lucide-react';
import { DEFAULT_SAFE_DISTANCE_KM } from '../physics/constants.js';

export default function ZoomedEncounterView({
  baselineConjunction,
  activeConjunction,
  appliedManeuver,
  safeDistanceKm = DEFAULT_SAFE_DISTANCE_KM
}) {
  const canvasRef = useRef(null);

  const beforeMissKm = baselineConjunction?.missDistanceKm || 0.42;
  const afterMissKm = activeConjunction?.missDistanceKm || beforeMissKm;
  const hasManeuver = !!appliedManeuver;

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height / 2;

    // Scaling: map ~12 km to canvas radius
    const maxRadiusKm = Math.max(safeDistanceKm * 2.2, afterMissKm * 1.3, 10);
    const scale = (Math.min(width, height) * 0.42) / maxRadiusKm;

    // Draw background radar circles
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    [2.5, 5.0, 7.5, 10.0].forEach(rKm => {
      const rPx = rKm * scale;
      ctx.beginPath();
      ctx.arc(centerX, centerY, rPx, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#475569';
      ctx.font = '8px monospace';
      ctx.fillText(`${rKm} km`, centerX + rPx + 3, centerY - 2);
    });

    // Crosshairs
    ctx.strokeStyle = '#1e293b';
    ctx.beginPath();
    ctx.moveTo(0, centerY); ctx.lineTo(width, centerY);
    ctx.moveTo(centerX, 0); ctx.lineTo(centerX, height);
    ctx.stroke();

    // Safe threshold circle (Red dashed)
    const safeRadiusPx = safeDistanceKm * scale;
    ctx.strokeStyle = '#ef4444';
    ctx.setLineDash([3, 3]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(centerX, centerY, safeRadiusPx, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#ef4444';
    ctx.font = '8px monospace';
    ctx.fillText(`SAFETY BORDER (${safeDistanceKm} KM)`, centerX - safeRadiusPx + 4, centerY - safeRadiusPx - 4);

    // Center Origin: Target Debris Position at TCA
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 10px monospace';
    ctx.fillText('TARGET DEBRIS (TCA ORIGIN)', centerX + 10, centerY + 14);

    // Debris approach trajectory line (Angled line passing through center)
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerX - 140, centerY - 100);
    ctx.lineTo(centerX + 140, centerY + 100);
    ctx.stroke();

    // 1. BEFORE MANEUVER: Satellite Closest Approach Point (Amber)
    const beforeRic = baselineConjunction?.ricOffsetKm || { intrack: 0.3, radial: 0.2 };
    const beforeX = centerX + (beforeRic.intrack || beforeMissKm * 0.7) * scale;
    const beforeY = centerY - (beforeRic.radial || beforeMissKm * 0.7) * scale;

    // Nominal path line
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.5)';
    ctx.setLineDash([4, 3]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(beforeX - 100, beforeY + 90);
    ctx.lineTo(beforeX + 100, beforeY - 90);
    ctx.stroke();
    ctx.setLineDash([]);

    // Miss distance line before
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(beforeX, beforeY);
    ctx.stroke();

    // Before Closest Approach Marker (X marker)
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(beforeX - 5, beforeY - 5); ctx.lineTo(beforeX + 5, beforeY + 5);
    ctx.moveTo(beforeX + 5, beforeY - 5); ctx.lineTo(beforeX - 5, beforeY + 5);
    ctx.stroke();

    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 9px monospace';
    ctx.fillText(`BEFORE TCA: ${beforeMissKm.toFixed(2)} km`, beforeX + 8, beforeY - 6);

    // 2. AFTER MANEUVER: Satellite Diverted Safe Path (Emerald)
    if (hasManeuver) {
      const afterRic = activeConjunction?.ricOffsetKm || { intrack: afterMissKm * 0.8, radial: afterMissKm * 0.6 };
      const afterX = centerX + (afterRic.intrack || afterMissKm * 0.8) * scale;
      const afterY = centerY - (afterRic.radial || afterMissKm * 0.6) * scale;

      // Post-burn trajectory line
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.6)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(afterX - 120, afterY + 80);
      ctx.lineTo(afterX + 120, afterY - 80);
      ctx.stroke();

      // Miss distance line after
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(afterX, afterY);
      ctx.stroke();

      // After Safe Point Marker (Green Circle with Dot)
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(afterX, afterY, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 10px monospace';
      ctx.fillText(`AFTER TCA: ${afterMissKm.toFixed(2)} km`, afterX + 10, afterY - 6);
    }

  }, [baselineConjunction, activeConjunction, appliedManeuver, safeDistanceKm, beforeMissKm, afterMissKm, hasManeuver]);

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3 backdrop-blur-md shadow-2xl font-mono">
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-2.5 gap-2">
        <div className="flex items-center gap-2">
          <ZoomIn className="w-4 h-4 text-purple-400" />
          <h2 className="text-xs font-bold text-white tracking-wider uppercase">
            ZOOMED-IN ENCOUNTER PLANE (B-PLANE RELATIVE MOTION)
          </h2>
        </div>

        <div className="flex items-center gap-3 text-[10px]">
          <span className="text-amber-400 font-bold bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/40">
            BEFORE MISS: {beforeMissKm.toFixed(2)} km
          </span>
          <span className="text-emerald-400 font-bold bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">
            AFTER MISS: {afterMissKm.toFixed(2)} km
          </span>
        </div>
      </div>

      <div className="relative w-full h-[220px] bg-slate-950/90 rounded-xl border border-slate-800 overflow-hidden flex items-center justify-center">
        <canvas ref={canvasRef} width={680} height={220} className="w-full h-full" />
      </div>
    </div>
  );
}
