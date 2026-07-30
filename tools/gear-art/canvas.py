"""A 32x32 pixel buffer and the mask primitives every icon is built from.

Icons are composed as *masks* — plain sets of pixel coordinates — and painted
afterwards. That split is what keeps forty shapes readable: a shape only has to
describe where its metal is, and one shading rule lights every one of them the
same way (up-left edge catches the light, down-right edge falls into shadow).

Everything is drawn at 1x. Pixel art does not survive scaling, and the icons are
rendered in the UI at their native size.
"""

from __future__ import annotations

import math
from typing import Callable, Iterable, Sequence

from PIL import Image

from pixelart import Color, Sprite, mix, shade

SIZE = 32

Point = tuple[float, float]
Mask = set[tuple[int, int]]
#: Half-width of a stroke at parameter `t` along its spine, in pixels.
Width = float | Callable[[float], float]


# --------------------------------------------------------------------------
# geometry
# --------------------------------------------------------------------------


def _as_width(value: Width) -> Callable[[float], float]:
    if callable(value):
        return value

    return lambda _t: float(value)


def taper(start: float, end: float, power: float = 1.0) -> Callable[[float], float]:
    """Width that shrinks from `start` to `end` along the spine."""
    return lambda t: start + (end - start) * (t**power)


def curve(points: Sequence[Point], samples: int = 96) -> list[Point]:
    """A polyline through the control points: Bezier for 3-4, straight for 2.

    Bezier rather than an arc because a blade's curvature is easier to state as
    "bow towards here" than as a centre and a radius.
    """
    if len(points) == 2:
        (x0, y0), (x1, y1) = points

        return [
            (x0 + (x1 - x0) * index / samples, y0 + (y1 - y0) * index / samples)
            for index in range(samples + 1)
        ]

    sampled: list[Point] = []

    for index in range(samples + 1):
        t = index / samples
        sampled.append(_bezier_at(points, t))

    return sampled


def _bezier_at(points: Sequence[Point], t: float) -> Point:
    current = list(points)

    while len(current) > 1:
        current = [
            (
                current[i][0] + (current[i + 1][0] - current[i][0]) * t,
                current[i][1] + (current[i + 1][1] - current[i][1]) * t,
            )
            for i in range(len(current) - 1)
        ]

    return current[0]


def along(start: Point, end: Point, t: float) -> Point:
    return (start[0] + (end[0] - start[0]) * t, start[1] + (end[1] - start[1]) * t)


def offset(point: Point, direction: Point, distance: float) -> Point:
    length = math.hypot(*direction) or 1.0

    return (point[0] + direction[0] / length * distance, point[1] + direction[1] / length * distance)


def perpendicular(start: Point, end: Point) -> Point:
    """Unit normal of the segment, pointing to its up-left side."""
    dx, dy = end[0] - start[0], end[1] - start[1]
    length = math.hypot(dx, dy) or 1.0
    normal = (dy / length, -dx / length)

    # Two normals exist; take the one heading up-left so `left`/`right` widths
    # mean the same thing for every stroke in the set.
    return normal if (normal[0] - normal[1]) < 0 else (-normal[0], -normal[1])


# --------------------------------------------------------------------------
# masks
# --------------------------------------------------------------------------


def stroke_mask(spine: Sequence[Point], left: Width, right: Width | None = None) -> Mask:
    """Pixels within the (possibly asymmetric) band around a spine.

    Asymmetric widths are what make single-edged shapes possible: an axe head is
    a stroke that is four pixels wide on its outer side and half a pixel on the
    side facing the haft.
    """
    right = left if right is None else right
    left_at, right_at = _as_width(left), _as_width(right)
    samples = curve(spine) if len(spine) < 8 else list(spine)
    mask: Mask = set()

    if len(samples) < 2:
        return mask

    reach = max(max(left_at(i / 12) for i in range(13)), max(right_at(i / 12) for i in range(13)))
    box = _bounds(samples, reach + 1)

    for py in range(box[1], box[3] + 1):
        for px in range(box[0], box[2] + 1):
            point = (px + 0.5, py + 0.5)
            distance, t, side = _nearest(samples, point)
            limit = left_at(t) if side < 0 else right_at(t)

            if distance <= limit:
                mask.add((px, py))

    return mask


def _bounds(points: Sequence[Point], margin: float) -> tuple[int, int, int, int]:
    xs = [x for x, _ in points]
    ys = [y for _, y in points]

    return (
        max(0, int(min(xs) - margin)),
        max(0, int(min(ys) - margin)),
        min(SIZE - 1, int(max(xs) + margin) + 1),
        min(SIZE - 1, int(max(ys) + margin) + 1),
    )


def _nearest(samples: Sequence[Point], point: Point) -> tuple[float, float, float]:
    """Distance to the polyline, the parameter there, and which side we are on."""
    best = (float('inf'), 0.0, 0.0)

    for index in range(len(samples) - 1):
        start, end = samples[index], samples[index + 1]
        dx, dy = end[0] - start[0], end[1] - start[1]
        length_sq = dx * dx + dy * dy

        if length_sq == 0:
            continue

        local = max(0.0, min(1.0, ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / length_sq))
        closest = (start[0] + dx * local, start[1] + dy * local)
        distance = math.hypot(point[0] - closest[0], point[1] - closest[1])

        if distance < best[0]:
            normal = perpendicular(start, end)
            side = (point[0] - closest[0]) * normal[0] + (point[1] - closest[1]) * normal[1]
            t = (index + local) / (len(samples) - 1)
            best = (distance, t, -1.0 if side > 0 else 1.0)

    return best


