import { keplerianToStateVectors, getRICMatrix, extractOrbitalState } from './orbitEngine.js';

/**
 * Perform Conjunction Assessment between Satellite and Debris
 * Finds Time of Closest Approach (TCA), Minimum Distance, Relative Speed, and RIC Frame offsets.
 *
 * @param {Object} satElem - Satellite Keplerian elements
 * @param {Object} debrisElem - Debris Keplerian elements
 * @param {Number} searchWindowSeconds - Search window duration (default 5400s = 90 min)
 * @param {Object|null} maneuver - Optional applied maneuver object { burnTimeSeconds, newKeplerianAtBurn }
 */
export function calculateConjunction(satElem, debrisElem, searchWindowSeconds = 5400, maneuver = null) {
  const stepSize = 15; // 15-second initial grid scan
  const steps = Math.floor(searchWindowSeconds / stepSize);

  let minDist = Infinity;
  let tcaCoarse = 0;

  // Helper to evaluate satellite position at time t considering any maneuver
  function getSatState(t) {
    if (maneuver) {
      // Evaluate satellite on its new maneuvered orbital path for post-burn assessment
      const dtPostBurn = t - maneuver.burnTimeSeconds;
      return keplerianToStateVectors(maneuver.newKeplerianAtBurn, dtPostBurn);
    }
    return keplerianToStateVectors(satElem, t);
  }

  // 1. Coarse Grid Scan to locate local minimum
  for (let i = 0; i <= steps; i++) {
    const t = i * stepSize;
    const sState = getSatState(t);
    const dState = keplerianToStateVectors(debrisElem, t);

    const dx = dState.position[0] - sState.position[0];
    const dy = dState.position[1] - sState.position[1];
    const dz = dState.position[2] - sState.position[2];
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (dist < minDist) {
      minDist = dist;
      tcaCoarse = t;
    }
  }

  // 2. Refine TCA with Golden Section Search
  let tLow = Math.max(0, tcaCoarse - stepSize);
  let tHigh = Math.min(searchWindowSeconds, tcaCoarse + stepSize);
  const phi = (1 + Math.sqrt(5)) / 2;
  const resphi = 2 - phi;

  let t1 = tLow + resphi * (tHigh - tLow);
  let t2 = tHigh - resphi * (tHigh - tLow);

  function evalDistAt(t) {
    const s = getSatState(t);
    const d = keplerianToStateVectors(debrisElem, t);
    const dx = d.position[0] - s.position[0];
    const dy = d.position[1] - s.position[1];
    const dz = d.position[2] - s.position[2];
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  let f1 = evalDistAt(t1);
  let f2 = evalDistAt(t2);

  for (let iter = 0; iter < 25; iter++) {
    if (f1 < f2) {
      tHigh = t2;
      t2 = t1;
      f2 = f1;
      t1 = tLow + resphi * (tHigh - tLow);
      f1 = evalDistAt(t1);
    } else {
      tLow = t1;
      t1 = t2;
      f1 = f2;
      t2 = tHigh - resphi * (tHigh - tLow);
      f2 = evalDistAt(t2);
    }
    if (Math.abs(tHigh - tLow) < 0.01) break;
  }

  const tTCA = (tLow + tHigh) / 2;
  const satTCA = getSatState(tTCA);
  const debrisTCA = keplerianToStateVectors(debrisElem, tTCA);

  // Exact separation vector at TCA (Debris - Satellite)
  const deltaECI = [
    debrisTCA.position[0] - satTCA.position[0],
    debrisTCA.position[1] - satTCA.position[1],
    debrisTCA.position[2] - satTCA.position[2]
  ];
  const missDistanceKm = Math.sqrt(deltaECI[0] ** 2 + deltaECI[1] ** 2 + deltaECI[2] ** 2);

  // Relative Velocity vector at TCA (Debris - Satellite)
  const relVECI = [
    debrisTCA.velocity[0] - satTCA.velocity[0],
    debrisTCA.velocity[1] - satTCA.velocity[1],
    debrisTCA.velocity[2] - satTCA.velocity[2]
  ];
  const relativeVelocityKmS = Math.sqrt(relVECI[0] ** 2 + relVECI[1] ** 2 + relVECI[2] ** 2);

  // Project separation into Satellite RIC frame at TCA
  const { R, I, C } = getRICMatrix(satTCA.position, satTCA.velocity);
  const radialKm = R[0] * deltaECI[0] + R[1] * deltaECI[1] + R[2] * deltaECI[2];
  const intrackKm = I[0] * deltaECI[0] + I[1] * deltaECI[1] + I[2] * deltaECI[2];
  const crosstrackKm = C[0] * deltaECI[0] + C[1] * deltaECI[1] + C[2] * deltaECI[2];

  // Full extracted physical orbital states at TCA
  const satOrbitalState = extractOrbitalState(satTCA.position, satTCA.velocity);
  const debrisOrbitalState = extractOrbitalState(debrisTCA.position, debrisTCA.velocity);

  // Sample distance curve d(t) for chart visualization (e.g. 60 time points around TCA)
  const trajectorySeries = [];
  const startT = Math.max(0, tTCA - 1200);
  const endT = Math.min(searchWindowSeconds, tTCA + 1200);
  const seriesStep = (endT - startT) / 50;

  for (let t = startT; t <= endT; t += seriesStep) {
    const s = getSatState(t);
    const d = keplerianToStateVectors(debrisElem, t);
    const dist = Math.sqrt(
      (d.position[0] - s.position[0]) ** 2 +
      (d.position[1] - s.position[1]) ** 2 +
      (d.position[2] - s.position[2]) ** 2
    );
    trajectorySeries.push({
      timeMin: t / 60,
      distKm: dist
    });
  }

  return {
    tcaSeconds: tTCA,
    tcaMinutes: tTCA / 60,
    missDistanceKm,
    relativeVelocityKmS,
    relativeVelocityMs: relativeVelocityKmS * 1000,
    satTCAPosition: satTCA.position,
    satTCAVelocity: satTCA.velocity,
    debrisTCAPosition: debrisTCA.position,
    debrisTCAVelocity: debrisTCA.velocity,
    satOrbitalState,
    debrisOrbitalState,
    ricOffsetKm: { radial: radialKm, intrack: intrackKm, crosstrack: crosstrackKm },
    trajectorySeries
  };
}
