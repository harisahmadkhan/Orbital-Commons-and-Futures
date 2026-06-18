const N2YO_BASE = 'https://api.n2yo.com/rest/v1/satellite';
const EMISSIONS_BASE = 'https://api.emissions.dev/v1';

function getN2YOKey(): string | null {
  return import.meta.env.VITE_N2YO_API_KEY ?? null;
}

function getEmissionsKey(): string | null {
  return import.meta.env.VITE_EMISSIONS_API_KEY ?? null;
}

export interface SatellitePosition {
  satlatitude: number;
  satlongitude: number;
  sataltitude: number;
  azimuth: number;
  elevation: number;
  timestamp: number;
}

export interface CarbonIntensity {
  zone: string;
  carbonIntensity: number;
  fossilFuelPercentage: number;
  updatedAt: string;
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

export async function fetchCarbonIntensity(
  zone: string = 'DE'
): Promise<CarbonIntensity | null> {
  const key = getEmissionsKey();
  if (!key) return null;

  try {
    const url = `${EMISSIONS_BASE}/carbon-intensity?zone=${zone}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      zone: data.zone ?? zone,
      carbonIntensity: data.carbonIntensity ?? 400,
      fossilFuelPercentage: data.fossilFuelPercentage ?? 50,
      updatedAt: data.updatedAt ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export interface LiveDataState {
  satellite: SatellitePosition | null;
  carbon: CarbonIntensity | null;
  lastFetch: number;
  isLoading: boolean;
  error: string | null;
}

const STARCLOUD_NORAD_ID = 60000;
const FETCH_INTERVAL_MS = 30_000;

export class LiveDataService {
  private state: LiveDataState = {
    satellite: null,
    carbon: null,
    lastFetch: 0,
    isLoading: false,
    error: null,
  };

  private listeners: ((state: LiveDataState) => void)[] = [];

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
    return !!(getN2YOKey() || getEmissionsKey());
  }

  async fetchAll(): Promise<void> {
    const now = Date.now();
    if (now - this.state.lastFetch < FETCH_INTERVAL_MS) return;
    if (this.state.isLoading) return;

    this.state.isLoading = true;
    this.state.error = null;
    this.notify();

    try {
      const [sat, carbon] = await Promise.all([
        fetchSatellitePosition(STARCLOUD_NORAD_ID, 51.5, -0.1, 0),
        fetchCarbonIntensity('DE'),
      ]);

      this.state.satellite = sat ?? this.state.satellite;
      this.state.carbon = carbon ?? this.state.carbon;
      this.state.lastFetch = now;
    } catch (e) {
      this.state.error = e instanceof Error ? e.message : 'Unknown error';
    } finally {
      this.state.isLoading = false;
      this.notify();
    }
  }
}
