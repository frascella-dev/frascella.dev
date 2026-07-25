import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import type { Mesh } from "three";
import LabStage from "../../LabStage.tsx";

// Canonical reference experiment. Copy this shape: a <LabStage> frame wrapping an
// R3F <Canvas>, paper background, ink wireframe geometry, orange accent. Keep the
// palette from base.css so experiments read as the portfolio.
function SpinningCube() {
    const ref = useRef<Mesh>(null);
    useFrame((_, dt) => {
        if (!ref.current) return;
        ref.current.rotation.x += dt * 0.3;
        ref.current.rotation.y += dt * 0.42;
    });
    return (
        <mesh ref={ref}>
            <boxGeometry args={[1.7, 1.7, 1.7]} />
            <meshBasicMaterial color="#111110" wireframe />
        </mesh>
    );
}

export default function Example() {
    return (
        <LabStage idx="00" title="hello — wireframe cube" tag="example" hint="reference pattern">
            <Canvas camera={{ position: [3, 2, 3.4], fov: 45 }} gl={{ antialias: true }}>
                <color attach="background" args={["#EEEAE0"]} />
                <SpinningCube />
            </Canvas>
        </LabStage>
    );
}
