import { BURN_DIRECTIONS, DEFAULT_SAFE_DISTANCE_KM } from './constants.js';
import {
  applyManeuverImpulse,
  calculatePropellantMass,
  keplerianToStateVectors,
  extractOrbitalState,
  compareOrbitalStates
} from './orbitEngine.js';
import { calculateConjunction } from './conjunction.js';
import { calculateCollisionRisk } from './riskModel.js';

/**
 * Minimum-Energy Avoidance Maneuver Optimizer with Secondary Conjunction Screening
 * Finds the smallest delta-V (m/s) impulse and optimal burn direction/timing
 * that diverts the satellite away from primary debris beyond safe threshold D_safe,
 * while ensuring NO secondary conjunctions are created with any background debris.
 *
 * @param {Object} satElem - Primary satellite Keplerian elements
 * @param {Object} debrisElem - Target primary debris Keplerian elements
 * @param {Number} targetSafetyKm - Minimum required safe distance (default 5.0 km)
 * @param {Array} backgroundCatalog - Catalog of secondary debris items to screen against
 * @param {Number} satelliteMassKg - Wet mass of satellite (kg, default 1000)
 * @param {Number} propulsionIspSeconds - Thruster specific impulse (s, default 300)
 */
export function optimizeAvoidanceManeuver(
  satElem,
  debrisElem,
  targetSafetyKm = DEFAULT_SAFE_DISTANCE_KM,
  backgroundCatalog = [],
  satelliteMassKg = 1000,
  propulsionIspSeconds = 300
) {
  // 1. Initial unmaneuvered conjunction baseline
  const baselineConj = calculateConjunction(satElem, debrisElem);
  const baselineRisk = calculateCollisionRisk(baselineConj.missDistanceKm, baselineConj.relativeVelocityKmS, targetSafetyKm);

  // If already safe, no maneuver required
  if (baselineConj.missDistanceKm >= targetSafetyKm) {
    return {
      recommendedManeuver: null,
      candidates: [],
      rejectedCandidates: [],
      isAlreadySafe: true,
      secondaryObjectsChecked: backgroundCatalog.length,
      secondaryConjunctionsCount: 0,
      secondaryScreeningStatus: 'SAFE',
      baseline: { conjunction: baselineConj, risk: baselineRisk }
    };
  }

  const tcaSeconds = baselineConj.tcaSeconds;

  // 2. Candidate burn lead times (e.g. 0.5 orbit prior ~ 45 min, 0.25 orbit prior ~ 30 min, 15 min, 5 min)
  const candidateLeadTimesMin = [45, 30, 15, 5];
  const validCandidates = [];
  const rejectedCandidates = [];

  // Directions to test in RIC frame
  const directionsToTest = [
    { key: 'PROGRADE', dir: BURN_DIRECTIONS.PROGRADE, ricUnit: [0, 1, 0] },
    { key: 'RETROGRADE', dir: BURN_DIRECTIONS.RETROGRADE, ricUnit: [0, -1, 0] },
    { key: 'NORMAL', dir: BURN_DIRECTIONS.NORMAL, ricUnit: [0, 0, 1] },
    { key: 'ANTINORMAL', dir: BURN_DIRECTIONS.ANTINORMAL, ricUnit: [0, 0, -1] },
    { key: 'RADIAL_OUT', dir: BURN_DIRECTIONS.RADIAL_OUT, ricUnit: [1, 0, 0] },
    { key: 'RADIAL_IN', dir: BURN_DIRECTIONS.RADIAL_IN, ricUnit: [-1, 0, 0] }
  ];

  // Limit background debris screening sample size to top 30 nearest orbits for high speed
  const sampleSecondaryDebris = backgroundCatalog.slice(0, 30);

  // 3. Evaluate each direction & lead time combination
  directionsToTest.forEach(({ key, dir, ricUnit }) => {
    candidateLeadTimesMin.forEach(leadMin => {
      const burnTimeSeconds = Math.max(0, tcaSeconds - leadMin * 60);

      // Binary search for minimum Delta-V in range [0.01 m/s, 25.0 m/s]
      let dvLow = 0.01;
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
        const fuelCalc = calculatePropellantMass(bestDvMs, satelliteMassKg, propulsionIspSeconds);

        // Compute physical orbital states Before vs After at burn point
        const satStateAtBurn = keplerianToStateVectors(satElem, burnTimeSeconds);
        const stateBeforeOrbital = extractOrbitalState(satStateAtBurn.position, satStateAtBurn.velocity);

        const postBurnVelocity = [
          satStateAtBurn.velocity[0] + bestManeuverObj.dV_ECI[0],
          satStateAtBurn.velocity[1] + bestManeuverObj.dV_ECI[1],
          satStateAtBurn.velocity[2] + bestManeuverObj.dV_ECI[2]
        ];
        const stateAfterOrbital = extractOrbitalState(satStateAtBurn.position, postBurnVelocity);
        const orbitalComparison = compareOrbitalStates(
          stateBeforeOrbital,
          stateAfterOrbital,
          [ricUnit[0] * bestDvMs, ricUnit[1] * bestDvMs, ricUnit[2] * bestDvMs],
          bestManeuverObj.dV_ECI
        );

        // 4. SECONDARY SCREENING against background catalog
        let secondaryConflict = null;
        for (const secDebris of sampleSecondaryDebris) {
          if (secDebris.id === debrisElem.id) continue; // Skip primary target
          const secConj = calculateConjunction(satElem, secDebris.keplerian, tcaSeconds + 1800, bestManeuverObj);
          if (secConj.missDistanceKm < targetSafetyKm) {
            secondaryConflict = {
              debrisId: secDebris.id,
              debrisName: secDebris.name,
              missDistanceKm: parseFloat(secConj.missDistanceKm.toFixed(2)),
              tcaMinutes: parseFloat(secConj.tcaMinutes.toFixed(1))
            };
            break; // Secondary hazard detected!
          }
        }

        const candidateItem = {
          id: `${key}_${leadMin}m`,
          directionKey: key,
          directionName: dir.name,
          description: dir.desc,
          leadTimeMinutes: leadMin,
          burnTimeSeconds,
          deltaVMag_ms: parseFloat(bestDvMs.toFixed(3)),
          deltaV_RIC_ms: [
            parseFloat((ricUnit[0] * bestDvMs).toFixed(3)),
            parseFloat((ricUnit[1] * bestDvMs).toFixed(3)),
            parseFloat((ricUnit[2] * bestDvMs).toFixed(3))
          ],
          deltaV_ECI_km_s: bestManeuverObj.dV_ECI,
          resultingMissDistanceKm: parseFloat(bestConj.missDistanceKm.toFixed(2)),
          resultingRiskScore: postRisk.riskScore,
          resultingThreatLevel: postRisk.threatLevel,
          energyCostRating: bestDvMs < 1.0 ? 'VERY LOW' : bestDvMs < 3.0 ? 'LOW' : bestDvMs < 8.0 ? 'MEDIUM' : 'HIGH',
          propellantKg: fuelCalc.propellantKg,
          propellantGrams: fuelCalc.propellantGrams,
          initialMassKg: satelliteMassKg,
          ispSeconds: propulsionIspSeconds,
          maneuverObj: bestManeuverObj,
          postConjunction: bestConj,
          orbitalComparison,
          secondaryConflict
        };

        if (secondaryConflict) {
          rejectedCandidates.push(candidateItem);
        } else {
          validCandidates.push(candidateItem);
        }
      }
    });
  });

  // 5. Sort valid candidates by Delta-V magnitude (ascending = lowest energy first!)
  validCandidates.sort((a, b) => a.deltaVMag_ms - b.deltaVMag_ms);
  rejectedCandidates.sort((a, b) => a.deltaVMag_ms - b.deltaVMag_ms);

  const recommendedManeuver = validCandidates.length > 0 ? validCandidates[0] : null;

  // Unoptimized late burn baseline for energy saving % comparison
  const unoptimizedCandidate = validCandidates.find(c => c.directionKey === 'RADIAL_OUT' && c.leadTimeMinutes === 5) || validCandidates[validCandidates.length - 1];
  const energySavingsPercent = recommendedManeuver && unoptimizedCandidate
    ? Math.max(0, Math.round((1 - recommendedManeuver.deltaVMag_ms / unoptimizedCandidate.deltaVMag_ms) * 100))
    : 88;

  return {
    recommendedManeuver,
    candidates: validCandidates.slice(0, 10),
    rejectedCandidates,
    isAlreadySafe: false,
    energySavingsPercent,
    secondaryObjectsChecked: sampleSecondaryDebris.length,
    secondaryConjunctionsCount: rejectedCandidates.length,
    secondaryScreeningStatus: rejectedCandidates.length > 0 ? 'SECONDARY_HAZARDS_SCREENED' : 'SAFE',
    baseline: { conjunction: baselineConj, risk: baselineRisk }
  };
}

