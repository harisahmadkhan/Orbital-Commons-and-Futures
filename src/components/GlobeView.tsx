import { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import type { OrbitType, Actor } from '../types';
import { ORBIT_CONFIGS } from '../types';
import type { TLEData } from '../engine/api';
import { altitudeFromTLE } from '../engine/api';

interface OrbitalObject {
  group: THREE.Group;
  coreMesh: THREE.Mesh;
  glowSprite: THREE.Sprite;
  trail: THREE.Line;
  orbitLine: THREE.Line;
  trailPositions: THREE.Vector3[];
  orbitRadius: number;
  speed: number;
  inclination: number;
  phase: number;
  actor: Actor;
  labelEl: HTMLDivElement;
}

interface GlobeViewProps {
  actors: Actor[];
  year: number;
  orbitType: OrbitType;
  tle: TLEData | null;
  isSimulating: boolean;
  simulationDensity: number;
}

const EARTH_RADIUS = 1;
const SCALE_FACTOR = 1 / 6371;
const TRAIL_LENGTH = 120;

const ORBIT_COLORS: Record<string, number> = {
  LEO: 0x4a90d9,
  MEO: 0xd4a017,
  GEO: 0xff6b35,
  Lunar: 0xc084fc,
};

const ORBIT_COLOR_STR: Record<string, string> = {
  LEO: '#4A90D9',
  MEO: '#D4A017',
  GEO: '#FF6B35',
  Lunar: '#C084FC',
};

function createGlowTexture(color: THREE.Color): THREE.Texture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const cx = size / 2;
  const grad = ctx.createRadialGradient(cx, cx, 0, cx, cx, cx);
  grad.addColorStop(0, `rgba(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)}, 1)`);
  grad.addColorStop(0.15, `rgba(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)}, 0.8)`);
  grad.addColorStop(0.4, `rgba(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)}, 0.2)`);
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  return tex;
}

