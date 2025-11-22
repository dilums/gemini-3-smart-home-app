
import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Line, Sphere, Box, Torus, Cylinder, Cone } from '@react-three/drei';
import * as THREE from 'three';
import { RoomNode, ViewMode, DeviceType } from '../types';

interface SceneProps {
  alertMode: boolean;
  activeRoomId: string | null;
  viewMode: ViewMode;
  rooms: RoomNode[];
  selectedDeviceId: string | null;
  onDeviceClick: (deviceId: string) => void;
}

// Hardcoded positions for devices to allow camera zooming
const DEVICE_POSITIONS: Record<string, [number, number, number]> = {
  'washer': [0, -1.7, -2],
  'server': [2, 1.1, 1],
  'tv1': [-2.4, 0, 1],
  'fridge': [2.4, -0.5, 1],
  'router': [1.5, 2, 0.5],
  'thermostat': [-0.3, 2, 2],
  'camera_front': [-2.5, 0.5, -2.5]
};

// --- Camera Controller ---
const CameraRig = ({ targetId }: { targetId: string | null }) => {
  const { camera, controls } = useThree();
  const vec = new THREE.Vector3();

  useFrame((state, delta) => {
    if (targetId && DEVICE_POSITIONS[targetId]) {
      const [x, y, z] = DEVICE_POSITIONS[targetId];
      const targetPos = new THREE.Vector3(x, y, z);
      
      // Calculate offset position (zoom in)
      // We move slightly up and back from the object
      const offset = new THREE.Vector3(1.5, 1, 1.5); 
      const desiredCamPos = targetPos.clone().add(offset);

      // Smoothly interpolate camera position
      state.camera.position.lerp(desiredCamPos, 3 * delta);
      
      // Smoothly interpolate controls target
      if (controls) {
        const orbitControls = controls as any;
        orbitControls.target.lerp(targetPos, 3 * delta);
        orbitControls.update();
      }
    } else {
      // Reset to default view if no target
      // Only lerp target back to center, let user control position otherwise
      if (controls) {
        const orbitControls = controls as any;
        // Optional: drift back to center if desired, or just leave it
         orbitControls.target.lerp(new THREE.Vector3(0, 0, 0), 2 * delta);
         orbitControls.update();
      }
    }
  });
  return null;
};

// --- Helper Components for Visual Layers ---

const PowerLines = ({ rooms }: { rooms: RoomNode[] }) => {
  const hubPos = useMemo(() => new THREE.Vector3(0, -2, 0), []);
  
  const roomCenters: Record<string, [number, number, number]> = {
    living: [-1.5, 0, 1],
    kitchen: [1.5, 0, 1],
    garage: [0, 0, -2],
    master: [-1.5, 2.5, 0.5],
    office: [1.5, 2.5, 0.5],
  };

  return (
    <group>
      {rooms.map((room) => {
        const target = roomCenters[room.id];
        if (!target) return null;
        const isHighPower = room.power > 200;
        
        return (
          <PowerConnection 
            key={room.id} 
            start={hubPos} 
            end={new THREE.Vector3(...target)} 
            active={room.active || isHighPower}
            color={isHighPower ? "#fbbf24" : "#22d3ee"}
          />
        );
      })}
      <Sphere args={[0.3, 16, 16]} position={hubPos}>
         <meshBasicMaterial color="#fbbf24" wireframe />
      </Sphere>
    </group>
  );
};

const PowerConnection: React.FC<{ start: THREE.Vector3, end: THREE.Vector3, active: boolean, color: string }> = ({ start, end, active, color }) => {
  const points = useMemo(() => [start, end], [start.x, start.y, start.z, end.x, end.y, end.z]);
  const matRef = useRef<any>(null);

  useFrame((state) => {
    if (matRef.current) {
      matRef.current.dashOffset -= active ? 0.02 : 0.005;
    }
  });

  return (
    <Line
      points={points}
      color={color}
      lineWidth={2}
      dashed
      dashScale={4}
      dashSize={0.5}
      dashOffset={0}
      transparent
      opacity={0.8}
      ref={(ref: any) => { if (ref) matRef.current = ref.material }}
    />
  );
};

