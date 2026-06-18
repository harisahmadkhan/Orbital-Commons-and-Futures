import type { SimMetrics } from '../types';

interface MetricsReadoutProps {
  metrics: SimMetrics;
}

export function MetricsReadout({ metrics }: MetricsReadoutProps) {
  return (
    <div style={styles.container}>
      <div style={styles.header}>METRICS</div>

      <div style={styles.section}>
        <div style={styles.sectionLabel}>ENERGY</div>
        <MetricRow
          label="Solar (orbital)"
          value={`${metrics.solar_kwh.toFixed(1)} kWh`}
          color="#FFD700"
        />
        <MetricRow
          label="Grid (ground)"
          value={`${metrics.grid_kwh.toFixed(1)} kWh`}
          color="#D4A017"
        />
      </div>

      <div style={styles.section}>
        <div style={styles.sectionLabel}>THERMAL</div>
        <MetricRow
          label="Water usage"
          value={`${metrics.water_liters_per_hour} L/hr`}
          color="#4A90D9"
        />
        <MetricRow
          label="CO₂/TFLOP"
          value={`${metrics.carbon_per_tflop} g`}
          color="#FF6B35"
        />
      </div>

      <div style={styles.section}>
        <div style={styles.sectionLabel}>BANDWIDTH</div>
        <MetricRow
          label="Latency"
          value={`${metrics.latency_ms} ms`}
          color="#00E5FF"
        />
        <div style={styles.row}>
          <span style={styles.label}>Downlink</span>
          <div style={styles.barContainer}>
            <div
              style={{
                ...styles.barFill,
                width: `${metrics.downlink_utilization * 100}%`,
                backgroundColor:
                  metrics.downlink_utilization > 0.8
                    ? '#FF6B35'
                    : metrics.downlink_utilization > 0
                    ? '#00E5FF'
                    : '#333',
              }}
            />
          </div>
          <span style={styles.value}>
            {metrics.downlink_utilization > 0
              ? `${Math.round(metrics.downlink_utilization * 100)}%`
              : 'NO LINK'}
          </span>
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionLabel}>COMPUTE</div>
        <MetricRow
          label="Orbital"
          value={
            metrics.orbital_compute_tflops > 0
              ? `${metrics.orbital_compute_tflops} TFLOPS`
              : 'ECLIPSE'
          }
          color={metrics.orbital_compute_tflops > 0 ? '#FFFFFF' : '#555'}
        />
        <MetricRow
          label="Ground"
          value={`${metrics.ground_compute_tflops} TFLOPS`}
          color="#88AACC"
        />
      </div>
    </div>
  );
}

function MetricRow({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div style={styles.row}>
      <span style={{ ...styles.dot, backgroundColor: color }} />
      <span style={styles.label}>{label}</span>
      <span style={styles.value}>{value}</span>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    top: 12,
    right: 12,
    background: 'rgba(10, 10, 15, 0.85)',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 6,
    padding: '10px 14px',
    fontFamily: '"DM Mono", monospace',
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    minWidth: 200,
    pointerEvents: 'none',
    userSelect: 'none',
  },
  header: {
    fontSize: 9,
    fontWeight: 500,
    letterSpacing: 2,
    color: 'rgba(255, 255, 255, 0.35)',
    marginBottom: 8,
  },
  section: {
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 8,
    fontWeight: 500,
    letterSpacing: 1.5,
    color: 'rgba(255, 255, 255, 0.25)',
    marginBottom: 3,
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
    height: 16,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: '50%',
    flexShrink: 0,
  },
  label: {
    flex: 1,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  value: {
    textAlign: 'right' as const,
    color: 'rgba(255, 255, 255, 0.8)',
    fontVariantNumeric: 'tabular-nums',
  },
  barContainer: {
    width: 50,
    height: 4,
    background: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 2,
    transition: 'width 0.3s ease',
  },
};
