"use client";
import { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";

function Placeholder() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial />
    </mesh>
  );
}

function RemoteModel({ src }: { src?: string }) {
  // Minimal safe fallback – rendering a placeholder if no src provided.
  // You can extend with STLLoader/GLTFLoader later.
  if (!src) return <Placeholder />;
  return <Placeholder />;
}

export default function PartViewer({ src }: { src?: string }) {
  const cam = useMemo(() => ({ position: [2.5, 2.5, 2.5] as [number, number, number] }), []);
  return (
    <div className="h-[420px] w-full rounded-lg overflow-hidden">
      <Canvas camera={{ fov: 45, near: 0.1, far: 100, ...cam }}>
        <ambientLight intensity={0.8} />
        <directionalLight position={[5, 5, 5]} intensity={0.9} />
        <Suspense fallback={<Placeholder />}>
          <RemoteModel src={src} />
        </Suspense>
      </Canvas>
    </div>
  );
}
