import type { LiveDataState } from '../engine/api';

interface LiveDataIndicatorProps {
  state: LiveDataState;
  onRefresh: () => void;
}

export function LiveDataIndicator({ state, onRefresh }: LiveDataIndicatorProps) {
  const hasAnyData = state.satellite || state.carbon;
  if (!hasAnyData && !state.isLoading && !state.error) return null;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.dot(state.isLoading ? '#D4A017' : state.error ? '#FF6B35' : '#00CC66')} />
        <span style={styles.label}>LIVE DATA</span>
        <button onClick={onRefresh} style={styles.refreshBtn} title="Refresh">↻</button>
      </div>
      {state.satellite && (
        <div style={styles.row}>
          <span style={styles.key}>SAT</span>
          <span style={styles.val}>
            {state.satellite.satlatitude.toFixed(1)}°, {state.satellite.satlongitude.toFixed(1)}°
          </span>
        </div>
      )}
      {state.carbon && (
        <div style={styles.row}>
          <span style={styles.key}>CO₂</span>
          <span style={styles.val}>{state.carbon.carbonIntensity} gCO₂/kWh</span>
        </div>
      )}
      {state.error && (
        <div style={{ ...styles.row, color: 'rgba(255, 107, 53, 0.7)' }}>
          {state.error}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    position: 'absolute' as const,
    bottom: 60,
    right: 12,
    background: 'rgba(10, 10, 15, 0.85)',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 6,
    padding: '6px 10px',
    fontFamily: '"DM Mono", monospace',
    fontSize: 9,
    minWidth: 140,
    zIndex: 10,
  },
  header: {
    display: 'flex' as const,
    alignItems: 'center' as const,
    gap: 5,
    marginBottom: 4,
  },
  dot: (color: string): React.CSSProperties => ({
    width: 5,
    height: 5,
    borderRadius: '50%',
    backgroundColor: color,
    flexShrink: 0,
  }),
  label: {
    fontSize: 7,
    letterSpacing: 2,
    color: 'rgba(255, 255, 255, 0.25)',
    flex: 1,
  },
  refreshBtn: {
    background: 'transparent',
    border: 'none',
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: 11,
    cursor: 'pointer',
    padding: 0,
    fontFamily: '"DM Mono", monospace',
  } as React.CSSProperties,
  row: {
    display: 'flex' as const,
    gap: 6,
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 1,
  },
  key: {
    color: 'rgba(255, 255, 255, 0.3)',
    minWidth: 24,
  },
  val: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontVariantNumeric: 'tabular-nums' as const,
  },
};
