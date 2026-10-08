import { MU_EARTH, EARTH_RADIUS_KM } from './constants.js';

// Pre-packaged real TLE data presets for instant offline fallback
export const POPULAR_LIVE_SATELLITES = [
  {
    name: 'ISS (International Space Station)',
    noradId: 25544,
    group: 'stations',
    altitudeKm: 418,
    inclinationDeg: 51.64,
    keplerian: {
      a: EARTH_RADIUS_KM + 418,
      e: 0.00045,
      i: (51.64 * Math.PI) / 180,
      raan: (124.5 * Math.PI) / 180,
      argPer: (45.2 * Math.PI) / 180,
      meanAnomaly: (110.5 * Math.PI) / 180
    }
  },
  {
    name: 'Hubble Space Telescope (HST)',
    noradId: 20580,
    group: 'active',
    altitudeKm: 535,
    inclinationDeg: 28.47,
    keplerian: {
      a: EARTH_RADIUS_KM + 535,
      e: 0.00028,
      i: (28.47 * Math.PI) / 180,
      raan: (210.2 * Math.PI) / 180,
      argPer: (85.1 * Math.PI) / 180,
      meanAnomaly: (42.0 * Math.PI) / 180
    }
  },
  {
    name: 'Starlink-30114 (LEO Constellation)',
    noradId: 53210,
    group: 'starlink',
    altitudeKm: 550,
    inclinationDeg: 53.05,
    keplerian: {
      a: EARTH_RADIUS_KM + 550,
      e: 0.00012,
      i: (53.05 * Math.PI) / 180,
      raan: (145.8 * Math.PI) / 180,
      argPer: (120.4 * Math.PI) / 180,
      meanAnomaly: (15.2 * Math.PI) / 180
    }
  },
  {
    name: 'Sentinel-2A (Earth Observation)',
    noradId: 40697,
    group: 'resource',
    altitudeKm: 786,
    inclinationDeg: 98.62,
    keplerian: {
      a: EARTH_RADIUS_KM + 786,
      e: 0.0001,
      i: (98.62 * Math.PI) / 180,
      raan: (45.0 * Math.PI) / 180,
      argPer: (90.0 * Math.PI) / 180,
      meanAnomaly: (25.0 * Math.PI) / 180
    }
  },
  {
    name: 'NOAA-20 (Weather Satellite)',
    noradId: 43013,
    group: 'weather',
    altitudeKm: 824,
    inclinationDeg: 98.7,
    keplerian: {
      a: EARTH_RADIUS_KM + 824,
      e: 0.0002,
      i: (98.7 * Math.PI) / 180,
      raan: (310.5 * Math.PI) / 180,
      argPer: (150.2 * Math.PI) / 180,
      meanAnomaly: (65.4 * Math.PI) / 180
    }
  }
];

/**
 * Parse CelesTrak JSON General Perturbations (GP) record to Keplerian elements
 */
export function parseCelestrakGP(gpData) {
  try {
    const meanMotionRevPerDay = parseFloat(gpData.MEAN_MOTION); // revs per day
    const nRadSec = (meanMotionRevPerDay * 2 * Math.PI) / 86400; // radians per sec
    const a = Math.cbrt(MU_EARTH / (nRadSec * nRadSec)); // semi-major axis in km

    const e = parseFloat(gpData.ECCENTRICITY);
    const i = (parseFloat(gpData.INCLINATION) * Math.PI) / 180;
    const raan = (parseFloat(gpData.RA_OF_ASC_NODE) * Math.PI) / 180;
    const argPer = (parseFloat(gpData.ARG_OF_PERICENTER) * Math.PI) / 180;
    const meanAnomaly = (parseFloat(gpData.MEAN_ANOMALY) * Math.PI) / 180;

    return {
      name: gpData.OBJECT_NAME || `SAT-${gpData.NORAD_CAT_ID}`,
      noradId: gpData.NORAD_CAT_ID,
      altitudeKm: Math.round(a - EARTH_RADIUS_KM),
      inclinationDeg: parseFloat(gpData.INCLINATION),
      keplerian: { a, e, i, raan, argPer, meanAnomaly }
    };
  } catch (err) {
    console.warn('Failed to parse CelesTrak GP format:', err);
    return null;
  }
}

/**
 * Fetch live satellite data from CelesTrak API by NORAD Catalog ID
 */
export async function fetchLiveSatelliteByNoradId(noradId) {
  try {
    const response = await fetch(`https://celestrak.org/NORAD/elements/gp.php?CATNR=${noradId}&FORMAT=json`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (Array.isArray(data) && data.length > 0) {
      return parseCelestrakGP(data[0]);
    }
    return null;
  } catch (err) {
    console.warn(`CelesTrak live API request failed for NORAD ${noradId}, falling back to preset:`, err);
    const preset = POPULAR_LIVE_SATELLITES.find(s => s.noradId === parseInt(noradId));
    return preset || null;
  }
}

/**
 * Search live satellites from CelesTrak API by query string (name or group)
 */
export async function searchLiveSatellites(query) {
  try {
    const response = await fetch(`https://celestrak.org/NORAD/elements/gp.php?NAME=${encodeURIComponent(query)}&FORMAT=json`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (Array.isArray(data)) {
      return data.slice(0, 10).map(parseCelestrakGP).filter(Boolean);
    }
    return [];
  } catch (err) {
    console.warn('CelesTrak live search failed, filtering presets:', err);
    return POPULAR_LIVE_SATELLITES.filter(s => s.name.toLowerCase().includes(query.toLowerCase()));
  }
}
