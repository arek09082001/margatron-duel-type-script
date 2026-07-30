"""Low-level pixel-art primitives shared by every town.

The whole art pipeline is deterministic: one seed per town feeds both the
numpy generator (textures) and the Python generator (placement jitter), so
re-running `build.py` reproduces byte-identical images. That matters because
the click areas in `src/game/catalog.ts` are derived from the same layout
data — art and hitboxes can never drift apart.

Everything is drawn at 1x into an 800x512 canvas: 25 x 16 tiles of 32px,
which is exactly the size of `#map-area` in the game shell.
"""

from __future__ import annotations

import random
from typing import Callable, Sequence

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter

TILE = 32
MAP_W = 25 * TILE  # 800
MAP_H = 16 * TILE  # 512

# The art's smallest deliberate feature. Noise, dither patterns and mask edges
# are all built on this grid and nearest-upscaled, which is what separates
# clustered pixel art from painterly grain: at UNIT = 1 a texture is noise, at
# UNIT = 2 it is pixels.
UNIT = 2

Color = tuple[int, int, int]

# 4x4 ordered dither. Blending two flat tones through this instead of picking
# randomly is the 16-bit way to fake a third tone, and it tiles predictably
# rather than looking like film grain.
BAYER = (
    np.array(
        [
            [0, 8, 2, 10],
            [12, 4, 14, 6],
            [3, 11, 1, 9],
            [15, 7, 13, 5],
        ],
        dtype=np.float64,
    )
    + 0.5
) / 16.0


# --------------------------------------------------------------------------
# colour helpers
# --------------------------------------------------------------------------


def rgb(value: str) -> Color:
    """`'#4a7a34'` -> `(74, 122, 52)`."""
    value = value.lstrip('#')
    return (int(value[0:2], 16), int(value[2:4], 16), int(value[4:6], 16))


def ramp(*values: str) -> list[Color]:
    return [rgb(v) for v in values]


def shade(color: Color, factor: float) -> Color:
    """Multiplies brightness, clamped. `factor < 1` darkens."""
    return tuple(max(0, min(255, int(round(channel * factor)))) for channel in color)  # type: ignore[return-value]


def mix(a: Color, b: Color, t: float) -> Color:
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))  # type: ignore[return-value]


def tint(color: Color, other: Color, t: float) -> Color:
    return mix(color, other, t)


# --------------------------------------------------------------------------
# randomness
# --------------------------------------------------------------------------


class Rng:
    """Pairs a numpy generator (bulk texture noise) with a Python one (choices)."""

    def __init__(self, seed: int | str):
        if isinstance(seed, str):
            seed = int.from_bytes(seed.encode('utf-8'), 'little') % (2**32)
        self.seed = seed
        self.np = np.random.default_rng(seed)
        self.py = random.Random(seed)

    def ri(self, low: int, high: int) -> int:
        """Inclusive integer."""
        return self.py.randint(low, high)

    def rf(self, low: float = 0.0, high: float = 1.0) -> float:
        return self.py.uniform(low, high)

    def pick(self, seq: Sequence):
        return self.py.choice(list(seq))

    def chance(self, probability: float) -> bool:
        return self.py.random() < probability

    def jitter(self, color: Color, amount: int = 8) -> Color:
        delta = self.ri(-amount, amount)
        return shade(color, 1 + delta / 100)

    def child(self, tag: str) -> 'Rng':
        return Rng(f'{self.seed}:{tag}')


# --------------------------------------------------------------------------
# noise
# --------------------------------------------------------------------------


