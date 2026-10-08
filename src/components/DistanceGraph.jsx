import React, { useEffect, useRef } from 'react';
import { TrendingDown, Shield } from 'lucide-react';
import { DEFAULT_SAFE_DISTANCE_KM } from '../physics/constants.js';

export default function DistanceGraph({
  baselineTrajectory,
  postManeuverTrajectory,
  simTimeSeconds,
  tcaMinutes,
  hasAppliedManeuver
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !baselineTrajectory || baselineTrajectory.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Padding
    const pLeft = 45;
    const pRight = 20;
    const pTop = 20;
    const pBottom = 30;

    const graphWidth = width - pLeft - pRight;
    const graphHeight = height - pTop - pBottom;

    // Time domain & Distance range
    const times = baselineTrajectory.map(pt => pt.timeMin);
    const minT = Math.min(...times);
    const maxT = Math.max(...times);

    const baseDists = baselineTrajectory.map(pt => pt.distKm);
    const postDists = postManeuverTrajectory ? postManeuverTrajectory.map(pt => pt.distKm) : [];
    const maxDist = Math.max(DEFAULT_SAFE_DISTANCE_KM * 2.2, ...baseDists, ...postDists);

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
    }
    ctx.stroke();

    // Draw Safe Threshold Red Line
    const safeY = getY(DEFAULT_SAFE_DISTANCE_KM);
    ctx.strokeStyle = '#ef4444';
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(pLeft, safeY);
    ctx.lineTo(width - pRight, safeY);
    ctx.stroke();

    ctx.fillStyle = '#ef4444';
    ctx.font = '10px monospace';
    ctx.fillText(`SAFETY THRESHOLD (${DEFAULT_SAFE_DISTANCE_KM} KM)`, pLeft + 6, safeY - 4);

    ctx.setLineDash([]); // Reset dash

    // Draw Baseline Trajectory (Red/Orange dashed)
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    baselineTrajectory.forEach((pt, i) => {
      const x = getX(pt.timeMin);
      const y = getY(pt.distKm);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Draw Post-Maneuver Trajectory (Neon Green) if applied
    if (postManeuverTrajectory && postManeuverTrajectory.length > 0) {
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      postManeuverTrajectory.forEach((pt, i) => {
        const x = getX(pt.timeMin);
        const y = getY(pt.distKm);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
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
      ctx.fillText('NOW', curX - 10, pTop - 4);
    }

    // X-Axis time labels
    ctx.fillStyle = '#64748b';
    ctx.font = '9px monospace';
    ctx.fillText(`${minT.toFixed(0)}m`, pLeft, height - 10);
    ctx.fillText(`${((minT + maxT) / 2).toFixed(0)}m`, pLeft + graphWidth / 2 - 8, height - 10);
    ctx.fillText(`${maxT.toFixed(0)}m`, width - pRight - 20, height - 10);

  }, [baselineTrajectory, postManeuverTrajectory, simTimeSeconds, tcaMinutes, hasAppliedManeuver]);

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col gap-3 backdrop-blur-md shadow-2xl">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2 font-mono">
          <TrendingDown className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-bold text-white tracking-wider uppercase">
            CONJUNCTION SEPARATION DISTANCE VS TIME d(t)
          </h2>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-mono">
          <span className="flex items-center gap-1 text-amber-400">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> ORIGINAL PATH
          </span>
          {hasAppliedManeuver && (
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> MANEUVERED PATH
            </span>
          )}
        </div>
      </div>

      <div className="relative w-full h-[160px] bg-slate-950/80 rounded-lg border border-slate-800 overflow-hidden">
        <canvas ref={canvasRef} width={650} height={160} className="w-full h-full" />
      </div>
    </div>
  );
}