const WaterSystem = () => {
  // Mock pipes connecting kitchen, garage, etc.
  const pipes = [
    { start: [0, -2, 0], end: [1.5, -0.5, 1] }, // Hub to Kitchen
    { start: [0, -2, 0], end: [0, -0.5, -2] }, // Hub to Garage
    { start: [0, -2, 0], end: [-1.5, 2, 0.5] }, // Hub to Master Bath (approx)
  ];

  return (
    <group>
      {pipes.map((pipe, i) => (
        <WaterPipe key={i} start={new THREE.Vector3(...pipe.start as [number, number, number])} end={new THREE.Vector3(...pipe.end as [number, number, number])} />
      ))}
    </group>
  );
};

const WaterPipe: React.FC<{ start: THREE.Vector3, end: THREE.Vector3 }> = ({ start, end }) => {
  const points = useMemo(() => [start, end], [start, end]);
  const matRef = useRef<any>(null);
  useFrame(() => { if (matRef.current) matRef.current.dashOffset -= 0.01; });

  return (
    <Line points={points} color="#3b82f6" lineWidth={4} dashed dashScale={2} dashSize={0.2} dashOffset={0} transparent opacity={0.6} ref={(ref: any) => { if(ref) matRef.current = ref.material }} />
  );
};

const ThermalMap = ({ rooms }: { rooms: RoomNode[] }) => {
  const roomCenters: Record<string, [number, number, number]> = {
    living: [-1.5, 0, 1],
    kitchen: [1.5, 0, 1],
    garage: [0, 0, -2],
    master: [-1.5, 2, 0.5],
    office: [1.5, 2, 0.5],
  };

  return (
    <group>
      {rooms.map(r => {
        const pos = roomCenters[r.id];
        if(!pos) return null;
        // Color logic: Blue (18) -> Red (25+)
        const t = Math.max(0, Math.min(1, (r.temp - 18) / 10));
        const color = new THREE.Color().lerpColors(new THREE.Color('#3b82f6'), new THREE.Color('#ef4444'), t);
        
        return (
          <group key={r.id} position={new THREE.Vector3(...pos)}>
             {/* Volumetric-ish glow */}
             <Sphere args={[1, 16, 16]}>
                <meshBasicMaterial color={color} transparent opacity={0.2} depthWrite={false} />
             </Sphere>
             <Sphere args={[0.5, 16, 16]}>
                <meshBasicMaterial color={color} transparent opacity={0.4} depthWrite={false} />
             </Sphere>
          </group>
        )
      })}
    </group>
  );
};

const VentilationFlow = () => {
  const particles = useMemo(() => {
    const p = [];
    for(let i=0; i<20; i++) {
      p.push({
        offset: Math.random() * 10,
        speed: 0.02 + Math.random() * 0.02,
        xBase: (Math.random() - 0.5) * 4,
        yBase: (Math.random() - 0.5) * 4,
        zBase: (Math.random() - 0.5) * 4,
      });
    }
    return p;
  }, []);

  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.children.forEach((mesh, i) => {
        const p = particles[i];
        mesh.position.y = ((state.clock.getElapsedTime() * p.speed + p.offset) % 5) - 1;
        mesh.position.x = p.xBase + Math.sin(state.clock.getElapsedTime() + i) * 0.2;
        mesh.position.z = p.zBase + Math.cos(state.clock.getElapsedTime() + i) * 0.2;
      });
    }
  });

  return (
    <group ref={groupRef}>
      {particles.map((_, i) => (
        <mesh key={i} position={[0,0,0]}>
          <tetrahedronGeometry args={[0.08]} />
          <meshBasicMaterial color="#a5f3fc" transparent opacity={0.6} />
        </mesh>
      ))}
    </group>
  );
};