export function GlobeView({ actors, year, orbitType, tle, isSimulating, simulationDensity }: GlobeViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    earth: THREE.Mesh;
    atmosphere: THREE.Mesh;
    orbitals: OrbitalObject[];
    simOrbitals: THREE.Mesh[];
    stars: THREE.Points;
    sunLight: THREE.DirectionalLight;
    raycaster: THREE.Raycaster;
    mouse: THREE.Vector2;
    isDragging: boolean;
    lastMouse: { x: number; y: number };
    rotationVelocity: { x: number; y: number };
    targetRotation: { x: number; y: number };
    zoom: number;
  } | null>(null);
  const frameRef = useRef(0);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const createScene = useCallback((container: HTMLDivElement) => {
    const w = container.clientWidth;
    const h = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050508);

    const camera = new THREE.PerspectiveCamera(45, w / h, 0.01, 100);
    camera.position.set(0, 0, 3.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0x222233, 0.6);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffeedd, 2.5);
    sunLight.position.set(5, 2, 5);
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight(0x4466aa, 0.4);
    rimLight.position.set(-3, 1, -2);
    scene.add(rimLight);

    const loader = new THREE.TextureLoader();
    const earthGeo = new THREE.SphereGeometry(EARTH_RADIUS, 96, 96);
    const dayTexture = loader.load('/textures/earth_day.jpg');
    const nightTexture = loader.load('/textures/earth_night.jpg');
    const bumpTexture = loader.load('/textures/earth_topology.png');
    dayTexture.colorSpace = THREE.SRGBColorSpace;
    nightTexture.colorSpace = THREE.SRGBColorSpace;

    const earthMat = new THREE.ShaderMaterial({
      uniforms: {
        dayMap: { value: dayTexture },
        nightMap: { value: nightTexture },
        bumpMap: { value: bumpTexture },
        sunDirection: { value: new THREE.Vector3(1, 0.3, 0.5).normalize() },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPos.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform sampler2D dayMap;
        uniform sampler2D nightMap;
        uniform sampler2D bumpMap;
        uniform vec3 sunDirection;
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        void main() {
          vec3 normal = normalize(vNormal);
          float sunDot = dot(normal, sunDirection);
          float dayFactor = smoothstep(-0.15, 0.25, sunDot);
          vec4 dayColor = texture2D(dayMap, vUv);
          vec4 nightColor = texture2D(nightMap, vUv);
          float bump = texture2D(bumpMap, vUv).r;
          float bumpLight = 0.9 + bump * 0.15;
          vec4 finalColor = mix(nightColor * 1.2, dayColor * bumpLight, dayFactor);
          float specular = pow(max(0.0, dot(reflect(-sunDirection, normal), normalize(-vWorldPosition))), 20.0);
          specular *= (1.0 - bump) * 0.4 * dayFactor;
          finalColor.rgb += vec3(specular);
          float rim = 1.0 - max(0.0, dot(normal, normalize(-vWorldPosition)));
          finalColor.rgb += vec3(0.3, 0.5, 1.0) * pow(rim, 3.0) * 0.15 * dayFactor;
          gl_FragColor = finalColor;
        }
      `,
    });
    const earth = new THREE.Mesh(earthGeo, earthMat);
    scene.add(earth);

    const atmosGeo = new THREE.SphereGeometry(EARTH_RADIUS * 1.015, 64, 64);
    const atmosMat = new THREE.MeshPhongMaterial({
      color: 0x4488cc, transparent: true, opacity: 0.08,
      side: THREE.FrontSide, depthWrite: false,
    });
    const atmosphere = new THREE.Mesh(atmosGeo, atmosMat);
    scene.add(atmosphere);

    const glowGeo = new THREE.SphereGeometry(EARTH_RADIUS * 1.08, 32, 32);
    const glowMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.65 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0);
          gl_FragColor = vec4(0.3, 0.5, 1.0, intensity * 0.4);
        }
      `,
      side: THREE.BackSide, transparent: true, depthWrite: false,
    });
    scene.add(new THREE.Mesh(glowGeo, glowMat));

    const stars = createStars();
    scene.add(stars);

    return {
      scene, camera, renderer, earth, atmosphere,
      orbitals: [] as OrbitalObject[],
      simOrbitals: [] as THREE.Mesh[],
      stars, sunLight,
      raycaster: new THREE.Raycaster(),
      mouse: new THREE.Vector2(),
      isDragging: false,
      lastMouse: { x: 0, y: 0 },
      rotationVelocity: { x: 0, y: 0 },
      targetRotation: { x: 0.3, y: 0 },
      zoom: 3.5,
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const s = createScene(container);
    sceneRef.current = s;

    const onResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      s.camera.aspect = w / h;
      s.camera.updateProjectionMatrix();
      s.renderer.setSize(w, h);
    };

    const onMouseDown = (e: MouseEvent) => {
      s.isDragging = true;
      s.lastMouse = { x: e.clientX, y: e.clientY };
      s.rotationVelocity = { x: 0, y: 0 };
    };

    const onMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      s.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      s.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      if (s.isDragging) {
        const dx = e.clientX - s.lastMouse.x;
        const dy = e.clientY - s.lastMouse.y;
        s.targetRotation.y += dx * 0.005;
        s.targetRotation.x += dy * 0.005;
        s.targetRotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, s.targetRotation.x));
        s.rotationVelocity = { x: dy * 0.002, y: dx * 0.002 };
        s.lastMouse = { x: e.clientX, y: e.clientY };
      }
    };

    const onMouseUp = () => { s.isDragging = false; };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      s.zoom = Math.max(1.8, Math.min(8, s.zoom + e.deltaY * 0.002));
    };

    container.addEventListener('mousedown', onMouseDown);
    container.addEventListener('mousemove', onMouseMove);
    container.addEventListener('mouseup', onMouseUp);
    container.addEventListener('mouseleave', onMouseUp);
    container.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('resize', onResize);

    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);

      if (!s.isDragging) {
        s.targetRotation.y += 0.001;
        s.rotationVelocity.x *= 0.95;
        s.rotationVelocity.y *= 0.95;
        s.targetRotation.x += s.rotationVelocity.x;
        s.targetRotation.y += s.rotationVelocity.y;
      }

      s.earth.rotation.x += (s.targetRotation.x - s.earth.rotation.x) * 0.05;
      s.earth.rotation.y += (s.targetRotation.y - s.earth.rotation.y) * 0.05;
      s.atmosphere.rotation.copy(s.earth.rotation);

      const camDist = s.camera.position.length();
      const targetDist = s.zoom;
      const newDist = camDist + (targetDist - camDist) * 0.08;
      s.camera.position.normalize().multiplyScalar(newDist);
      s.camera.lookAt(0, 0, 0);

      const time = Date.now() * 0.001;
      const sunPos = new THREE.Vector3(
        Math.cos(time * 0.05) * 5, 2, Math.sin(time * 0.05) * 5
      );
      s.sunLight.position.copy(sunPos);
      const earthMat = s.earth.material as THREE.ShaderMaterial;
      if (earthMat.uniforms?.sunDirection) {
        earthMat.uniforms.sunDirection.value.copy(sunPos).normalize();
      }

      const rect = container.getBoundingClientRect();

      for (const obj of s.orbitals) {
        const angle = time * obj.speed + obj.phase;
        const r = obj.orbitRadius;
        const inc = obj.inclination;
        obj.group.position.set(
          Math.cos(angle) * r,
          Math.sin(angle) * Math.sin(inc) * r,
          Math.sin(angle) * Math.cos(inc) * r
        );

        // Pulse the glow
        const pulse = 0.9 + Math.sin(time * 3 + obj.phase) * 0.1;
        obj.glowSprite.scale.setScalar(0.12 * pulse);

        // Trail
        obj.trailPositions.push(obj.group.position.clone());
        if (obj.trailPositions.length > TRAIL_LENGTH) obj.trailPositions.shift();
        const trailGeo = obj.trail.geometry as THREE.BufferGeometry;
        const positions = new Float32Array(obj.trailPositions.length * 3);
        obj.trailPositions.forEach((p, i) => {
          positions[i * 3] = p.x;
          positions[i * 3 + 1] = p.y;
          positions[i * 3 + 2] = p.z;
        });
        trailGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        trailGeo.setDrawRange(0, obj.trailPositions.length);

        // Update HTML label position
        const projected = obj.group.position.clone().project(s.camera);
        if (projected.z < 1) {
          const sx = (projected.x * 0.5 + 0.5) * rect.width;
          const sy = (-projected.y * 0.5 + 0.5) * rect.height;
          obj.labelEl.style.transform = `translate(${sx + 14}px, ${sy - 8}px)`;
          obj.labelEl.style.display = 'block';
        } else {
          obj.labelEl.style.display = 'none';
        }
      }

      // Hover detection
      s.raycaster.setFromCamera(s.mouse, s.camera);
      const coreMeshes = s.orbitals.map((o) => o.coreMesh);
      const intersects = s.raycaster.intersectObjects(coreMeshes);
      if (intersects.length > 0 && tooltipRef.current) {
        const obj = s.orbitals.find((o) => o.coreMesh === intersects[0].object);
        if (obj) {
          const projected = obj.group.position.clone().project(s.camera);
          const sx = (projected.x * 0.5 + 0.5) * rect.width;
          const sy = (-projected.y * 0.5 + 0.5) * rect.height;
          tooltipRef.current.style.left = `${sx + 20}px`;
          tooltipRef.current.style.top = `${sy + 10}px`;
          tooltipRef.current.style.display = 'block';
          tooltipRef.current.innerHTML = `
            <div style="font-weight:500;color:${ORBIT_COLOR_STR[obj.actor.orbit] ?? '#fff'};margin-bottom:3px">${obj.actor.name}</div>
            <div style="margin-bottom:2px">${obj.actor.orbit} · ${obj.actor.altitude_km.toLocaleString()}km</div>
            <div style="color:rgba(255,255,255,0.45);font-size:9px">${obj.actor.use_case}</div>
            <div style="color:rgba(255,255,255,0.3);font-size:8px;margin-top:3px">${obj.actor.status.replace('_', ' ')} · ${obj.actor.funding_status}</div>
          `;
        }
      } else if (tooltipRef.current) {
        tooltipRef.current.style.display = 'none';
      }

      s.renderer.render(s.scene, s.camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(frameRef.current);
      container.removeEventListener('mousedown', onMouseDown);
      container.removeEventListener('mousemove', onMouseMove);
      container.removeEventListener('mouseup', onMouseUp);
      container.removeEventListener('mouseleave', onMouseUp);
      container.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', onResize);
      s.renderer.dispose();
      if (container.contains(s.renderer.domElement)) {
        container.removeChild(s.renderer.domElement);
      }
    };
  }, [createScene]);

  // Rebuild satellites when actors/year changes
  useEffect(() => {
    const s = sceneRef.current;
    const labelsContainer = labelsRef.current;
    if (!s || !labelsContainer) return;

    // Clean up old
    for (const obj of s.orbitals) {
      s.scene.remove(obj.group);
      s.scene.remove(obj.trail);
      s.scene.remove(obj.orbitLine);
      obj.labelEl.remove();
    }
    s.orbitals = [];

    const visibleActors = actors.filter((a) => {
      const launchYear = a.launch_date
        ? new Date(a.launch_date).getFullYear()
        : a.planned_date
        ? new Date(a.planned_date).getFullYear()
        : 2030;
      return launchYear <= year;
    });

    for (const actor of visibleActors) {
      let altKm = actor.altitude_km;
      if (tle && actor.id === 'starcloud') {
        altKm = altitudeFromTLE(tle);
      }

      const orbitRadius = EARTH_RADIUS + Math.max(altKm * SCALE_FACTOR * 8, 0.15);
      const color = new THREE.Color(ORBIT_COLORS[actor.orbit] ?? 0x888888);
      const colorHex = ORBIT_COLORS[actor.orbit] ?? 0x888888;
      const colorStr = ORBIT_COLOR_STR[actor.orbit] ?? '#888';
      const inc = (actor.orbital_params?.inclination_deg ?? 45) * Math.PI / 180;

      // Satellite group
      const group = new THREE.Group();

      // Core bright dot
      const coreGeo = new THREE.SphereGeometry(0.025, 12, 12);
      const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const coreMesh = new THREE.Mesh(coreGeo, coreMat);
      group.add(coreMesh);

      // Glow sprite
      const glowTex = createGlowTexture(color);
      const glowMat = new THREE.SpriteMaterial({
        map: glowTex,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
      });
      const glowSprite = new THREE.Sprite(glowMat);
      glowSprite.scale.setScalar(0.12);
      group.add(glowSprite);

      s.scene.add(group);

      // Orbit path (full ellipse, dashed)
      const orbitPts: THREE.Vector3[] = [];
      for (let i = 0; i <= 256; i++) {
        const a = (i / 256) * Math.PI * 2;
        orbitPts.push(new THREE.Vector3(
          Math.cos(a) * orbitRadius,
          Math.sin(a) * Math.sin(inc) * orbitRadius,
          Math.sin(a) * Math.cos(inc) * orbitRadius
        ));
      }
      const orbitGeo = new THREE.BufferGeometry().setFromPoints(orbitPts);
      const orbitMat = new THREE.LineDashedMaterial({
        color: colorHex,
        transparent: true,
        opacity: 0.15,
        dashSize: 0.05,
        gapSize: 0.03,
      });
      const orbitLine = new THREE.Line(orbitGeo, orbitMat);
      orbitLine.computeLineDistances();
      s.scene.add(orbitLine);

      // Trail (bright, follows satellite)
      const trailGeo = new THREE.BufferGeometry();
      trailGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(TRAIL_LENGTH * 3), 3));
      const trailMat = new THREE.LineBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 0.5,
      });
      const trail = new THREE.Line(trailGeo, trailMat);
      s.scene.add(trail);

      // HTML label
      const labelEl = document.createElement('div');
      labelEl.style.cssText = `
        position:absolute; top:0; left:0; pointer-events:none;
        font-family:"DM Mono",monospace; font-size:11px;
        color:${colorStr}; white-space:nowrap; display:none;
        text-shadow: 0 0 6px rgba(0,0,0,0.8), 0 0 2px rgba(0,0,0,0.9);
        letter-spacing: 0.5px;
      `;
      labelEl.textContent = actor.name.split('(')[0].trim();
      labelsContainer.appendChild(labelEl);

      const config = ORBIT_CONFIGS[actor.orbit === 'Lunar' ? 'GEO' : actor.orbit];
      const speed = (2 * Math.PI) / (config.orbital_period_min * 60) * 50;

      s.orbitals.push({
        group, coreMesh, glowSprite, trail, orbitLine,
        trailPositions: [],
        orbitRadius, speed, inclination: inc,
        phase: Math.random() * Math.PI * 2,
        actor, labelEl,
      });
    }

    // Simulation density dots
    if (isSimulating) {
      for (const m of s.simOrbitals) {
        s.scene.remove(m);
        m.geometry.dispose();
        (m.material as THREE.Material).dispose();
      }
      s.simOrbitals = [];

      const extraCount = Math.floor(simulationDensity * 30);
      for (let i = 0; i < extraCount; i++) {
        const r = EARTH_RADIUS + (0.12 + Math.random() * 0.4);
        const geo = new THREE.SphereGeometry(0.01, 6, 6);
        const mat = new THREE.MeshBasicMaterial({
          color: 0xffd700, transparent: true, opacity: 0.5,
        });
        const m = new THREE.Mesh(geo, mat);
        const angle = Math.random() * Math.PI * 2;
        const incR = (Math.random() - 0.5) * Math.PI * 0.8;
        m.position.set(
          Math.cos(angle) * r,
          Math.sin(incR) * r * 0.3,
          Math.sin(angle) * r
        );
        s.scene.add(m);
        s.simOrbitals.push(m);
      }
    }

    return () => {
      for (const obj of s.orbitals) {
        obj.labelEl.remove();
      }
    };
  }, [actors, year, tle, isSimulating, simulationDensity, orbitType]);

  return (
    <div ref={containerRef} style={styles.container}>
      <div ref={labelsRef} style={styles.labelsLayer} />
      <div ref={tooltipRef} style={styles.tooltip} />
    </div>
  );
}

function createStars(): THREE.Points {
  const starCount = 3000;
  const positions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const r = 30 + Math.random() * 20;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color: 0xffffff, size: 0.05,
    transparent: true, opacity: 0.6, sizeAttenuation: true,
  });
  return new THREE.Points(geo, mat);
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%', height: '100%',
    position: 'relative', cursor: 'grab', overflow: 'hidden',
  },
  labelsLayer: {
    position: 'absolute', inset: 0,
    pointerEvents: 'none', zIndex: 10,
    overflow: 'hidden',
  },
  tooltip: {
    position: 'absolute', display: 'none',
    background: 'rgba(8, 8, 12, 0.94)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: 8, padding: '10px 14px',
    fontFamily: '"DM Mono", monospace', fontSize: 11,
    color: 'rgba(255, 255, 255, 0.75)',
    pointerEvents: 'none', zIndex: 20,
    maxWidth: 260, lineHeight: '1.6',
    boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
  },
};
