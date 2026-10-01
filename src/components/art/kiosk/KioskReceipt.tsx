"use client";
import { useRef, type CSSProperties } from "react";
import { Dino } from "./Dino";
import { EAN, ITEMS, ORDER_NO, TIME, TOTAL, barcodeGradient, euro, type ReceiptLabels } from "./receipt";
import s from "./receipt.module.css";
import { useFeed } from "./useFeed";
import { useOnScreen } from "./useOnScreen";

export type { ReceiptLabels };

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const FONT = ["Regular", "Bold"]
  .map((w, i) => `@font-face{font-family:"HH Receipt Mono";src:url("${BASE}/fonts/GeistMono-${w}.woff") format("woff");font-weight:${i ? 700 : 400};font-display:swap}`)
  .join("");

// paper tooth: a whisper of warm fibre noise, rasterised once by the browser
const GRAIN = `url("data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 0.36 0 0 0 0 0.3 0 0 0 0 0.2 0.14 0 0 0 0"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>',
)}")`;

const INK = "rgba(33,30,27,0.92)";
const BARCODE: CSSProperties = {
  backgroundImage: `${barcodeGradient(INK, true)}, ${barcodeGradient(INK)}`,
  backgroundSize: "100% 100%, 100% calc(100% - 0.55em)",
};

/** The kiosk's receipt printer, printing a real order line by line: it steps
 *  out of the slot with a thermal printer's shudder, hangs for a moment, is
 *  torn off, and the next one starts. Real text, in the reader's language
 *  through `labels`; prices are the kiosk's own (€7,50). `active` runs it,
 *  `still` shows the whole receipt printed. Scale it with font-size. */
export function KioskReceipt({ labels, active, still, className = "" }: { labels: ReceiptLabels; active: boolean; still: boolean; className?: string }) {
  const root = useRef<HTMLDivElement>(null);
  const lift = useRef<HTMLDivElement>(null);
  const paper = useRef<HTMLDivElement>(null);
  const onScreen = useOnScreen(root);
  useFeed({ root, lift, paper }, active && onScreen, still);

  return (
    <div ref={root} aria-hidden className={`${s.root} ${className}`} style={{ "--grain": GRAIN } as CSSProperties}>
      <style href="hh-receipt-mono" precedence="default">
        {FONT}
      </style>
      <div className={s.feed}>
        <div ref={lift} className={s.lift}>
          <div ref={paper} className={s.paper}>
            <div className={s.logo}>
              <Dino className="block h-auto w-full" />
            </div>
            <p className={s.brand}>HAPPY HERBIVORE</p>
            <p className={s.tagline}>healthy in a hurry</p>
            <div className={s.rule} />
            <p className={s.row}>
              <span>
                {labels.order} #{ORDER_NO}
              </span>
              <span>{TIME}</span>
            </p>
            <p>{labels.eatIn}</p>
            <div className={s.rule} />
            {ITEMS.map((item) => (
              <p key={item.name} className={s.row}>
                <span>1x {item.name}</span>
                <span>{euro(item.cents)}</span>
              </p>
            ))}
            <div className={s.rule} />
            <p className={`${s.row} ${s.total}`}>
              <span>{labels.total}</span>
              <span>{euro(TOTAL)}</span>
            </p>
            <div className={s.rule} />
            <div className={s.barcode} style={BARCODE} />
            <p className={s.digits}>
              <span>{EAN[0]}</span>
              <span>{EAN.slice(1, 7)}</span>
              <span>{EAN.slice(7)}</span>
            </p>
            <p className={s.thanks}>{labels.thanks}</p>
          </div>
        </div>
      </div>
      <div className={s.printer}>
        <div className={s.slot} />
        <span className={s.button} />
        <span className={s.led} />
      </div>
    </div>
  );
}