const WifiSignals = () => {
  const routerPos = [1.5, 2, 0.5] as const;
  const ref = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (ref.current) {
      ref.current.children.forEach((mesh, i) => {
         const scale = (state.clock.getElapsedTime() * 0.5 + i * 0.33) % 1;
         mesh.scale.set(scale * 10, scale * 10, scale * 10);
         (mesh.material as THREE.MeshBasicMaterial).opacity = 1 - scale;
      });
    }
  });

  return (
    <group position={routerPos} ref={ref}>
       {[0,1,2].map(i => (
         <Sphere key={i} args={[0.5, 32, 32]}>
            <meshBasicMaterial color="#4ade80" wireframe transparent />
         </Sphere>
       ))}
    </group>
  );
};

const ApplianceMesh = ({ type, active, onClick, id, selected }: { type: DeviceType, active: boolean, onClick: () => void, id: string, selected: boolean }) => {
  const meshRef = useRef<THREE.Group>(null);
  const [hovered, setHover] = useState(false);
  
  useFrame((state) => {
     if (active && meshRef.current) {
        if (type === 'WASHER') {
            meshRef.current.rotation.z = Math.sin(state.clock.getElapsedTime() * 20) * 0.05;
        } else if (type === 'SERVER') {
           const s = 1 + Math.sin(state.clock.getElapsedTime() * 2) * 0.02;
           meshRef.current.scale.set(s, s, s);
        }
     }
  });

  // Visual highlight for selection
  const highlightColor = selected ? "#facc15" : hovered ? "#ffffff" : active ? "#22d3ee" : "#475569";
  const emissiveIntensity = selected || active ? 1 : 0;

  const groupProps = {
    ref: meshRef,
    onClick: (e: any) => { e.stopPropagation(); onClick(); },
    onPointerOver: () => setHover(true),
    onPointerOut: () => setHover(false),
    // Cursor pointer
    onPointerEnter: () => { document.body.style.cursor = 'pointer' },
    onPointerLeave: () => { document.body.style.cursor = 'auto' }
  };

  if (type === 'WASHER') {
    return (
      <group {...groupProps}>
         <Box args={[0.6, 0.8, 0.6]} position={[0, 0.4, 0]}>
            <meshStandardMaterial color={selected ? "#fbbf24" : active ? "#38bdf8" : "#475569"} metalness={0.8} roughness={0.2} />
         </Box>
         <Torus args={[0.2, 0.05, 8, 24]} position={[0, 0.4, 0.31]}>
            <meshBasicMaterial color={active ? "#00ffff" : "#1e293b"} />
         </Torus>
      </group>
    );
  }
  
  if (type === 'SERVER') {
     return (
        <group {...groupProps}>
           <Box args={[0.3, 0.6, 0.3]} position={[0, 0.3, 0]}>
              <meshBasicMaterial color={selected ? "#fbbf24" : active ? "#22d3ee" : "#1e293b"} wireframe />
           </Box>
           <Box args={[0.25, 0.55, 0.25]} position={[0, 0.3, 0]}>
              <meshBasicMaterial color="#000" />
           </Box>
        </group>
     );
  }

  if (type === 'TV') {
      return (
          <group {...groupProps} rotation={[0, Math.PI/2, 0]}>
             <Box args={[1.2, 0.7, 0.05]} position={[0, 0.5, 0]}>
                <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.1} />
             </Box>
             <Box args={[1.1, 0.6, 0.06]} position={[0, 0.5, 0]}>
                <meshBasicMaterial color={active ? "#38bdf8" : "#000000"} />
             </Box>
          </group>
      )
  }

  if (type === 'FRIDGE') {
      return (
          <group {...groupProps} rotation={[0, -Math.PI/2, 0]}>
               <Box args={[0.7, 1.4, 0.7]} position={[0, 0.7, 0]}>
                  <meshStandardMaterial color={selected ? "#fbbf24" : "#e2e8f0"} metalness={0.3} roughness={0.2} />
               </Box>
               {/* Divider */}
               <Box args={[0.68, 0.02, 0.02]} position={[0, 0.7, 0.35]}>
                  <meshBasicMaterial color="#94a3b8" />
               </Box>
          </group>
      )
  }

  if (type === 'THERMOSTAT') {
    return (
      <group {...groupProps}>
        <Box args={[0.15, 0.15, 0.05]} position={[0, 0, 0]}>
           <meshBasicMaterial color={selected ? "#fbbf24" : "#000"} />
        </Box>
        <Sphere args={[0.04]} position={[0,0,0.03]}>
            <meshBasicMaterial color={active ? "#ef4444" : "#22d3ee"} />
        </Sphere>
      </group>
    )
  }

  if (type === 'CAMERA') {
     return (
        <group {...groupProps} rotation={[0, Math.PI / 4, 0]}>
           <Cone args={[0.05, 0.1, 8]} rotation={[Math.PI/2, 0, 0]} position={[0, 0, 0.05]}>
              <meshStandardMaterial color="#333" />
           </Cone>
           <Sphere args={[0.04]} position={[0,0,0]}>
               <meshBasicMaterial color={active ? "#ef4444" : "#1e293b"} />
           </Sphere>
        </group>
     )
  }

  return null;
};

