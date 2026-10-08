import { MU_EARTH, EARTH_RADIUS_KM, J2_EARTH } from './constants.js';

/**
 * Solve Kepler's equation M = E - e * sin(E) using Newton-Raphson method
 */
export function solveKepler(M, e) {
  // Normalize M to [0, 2pi]
  let mNorm = M % (2 * Math.PI);
  if (mNorm < 0) mNorm += 2 * Math.PI;

  let E = mNorm;
  for (let iter = 0; iter < 15; iter++) {
    const f = E - e * Math.sin(E) - mNorm;
    const fPrime = 1 - e * Math.cos(E);
    const dE = f / fPrime;
    E -= dE;
    if (Math.abs(dE) < 1e-8) break;
  }
  return E;
}

/**
 * Convert Keplerian Elements to State Vectors (ECI position & velocity) at elapsed time dt (seconds)
 * Keplerian elements object: { a, e, i, raan, argPer, meanAnomaly } (angles in radians)
 */
export function keplerianToStateVectors(elem, dtSeconds = 0) {
  const { a, e, i, raan: raan0, argPer: argPer0, meanAnomaly: M0 } = elem;

  // Mean motion
  const n = Math.sqrt(MU_EARTH / (a * a * a));

  // J2 perturbations
  const p = a * (1 - e * e);
  const reOverP = EARTH_RADIUS_KM / p;
  const cosI = Math.cos(i);

  const raanDot = -1.5 * J2_EARTH * reOverP * reOverP * n * cosI;
  const argPerDot = 0.75 * J2_EARTH * reOverP * reOverP * n * (5 * cosI * cosI - 1);

  // Propagate angles to time t = dtSeconds
  const raan = raan0 + raanDot * dtSeconds;
  const argPer = argPer0 + argPerDot * dtSeconds;
  const M = M0 + n * dtSeconds;

  // Solve Kepler equation for Eccentric Anomaly E
  const E = solveKepler(M, e);

  // True Anomaly nu
  const sinE2 = Math.sin(E / 2);
  const cosE2 = Math.cos(E / 2);
  const nu = 2 * Math.atan2(Math.sqrt(1 + e) * sinE2, Math.sqrt(1 - e) * cosE2);

  // Distance r
  const r = a * (1 - e * Math.cos(E));

  // Position and velocity in orbital plane
  const cosNu = Math.cos(nu);
  const sinNu = Math.sin(nu);

  const rOrb = [r * cosNu, r * sinNu, 0];
  const vOrbFactor = Math.sqrt(MU_EARTH / p);
  const vOrb = [-vOrbFactor * sinNu, vOrbFactor * (e + cosNu), 0];

  // Rotation matrix from Orbital Plane to ECI (R_z(-raan) * R_x(-i) * R_z(-argPer))
  const cosRaan = Math.cos(raan);
  const sinRaan = Math.sin(raan);
  const cosInc = Math.cos(i);
  const sinInc = Math.sin(i);
  const cosAp = Math.cos(argPer);
  const sinAp = Math.sin(argPer);

  const P11 = cosRaan * cosAp - sinRaan * sinAp * cosInc;
  const P12 = -cosRaan * sinAp - sinRaan * cosAp * cosInc;
  const P21 = sinRaan * cosAp + cosRaan * sinAp * cosInc;
  const P22 = -sinRaan * sinAp + cosRaan * cosAp * cosInc;
  const P31 = sinAp * sinInc;
  const P32 = cosAp * sinInc;

  const rECI = [
    P11 * rOrb[0] + P12 * rOrb[1],
    P21 * rOrb[0] + P22 * rOrb[1],
    P31 * rOrb[0] + P32 * rOrb[1]
  ];

  const vECI = [
    P11 * vOrb[0] + P12 * vOrb[1],
    P21 * vOrb[0] + P22 * vOrb[1],
    P31 * vOrb[0] + P32 * vOrb[1]
  ];

  return { position: rECI, velocity: vECI, nu, r, raan, argPer, M };
}

/**
 * Convert ECI State Vectors (r, v) back to Keplerian Elements
 */
