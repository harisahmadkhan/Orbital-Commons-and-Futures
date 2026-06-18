import { useState } from 'react';
import type { Scenario } from '../types';

interface CLAPanelProps {
  scenario: Scenario | null;
}

const CLA_LEVELS = [
  { key: 'litany' as const, label: 'LITANY', desc: 'Surface readout', color: '#4A90D9' },
  { key: 'system' as const, label: 'SYSTEM', desc: 'Systemic cause', color: '#D4A017' },
  { key: 'worldview' as const, label: 'WORLDVIEW', desc: 'Assumption', color: '#FF6B35' },
  { key: 'metaphor' as const, label: 'METAPHOR', desc: 'Underlying image', color: '#C084FC' },
];

export function CLAPanel({ scenario }: CLAPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!scenario) return null;

  return (
    <div style={styles.container}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={styles.toggle}
      >
        <span style={styles.toggleLabel}>CLA</span>
        <span style={styles.toggleArrow}>{isExpanded ? '◂' : '▸'}</span>
      </button>

      {isExpanded && (
        <div style={styles.panel}>
          <div style={styles.title}>Causal Layered Analysis</div>
          <div style={styles.scenarioName}>{scenario.name}</div>
          {CLA_LEVELS.map((level) => (
            <div key={level.key} style={styles.level}>
              <div style={styles.levelHeader}>
                <span style={{ ...styles.levelDot, backgroundColor: level.color }} />
                <span style={styles.levelLabel}>{level.label}</span>
                <span style={styles.levelDesc}>{level.desc}</span>
              </div>
              <div style={styles.levelText}>
                {scenario.cla_framing[level.key]}
              </div>
            </div>
          ))}
          <div style={styles.sources}>
            <div style={styles.sourcesHeader}>INFORMED BY</div>
            {scenario.informed_by.map((source, i) => (
              <div key={i} style={styles.sourceItem}>• {source}</div>
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
    top: '50%',
    left: 12,
    transform: 'translateY(-50%)',
    fontFamily: '"DM Mono", monospace',
    zIndex: 10,
    display: 'flex',
    alignItems: 'flex-start',
    gap: 4,
  },
  toggle: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 2,
    background: 'rgba(10, 10, 15, 0.85)',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 4,
    padding: '8px 4px',
    cursor: 'pointer',
    fontFamily: '"DM Mono", monospace',
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 8,
    letterSpacing: 1,
    writingMode: 'vertical-lr' as const,
  },
  toggleLabel: {
    letterSpacing: 2,
  },
  toggleArrow: {
    fontSize: 8,
    writingMode: 'horizontal-tb' as const,
    marginTop: 4,
  },
  panel: {
    background: 'rgba(10, 10, 15, 0.92)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 6,
    padding: 12,
    width: 260,
    maxHeight: '60vh',
    overflowY: 'auto' as const,
  },
  title: {
    fontSize: 8,
    fontWeight: 500,
    letterSpacing: 2,
    color: 'rgba(255, 255, 255, 0.25)',
    marginBottom: 4,
  },
  scenarioName: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 10,
  },
  level: {
    marginBottom: 10,
  },
  levelHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  levelDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    flexShrink: 0,
  },
  levelLabel: {
    fontSize: 8,
    fontWeight: 500,
    letterSpacing: 1.5,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  levelDesc: {
    fontSize: 7,
    color: 'rgba(255, 255, 255, 0.2)',
  },
  levelText: {
    fontSize: 10,
    lineHeight: '1.5',
    color: 'rgba(255, 255, 255, 0.6)',
    paddingLeft: 12,
  },
  sources: {
    marginTop: 12,
    paddingTop: 8,
    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
  },
  sourcesHeader: {
    fontSize: 7,
    letterSpacing: 2,
    color: 'rgba(255, 255, 255, 0.2)',
    marginBottom: 4,
  },
  sourceItem: {
    fontSize: 8,
    color: 'rgba(255, 255, 255, 0.35)',
    marginBottom: 2,
  },
};
