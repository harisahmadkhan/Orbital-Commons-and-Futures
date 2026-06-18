import { useState, useCallback, useEffect, useRef } from 'react';
import type { OrbitType, SimMetrics, Scenario, Actor, ScenarioLeverValues, DisruptionEvent } from './types';
import { Simulation } from './components/Simulation';
import { MetricsReadout } from './components/MetricsReadout';
import { ControlSurface } from './components/ControlSurface';
import { CLAPanel } from './components/CLAPanel';
import { ThreeHorizons } from './components/ThreeHorizons';
import { ActorTimeline } from './components/ActorTimeline';
import { LiveDataIndicator } from './components/LiveDataIndicator';
import { Methodology } from './components/Methodology';
import { LiveDataService } from './engine/api';
import type { LiveDataState } from './engine/api';
import { readURLState, writeURLState } from './engine/urlState';

const ORBIT_TYPES: OrbitType[] = ['LEO', 'MEO', 'GEO'];

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
  const [isPaused, setIsPaused] = useState(false);
  const [timeScale, setTimeScale] = useState(100);
  const [metrics, setMetrics] = useState<SimMetrics>(INITIAL_METRICS);
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);
  const [year, setYear] = useState(2025);
  const [leverValues, setLeverValues] = useState<ScenarioLeverValues>(DEFAULT_LEVERS);
  const [activeDisruption, setActiveDisruption] = useState<DisruptionEvent | null>(null);
  const [liveData, setLiveData] = useState<LiveDataState>({
    satellite: null,
    carbon: null,
    lastFetch: 0,
    isLoading: false,
    error: null,
  });

  const liveServiceRef = useRef(new LiveDataService());

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
      if (urlState.timeScale) setTimeScale(urlState.timeScale);
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

  useEffect(() => {
    const svc = liveServiceRef.current;
    const unsub = svc.subscribe(setLiveData);
    if (svc.isAvailable()) svc.fetchAll();
    const interval = setInterval(() => {
      if (svc.isAvailable()) svc.fetchAll();
    }, 60_000);
    return () => {
      unsub();
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    writeURLState({
      scenario: activeScenarioId,
      orbit: orbitType,
      year,
      timeScale,
      levers: leverValues,
    });
  }, [activeScenarioId, orbitType, year, timeScale, leverValues]);

  const handleMetrics = useCallback((m: SimMetrics) => {
    if (liveData.carbon) {
      setMetrics({
        ...m,
        carbon_per_tflop: Math.round(
          m.carbon_per_tflop * (liveData.carbon.carbonIntensity / 400)
        ),
      });
    } else {
      setMetrics(m);
    }
  }, [liveData.carbon]);

  const handleScenarioSelect = useCallback(
    (id: string) => {
      const scenario = scenarios.find((s) => s.id === id);
      if (scenario) {
        setActiveScenarioId(id);
        setLeverValues(scenario.lever_values);
      }
    },
    [scenarios]
  );

  const handleLeverChange = useCallback(
    (newLevers: ScenarioLeverValues) => {
      setLeverValues(newLevers);
      if (activeScenarioId) {
        const scenario = scenarios.find((s) => s.id === activeScenarioId);
        if (scenario) {
          const changed = Object.keys(newLevers).some(
            (k) =>
              newLevers[k as keyof ScenarioLeverValues] !==
              scenario.lever_values[k as keyof ScenarioLeverValues]
          );
          if (changed) setActiveScenarioId(null);
        }
      }
    },
    [activeScenarioId, scenarios]
  );

  const handleDisruption = useCallback((event: DisruptionEvent) => {
    setActiveDisruption(event);
    setTimeout(() => setActiveDisruption(null), 8000);
  }, []);

  const activeScenario = scenarios.find((s) => s.id === activeScenarioId) ?? null;

  return (
    <div style={styles.root}>
      <Simulation
        orbitType={orbitType}
        isPaused={isPaused}
        timeScale={timeScale}
        onMetricsUpdate={handleMetrics}
      />

      <MetricsReadout metrics={metrics} />

      <ThreeHorizons year={year} />

      <div style={styles.title}>
        <span style={styles.titleText}>ORBITAL COMMONS & FUTURES</span>
        <span style={styles.subtitle}>Speculative Simulation</span>
      </div>

      <CLAPanel scenario={activeScenario} />
      <ActorTimeline actors={actors} year={year} />

      {activeDisruption && (
        <div style={styles.disruptionBanner}>
          DISRUPTION: {activeDisruption.replace('_', ' ').toUpperCase()}
        </div>
      )}

      <ControlSurface
        scenarios={scenarios}
        activeScenarioId={activeScenarioId}
        year={year}
        leverValues={leverValues}
        onScenarioSelect={handleScenarioSelect}
        onYearChange={setYear}
        onLeverChange={handleLeverChange}
        onDisruption={handleDisruption}
      />

      <div style={styles.controls}>
        <div style={styles.orbitToggle}>
          {ORBIT_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setOrbitType(t)}
              style={{
                ...styles.orbitBtn,
                ...(orbitType === t ? styles.orbitBtnActive : {}),
              }}
            >
              {t}
            </button>
          ))}
        </div>

        <button
          onClick={() => setIsPaused(!isPaused)}
          style={styles.controlBtn}
        >
          {isPaused ? '▶' : '⏸'}
        </button>

        <div style={styles.speedControl}>
          <span style={styles.speedLabel}>SPEED</span>
          <input
            type="range"
            min={1}
            max={500}
            value={timeScale}
            onChange={(e) => setTimeScale(Number(e.target.value))}
            style={styles.slider}
          />
          <span style={styles.speedValue}>{timeScale}×</span>
        </div>
      </div>

      <LiveDataIndicator
        state={liveData}
        onRefresh={() => liveServiceRef.current.fetchAll()}
      />

      <Methodology />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    width: '100vw',
    height: '100vh',
    overflow: 'hidden',
    position: 'relative',
    background: '#0F0F0F',
  },
  title: {
    position: 'absolute',
    top: 12,
    left: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    pointerEvents: 'none',
    userSelect: 'none',
  },
  titleText: {
    fontFamily: '"Inter", sans-serif',
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: 3,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  subtitle: {
    fontFamily: '"DM Mono", monospace',
    fontSize: 9,
    letterSpacing: 1.5,
    color: 'rgba(255, 255, 255, 0.25)',
  },
  controls: {
    position: 'absolute',
    bottom: 16,
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    background: 'rgba(10, 10, 15, 0.8)',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    padding: '8px 16px',
    fontFamily: '"DM Mono", monospace',
    zIndex: 20,
  },
  orbitToggle: {
    display: 'flex',
    gap: 2,
  },
  orbitBtn: {
    background: 'transparent',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: 4,
    color: 'rgba(255, 255, 255, 0.4)',
    fontFamily: '"DM Mono", monospace',
    fontSize: 10,
    padding: '4px 10px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    letterSpacing: 1,
  },
  orbitBtnActive: {
    background: 'rgba(255, 215, 0, 0.15)',
    borderColor: 'rgba(255, 215, 0, 0.4)',
    color: '#FFD700',
  },
  controlBtn: {
    background: 'transparent',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: 4,
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    padding: '4px 8px',
    cursor: 'pointer',
    lineHeight: 1,
  },
  speedControl: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  speedLabel: {
    fontSize: 8,
    letterSpacing: 1.5,
    color: 'rgba(255, 255, 255, 0.25)',
  },
  slider: {
    width: 80,
    height: 3,
    accentColor: '#FFD700',
    cursor: 'pointer',
  },
  speedValue: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.5)',
    minWidth: 32,
    textAlign: 'right' as const,
    fontVariantNumeric: 'tabular-nums',
  },
  disruptionBanner: {
    position: 'absolute',
    top: 50,
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(255, 50, 50, 0.15)',
    border: '1px solid rgba(255, 50, 50, 0.4)',
    borderRadius: 6,
    padding: '6px 16px',
    fontFamily: '"DM Mono", monospace',
    fontSize: 11,
    letterSpacing: 2,
    color: '#FF6B35',
    zIndex: 50,
    animation: 'pulse 1s ease-in-out infinite',
  },
};