def value_noise(
    rng: Rng,
    width: int,
    height: int,
    cells_x: int,
    cells_y: int | None = None,
    octaves: int = 3,
    persistence: float = 0.55,
    unit: int = UNIT,
) -> np.ndarray:
    """Value noise in `[0, 1]`, quantised onto the `unit` grid.

    Built at `1 / unit` scale and nearest-upscaled, so the smallest feature the
    noise can produce is a `unit x unit` block rather than a lone stray pixel.
    """
    cells_y = cells_y or max(2, round(cells_x * height / width))
    small_w, small_h = max(1, width // unit), max(1, height // unit)
    total = np.zeros((small_h, small_w), dtype=np.float64)
    amplitude, norm = 1.0, 0.0

    for octave in range(octaves):
        cx = max(2, cells_x * (2**octave))
        cy = max(2, cells_y * (2**octave))
        grid = (rng.np.random((cy + 1, cx + 1)) * 255).astype(np.uint8)
        layer = Image.fromarray(grid, 'L').resize((small_w, small_h), Image.BICUBIC)
        total += np.asarray(layer, dtype=np.float64) / 255.0 * amplitude
        norm += amplitude
        amplitude *= persistence

    field = np.clip(total / norm, 0.0, 1.0)
    if unit == 1:
        return field
    blown = Image.fromarray((field * 255).astype(np.uint8), 'L').resize((width, height), Image.NEAREST)
    return np.asarray(blown, dtype=np.float64) / 255.0


def bayer_field(width: int, height: int, unit: int = UNIT) -> np.ndarray:
    """The ordered-dither threshold map, tiled at `unit` scale."""
    tiles_y = height // (4 * unit) + 2
    tiles_x = width // (4 * unit) + 2
    grid = np.tile(BAYER, (tiles_y, tiles_x))
    grid = np.repeat(np.repeat(grid, unit, axis=0), unit, axis=1)
    return grid[:height, :width]


def bands(
    values: np.ndarray,
    colors: Sequence[Color],
    weights: Sequence[float] | None = None,
    blend: float = 0.55,
) -> np.ndarray:
    """Quantises a field into flat tones, ordered-dithering the transitions.

    Thresholds come from quantiles, so each tone gets the share of pixels its
    weight asks for whatever the noise happened to do. `blend` is how far into
    a band the checkerboard from the band below reaches — 0 gives hard steps.
    """
    weights = list(weights or [1.0] * len(colors))
    cumulative = np.cumsum(weights) / sum(weights)
    thresholds = [float(np.quantile(values, c)) for c in cumulative[:-1]]

    index = np.digitize(values, thresholds).astype(np.float64)
    if blend > 0 and len(colors) > 1:
        edges = np.concatenate(([values.min() - 1e-6], thresholds, [values.max() + 1e-6]))
        lower = edges[np.clip(index.astype(int), 0, len(edges) - 2)]
        upper = edges[np.clip(index.astype(int) + 1, 1, len(edges) - 1)]
        position = np.clip((values - lower) / np.maximum(upper - lower, 1e-6), 0, 1)
        threshold = bayer_field(values.shape[1], values.shape[0])
        index = index - ((1 - position) > (1 - blend) + threshold * blend).astype(np.float64)

    palette = np.asarray(colors, dtype=np.uint8)
    return palette[np.clip(index.astype(int), 0, len(colors) - 1)]


def to_image(array: np.ndarray) -> Image.Image:
    return Image.fromarray(array, 'RGB')


def stipple(
    draw: ImageDraw.ImageDraw,
    rng: Rng,
    count: int,
    colors: Sequence[Color],
    width: int,
    height: int,
    size: int = UNIT,
) -> None:
    """Scatters `unit`-sized blocks, snapped to the grid."""
    for _ in range(count):
        x = rng.ri(0, width // size - 1) * size
        y = rng.ri(0, height // size - 1) * size
        draw.rectangle([x, y, x + size - 1, y + size - 1], fill=rng.pick(colors))


# --------------------------------------------------------------------------
# terrain textures — each returns a full-canvas RGB image
# --------------------------------------------------------------------------

GRASS_MEADOW = ramp('#3d6b2f', '#4a7a34', '#57893c', '#659544', '#74a251')
GRASS_FOREST = ramp('#2c5427', '#35622c', '#3f7033', '#4a7d3b', '#578a45')
GRASS_DRY = ramp('#5b6b2e', '#6a7a34', '#79873d', '#879448', '#95a155')
DIRT_PATH = ramp('#6b5335', '#7a613e', '#8a7049', '#977e56', '#a48d64')
SAND_PALE = ramp('#a89267', '#b8a274', '#c7b283', '#d4c294', '#e0d0a6')
COBBLE_GREY = ramp('#6a6a72', '#767680', '#82828c', '#8e8e98', '#9a9aa4')
COBBLE_WARM = ramp('#7a6e60', '#877b6c', '#948879', '#a09586', '#aca293')
WATER_DEEP = ramp('#1d3a5c', '#24486e', '#2b5680', '#356491', '#4073a1')
WATER_TROPIC = ramp('#1b5570', '#216882', '#2a7b94', '#358ea6', '#43a1b7')
SNOW_PALE = ramp('#b9c6d6', '#c6d2df', '#d3dee9', '#e0e9f2', '#eef4fa')
ROCK_GREY = ramp('#4c4a50', '#57555c', '#626068', '#6d6b74', '#787680')
ASH_DARK = ramp('#2a2429', '#342d33', '#3e363d', '#484047', '#524a51')
MARBLE_PALE = ramp('#b6b2c4', '#c3bfd0', '#d0ccdb', '#ddd9e6', '#eae7f1')


def grass_texture(rng: Rng, palette: Sequence[Color], width: int = MAP_W, height: int = MAP_H) -> Image.Image:
    """Meadow drawn as a mat of blades, not a tinted field.

    Reference tilesets leave no flat grass anywhere: every 2-3 pixels carries a
    1px blade in one of four greens, and the broad light/dark patches read
    through that mat rather than instead of it. So the base bands go down
    first, then a blade is stamped in *every* cell of a 3px grid.
    """
    broad = value_noise(rng, width, height, 6, octaves=4)
    fine = value_noise(rng, width, height, 22, octaves=2)
    field = np.clip(broad * 0.68 + fine * 0.32, 0, 1)
    array = bands(field, palette, weights=[2, 3, 4, 3, 2], blend=0.5)
    image = to_image(array)
    draw = ImageDraw.Draw(image)

    # Blade tones are picked relative to the band underneath, so the broad
    # patches survive the mat instead of being buried by it.
    band_index = {tuple(color): index for index, color in enumerate(palette)}
    lookup = np.zeros((height, width), dtype=np.uint8)
    for color, index in band_index.items():
        lookup[np.all(array == np.array(color, dtype=np.uint8), axis=2)] = index

    darker = [shade(tone, 0.80) for tone in palette]
    lighter = [shade(tone, 1.16) for tone in palette]

    step = 3
    for y in range(1, height - 3, step):
        for x in range(0, width - 2, step):
            px_x = x + rng.ri(0, step - 1)
            px_y = y + rng.ri(0, step - 1)
            if px_x >= width or px_y >= height - 3:
                continue
            base = int(lookup[px_y, px_x])
            roll = rng.py.random()
            if roll < 0.42:
                tone = darker[base]
            elif roll < 0.72:
                tone = lighter[base]
            else:
                continue
            length = rng.ri(1, 2)
            draw.rectangle([px_x, px_y, px_x, px_y + length], fill=tone)
            if rng.chance(0.22):
                draw.point((px_x + 1, px_y + length), fill=tone)

    # Sparse dry wisps, the pale smears that break up open ground.
    for _ in range(width * height // 5200):
        x, y = rng.ri(0, width - 1), rng.ri(0, height - 1)
        straw = shade(palette[-1], 1.28)
        for _ in range(rng.ri(6, 14)):
            draw.point([(x, y), (x + 1, y)], fill=straw)
            x += rng.ri(-3, 4)
            y += rng.ri(-2, 3)

    # Denser clumps: knots of shadowed blades that read as tussocks.
    for _ in range(width * height // 2600):
        cx, cy = rng.ri(4, width - 5), rng.ri(4, height - 7)
        tone = darker[int(lookup[cy, cx])]
        for _ in range(rng.ri(5, 11)):
            bx, by = cx + rng.ri(-4, 4), cy + rng.ri(-3, 3)
            if 0 <= bx < width and 0 <= by < height - 3:
                draw.rectangle([bx, by, bx, by + rng.ri(1, 3)], fill=tone)
    return image


def dirt_texture(rng: Rng, palette: Sequence[Color], width: int = MAP_W, height: int = MAP_H) -> Image.Image:
    """Trodden earth: flat browns plus 2px grit and the odd pebble."""
    field = np.clip(
        value_noise(rng, width, height, 9, octaves=3) * 0.6
        + value_noise(rng, width, height, 30, 8, octaves=2) * 0.4,
        0,
        1,
    )
    image = to_image(bands(field, palette, weights=[2, 3, 4, 3, 2], blend=0.6))

    draw = ImageDraw.Draw(image)
    stipple(draw, rng, width * height // 460, [shade(palette[0], 0.88), shade(palette[4], 1.06)], width, height)
    for _ in range(width * height // 1600):
        x, y = rng.ri(0, width // 2 - 2) * 2, rng.ri(0, height // 2 - 2) * 2
        stone = shade(palette[rng.ri(0, 1)], 0.86)
        draw.rectangle([x, y, x + 3, y + 1], fill=stone)
        draw.rectangle([x + 1, y - 1, x + 2, y], fill=shade(stone, 1.25))
    return image


def sand_texture(rng: Rng, palette: Sequence[Color], width: int = MAP_W, height: int = MAP_H) -> Image.Image:
    """Wind-rippled sand: long horizontal ridges."""
    field = value_noise(rng, width, height, 9, 11, octaves=3)
    # Just enough ripple to suggest wind. Any more and the dunes read as
    # wood grain.
    ripple = np.sin(np.linspace(0, 22 * np.pi, height))[:, None] * 0.02
    image = to_image(bands(np.clip(field + ripple, 0, 1), palette, blend=0.65))

    draw = ImageDraw.Draw(image)
    for _ in range(height // 4):
        y = rng.ri(0, height // 2 - 1) * 2
        x = rng.ri(-20, width // 2) * 2
        length = rng.ri(12, 40) * 2
        draw.rectangle([x, y, x + length, y + 1], fill=shade(palette[-1], 1.05))
        draw.rectangle([x + 4, y + 2, x + length - 4, y + 3], fill=shade(palette[1], 0.94))
    stipple(draw, rng, width * height // 900, [shade(palette[0], 0.92), shade(palette[4], 1.05)], width, height)
    return image


def snow_texture(rng: Rng, palette: Sequence[Color], width: int = MAP_W, height: int = MAP_H) -> Image.Image:
    field = value_noise(rng, width, height, 5, octaves=4)
    image = to_image(bands(field, palette, weights=[1, 2, 4, 4, 3], blend=0.6))

    draw = ImageDraw.Draw(image)
    # Sparkles: a plus sign is the smallest shape that still reads as glitter.
    for _ in range(width * height // 2200):
        x, y = rng.ri(1, width // 2 - 2) * 2, rng.ri(1, height // 2 - 2) * 2
        spark = shade(palette[-1], 1.08)
        draw.rectangle([x, y, x + 1, y + 1], fill=spark)
        draw.rectangle([x - 2, y, x - 1, y + 1], fill=spark)
        draw.rectangle([x + 2, y, x + 3, y + 1], fill=spark)
    stipple(draw, rng, width * height // 1400, [shade(palette[1], 0.96)], width, height)
    return image


def rock_texture(rng: Rng, palette: Sequence[Color], width: int = MAP_W, height: int = MAP_H) -> Image.Image:
    """Bare stone ground: flat plates split by hard-edged cracks."""
    field = value_noise(rng, width, height, 8, octaves=4)
    image = to_image(bands(field, palette, blend=0.5))

    draw = ImageDraw.Draw(image)
    crack = shade(palette[0], 0.68)
    lit = shade(palette[4], 1.10)
    for _ in range(width // 10):
        x, y = rng.ri(0, width // 2 - 1) * 2, rng.ri(0, height // 2 - 1) * 2
        for _ in range(rng.ri(3, 7)):
            nx, ny = x + rng.ri(-7, 7) * 2, y + rng.ri(-6, 6) * 2
            draw.line([(x, y), (nx, ny)], fill=crack, width=2)
            draw.line([(x, y - 2), (nx, ny - 2)], fill=lit)
            x, y = nx, ny
    stipple(draw, rng, width * height // 700, [shade(palette[0], 0.9), lit], width, height)
    return image


def ash_texture(rng: Rng, palette: Sequence[Color], width: int = MAP_W, height: int = MAP_H) -> Image.Image:
    """Cooled lava field: dark crust with embers glowing in the seams."""
    field = value_noise(rng, width, height, 7, octaves=4)
    image = to_image(bands(field, palette, blend=0.5))

    draw = ImageDraw.Draw(image)
    for _ in range(width // 18):
        x, y = rng.ri(0, width // 2 - 1) * 2, rng.ri(0, height // 2 - 1) * 2
        glow = rng.pick([rgb('#7a2c18'), rgb('#a34418'), rgb('#c96a1e')])
        for _ in range(rng.ri(4, 9)):
            nx, ny = x + rng.ri(-9, 9) * 2, y + rng.ri(-7, 7) * 2
            draw.line([(x, y), (nx, ny)], fill=glow, width=2)
            x, y = nx, ny
    stipple(draw, rng, width * height // 800, [shade(palette[0], 0.88), shade(palette[4], 1.12)], width, height)
    return image


def cobble_texture(
    rng: Rng,
    palette: Sequence[Color],
    width: int = MAP_W,
    height: int = MAP_H,
    cell: int = 9,
    mortar: Color | None = None,
) -> Image.Image:
    """Laid stones: offset rows of small rounded blocks over dark mortar.

    Kept small deliberately — at 13px a paved square reads as a boulder field
    rather than a street.
    """
    mortar = mortar or shade(palette[0], 0.58)
    image = Image.new('RGB', (width, height), mortar)
    draw = ImageDraw.Draw(image)
    tones = list(palette) + [shade(palette[1], 0.88), shade(palette[3], 1.08)]

    for row in range(-1, height // cell + 2):
        y = row * cell
        offset = cell // 2 if row % 2 else 0
        for column in range(-1, width // cell + 2):
            x = column * cell + offset + rng.ri(-1, 1)
            w = cell - 2 + rng.ri(-1, 0)
            h = cell - 2 + rng.ri(-1, 0)
            stone = rng.jitter(tones[rng.ri(0, len(tones) - 1)], 9)
            draw.rounded_rectangle([x, y, x + w, y + h], radius=2, fill=stone)
            draw.line([(x + 1, y + 1), (x + w - 1, y + 1)], fill=shade(stone, 1.18))
            draw.line([(x + 1, y + h), (x + w - 1, y + h)], fill=shade(stone, 0.78))
    return image


def marble_texture(rng: Rng, palette: Sequence[Color], width: int = MAP_W, height: int = MAP_H) -> Image.Image:
    """Polished slabs: warm mottling, veins, and seams you have to look for.

    A hard light grid across the whole floor reads as graph paper, so the
    slab joints are drawn per-slab at low contrast and broken by the veining.
    """
    field = np.clip(
        value_noise(rng, width, height, 3, octaves=3) * 0.7 + value_noise(rng, width, height, 12, octaves=2) * 0.3,
        0,
        1,
    )
    image = to_image(bands(field, palette, weights=[1, 2, 4, 3, 2], blend=0.7))
    draw = ImageDraw.Draw(image)

    slab = 32
    seam = shade(palette[0], 0.88)
    gloss = shade(palette[-1], 1.08)
    for y in range(slab, height, slab):
        draw.line([(0, y), (width, y)], fill=seam)
        draw.line([(0, y + 1), (width, y + 1)], fill=gloss)
    for x in range(slab, width, slab):
        draw.line([(x, 0), (x, height)], fill=seam)
        draw.line([(x + 1, 0), (x + 1, height)], fill=gloss)

    for _ in range(width // 8):
        x, y = rng.ri(0, width // 2 - 1) * 2, rng.ri(0, height // 2 - 1) * 2
        vein = shade(palette[1], 0.94)
        for _ in range(rng.ri(4, 8)):
            nx, ny = x + rng.ri(-11, 11) * 2, y + rng.ri(-4, 4) * 2
            draw.line([(x, y), (nx, ny)], fill=vein, width=2)
            x, y = nx, ny
    stipple(draw, rng, width * height // 2200, [gloss], width, height)
    return image


def water_texture(rng: Rng, palette: Sequence[Color], width: int = MAP_W, height: int = MAP_H) -> Image.Image:
    """Open water: banded depth plus drifting highlight dashes."""
    field = np.clip(
        value_noise(rng, width, height, 5, octaves=3) * 0.65
        + value_noise(rng, width, height, 16, octaves=2) * 0.35,
        0,
        1,
    )
    image = to_image(bands(field, palette, weights=[3, 3, 3, 2, 1], blend=0.55))
    draw = ImageDraw.Draw(image)

    # Wave crests: a 2px dash with a shorter dash above it, the standard
    # two-row water motif.
    highlight = shade(palette[-1], 1.26)
    for _ in range(width * height // 900):
        x, y = rng.ri(0, width // 2 - 6) * 2, rng.ri(1, height // 2 - 2) * 2
        length = rng.ri(3, 7) * 2
        draw.rectangle([x, y, x + length, y + 1], fill=highlight)
        draw.rectangle([x + 2, y - 2, x + length - 2, y - 1], fill=shade(palette[-1], 1.10))
    return image


# --------------------------------------------------------------------------
# masks
# --------------------------------------------------------------------------


def ragged_mask(
    rng: Rng,
    draw_shape: Callable[[ImageDraw.ImageDraw], None],
    roughness: float = 0.30,
    scale: int = 16,
    blur: float = 2.2,
    width: int = MAP_W,
    height: int = MAP_H,
) -> Image.Image:
    """A hard-edged mask whose border wanders.

    Tilesets fake organic borders with hand-drawn transition tiles; blurring a
    clean shape and re-thresholding it against noise gets to the same ragged
    silhouette without needing 47 blob variants.
    """
    mask = Image.new('L', (width, height), 0)
    draw_shape(ImageDraw.Draw(mask))
    smooth = np.asarray(mask.filter(ImageFilter.GaussianBlur(blur)), dtype=np.float64) / 255.0
    noise = value_noise(rng, width, height, scale, octaves=3)
    binary = (smooth + (noise - 0.5) * roughness) > 0.5
    edge = Image.fromarray((binary * 255).astype(np.uint8), 'L')
    if UNIT == 1:
        return edge
    # Snap the border onto the art's pixel grid, so a shoreline steps in
    # blocks like the rest of the map instead of wandering pixel by pixel.
    small = edge.resize((width // UNIT, height // UNIT), Image.NEAREST)
    return small.resize((width, height), Image.NEAREST)


def rim(mask: Image.Image, size: int = 3, outside: bool = True) -> Image.Image:
    """The ring just outside (or just inside) a mask — shorelines, kerbs."""
    kernel = size if size % 2 else size + 1
    if outside:
        grown = mask.filter(ImageFilter.MaxFilter(kernel))
        return ImageChops.subtract(grown, mask)
    shrunk = mask.filter(ImageFilter.MinFilter(kernel))
    return ImageChops.subtract(mask, shrunk)


def polygon_shape(points: Sequence[tuple[float, float]]) -> Callable[[ImageDraw.ImageDraw], None]:
    return lambda draw: draw.polygon([(round(x), round(y)) for x, y in points], fill=255)


def path_shape(
    points: Sequence[tuple[float, float]],
    width_px: float,
) -> Callable[[ImageDraw.ImageDraw], None]:
    def shape(draw: ImageDraw.ImageDraw) -> None:
        pixels = [(round(x), round(y)) for x, y in points]
        draw.line(pixels, fill=255, width=round(width_px), joint='curve')
        radius = width_px / 2
        for x, y in pixels:
            draw.ellipse([x - radius, y - radius, x + radius, y + radius], fill=255)

    return shape


def rect_shape(x: float, y: float, w: float, h: float, radius: int = 0) -> Callable[[ImageDraw.ImageDraw], None]:
    box = [round(x), round(y), round(x + w), round(y + h)]

    def shape(draw: ImageDraw.ImageDraw) -> None:
        if radius:
            draw.rounded_rectangle(box, radius=radius, fill=255)
        else:
            draw.rectangle(box, fill=255)

    return shape


# --------------------------------------------------------------------------
# sprites
# --------------------------------------------------------------------------


class Sprite:
    """A transparent RGBA scratch pad with an `outline` finisher."""

    def __init__(self, width: int, height: int):
        self.img = Image.new('RGBA', (width, height), (0, 0, 0, 0))
        self.draw = ImageDraw.Draw(self.img)

    @property
    def width(self) -> int:
        return self.img.width

    @property
    def height(self) -> int:
        return self.img.height

    def outline(self, color: Color = (26, 20, 24), alpha: int = 235) -> None:
        """Wraps the silhouette in a 1px dark line, drawn *under* the art."""
        mask = self.img.split()[3].point(lambda value: 255 if value > 128 else 0)
        grown = mask.filter(ImageFilter.MaxFilter(3))
        edge = ImageChops.subtract(grown, mask)
        layer = Image.new('RGBA', self.img.size, (*color, alpha))
        layer.putalpha(ImageChops.multiply(edge, layer.split()[3]))
        layer.alpha_composite(self.img)
        self.img.paste(layer, (0, 0))

    def drop_shadow(self, box: tuple[int, int, int, int], alpha: int = 70) -> None:
        """Hard-edged, two-step shadow, painted underneath whatever is here.

        Draws in place rather than compositing onto a replacement image: a
        caller that grabbed `sprite.draw` before this call would otherwise
        keep drawing into the discarded one.
        """
        x0, y0, x1, y1 = box
        under = Image.new('RGBA', self.img.size, (0, 0, 0, 0))
        pen = ImageDraw.Draw(under)
        pen.ellipse([x0, y0, x1, y1], fill=(0, 0, 0, alpha // 2))
        pen.ellipse([x0 + 2, y0 + 1, x1 - 2, y1 - 1], fill=(0, 0, 0, alpha))
        under.alpha_composite(self.img)
        self.img.paste(under, (0, 0))


def blit(base: Image.Image, sprite: Image.Image, x: int, y: int) -> None:
    """Alpha-composites `sprite` onto `base` at a top-left position."""
    base.alpha_composite(sprite.convert('RGBA'), (round(x), round(y)))


def ground_blit(base: Image.Image, sprite: Image.Image, center_x: float, base_y: float) -> None:
    """Places a sprite standing on `base_y`, centred on `center_x`."""
    blit(base, sprite, round(center_x - sprite.width / 2), round(base_y - sprite.height))


def cast_shadow(base: Image.Image, center_x: float, base_y: float, w: float, h: float, alpha: int = 80) -> None:
    """A ground shadow in two hard steps — a blurred blob reads as airbrush."""
    layer = Image.new('RGBA', base.size, (0, 0, 0, 0))
    pen = ImageDraw.Draw(layer)
    pen.ellipse([center_x - w / 2, base_y - h / 2, center_x + w / 2, base_y + h / 2], fill=(0, 0, 0, alpha // 2))
    pen.ellipse(
        [center_x - w / 2 + 3, base_y - h / 2 + 1, center_x + w / 2 - 3, base_y + h / 2 - 1],
        fill=(0, 0, 0, alpha),
    )
    base.alpha_composite(layer)