export function stateVectorsToKeplerian(rECI, vECI) {
  const rx = rECI[0], ry = rECI[1], rz = rECI[2];
  const vx = vECI[0], vy = vECI[1], vz = vECI[2];

  const rMag = Math.sqrt(rx * rx + ry * ry + rz * rz);
  const vMag = Math.sqrt(vx * vx + vy * vy + vz * vz);

  // Specific angular momentum h = r x v
  const hx = ry * vz - rz * vy;
  const hy = rz * vx - rx * vz;
  const hz = rx * vy - ry * vx;
  const hMag = Math.sqrt(hx * hx + hy * hy + hz * hz);

  // Inclination
  const i = Math.acos(hz / hMag);

  // Node vector n = k x h
  const nx = -hy;
  const ny = hx;
  const nMag = Math.sqrt(nx * nx + ny * ny);

  // RAAN
  let raan = 0;
  if (nMag !== 0) {
    raan = Math.acos(nx / nMag);
    if (ny < 0) raan = 2 * Math.PI - raan;
  }

  // Eccentricity vector e = ((v^2 - mu/r)r - (r.v)v) / mu
  const rDotV = rx * vx + ry * vy + rz * vz;
  const ex = ((vMag * vMag - MU_EARTH / rMag) * rx - rDotV * vx) / MU_EARTH;
  const ey = ((vMag * vMag - MU_EARTH / rMag) * ry - rDotV * vy) / MU_EARTH;
  const ez = ((vMag * vMag - MU_EARTH / rMag) * rz - rDotV * vz) / MU_EARTH;
  const e = Math.sqrt(ex * ex + ey * ey + ez * ez);

  // Semi-major axis a
  const energy = vMag * vMag / 2 - MU_EARTH / rMag;
  const a = -MU_EARTH / (2 * energy);

  // Argument of Periapsis argPer
  let argPer = 0;
  if (nMag !== 0 && e > 1e-6) {
    const nDotE = nx * ex + ny * ey;
    argPer = Math.acos(Math.max(-1, Math.min(1, nDotE / (nMag * e))));
    if (ez < 0) argPer = 2 * Math.PI - argPer;
  }

  // True Anomaly nu
  let nu = 0;
  if (e > 1e-6) {
    const eDotR = ex * rx + ey * ry + ez * rz;
    nu = Math.acos(Math.max(-1, Math.min(1, eDotR / (e * rMag))));
    if (rDotV < 0) nu = 2 * Math.PI - nu;
  } else {
    // Circular orbit fallback
    nu = Math.atan2(ry, rx);
  }

  // Eccentric anomaly E & Mean anomaly M
  const sinE = (Math.sqrt(1 - e * e) * Math.sin(nu)) / (1 + e * Math.cos(nu));
  const cosE = (e + Math.cos(nu)) / (1 + e * Math.cos(nu));
  const E = Math.atan2(sinE, cosE);
  let M = E - e * Math.sin(E);
  if (M < 0) M += 2 * Math.PI;

  return { a, e, i, raan, argPer, meanAnomaly: M, trueAnomaly: nu };
}

/**
 * Calculate RIC (Radial, In-track, Cross-track) rotation matrix from state vectors
 */
export function getRICMatrix(rECI, vECI) {
  const rMag = Math.sqrt(rECI[0] ** 2 + rECI[1] ** 2 + rECI[2] ** 2);
  const R = [rECI[0] / rMag, rECI[1] / rMag, rECI[2] / rMag]; // Radial

  // Cross-track C = (r x v) / |r x v|
  const cx = rECI[1] * vECI[2] - rECI[2] * vECI[1];
  const cy = rECI[2] * vECI[0] - rECI[0] * vECI[2];
  const cz = rECI[0] * vECI[1] - rECI[1] * vECI[0];
  const cMag = Math.sqrt(cx * cx + cy * cy + cz * cz);
  const C = [cx / cMag, cy / cMag, cz / cMag];

  // In-track I = C x R
  const ix = C[1] * R[2] - C[2] * R[1];
  const iy = C[2] * R[0] - C[0] * R[2];
  const iz = C[0] * R[1] - C[1] * R[0];
  const I = [ix, iy, iz];

  // Columns are R, I, C
  return { R, I, C };
}

/**
 * Apply impulse Delta-V (in m/s) in RIC frame to an existing state vector or Keplerian element set
 * deltaV_RIC = [dV_radial, dV_intrack, dV_crosstrack] in meters/second
 */
export function applyManeuverImpulse(keplerianElem, burnTimeSeconds, deltaV_RIC_ms) {
  // Propagate to burn time
  const stateAtBurn = keplerianToStateVectors(keplerianElem, burnTimeSeconds);
  const { R, I, C } = getRICMatrix(stateAtBurn.position, stateAtBurn.velocity);

  // Convert m/s to km/s
  const dV_km_s = [
    deltaV_RIC_ms[0] / 1000,
    deltaV_RIC_ms[1] / 1000,
    deltaV_RIC_ms[2] / 1000
  ];

  // Transform deltaV from RIC frame to ECI frame
  const dV_ECI = [
    R[0] * dV_km_s[0] + I[0] * dV_km_s[1] + C[0] * dV_km_s[2],
    R[1] * dV_km_s[0] + I[1] * dV_km_s[1] + C[1] * dV_km_s[2],
    R[2] * dV_km_s[0] + I[2] * dV_km_s[1] + C[2] * dV_km_s[2]
  ];

  // New post-burn velocity in ECI
  const newV_ECI = [
    stateAtBurn.velocity[0] + dV_ECI[0],
    stateAtBurn.velocity[1] + dV_ECI[1],
    stateAtBurn.velocity[2] + dV_ECI[2]
  ];

  // Convert new ECI state vector back to Keplerian elements defined at burn time
  const newKeplerianAtBurn = stateVectorsToKeplerian(stateAtBurn.position, newV_ECI);

  return {
    newKeplerianAtBurn,
    burnTimeSeconds,
    dV_ECI,
    dV_RIC_ms,
    deltaVMag_ms: Math.sqrt(deltaV_RIC_ms[0] ** 2 + deltaV_RIC_ms[1] ** 2 + deltaV_RIC_ms[2] ** 2)
  };
}

/**
 * Generate discrete points along orbit path for visualization (0 to 2pi true anomaly)
 */
export function generateOrbitPathPoints(keplerianElem, tBaseSeconds = 0, numPoints = 120) {
  const points = [];
  const state0 = keplerianToStateVectors(keplerianElem, tBaseSeconds);
  const period = 2 * Math.PI * Math.sqrt(keplerianElem.a ** 3 / MU_EARTH);
  const dtStep = period / numPoints;

  for (let k = 0; k <= numPoints; k++) {
    const t = tBaseSeconds + k * dtStep;
    const state = keplerianToStateVectors(keplerianElem, t);
    points.push({
      position: state.position,
      tSeconds: t
    });
  }
  return points;
}
