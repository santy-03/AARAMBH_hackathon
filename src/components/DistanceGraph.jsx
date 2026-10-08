import React, { useEffect, useRef } from 'react';
import { TrendingDown, Shield, CheckCircle2, AlertTriangle } from 'lucide-react';
import { DEFAULT_SAFE_DISTANCE_KM } from '../physics/constants.js';

export default function DistanceGraph({
  baselineTrajectory,
  postManeuverTrajectory,
  simTimeSeconds,
  tcaMinutes,
  hasAppliedManeuver,
  safeDistanceKm = DEFAULT_SAFE_DISTANCE_KM
}) {
  const canvasRef = useRef(null);

  // Compute minimum separation for baseline and post-maneuver
  let baseMinPt = null;
  if (baselineTrajectory && baselineTrajectory.length > 0) {
    baseMinPt = baselineTrajectory.reduce((min, pt) => (pt.distKm < min.distKm ? pt : min), baselineTrajectory[0]);
  }

  let postMinPt = null;
  if (postManeuverTrajectory && postManeuverTrajectory.length > 0) {
    postMinPt = postManeuverTrajectory.reduce((min, pt) => (pt.distKm < min.distKm ? pt : min), postManeuverTrajectory[0]);
  }

  useEffect(() => {
    if (!canvasRef.current || !baselineTrajectory || baselineTrajectory.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Padding
    const pLeft = 55;
    const pRight = 25;
    const pTop = 25;
    const pBottom = 35;

    const graphWidth = width - pLeft - pRight;
    const graphHeight = height - pTop - pBottom;

    // Time domain & Distance range
    const times = baselineTrajectory.map(pt => pt.timeMin);
    const minT = Math.min(...times);
    const maxT = Math.max(...times);

    const baseDists = baselineTrajectory.map(pt => pt.distKm);
    const postDists = postManeuverTrajectory ? postManeuverTrajectory.map(pt => pt.distKm) : [];
    const maxDist = Math.max(safeDistanceKm * 2.2, ...baseDists, ...postDists, 12);

    // Coordinate mapping functions
    const getX = (t) => pLeft + ((t - minT) / (maxT - minT)) * graphWidth;
    const getY = (d) => pTop + graphHeight - (Math.min(maxDist, d) / maxDist) * graphHeight;

    // Draw background grid
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let d = 0; d <= maxDist; d += maxDist / 4) {
      const y = getY(d);
      ctx.moveTo(pLeft, y);
      ctx.lineTo(width - pRight, y);

      ctx.fillStyle = '#64748b';
      ctx.font = '9px monospace';
      ctx.fillText(`${d.toFixed(1)} km`, 8, y + 3);
    }
    ctx.stroke();

    // Draw Safe Threshold Red Line
    const safeY = getY(safeDistanceKm);
    ctx.strokeStyle = '#ef4444';
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(pLeft, safeY);
    ctx.lineTo(width - pRight, safeY);
    ctx.stroke();

    ctx.fillStyle = '#ef4444';
    ctx.font = '9px monospace';
    ctx.fillText(`SAFETY THRESHOLD (${safeDistanceKm} KM)`, pLeft + 6, safeY - 4);
    ctx.setLineDash([]); // Reset dash

    // Draw Baseline Trajectory (Amber dashed)
    ctx.strokeStyle = '#f59e0b';
    ctx.setLineDash([5, 3]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    baselineTrajectory.forEach((pt, i) => {
      const x = getX(pt.timeMin);
      const y = getY(pt.distKm);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.setLineDash([]); // Reset dash

    // Draw Post-Maneuver Trajectory (Neon Green Solid) if applied
    if (postManeuverTrajectory && postManeuverTrajectory.length > 0) {
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 3;
      ctx.beginPath();
      postManeuverTrajectory.forEach((pt, i) => {
        const x = getX(pt.timeMin);
        const y = getY(pt.distKm);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }

    // POINT MARKER 1: Baseline Minimum Separation & TCA Before (Section 12)
    if (baseMinPt) {
      const x = getX(baseMinPt.timeMin);
      const y = getY(baseMinPt.distKm);

      // Vertical guideline to axis
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, height - pBottom);
      ctx.stroke();
      ctx.setLineDash([]);

      // Point marker
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Callout Label
      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 9px monospace';
      ctx.fillText(`BEFORE: ${baseMinPt.distKm.toFixed(2)} km`, x - 35, y - 8);
    }

    // POINT MARKER 2: Post-Maneuver Minimum Separation & TCA After (Section 12)
    if (postMinPt && hasAppliedManeuver) {
      const x = getX(postMinPt.timeMin);
      const y = getY(postMinPt.distKm);

      // Vertical guideline to axis
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, height - pBottom);
      ctx.stroke();
      ctx.setLineDash([]);

      // Point marker
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Callout Label
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 10px monospace';
      ctx.fillText(`AFTER: ${postMinPt.distKm.toFixed(2)} km`, x - 30, y - 10);
    }

    // Draw Current Sim Time Marker (Cyan Vertical line)
    const currentMin = simTimeSeconds / 60;
    if (currentMin >= minT && currentMin <= maxT) {
      const curX = getX(currentMin);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(curX, pTop);
      ctx.lineTo(curX, height - pBottom);
      ctx.stroke();

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('NOW', curX - 10, pTop - 6);
    }

    // X-Axis time labels
    ctx.fillStyle = '#64748b';
    ctx.font = '9px monospace';
    ctx.fillText(`${minT.toFixed(0)}m`, pLeft, height - 10);
    ctx.fillText(`TCA (${((minT + maxT) / 2).toFixed(0)}m)`, pLeft + graphWidth / 2 - 20, height - 10);
    ctx.fillText(`${maxT.toFixed(0)}m`, width - pRight - 20, height - 10);

  }, [baselineTrajectory, postManeuverTrajectory, simTimeSeconds, tcaMinutes, hasAppliedManeuver, safeDistanceKm, baseMinPt, postMinPt]);

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3 backdrop-blur-md shadow-2xl font-mono">
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-2.5 gap-2">
        <div className="flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-cyan-400" />
          <h2 className="text-xs font-bold text-white tracking-wider uppercase">
            RELATIVE DISTANCE vs TIME d(t) — BEFORE vs AFTER
          </h2>
        </div>

        <div className="flex items-center gap-3 text-[11px]">
          <span className="flex items-center gap-1.5 text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/40">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
            BEFORE: {baseMinPt ? `${baseMinPt.distKm.toFixed(2)} km` : '—'}
          </span>
          {hasAppliedManeuver && postMinPt && (
            <span className="flex items-center gap-1.5 text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
              AFTER: {postMinPt.distKm.toFixed(2)} km
            </span>
          )}
        </div>
      </div>

      <div className="relative w-full h-[180px] bg-slate-950/90 rounded-xl border border-slate-800 overflow-hidden">
        <canvas ref={canvasRef} width={680} height={180} className="w-full h-full" />
      </div>
    </div>
  );
}
