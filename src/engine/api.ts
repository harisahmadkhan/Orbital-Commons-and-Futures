const N2YO_BASE = 'https://api.n2yo.com/rest/v1/satellite';
const TLE_BASE = 'https://tle.ivanstanojevic.me/api/tle';
const EMISSIONS_BASE = 'https://api.emissions.dev/v1/electricity';
const NASA_POWER_BASE = 'https://power.larc.nasa.gov/api/v1/temporal/monthly/point';

function getN2YOKey(): string | null {
  return import.meta.env.VITE_N2YO_API_KEY || null;
}

function getEmissionsKey(): string | null {
  return import.meta.env.VITE_EMISSIONS_API_KEY || null;
}

// --- N2YO Satellite Tracking (requires API key) ---

export interface SatellitePosition {
  satlatitude: number;
  satlongitude: number;
  sataltitude: number;
  azimuth: number;
  elevation: number;
  timestamp: number;
}

export async function fetchSatellitePosition(
  noradId: number,
  observerLat: number,
  observerLng: number,
  observerAlt: number
): Promise<SatellitePosition | null> {
  const key = getN2YOKey();
  if (!key) return null;

  try {
    const url = `${N2YO_BASE}/positions/${noradId}/${observerLat}/${observerLng}/${observerAlt}/1&apiKey=${key}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.positions && data.positions.length > 0) {
      return data.positions[0];
    }
    return null;
  } catch {
    return null;
  }
}

// --- TLE API (free, no key required) ---

export interface TLEData {
  satelliteId: number;
  name: string;
  line1: string;
  line2: string;
  inclination: number;
  eccentricity: number;
  meanMotion: number;
  epoch: string;
}

export async function fetchTLE(
  searchName: string
): Promise<TLEData | null> {
  try {
    const url = `${TLE_BASE}?search=${encodeURIComponent(searchName)}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();

    if (!data.member || data.member.length === 0) return null;
    const sat = data.member[0];

    const line2 = sat.line2 ?? '';
    const inclination = parseFloat(line2.substring(8, 16)) || 0;
    const eccentricity = parseFloat('0.' + (line2.substring(26, 33) ?? '0')) || 0;
    const meanMotion = parseFloat(line2.substring(52, 63)) || 0;

    return {
      satelliteId: sat.satelliteId ?? sat['@id'] ?? 0,
      name: sat.name ?? searchName,
      line1: sat.line1 ?? '',
      line2,
      inclination,
      eccentricity,
      meanMotion,
      epoch: sat.date ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function orbitalPeriodFromTLE(tle: TLEData): number {
  if (tle.meanMotion <= 0) return 95;
  return 1440 / tle.meanMotion;
}

export function altitudeFromTLE(tle: TLEData): number {
  if (tle.meanMotion <= 0) return 550;
  const earthRadiusKm = 6371;
  const mu = 398600.4418;
  const periodSec = (1440 / tle.meanMotion) * 60;
  const semiMajorAxis = Math.pow((mu * periodSec * periodSec) / (4 * Math.PI * Math.PI), 1 / 3);
  return semiMajorAxis - earthRadiusKm;
}

// --- emissions.dev Carbon Intensity (requires API key) ---

export interface CarbonIntensity {
  zone: string;
  carbonIntensity: number;
  isCleanGrid: boolean;
  fossilFuelPercentage: number;
  updatedAt: string;
}

export async function fetchCarbonIntensity(
  countryCode: string = 'DE'
): Promise<CarbonIntensity | null> {
  const key = getEmissionsKey();
  if (!key) return null;

  try {
    const url = `${EMISSIONS_BASE}/current?country_code=${encodeURIComponent(countryCode)}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      zone: data.country_code ?? countryCode,
      carbonIntensity: data.grid_intensity ?? 400,
      isCleanGrid: data.is_clean_grid ?? false,
      fossilFuelPercentage: data.fossil_fuel_percentage ?? 50,
      updatedAt: data.updated_at ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

// --- NASA POWER Solar Irradiance (free, no key required) ---

export interface SolarIrradianceData {
  region: string;
  latitude: number;
  longitude: number;
  monthlyValues: Record<string, number>;
  annualAverage: number;
}

export async function fetchSolarIrradiance(
  lat: number,
  lon: number,
  startYear: number = 2024,
  endYear: number = 2024
): Promise<SolarIrradianceData | null> {
  try {
    const startDate = `${startYear}0101`;
    const endDate = `${endYear}1231`;
    const url = `${NASA_POWER_BASE}?parameters=ALLSKY_SFC_SW_DWN&longitude=${lon}&latitude=${lat}&start=${startDate}&end=${endDate}&format=JSON`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();

    const paramData = data?.properties?.parameter?.ALLSKY_SFC_SW_DWN;
    if (!paramData) return null;

    const monthlyValues: Record<string, number> = {};
    let total = 0;
    let count = 0;
    for (const [key, val] of Object.entries(paramData)) {
      if (key.length === 6 && typeof val === 'number' && val > 0) {
        monthlyValues[key] = val;
        total += val;
        count++;
      }
    }

    return {
      region: `${lat},${lon}`,
      latitude: lat,
      longitude: lon,
      monthlyValues,
      annualAverage: count > 0 ? total / count : 0,
    };
  } catch {
    return null;
  }
}

// --- Live Data State & Service ---

export interface LiveDataState {
  satellite: SatellitePosition | null;
  tle: TLEData | null;
  carbon: CarbonIntensity | null;
  solarBaselines: SolarIrradianceData[] | null;
  lastFetch: number;
  isLoading: boolean;
  error: string | null;
}

const STARCLOUD_NORAD_ID = 60000;
const FETCH_INTERVAL_MS = 30_000;

const SOLAR_BASELINE_REGIONS = [
  { name: 'Equatorial', lat: 0, lon: 30 },
  { name: 'Northern Mid-Lat', lat: 48, lon: 11 },
  { name: 'Southern Mid-Lat', lat: -34, lon: 18 },
  { name: 'Arctic', lat: 70, lon: 25 },
  { name: 'Tropical Pacific', lat: 10, lon: -150 },
  { name: 'Desert Belt', lat: 25, lon: 45 },
];

export class LiveDataService {
  private state: LiveDataState = {
    satellite: null,
    tle: null,
    carbon: null,
    solarBaselines: null,
    lastFetch: 0,
    isLoading: false,
    error: null,
  };

  private listeners: ((state: LiveDataState) => void)[] = [];
  private solarFetched = false;

  subscribe(fn: (state: LiveDataState) => void) {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  private notify() {
    for (const fn of this.listeners) fn({ ...this.state });
  }

  getState(): LiveDataState {
    return { ...this.state };
  }

  isAvailable(): boolean {
    return true;
  }

  async fetchAll(countryCode: string = 'DE'): Promise<void> {
    const now = Date.now();
    if (now - this.state.lastFetch < FETCH_INTERVAL_MS) return;
    if (this.state.isLoading) return;

    this.state.isLoading = true;
    this.state.error = null;
    this.notify();

    try {
      const promises: Promise<void>[] = [];

      promises.push(
        fetchSatellitePosition(STARCLOUD_NORAD_ID, 51.5, -0.1, 0).then((sat) => {
          if (sat) this.state.satellite = sat;
        })
      );

      promises.push(
        fetchTLE('Starcloud').then((tle) => {
          if (tle) this.state.tle = tle;
        })
      );

      promises.push(
        fetchCarbonIntensity(countryCode).then((carbon) => {
          if (carbon) this.state.carbon = carbon;
        })
      );

      if (!this.solarFetched) {
        promises.push(this.fetchSolarBaselines());
      }

      await Promise.allSettled(promises);
      this.state.lastFetch = now;
    } catch (e) {
      this.state.error = e instanceof Error ? e.message : 'Unknown error';
    } finally {
      this.state.isLoading = false;
      this.notify();
    }
  }

  private async fetchSolarBaselines(): Promise<void> {
    try {
      const cached = await fetch('/data/solarBaselines.json');
      if (cached.ok) {
        this.state.solarBaselines = await cached.json();
        this.solarFetched = true;
        return;
      }
    } catch { /* fall through to NASA API */ }

    const results = await Promise.allSettled(
      SOLAR_BASELINE_REGIONS.map((r) => fetchSolarIrradiance(r.lat, r.lon))
    );

    const baselines: SolarIrradianceData[] = [];
    results.forEach((result, i) => {
      if (result.status === 'fulfilled' && result.value) {
        baselines.push({ ...result.value, region: SOLAR_BASELINE_REGIONS[i].name });
      }
    });

    if (baselines.length > 0) {
      this.state.solarBaselines = baselines;
      this.solarFetched = true;
    }
  }

  async changeCarbonRegion(countryCode: string): Promise<void> {
    const carbon = await fetchCarbonIntensity(countryCode);
    if (carbon) {
      this.state.carbon = carbon;
      this.notify();
    }
  }
}
