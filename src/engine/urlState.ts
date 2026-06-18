import type { OrbitType, ScenarioLeverValues } from '../types';

interface URLState {
  scenario: string | null;
  orbit: OrbitType;
  year: number;
  timeScale: number;
  levers: Partial<ScenarioLeverValues>;
}

export function readURLState(): Partial<URLState> {
  const params = new URLSearchParams(window.location.search);
  const state: Partial<URLState> = {};

  const scenario = params.get('s');
  if (scenario) state.scenario = scenario;

  const orbit = params.get('o');
  if (orbit === 'LEO' || orbit === 'MEO' || orbit === 'GEO') state.orbit = orbit;

  const year = params.get('y');
  if (year) {
    const y = parseInt(year);
    if (y >= 2025 && y <= 2040) state.year = y;
  }

  const ts = params.get('ts');
  if (ts) {
    const t = parseInt(ts);
    if (t >= 1 && t <= 500) state.timeScale = t;
  }

  const shortKeys: Record<string, keyof ScenarioLeverValues> = {
    lc: 'launch_cost_per_kg',
    gc: 'grid_carbon_intensity',
    ai: 'ai_compute_demand_growth',
    bw: 'bandwidth_capacity_gbps',
    gp: 'geopolitical_cooperation',
  };

  const levers: Partial<ScenarioLeverValues> = {};
  for (const [short, full] of Object.entries(shortKeys)) {
    const v = params.get(short);
    if (v) levers[full] = parseFloat(v);
  }
  if (Object.keys(levers).length > 0) state.levers = levers;

  return state;
}

export function writeURLState(state: {
  scenario: string | null;
  orbit: OrbitType;
  year: number;
  timeScale: number;
  levers: ScenarioLeverValues;
}) {
  const params = new URLSearchParams();
  if (state.scenario) params.set('s', state.scenario);
  params.set('o', state.orbit);
  params.set('y', String(state.year));
  if (state.timeScale !== 100) params.set('ts', String(state.timeScale));

  params.set('lc', String(state.levers.launch_cost_per_kg));
  params.set('gc', String(state.levers.grid_carbon_intensity));
  params.set('ai', String(state.levers.ai_compute_demand_growth));
  params.set('bw', String(state.levers.bandwidth_capacity_gbps));
  params.set('gp', String(state.levers.geopolitical_cooperation));

  const qs = params.toString();
  const newUrl = `${window.location.pathname}${qs ? '?' + qs : ''}`;
  window.history.replaceState(null, '', newUrl);
}
