/** Happy Herbivore's triceratops as a thermal printer draws a logo: one ink,
 *  the eye and the smile left as bare paper. */
export function Dino({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 40" className={className} aria-hidden>
      <g fill="currentColor">
        {/* frill, with its scalloped rim */}
        <circle cx="41" cy="16" r="10" />
        {[200, 235, 270, 305, 340].map((a) => {
          const r = (a * Math.PI) / 180;
          return <circle key={a} cx={41 + Math.cos(r) * 10} cy={16 + Math.sin(r) * 10} r="2.6" />;
        })}
        {/* tail, body, legs */}
        <path d="M14 21 Q6 22 1 28 Q9 29 15 28 Z" />
        <ellipse cx="28" cy="24" rx="15.5" ry="9.5" />
        <rect x="16" y="28" width="5.5" height="9" rx="2" />
        <rect x="24" y="30" width="5.5" height="8" rx="2" />
        <rect x="33" y="30" width="5.5" height="8" rx="2" />
        <rect x="40" y="28" width="5.5" height="9" rx="2" />
        {/* head, beak and three horns */}
        <ellipse cx="49" cy="20" rx="9.5" ry="8" />
        <path d="M54 16 L63 21.5 L54 26 Z" />
        <path d="M46.5 13.5 L60 3 L51 15 Z" />
        <path d="M42 14 L50 5 L45.5 15.5 Z" />
        <path d="M56.5 16.5 L59 11 L60 18 Z" />
      </g>
      <g fill="var(--paper, #f4f0e6)">
        <circle cx="51.5" cy="18" r="1.7" />
        <path d="M52 23.2 Q55.5 25.4 58.6 22.6 L58.9 23.6 Q55.4 26.8 51.7 24.2 Z" />
        {/* a few spots on the back */}
        <circle cx="25" cy="18.5" r="1.3" />
        <circle cx="31" cy="17" r="1.1" />
        <circle cx="21" cy="22" r="1" />
      </g>
    </svg>
  );
}
