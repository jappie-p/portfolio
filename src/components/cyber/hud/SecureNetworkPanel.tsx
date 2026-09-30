"use client";
import { Text } from "@react-three/drei";
import { useT } from "@/i18n/useT";
import { HudPanel, Glyph, type PanelPlacement } from "./HudPanel";
import { HUD } from "./colors";
import { ICON } from "../lib/icons";
import { FONTS } from "../lib/palette";

const ROW = 0.29;

export function SecureNetworkPanel({ placement }: { placement: PanelPlacement }) {
  const h = useT().cyberHud;
  const rows = [h.checkTraffic, h.checkAuth, h.checkEncryption, h.checkIntrusion, h.checkStatus];
  return (
    <HudPanel placement={placement} size={[2.6, 1.95]} color={HUD.mint} title={h.secureNetwork} icon={ICON.shieldCheck}>
      {rows.map((label, i) => (
        <group key={i} position={[0, -i * ROW - 0.12, 0]}>
          <Glyph icon={ICON.check} color={HUD.mint} size={0.26} position={[0.1, 0, 0]} />
          <Text font={FONTS.label} fontSize={0.118} letterSpacing={0.05} color={HUD.text} anchorX="left" anchorY="middle" position={[0.3, -0.004, 0]}>
            {label}
          </Text>
        </group>
      ))}
    </HudPanel>
  );
}
