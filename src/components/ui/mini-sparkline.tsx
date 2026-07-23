import { cn } from "@/lib/cn";

export function MiniSparkline({
  values,
  className,
  stroke = "currentColor",
  fill,
}: {
  values: number[];
  className?: string;
  stroke?: string;
  fill?: string;
}) {
  const width = 120;
  const height = 36;
  const pad = 2;

  if (!values.length) {
    return (
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className={cn("h-9 w-[7.5rem]", className)}
        aria-hidden
      />
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const points = values.map((value, index) => {
    const x =
      values.length === 1
        ? width / 2
        : pad + (index / (values.length - 1)) * (width - pad * 2);
    const y = height - pad - ((value - min) / span) * (height - pad * 2);
    return { x, y };
  });

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x} ${p.y}`).join(" ");
  const area = `${line} L${points[points.length - 1].x} ${height} L${points[0].x} ${height} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={cn("h-9 w-[7.5rem]", className)}
      aria-hidden
    >
      {fill ? <path d={area} fill={fill} opacity={0.18} /> : null}
      <path
        d={line}
        fill="none"
        stroke={stroke}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
