import { useState, useCallback } from 'react';
import type { OrbitType, SimMetrics } from './types';
import { Simulation } from './components/Simulation';
import { MetricsReadout } from './components/MetricsReadout';

const ORBIT_TYPES: OrbitType[] = ['LEO', 'MEO', 'GEO'];

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
  const [orbitType, setOrbitType] = useState<OrbitType>('LEO');
  const [isPaused, setIsPaused] = useState(false);
  const [timeScale, setTimeScale] = useState(100);
  const [metrics, setMetrics] = useState<SimMetrics>(INITIAL_METRICS);

  const handleMetrics = useCallback((m: SimMetrics) => {
    setMetrics(m);
  }, []);

  return (
    <div style={styles.root}>
      <Simulation
        orbitType={orbitType}
        isPaused={isPaused}
        timeScale={timeScale}
        onMetricsUpdate={handleMetrics}
      />

      <MetricsReadout metrics={metrics} />

      <div style={styles.title}>
        <span style={styles.titleText}>ORBITAL COMMONS & FUTURES</span>
        <span style={styles.subtitle}>Speculative Simulation</span>
      </div>

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
};
