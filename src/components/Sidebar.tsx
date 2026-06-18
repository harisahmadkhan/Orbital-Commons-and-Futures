import { useState } from 'react';
import type {
  Scenario, Actor, ScenarioLeverValues, DisruptionEvent,
  OrbitType, WorkloadType, SimMetrics,
} from '../types';
import { THREE_HORIZONS } from '../types';
import type { LiveDataState } from '../engine/api';
import { altitudeFromTLE } from '../engine/api';

interface SidebarProps {
  // Data
  scenarios: Scenario[];
  actors: Actor[];
  metrics: SimMetrics;
  liveData: LiveDataState;
  // State
  activeScenarioId: string | null;
  year: number;
  leverValues: ScenarioLeverValues;
  orbitType: OrbitType;
  workloadType: WorkloadType;
  isSimulating: boolean;
  // Handlers
  onScenarioSelect: (id: string) => void;
  onYearChange: (year: number) => void;
  onLeverChange: (levers: ScenarioLeverValues) => void;
  onOrbitTypeChange: (type: OrbitType) => void;
  onWorkloadChange: (type: WorkloadType) => void;
  onDisruption: (event: DisruptionEvent) => void;
  onRunSimulation: () => void;
  onRefreshData: () => void;
}

type Section = 'scenarios' | 'levers' | 'actors' | 'cla' | 'live';

const LEVERS: { key: keyof ScenarioLeverValues; label: string; unit: string; min: number; max: number; step: number }[] = [
  { key: 'launch_cost_per_kg', label: 'Launch Cost', unit: '$/kg', min: 50, max: 3000, step: 50 },
  { key: 'grid_carbon_intensity', label: 'Grid Carbon', unit: 'gCO₂/kWh', min: 50, max: 600, step: 10 },
  { key: 'ai_compute_demand_growth', label: 'AI Demand Growth', unit: '%/yr', min: 5, max: 60, step: 5 },
  { key: 'bandwidth_capacity_gbps', label: 'Bandwidth Cap.', unit: 'Gbps', min: 5, max: 200, step: 5 },
  { key: 'geopolitical_cooperation', label: 'Geopolitical Coop.', unit: '', min: 0, max: 1, step: 0.1 },
];

const DISRUPTIONS: { event: DisruptionEvent; label: string; icon: string }[] = [
  { event: 'solar_storm', label: 'Solar Storm', icon: '☀' },
  { event: 'kessler_cascade', label: 'Kessler Cascade', icon: '💥' },
  { event: 'laser_interference', label: 'Laser Int.', icon: '⚡' },
  { event: 'starship_delay', label: 'Starship Delay', icon: '🚀' },
  { event: 'grid_blackout', label: 'Grid Blackout', icon: '🔌' },
];

const WORKLOADS: { type: WorkloadType; label: string }[] = [
  { type: 'satellite_processing', label: 'Sat. Data' },
  { type: 'ai_training', label: 'AI Train' },
  { type: 'realtime_inference', label: 'Inference' },
  { type: 'cold_archival', label: 'Archival' },
];

const CLA_LEVELS = [
  { key: 'litany' as const, label: 'Litany', desc: 'Surface readout', color: '#4A90D9' },
  { key: 'system' as const, label: 'System', desc: 'Systemic cause', color: '#D4A017' },
  { key: 'worldview' as const, label: 'Worldview', desc: 'Assumption', color: '#FF6B35' },
  { key: 'metaphor' as const, label: 'Metaphor', desc: 'Underlying image', color: '#C084FC' },
];

