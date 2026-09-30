"use client";
import { Environment, Lightformer } from "@react-three/drei";
import { wallToWorld } from "./lib/layout";

/** Reflections do most of the work on steel: a studio environment built from
 *  light cards (cyan/green on the trusted side, red on the attacker side, a
 *  neutral softbox, strip lights overhead), rendered once, plus a few local
 *  lights for colour pools. */
export function Lighting() {
  return (
    <>
      <Environment resolution={256} frames={1}>
        <color attach="background" args={["#020409"]} />
        <Lightformer form="rect" intensity={2.4} color="#2fdcff" position={[-9, 3, 4]} rotation-y={Math.PI / 2} scale={[9, 5, 1]} />
        <Lightformer form="rect" intensity={2} color="#37ff9b" position={[-8, 0.6, -3]} rotation-y={Math.PI / 2} scale={[7, 2, 1]} />
        <Lightformer form="rect" intensity={2.2} color="#ff2448" position={[10, 1.5, -3]} rotation-y={-Math.PI / 2} scale={[7, 4, 1]} />
        {/* the direction the cells' steel caps mirror as the camera moves: keeps them silver */}
        <Lightformer form="rect" intensity={1.7} color="#dce9ff" position={[8.2, 0.6, 4.6]} rotation-y={-2.08} scale={[11, 4.5, 1]} />
        {[-4, 0, 4].map((z) => (
          <Lightformer key={z} form="rect" intensity={1.5} color="#a6d6ff" position={[0, 9, z]} rotation-x={Math.PI / 2} scale={[14, 0.6, 1]} />
        ))}
        <Lightformer form="rect" intensity={0.5} color="#1c4c8f" position={[0, 2, 12]} scale={[16, 7, 1]} />
      </Environment>
      <ambientLight intensity={0.14} color="#9cc4ff" />
      <directionalLight position={[-4, 7, 9]} intensity={0.6} color="#a8d6ff" />
      <pointLight position={wallToWorld(-1.4, 2.6, 2.2)} color="#34d8ff" intensity={14} distance={9} decay={2} />
      <pointLight position={wallToWorld(-3.4, 1.8, 1.4)} color="#3bff9c" intensity={7} distance={7} decay={2} />
    </>
  );
}