def polygon_mask(points: Sequence[Point]) -> Mask:
    """Even-odd fill of a closed polygon."""
    mask: Mask = set()
    box = _bounds(points, 1)

    for py in range(box[1], box[3] + 1):
        for px in range(box[0], box[2] + 1):
            if _inside(points, (px + 0.5, py + 0.5)):
                mask.add((px, py))

    return mask


def _inside(points: Sequence[Point], point: Point) -> bool:
    x, y = point
    inside = False
    count = len(points)

    for index in range(count):
        x0, y0 = points[index]
        x1, y1 = points[(index + 1) % count]

        if (y0 > y) != (y1 > y) and x < x0 + (y - y0) / (y1 - y0) * (x1 - x0):
            inside = not inside

    return inside


def disc_mask(center: Point, radius: float, squash: float = 1.0) -> Mask:
    """A filled circle, or an ellipse when `squash` is not 1."""
    mask: Mask = set()
    cx, cy = center

    for py in range(max(0, int(cy - radius - 1)), min(SIZE, int(cy + radius + 2))):
        for px in range(max(0, int(cx - radius / squash - 1)), min(SIZE, int(cx + radius / squash + 2))):
            dx = (px + 0.5 - cx) * squash
            dy = py + 0.5 - cy

            if math.hypot(dx, dy) <= radius:
                mask.add((px, py))

    return mask


def ring_mask(center: Point, radius: float, thickness: float = 1.5, squash: float = 1.0) -> Mask:
    return disc_mask(center, radius, squash) - disc_mask(center, radius - thickness, squash)


def rect_mask(x0: float, y0: float, x1: float, y1: float) -> Mask:
    return {
        (px, py)
        for py in range(max(0, int(round(y0))), min(SIZE, int(round(y1)) + 1))
        for px in range(max(0, int(round(x0))), min(SIZE, int(round(x1)) + 1))
    }


def clip(mask: Mask) -> Mask:
    return {(x, y) for x, y in mask if 1 <= x < SIZE - 1 and 1 <= y < SIZE - 1}


# --------------------------------------------------------------------------
# painting
# --------------------------------------------------------------------------


class Canvas:
    """The buffer an icon is drawn into, plus the one shading rule."""

    def __init__(self) -> None:
        self.pixels: dict[tuple[int, int], Color] = {}

    def paint(
        self,
        mask: Iterable[tuple[int, int]],
        tones: Sequence[Color],
        *,
        flat: bool = False,
    ) -> Mask:
        """Fills a mask, lighting its up-left edge and shading its down-right.

        `tones` is (dark, body, light); a single tone paints flat. Returns the
        mask it painted so callers can pattern inside it.
        """
        mask = clip(set(mask))
        dark, body, light = (tones[0], tones[min(1, len(tones) - 1)], tones[-1])

        for pixel in sorted(mask):
            x, y = pixel

            if flat or len(tones) == 1:
                self.pixels[pixel] = body
                continue

            up_left = (x, y - 1) not in mask or (x - 1, y) not in mask
            down_right = (x, y + 1) not in mask or (x + 1, y) not in mask

            if up_left and not down_right:
                self.pixels[pixel] = light
            elif down_right and not up_left:
                self.pixels[pixel] = dark
            else:
                self.pixels[pixel] = body

        return mask

    def dot(self, x: float, y: float, color: Color) -> None:
        pixel = (int(round(x)), int(round(y)))

        if 0 <= pixel[0] < SIZE and 0 <= pixel[1] < SIZE:
            self.pixels[pixel] = color

    def dots(self, pixels: Iterable[tuple[int, int]], color: Color) -> None:
        for x, y in clip(set(pixels)):
            self.pixels[(x, y)] = color

    def recolor(self, mask: Iterable[tuple[int, int]], color: Color, blend: float = 1.0) -> None:
        """Tints pixels already on the canvas — used for glows and patina."""
        for pixel in clip(set(mask)):
            if pixel in self.pixels:
                self.pixels[pixel] = mix(self.pixels[pixel], color, blend)

    def occupied(self) -> Mask:
        return set(self.pixels)

    def to_image(self) -> Image.Image:
        sprite = Sprite(SIZE, SIZE)

        for (x, y), color in self.pixels.items():
            sprite.img.putpixel((x, y), (*color, 255))

        sprite.outline(color=(20, 16, 20), alpha=245)

        return sprite.img


def tones(base: Sequence[Color]) -> tuple[Color, Color, Color]:
    """(dark, body, light) picked out of a tier's five-step ramp.

    The darkest step of a ramp is reserved for the outline pass, so the shaded
    face starts one step in — otherwise the late tiers, whose ramps begin near
    black, would read as a silhouette with no shape in it at all.
    """
    return (base[1], base[2], base[4])


def bright_tones(base: Sequence[Color]) -> tuple[Color, Color, Color]:
    """One step up the ramp — for the parts that should read as polished."""
    return (base[2], base[3], base[4])


def interior(mask: Mask, depth: int = 1) -> Mask:
    """The mask minus its own border, so a pattern cannot eat the shading."""
    shrunk = set(mask)

    for _ in range(depth):
        shrunk = {
            (x, y)
            for x, y in shrunk
            if {(x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)} <= shrunk
        }

    return shrunk


def gem_tones(accent: Color, light: Color) -> tuple[Color, Color, Color]:
    return (shade(accent, 0.55), accent, light)
