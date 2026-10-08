import React, { useState, useEffect, useMemo } from 'react';
import Header from './components/Header.jsx';
import TimeControls from './components/TimeControls.jsx';
import SpaceMap3D from './components/SpaceMap3D.jsx';
import DebrisMonitorPanel from './components/DebrisMonitorPanel.jsx';
import RiskAssessmentCard from './components/RiskAssessmentCard.jsx';
import AvoidanceOptimizerPanel from './components/AvoidanceOptimizerPanel.jsx';
import DistanceGraph from './components/DistanceGraph.jsx';
import MissionReportModal from './components/MissionReportModal.jsx';
import AddDebrisModal from './components/AddDebrisModal.jsx';
import HackathonPitchGuide from './components/HackathonPitchGuide.jsx';
import BeforeAfterComparisonPanel from './components/BeforeAfterComparisonPanel.jsx';
import ZoomedEncounterView from './components/ZoomedEncounterView.jsx';

import { HACKATHON_SCENARIOS, generateBackgroundDebrisCatalog, ISS_HAZARD_DEBRIS } from './physics/scenarios.js';
import { calculateConjunction } from './physics/conjunction.js';
import { calculateCollisionRisk } from './physics/riskModel.js';
import { optimizeAvoidanceManeuver } from './physics/avoidanceOptimizer.js';
import { applyManeuverImpulse, stateVectorsToKeplerian } from './physics/orbitEngine.js';
import { POPULAR_LIVE_SATELLITES } from './physics/celestrakApi.js';
import { audioEngine } from './utils/audio.js';

