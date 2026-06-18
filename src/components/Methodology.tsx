import { useState } from 'react';

export function Methodology() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        style={styles.trigger}
        title="Methodology & Sources"
      >
        ?
      </button>

      {isOpen && (
        <div style={styles.overlay} onClick={() => setIsOpen(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setIsOpen(false)} style={styles.closeBtn}>×</button>
            <h2 style={styles.title}>Methodology & Sources</h2>

            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>FRAMEWORK</h3>
              <p style={styles.text}>
                This is a speculative simulation, not a predictive model. It uses scenario-based
                futures thinking (six scenarios across two master uncertainties) combined with
                Causal Layered Analysis (CLA) to surface the structural tensions in the shift
                from ground-based to orbital data centers.
              </p>
            </div>

            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>DATA SOURCES</h3>
              <ul style={styles.list}>
                <li>IEA — Data Centres and Data Transmission Networks report</li>
                <li>Uptime Institute — Annual Global Data Center Survey</li>
                <li>Starcloud whitepaper — 40MW cluster cost comparison</li>
                <li>ASCEND feasibility study (Thales Alenia Space / EU Horizon)</li>
                <li>ESA Space Debris Office statistics</li>
                <li>N2YO — Real-time satellite tracking API</li>
                <li>emissions.dev — Carbon intensity data</li>
                <li>NASA POWER API — Solar irradiance reference</li>
              </ul>
            </div>

            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>SCOPE LIMITS</h3>
              <ul style={styles.list}>
                <li>Particle flows are illustrative, not physically accurate simulations</li>
                <li>Cost figures are order-of-magnitude estimates from published sources</li>
                <li>Orbital mechanics are simplified (circular orbits, 2D projection)</li>
                <li>Scenarios are exploratory frameworks, not predictions</li>
                <li>Live API data is progressive enhancement — simulation runs fully offline</li>
              </ul>
            </div>

            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>ACTORS</h3>
              <p style={styles.text}>
                The actor map includes six orbital data center initiatives as of 2025. Actor
                status, orbit parameters, and timeline data are sourced from company
                announcements, press releases, and published technical specifications.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  trigger: {
    position: 'absolute',
    bottom: 16,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: '50%',
    background: 'rgba(10, 10, 15, 0.8)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    color: 'rgba(255, 255, 255, 0.35)',
    fontSize: 12,
    cursor: 'pointer',
    fontFamily: '"DM Mono", monospace',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  modal: {
    background: '#111118',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    padding: '28px 32px',
    maxWidth: 520,
    maxHeight: '80vh',
    overflowY: 'auto',
    fontFamily: '"DM Mono", monospace',
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 16,
    background: 'transparent',
    border: 'none',
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 20,
    cursor: 'pointer',
  },
  title: {
    fontFamily: '"Inter", sans-serif',
    fontSize: 16,
    fontWeight: 600,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 20,
    marginTop: 0,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 8,
    fontWeight: 500,
    letterSpacing: 2,
    color: 'rgba(255, 255, 255, 0.3)',
    marginBottom: 6,
    marginTop: 0,
  },
  text: {
    fontSize: 11,
    lineHeight: '1.6',
    color: 'rgba(255, 255, 255, 0.55)',
    margin: 0,
  },
  list: {
    fontSize: 10,
    lineHeight: '1.8',
    color: 'rgba(255, 255, 255, 0.5)',
    paddingLeft: 16,
    margin: 0,
  },
};
