/** The words a receipt needs, in the reader's language. The menu and the brand
 *  are the kiosk's own and stay as they are. */
export type ReceiptLabels = { order: string; eatIn: string; total: string; thanks: string };

/** A real order off the Happy Herbivore breakfast menu, prices in cents. */
export const ITEMS = [
  { name: "Morning Boost Açaí Bowl", cents: 750 },
  { name: "The Garden Breakfast Wrap", cents: 650 },
  { name: "Peanut Butter & Banana Toast", cents: 500 },
] as const;

export const TOTAL = ITEMS.reduce((sum, i) => sum + i.cents, 0);
export const ORDER_NO = "0427";
export const TIME = "12:41";

/** €7,50: the kiosk prints the Dutch way whatever language the reader has. */
export const euro = (cents: number) => `€${Math.floor(cents / 100)},${String(cents % 100).padStart(2, "0")}`;

// EAN-13, so the barcode on the receipt actually scans (871 is the Dutch prefix)
const L_CODE = ["0001101", "0011001", "0010011", "0111101", "0100011", "0110001", "0101111", "0111011", "0110111", "0001011"];
const PARITY = ["LLLLLL", "LLGLGG", "LLGGLG", "LLGGGL", "LGLLGG", "LGGLLG", "LGGGLL", "LGLGLG", "LGLGGL", "LGGLGL"];
const R_CODE = L_CODE.map((c) => [...c].map((b) => (b === "0" ? "1" : "0")).join(""));
const G_CODE = R_CODE.map((c) => [...c].reverse().join(""));

function checkDigit(twelve: string): number {
  const sum = [...twelve].reduce((s, d, i) => s + Number(d) * (i % 2 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10;
}

export const EAN = (() => {
  const base = `871234${ORDER_NO.padStart(6, "0")}`;
  return base + checkDigit(base);
})();

/** The 95 modules of the EAN-13 above, as a string of 0s and 1s. */
export function eanModules(code = EAN): string {
  const parity = PARITY[Number(code[0])];
  let bits = "101";
  for (let i = 1; i <= 6; i++) bits += (parity[i - 1] === "L" ? L_CODE : G_CODE)[Number(code[i])];
  bits += "01010";
  for (let i = 7; i <= 12; i++) bits += R_CODE[Number(code[i])];
  return bits + "101";
}

/** The modules as hard-stopped gradient stops; `guards` keeps only the guard bars. */
export function barcodeGradient(ink: string, guards = false): string {
  const bits = eanModules();
  const guard = (i: number) => i < 3 || (i >= 45 && i < 50) || i >= 92;
  const k = 100 / bits.length;
  const stops: string[] = [];
  let i = 0;
  while (i < bits.length) {
    const on = bits[i] === "1" && (!guards || guard(i));
    let j = i + 1;
    while (j < bits.length && (bits[j] === "1" && (!guards || guard(j))) === on) j++;
    stops.push(`${on ? ink : "transparent"} ${(i * k).toFixed(3)}% ${(j * k).toFixed(3)}%`);
    i = j;
  }
  return `linear-gradient(90deg, ${stops.join(", ")})`;
}
