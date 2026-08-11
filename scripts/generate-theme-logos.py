"""Recolor the 3D Opal mark per theme: vessel = accent, lid = theme gradient."""

from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
BRAND = ROOT / "public" / "brand"
SOURCE = BRAND / "logo-mark.png"

THEMES: dict[str, dict[str, str]] = {
    "vercel-light": {
        "background100": "#fafafa",
        "backgroundElevated": "#ffffff",
        "gray1000": "#171717",
        "gray900": "#4d4d4d",
        "focusColor": "#0072f5",
    },
    "vercel-dark": {
        "background100": "#0a0a0a",
        "backgroundElevated": "#171717",
        "gray1000": "#ededed",
        "gray900": "#a1a1a1",
        "focusColor": "#3291ff",
    },
    "midnight": {
        "background100": "#0b1220",
        "backgroundElevated": "#111a2e",
        "gray1000": "#e8eefc",
        "gray900": "#9aa8c7",
        "focusColor": "#5b8def",
    },
    "ocean": {
        "background100": "#f0f9fb",
        "backgroundElevated": "#ffffff",
        "gray1000": "#0f2d3a",
        "gray900": "#3d6573",
        "focusColor": "#0891b2",
    },
    "forest": {
        "background100": "#f3f7f2",
        "backgroundElevated": "#ffffff",
        "gray1000": "#1a2e1f",
        "gray900": "#4a5f4e",
        "focusColor": "#2f855a",
    },
    "sunset": {
        "background100": "#fff8f1",
        "backgroundElevated": "#ffffff",
        "gray1000": "#3b2214",
        "gray900": "#7a5642",
        "focusColor": "#ea580c",
    },
    "rose": {
        "background100": "#fff5f7",
        "backgroundElevated": "#ffffff",
        "gray1000": "#3f1d2b",
        "gray900": "#7a4a5c",
        "focusColor": "#e11d48",
    },
    "lavender": {
        "background100": "#f7f4ff",
        "backgroundElevated": "#ffffff",
        "gray1000": "#2a1f3d",
        "gray900": "#6b5b8a",
        "focusColor": "#7c3aed",
    },
    "slate": {
        "background100": "#f1f5f9",
        "backgroundElevated": "#ffffff",
        "gray1000": "#0f172a",
        "gray900": "#475569",
        "focusColor": "#2563eb",
    },
    "sand": {
        "background100": "#f8f4ec",
        "backgroundElevated": "#fffdf8",
        "gray1000": "#2c2418",
        "gray900": "#6b5f4f",
        "focusColor": "#b45309",
    },
    "nord": {
        "background100": "#eceff4",
        "backgroundElevated": "#ffffff",
        "gray1000": "#2e3440",
        "gray900": "#4c566a",
        "focusColor": "#5e81ac",
    },
    "coffee": {
        "background100": "#f5efe8",
        "backgroundElevated": "#fffaf5",
        "gray1000": "#2b1d14",
        "gray900": "#6b4f3f",
        "focusColor": "#92400e",
    },
    "mint": {
        "background100": "#f0fdf8",
        "backgroundElevated": "#ffffff",
        "gray1000": "#0f2922",
        "gray900": "#3f6b5c",
        "focusColor": "#059669",
    },
    "charcoal": {
        "background100": "#141414",
        "backgroundElevated": "#1f1f1f",
        "gray1000": "#f5f5f5",
        "gray900": "#b3b3b3",
        "focusColor": "#a3a3a3",
    },
    "high-contrast": {
        "background100": "#ffffff",
        "backgroundElevated": "#ffffff",
        "gray1000": "#000000",
        "gray900": "#1a1a1a",
        "focusColor": "#0000ee",
    },
}


def hex_to_rgb(hex_color: str) -> tuple[float, float, float]:
    value = hex_color.lstrip("#")
    return (int(value[0:2], 16), int(value[2:4], 16), int(value[4:6], 16))


def mix(
    a: tuple[float, float, float], b: tuple[float, float, float], t: float
) -> tuple[float, float, float]:
    t = max(0.0, min(1.0, t))
    return (
        a[0] + (b[0] - a[0]) * t,
        a[1] + (b[1] - a[1]) * t,
        a[2] + (b[2] - a[2]) * t,
    )


def lighten(color: tuple[float, float, float], amount: float) -> tuple[float, float, float]:
    return mix(color, (255.0, 255.0, 255.0), amount)


def darken(color: tuple[float, float, float], amount: float) -> tuple[float, float, float]:
    return mix(color, (0.0, 0.0, 0.0), amount)


def luma(rgb: tuple[float, float, float]) -> float:
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]


def chroma(rgb: tuple[float, float, float]) -> float:
    return max(rgb) - min(rgb)


def lerp_stops(
    stops: list[tuple[float, float, float]], t: float
) -> tuple[float, float, float]:
    if t <= 0:
        return stops[0]
    if t >= 1:
        return stops[-1]
    scaled = t * (len(stops) - 1)
    index = int(scaled)
    frac = scaled - index
    return mix(stops[index], stops[min(index + 1, len(stops) - 1)], frac)


