// Orbital Mechanics & Physics Constants (SI & Standard Aerospace Units)

export const MU_EARTH = 398600.4418; // Earth gravitational parameter (km^3/s^2)
export const EARTH_RADIUS_KM = 6371.0; // Mean Earth radius in km
export const J2_EARTH = 1.08263e-3; // Earth J2 oblateness perturbation coefficient

export const DEFAULT_SAFE_DISTANCE_KM = 5.0; // Default safety threshold distance in km
export const SATELLITE_HARD_RADIUS_M = 15.0; // Satellite collision cross-section radius in meters
export const DEBRIS_HARD_RADIUS_M = 10.0; // Debris collision cross-section radius in meters

export const THREAT_LEVELS = {
  NOMINAL: { name: 'NOMINAL', color: '#10b981', label: 'Safe Orbit', minRisk: 0, maxRisk: 25 },
  MONITOR: { name: 'MONITOR', color: '#3b82f6', label: 'Tracking Encounter', minRisk: 25, maxRisk: 50 },
  WARNING: { name: 'WARNING', color: '#f59e0b', label: 'Elevated Risk', minRisk: 50, maxRisk: 75 },
  CRITICAL: { name: 'CRITICAL', color: '#ef4444', label: 'Imminent Collision', minRisk: 75, maxRisk: 100 }
};

// Orbital axis directions in RIC (Radial, In-Track, Cross-Track) frame
export const BURN_DIRECTIONS = {
  PROGRADE: { name: 'Prograde (+T)', vector: [0, 1, 0], desc: 'Increases altitude / orbital energy' },
  RETROGRADE: { name: 'Retrograde (-T)', vector: [0, -1, 0], desc: 'Decreases altitude / orbital energy' },
  NORMAL: { name: 'Normal (+N)', vector: [0, 0, 1], desc: 'Out-of-plane inclination shift north' },
  ANTINORMAL: { name: 'Antinormal (-N)', vector: [0, 0, -1], desc: 'Out-of-plane inclination shift south' },
  RADIAL_OUT: { name: 'Radial Out (+R)', vector: [1, 0, 0], desc: 'Pushes orbit outward along radial line' },
  RADIAL_IN: { name: 'Radial In (-R)', vector: [-1, 0, 0], desc: 'Pushes orbit inward toward Earth' }
};
