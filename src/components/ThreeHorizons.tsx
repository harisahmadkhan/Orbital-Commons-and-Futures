import { THREE_HORIZONS } from '../types';

interface ThreeHorizonsProps {
  year: number;
}

export function ThreeHorizons({ year }: ThreeHorizonsProps) {
  const totalRange = 2040 - 2025;

  return (
    <div style={styles.container}>
      <div style={styles.header}>THREE HORIZONS</div>
      <div style={styles.barContainer}>
        {THREE_HORIZONS.map((h) => {
          const startPct = ((h.yearRange[0] - 2025) / totalRange) * 100;
          const widthPct = ((h.yearRange[1] - h.yearRange[0]) / totalRange) * 100;
          const isActive = year >= h.yearRange[0] && year < h.yearRange[1];

          return (
            <div
              key={h.id}
              style={{
                ...styles.segment,
                left: `${startPct}%`,
                width: `${widthPct}%`,
                backgroundColor: isActive
                  ? h.color
                  : `${h.color}33`,
                opacity: isActive ? 1 : 0.5,
              }}
              title={`${h.id}: ${h.label} (${h.yearRange[0]}–${h.yearRange[1]})`}
            >
              <span style={{
                ...styles.segmentLabel,
                color: isActive ? '#000' : 'rgba(255,255,255,0.5)',
              }}>
                {h.id}
              </span>
            </div>
          );
        })}
        <div
          style={{
            ...styles.yearMarker,
            left: `${((year - 2025) / totalRange) * 100}%`,
          }}
        />
      </div>
      <div style={styles.labels}>
        <span>2025</span>
        <span>2030</span>
        <span>2035</span>
        <span>2040</span>
      </div>
      <div style={styles.activeLabel}>
        {THREE_HORIZONS.filter((h) => year >= h.yearRange[0] && year < h.yearRange[1]).map((h) => (
          <div key={h.id}>
            <span style={{ color: h.color, fontSize: 9 }}>{h.label}</span>
            <span style={styles.activeDesc}> — {h.description}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    top: 12,
    left: '50%',
    transform: 'translateX(-50%)',
    fontFamily: '"DM Mono", monospace',
    zIndex: 5,
    pointerEvents: 'none',
    userSelect: 'none',
    textAlign: 'center' as const,
  },
  header: {
    fontSize: 7,
    letterSpacing: 2,
    color: 'rgba(255, 255, 255, 0.2)',
    marginBottom: 4,
  },
  barContainer: {
    position: 'relative',
    width: 240,
    height: 14,
    borderRadius: 3,
    overflow: 'hidden',
    background: 'rgba(255, 255, 255, 0.03)',
  },
  segment: {
    position: 'absolute',
    top: 0,
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.3s ease',
  },
  segmentLabel: {
    fontSize: 7,
    fontWeight: 500,
    letterSpacing: 1,
  },
  yearMarker: {
    position: 'absolute',
    top: -2,
    width: 2,
    height: 18,
    backgroundColor: '#FFD700',
    borderRadius: 1,
    transition: 'left 0.3s ease',
  },
  labels: {
    display: 'flex',
    justifyContent: 'space-between',
    width: 240,
    marginTop: 2,
    fontSize: 7,
    color: 'rgba(255, 255, 255, 0.2)',
  },
  activeLabel: {
    marginTop: 3,
  },
  activeDesc: {
    fontSize: 8,
    color: 'rgba(255, 255, 255, 0.3)',
  },
};
