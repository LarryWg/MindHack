"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";

// ─── Types & constants ────────────────────────────────────────────────

export type RegionActivation = {
  region: string;
  mni: [number, number, number];
  activation: number; // 0–1, driven by agent overall score
  agent: string;
};

export const DEFAULT_REGIONS: RegionActivation[] = [
  { region: "Broca's area", mni: [-44, 20, 8], activation: 0.72, agent: "Lexical" },
  { region: "Wernicke's area", mni: [-54, -40, 14], activation: 0.58, agent: "Semantic" },
  { region: "DLPFC", mni: [-46, 20, 32], activation: 0.83, agent: "Syntax" },
  { region: "SMA", mni: [0, -4, 60], activation: 0.44, agent: "Prosody" },
  { region: "Amygdala", mni: [-24, -4, -22], activation: 0.31, agent: "Affective" },
];

type BrainViewerProps = {
  activations?: RegionActivation[];
  onRegionClick?: (r: RegionActivation) => void;
  activeAgentName?: string;
};

// ─── Region mesh config (maps region name → OBJ file + color) ────────

const REGION_MESH_CONFIG: Record<string, { file: string; color: string }> = {
  "Broca's area":    { file: "/region_broca.obj",    color: "#D85A30" },
  "Wernicke's area": { file: "/region_wernicke.obj",  color: "#EF9F27" },
  "DLPFC":           { file: "/region_dlpfc.obj",     color: "#1D9E75" },
  "SMA":             { file: "/region_sma.obj",       color: "#EF9F27" },
  "Amygdala":        { file: "/region_amygdala.obj",  color: "#B4B2A9" },
};

// ─── Science descriptions ─────────────────────────────────────────────

const REGION_DESCRIPTIONS: Record<string, string> = {
  "Broca's area":
    "Primary language production center (BA44/45). Damage causes expressive aphasia. Activated during phonological processing, lexical retrieval difficulty, and speech production planning.",
  "Wernicke's area":
    "Language comprehension hub (BA22). Damage causes fluent but meaningless speech. Activated by semantic processing, coherence maintenance, and auditory word recognition.",
  DLPFC:
    "Dorsolateral prefrontal cortex (BA9/46). Executive control center for working memory. Activated by complex syntactic structures requiring high cognitive load and rule-based processing.",
  SMA:
    "Supplementary motor area (BA6). Speech motor planning and timing center. Activated by prosodic regulation, speech rate control, pause management, and motor sequencing.",
  Amygdala:
    "Deep temporal emotional salience detector. Activated by affective language processing, arousal modulation, and certainty/uncertainty expression in speech.",
};

// ─── Helpers ──────────────────────────────────────────────────────────

function activationColor(a: number): string {
  if (a > 0.75) return "#D85A30";
  if (a > 0.5) return "#EF9F27";
  if (a > 0.25) return "#1D9E75";
  return "#B4B2A9";
}

// ─── Info panel overlay (bottom-left) ─────────────────────────────────

function RegionInfoPanel({
  region,
  onClose,
}: {
  region: RegionActivation;
  onClose: () => void;
}) {
  const color = activationColor(region.activation);

  return (
    <div
      className="absolute bottom-4 left-4 z-20 w-72 rounded-xl p-4"
      style={{
        background: "rgba(252, 251, 249, 0.82)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.62)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.8)",
      }}
    >
      <button
        onClick={onClose}
        className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full text-black/30 hover:text-black/60 hover:bg-black/5 transition-colors"
        style={{ fontSize: 14 }}
      >
        &times;
      </button>

      <h3 className="text-sm font-semibold text-black/85 mb-1 pr-6">{region.region}</h3>

      <div
        className="inline-block text-[9px] tracking-widest uppercase font-semibold px-1.5 py-0.5 rounded mb-2"
        style={{ background: `${color}18`, color, fontFamily: "var(--font-jetbrains-mono)" }}
      >
        {region.agent} agent
      </div>

      <div className="flex items-center gap-2 mb-2">
        <div className="flex-1 h-1.5 rounded-full bg-black/8 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${region.activation * 100}%`, background: color }}
          />
        </div>
        <span
          className="text-sm font-bold tabular-nums"
          style={{ color, fontFamily: "var(--font-jetbrains-mono)" }}
        >
          {Math.round(region.activation * 100)}%
        </span>
      </div>

      <div
        className="text-[10px] text-black/40 mb-2"
        style={{ fontFamily: "var(--font-jetbrains-mono)" }}
      >
        MNI [{region.mni.join(", ")}]
      </div>

      <p className="text-[11px] leading-relaxed text-black/55">
        {REGION_DESCRIPTIONS[region.region] ?? "No description available."}
      </p>
    </div>
  );
}