def shade_with_lighting(
    base: tuple[float, float, float], lighting: float
) -> tuple[int, int, int]:
    """Map original luminance (0-1) onto a material color, keeping 3D folds."""
    shadow = darken(base, 0.52)
    highlight = lighten(base, 0.58)
    if lighting < 0.5:
        color = mix(shadow, base, lighting * 2.0)
    else:
        color = mix(base, highlight, (lighting - 0.5) * 2.0)
    return (
        int(max(0, min(255, round(color[0])))),
        int(max(0, min(255, round(color[1])))),
        int(max(0, min(255, round(color[2])))),
    )


def classify(px: tuple[int, int, int, int], y: int) -> str:
    r, g, b, a = px
    if a < 8:
        return "empty"
    rgb = (float(r), float(g), float(b))
    pixel_luma = luma(rgb)
    pixel_chroma = chroma(rgb)
    if pixel_luma < 28 and pixel_chroma < 14:
        return "plate"
    # Floating lid sits in the upper third of the mark and is the only saturated part.
    if y < 490 and pixel_chroma >= 22:
        return "lid"
    if pixel_luma >= 36:
        return "vessel"
    return "shadow"


def render(source: Image.Image, theme: dict[str, str]) -> Image.Image:
    plate = hex_to_rgb(theme["background100"])
    focus = hex_to_rgb(theme["focusColor"])
    muted = hex_to_rgb(theme["gray900"])
    ink = hex_to_rgb(theme["gray1000"])
    elevated = hex_to_rgb(theme["backgroundElevated"])

    lid_stops = [
        lighten(focus, 0.55),
        lighten(focus, 0.22),
        focus,
        mix(focus, muted, 0.4),
        mix(muted, ink, 0.25),
        mix(ink, elevated, 0.15),
    ]

    width, height = source.size
    pixels = source.load()
    out = Image.new("RGBA", source.size)
    dest = out.load()

    vessel_lumas: list[float] = []
    lid_lumas: list[float] = []
    mark_xs: list[int] = []
    labels: list[list[str]] = []

    for y in range(height):
        row: list[str] = []
        for x in range(width):
            label = classify(pixels[x, y], y)
            row.append(label)
            if label in {"lid", "vessel"}:
                mark_xs.append(x)
                value = luma(pixels[x, y][:3])
                if label == "lid":
                    lid_lumas.append(value)
                else:
                    vessel_lumas.append(value)
        labels.append(row)

    min_x = min(mark_xs) if mark_xs else 0
    max_x = max(mark_xs) if mark_xs else width - 1
    span_x = max(1, max_x - min_x)
    vessel_min = min(vessel_lumas) if vessel_lumas else 0
    vessel_max = max(vessel_lumas) if vessel_lumas else 255
    lid_min = min(lid_lumas) if lid_lumas else 0
    lid_max = max(lid_lumas) if lid_lumas else 255

    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            label = labels[y][x]
            if label == "empty":
                dest[x, y] = (0, 0, 0, 0)
                continue
            if label == "plate":
                dest[x, y] = (
                    int(plate[0]),
                    int(plate[1]),
                    int(plate[2]),
                    a,
                )
                continue
            if label == "shadow":
                shade = darken(plate, 0.35)
                dest[x, y] = (
                    int(shade[0]),
                    int(shade[1]),
                    int(shade[2]),
                    a,
                )
                continue

            lighting_src = luma((r, g, b))
            if label == "lid":
                lighting = (lighting_src - lid_min) / max(1.0, lid_max - lid_min)
                base = lerp_stops(lid_stops, (x - min_x) / span_x)
            else:
                lighting = (lighting_src - vessel_min) / max(
                    1.0, vessel_max - vessel_min
                )
                base = focus
            nr, ng, nb = shade_with_lighting(base, lighting)
            dest[x, y] = (nr, ng, nb, a)

    return out


def main() -> None:
    source = Image.open(SOURCE).convert("RGBA")
    themes_dir = BRAND / "themes"
    themes_dir.mkdir(parents=True, exist_ok=True)

    for slug, tokens in THEMES.items():
        image = render(source, tokens)
        image.save(themes_dir / f"{slug}.png", "PNG", optimize=True)
        print("wrote", slug)

    vercel_light = render(source, THEMES["vercel-light"])
    vercel_dark = render(source, THEMES["vercel-dark"])
    vercel_light.save(BRAND / "logo.png", "PNG", optimize=True)
    vercel_light.save(BRAND / "logo-light.png", "PNG", optimize=True)
    vercel_dark.save(BRAND / "logo-dark.png", "PNG", optimize=True)
    vercel_light.save(BRAND / "logo-mark-on-light.png", "PNG", optimize=True)
    vercel_dark.save(BRAND / "logo-mark-on-dark.png", "PNG", optimize=True)
    print("wrote fallback wordmark plates")


if __name__ == "__main__":
    main()
