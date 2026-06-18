import type { Scenario } from '../types';

interface ScenarioSelectorProps {
  scenarios: Scenario[];
  activeId: string | null;
  onSelect: (id: string) => void;
}

export function ScenarioSelector({ scenarios, activeId, onSelect }: ScenarioSelectorProps) {
  return (
    <div style={styles.grid}>
      {scenarios.map((s) => (
        <button
          key={s.id}
          onClick={() => onSelect(s.id)}
          style={{
            ...styles.card,
            ...(activeId === s.id ? styles.cardActive : {}),
          }}
        >
          <div style={styles.cardHeader}>
            <span style={styles.cardName}>{s.name}</span>
            <span style={styles.cardHorizon}>{s.time_horizon}</span>
          </div>
          <div style={styles.axes}>
            <span style={styles.axisTag}>
              Launch: {s.launch_economics === 'low' ? '↓' : s.launch_economics === 'high' ? '↑' : '—'}
            </span>
            <span style={styles.axisTag}>
              Grid: {s.grid_decarbonization === 'fast' ? '↓C' : s.grid_decarbonization === 'slow' ? '↑C' : '—C'}
            </span>
          </div>
          <div style={styles.useCase}>{s.dominant_use_case}</div>
        </button>
      ))}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 6,
    width: '100%',
  },
  card: {
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 6,
    padding: '8px 10px',
    cursor: 'pointer',
    textAlign: 'left' as const,
    transition: 'all 0.2s',
    fontFamily: '"DM Mono", monospace',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  cardActive: {
    background: 'rgba(255, 215, 0, 0.08)',
    borderColor: 'rgba(255, 215, 0, 0.3)',
    color: '#FFD700',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  cardName: {
    fontSize: 10,
    fontWeight: 500,
    lineHeight: '1.3',
    flex: 1,
  },
  cardHorizon: {
    fontSize: 8,
    color: 'rgba(255, 255, 255, 0.3)',
    flexShrink: 0,
    marginLeft: 4,
  },
  axes: {
    display: 'flex',
    gap: 6,
    marginBottom: 4,
  },
  axisTag: {
    fontSize: 8,
    padding: '1px 4px',
    borderRadius: 2,
    background: 'rgba(255, 255, 255, 0.05)',
    color: 'rgba(255, 255, 255, 0.4)',
  },
  useCase: {
    fontSize: 8,
    color: 'rgba(255, 255, 255, 0.3)',
    lineHeight: '1.3',
  },
};
