/**
 * Generates the standardized API JSON response matching the Master Prompt specification:
 *
 * {
 *   "status": "MANEUVER_REQUIRED" | "NOMINAL",
 *   "primary_debris": "DEB-48231",
 *   "original": {
 *     "tca": "...",
 *     "miss_distance_km": 0.120,
 *     "risk": "HIGH"
 *   },
 *   "recommended_maneuver": {
 *     "direction": "ALONG_TRACK",
 *     "delta_v_mps": 0.0284,
 *     "burn_time": "..."
 *   },
 *   "after_maneuver": {
 *     "miss_distance_km": 3.8,
 *     "risk": "LOW"
 *   },
 *   "secondary_conjunctions": {
 *     "status": "SAFE"
 *   }
 * }
 */
export function generateMasterApiPayload(
  satelliteName,
  primaryDebris,
  conjunction,
  riskAssessment,
  optimizationResult,
  appliedManeuver = null
) {
  if (!conjunction || !riskAssessment || !optimizationResult) {
    return { status: 'NO_DATA' };
  }

  const recManeuver = optimizationResult.recommendedManeuver;
  const isAlreadySafe = optimizationResult.isAlreadySafe;
  const nowIso = new Date().toISOString();
  const tcaIso = new Date(Date.now() + conjunction.tcaSeconds * 1000).toISOString();

  let burnTimeIso = 'N/A';
  if (recManeuver) {
    burnTimeIso = new Date(Date.now() + recManeuver.burnTimeSeconds * 1000).toISOString();
  }

  return {
    status: isAlreadySafe ? 'NOMINAL' : appliedManeuver ? 'MANEUVER_EXECUTED' : 'MANEUVER_REQUIRED',
    primary_debris: primaryDebris ? `${primaryDebris.name} (${primaryDebris.id})` : 'UNKNOWN',
    protected_satellite: satelliteName,
    epoch: nowIso,
    original: {
      tca: tcaIso,
      tca_minutes_remaining: parseFloat(conjunction.tcaMinutes.toFixed(2)),
      miss_distance_km: parseFloat(conjunction.missDistanceKm.toFixed(3)),
      relative_velocity_km_s: parseFloat(conjunction.relativeVelocityKmS.toFixed(3)),
      risk: riskAssessment.threatLevel?.name || 'NOMINAL',
      risk_score_100: riskAssessment.riskScore,
      probability_pc: riskAssessment.pcString
    },
    recommended_maneuver: recManeuver
      ? {
          direction: recManeuver.directionName,
          delta_v_mps: recManeuver.deltaVMag_ms,
          burn_time: burnTimeIso,
          lead_time_minutes: recManeuver.leadTimeMinutes,
          propellant_grams: recManeuver.propellantGrams,
          energy_rating: recManeuver.energyCostRating,
          thrust_vector_ric: recManeuver.deltaV_RIC_ms
        }
      : null,
    after_maneuver: recManeuver
      ? {
          miss_distance_km: recManeuver.resultingMissDistanceKm,
          risk: recManeuver.resultingThreatLevel?.name || 'NOMINAL',
          risk_score_100: recManeuver.resultingRiskScore
        }
      : {
          miss_distance_km: conjunction.missDistanceKm.toFixed(3),
          risk: riskAssessment.threatLevel?.name || 'NOMINAL',
          risk_score_100: riskAssessment.riskScore
        },
    secondary_conjunctions: {
      status: optimizationResult.rejectedCandidates?.length > 0 ? 'SECONDARY_HAZARDS_SCREENED' : 'SAFE',
      screened_candidates_count: optimizationResult.candidates?.length || 0,
      rejected_unsafe_burns_count: optimizationResult.rejectedCandidates?.length || 0
    }
  };
}
