import { EARTH_RADIUS_KM } from './constants.js';

// Convert degrees to radians
const deg2rad = d => (d * Math.PI) / 180;

export const HACKATHON_SCENARIOS = [
  {
    id: 'leo-high-risk',
    name: 'LEO High-Risk Intersection',
    description: 'Starlink-701 encounter with Fengyun-1C Anti-Satellite Fragment D-904 at 14.6 km/s relative speed.',
    satellite: {
      name: 'Starlink-701 (SAT-A)',
      noradId: 44713,
      keplerian: {
        a: EARTH_RADIUS_KM + 550, // 550 km LEO altitude
        e: 0.0012,
        i: deg2rad(53.0),
        raan: deg2rad(120.0),
        argPer: deg2rad(45.0),
        meanAnomaly: deg2rad(10.0)
      }
    },
    primaryDebris: {
      id: 'D-904',
      name: 'Fengyun-1C Debris D-904',
      catalogNumber: 31802,
      origin: 'Chinese Anti-Satellite Test (2007)',
      sizeMeters: 0.8,
      massKg: 12.5,
      keplerian: {
        a: EARTH_RADIUS_KM + 554,
        e: 0.0035,
        i: deg2rad(68.5), // High inclination intersection angle
        raan: deg2rad(142.0),
        argPer: deg2rad(180.0),
        meanAnomaly: deg2rad(328.5)
      }
    }
  },
  {
    id: 'cosmos-asat-swarm',
    name: 'Cosmos-1408 Debris Field Swarm',
    description: 'Sentinel-2 Polar Earth Observation Satellite passing through high-density ASAT breakup debris.',
    satellite: {
      name: 'Sentinel-2 (SAT-B)',
      noradId: 40697,
      keplerian: {
        a: EARTH_RADIUS_KM + 786, // 786 km SSO altitude
        e: 0.0001,
        i: deg2rad(98.62),
        raan: deg2rad(45.0),
        argPer: deg2rad(90.0),
        meanAnomaly: deg2rad(25.0)
      }
    },
    primaryDebris: {
      id: 'C-104',
      name: 'Cosmos-1408 Fragment C-104',
      catalogNumber: 49812,
      origin: 'Russian ASAT Breakup (2021)',
      sizeMeters: 1.4,
      massKg: 45.0,
      keplerian: {
        a: EARTH_RADIUS_KM + 782,
        e: 0.008,
        i: deg2rad(82.5),
        raan: deg2rad(70.0),
        argPer: deg2rad(10.0),
        meanAnomaly: deg2rad(359.1)
      }
    }
  },
  {
    id: 'geo-drift-hazard',
    name: 'GEO Drift & Station-Keeping Encounter',
    description: 'GSAT Geostationary telecommunications satellite encountering a dead rocket upper stage in drift orbit.',
    satellite: {
      name: 'GSAT-30 (GEO-C)',
      noradId: 45026,
      keplerian: {
        a: EARTH_RADIUS_KM + 35786, // Geostationary ~ 42,164 km semi-major axis
        e: 0.0004,
        i: deg2rad(0.05),
        raan: deg2rad(83.0),
        argPer: deg2rad(0.0),
        meanAnomaly: deg2rad(120.0)
      }
    },
    primaryDebris: {
      id: 'R-402',
      name: 'Centaur Upper Stage R-402',
      catalogNumber: 18402,
      origin: 'Spent Rocket Stage Drift Orbit',
      sizeMeters: 4.2,
      massKg: 1800.0,
      keplerian: {
        a: EARTH_RADIUS_KM + 35792,
        e: 0.0015,
        i: deg2rad(1.2),
        raan: deg2rad(85.0),
        argPer: deg2rad(45.0),
        meanAnomaly: deg2rad(119.85)
      }
    }
  }
];

/**
 * Generate 250 background cataloged space debris items across LEO and GEO
 * for visual realism in the 3D globe canvas.
 */
export function generateBackgroundDebrisCatalog(count = 250) {
  const catalog = [];
  const prefixes = ['COSMOS', 'SL-16', 'DELTA-2', 'FENGYUN', 'PEGASUS', 'TITAN', 'ARIANE', 'BREEZE-M', 'CZ-4B'];

  for (let i = 0; i < count; i++) {
    const isLeo = Math.random() < 0.82; // 82% LEO, 18% GEO/MEO
    const alt = isLeo
      ? 350 + Math.random() * 1100
      : 20000 + Math.random() * 16000;

    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const catNum = 20000 + Math.floor(Math.random() * 35000);

    catalog.push({
      id: `BG-${catNum}`,
      name: `${prefix} DEBRIS #${catNum}`,
      catalogNumber: catNum,
      sizeMeters: parseFloat((0.2 + Math.random() * 3.5).toFixed(1)),
      isLeo,
      keplerian: {
        a: EARTH_RADIUS_KM + alt,
        e: Math.random() * (isLeo ? 0.015 : 0.08),
        i: Math.random() * Math.PI, // Random inclination 0 to 180 deg
        raan: Math.random() * 2 * Math.PI,
        argPer: Math.random() * 2 * Math.PI,
        meanAnomaly: Math.random() * 2 * Math.PI
      }
    });
  }

  return catalog;
}
