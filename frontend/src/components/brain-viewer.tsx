"use client";

import { Suspense } from "react";
import { Canvas, extend, useLoader, useThree } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls as OrbitControlsImpl } from "three/examples/jsm/controls/OrbitControls.js";
import { MeshStandardMaterial, Color, Mesh, Object3D } from "three";

extend({ OrbitControls: OrbitControlsImpl });

// Type declaration for extended component
declare module '@react-three/fiber' {
  interface ThreeElements {
    orbitControls: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  }
}

function Controls() {
  const { camera, gl } = useThree();

  return (
    <orbitControls
      args={[camera, gl.domElement]}
      enableDamping
      dampingFactor={0.05}
      rotateSpeed={1.0}
      zoomSpeed={0.6}
      autoRotate
      autoRotateSpeed={0.45}
      minDistance={1.2}
      maxDistance={6}
    />
  );
}

function BrainModel() {
  const gltf = useLoader(GLTFLoader, "/human-brain.glb");

  // Apply uniform material tint where needed (some GLBs already have nice materials)
  gltf.scene.traverse((child: Object3D) => {
    if (child instanceof Mesh) {
      child.material = new MeshStandardMaterial({
        color: new Color("#eea4d6"),
        roughness: 0.30,
        metalness: 0.05,
        transparent: false,
        opacity:0.5
      });
    }
  });

  return <primitive object={gltf.scene} scale={1.2} position={[0, -0.75, 0]} />;
}

export function BrainViewer() {
  return (
    <div className="h-full w-full relative">
      <Canvas camera={{ position: [0, 0.8, 3], fov: 45 }}>
        <ambientLight intensity={0.65} />
        <directionalLight color="#ffffff" intensity={1.1} position={[3, 3, 2]} />
        <directionalLight color="#8fa8ff" intensity={0.6} position={[-3, 1.5, -2]} />
        <Suspense fallback={null}>
          <BrainModel />
        </Suspense>
        <Controls />
      </Canvas>
      <div
        className="absolute left-3 top-3 rounded-md px-2 py-1 text-[10px] uppercase tracking-widest"
        style={{ backgroundColor: "rgba(10, 12, 20, 0.65)", color: "#89f9ff" }}
      >
        human-brain.glb
      </div>
    </div>
  );
}