// --- Main Scene Components ---

const HolographicRoom = ({ position, size, isActive, alertMode, delay }: { position: [number, number, number], size: [number, number, number], isActive: boolean, alertMode: boolean, delay: number }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
       const t = state.clock.getElapsedTime();
       const scale = 1 + Math.sin(t * 2 + delay) * 0.005;
       meshRef.current.scale.set(scale, scale, scale);
    }
  });

  const baseColor = alertMode ? new THREE.Color('#ef4444') : new THREE.Color('#06b6d4');
  const activeColor = alertMode ? new THREE.Color('#ff0000') : new THREE.Color('#ffffff');

  return (
    <group position={new THREE.Vector3(...position)}>
      <mesh ref={meshRef}>
        <boxGeometry args={[...size]} />
        <meshBasicMaterial 
          color={isActive ? activeColor : baseColor} 
          wireframe 
          transparent 
          opacity={isActive ? 0.8 : 0.15} 
        />
      </mesh>
      <mesh>
        <boxGeometry args={[size[0] * 0.95, size[1] * 0.95, size[2] * 0.95]} />
        <meshBasicMaterial 
          color={isActive ? activeColor : baseColor} 
          transparent 
          opacity={isActive ? 0.05 : 0.01} 
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
};

const SceneContent: React.FC<SceneProps> = ({ alertMode, activeRoomId, viewMode, rooms, onDeviceClick, selectedDeviceId }) => {
  const groupRef = useRef<THREE.Group>(null);
  
  // Retrieve status for specific visualization
  const getDevice = (id: string) => {
    for (const r of rooms) {
       const d = r.devices.find(dev => dev.id === id);
       if (d) return d;
    }
    return null;
  };

  return (
    <group ref={groupRef}>
      <CameraRig targetId={selectedDeviceId} />
      
      {/* Ground Floor */}
      <group>
        <HolographicRoom position={[-1.5, -0.5, 1]} size={[2.5, 2.5, 3]} isActive={activeRoomId === 'living'} alertMode={alertMode} delay={0} />
        {/* TV */}
        <group position={new THREE.Vector3(...DEVICE_POSITIONS['tv1'])}>
            <ApplianceMesh id="tv1" type="TV" active={getDevice('tv1')?.status === 'ACTIVE'} onClick={() => onDeviceClick('tv1')} selected={selectedDeviceId === 'tv1'} />
        </group>
      </group>

      <group>
        <HolographicRoom position={[1.5, -0.5, 1]} size={[2.5, 2.5, 3]} isActive={activeRoomId === 'kitchen'} alertMode={alertMode} delay={1} />
        {/* Fridge */}
        <group position={new THREE.Vector3(...DEVICE_POSITIONS['fridge'])}>
             <ApplianceMesh id="fridge" type="FRIDGE" active={getDevice('fridge')?.status === 'ACTIVE'} onClick={() => onDeviceClick('fridge')} selected={selectedDeviceId === 'fridge'} />
        </group>
      </group>
      
      {/* Garage */}
      <group>
        <HolographicRoom position={[0, -0.5, -2]} size={[5.5, 2.5, 2]} isActive={activeRoomId === 'garage'} alertMode={alertMode} delay={2} />
        <group position={new THREE.Vector3(...DEVICE_POSITIONS['washer'])}>
             <ApplianceMesh id="washer" type="WASHER" active={getDevice('washer')?.status === 'ACTIVE'} onClick={() => onDeviceClick('washer')} selected={selectedDeviceId === 'washer'} />
        </group>
        {/* Camera */}
        <group position={new THREE.Vector3(...DEVICE_POSITIONS['camera_front'])}>
            <ApplianceMesh id="camera_front" type="CAMERA" active={getDevice('camera_front')?.status === 'ACTIVE'} onClick={() => onDeviceClick('camera_front')} selected={selectedDeviceId === 'camera_front'} />
        </group>
      </group>
      
      {/* Second Floor */}
      <group>
        <HolographicRoom position={[-1.5, 2, 0.5]} size={[2.5, 2, 4]} isActive={activeRoomId === 'master'} alertMode={alertMode} delay={3} />
        {/* Thermostat */}
        <group position={new THREE.Vector3(...DEVICE_POSITIONS['thermostat'])}>
             <ApplianceMesh id="thermostat" type="THERMOSTAT" active={getDevice('thermostat')?.status === 'ACTIVE'} onClick={() => onDeviceClick('thermostat')} selected={selectedDeviceId === 'thermostat'} />
        </group>
      </group>
      
      {/* Office */}
      <group>
         <HolographicRoom position={[1.5, 2, 0.5]} size={[2.5, 2, 4]} isActive={activeRoomId === 'office'} alertMode={alertMode} delay={4} />
         <group position={new THREE.Vector3(...DEVICE_POSITIONS['server'])}>
             <ApplianceMesh id="server" type="SERVER" active={getDevice('server')?.status === 'ACTIVE'} onClick={() => onDeviceClick('server')} selected={selectedDeviceId === 'server'} />
         </group>
      </group>

      {/* OVERLAYS */}
      {viewMode === 'POWER' && <PowerLines rooms={rooms} />}
      {viewMode === 'VENTILATION' && <VentilationFlow />}
      {viewMode === 'WIFI' && <WifiSignals />}
      {viewMode === 'WATER' && <WaterSystem />}
      {viewMode === 'THERMAL' && <ThermalMap rooms={rooms} />}
    </group>
  );
};

export const Scene3D: React.FC<SceneProps> = (props) => {
  return (
    <div className="w-full h-full relative">
       <div className="absolute top-4 left-4 z-10 text-[10px] text-cyan-500/50 font-header pointer-events-none">
          CAM-01 [LIVE] <br/>
          MODE: {props.viewMode} <br/>
          TARGET: {props.selectedDeviceId ? props.selectedDeviceId.toUpperCase() : 'NONE'}
       </div>

      <Canvas>
        <PerspectiveCamera makeDefault position={[8, 6, 10]} fov={35} />
        <OrbitControls 
            enablePan={false} 
            minPolarAngle={Math.PI / 4} 
            maxPolarAngle={Math.PI / 2} 
            enabled={!props.selectedDeviceId} // Disable manual control when focused
        />
        <ambientLight intensity={0.2} />
        <pointLight position={[10, 10, 10]} intensity={0.5} />
        <spotLight position={[-10, 10, -10]} intensity={0.5} color="#06b6d4" />
        
        <SceneContent {...props} />
        
        <gridHelper args={[20, 20, 0x1e293b, 0x0f172a]} position={[0, -2, 0]} />
      </Canvas>
    </div>
  );
};