export function Sidebar(props: SidebarProps) {
  const {
    scenarios, actors, metrics, liveData,
    activeScenarioId, year, leverValues, orbitType, workloadType, isSimulating,
    onScenarioSelect, onYearChange, onLeverChange, onOrbitTypeChange,
    onWorkloadChange, onDisruption, onRunSimulation, onRefreshData,
  } = props;

  const [openSections, setOpenSections] = useState<Set<Section>>(new Set(['scenarios']));
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggle = (s: Section) => {
    const next = new Set(openSections);
    next.has(s) ? next.delete(s) : next.add(s);
    setOpenSections(next);
  };

  const activeScenario = scenarios.find((s) => s.id === activeScenarioId) ?? null;
  const isCustom = activeScenarioId === null;

  const currentHorizon = THREE_HORIZONS.find(
    (h) => year >= h.yearRange[0] && year < h.yearRange[1]
  );

  const visibleActorCount = actors.filter((a) => {
    const ly = a.launch_date ? new Date(a.launch_date).getFullYear()
      : a.planned_date ? new Date(a.planned_date).getFullYear() : 2030;
    return ly <= year;
  }).length;

  if (isCollapsed) {
    return (
      <div style={css.collapsed}>
        <button onClick={() => setIsCollapsed(false)} style={css.expandBtn}>
          <span style={css.expandIcon}>▶</span>
          <span style={css.expandLabel}>PANEL</span>
        </button>
      </div>
    );
  }

  return (
    <div style={css.container}>
      {/* Header */}
      <div style={css.header}>
        <div>
          <div style={css.title}>ORBITAL COMMONS</div>
          <div style={css.titleSub}>& FUTURES</div>
        </div>
        <button onClick={() => setIsCollapsed(true)} style={css.collapseBtn}>◀</button>
      </div>

      <div style={css.scrollArea}>
        {/* --- Metrics Strip --- */}
        <div style={css.metricsStrip}>
          <div style={css.metricItem}>
            <span style={css.metricVal}>{metrics.solar_kwh.toFixed(1)}</span>
            <span style={css.metricLabel}>Solar kWh</span>
          </div>
          <div style={css.metricItem}>
            <span style={css.metricVal}>{metrics.grid_kwh.toFixed(1)}</span>
            <span style={css.metricLabel}>Grid kWh</span>
          </div>
          <div style={css.metricItem}>
            <span style={css.metricVal}>{metrics.carbon_per_tflop}</span>
            <span style={css.metricLabel}>gCO₂/TFLOP</span>
          </div>
          <div style={css.metricItem}>
            <span style={css.metricVal}>{metrics.latency_ms}ms</span>
            <span style={css.metricLabel}>Latency</span>
          </div>
        </div>

        {/* --- Three Horizons Bar --- */}
        <div style={css.horizonsBar}>
          {THREE_HORIZONS.map((h) => {
            const isActive = year >= h.yearRange[0] && year < h.yearRange[1];
            return (
              <div key={h.id} style={{
                ...css.horizonSegment,
                flex: h.yearRange[1] - h.yearRange[0],
                background: isActive ? h.color : `${h.color}22`,
                color: isActive ? '#000' : 'rgba(255,255,255,0.3)',
              }}>
                {h.id}
              </div>
            );
          })}
        </div>
        {currentHorizon && (
          <div style={css.horizonDesc}>
            <span style={{ color: currentHorizon.color }}>{currentHorizon.label}</span>
            {' — '}{currentHorizon.description}
          </div>
        )}

        {/* --- Year + Orbit + Workload --- */}
        <div style={css.controlGroup}>
          <div style={css.controlRow}>
            <span style={css.controlLabel}>Year</span>
            <input type="range" min={2025} max={2040} value={year}
              onChange={(e) => onYearChange(Number(e.target.value))} style={css.slider} />
            <span style={css.controlVal}>{year}</span>
          </div>

          <div style={css.controlRow}>
            <span style={css.controlLabel}>Orbit</span>
            <div style={css.btnGroup}>
              {(['LEO', 'MEO', 'GEO'] as OrbitType[]).map((t) => (
                <button key={t} onClick={() => onOrbitTypeChange(t)}
                  style={{ ...css.toggleBtn, ...(orbitType === t ? css.toggleBtnActive : {}) }}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div style={css.controlRow}>
            <span style={css.controlLabel}>Workload</span>
            <div style={css.btnGroup}>
              {WORKLOADS.map((w) => (
                <button key={w.type} onClick={() => onWorkloadChange(w.type)}
                  style={{ ...css.toggleBtn, ...(workloadType === w.type ? css.toggleBtnActive : {}), fontSize: 8, padding: '2px 5px' }}>
                  {w.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* --- Scenarios --- */}
        <button onClick={() => toggle('scenarios')} style={css.sectionBtn}>
          <span>SCENARIOS</span>
          <span style={css.sectionMeta}>
            {isCustom ? 'Custom' : activeScenario?.name ?? 'None'}
            {' '}{openSections.has('scenarios') ? '▾' : '▸'}
          </span>
        </button>
        {openSections.has('scenarios') && (
          <div style={css.sectionContent}>
            {scenarios.map((s) => (
              <button key={s.id} onClick={() => onScenarioSelect(s.id)}
                style={{ ...css.scenarioCard, ...(activeScenarioId === s.id ? css.scenarioActive : {}) }}>
                <div style={css.scenarioName}>{s.name}</div>
                <div style={css.scenarioMeta}>
                  <span>{s.time_horizon}</span>
                  <span>Launch {s.launch_economics === 'low' ? '↓' : s.launch_economics === 'high' ? '↑' : '—'}</span>
                  <span>Grid {s.grid_decarbonization === 'fast' ? '↓C' : s.grid_decarbonization === 'slow' ? '↑C' : '—C'}</span>
                </div>
                <div style={css.scenarioUseCase}>{s.dominant_use_case}</div>
              </button>
            ))}
          </div>
        )}

        {/* --- Levers --- */}
        <button onClick={() => toggle('levers')} style={css.sectionBtn}>
          <span>UNCERTAINTY LEVERS</span>
          <span style={css.sectionMeta}>
            {isCustom && <span style={css.customBadge}>CUSTOM</span>}
            {openSections.has('levers') ? '▾' : '▸'}
          </span>
        </button>
        {openSections.has('levers') && (
          <div style={css.sectionContent}>
            {LEVERS.map((l) => (
              <div key={l.key} style={css.leverRow}>
                <div style={css.leverHeader}>
                  <span style={css.leverLabel}>{l.label}</span>
                  <span style={css.leverVal}>
                    {l.key === 'geopolitical_cooperation'
                      ? leverValues[l.key].toFixed(1)
                      : leverValues[l.key]}{l.unit ? ` ${l.unit}` : ''}
                  </span>
                </div>
                <input type="range" min={l.min} max={l.max} step={l.step}
                  value={leverValues[l.key]}
                  onChange={(e) => onLeverChange({ ...leverValues, [l.key]: Number(e.target.value) })}
                  style={css.slider} />
              </div>
            ))}

            <div style={css.disruptionSection}>
              <div style={css.disruptionHeader}>DISRUPTION EVENTS</div>
              <div style={css.disruptionGrid}>
                {DISRUPTIONS.map((d) => (
                  <button key={d.event} onClick={() => onDisruption(d.event)} style={css.disruptionBtn}>
                    {d.icon} {d.label}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={onRunSimulation} style={css.runBtn}>
              {isSimulating ? '■ STOP' : '▶ RUN SIMULATION'}
            </button>
          </div>
        )}

        {/* --- Actors --- */}
        <button onClick={() => toggle('actors')} style={css.sectionBtn}>
          <span>ACTORS</span>
          <span style={css.sectionMeta}>{visibleActorCount}/{actors.length} {openSections.has('actors') ? '▾' : '▸'}</span>
        </button>
        {openSections.has('actors') && (
          <div style={css.sectionContent}>
            {actors.map((a) => {
              const ly = a.launch_date ? new Date(a.launch_date).getFullYear()
                : a.planned_date ? new Date(a.planned_date).getFullYear() : 2030;
              const visible = ly <= year;
              return (
                <div key={a.id} style={{ ...css.actorCard, opacity: visible ? 1 : 0.35 }}>
                  <div style={css.actorHeader}>
                    <span style={{ ...css.statusDot, background: visible ? '#00CC66' : '#555' }} />
                    <span style={css.actorName}>{a.name}</span>
                  </div>
                  <div style={css.actorMeta}>
                    <span style={{ ...css.orbitBadge, borderColor: orbitColorStr(a.orbit), color: orbitColorStr(a.orbit) }}>
                      {a.orbit} {a.altitude_km < 10000 ? `${a.altitude_km}km` : ''}
                    </span>
                    <span>{a.status.replace('_', ' ')}</span>
                  </div>
                  <div style={css.actorUseCase}>{a.use_case}</div>
                </div>
              );
            })}
          </div>
        )}

        {/* --- CLA --- */}
        <button onClick={() => toggle('cla')} style={css.sectionBtn}>
          <span>CLA ANALYSIS</span>
          <span style={css.sectionMeta}>{openSections.has('cla') ? '▾' : '▸'}</span>
        </button>
        {openSections.has('cla') && activeScenario && (
          <div style={css.sectionContent}>
            <div style={css.claScenario}>{activeScenario.name}</div>
            {CLA_LEVELS.map((l) => (
              <div key={l.key} style={css.claLevel}>
                <div style={css.claHeader}>
                  <span style={{ ...css.claDot, background: l.color }} />
                  <span style={css.claLabel}>{l.label}</span>
                  <span style={css.claDesc}>{l.desc}</span>
                </div>
                <div style={css.claText}>{activeScenario.cla_framing[l.key]}</div>
              </div>
            ))}
            <div style={css.sourcesSection}>
              <div style={css.sourcesHeader}>INFORMED BY</div>
              {activeScenario.informed_by.map((s, i) => (
                <div key={i} style={css.sourceItem}>• {s}</div>
              ))}
            </div>
          </div>
        )}
        {openSections.has('cla') && !activeScenario && (
          <div style={{ ...css.sectionContent, color: 'rgba(255,255,255,0.3)', fontSize: 10 }}>
            Select a scenario to view CLA analysis
          </div>
        )}

        {/* --- Live Data --- */}
        <button onClick={() => toggle('live')} style={css.sectionBtn}>
          <span>
            <span style={{ ...css.liveDot, background: liveData.isLoading ? '#D4A017' : liveData.satellite || liveData.tle ? '#00CC66' : '#555' }} />
            LIVE DATA
          </span>
          <span style={css.sectionMeta}>{openSections.has('live') ? '▾' : '▸'}</span>
        </button>
        {openSections.has('live') && (
          <div style={css.sectionContent}>
            <button onClick={onRefreshData} style={css.refreshBtn}>↻ Refresh</button>
            {liveData.satellite && (
              <div style={css.liveRow}>
                <span style={css.liveKey}>N2YO</span>
                <span>{liveData.satellite.satlatitude.toFixed(1)}°, {liveData.satellite.satlongitude.toFixed(1)}°</span>
              </div>
            )}
            {liveData.tle && (
              <div style={css.liveRow}>
                <span style={css.liveKey}>TLE</span>
                <span>{liveData.tle.name} · {altitudeFromTLE(liveData.tle).toFixed(0)}km</span>
              </div>
            )}
            {liveData.carbon && (
              <div style={css.liveRow}>
                <span style={css.liveKey}>CO₂</span>
                <span>{liveData.carbon.zone} {liveData.carbon.carbonIntensity} gCO₂/kWh</span>
              </div>
            )}
            {liveData.solarBaselines && (
              <div style={css.liveRow}>
                <span style={css.liveKey}>Solar</span>
                <span>{liveData.solarBaselines.length} regions cached</span>
              </div>
            )}
            {liveData.error && (
              <div style={{ ...css.liveRow, color: '#FF6B35' }}>{liveData.error}</div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={css.footer}>
        <span style={css.footerText}>Speculative Simulation · Not Predictive</span>
      </div>
    </div>
  );
}

function orbitColorStr(orbit: string): string {
  const map: Record<string, string> = { LEO: '#4A90D9', MEO: '#D4A017', GEO: '#FF6B35', Lunar: '#C084FC' };
  return map[orbit] ?? '#888';
}

const css: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute', top: 0, left: 0, bottom: 0,
    width: 340, background: 'rgba(8, 8, 12, 0.95)',
    backdropFilter: 'blur(20px)',
    borderRight: '1px solid rgba(255,255,255,0.06)',
    display: 'flex', flexDirection: 'column',
    fontFamily: '"DM Mono", monospace', fontSize: 10,
    color: 'rgba(255,255,255,0.6)', zIndex: 30,
    userSelect: 'none',
  },
  collapsed: {
    position: 'absolute', top: 12, left: 12, zIndex: 30,
  },
  expandBtn: {
    display: 'flex', alignItems: 'center', gap: 6,
    background: 'rgba(8,8,12,0.9)', backdropFilter: 'blur(8px)',
    border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6,
    padding: '8px 14px', cursor: 'pointer',
    fontFamily: '"DM Mono", monospace', fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
  },
  expandIcon: { fontSize: 8 },
  expandLabel: { letterSpacing: 2, fontSize: 9 },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    padding: '16px 16px 12px',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
  },
  title: {
    fontFamily: '"Inter", sans-serif', fontSize: 14, fontWeight: 600,
    letterSpacing: 3, color: 'rgba(255,255,255,0.7)',
  },
  titleSub: {
    fontFamily: '"Inter", sans-serif', fontSize: 14, fontWeight: 600,
    letterSpacing: 3, color: 'rgba(255,215,0,0.6)',
  },
  collapseBtn: {
    background: 'transparent', border: 'none',
    color: 'rgba(255,255,255,0.3)', fontSize: 10, cursor: 'pointer',
    padding: '4px 6px',
  },
  scrollArea: {
    flex: 1, overflowY: 'auto', overflowX: 'hidden',
    scrollbarWidth: 'thin' as const,
    scrollbarColor: 'rgba(255,255,255,0.08) transparent',
  },
  metricsStrip: {
    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 2, padding: '10px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
  },
  metricItem: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
  },
  metricVal: {
    fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.8)',
    fontVariantNumeric: 'tabular-nums',
  },
  metricLabel: { fontSize: 7, color: 'rgba(255,255,255,0.25)', letterSpacing: 0.5 },
  horizonsBar: {
    display: 'flex', margin: '10px 16px 0', height: 14, borderRadius: 3, overflow: 'hidden',
  },
  horizonSegment: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 7, fontWeight: 500, letterSpacing: 1,
    transition: 'all 0.3s',
  },
  horizonDesc: {
    padding: '4px 16px 8px', fontSize: 8, color: 'rgba(255,255,255,0.35)', lineHeight: '1.4',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
  },
  controlGroup: {
    padding: '10px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
  },
  controlRow: {
    display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6,
  },
  controlLabel: {
    fontSize: 9, color: 'rgba(255,255,255,0.35)', minWidth: 50,
  },
  controlVal: {
    fontSize: 11, color: '#FFD700', minWidth: 30, textAlign: 'right' as const,
    fontVariantNumeric: 'tabular-nums',
  },
  slider: {
    flex: 1, height: 3, accentColor: '#FFD700', cursor: 'pointer',
  },
  btnGroup: { display: 'flex', gap: 2 },
  toggleBtn: {
    background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 3, color: 'rgba(255,255,255,0.35)',
    fontFamily: '"DM Mono", monospace', fontSize: 9,
    padding: '2px 8px', cursor: 'pointer', transition: 'all 0.2s',
  },
  toggleBtnActive: {
    background: 'rgba(255,215,0,0.12)', borderColor: 'rgba(255,215,0,0.3)',
    color: '#FFD700',
  },
  sectionBtn: {
    width: '100%', display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', padding: '8px 16px',
    background: 'transparent', border: 'none',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    color: 'rgba(255,255,255,0.4)', cursor: 'pointer',
    fontFamily: '"DM Mono", monospace', fontSize: 8,
    letterSpacing: 2, fontWeight: 500, textAlign: 'left' as const,
  },
  sectionMeta: {
    fontSize: 8, color: 'rgba(255,255,255,0.25)', letterSpacing: 0,
    display: 'flex', alignItems: 'center', gap: 6,
  },
  sectionContent: { padding: '8px 16px 12px' },
  customBadge: {
    fontSize: 7, padding: '1px 5px', borderRadius: 3,
    background: 'rgba(255,107,53,0.15)', color: '#FF6B35',
  },
  scenarioCard: {
    width: '100%', textAlign: 'left' as const,
    background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 5, padding: '7px 9px', marginBottom: 4,
    cursor: 'pointer', fontFamily: '"DM Mono", monospace',
    color: 'rgba(255,255,255,0.55)', transition: 'all 0.2s',
  },
  scenarioActive: {
    background: 'rgba(255,215,0,0.06)', borderColor: 'rgba(255,215,0,0.25)',
    color: '#FFD700',
  },
  scenarioName: { fontSize: 10, fontWeight: 500, marginBottom: 2 },
  scenarioMeta: {
    display: 'flex', gap: 8, fontSize: 8, color: 'rgba(255,255,255,0.3)', marginBottom: 2,
  },
  scenarioUseCase: { fontSize: 8, color: 'rgba(255,255,255,0.25)' },
  leverRow: { marginBottom: 8 },
  leverHeader: {
    display: 'flex', justifyContent: 'space-between', marginBottom: 2,
  },
  leverLabel: { fontSize: 9, color: 'rgba(255,255,255,0.4)' },
  leverVal: {
    fontSize: 9, color: 'rgba(255,255,255,0.6)', fontVariantNumeric: 'tabular-nums',
  },
  disruptionSection: { marginTop: 12 },
  disruptionHeader: {
    fontSize: 7, letterSpacing: 2, color: 'rgba(255,255,255,0.2)', marginBottom: 6,
  },
  disruptionGrid: { display: 'flex', flexWrap: 'wrap' as const, gap: 3 },
  disruptionBtn: {
    background: 'rgba(255,60,60,0.05)', border: '1px solid rgba(255,60,60,0.12)',
    borderRadius: 3, padding: '3px 7px', cursor: 'pointer',
    fontFamily: '"DM Mono", monospace', fontSize: 8,
    color: 'rgba(255,150,150,0.6)', transition: 'all 0.2s',
  },
  runBtn: {
    width: '100%', marginTop: 12, padding: '8px 0',
    background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.3)',
    borderRadius: 5, cursor: 'pointer',
    fontFamily: '"DM Mono", monospace', fontSize: 10,
    letterSpacing: 2, color: '#FFD700', fontWeight: 500,
    transition: 'all 0.2s',
  },
  actorCard: {
    padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.03)',
    transition: 'opacity 0.3s',
  },
  actorHeader: {
    display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2,
  },
  statusDot: { width: 5, height: 5, borderRadius: '50%', flexShrink: 0 },
  actorName: { fontSize: 10, color: 'rgba(255,255,255,0.65)' },
  actorMeta: {
    display: 'flex', gap: 6, alignItems: 'center', paddingLeft: 11,
    fontSize: 8, color: 'rgba(255,255,255,0.3)', marginBottom: 2,
  },
  orbitBadge: {
    fontSize: 8, padding: '0px 4px', borderRadius: 2, border: '1px solid',
  },
  actorUseCase: {
    fontSize: 8, color: 'rgba(255,255,255,0.25)', paddingLeft: 11,
  },
  claScenario: {
    fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 10,
  },
  claLevel: { marginBottom: 8 },
  claHeader: {
    display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2,
  },
  claDot: { width: 5, height: 5, borderRadius: '50%', flexShrink: 0 },
  claLabel: { fontSize: 8, fontWeight: 500, letterSpacing: 1, color: 'rgba(255,255,255,0.45)' },
  claDesc: { fontSize: 7, color: 'rgba(255,255,255,0.2)' },
  claText: {
    fontSize: 10, lineHeight: '1.5', color: 'rgba(255,255,255,0.55)', paddingLeft: 10,
  },
  sourcesSection: {
    marginTop: 10, paddingTop: 8,
    borderTop: '1px solid rgba(255,255,255,0.04)',
  },
  sourcesHeader: { fontSize: 7, letterSpacing: 2, color: 'rgba(255,255,255,0.2)', marginBottom: 4 },
  sourceItem: { fontSize: 8, color: 'rgba(255,255,255,0.3)', marginBottom: 2 },
  liveDot: {
    display: 'inline-block', width: 5, height: 5, borderRadius: '50%',
    marginRight: 6, verticalAlign: 'middle',
  },
  refreshBtn: {
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 3, padding: '3px 10px', cursor: 'pointer',
    fontFamily: '"DM Mono", monospace', fontSize: 9,
    color: 'rgba(255,255,255,0.4)', marginBottom: 8,
  },
  liveRow: {
    display: 'flex', gap: 8, marginBottom: 3,
    fontSize: 9, color: 'rgba(255,255,255,0.5)',
  },
  liveKey: { color: 'rgba(255,255,255,0.25)', minWidth: 30 },
  footer: {
    padding: '8px 16px',
    borderTop: '1px solid rgba(255,255,255,0.04)',
    textAlign: 'center' as const,
  },
  footerText: { fontSize: 7, color: 'rgba(255,255,255,0.15)', letterSpacing: 1 },
};
