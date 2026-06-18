import { useState } from 'react';
import type { Scenario, ScenarioLeverValues, DisruptionEvent } from '../types';
import { ScenarioSelector } from './ScenarioSelector';

interface ControlSurfaceProps {
  scenarios: Scenario[];
  activeScenarioId: string | null;
  year: number;
  leverValues: ScenarioLeverValues;
  onScenarioSelect: (id: string) => void;
  onYearChange: (year: number) => void;
  onLeverChange: (levers: ScenarioLeverValues) => void;
  onDisruption: (event: DisruptionEvent) => void;
}

interface LeverDef {
  key: keyof ScenarioLeverValues;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
}

const LEVERS: LeverDef[] = [
  { key: 'launch_cost_per_kg', label: 'Launch Cost', unit: '$/kg', min: 50, max: 3000, step: 50 },
  { key: 'grid_carbon_intensity', label: 'Grid Carbon', unit: 'gCO₂/kWh', min: 50, max: 600, step: 10 },
  { key: 'ai_compute_demand_growth', label: 'AI Demand Growth', unit: '%/yr', min: 5, max: 60, step: 5 },
  { key: 'bandwidth_capacity_gbps', label: 'Bandwidth', unit: 'Gbps', min: 5, max: 200, step: 5 },
  { key: 'geopolitical_cooperation', label: 'Geopolitical Coop.', unit: 'index', min: 0, max: 1, step: 0.1 },
];

const DISRUPTIONS: { event: DisruptionEvent; label: string; icon: string }[] = [
  { event: 'solar_storm', label: 'Solar Storm', icon: '☀' },
  { event: 'kessler_cascade', label: 'Kessler Cascade', icon: '💥' },
  { event: 'laser_interference', label: 'Laser Interference', icon: '⚡' },
  { event: 'starship_delay', label: 'Starship Delay', icon: '🚀' },
  { event: 'grid_blackout', label: 'Grid Blackout', icon: '🔌' },
];

export function ControlSurface({
  scenarios,
  activeScenarioId,
  year,
  leverValues,
  onScenarioSelect,
  onYearChange,
  onLeverChange,
  onDisruption,
}: ControlSurfaceProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const activeScenario = scenarios.find((s) => s.id === activeScenarioId);
  const isCustom = activeScenarioId === null;

  const handleLeverChange = (key: keyof ScenarioLeverValues, value: number) => {
    onLeverChange({ ...leverValues, [key]: value });
  };

  return (
    <div style={styles.container}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={styles.toggle}
      >
        <span style={styles.toggleLabel}>
          {isCustom ? 'CUSTOM CONFIGURATION' : activeScenario?.name.toUpperCase() ?? 'SELECT SCENARIO'}
        </span>
        <span style={styles.toggleYear}>{year}</span>
        <span style={styles.toggleArrow}>{isExpanded ? '▼' : '▲'}</span>
      </button>

      {isExpanded && (
        <div style={styles.panel}>
          <div style={styles.sectionHeader}>SCENARIOS</div>
          <ScenarioSelector
            scenarios={scenarios}
            activeId={activeScenarioId}
            onSelect={onScenarioSelect}
          />

          <div style={{ ...styles.sectionHeader, marginTop: 12 }}>YEAR HORIZON</div>
          <div style={styles.yearRow}>
            <span style={styles.yearLabel}>2025</span>
            <input
              type="range"
              min={2025}
              max={2040}
              value={year}
              onChange={(e) => onYearChange(Number(e.target.value))}
              style={styles.yearSlider}
            />
            <span style={styles.yearLabel}>2040</span>
            <span style={styles.yearValue}>{year}</span>
          </div>

          <div style={{ ...styles.sectionHeader, marginTop: 12 }}>
            UNCERTAINTY LEVERS
            {isCustom && <span style={styles.customBadge}>CUSTOM</span>}
          </div>
          {LEVERS.map((lever) => (
            <div key={lever.key} style={styles.leverRow}>
              <span style={styles.leverLabel}>{lever.label}</span>
              <input
                type="range"
                min={lever.min}
                max={lever.max}
                step={lever.step}
                value={leverValues[lever.key]}
                onChange={(e) => handleLeverChange(lever.key, Number(e.target.value))}
                style={styles.leverSlider}
              />
              <span style={styles.leverValue}>
                {lever.key === 'geopolitical_cooperation'
                  ? leverValues[lever.key].toFixed(1)
                  : leverValues[lever.key]}
                <span style={styles.leverUnit}> {lever.unit}</span>
              </span>
            </div>
          ))}

          <div style={{ ...styles.sectionHeader, marginTop: 12 }}>DISRUPTION EVENTS</div>
          <div style={styles.disruptionRow}>
            {DISRUPTIONS.map((d) => (
              <button
                key={d.event}
                onClick={() => onDisruption(d.event)}
                style={styles.disruptionBtn}
                title={d.label}
              >
                <span>{d.icon}</span>
                <span style={styles.disruptionLabel}>{d.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    bottom: 52,
    left: '50%',
    transform: 'translateX(-50%)',
    width: 'min(680px, 90vw)',
    fontFamily: '"DM Mono", monospace',
    zIndex: 10,
  },
  toggle: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'rgba(10, 10, 15, 0.85)',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 6,
    padding: '6px 14px',
    cursor: 'pointer',
    fontFamily: '"DM Mono", monospace',
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 10,
    letterSpacing: 1.5,
  },
  toggleLabel: {
    flex: 1,
    textAlign: 'left' as const,
  },
  toggleYear: {
    color: '#FFD700',
    fontSize: 11,
  },
  toggleArrow: {
    fontSize: 8,
    color: 'rgba(255, 255, 255, 0.3)',
  },
  panel: {
    background: 'rgba(10, 10, 15, 0.92)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    padding: 14,
    marginTop: 4,
    maxHeight: '50vh',
    overflowY: 'auto' as const,
  },
  sectionHeader: {
    fontSize: 8,
    fontWeight: 500,
    letterSpacing: 2,
    color: 'rgba(255, 255, 255, 0.25)',
    marginBottom: 6,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  customBadge: {
    fontSize: 7,
    padding: '1px 5px',
    borderRadius: 3,
    background: 'rgba(255, 107, 53, 0.2)',
    color: '#FF6B35',
    letterSpacing: 1,
  },
  yearRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  yearLabel: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.3)',
  },
  yearSlider: {
    flex: 1,
    height: 3,
    accentColor: '#FFD700',
    cursor: 'pointer',
  },
  yearValue: {
    fontSize: 11,
    color: '#FFD700',
    minWidth: 32,
    textAlign: 'right' as const,
  },
  leverRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  leverLabel: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.45)',
    minWidth: 110,
  },
  leverSlider: {
    flex: 1,
    height: 3,
    accentColor: '#4A90D9',
    cursor: 'pointer',
  },
  leverValue: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.6)',
    minWidth: 75,
    textAlign: 'right' as const,
    fontVariantNumeric: 'tabular-nums',
  },
  leverUnit: {
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: 8,
  },
  disruptionRow: {
    display: 'flex',
    gap: 4,
    flexWrap: 'wrap' as const,
  },
  disruptionBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    background: 'rgba(255, 60, 60, 0.06)',
    border: '1px solid rgba(255, 60, 60, 0.15)',
    borderRadius: 4,
    padding: '4px 8px',
    cursor: 'pointer',
    fontFamily: '"DM Mono", monospace',
    fontSize: 9,
    color: 'rgba(255, 150, 150, 0.7)',
    transition: 'all 0.2s',
  },
  disruptionLabel: {
    fontSize: 8,
  },
};