// ─── Main component (imperative Three.js — NeuraLens approach) ────────

export default function BrainViewer({
  activations = DEFAULT_REGIONS,
  onRegionClick,
  activeAgentName: _activeAgentName,
}: BrainViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
    regionMeshes: Map<string, THREE.Group>;
    regionMaterials: Map<string, THREE.MeshPhongMaterial>;
    raycaster: THREE.Raycaster;
    pointer: THREE.Vector2;
    clock: THREE.Clock;
    idleTime: number;
    interacting: boolean;
  } | null>(null);

  const [selectedRegion, setSelectedRegion] = useState<RegionActivation | null>(null);
  const [, setHoveredRegion] = useState<string | null>(null);
  const activationsRef = useRef(activations);
  activationsRef.current = activations;
  const onRegionClickRef = useRef(onRegionClick);
  onRegionClickRef.current = onRegionClick;

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0.5, 3);

    // Renderer — transparent bg
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enablePan = false;
    controls.minDistance = 1.8;
    controls.maxDistance = 5;

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const dir1 = new THREE.DirectionalLight(0xffffff, 0.8);
    dir1.position.set(3, 5, 4);
    scene.add(dir1);
    const dir2 = new THREE.DirectionalLight(0x8888ff, 0.3);
    dir2.position.set(-1, -3, -3);
    scene.add(dir2);

    const regionMeshes = new Map<string, THREE.Group>();
    const regionMaterials = new Map<string, THREE.MeshPhongMaterial>();
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const clock = new THREE.Clock();

    sceneRef.current = {
      scene, camera, renderer, controls,
      regionMeshes, regionMaterials,
      raycaster, pointer, clock,
      idleTime: 0, interacting: false,
    };

    // ── Load brain surface OBJ (semi-transparent anatomical context) ─

    const brainMaterial = new THREE.MeshPhongMaterial({
      color: new THREE.Color("#e8beaf"),
      transparent: true,
      opacity: 0.12,
      side: THREE.DoubleSide,
      shininess: 10,
      depthWrite: false,
    });

    const loader = new OBJLoader();

    loader.load(
      "/brain_surface.obj",
      (obj) => {
        obj.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            (child as THREE.Mesh).material = brainMaterial;
          }
        });
        scene.add(obj);
      },
      undefined,
      (err) => console.warn("Failed to load brain_surface.obj:", err),
    );

    // ── Load region activation meshes (like NeuraLens tumor meshes) ──

    for (const region of activationsRef.current) {
      const config = REGION_MESH_CONFIG[region.region];
      if (!config) continue;

      const material = new THREE.MeshPhongMaterial({
        color: new THREE.Color(config.color),
        transparent: true,
        opacity: 0.15 + region.activation * 0.65, // activation controls visibility
        side: THREE.DoubleSide,
        shininess: 30,
        emissive: new THREE.Color(config.color),
        emissiveIntensity: 0.3 + region.activation * 0.5,
      });

      regionMaterials.set(region.region, material);

      loader.load(
        config.file,
        (obj) => {
          obj.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              (child as THREE.Mesh).material = material;
              // Tag for raycasting
              child.userData = { regionName: region.region };
            }
          });

          // Add point light at center of region mesh for glow
          const box = new THREE.Box3().setFromObject(obj);
          const center = box.getCenter(new THREE.Vector3());
          const light = new THREE.PointLight(
            new THREE.Color(config.color),
            region.activation * 2,
            2,
            2,
          );
          light.position.copy(center);
          obj.add(light);

          scene.add(obj);
          regionMeshes.set(region.region, obj);
        },
        undefined,
        (err) => console.warn(`Failed to load ${config.file}:`, err),
      );
    }

    // ── Animation loop ──────────────────────────────────────────────

    let frameId: number;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const s = sceneRef.current;
      if (!s) return;

      const elapsed = s.clock.getElapsedTime();
      const delta = s.clock.getDelta();

      // Auto-rotate when idle
      if (s.interacting) {
        s.idleTime = 0;
      } else {
        s.idleTime += delta;
        if (s.idleTime > 2) {
          s.camera.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.003);
          s.camera.lookAt(0, 0, 0);
        }
      }

      // Pulse region meshes (emissive intensity oscillation)
      for (const region of activationsRef.current) {
        const mat = s.regionMaterials.get(region.region);
        if (!mat) continue;
        if (region.activation > 0.3) {
          const pulse = Math.sin(elapsed * (1.5 + region.activation * 1.5)) * 0.15 * region.activation;
          mat.emissiveIntensity = 0.3 + region.activation * 0.5 + pulse;
          mat.opacity = 0.15 + region.activation * 0.65 + pulse * 0.3;
        }
      }

      s.controls.update();
      s.renderer.render(s.scene, s.camera);
    };
    animate();

    // ── Interaction ─────────────────────────────────────────────────

    controls.addEventListener("start", () => {
      if (sceneRef.current) sceneRef.current.interacting = true;
    });
    controls.addEventListener("end", () => {
      if (sceneRef.current) sceneRef.current.interacting = false;
    });

    const handleResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    // Collect clickable meshes for raycasting
    const getClickables = (): THREE.Object3D[] => {
      const clickables: THREE.Object3D[] = [];
      regionMeshes.forEach((group) => {
        group.traverse((child) => {
          if ((child as THREE.Mesh).isMesh && child.userData.regionName) {
            clickables.push(child);
          }
        });
      });
      return clickables;
    };

    const handlePointerMove = (event: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObjects(getClickables());

      if (intersects.length > 0) {
        const name = intersects[0].object.userData.regionName as string;
        setHoveredRegion(name);
        container.style.cursor = "pointer";
      } else {
        setHoveredRegion(null);
        container.style.cursor = "grab";
      }
    };
    container.addEventListener("pointermove", handlePointerMove);

    const handleClick = (event: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObjects(getClickables());

      if (intersects.length > 0) {
        const name = intersects[0].object.userData.regionName as string;
        const region = activationsRef.current.find((r) => r.region === name);
        if (region) {
          setSelectedRegion(region);
          onRegionClickRef.current?.(region);
        }
      } else {
        setSelectedRegion(null);
      }
    };
    container.addEventListener("click", handleClick);

    return () => {
      window.removeEventListener("resize", handleResize);
      container.removeEventListener("pointermove", handlePointerMove);
      container.removeEventListener("click", handleClick);
      cancelAnimationFrame(frameId);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Update activation values reactively ────────────────────────

  useEffect(() => {
    const s = sceneRef.current;
    if (!s) return;

    for (const region of activations) {
      const mat = s.regionMaterials.get(region.region);
      if (!mat) continue;

      const config = REGION_MESH_CONFIG[region.region];
      if (!config) continue;

      const color = new THREE.Color(activationColor(region.activation));
      mat.color.copy(color);
      mat.emissive.copy(color);
      mat.emissiveIntensity = 0.3 + region.activation * 0.5;
      mat.opacity = 0.15 + region.activation * 0.65;

      // Update point light intensity
      const group = s.regionMeshes.get(region.region);
      if (group) {
        group.traverse((child) => {
          if (child instanceof THREE.PointLight) {
            child.color.copy(color);
            child.intensity = region.activation * 2;
          }
        });
      }
    }
  }, [activations]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full"
      style={{ minHeight: 300, cursor: "grab" }}
    >
      {selectedRegion && (
        <RegionInfoPanel
          region={selectedRegion}
          onClose={() => setSelectedRegion(null)}
        />
      )}
    </div>
  );
}