import { FileText } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function App() {
  // Scenario & Orbit State: Default to ISS Critical Collision Hazard
  const [activeScenarioId, setActiveScenarioId] = useState('iss-critical-collision');
  const [activeLiveSatellite, setActiveLiveSatellite] = useState(null);
  const [appliedManeuver, setAppliedManeuver] = useState(null);
  const [activePrimaryDebris, setActivePrimaryDebris] = useState(ISS_HAZARD_DEBRIS);
  const [customStateVectors, setCustomStateVectors] = useState(null);
  const [customDebrisList, setCustomDebrisList] = useState([]);

  // Propulsion & Safety Parameters (Section 16, 21)
  const [satelliteMassKg, setSatelliteMassKg] = useState(1000);
  const [propulsionIsp, setPropulsionIsp] = useState(300);
  const [safetyThresholdKm, setSafetyThresholdKm] = useState(5.0);

  // Simulation Clock State
  const [simTimeSeconds, setSimTimeSeconds] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(5);

  // 3D Map View State
  const [cameraMode, setCameraMode] = useState('EARTH'); // 'EARTH', 'SATELLITE', 'HAZARD', 'DEBRIS'
  const [selectedDebrisId, setSelectedDebrisId] = useState(null);

  // Modal States
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isAddDebrisModalOpen, setIsAddDebrisModalOpen] = useState(false);

  // Active scenario reference
  const activeScenario = useMemo(() => {
    return HACKATHON_SCENARIOS.find(s => s.id === activeScenarioId) || HACKATHON_SCENARIOS[0];
  }, [activeScenarioId]);

  // Combined Active Satellite (Live TLE or Custom State Vector or Scenario)
  const currentSatellite = useMemo(() => {
    if (customStateVectors?.satKep) {
      return { name: 'CUSTOM SATELLITE (VECTOR)', noradId: 99999, keplerian: customStateVectors.satKep };
    }
    if (activeLiveSatellite && activeLiveSatellite.keplerian) {
      return { name: activeLiveSatellite.name, noradId: activeLiveSatellite.noradId, keplerian: activeLiveSatellite.keplerian };
    }
    return activeScenario.satellite;
  }, [customStateVectors, activeLiveSatellite, activeScenario]);

  const targetDebris = useMemo(() => {
    if (customStateVectors?.debKep) {
      return { id: 'CUSTOM-DEB-01', name: 'CUSTOM DEBRIS VECTOR', catalogNumber: 88888, origin: 'Custom State Input', sizeMeters: 1.5, keplerian: customStateVectors.debKep };
    }
    if (activeLiveSatellite?.noradId === 25544) {
      return ISS_HAZARD_DEBRIS;
    }
    return activePrimaryDebris || activeScenario.primaryDebris;
  }, [customStateVectors, activeLiveSatellite, activePrimaryDebris, activeScenario]);

  // Set active primary debris when scenario changes
  useEffect(() => {
    setActivePrimaryDebris(activeScenario.primaryDebris);
  }, [activeScenario]);

  // Generate background debris catalog (250 items) once
  const bgDebrisCatalog = useMemo(() => {
    return generateBackgroundDebrisCatalog(250);
  }, []);

  // Reset states when changing scenario
  const handleSelectScenario = (id) => {
    setActiveScenarioId(id);
    setActiveLiveSatellite(null);
    setAppliedManeuver(null);
    setSimTimeSeconds(0);
    setCameraMode('EARTH');
    setSelectedDebrisId(null);
    setCustomDebrisList([]);
    setCustomStateVectors(null);
  };

  const handleSelectLiveSatellite = (satObj) => {
    setActiveLiveSatellite(satObj);
    if (satObj.noradId === 25544) {
      setActivePrimaryDebris(ISS_HAZARD_DEBRIS);
    }
    setAppliedManeuver(null);
    setSimTimeSeconds(0);
    setCameraMode('SATELLITE');
    setCustomStateVectors(null);
  };

  // Add newly detected debris
  const handleAddDebris = (newDebrisObj) => {
    setCustomDebrisList(prev => [newDebrisObj, ...prev]);
    setActivePrimaryDebris(newDebrisObj);
    setSelectedDebrisId(newDebrisObj.id);
    setAppliedManeuver(null);
    setCameraMode('DEBRIS');
    setCustomStateVectors(null);
    audioEngine.playHazardAlert();
  };

  // Handle custom Cartesian state vectors (x, y, z, vx, vy, vz)
  const handleCustomStateInput = ({ satPos, satVel, debPos, debVel }) => {
    const satKep = stateVectorsToKeplerian(satPos, satVel);
    const debKep = stateVectorsToKeplerian(debPos, debVel);

    setCustomStateVectors({ satKep, debKep });
    setAppliedManeuver(null);
    setSimTimeSeconds(0);
    setCameraMode('HAZARD');
    audioEngine.playHazardAlert();
  };

  // 1. Calculate Baseline Conjunction (No Maneuver)
  const baselineConjunction = useMemo(() => {
    return calculateConjunction(currentSatellite.keplerian, targetDebris.keplerian);
  }, [currentSatellite, targetDebris]);

  // Baseline Risk Assessment
  const baselineRisk = useMemo(() => {
    return calculateCollisionRisk(
      baselineConjunction.missDistanceKm,
      baselineConjunction.relativeVelocityKmS,
      safetyThresholdKm
    );
  }, [baselineConjunction, safetyThresholdKm]);

  // 2. Calculate Active Conjunction (with applied maneuver if any)
  const activeConjunction = useMemo(() => {
    return calculateConjunction(
      currentSatellite.keplerian,
      targetDebris.keplerian,
      5400,
      appliedManeuver?.maneuverObj || null
    );
  }, [currentSatellite, targetDebris, appliedManeuver]);

  // 3. Collision Risk Assessment
  const riskAssessment = useMemo(() => {
    return calculateCollisionRisk(
      activeConjunction.missDistanceKm,
      activeConjunction.relativeVelocityKmS,
      safetyThresholdKm
    );
  }, [activeConjunction, safetyThresholdKm]);

  // 4. Minimum-Energy Avoidance Maneuver Optimizer
  const optimizationResult = useMemo(() => {
    return optimizeAvoidanceManeuver(
      currentSatellite.keplerian,
      targetDebris.keplerian,
      safetyThresholdKm,
      bgDebrisCatalog,
      satelliteMassKg,
      propulsionIsp
    );
  }, [currentSatellite, targetDebris, safetyThresholdKm, bgDebrisCatalog, satelliteMassKg, propulsionIsp]);

  // Simulation loop timer
  useEffect(() => {
    let timer;
    if (isPlaying) {
      timer = setInterval(() => {
        setSimTimeSeconds(prev => {
          const next = prev + playbackSpeed * 0.2;
          if (next > 5400) return 0;
          return next;
        });
      }, 100);
    }
    return () => clearInterval(timer);
  }, [isPlaying, playbackSpeed]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying(prev => !prev);
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        handleExecuteRecommendedManeuver();
      } else if (e.code === 'KeyD') {
        e.preventDefault();
        setIsAddDebrisModalOpen(true);
      } else if (e.code === 'KeyR') {
        e.preventDefault();
        setAppliedManeuver(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [optimizationResult]);

  // Apply chosen recommended or matrix maneuver
  const handleApplyManeuver = (maneuver) => {
    setAppliedManeuver(maneuver);
    audioEngine.playThrusterBurn();
    setTimeout(() => audioEngine.playSuccessChime(), 400);

    if (maneuver && maneuver.burnTimeSeconds) {
      setSimTimeSeconds(Math.max(0, maneuver.burnTimeSeconds - 60));
    }
  };

  const handleExecuteRecommendedManeuver = () => {
    if (optimizationResult?.recommendedManeuver) {
      try {
        confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
      } catch (err) {}
      handleApplyManeuver(optimizationResult.recommendedManeuver);
    }
  };

  // Apply custom sandbox maneuver
  const handleCustomManeuver = ({ progradeMs, normalMs, radialMs, leadMin }) => {
    const tcaSec = baselineConjunction.tcaSeconds;
    const burnTimeSeconds = Math.max(0, tcaSec - leadMin * 60);

    const ricVector_ms = [radialMs, progradeMs, normalMs];
    const manResult = applyManeuverImpulse(currentSatellite.keplerian, burnTimeSeconds, ricVector_ms);
    const postConj = calculateConjunction(currentSatellite.keplerian, targetDebris.keplerian, 5400, manResult);
    const dvMag = Math.sqrt(progradeMs ** 2 + normalMs ** 2 + radialMs ** 2);

    const customObj = {
      id: 'custom_sandbox',
      directionName: 'Custom Sandbox Burn',
      leadTimeMinutes: leadMin,
      burnTimeSeconds,
      deltaVMag_ms: parseFloat(dvMag.toFixed(2)),
      deltaV_RIC_ms: ricVector_ms,
      resultingMissDistanceKm: parseFloat(postConj.missDistanceKm.toFixed(2)),
      energyCostRating: dvMag < 3.0 ? 'LOW' : dvMag < 8.0 ? 'MEDIUM' : 'HIGH',
      maneuverObj: manResult,
      postConjunction: postConj
    };

    setAppliedManeuver(customObj);
    audioEngine.playThrusterBurn();
    setSimTimeSeconds(Math.max(0, burnTimeSeconds - 60));
  };

  const handleSelectDebris = (id, camMode) => {
    if (id) {
      setSelectedDebrisId(id);
      const found = customDebrisList.find(d => d.id === id) || (activeScenario.primaryDebris.id === id ? activeScenario.primaryDebris : null);
      if (found) setActivePrimaryDebris(found);
    }
    if (camMode) setCameraMode(camMode);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Header Bar */}
      <Header
        activeScenarioId={activeScenarioId}
        onSelectScenario={handleSelectScenario}
        threatLevel={riskAssessment.threatLevel}
        riskScore={riskAssessment.riskScore}
        hasAppliedManeuver={!!appliedManeuver}
        onResetManeuver={() => setAppliedManeuver(null)}
      />

      {/* Hackathon Pitch & Live Satellite Bar */}
      <HackathonPitchGuide
        activeSatellite={currentSatellite}
        onSelectLiveSatellite={handleSelectLiveSatellite}
        riskAssessment={riskAssessment}
        hasAppliedManeuver={!!appliedManeuver}
        onExecuteRecommendedManeuver={handleExecuteRecommendedManeuver}
      />

      {/* Main Dashboard Layout */}
      <main className="flex-1 p-4 md:p-6 space-y-6 max-w-[1800px] mx-auto w-full">
        {/* Simulation Workflow Controls & Parameters Bar (Section 21, 27) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-xl font-mono text-xs backdrop-blur-md">
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => {
                setAppliedManeuver(null);
                setSimTimeSeconds(baselineConjunction.tcaSeconds);
              }}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold border border-slate-700 transition-all flex items-center gap-1.5 shadow-md"
              title="Reset maneuver and simulate unmaneuvered baseline trajectory"
            >
              ⏮️ [1. Run Before Simulation]
            </button>
            <button
              onClick={() => {
                if (optimizationResult?.recommendedManeuver) {
                  audioEngine.playSuccessChime();
                }
              }}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold border border-slate-700 transition-all flex items-center gap-1.5 shadow-md"
              title="Evaluate 6-directional candidate burns with secondary screening"
            >
              ⚙️ [2. Generate Avoidance Maneuvers]
            </button>
            <button
              onClick={handleExecuteRecommendedManeuver}
              className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold border border-emerald-500 transition-all flex items-center gap-1.5 shadow-lg"
              title="Apply minimum-energy burn and simulate post-maneuver trajectory"
            >
              🚀 [3. Run After Simulation]
            </button>
          </div>

          {/* Configurable Parameters Toolbar (Section 16, 21) */}
          <div className="flex flex-wrap items-center gap-4 text-slate-400 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800">
            <div className="flex items-center gap-1.5">
              <span>Sat Mass (m0):</span>
              <input
                type="number"
                value={satelliteMassKg}
                onChange={e => setSatelliteMassKg(Math.max(10, parseFloat(e.target.value) || 1000))}
                className="w-16 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-white text-center font-bold"
              />
              <span>kg</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span>Thruster Isp:</span>
              <input
                type="number"
                value={propulsionIsp}
                onChange={e => setPropulsionIsp(Math.max(50, parseFloat(e.target.value) || 300))}
                className="w-16 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-white text-center font-bold"
              />
              <span>s</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span>Safe Clearance:</span>
              <input
                type="number"
                step="0.5"
                value={safetyThresholdKm}
                onChange={e => setSafetyThresholdKm(Math.max(1.0, parseFloat(e.target.value) || 5.0))}
                className="w-14 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-emerald-400 text-center font-bold"
              />
              <span>km</span>
            </div>
          </div>
        </div>

        {/* Dedicated BEFORE vs AFTER Collision Avoidance Simulation Component (Section 2, 8, 9, 10, 11, 15, 17, 18, 19) */}
        <BeforeAfterComparisonPanel
          satelliteName={currentSatellite.name}
          primaryDebris={targetDebris}
          baselineConjunction={baselineConjunction}
          activeConjunction={activeConjunction}
          baselineRisk={baselineRisk}
          activeRisk={riskAssessment}
          appliedManeuver={appliedManeuver}
          optimizationResult={optimizationResult}
          onApplyManeuver={handleApplyManeuver}
          satelliteMassKg={satelliteMassKg}
          propulsionIsp={propulsionIsp}
        />

        {/* Workspace Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Column: Debris Catalog Monitor & Risk Deep-Dive (4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-5">
            <DebrisMonitorPanel
              primaryDebris={targetDebris}
              bgDebrisCatalog={bgDebrisCatalog}
              customDebrisList={customDebrisList}
              selectedDebrisId={selectedDebrisId}
              onSelectDebris={handleSelectDebris}
              onOpenAddModal={() => setIsAddDebrisModalOpen(true)}
              conjunction={activeConjunction}
              riskAssessment={riskAssessment}
              hasAppliedManeuver={!!appliedManeuver}
            />

            <RiskAssessmentCard
              conjunction={activeConjunction}
              riskAssessment={riskAssessment}
              hasAppliedManeuver={!!appliedManeuver}
            />
          </div>

          {/* Center/Right Column: 3D Orbit View & Controls & Avoidance Optimizer (8 cols) */}
          <div className="lg:col-span-8 flex flex-col gap-5">
            {/* Time Scrubber Controls */}
            <TimeControls
              simTimeSeconds={simTimeSeconds}
              isPlaying={isPlaying}
              playbackSpeed={playbackSpeed}
              tcaMinutes={baselineConjunction.tcaMinutes}
              onTogglePlay={() => setIsPlaying(!isPlaying)}
              onChangeSpeed={(s) => setPlaybackSpeed(s)}
              onResetTime={() => setSimTimeSeconds(0)}
              onStepForward={() => setSimTimeSeconds(prev => Math.min(5400, prev + 60))}
              onJumpToTCA={() => setSimTimeSeconds(baselineConjunction.tcaSeconds)}
            />

            {/* 3D Orbit Canvas View */}
            <div className="w-full h-[480px]">
              <SpaceMap3D
                satElem={currentSatellite.keplerian}
                debrisElem={targetDebris.keplerian}
                appliedManeuver={appliedManeuver}
                simTimeSeconds={simTimeSeconds}
                conjunction={activeConjunction}
                bgDebrisCatalog={[...customDebrisList, ...bgDebrisCatalog]}
                selectedDebrisId={selectedDebrisId}
                onSelectDebris={handleSelectDebris}
                cameraMode={cameraMode}
                threatLevel={riskAssessment.threatLevel}
              />
            </div>

            {/* Bottom Grid: Avoidance Optimizer Panel & Dual Charts */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              <AvoidanceOptimizerPanel
                optimizationResult={optimizationResult}
                appliedManeuver={appliedManeuver}
                onApplyManeuver={handleApplyManeuver}
                onCustomManeuver={handleCustomManeuver}
              />

              <div className="flex flex-col gap-4">
                <DistanceGraph
                  baselineTrajectory={baselineConjunction.trajectorySeries}
                  postManeuverTrajectory={appliedManeuver ? activeConjunction.trajectorySeries : null}
                  simTimeSeconds={simTimeSeconds}
                  tcaMinutes={baselineConjunction.tcaMinutes}
                  hasAppliedManeuver={!!appliedManeuver}
                  safeDistanceKm={safetyThresholdKm}
                />

                <ZoomedEncounterView
                  baselineConjunction={baselineConjunction}
                  activeConjunction={activeConjunction}
                  appliedManeuver={appliedManeuver}
                  safeDistanceKm={safetyThresholdKm}
                />

                {/* Generate Mission Report Certificate Button */}
                <button
                  onClick={() => setIsReportModalOpen(true)}
                  className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-400 font-mono font-bold text-xs flex items-center justify-center gap-2 shadow-xl transition-all hover:border-cyan-500/50"
                >
                  <FileText className="w-4 h-4" /> GENERATE MISSION CONJUNCTION & AVOIDANCE TELEMETRY CERTIFICATE
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Mission Telemetry Report Modal */}
      <MissionReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        scenario={{ ...activeScenario, satellite: currentSatellite, primaryDebris: targetDebris }}
        conjunction={activeConjunction}
        riskAssessment={riskAssessment}
        appliedManeuver={appliedManeuver}
        optimizationResult={optimizationResult}
      />

      {/* Add / Detect New Debris Modal */}
      <AddDebrisModal
        isOpen={isAddDebrisModalOpen}
        onClose={() => setIsAddDebrisModalOpen(false)}
        onAddDebris={handleAddDebris}
      />
    </div>
  );
}
