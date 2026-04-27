"use client";

import { Suspense, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  OrbitControls,
  Environment,
  useGLTF,
  Center,
  Html,
  useProgress,
} from "@react-three/drei";
import * as THREE from "three";

interface AvatarViewerProps {
  modelUrl?: string;
  fallbackImageUrl?: string;
  autoRotate?: boolean;
  showControls?: boolean;
  className?: string;
}

function Loader() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="flex flex-col items-center justify-center">
        <div
          className="w-16 h-16 rounded-full border-4 border-t-transparent animate-spin"
          style={{ borderColor: "#C9847A", borderTopColor: "transparent" }}
        />
        <p className="mt-3 text-sm" style={{ color: "#7A6F68" }}>
          {progress < 100 ? "Loading model..." : "Ready"}
        </p>
      </div>
    </Html>
  );
}

interface GLBModelProps {
  url: string;
  autoRotate: boolean;
}

function GLBModel({ url, autoRotate }: GLBModelProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (autoRotate && groupRef.current) {
      groupRef.current.rotation.y += delta * 0.3;
    }
  });

  const { scene } = useGLTF(url);

  scene.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  return (
    <group ref={groupRef}>
      <Center>
        <primitive object={scene} scale={1.5} />
      </Center>
    </group>
  );
}

function Floor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]} receiveShadow>
      <planeGeometry args={[10, 10]} />
      <shadowMaterial opacity={0.15} />
    </mesh>
  );
}

export default function AvatarViewer({
  modelUrl,
  fallbackImageUrl,
  autoRotate = true,
  showControls = true,
  className = "",
}: AvatarViewerProps) {
  const [error, setError] = useState(false);

  if (!modelUrl || error) {
    if (fallbackImageUrl && !error) {
      return (
        <div
          className={`relative ${className}`}
          style={{ backgroundColor: "#F5F0EA" }}
        >
          <img
            src={fallbackImageUrl}
            alt="Avatar"
            className="w-full h-full object-contain"
          />
          {autoRotate && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="px-4 py-2 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: "rgba(255,255,255,0.9)",
                  color: "#7A6F68",
                }}
              >
                3D model loading...
              </div>
            </div>
          )}
        </div>
      );
    }
    return (
      <div
        className={`flex flex-col items-center justify-center ${className}`}
        style={{ backgroundColor: "#F5F0EA" }}
      >
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center mb-4"
          style={{ backgroundColor: "rgba(201,132,122,0.1)" }}
        >
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#C9847A"
            strokeWidth="1.5"
          >
            <circle cx="12" cy="8" r="4" />
            <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
          </svg>
        </div>
        <p className="text-sm" style={{ color: "#7A6F68" }}>
          Avatar not available
        </p>
      </div>
    );
  }

  return (
    <div
      className={`relative ${className}`}
      style={{ backgroundColor: "#F5F0EA" }}
    >
      <Canvas
        shadows
        camera={{ position: [0, 1.5, 3], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        onError={() => setError(true)}
      >
        <color attach="background" args={["#F5F0EA"]} />

        {/* Lighting - fashion photography style */}
        <ambientLight intensity={0.4} />
        <directionalLight
          position={[5, 5, 5]}
          intensity={1}
          castShadow
          shadow-mapSize={[1024, 1024]}
        />
        <directionalLight position={[-5, 3, -5]} intensity={0.3} />
        <spotLight
          position={[0, 8, 0]}
          intensity={0.5}
          angle={0.5}
          penumbra={0.5}
        />

        <Suspense fallback={<Loader />}>
          <GLBModel url={modelUrl} autoRotate={autoRotate} />
          <Floor />
          <Environment preset="studio" />
        </Suspense>

        {showControls && (
          <OrbitControls
            enableZoom={true}
            enablePan={false}
            minDistance={1.5}
            maxDistance={6}
            minPolarAngle={Math.PI / 4}
            maxPolarAngle={Math.PI / 1.5}
          />
        )}
      </Canvas>
    </div>
  );
}

// Preload helper
export function preloadAvatar(url: string) {
  useGLTF.preload(url);
}
