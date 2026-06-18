export interface Actor {
  id: string;
  name: string;
  orbit: 'LEO' | 'MEO' | 'GEO' | 'Lunar';
  altitude_km: number;
  status: 'operational' | 'planned' | 'in_development' | 'concept';
  launch_date: string | null;
  planned_date: string | null;
  compute_capacity: string;
  use_case: string;
  funding_status: string;
  source: string;
  orbital_params?: {
    inclination_deg?: number;
    type?: string;
  };
}

export interface ScenarioLeverValues {
  launch_cost_per_kg: number;
  grid_carbon_intensity: number;
  ai_compute_demand_growth: number;
  bandwidth_capacity_gbps: number;
  geopolitical_cooperation: number;
}

export interface Scenario {
  id: string;
  name: string;
  time_horizon: string;
  description: string;
  dominant_use_case: string;
  launch_economics: 'low' | 'medium' | 'high';
  grid_decarbonization: 'slow' | 'medium' | 'fast';
  lever_values: ScenarioLeverValues;
  cla_framing: {
    litany: string;
    system: string;
    worldview: string;
    metaphor: string;
  };
  informed_by: string[];
}

export type OrbitType = 'LEO' | 'MEO' | 'GEO';

export type WorkloadType =
  | 'satellite_processing'
  | 'ai_training'
  | 'realtime_inference'
  | 'cold_archival';

export interface OrbitalConfig {
  orbitType: OrbitType;
  altitude_km: number;
  orbital_period_min: number;
  latency_ms: number;
  coverage_window_min: number;
}

export const ORBIT_CONFIGS: Record<OrbitType, OrbitalConfig> = {
  LEO: {
    orbitType: 'LEO',
    altitude_km: 550,
    orbital_period_min: 95.6,
    latency_ms: 4,
    coverage_window_min: 10,
  },
  MEO: {
    orbitType: 'MEO',
    altitude_km: 8000,
    orbital_period_min: 288,
    latency_ms: 60,
    coverage_window_min: 120,
  },
  GEO: {
    orbitType: 'GEO',
    altitude_km: 35786,
    orbital_period_min: 1436,
    latency_ms: 550,
    coverage_window_min: Infinity,
  },
};

export interface SimulationState {
  time: number;
  orbitType: OrbitType;
  isPaused: boolean;
  timeScale: number;
  orbitalAngle: number;
  inEclipse: boolean;
  coverageActive: boolean;
  metrics: SimMetrics;
}

export interface SimMetrics {
  solar_kwh: number;
  grid_kwh: number;
  water_liters_per_hour: number;
  carbon_per_tflop: number;
  latency_ms: number;
  downlink_utilization: number;
  orbital_compute_tflops: number;
  ground_compute_tflops: number;
}

export type ParticleType =
  | 'solar'
  | 'grid'
  | 'water'
  | 'waste_heat'
  | 'radiative'
  | 'data_up'
  | 'data_down'
  | 'compute';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: ParticleType;
  alpha: number;
  life: number;
  maxLife: number;
  size: number;
}
