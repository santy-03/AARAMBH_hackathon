import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EARTH_RADIUS_KM } from '../physics/constants.js';
import { keplerianToStateVectors, generateOrbitPathPoints } from '../physics/orbitEngine.js';
import { ZoomIn, ZoomOut, RotateCcw, Compass, Maximize2, Play, Pause, AlertTriangle } from 'lucide-react';

// Scaling factor for 3D visualization canvas: 1 unit = 1000 km
const SCALE = 1 / 1000;
const EARTH_RADIUS_3D = EARTH_RADIUS_KM * SCALE; // ~6.371 units

export default function SpaceMap3D({
  satElem,
  debrisElem,
  appliedManeuver,
  simTimeSeconds,
  conjunction,
  bgDebrisCatalog,
  selectedDebrisId,
  onSelectDebris,
  cameraMode,
  threatLevel
}) {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);

  // Mesh refs for dynamic animation
  const satMeshRef = useRef(null);
  const satBeaconRingRef = useRef(null);
  const satOrbitLineRef = useRef(null);
  const satPostOrbitLineRef = useRef(null);
  const debrisMeshRef = useRef(null);
  const debrisBeaconRingRef = useRef(null);
  const debrisOrbitLineRef = useRef(null);
  const hazardSphereRef = useRef(null);
  const bgParticlesRef = useRef(null);

  // Animated orbit motion particle refs
  const satPulseDotRef = useRef(null);
  const debrisPulseDotRef = useRef(null);

  const [autoRotate, setAutoRotate] = useState(false);

  // 1. Initialize Three.js Scene, Camera, Lighting, Controls
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x030712); // Deep space dark blue/black
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 600);
    camera.position.set(0, 10, 16);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, logarithmicDepthBuffer: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Orbit Controls - Easy Close Zooming!
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 1.2; // Allows zooming super close to satellite/debris!
    controls.maxDistance = 180;
    controlsRef.current = controls;

    // --- LIGHTING ---
    const ambientLight = new THREE.AmbientLight(0x475569, 1.4);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 2.8);
    sunLight.position.set(60, 30, 40);
    scene.add(sunLight);

    const cyanRimLight = new THREE.DirectionalLight(0x38bdf8, 1.2);
    cyanRimLight.position.set(-40, -20, -30);
    scene.add(cyanRimLight);

    // --- PROCEDURAL HIGH-CONTRAST EARTH SPHERE ---
    const earthCanvas = document.createElement('canvas');
    earthCanvas.width = 1024;
    earthCanvas.height = 512;
    const ctx = earthCanvas.getContext('2d');

    // Deep space ocean base
    ctx.fillStyle = '#061325';
    ctx.fillRect(0, 0, 1024, 512);

    // Stylized vector continent shapes with cyan borders for crisp HUD view
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;

    const drawLand = (x, y, r) => {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    };

    drawLand(250, 150, 95);  // North America
    drawLand(320, 320, 80);  // South America
    drawLand(530, 160, 65);  // Europe
    drawLand(550, 280, 90);  // Africa
    drawLand(750, 160, 115); // Asia
    drawLand(820, 340, 60);  // Australia

    // Grid lines lat/long
    ctx.strokeStyle = '#1d4ed8';
    ctx.lineWidth = 1;
    for (let x = 0; x <= 1024; x += 64) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 512); ctx.stroke();
    }
    for (let y = 0; y <= 512; y += 64) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1024, y); ctx.stroke();
    }

    const earthTexture = new THREE.CanvasTexture(earthCanvas);
    const earthGeo = new THREE.SphereGeometry(EARTH_RADIUS_3D, 64, 64);
    const earthMat = new THREE.MeshPhongMaterial({
      map: earthTexture,
      shininess: 30,
      specular: new THREE.Color(0x2563eb)
    });
    const earthMesh = new THREE.Mesh(earthGeo, earthMat);
    scene.add(earthMesh);

    // --- EARTH ATMOSPHERE GLOW RIM ---
    const atmosGeo = new THREE.SphereGeometry(EARTH_RADIUS_3D * 1.035, 48, 48);
    const atmosMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.65 - dot(vNormal, vec3(0, 0, 1.0)), 2.2);
          gl_FragColor = vec4(0.22, 0.74, 0.97, 1.0) * intensity * 1.3;
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true
    });
    const atmosMesh = new THREE.Mesh(atmosGeo, atmosMat);
    scene.add(atmosMesh);

    // --- STARFIELD BACKGROUND ---
    const starsGeo = new THREE.BufferGeometry();
    const starCount = 1400;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      starPositions[i] = (Math.random() - 0.5) * 400;
      starPositions[i + 1] = (Math.random() - 0.5) * 400;
      starPositions[i + 2] = (Math.random() - 0.5) * 400;
    }
    starsGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starsMat = new THREE.PointsMaterial({ color: 0xcbd5e1, size: 0.65, transparent: true, opacity: 0.85 });
    scene.add(new THREE.Points(starsGeo, starsMat));

    // --- PRIMARY SATELLITE 3D MESH & GLOW BEACON ---
    const satGroup = new THREE.Group();
    // Body box
    const bodyGeo = new THREE.BoxGeometry(0.3, 0.3, 0.45);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.9, roughness: 0.1 });
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    satGroup.add(bodyMesh);

    // Solar Wings
    const wingGeo = new THREE.BoxGeometry(1.2, 0.03, 0.28);
    const wingMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.95, roughness: 0.05 });
    const wingsMesh = new THREE.Mesh(wingGeo, wingMat);
    satGroup.add(wingsMesh);

    // Cyan Beacon Light
    const satBeacon = new THREE.PointLight(0x38bdf8, 3.0, 6);
    satGroup.add(satBeacon);

    // Glowing Cyan Beacon Ring sprite around Satellite for high visibility
    const ringGeo = new THREE.RingGeometry(0.5, 0.65, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0.8 });
    const beaconRing = new THREE.Mesh(ringGeo, ringMat);
    beaconRing.rotation.x = Math.PI / 2;
    satGroup.add(beaconRing);
    satBeaconRingRef.current = beaconRing;

    scene.add(satGroup);
    satMeshRef.current = satGroup;

    // Motion pulse dot on satellite orbit
    const dotGeo = new THREE.SphereGeometry(0.18, 16, 16);
    const dotMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const satPulseDot = new THREE.Mesh(dotGeo, dotMat);
    scene.add(satPulseDot);
    satPulseDotRef.current = satPulseDot;

    // --- TARGET DEBRIS 3D MESH & GLOW BEACON ---
    const debrisGroup = new THREE.Group();
    const debrisGeo = new THREE.IcosahedronGeometry(0.25, 0);
    const debrisMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xd97706,
      emissiveIntensity: 0.8,
      roughness: 0.3
    });
    const debrisMesh = new THREE.Mesh(debrisGeo, debrisMat);
    debrisGroup.add(debrisMesh);

    const debrisLight = new THREE.PointLight(0xef4444, 3.5, 6);
    debrisGroup.add(debrisLight);

    // Red Pulsing Ring around Debris
    const debRingGeo = new THREE.RingGeometry(0.45, 0.6, 32);
    const debRingMat = new THREE.MeshBasicMaterial({ color: 0xef4444, side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
    const debBeaconRing = new THREE.Mesh(debRingGeo, debRingMat);
    debBeaconRing.rotation.x = Math.PI / 2;
    debrisGroup.add(debBeaconRing);
    debrisBeaconRingRef.current = debBeaconRing;

    scene.add(debrisGroup);
    debrisMeshRef.current = debrisGroup;

    // Motion pulse dot on debris orbit
    const debDotMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const debrisPulseDot = new THREE.Mesh(dotGeo, debDotMat);
    scene.add(debrisPulseDot);
    debrisPulseDotRef.current = debrisPulseDot;

    // --- CONJUNCTION HAZARD ZONE SPHERE ---
    const hazardGeo = new THREE.SphereGeometry(0.55, 32, 32);
    const hazardMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      wireframe: true,
      transparent: true,
      opacity: 0.45
    });
    const hazardSphere = new THREE.Mesh(hazardGeo, hazardMat);
    scene.add(hazardSphere);
    hazardSphereRef.current = hazardSphere;

    // --- BACKGROUND DEBRIS PARTICLES ---
    if (bgDebrisCatalog && bgDebrisCatalog.length > 0) {
      const bgGeo = new THREE.BufferGeometry();
      const bgPositions = new Float32Array(bgDebrisCatalog.length * 3);
      bgDebrisCatalog.forEach((item, idx) => {
        const state = keplerianToStateVectors(item.keplerian, 0);
        bgPositions[idx * 3] = state.position[0] * SCALE;
        bgPositions[idx * 3 + 1] = state.position[1] * SCALE;
        bgPositions[idx * 3 + 2] = state.position[2] * SCALE;
      });
      bgGeo.setAttribute('position', new THREE.BufferAttribute(bgPositions, 3));
      const bgMat = new THREE.PointsMaterial({ color: 0x64748b, size: 0.3, transparent: true, opacity: 0.7 });
      const bgPoints = new THREE.Points(bgGeo, bgMat);
      scene.add(bgPoints);
      bgParticlesRef.current = bgPoints;
    }

    // --- RESIZE HANDLER ---
    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // --- ANIMATION LOOP ---
    let animId;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();

      if (autoRotate && controlsRef.current) {
        earthMesh.rotation.y += 0.003;
      } else {
        earthMesh.rotation.y += 0.0004;
      }

      // Pulse beacon rings
      if (satBeaconRingRef.current) {
        const p = 1 + Math.sin(Date.now() * 0.006) * 0.2;
        satBeaconRingRef.current.scale.set(p, p, p);
      }
      if (debrisBeaconRingRef.current) {
        const p = 1 + Math.cos(Date.now() * 0.008) * 0.25;
        debrisBeaconRingRef.current.scale.set(p, p, p);
      }
      if (hazardSphereRef.current) {
        const p = 1 + Math.sin(Date.now() * 0.005) * 0.15;
        hazardSphereRef.current.scale.set(p, p, p);
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      if (renderer.domElement) container.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, []);

  // 2. Update Orbit Path Lines (Thicker & Glowing)
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !satElem || !debrisElem) return;

    if (satOrbitLineRef.current) scene.remove(satOrbitLineRef.current);
    if (satPostOrbitLineRef.current) scene.remove(satPostOrbitLineRef.current);
    if (debrisOrbitLineRef.current) scene.remove(debrisOrbitLineRef.current);

    // Baseline Satellite Orbit (Cyan Line)
    const satPathPoints = generateOrbitPathPoints(satElem, 0, 120);
    const satVecs = satPathPoints.map(p => new THREE.Vector3(p.position[0] * SCALE, p.position[1] * SCALE, p.position[2] * SCALE));
    const satGeo = new THREE.BufferGeometry().setFromPoints(satVecs);
    const satMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 3 });
    const satLine = new THREE.LineLoop(satGeo, satMat);
    scene.add(satLine);
    satOrbitLineRef.current = satLine;

    // Target Debris Orbit (Red Line)
    const debrisPathPoints = generateOrbitPathPoints(debrisElem, 0, 120);
    const debrisVecs = debrisPathPoints.map(p => new THREE.Vector3(p.position[0] * SCALE, p.position[1] * SCALE, p.position[2] * SCALE));
    const debrisGeo = new THREE.BufferGeometry().setFromPoints(debrisVecs);
    const debrisMat = new THREE.LineDashedMaterial({ color: 0xef4444, dashSize: 0.5, gapSize: 0.2, linewidth: 3 });
    const debrisLine = new THREE.LineLoop(debrisGeo, debrisMat);
    debrisLine.computeLineDistances();
    scene.add(debrisLine);
    debrisOrbitLineRef.current = debrisLine;

    // Post-Maneuver Orbit (Neon Green) if applied
    if (appliedManeuver) {
      const postPoints = generateOrbitPathPoints(appliedManeuver.newKeplerianAtBurn, appliedManeuver.burnTimeSeconds, 120);
      const postVecs = postPoints.map(p => new THREE.Vector3(p.position[0] * SCALE, p.position[1] * SCALE, p.position[2] * SCALE));
      const postGeo = new THREE.BufferGeometry().setFromPoints(postVecs);
      const postMat = new THREE.LineBasicMaterial({ color: 0x10b981, linewidth: 4 });
      const postLine = new THREE.LineLoop(postGeo, postMat);
      scene.add(postLine);
      satPostOrbitLineRef.current = postLine;
    }
  }, [satElem, debrisElem, appliedManeuver]);

  // 3. Dynamic Position & Camera Updates
  useEffect(() => {
    if (!satElem || !debrisElem) return;

    let satState;
    if (appliedManeuver && simTimeSeconds >= appliedManeuver.burnTimeSeconds) {
      const dtPost = simTimeSeconds - appliedManeuver.burnTimeSeconds;
      satState = keplerianToStateVectors(appliedManeuver.newKeplerianAtBurn, dtPost);
    } else {
      satState = keplerianToStateVectors(satElem, simTimeSeconds);
    }

    if (satMeshRef.current) {
      const satPos = new THREE.Vector3(satState.position[0] * SCALE, satState.position[1] * SCALE, satState.position[2] * SCALE);
      satMeshRef.current.position.copy(satPos);
      if (satPulseDotRef.current) satPulseDotRef.current.position.copy(satPos);

      const vDir = new THREE.Vector3(satState.velocity[0], satState.velocity[1], satState.velocity[2]).normalize();
      satMeshRef.current.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), vDir);
    }

    const debrisState = keplerianToStateVectors(debrisElem, simTimeSeconds);
    if (debrisMeshRef.current) {
      const debPos = new THREE.Vector3(debrisState.position[0] * SCALE, debrisState.position[1] * SCALE, debrisState.position[2] * SCALE);
      debrisMeshRef.current.position.copy(debPos);
      if (debrisPulseDotRef.current) debrisPulseDotRef.current.position.copy(debPos);

      debrisMeshRef.current.rotation.x += 0.03;
      debrisMeshRef.current.rotation.y += 0.04;
    }

    // Hazard zone position at TCA
    if (hazardSphereRef.current && conjunction) {
      hazardSphereRef.current.position.set(
        conjunction.satTCAPosition[0] * SCALE,
        conjunction.satTCAPosition[1] * SCALE,
        conjunction.satTCAPosition[2] * SCALE
      );
      if (appliedManeuver) {
        hazardSphereRef.current.material.color.setHex(0x10b981);
      } else if (threatLevel?.name === 'CRITICAL') {
        hazardSphereRef.current.material.color.setHex(0xef4444);
      } else {
        hazardSphereRef.current.material.color.setHex(0xf59e0b);
      }
    }

    // Camera Mode adjustments & smooth focusing
    if (controlsRef.current && cameraRef.current) {
      if (cameraMode === 'SATELLITE' && satMeshRef.current) {
        controlsRef.current.target.copy(satMeshRef.current.position);
      } else if (cameraMode === 'DEBRIS' && debrisMeshRef.current) {
        controlsRef.current.target.copy(debrisMeshRef.current.position);
      } else if (cameraMode === 'HAZARD' && conjunction) {
        controlsRef.current.target.set(
          conjunction.satTCAPosition[0] * SCALE,
          conjunction.satTCAPosition[1] * SCALE,
          conjunction.satTCAPosition[2] * SCALE
        );
      } else if (cameraMode === 'EARTH') {
        controlsRef.current.target.set(0, 0, 0);
      }
    }
  }, [simTimeSeconds, satElem, debrisElem, appliedManeuver, conjunction, cameraMode, threatLevel]);

  // Zoom control helpers
  const handleZoomIn = () => {
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.multiplyScalar(0.75);
      controlsRef.current.update();
    }
  };

  const handleZoomOut = () => {
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.multiplyScalar(1.3);
      controlsRef.current.update();
    }
  };

  const handleResetCamera = () => {
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.set(0, 10, 16);
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
  };

  return (
    <div className="relative w-full h-full min-h-[440px] bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-2xl">
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Top Left Overlay HUD Badges */}
      <div className="absolute top-4 left-4 pointer-events-none flex flex-col gap-2 font-mono">
        <div className="bg-slate-900/90 backdrop-blur-md px-3.5 py-1.5 rounded-lg border border-slate-700 text-xs text-cyan-400 flex items-center gap-2 shadow-xl">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
          3D ORBITAL TRAJECTORY VIEW
        </div>
        {appliedManeuver && (
          <div className="bg-emerald-950/90 backdrop-blur-md px-3.5 py-1.5 rounded-lg border border-emerald-500 text-xs text-emerald-300 flex items-center gap-2 shadow-xl animate-pulse font-bold">
            <span>🚀 OPTIMIZED SAFE TRAJECTORY ACTIVE</span>
          </div>
        )}
      </div>

      {/* Top Right Quick Zoom & Controls Toolbar */}
      <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-700/80 shadow-2xl font-mono text-xs text-slate-300">
        <button
          onClick={handleZoomIn}
          className="p-2 rounded-lg hover:bg-cyan-600 hover:text-white transition-colors bg-slate-800 border border-slate-700 flex items-center gap-1 font-bold"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-2 rounded-lg hover:bg-cyan-600 hover:text-white transition-colors bg-slate-800 border border-slate-700 flex items-center gap-1 font-bold"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={handleResetCamera}
          className="p-2 rounded-lg hover:bg-slate-700 text-slate-300 transition-colors bg-slate-800 border border-slate-700 flex items-center gap-1"
          title="Reset Camera Center"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <button
          onClick={() => setAutoRotate(!autoRotate)}
          className={`px-2.5 py-1.5 rounded-lg font-bold transition-colors flex items-center gap-1 ${
            autoRotate ? 'bg-amber-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
          }`}
          title="Toggle Auto Orbit Rotation"
        >
          <Compass className="w-4 h-4" /> {autoRotate ? 'ORBIT ON' : 'ORBIT OFF'}
        </button>
      </div>

      {/* Bottom Target Camera Selection Toolbar */}
      <div className="absolute bottom-4 right-4 flex flex-wrap items-center gap-1.5 bg-slate-900/95 backdrop-blur-md p-1.5 rounded-xl border border-slate-700 shadow-2xl text-xs font-mono">
        <button
          onClick={() => onSelectDebris && onSelectDebris(null, 'EARTH')}
          className={`px-3 py-1.5 rounded-lg transition-colors font-bold ${
            cameraMode === 'EARTH' ? 'bg-cyan-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          🌍 EARTH
        </button>
        <button
          onClick={() => onSelectDebris && onSelectDebris(null, 'SATELLITE')}
          className={`px-3 py-1.5 rounded-lg transition-colors font-bold ${
            cameraMode === 'SATELLITE' ? 'bg-cyan-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          🛰️ SATELLITE
        </button>
        <button
          onClick={() => onSelectDebris && onSelectDebris(null, 'HAZARD')}
          className={`px-3 py-1.5 rounded-lg transition-colors font-bold ${
            cameraMode === 'HAZARD' ? 'bg-amber-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          ⚠️ HAZARD TCA
        </button>
        <button
          onClick={() => onSelectDebris && onSelectDebris(null, 'DEBRIS')}
          className={`px-3 py-1.5 rounded-lg transition-colors font-bold ${
            cameraMode === 'DEBRIS' ? 'bg-rose-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          ☄️ TARGET DEBRIS
        </button>
      </div>
    </div>
  );
}
