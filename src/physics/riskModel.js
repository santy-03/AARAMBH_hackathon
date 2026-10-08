import { DEFAULT_SAFE_DISTANCE_KM, THREAT_LEVELS } from './constants.js';

/**
 * Calculate Collision Risk Score, Probability of Collision (Pc), and Threat Level
 *
 * @param {Number} missDistanceKm - Calculated closest approach distance (km)
 * @param {Number} relativeVelocityKmS - Relative velocity at TCA (km/s)
 * @param {Number} safeThresholdKm - Minimum safe distance threshold (km)
 * @param {Number} positionUncertaintyKm - Covariance position error 1-sigma (km)
 */
export function calculateCollisionRisk(
  missDistanceKm,
  relativeVelocityKmS,
  safeThresholdKm = DEFAULT_SAFE_DISTANCE_KM,
  positionUncertaintyKm = 1.0
) {
  // 1. Calculate Probability of Collision (Pc) using 2D covariance projection
  // Hard sphere radius in km (Combined satellite 15m + debris 10m = 25m = 0.025 km)
  const hardSphereRadiusKm = 0.025;

  // Approximate 2D Gaussian integral for Pc in encounter plane
  const sigmaSquared = positionUncertaintyKm * positionUncertaintyKm;
  const distSquared = missDistanceKm * missDistanceKm;

  // Akella & Clemente 2D Max Pc formulation estimate
  let probabilityOfCollision = (hardSphereRadiusKm ** 2 / (2 * sigmaSquared)) * Math.exp(-distSquared / (2 * sigmaSquared));
  probabilityOfCollision = Math.min(0.999, Math.max(1e-8, probabilityOfCollision));

  // Format Pc in scientific notation string
  const pcString = probabilityOfCollision > 1e-4
    ? (probabilityOfCollision * 100).toFixed(2) + '%'
    : probabilityOfCollision.toExponential(2);

  // 2. Risk Score calculation (0 to 100 scale)
  // Exponential decay with distance relative to safety threshold
  let baseScore = 100 * Math.exp(-1.2 * (missDistanceKm / safeThresholdKm));

  // Velocity kinetic energy multiplier (higher relative speed increases destruction severity)
  const velFactor = Math.min(1.4, Math.max(0.8, relativeVelocityKmS / 7.5));
  let finalRiskScore = Math.round(baseScore * velFactor);

  // Hard clamp bounds based on absolute distance thresholds
  if (missDistanceKm < 0.8) {
    finalRiskScore = Math.max(85, finalRiskScore);
  } else if (missDistanceKm > safeThresholdKm * 2) {
    finalRiskScore = Math.min(15, finalRiskScore);
  }

  finalRiskScore = Math.min(99, Math.max(1, finalRiskScore));

  // 3. Determine Threat Level Tier
  let threatLevel = THREAT_LEVELS.NOMINAL;
  if (finalRiskScore >= THREAT_LEVELS.CRITICAL.minRisk) {
    threatLevel = THREAT_LEVELS.CRITICAL;
  } else if (finalRiskScore >= THREAT_LEVELS.WARNING.minRisk) {
    threatLevel = THREAT_LEVELS.WARNING;
  } else if (finalRiskScore >= THREAT_LEVELS.MONITOR.minRisk) {
    threatLevel = THREAT_LEVELS.MONITOR;
  }

  return {
    riskScore: finalRiskScore,
    probabilityOfCollision,
    pcString,
    collisionProbabilityScientific: pcString,
    threatLevel,
    isUnsafe: missDistanceKm < safeThresholdKm,
    kineticEnergyScore: (0.5 * (relativeVelocityKmS * 1000) ** 2 / 1e6).toFixed(1) // MJ/kg equivalent
  };
}
