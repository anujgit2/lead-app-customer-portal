import { cn } from "@/lib/utils";

const W = 1200;
const H = 600;
const STEP = 18;

function buildPaths() {
  const paths: string[] = [];

  for (let y = 0; y <= H; y += STEP) {
    const bend = 70 * Math.sin((Math.PI * y) / H);
    paths.push(`M0 ${y} Q ${W / 2} ${y + bend} ${W} ${y}`);
  }

  for (let x = 0; x <= W; x += STEP) {
    const bend = (x - W / 2) * 0.22;
    paths.push(`M${x} 0 Q ${x + bend} ${H / 2} ${x} ${H}`);
  }

  return paths.join(" ");
}

const GRID_PATH = buildPaths();

export function CurvedGrid({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className={cn("lp-grid-mask pointer-events-none absolute inset-0 h-full w-full", className)}
    >
      <path
        d={GRID_PATH}
        fill="none"
        stroke="white"
        strokeOpacity={0.09}
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
