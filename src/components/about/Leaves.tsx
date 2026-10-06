/** A leaf from its stem's end at (0, 0) to its tip at (0, -100): broad
 *  (a fig's) or long and pointed. */
const SHAPES = {
  broad: "M0 0C-8-6-34-22-38-50-41-74-22-94 0-100 22-94 41-74 38-50 34-22 8-6 0 0Z",
  long: "M0 0C-6-10-20-34-21-58-21-80-10-94 0-100 10-94 21-80 21-58 20-34 6-10 0 0Z",
};

/** One leaf of a spray: the way its stem leans (degrees from up), how long
 *  the stem is and how big the leaf (in leaf lengths), its green, its shape. */
export type Leaf = { turn: number; stem: number; size: number; fill: string; shape?: keyof typeof SHAPES; twist?: number };

/**
 * A plant as a spray of leaves on stems from one root at the bottom middle
 * of a 400 by 400 box, each leaf with a lighter midrib. Drawn sharp: the
 * caller blurs it to its depth.
 */
export function Leaves({ leaves, className }: { leaves: Leaf[]; className?: string }) {
  return (
    <svg aria-hidden className={className} viewBox="0 0 400 400" preserveAspectRatio="xMidYMax meet">
      <g transform="translate(200 400)">
        {leaves.map((l, i) => {
          const len = l.stem * 100;
          return (
            <g key={i} transform={`rotate(${l.turn})`}>
              <path d={`M0 0Q${l.turn * 0.4} ${-len * 0.5} 0 ${-len}`} stroke="#3d5a2c" strokeWidth={3} fill="none" opacity={0.7} />
              <g transform={`translate(0 ${-len}) rotate(${l.twist ?? 0}) scale(${l.size})`}>
                <path d={SHAPES[l.shape ?? "broad"]} fill={l.fill} />
                <path d="M0 0Q2-50 0-96" stroke="rgba(235,245,210,0.35)" strokeWidth={1.6} fill="none" />
              </g>
            </g>
          );
        })}
      </g>
    </svg>
  );
}
