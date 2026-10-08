import React, { useState } from 'react';
import { X, Plus, Radar, Sparkles, AlertCircle } from 'lucide-react';
import { EARTH_RADIUS_KM } from '../physics/constants.js';

export default function AddDebrisModal({ isOpen, onClose, onAddDebris }) {
  const [name, setName] = useState('');
  const [altitudeKm, setAltitudeKm] = useState(550);
  const [inclinationDeg, setInclinationDeg] = useState(65);
  const [sizeMeters, setSizeMeters] = useState(1.2);

  if (!isOpen) return null;

  const handleGenerateRandom = () => {
    const randomId = Math.floor(1000 + Math.random() * 9000);
    const isIntersecting = Math.random() > 0.3; // High chance of creating an intersecting threat

    const newDebris = {
      id: `NEW-OBJ-${randomId}`,
      name: `UNIDENTIFIED DEBRIS #${randomId}`,
      catalogNumber: 50000 + randomId,
      origin: 'Newly Detected Radar Track (LEO)',
      sizeMeters: parseFloat((0.4 + Math.random() * 2.5).toFixed(1)),
      massKg: parseFloat((10 + Math.random() * 300).toFixed(1)),
      isLeo: true,
      keplerian: {
        a: EARTH_RADIUS_KM + (isIntersecting ? 552 : 350 + Math.random() * 800),
        e: Math.random() * 0.01,
        i: (Math.random() * 90 * Math.PI) / 180,
        raan: (Math.random() * 360 * Math.PI) / 180,
        argPer: (Math.random() * 360 * Math.PI) / 180,
        meanAnomaly: ((isIntersecting ? 355 + Math.random() * 10 : Math.random() * 360) * Math.PI) / 180
      }
    };

    onAddDebris(newDebris);
    onClose();
  };

  const handleSubmitCustom = (e) => {
    e.preventDefault();
    const randomId = Math.floor(1000 + Math.random() * 9000);

    const newDebris = {
      id: `NEW-${randomId}`,
      name: name || `TRACKED OBJECT #${randomId}`,
      catalogNumber: 60000 + randomId,
      origin: 'Manual Sensor Detection',
      sizeMeters: parseFloat(sizeMeters),
      massKg: 50.0,
      isLeo: altitudeKm < 2000,
      keplerian: {
        a: EARTH_RADIUS_KM + parseFloat(altitudeKm),
        e: 0.002,
        i: (parseFloat(inclinationDeg) * Math.PI) / 180,
        raan: Math.random() * 2 * Math.PI,
        argPer: Math.random() * 2 * Math.PI,
        meanAnomaly: Math.random() * 2 * Math.PI
      }
    };

    onAddDebris(newDebris);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl flex flex-col gap-4 font-mono text-xs">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-cyan-400">
            <Radar className="w-5 h-5 animate-pulse" />
            <h2 className="text-base font-bold text-white tracking-wider">
              DETECT & INJECT NEW SPACE DEBRIS
            </h2>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-slate-400 text-[11px]">
          Simulate real-time detection of newly discovered space debris via ground radar or optical sensors. The system will propagate its orbit, assess collision threat, and re-optimize satellite avoidance.
        </p>

        {/* Quick Simulated Radar Discovery Button */}
        <button
          type="button"
          onClick={handleGenerateRandom}
          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-rose-950/50 transition-all"
        >
          <Sparkles className="w-4 h-4" /> SIMULATE RADAR DISCOVERY OF NEW HIGH-RISK DEBRIS
        </button>

        <div className="flex items-center gap-3 my-1">
          <div className="h-px bg-slate-800 flex-1" />
          <span className="text-[10px] text-slate-500 uppercase">OR INPUT CUSTOM TRAJECTORY</span>
          <div className="h-px bg-slate-800 flex-1" />
        </div>

        {/* Custom Input Form */}
        <form onSubmit={handleSubmitCustom} className="space-y-3">
          <div>
            <label className="text-slate-400 text-[10px] block mb-1">DEBRIS NAME / IDENTIFIER</label>
            <input
              type="text"
              placeholder="e.g. COSMOS-FRAGMENT-X"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 outline-none focus:border-cyan-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 text-[10px] block mb-1">ALTITUDE (KM)</label>
              <input
                type="number"
                value={altitudeKm}
                onChange={e => setAltitudeKm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="text-slate-400 text-[10px] block mb-1">INCLINATION (DEG)</label>
              <input
                type="number"
                value={inclinationDeg}
                onChange={e => setInclinationDeg(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all"
          >
            <Plus className="w-4 h-4" /> ADD DEBRIS TO TRACKING CATALOG
          </button>
        </form>
      </div>
    </div>
  );
}
