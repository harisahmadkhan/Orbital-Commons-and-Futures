import { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import type { OrbitType, Actor } from '../types';
import { ORBIT_CONFIGS } from '../types';
import type { TLEData } from '../engine/api';
import { altitudeFromTLE } from '../engine/api';

interface OrbitalObject {
  mesh: THREE.Mesh;
  trail: THREE.Line;
  trailPositions: THREE.Vector3[];
  orbitRadius: number;
  speed: number;
  inclination: number;
  phase: number;
  actor: Actor;
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
const TRAIL_LENGTH = 80;

const ORBIT_COLORS: Record<string, number> = {
  LEO: 0x4a90d9,
  MEO: 0xd4a017,
  GEO: 0xff6b35,
  Lunar: 0xc084fc,
};

const STATUS_EMISSIVE: Record<string, number> = {
  operational: 0x00cc66,
  planned: 0xd4a017,
  in_development: 0x4a90d9,
  concept: 0x444444,
};

export function GlobeView({ actors, year, orbitType, tle, isSimulating, simulationDensity }: GlobeViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
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
  const hoveredRef = useRef<string | null>(null);
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

          // Bump influence on lighting
          float bump = texture2D(bumpMap, vUv).r;
          float bumpLight = 0.9 + bump * 0.15;

          vec4 finalColor = mix(nightColor * 1.2, dayColor * bumpLight, dayFactor);

          // Specular highlight on water (dark areas of bump map)
          float specular = pow(max(0.0, dot(reflect(-sunDirection, normal), normalize(-vWorldPosition))), 20.0);
          specular *= (1.0 - bump) * 0.4 * dayFactor;
          finalColor.rgb += vec3(specular);

          // Atmospheric rim on day side
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
      color: 0x4488cc,
      transparent: true,
      opacity: 0.08,
      side: THREE.FrontSide,
      depthWrite: false,
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
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
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
        Math.cos(time * 0.05) * 5,
        2,
        Math.sin(time * 0.05) * 5
      );
      s.sunLight.position.copy(sunPos);

      const earthMat = s.earth.material as THREE.ShaderMaterial;
      if (earthMat.uniforms?.sunDirection) {
        earthMat.uniforms.sunDirection.value.copy(sunPos).normalize();
      }

      for (const obj of s.orbitals) {
        const angle = time * obj.speed + obj.phase;
        const r = obj.orbitRadius;
        const inc = obj.inclination;
        obj.mesh.position.set(
          Math.cos(angle) * r,
          Math.sin(angle) * Math.sin(inc) * r,
          Math.sin(angle) * Math.cos(inc) * r
        );

        obj.trailPositions.push(obj.mesh.position.clone());
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
      }

      s.raycaster.setFromCamera(s.mouse, s.camera);
      const meshes = s.orbitals.map((o) => o.mesh);
      const intersects = s.raycaster.intersectObjects(meshes);
      let newHovered: string | null = null;
      if (intersects.length > 0) {
        const obj = s.orbitals.find((o) => o.mesh === intersects[0].object);
        if (obj) {
          newHovered = obj.actor.id;
          if (tooltipRef.current) {
            const projected = obj.mesh.position.clone().project(s.camera);
            const rect = container.getBoundingClientRect();
            const x = (projected.x * 0.5 + 0.5) * rect.width;
            const y = (-projected.y * 0.5 + 0.5) * rect.height;
            tooltipRef.current.style.left = `${x + 12}px`;
            tooltipRef.current.style.top = `${y - 10}px`;
            tooltipRef.current.style.display = 'block';
            tooltipRef.current.innerHTML = `
              <div style="font-weight:500;margin-bottom:2px">${obj.actor.name}</div>
              <div>${obj.actor.orbit} · ${obj.actor.altitude_km}km</div>
              <div style="color:rgba(255,255,255,0.4)">${obj.actor.use_case}</div>
            `;
          }
        }
      }
      if (!newHovered && tooltipRef.current) {
        tooltipRef.current.style.display = 'none';
      }
      hoveredRef.current = newHovered;

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
      container.removeChild(s.renderer.domElement);
    };
  }, [createScene]);

  useEffect(() => {
    const s = sceneRef.current;
    if (!s) return;

    for (const obj of s.orbitals) {
      s.scene.remove(obj.mesh);
      s.scene.remove(obj.trail);
      obj.mesh.geometry.dispose();
      (obj.mesh.material as THREE.Material).dispose();
      obj.trail.geometry.dispose();
      (obj.trail.material as THREE.Material).dispose();
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

      const orbitRadius = EARTH_RADIUS + altKm * SCALE_FACTOR * 8;
      const color = ORBIT_COLORS[actor.orbit] ?? 0x888888;

      const satGeo = new THREE.SphereGeometry(0.02, 8, 8);
      const satMat = new THREE.MeshPhongMaterial({
        color,
        emissive: STATUS_EMISSIVE[actor.status] ?? 0x444444,
        emissiveIntensity: 0.8,
      });
      const mesh = new THREE.Mesh(satGeo, satMat);
      s.scene.add(mesh);

      const trailGeo = new THREE.BufferGeometry();
      trailGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(TRAIL_LENGTH * 3), 3));
      const trailMat = new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: 0.25,
      });
      const trail = new THREE.Line(trailGeo, trailMat);
      s.scene.add(trail);

      const orbitRingGeo = new THREE.RingGeometry(orbitRadius - 0.002, orbitRadius + 0.002, 128);
      const orbitRingMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.06,
        side: THREE.DoubleSide,
      });
      const orbitRing = new THREE.Mesh(orbitRingGeo, orbitRingMat);
      const inc = (actor.orbital_params?.inclination_deg ?? 45) * Math.PI / 180;
      orbitRing.rotation.x = Math.PI / 2 - inc;
      s.scene.add(orbitRing);

      const config = ORBIT_CONFIGS[actor.orbit === 'Lunar' ? 'GEO' : actor.orbit];
      const speed = (2 * Math.PI) / (config.orbital_period_min * 60) * 50;

      s.orbitals.push({
        mesh, trail, trailPositions: [],
        orbitRadius, speed,
        inclination: inc,
        phase: Math.random() * Math.PI * 2,
        actor,
      });
    }

    if (isSimulating) {
      for (const m of s.simOrbitals) {
        s.scene.remove(m);
        m.geometry.dispose();
        (m.material as THREE.Material).dispose();
      }
      s.simOrbitals = [];

      const extraCount = Math.floor(simulationDensity * 20);
      for (let i = 0; i < extraCount; i++) {
        const r = EARTH_RADIUS + (0.1 + Math.random() * 0.5);
        const geo = new THREE.SphereGeometry(0.008, 6, 6);
        const mat = new THREE.MeshBasicMaterial({
          color: 0xffd700,
          transparent: true,
          opacity: 0.4,
        });
        const m = new THREE.Mesh(geo, mat);
        const angle = Math.random() * Math.PI * 2;
        const inc = (Math.random() - 0.5) * Math.PI * 0.8;
        m.position.set(
          Math.cos(angle) * r,
          Math.sin(inc) * r * 0.3,
          Math.sin(angle) * r
        );
        s.scene.add(m);
        s.simOrbitals.push(m);
      }
    }
  }, [actors, year, tle, isSimulating, simulationDensity, orbitType]);

  return (
    <div ref={containerRef} style={styles.container}>
      <div ref={tooltipRef} style={styles.tooltip} />
    </div>
  );
}

function createStars(): THREE.Points {
  const starCount = 3000;
  const positions = new Float32Array(starCount * 3);
  const sizes = new Float32Array(starCount);
  for (let i = 0; i < starCount; i++) {
    const r = 30 + Math.random() * 20;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
    sizes[i] = Math.random() * 1.5 + 0.5;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  const mat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.05,
    transparent: true,
    opacity: 0.6,
    sizeAttenuation: true,
  });
  return new THREE.Points(geo, mat);
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    height: '100%',
    position: 'relative',
    cursor: 'grab',
    overflow: 'hidden',
  },
  tooltip: {
    position: 'absolute',
    display: 'none',
    background: 'rgba(8, 8, 12, 0.92)',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 6,
    padding: '8px 12px',
    fontFamily: '"DM Mono", monospace',
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.7)',
    pointerEvents: 'none',
    zIndex: 20,
    maxWidth: 220,
    lineHeight: '1.5',
  },
};
