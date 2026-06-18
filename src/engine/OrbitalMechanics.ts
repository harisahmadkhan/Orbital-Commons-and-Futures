import type { OrbitType } from '../types';
import { ORBIT_CONFIGS } from '../types';

const EARTH_RADIUS_KM = 6371;
const TWO_PI = Math.PI * 2;

export interface GroundStation {
  name: string;
  lat: number;
  lon: number;
  canvasX?: number;
  canvasY?: number;
}

export const GROUND_STATIONS: GroundStation[] = [
  { name: 'Svalbard', lat: 78.2, lon: 15.6 },
  { name: 'Fairbanks', lat: 64.8, lon: -147.7 },
  { name: 'Perth', lat: -31.9, lon: 115.9 },
  { name: 'Santiago', lat: -33.4, lon: -70.6 },
  { name: 'Kourou', lat: 5.2, lon: -52.8 },
];

export class OrbitalMechanics {
  private angle = 0;
  private orbitType: OrbitType = 'LEO';
  private eclipseStart = Math.PI * 0.85;
  private eclipseEnd = Math.PI * 1.15;

  getConfig() {
    return ORBIT_CONFIGS[this.orbitType];
  }

  setOrbitType(type: OrbitType) {
    this.orbitType = type;
  }

  getOrbitType() {
    return this.orbitType;
  }

  update(dt: number, timeScale: number) {
    const config = this.getConfig();
    const periodSeconds = config.orbital_period_min * 60;
    const angularSpeed = TWO_PI / periodSeconds;
    this.angle = (this.angle + angularSpeed * dt * timeScale) % TWO_PI;
  }

  getAngle() {
    return this.angle;
  }

  isInEclipse(): boolean {
    return this.angle > this.eclipseStart && this.angle < this.eclipseEnd;
  }

  isCoverageActive(groundStationAngle: number): boolean {
    if (this.orbitType === 'GEO') return true;

    const config = this.getConfig();
    const maxElevation = Math.acos(
      EARTH_RADIUS_KM / (EARTH_RADIUS_KM + config.altitude_km)
    );
    const angularDiff = Math.abs(this.angle - groundStationAngle);
    const normalizedDiff = angularDiff > Math.PI ? TWO_PI - angularDiff : angularDiff;
    return normalizedDiff < maxElevation;
  }

  getOrbitalPosition(
    centerX: number,
    centerY: number,
    orbitRadiusPixels: number
  ): { x: number; y: number } {
    return {
      x: centerX + Math.cos(this.angle) * orbitRadiusPixels,
      y: centerY - Math.sin(this.angle) * orbitRadiusPixels * 0.3,
    };
  }

  getDownlinkBeamWidth(): number {
    const horizonAngle = Math.PI * 0.5;
    const distFromHorizon = Math.min(
      Math.abs(this.angle - horizonAngle),
      Math.abs(this.angle - (horizonAngle + Math.PI))
    );
    return Math.max(0.1, 1 - distFromHorizon / (Math.PI * 0.4));
  }

  getSolarIrradiance(): number {
    if (this.isInEclipse()) return 0;
    return 1361;
  }

  getLatencyMs(): number {
    return this.getConfig().latency_ms;
  }
}
