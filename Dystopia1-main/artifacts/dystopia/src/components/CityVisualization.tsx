import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment, Grid } from "@react-three/drei";
import * as THREE from "three";
import { Agent } from "@workspace/api-client-react";

interface CityVisualizationProps {
  city: string;
  agents: Agent[];
}

function Building({ position, scale, color = "#1a1e29" }: { position: [number, number, number], scale: [number, number, number], color?: string }) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={scale} />
      <meshStandardMaterial color={color} roughness={0.8} metalness={0.2} />
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(...scale)]} />
        <lineBasicMaterial color="#303846" linewidth={1} />
      </lineSegments>
    </mesh>
  );
}

function AgentDot({ agent, cityBounds }: { agent: Agent, cityBounds: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Random start position and movement parameters
  const targetData = useMemo(() => {
    return {
      x: (Math.random() - 0.5) * cityBounds,
      z: (Math.random() - 0.5) * cityBounds,
      speed: 0.02 + Math.random() * 0.03,
      angle: Math.random() * Math.PI * 2,
    };
  }, [cityBounds]);

  useFrame((state) => {
    if (!meshRef.current) return;
    
    // Simple wander movement
    targetData.angle += (Math.random() - 0.5) * 0.1;
    meshRef.current.position.x += Math.cos(targetData.angle) * targetData.speed;
    meshRef.current.position.z += Math.sin(targetData.angle) * targetData.speed;

    // Bounce off bounds
    if (Math.abs(meshRef.current.position.x) > cityBounds / 2) {
      targetData.angle = Math.PI - targetData.angle;
    }
    if (Math.abs(meshRef.current.position.z) > cityBounds / 2) {
      targetData.angle = -targetData.angle;
    }
  });

  const color = useMemo(() => {
    if (agent.sentimentScore > 0.3) return "#22c55e"; // green
    if (agent.sentimentScore < -0.3) return "#ef4444"; // red
    return "#f59e0b"; // amber
  }, [agent.sentimentScore]);

  return (
    <mesh ref={meshRef} position={[targetData.x, 0.2, targetData.z]}>
      <sphereGeometry args={[0.3, 16, 16]} />
      <meshBasicMaterial color={color} toneMapped={false} />
      <pointLight color={color} intensity={0.5} distance={2} />
    </mesh>
  );
}

export function CityVisualization({ city, agents }: CityVisualizationProps) {
  const citySize = 40;
  
  // Generate random buildings based on city
  const buildings = useMemo(() => {
    const b = [];
    const count = city === "Mumbai" ? 150 : city === "Delhi" ? 100 : 120;
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * citySize;
      const z = (Math.random() - 0.5) * citySize;
      
      // Leave some space for streets
      if (Math.abs(x % 4) < 1 || Math.abs(z % 4) < 1) continue;

      const height = 1 + Math.random() * (city === "Mumbai" ? 8 : 5);
      const width = 1 + Math.random() * 2;
      const depth = 1 + Math.random() * 2;
      
      b.push({
        id: i,
        position: [x, height / 2, z] as [number, number, number],
        scale: [width, height, depth] as [number, number, number],
        color: Math.random() > 0.9 ? "#252b36" : "#1a1e29"
      });
    }
    return b;
  }, [city]);

  return (
    <div className="w-full h-full bg-[#0a0b0d]">
      <Canvas camera={{ position: [20, 20, 20], fov: 40 }} shadows>
        <color attach="background" args={['#0a0b0d']} />
        <fog attach="fog" args={['#0a0b0d', 10, 60]} />
        
        <ambientLight intensity={0.2} />
        <directionalLight 
          position={[10, 20, 10]} 
          intensity={0.5} 
          castShadow 
          shadow-mapSize={[2048, 2048]} 
        />
        
        <Grid 
          infiniteGrid 
          fadeDistance={50} 
          sectionColor="#f59e0b" 
          sectionThickness={1} 
          cellColor="#1a1e29" 
          cellThickness={0.5} 
          position={[0, 0, 0]}
        />
        
        <group position={[0, 0, 0]}>
          {buildings.map((b) => (
            <Building key={b.id} position={b.position} scale={b.scale} color={b.color} />
          ))}
          
          {agents && agents.map((agent) => (
            <AgentDot key={agent.id} agent={agent} cityBounds={citySize - 2} />
          ))}
        </group>

        <Environment preset="night" />
        <OrbitControls 
          autoRotate 
          autoRotateSpeed={0.5} 
          enablePan={false}
          maxPolarAngle={Math.PI / 2.2}
          minDistance={10}
          maxDistance={50}
        />
      </Canvas>
    </div>
  );
}
