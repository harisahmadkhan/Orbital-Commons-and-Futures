import { useState, useCallback, useEffect, useRef } from 'react';
import type {
  OrbitType, SimMetrics, Scenario, Actor,
  ScenarioLeverValues, DisruptionEvent, WorkloadType,
} from './types';
import { GlobeView } from './components/GlobeView';
import { Sidebar } from './components/Sidebar';
import { LiveDataService } from './engine/api';
import type { LiveDataState } from './engine/api';
import { readURLState, writeURLState } from './engine/urlState';

const DEFAULT_LEVERS: ScenarioLeverValues = {
  launch_cost_per_kg: 400,
  grid_carbon_intensity: 350,
  ai_compute_demand_growth: 25,
  bandwidth_capacity_gbps: 60,
  geopolitical_cooperation: 0.7,
};

const INITIAL_METRICS: SimMetrics = {
  solar_kwh: 0,
  grid_kwh: 0,
  water_liters_per_hour: 0,
  carbon_per_tflop: 0,
  latency_ms: 4,
  downlink_utilization: 0,
  orbital_compute_tflops: 0,
  ground_compute_tflops: 0,
};

export default function App() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [actors, setActors] = useState<Actor[]>([]);
  const [orbitType, setOrbitType] = useState<OrbitType>('LEO');
  const [metrics, setMetrics] = useState<SimMetrics>(INITIAL_METRICS);
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);
  const [year, setYear] = useState(2025);
  const [leverValues, setLeverValues] = useState<ScenarioLeverValues>(DEFAULT_LEVERS);
  const [workloadType, setWorkloadType] = useState<WorkloadType>('satellite_processing');
  const [isSimulating, setIsSimulating] = useState(false);
  const [activeDisruption, setActiveDisruption] = useState<DisruptionEvent | null>(null);
  const [liveData, setLiveData] = useState<LiveDataState>({
    satellite: null,
    tle: null,
    carbon: null,
    solarBaselines: null,
    lastFetch: 0,
    isLoading: false,
    error: null,
  });

  const liveServiceRef = useRef(new LiveDataService());
  const metricsIntervalRef = useRef<number>(0);

  // Load data
  useEffect(() => {
    Promise.all([
      fetch('/data/scenarios.json').then((r) => r.json()),
      fetch('/data/actors.json').then((r) => r.json()),
    ]).then(([s, a]) => {
      setScenarios(s);
      setActors(a);
      const urlState = readURLState();
      if (urlState.orbit) setOrbitType(urlState.orbit);
      if (urlState.year) setYear(urlState.year);
      if (urlState.scenario) {
        const found = (s as Scenario[]).find((sc) => sc.id === urlState.scenario);
        if (found) {
          setActiveScenarioId(found.id);
          setLeverValues({ ...found.lever_values, ...urlState.levers });
        }
      } else if (urlState.levers) {
        setLeverValues((prev) => ({ ...prev, ...urlState.levers }));
      }
    });
  }, []);

  // Live data
  useEffect(() => {
    const svc = liveServiceRef.current;
    const unsub = svc.subscribe(setLiveData);
    svc.fetchAll();
    const interval = setInterval(() => svc.fetchAll(), 60_000);
    return () => { unsub(); clearInterval(interval); };
  }, []);

  // URL sync
  useEffect(() => {
    writeURLState({
      scenario: activeScenarioId,
      orbit: orbitType,
      year,
      timeScale: 100,
      levers: leverValues,
    });
  }, [activeScenarioId, orbitType, year, leverValues]);

  // Metrics simulation
  useEffect(() => {
    if (metricsIntervalRef.current) clearInterval(metricsIntervalRef.current);
    metricsIntervalRef.current = window.setInterval(() => {
      setMetrics((prev) => {
        const carbonBase = liveData.carbon?.carbonIntensity ?? leverValues.grid_carbon_intensity;
        const solarFactor = liveData.solarBaselines
          ? liveData.solarBaselines.reduce((s, b) => s + b.annualAverage, 0) / liveData.solarBaselines.length / 5.5
          : 1;

        return {
          solar_kwh: Math.round((prev.solar_kwh + 0.8 * solarFactor) * 10) / 10,
          grid_kwh: Math.round((prev.grid_kwh + 0.7) * 10) / 10,
          water_liters_per_hour: 180000,
          carbon_per_tflop: Math.round(carbonBase * 0.55),
          latency_ms: orbitType === 'LEO' ? 4 : orbitType === 'MEO' ? 60 : 550,
          downlink_utilization: Math.min(1, 0.3 + Math.random() * 0.4),
          orbital_compute_tflops: 312,
          ground_compute_tflops: 2400,
        };
      });
    }, 1000);
    return () => clearInterval(metricsIntervalRef.current);
  }, [orbitType, leverValues, liveData]);

  const handleScenarioSelect = useCallback((id: string) => {
    const scenario = scenarios.find((s) => s.id === id);
    if (scenario) {
      setActiveScenarioId(id);
      setLeverValues(scenario.lever_values);
    }
  }, [scenarios]);

  const handleLeverChange = useCallback((newLevers: ScenarioLeverValues) => {
    setLeverValues(newLevers);
    if (activeScenarioId) {
      const scenario = scenarios.find((s) => s.id === activeScenarioId);
      if (scenario) {
        const changed = Object.keys(newLevers).some(
          (k) => newLevers[k as keyof ScenarioLeverValues] !==
            scenario.lever_values[k as keyof ScenarioLeverValues]
        );
        if (changed) setActiveScenarioId(null);
      }
    }
  }, [activeScenarioId, scenarios]);

  const handleDisruption = useCallback((event: DisruptionEvent) => {
    setActiveDisruption(event);
    setTimeout(() => setActiveDisruption(null), 8000);
  }, []);

  const handleRunSimulation = useCallback(() => {
    setIsSimulating((prev) => !prev);
  }, []);

  return (
    <div style={rootStyle}>
      <GlobeView
        actors={actors}
        year={year}
        orbitType={orbitType}
        tle={liveData.tle}
        isSimulating={isSimulating}
        simulationDensity={leverValues.ai_compute_demand_growth / 60}
      />

      <Sidebar
        scenarios={scenarios}
        actors={actors}
        metrics={metrics}
        liveData={liveData}
        activeScenarioId={activeScenarioId}
        year={year}
        leverValues={leverValues}
        orbitType={orbitType}
        workloadType={workloadType}
        isSimulating={isSimulating}
        onScenarioSelect={handleScenarioSelect}
        onYearChange={setYear}
        onLeverChange={handleLeverChange}
        onOrbitTypeChange={setOrbitType}
        onWorkloadChange={setWorkloadType}
        onDisruption={handleDisruption}
        onRunSimulation={handleRunSimulation}
        onRefreshData={() => liveServiceRef.current.fetchAll()}
      />

      {activeDisruption && (
        <div style={disruptionBanner}>
          ⚠ DISRUPTION: {activeDisruption.replace(/_/g, ' ').toUpperCase()}
        </div>
      )}
    </div>
  );
}

const rootStyle: React.CSSProperties = {
  width: '100vw',
  height: '100vh',
  overflow: 'hidden',
  position: 'relative',
  background: '#050508',
};

const disruptionBanner: React.CSSProperties = {
  position: 'absolute',
  top: 16,
  left: '50%',
  transform: 'translateX(-50%)',
  background: 'rgba(255, 50, 50, 0.12)',
  border: '1px solid rgba(255, 50, 50, 0.35)',
  borderRadius: 6,
  padding: '8px 20px',
  fontFamily: '"DM Mono", monospace',
  fontSize: 11,
  letterSpacing: 2,
  color: '#FF6B35',
  zIndex: 50,
};
