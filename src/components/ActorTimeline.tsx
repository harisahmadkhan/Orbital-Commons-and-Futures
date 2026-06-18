import { useState } from 'react';
import type { Actor } from '../types';

interface ActorTimelineProps {
  actors: Actor[];
  year: number;
}

const ORBIT_COLORS: Record<string, string> = {
  LEO: '#4A90D9',
  MEO: '#D4A017',
  GEO: '#FF6B35',
  Lunar: '#C084FC',
};

const STATUS_COLORS: Record<string, string> = {
  operational: '#00CC66',
  planned: '#D4A017',
  in_development: '#4A90D9',
  concept: '#666',
};

export function ActorTimeline({ actors, year }: ActorTimelineProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const visibleActors = actors.filter((a) => {
    const launchYear = a.launch_date
      ? new Date(a.launch_date).getFullYear()
      : a.planned_date
      ? new Date(a.planned_date).getFullYear()
      : 2030;
    return launchYear <= year;
  });

  return (
    <div style={styles.container}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={styles.toggle}
      >
        <span style={styles.toggleLabel}>ACTORS</span>
        <span style={styles.count}>{visibleActors.length}/{actors.length}</span>
        <span style={styles.toggleArrow}>{isExpanded ? '▸' : '◂'}</span>
      </button>

      {isExpanded && (
        <div style={styles.panel}>
          <div style={styles.header}>ORBITAL DC ACTORS — {year}</div>
          {actors.map((actor) => {
            const launchYear = actor.launch_date
              ? new Date(actor.launch_date).getFullYear()
              : actor.planned_date
              ? new Date(actor.planned_date).getFullYear()
              : 2030;
            const isVisible = launchYear <= year;

            return (
              <div
                key={actor.id}
                style={{
                  ...styles.actorCard,
                  opacity: isVisible ? 1 : 0.35,
                }}
              >
                <div style={styles.actorHeader}>
                  <span
                    style={{
                      ...styles.statusDot,
                      backgroundColor: STATUS_COLORS[actor.status],
                    }}
                  />
                  <span style={styles.actorName}>{actor.name}</span>
                </div>
                <div style={styles.actorMeta}>
                  <span
                    style={{
                      ...styles.orbitTag,
                      borderColor: ORBIT_COLORS[actor.orbit] ?? '#666',
                      color: ORBIT_COLORS[actor.orbit] ?? '#666',
                    }}
                  >
                    {actor.orbit} {actor.altitude_km < 10000 ? `${actor.altitude_km}km` : ''}
                  </span>
                  <span style={styles.actorStatus}>{actor.status.replace('_', ' ')}</span>
                </div>
                <div style={styles.actorUseCase}>{actor.use_case}</div>
                {actor.launch_date && (
                  <div style={styles.actorDate}>Launched: {actor.launch_date}</div>
                )}
                {!actor.launch_date && actor.planned_date && (
                  <div style={styles.actorDate}>Planned: {actor.planned_date.slice(0, 7)}</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    top: '50%',
    right: 12,
    transform: 'translateY(-50%)',
    fontFamily: '"DM Mono", monospace',
    zIndex: 10,
    display: 'flex',
    alignItems: 'flex-start',
    gap: 4,
    flexDirection: 'row-reverse' as const,
  },
  toggle: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 4,
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
  count: {
    writingMode: 'horizontal-tb' as const,
    fontSize: 8,
    color: '#FFD700',
  },
  toggleArrow: {
    fontSize: 8,
    writingMode: 'horizontal-tb' as const,
  },
  panel: {
    background: 'rgba(10, 10, 15, 0.92)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 6,
    padding: 12,
    width: 240,
    maxHeight: '60vh',
    overflowY: 'auto' as const,
  },
  header: {
    fontSize: 8,
    fontWeight: 500,
    letterSpacing: 2,
    color: 'rgba(255, 255, 255, 0.25)',
    marginBottom: 8,
  },
  actorCard: {
    padding: '8px 0',
    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
    transition: 'opacity 0.3s',
  },
  actorHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: '50%',
    flexShrink: 0,
  },
  actorName: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: '1.3',
  },
  actorMeta: {
    display: 'flex',
    gap: 6,
    alignItems: 'center',
    marginBottom: 3,
    paddingLeft: 11,
  },
  orbitTag: {
    fontSize: 8,
    padding: '1px 4px',
    borderRadius: 2,
    border: '1px solid',
  },
  actorStatus: {
    fontSize: 8,
    color: 'rgba(255, 255, 255, 0.3)',
    textTransform: 'capitalize' as const,
  },
  actorUseCase: {
    fontSize: 8,
    color: 'rgba(255, 255, 255, 0.35)',
    paddingLeft: 11,
    lineHeight: '1.4',
  },
  actorDate: {
    fontSize: 8,
    color: 'rgba(255, 255, 255, 0.25)',
    paddingLeft: 11,
    marginTop: 2,
  },
};
