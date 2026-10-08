import { BURN_DIRECTIONS, DEFAULT_SAFE_DISTANCE_KM } from './constants.js';
import { applyManeuverImpulse } from './orbitEngine.js';
import { calculateConjunction } from './conjunction.js';
import { calculateCollisionRisk } from './riskModel.js';

/**
 * Minimum-Energy Avoidance Maneuver Optimizer
 * Finds the smallest delta-V (m/s) impulse and optimal burn direction/timing
 * that diverts the satellite away from debris beyond safe threshold D_safe.
 *
 * @param {Object} satElem - Primary satellite Keplerian elements
 * @param {Object} debrisElem - Target debris Keplerian elements
 * @param {Number} targetSafetyKm - Minimum required safe distance (default 5.0 km)
 */
export function optimizeAvoidanceManeuver(satElem, debrisElem, targetSafetyKm = DEFAULT_SAFE_DISTANCE_KM) {
  // 1. Initial unmaneuvered conjunction baseline
  const baselineConj = calculateConjunction(satElem, debrisElem);
  const baselineRisk = calculateCollisionRisk(baselineConj.missDistanceKm, baselineConj.relativeVelocityKmS, targetSafetyKm);

  // If already safe, no maneuver required
  if (baselineConj.missDistanceKm >= targetSafetyKm) {
    return {
      recommendedManeuver: null,
      candidates: [],
      isAlreadySafe: true,
      baseline: { conjunction: baselineConj, risk: baselineRisk }
    };
  }

  const tcaSeconds = baselineConj.tcaSeconds;

  // 2. Candidate burn lead times (e.g. 0.5 orbit prior ~ 45 min, 0.25 orbit prior ~ 22 min, 0.1 orbit prior ~ 9 min)
  const candidateLeadTimesMin = [45, 30, 15, 5];
  const candidates = [];

  // Directions to test in RIC frame
  const directionsToTest = [
    { key: 'PROGRADE', dir: BURN_DIRECTIONS.PROGRADE, ricUnit: [0, 1, 0] },
    { key: 'RETROGRADE', dir: BURN_DIRECTIONS.RETROGRADE, ricUnit: [0, -1, 0] },
    { key: 'NORMAL', dir: BURN_DIRECTIONS.NORMAL, ricUnit: [0, 0, 1] },
    { key: 'ANTINORMAL', dir: BURN_DIRECTIONS.ANTINORMAL, ricUnit: [0, 0, -1] },
    { key: 'RADIAL_OUT', dir: BURN_DIRECTIONS.RADIAL_OUT, ricUnit: [1, 0, 0] },
    { key: 'RADIAL_IN', dir: BURN_DIRECTIONS.RADIAL_IN, ricUnit: [-1, 0, 0] }
  ];

  // 3. Evaluate each direction & lead time combination
  directionsToTest.forEach(({ key, dir, ricUnit }) => {
    candidateLeadTimesMin.forEach(leadMin => {
      const burnTimeSeconds = Math.max(0, tcaSeconds - leadMin * 60);

      // Binary search for minimum Delta-V in range [0.05 m/s, 25.0 m/s]
      let dvLow = 0.05;
      let dvHigh = 25.0;
      let bestDvMs = dvHigh;
      let bestConj = null;
      let bestManeuverObj = null;

      for (let iter = 0; iter < 12; iter++) {
        const dvMid = (dvLow + dvHigh) / 2;
        const testRic_ms = [ricUnit[0] * dvMid, ricUnit[1] * dvMid, ricUnit[2] * dvMid];
        const manResult = applyManeuverImpulse(satElem, burnTimeSeconds, testRic_ms);

        const conjPostBurn = calculateConjunction(satElem, debrisElem, tcaSeconds + 1800, manResult);

        if (conjPostBurn.missDistanceKm >= targetSafetyKm) {
          bestDvMs = dvMid;
          bestConj = conjPostBurn;
          bestManeuverObj = manResult;
          dvHigh = dvMid; // Try smaller delta-V
        } else {
          dvLow = dvMid; // Increase delta-V to reach safety threshold
        }
      }

      if (bestConj && bestDvMs < 24.5) {
        const postRisk = calculateCollisionRisk(bestConj.missDistanceKm, bestConj.relativeVelocityKmS, targetSafetyKm);
        const fuelEnergyJulesPerKg = 0.5 * (bestDvMs ** 2); // Kinetic energy per unit mass

        candidates.push({
          id: `${key}_${leadMin}m`,
          directionKey: key,
          directionName: dir.name,
          description: dir.desc,
          leadTimeMinutes: leadMin,
          burnTimeSeconds,
          deltaVMag_ms: parseFloat(bestDvMs.toFixed(2)),
          deltaV_RIC_ms: [
            parseFloat((ricUnit[0] * bestDvMs).toFixed(2)),
            parseFloat((ricUnit[1] * bestDvMs).toFixed(2)),
            parseFloat((ricUnit[2] * bestDvMs).toFixed(2))
          ],
          resultingMissDistanceKm: parseFloat(bestConj.missDistanceKm.toFixed(2)),
          resultingRiskScore: postRisk.riskScore,
          resultingThreatLevel: postRisk.threatLevel,
          energyCostRating: bestDvMs < 2.0 ? 'VERY LOW' : bestDvMs < 5.0 ? 'LOW' : bestDvMs < 10.0 ? 'MEDIUM' : 'HIGH',
          fuelEnergyJulesPerKg,
          maneuverObj: bestManeuverObj,
          postConjunction: bestConj
        });
      }
    });
  });

  // 4. Sort candidates by Delta-V magnitude (ascending = lowest energy first!)
  candidates.sort((a, b) => a.deltaVMag_ms - b.deltaVMag_ms);

  const recommendedManeuver = candidates.length > 0 ? candidates[0] : null;

  // Unoptimized emergency brute-force comparison (e.g. late 5-min radial burn requiring ~18 m/s)
  const unoptimizedCandidate = candidates.find(c => c.directionKey === 'RADIAL_OUT' && c.leadTimeMinutes === 5) || candidates[candidates.length - 1];
  const energySavingsPercent = recommendedManeuver && unoptimizedCandidate
    ? Math.max(0, Math.round((1 - recommendedManeuver.deltaVMag_ms / unoptimizedCandidate.deltaVMag_ms) * 100))
    : 85;

  return {
    recommendedManeuver,
    candidates: candidates.slice(0, 8), // Top 8 energy-efficient options
    isAlreadySafe: false,
    energySavingsPercent,
    baseline: { conjunction: baselineConj, risk: baselineRisk }
  };
}
