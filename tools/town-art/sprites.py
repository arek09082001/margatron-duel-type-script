"""Everything that stands on the ground: buildings, scenery and people.

Each builder returns a transparent sprite. Buildings are sized from their tile
footprint so the click area in the catalog is exactly the shape the player
sees; scenery is placed by its ground point so a tree drawn near the bottom of
the canvas still overlaps the one behind it correctly.
"""

from __future__ import annotations

from typing import Sequence

from PIL import Image, ImageChops, ImageDraw

from pixelart import Color, Rng, Sprite, ramp, rgb, shade

# Buildings bleed past their footprint: eaves overhang, shadows fall. A full
# tile of margin keeps the sprite an exact multiple of the tile size, so a
# house lands on the grid the same way a tileset's would.
PAD = 32


# --------------------------------------------------------------------------
# roofs
# --------------------------------------------------------------------------


def _slope(draw: ImageDraw.ImageDraw, rng: Rng, box, color: Color, style: str, vertical: bool) -> None:
    """One pitched face of a roof, filled with its material.

    Reference town art looks down onto roofs: you see two slopes meeting at a
    ridge, not a flat billboard. This draws a single face; `building` puts two
    of them together and caps the join.
    """
    x0, y0, x1, y1 = [int(value) for value in box]
    if x1 <= x0 or y1 <= y0:
        return
    draw.rectangle([x0, y0, x1, y1], fill=color)

    if style == 'thatch':
        span = range(x0, x1 + 1) if not vertical else range(y0, y1 + 1)
        for value in span:
            tone = rng.pick([shade(color, 0.82), shade(color, 0.94), shade(color, 1.10), shade(color, 1.20)])
            if vertical:
                draw.line([(x0, value), (x1, value + rng.ri(-1, 1))], fill=tone)
            else:
                draw.line([(value, y0), (value + rng.ri(-1, 1), y1)], fill=tone)
        return

    step, run = (5, 9) if style == 'shingle' else (6, 10)
    if not vertical:
        for index, y in enumerate(range(y0, y1 + 1, step)):
            offset = run // 2 if index % 2 else 0
            for x in range(x0 - run, x1 + run, run):
                roll = rng.py.random()
                if roll < 0.07:
                    tone = rng.pick([rgb('#5f6d43'), rgb('#53613a')])  # moss
                elif roll < 0.18:
                    tone = shade(color, 0.84)
                else:
                    tone = rng.jitter(color, 5)
                left = max(x0, x + offset)
                right = min(x1, x + offset + run - 2)
                if right <= left:
                    continue
                draw.rectangle([left, y, right, min(y + step - 1, y1)], fill=tone)
                draw.line([(left, y), (right, y)], fill=shade(tone, 1.22))
                draw.line([(right, y), (right, min(y + step - 1, y1))], fill=shade(tone, 0.74))
    else:
        for index, x in enumerate(range(x0, x1 + 1, step)):
            offset = run // 2 if index % 2 else 0
            for y in range(y0 - run, y1 + run, run):
                roll = rng.py.random()
                if roll < 0.07:
                    tone = rng.pick([rgb('#5f6d43'), rgb('#53613a')])
                elif roll < 0.18:
                    tone = shade(color, 0.84)
                else:
                    tone = rng.jitter(color, 5)
                top = max(y0, y + offset)
                bottom = min(y1, y + offset + run - 2)
                if bottom <= top:
                    continue
                draw.rectangle([x, top, min(x + step - 1, x1), bottom], fill=tone)
                draw.line([(x, top), (min(x + step - 1, x1), top)], fill=shade(tone, 1.22))
                draw.line([(x, bottom), (min(x + step - 1, x1), bottom)], fill=shade(tone, 0.74))


def _pitched_roof(draw: ImageDraw.ImageDraw, rng: Rng, box, color: Color, style: str, vertical: bool) -> None:
    """Two slopes meeting at a capped ridge, plus battens and eaves."""
    x0, y0, x1, y1 = [int(value) for value in box]

    if not vertical:
        ridge = y0 + int((y1 - y0) * 0.46)
        # Far slope leans away from the light, near slope catches it.
        _slope(draw, rng, (x0, y0, x1, ridge), shade(color, 1.22), style, False)
        _slope(draw, rng, (x0, ridge + 3, x1, y1), shade(color, 0.70), style, False)
        for x in range(x0 + 4, x1, 11):
            draw.line([(x, y0), (x, ridge - 1)], fill=shade(color, 0.80))
            draw.line([(x, ridge + 4), (x, y1)], fill=shade(color, 0.68))
        draw.rectangle([x0 - 2, ridge - 1, x1 + 2, ridge + 3], fill=shade(color, 1.30))
        draw.line([(x0 - 2, ridge - 1), (x1 + 2, ridge - 1)], fill=shade(color, 1.48))
        draw.line([(x0 - 2, ridge + 3), (x1 + 2, ridge + 3)], fill=shade(color, 0.60))
        draw.rectangle([x0 - 2, y1 - 1, x1 + 2, y1], fill=shade(color, 0.54))
        draw.rectangle([x0 - 2, y0, x1 + 2, y0 + 1], fill=shade(color, 0.66))
    else:
        ridge = x0 + int((x1 - x0) * 0.48)
        _slope(draw, rng, (x0, y0, ridge, y1), shade(color, 1.20), style, True)
        _slope(draw, rng, (ridge + 3, y0, x1, y1), shade(color, 0.70), style, True)
        for y in range(y0 + 4, y1, 11):
            draw.line([(x0, y), (ridge - 1, y)], fill=shade(color, 0.80))
            draw.line([(ridge + 4, y), (x1, y)], fill=shade(color, 0.68))
        draw.rectangle([ridge - 1, y0 - 2, ridge + 3, y1 + 2], fill=shade(color, 1.30))
        draw.line([(ridge - 1, y0 - 2), (ridge - 1, y1 + 2)], fill=shade(color, 1.48))
        draw.line([(ridge + 3, y0 - 2), (ridge + 3, y1 + 2)], fill=shade(color, 0.60))
        draw.rectangle([x0, y1 - 1, x1, y1], fill=shade(color, 0.54))


def _ridge(draw: ImageDraw.ImageDraw, box, color: Color) -> None:
    """The capping course along the top of a pitched roof."""
    x0, y0, x1, _ = box
    draw.rounded_rectangle([x0 - 2, y0 - 5, x1 + 2, y0 + 3], radius=3, fill=shade(color, 1.16))
    draw.line([(x0 - 2, y0 - 4), (x1 + 2, y0 - 4)], fill=shade(color, 1.36))
    draw.line([(x0 - 2, y0 + 3), (x1 + 2, y0 + 3)], fill=shade(color, 0.78))


def _roof_tiles(draw: ImageDraw.ImageDraw, rng: Rng, box, color: Color) -> None:
    x0, y0, x1, y1 = box
    row_h, tile_w = 7, 11
    rows = max(1, (y1 - y0) // row_h + 1)
    for row in range(rows):
        y = y1 - row * row_h
        # Rows lighten towards the ridge, the way sun falls on a pitched roof.
        base = shade(color, 0.84 + 0.055 * row)
        offset = tile_w // 2 if row % 2 else 0
        for x in range(x0 - tile_w, x1 + tile_w, tile_w):
            left = x + offset
            # A few tiles are cracked, faded or moss-grown — a roof of
            # identical tiles is the tell of a generated one.
            roll = rng.py.random()
            if roll < 0.08:
                tone = rng.pick([rgb('#5a6a3a'), rgb('#4e6034')])  # moss
            elif roll < 0.20:
                tone = shade(base, 0.80)  # a weathered darker tile
            else:
                tone = rng.jitter(base, 5)
            draw.rounded_rectangle([left, y - row_h, left + tile_w - 1, y], radius=3, fill=tone)
            draw.line([(left, y - row_h + 1), (left, y - 1)], fill=shade(tone, 0.74))
            draw.line([(left + tile_w - 1, y - row_h + 1), (left + tile_w - 1, y - 1)], fill=shade(tone, 0.66))
            # Two-pixel glint on the crown of every tile.
            draw.rectangle([left + 2, y - row_h + 1, left + 4, y - row_h + 1], fill=shade(tone, 1.26))
        draw.line([(x0 - 2, y), (x1 + 2, y)], fill=shade(base, 0.70))
    _ridge(draw, box, color)


def _roof_thatch(draw: ImageDraw.ImageDraw, rng: Rng, box, color: Color) -> None:
    x0, y0, x1, y1 = box
    draw.rectangle([x0, y0, x1, y1], fill=color)
    for x in range(x0, x1 + 1):
        lean = rng.ri(-1, 1)
        tone = rng.pick([shade(color, 0.80), shade(color, 0.92), shade(color, 1.10), shade(color, 1.22)])
        draw.line([(x, y0 + rng.ri(0, 3)), (x + lean, y1 + rng.ri(-1, 3))], fill=tone)
    for band in (y0 + (y1 - y0) // 3, y0 + 2 * (y1 - y0) // 3):
        draw.line([(x0, band), (x1, band)], fill=shade(color, 0.66))
        draw.line([(x0, band + 1), (x1, band + 1)], fill=shade(color, 1.16))
    _ridge(draw, box, color)


def _roof_shingle(draw: ImageDraw.ImageDraw, rng: Rng, box, color: Color) -> None:
    x0, y0, x1, y1 = box
    row_h, tile_w = 6, 9
    for row in range((y1 - y0) // row_h + 2):
        y = y1 - row * row_h
        offset = (tile_w // 2) if row % 2 else 0
        for x in range(x0 - tile_w, x1 + tile_w, tile_w):
            left = x + offset
            draw.rectangle(
                [left, y - row_h + 1, left + tile_w - 2, y],
                fill=rng.jitter(shade(color, 0.88 + 0.045 * row), 6),
            )
            draw.line([(left, y - row_h + 1), (left + tile_w - 2, y - row_h + 1)], fill=shade(color, 1.20))
    _ridge(draw, box, color)


def _roof_slate(draw: ImageDraw.ImageDraw, rng: Rng, box, color: Color) -> None:
    x0, y0, x1, y1 = box
    draw.rectangle([x0, y0, x1, y1], fill=shade(color, 0.86))
    scale = 9
    for row in range((y1 - y0) // (scale - 3) + 2):
        y = y1 - row * (scale - 3)
        offset = scale // 2 if row % 2 else 0
        for x in range(x0 - scale, x1 + scale, scale):
            draw.pieslice(
                [x + offset, y - scale, x + offset + scale, y + scale // 2],
                start=0,
                end=180,
                fill=rng.jitter(shade(color, 0.92 + 0.04 * row), 5),
            )
    _ridge(draw, box, color)


def _roof_battlement(draw: ImageDraw.ImageDraw, rng: Rng, box, color: Color) -> None:
    x0, y0, x1, y1 = box
    draw.rectangle([x0, y0 + 6, x1, y1], fill=color)
    for x in range(x0, x1, 8):
        block = rng.jitter(color, 6)
        draw.rectangle([x, y0, min(x + 5, x1), y0 + 8], fill=block)
        draw.line([(x, y0), (min(x + 5, x1), y0)], fill=shade(block, 1.24))
    for y in range(y0 + 10, y1, 9):
        draw.line([(x0, y), (x1, y)], fill=shade(color, 0.76))
    draw.rectangle([x0, y1 - 3, x1, y1], fill=shade(color, 0.72))


def _roof_dome(draw: ImageDraw.ImageDraw, rng: Rng, box, color: Color) -> None:
    """A round dome on a flat terrace, not an egg stretched over the footprint."""
    x0, y0, x1, y1 = box
    cx = (x0 + x1) // 2
    terrace = shade(color, 0.66)

    draw.rectangle([x0, y1 - 14, x1, y1], fill=terrace)
    for x in range(x0, x1, 9):
        draw.rectangle([x, y1 - 20, min(x + 5, x1), y1 - 13], fill=rng.jitter(terrace, 8))
    draw.line([(x0, y1 - 13), (x1, y1 - 13)], fill=shade(terrace, 1.25))

    diameter = max(22, min(int((x1 - x0) * 0.46), int((y1 - y0) * 0.82)))
    left, right = cx - diameter // 2, cx + diameter // 2
    bottom = y1 - 12
    top = bottom - int(diameter * 0.86)

    draw.rectangle([left - 3, bottom - 10, right + 3, bottom], fill=shade(color, 0.80))
    draw.ellipse([left, top, right, bottom + diameter // 6], fill=color)
    draw.ellipse(
        [left + diameter // 7, top + diameter // 9, cx + diameter // 12, top + diameter // 2],
        fill=shade(color, 1.22),
    )
    draw.arc([left, top, right, bottom + diameter // 6], start=25, end=150, fill=shade(color, 0.76), width=3)
    for angle in range(-70, 71, 35):
        draw.line([(cx, top + 2), (cx + angle * diameter // 200, bottom + 2)], fill=shade(color, 0.88))
    draw.rectangle([cx - 1, top - 11, cx + 1, top + 3], fill=shade(color, 1.35))
    draw.ellipse([cx - 4, top - 17, cx + 4, top - 9], fill=shade(color, 1.42))


def _roof_tent(draw: ImageDraw.ImageDraw, rng: Rng, box, color: Color) -> None:
    x0, y0, x1, y1 = box
    cx = (x0 + x1) // 2
    draw.polygon([(cx, y0 - 10), (x1 + 2, y1), (x0 - 2, y1)], fill=color)
    stripe = shade(color, 0.74)
    for step in range(-4, 5):
        draw.line([(cx + step * 3, y0 - 8), (cx + step * 13, y1)], fill=stripe if step % 2 else shade(color, 1.16))
    draw.polygon([(cx, y0 - 10), (cx + 4, y0 - 2), (cx - 4, y0 - 2)], fill=shade(color, 1.3))
    draw.line([(x0 - 2, y1), (x1 + 2, y1)], fill=shade(color, 0.6))


# Roof styles drawn as two slopes meeting at a ridge. The rest — domes, tents,
# flat battlements — have no ridge to draw and keep their own renderer.
PITCHED = {'tiles', 'shingle', 'slate', 'thatch'}

ROOFS = {
    'tiles': _roof_tiles,
    'thatch': _roof_thatch,
    'shingle': _roof_shingle,
    'slate': _roof_slate,
    'battlement': _roof_battlement,
    'dome': _roof_dome,
    'tent': _roof_tent,
}


# --------------------------------------------------------------------------
# walls
# --------------------------------------------------------------------------


def _wall_plank(draw: ImageDraw.ImageDraw, rng: Rng, box, color: Color) -> None:
    x0, y0, x1, y1 = box
    for x in range(x0, x1, 7):
        right = min(x + 6, x1)
        draw.rectangle([x, y0, right, y1], fill=rng.jitter(color, 7))
        draw.line([(x, y0), (x, y1)], fill=shade(color, 0.70))
        draw.line([(x + 1, y0), (x + 1, y1)], fill=shade(color, 1.16))
        # Grain: two short dashes per plank, plus nail heads top and bottom.
        for _ in range(2):
            gy = rng.ri(y0 + 3, max(y0 + 4, y1 - 4))
            if right - 1 >= x + 2:
                draw.rectangle([x + 2, gy, right - 1, gy], fill=shade(color, 0.86))
        draw.point([(x + 3, y0 + 2), (x + 3, y1 - 2)], fill=shade(color, 0.60))
    draw.rectangle([x0, y0, x1, y0 + 1], fill=shade(color, 0.60))


def _wall_log(draw: ImageDraw.ImageDraw, rng: Rng, box, color: Color) -> None:
    x0, y0, x1, y1 = box
    for y in range(y0, y1, 8):
        tone = rng.jitter(color, 6)
        bottom = min(y + 7, y1)
        draw.rounded_rectangle([x0, y, x1, bottom], radius=3, fill=tone)
        draw.line([(x0 + 2, y + 1), (x1 - 2, y + 1)], fill=shade(tone, 1.20))
        draw.line([(x0 + 2, bottom), (x1 - 2, bottom)], fill=shade(tone, 0.72))
        # Knots and end-grain ticks along each course.
        for _ in range(max(1, (x1 - x0) // 34)):
            kx = rng.ri(x0 + 5, max(x0 + 6, x1 - 7))
            draw.rectangle([kx, y + 3, kx + 2, y + 4], fill=shade(tone, 0.78))
            draw.point((kx + 1, y + 3), fill=shade(tone, 1.12))
    for x in (x0 + 1, x1 - 2):
        draw.line([(x, y0), (x, y1)], fill=shade(color, 0.66))


def _wall_stone(draw: ImageDraw.ImageDraw, rng: Rng, box, color: Color) -> None:
    x0, y0, x1, y1 = box
    draw.rectangle(box, fill=shade(color, 0.62))
    row_h = 9
    for row, y in enumerate(range(y0, y1, row_h)):
        offset = 6 if row % 2 else 0
        for x in range(x0 - 12, x1, 14):
            left, right = max(x0, x + offset), min(x1, x + offset + 12)
            if right - left < 3:
                continue
            block = rng.jitter(color, 8)
            bottom = min(y + row_h - 1, y1)
            draw.rectangle([left, y + 1, right, bottom], fill=block)
            draw.line([(left, y + 1), (right, y + 1)], fill=shade(block, 1.20))
            draw.line([(left, bottom), (right, bottom)], fill=shade(block, 0.80))
            if right - left > 6 and bottom - y > 4:
                draw.point([(left + 2, y + 3), (right - 3, bottom - 2)], fill=shade(block, 0.86))


def _wall_plaster(draw: ImageDraw.ImageDraw, rng: Rng, box, color: Color, beam: Color | None = None) -> None:
    x0, y0, x1, y1 = box
    beam = beam or rgb('#4a3524')
    draw.rectangle(box, fill=color)
    for _ in range((x1 - x0) * (y1 - y0) // 90):
        px, py = rng.ri(x0, x1), rng.ri(y0, y1)
        draw.point((px, py), fill=shade(color, rng.rf(0.94, 1.06)))
    draw.rectangle([x0, y0, x1, y0 + 3], fill=beam)
    draw.rectangle([x0, y1 - 3, x1, y1], fill=beam)
    # Half-timbering: uprights with a brace inside each bay, not one long scar
    # across the whole front.
    step = max(16, (x1 - x0) // 3)
    posts = list(range(x0, x1 - 2, step)) + [x1 - 3]
    for x in posts:
        draw.rectangle([x, y0, min(x + 3, x1), y1], fill=beam)
    for left, right in zip(posts, posts[1:]):
        if right - left > 12:
            draw.line([(left + 4, y1 - 5), (right - 1, y0 + 5)], fill=beam, width=2)


def _wall_adobe(draw: ImageDraw.ImageDraw, rng: Rng, box, color: Color) -> None:
    x0, y0, x1, y1 = box
    draw.rounded_rectangle(box, radius=5, fill=color)
    for _ in range((x1 - x0) * (y1 - y0) // 40):
        px, py = rng.ri(x0, x1), rng.ri(y0, y1)
        draw.point((px, py), fill=shade(color, rng.rf(0.90, 1.08)))
    draw.line([(x0 + 2, y0 + 2), (x1 - 2, y0 + 2)], fill=shade(color, 1.16))
    for y in range(y0 + 8, y1, 11):
        draw.line([(x0 + 3, y), (x1 - 3, y)], fill=shade(color, 0.88))
    for x in range(x0 + 5, x1, 13):
        draw.rectangle([x, y0 + 4, x + 2, y0 + 6], fill=shade(color, 0.62))


def _wall_marble(draw: ImageDraw.ImageDraw, rng: Rng, box, color: Color) -> None:
    x0, y0, x1, y1 = box
    draw.rectangle(box, fill=color)
    for x in range(x0 + 2, x1 - 4, 13):
        draw.rectangle([x, y0 + 2, x + 5, y1 - 4], fill=shade(color, 1.12))
        draw.line([(x, y0 + 2), (x, y1 - 4)], fill=shade(color, 1.26))
        draw.line([(x + 5, y0 + 2), (x + 5, y1 - 4)], fill=shade(color, 0.84))
    draw.rectangle([x0, y1 - 4, x1, y1], fill=shade(color, 0.80))
    draw.rectangle([x0, y0, x1, y0 + 3], fill=shade(color, 1.22))


def _wall_ice(draw: ImageDraw.ImageDraw, rng: Rng, box, color: Color) -> None:
    x0, y0, x1, y1 = box
    draw.rectangle(box, fill=color)
    for _ in range(max(4, (x1 - x0) // 8)):
        px, py = rng.ri(x0, x1), rng.ri(y0, y1)
        for _ in range(rng.ri(2, 4)):
            nx, ny = px + rng.ri(-7, 7), py + rng.ri(-6, 6)
            draw.line([(px, py), (nx, ny)], fill=shade(color, rng.rf(0.78, 1.24)))
            px, py = nx, ny
    draw.line([(x0 + 2, y0 + 2), (x0 + 2, y1 - 2)], fill=shade(color, 1.30))


def _wall_basalt(draw: ImageDraw.ImageDraw, rng: Rng, box, color: Color) -> None:
    x0, y0, x1, y1 = box
    draw.rectangle(box, fill=shade(color, 0.7))
    for x in range(x0, x1, 8):
        column = rng.jitter(color, 9)
        draw.rectangle([x, y0, min(x + 6, x1), y1], fill=column)
        draw.line([(x, y0), (x, y1)], fill=shade(column, 1.22))
        draw.line([(min(x + 6, x1), y0), (min(x + 6, x1), y1)], fill=shade(column, 0.66))


WALLS = {
    'plank': _wall_plank,
    'log': _wall_log,
    'stone': _wall_stone,
    'plaster': _wall_plaster,
    'adobe': _wall_adobe,
    'marble': _wall_marble,
    'ice': _wall_ice,
    'basalt': _wall_basalt,
}


# --------------------------------------------------------------------------
# building details
# --------------------------------------------------------------------------


def _glyph(draw: ImageDraw.ImageDraw, kind: str, cx: int, cy: int, color: Color) -> None:
    """Tiny pictograms for hanging shop signs."""
    if kind == 'anvil':
        draw.rectangle([cx - 5, cy - 1, cx + 5, cy + 1], fill=color)
        draw.rectangle([cx - 2, cy + 1, cx + 2, cy + 4], fill=color)
        draw.polygon([(cx - 5, cy - 1), (cx - 8, cy + 1), (cx - 5, cy + 1)], fill=color)
    elif kind == 'mug':
        draw.rectangle([cx - 4, cy - 4, cx + 2, cy + 4], fill=color)
        draw.arc([cx + 1, cy - 3, cx + 6, cy + 2], start=270, end=90, fill=color, width=2)
        draw.rectangle([cx - 4, cy - 4, cx + 2, cy - 2], fill=shade(color, 1.6))
    elif kind == 'coin':
        draw.ellipse([cx - 5, cy - 5, cx + 5, cy + 5], outline=color, width=2)
        draw.line([(cx, cy - 2), (cx, cy + 2)], fill=color)
    elif kind == 'sword':
        draw.line([(cx, cy - 6), (cx, cy + 4)], fill=color, width=2)
        draw.line([(cx - 4, cy + 1), (cx + 4, cy + 1)], fill=color, width=2)
    elif kind == 'flask':
        draw.polygon([(cx - 2, cy - 5), (cx + 2, cy - 5), (cx + 5, cy + 5), (cx - 5, cy + 5)], fill=color)
    elif kind == 'wave':
        for offset in (-3, 1):
            draw.arc([cx - 6, cy + offset - 3, cx, cy + offset + 3], start=0, end=180, fill=color, width=2)
            draw.arc([cx, cy + offset - 3, cx + 6, cy + offset + 3], start=180, end=360, fill=color, width=2)


def _door(sprite: Sprite, rng: Rng, cx: int, bottom: int, height: int, wood: Color, frame: Color, arched: bool) -> None:
    draw = sprite.draw
    half = 8
    top = bottom - height
    draw.rectangle([cx - half - 2, top - 2, cx + half + 2, bottom], fill=frame)
    if arched:
        draw.pieslice([cx - half - 2, top - half - 2, cx + half + 2, top + half + 2], start=180, end=360, fill=frame)
        draw.pieslice([cx - half, top - half, cx + half, top + half], start=180, end=360, fill=wood)
    draw.rectangle([cx - half, top, cx + half, bottom], fill=wood)
    draw.line([(cx, top - (half if arched else 0)), (cx, bottom)], fill=shade(wood, 0.72))
    for x in (cx - half + 2, cx + half - 2):
        draw.line([(x, top), (x, bottom)], fill=shade(wood, 1.18))
    # Iron: two hinge straps, a handle, and studs down the boards.
    for hinge_y in (top + 5, bottom - 6):
        draw.rectangle([cx - half + 1, hinge_y, cx - 1, hinge_y + 1], fill=shade(wood, 0.55))
        draw.rectangle([cx + 1, hinge_y, cx + half - 1, hinge_y + 1], fill=shade(wood, 0.55))
    for stud_y in range(top + 4, bottom - 2, 6):
        draw.point([(cx - half + 2, stud_y), (cx + half - 2, stud_y)], fill=shade(wood, 1.35))
    draw.rectangle([cx + 3, bottom - 12, cx + 4, bottom - 10], fill=rgb('#d8bb63'))
    draw.point((cx + 3, bottom - 12), fill=rgb('#f2dc9c'))
    draw.rectangle([cx - half - 4, bottom - 1, cx + half + 4, bottom + 2], fill=shade(frame, 1.15))
    draw.rectangle([cx - half - 4, bottom - 1, cx + half + 4, bottom - 1], fill=shade(frame, 1.35))


def _window(draw: ImageDraw.ImageDraw, x: int, y: int, frame: Color, glass: Color, lit: bool) -> None:
    draw.rectangle([x - 6, y - 6, x + 6, y + 6], fill=frame)
    draw.line([(x - 6, y - 6), (x + 6, y - 6)], fill=shade(frame, 1.28))
    draw.rectangle([x - 4, y - 4, x + 4, y + 4], fill=glass)
    if lit:
        draw.rectangle([x - 4, y - 4, x, y], fill=shade(glass, 1.28))
        draw.point([(x - 4, y - 4), (x - 3, y - 4), (x - 4, y - 3)], fill=shade(glass, 1.45))
    draw.line([(x, y - 4), (x, y + 4)], fill=frame)
    draw.line([(x - 4, y), (x + 4, y)], fill=frame)
    # Sill and a pair of shutter hinges — the details that stop a window
    # reading as a flat sticker.
    draw.rectangle([x - 7, y + 6, x + 7, y + 7], fill=shade(frame, 1.15))
    draw.point([(x - 7, y - 3), (x - 7, y + 3), (x + 7, y - 3), (x + 7, y + 3)], fill=shade(frame, 0.72))


def building(rng: Rng, tiles_w: int, tiles_h: int, style: dict) -> Image.Image:
    """A house drawn from its tile footprint. Footprint sits at (PAD, PAD)."""
    fw, fh = tiles_w * 32, tiles_h * 32
    sprite = Sprite(fw + PAD * 2, fh + PAD * 2)
    draw = sprite.draw
    ox, oy = PAD, PAD

    # Seen from above, a roof takes most of the footprint and only a band of
    # front wall shows beneath the eaves.
    wall_h = max(20, min(34, int(fh * 0.30)))
    roof_h = fh - wall_h
    overhang = 6
    vertical_ridge = tiles_h > tiles_w

    wall_color = style.get('wall_color', rgb('#9a7a54'))
    roof_color = style.get('roof_color', rgb('#8c4436'))
    frame_color = style.get('frame_color', shade(wall_color, 0.62))

    # Cast shadow first: light comes from the upper left everywhere on the map.
    draw.polygon(
        [
            (ox + fw, oy + roof_h - 4),
            (ox + fw + 10, oy + roof_h + 4),
            (ox + fw + 10, oy + fh + 6),
            (ox + 8, oy + fh + 6),
            (ox, oy + fh),
            (ox + fw, oy + fh),
        ],
        fill=(0, 0, 0, 90),
    )

    wall_box = (ox, oy + roof_h, ox + fw, oy + fh)
    WALLS[style.get('wall', 'plank')](draw, rng, wall_box, wall_color)

    # Stone footing: lifts the building off the ground instead of letting the
    # planks run straight into the grass.
    if style.get('plinth', True):
        footing = style.get('plinth_color', shade(wall_color, 0.58))
        draw.rectangle([ox - 2, oy + fh - 5, ox + fw + 2, oy + fh + 1], fill=footing)
        for x in range(ox - 2, ox + fw + 2, 9):
            draw.line([(x, oy + fh - 5), (x, oy + fh + 1)], fill=shade(footing, 0.8))
        draw.line([(ox - 2, oy + fh - 5), (ox + fw + 2, oy + fh - 5)], fill=shade(footing, 1.3))

    roof_box = (ox - overhang, oy, ox + fw + overhang, oy + roof_h + overhang)
    roof_style = style.get('roof', 'tiles')
    if roof_style in PITCHED:
        # Gable ends: a wedge of end wall showing under each roof edge.
        gable = shade(wall_color, 0.86)
        if not vertical_ridge:
            mid = roof_box[1] + int((roof_box[3] - roof_box[1]) * 0.46)
            for edge in (roof_box[0], roof_box[2]):
                direction = 3 if edge == roof_box[0] else -3
                draw.polygon(
                    [(edge, mid), (edge + direction, roof_box[3]), (edge - direction, roof_box[3])],
                    fill=gable,
                )
        _pitched_roof(draw, rng, roof_box, roof_color, roof_style, vertical_ridge)
    else:
        ROOFS[roof_style](draw, rng, roof_box, roof_color)
    draw.rectangle([roof_box[0], roof_box[3] - 2, roof_box[2], roof_box[3]], fill=shade(roof_color, 0.52))
    # The eave throws a band of shade down the top of the wall.
    draw.rectangle([ox, roof_box[3] + 1, ox + fw, roof_box[3] + 3], fill=shade(wall_color, 0.66))

    wall_top = oy + roof_h + overhang + 2
    wall_bottom = oy + fh
    door_x = ox + fw // 2 + style.get('door_offset', 0)
    if style.get('door', True):
        _door(
            sprite,
            rng,
            door_x,
            wall_bottom - 1,
            min(wall_h - 12, 26),
            style.get('door_color', rgb('#5a3c22')),
            frame_color,
            style.get('arched_door', False),
        )

    glass = style.get('glass', rgb('#f2cd74') if style.get('lit', True) else rgb('#2c3c52'))
    window_y = (wall_top + wall_bottom) // 2 - 2
    spots = [x for x in range(ox + 10, ox + fw - 8, 20) if abs(x - door_x) > 16]
    for x in spots[: style.get('windows', 3)]:
        _window(draw, x, window_y, frame_color, glass, style.get('lit', True))

    if style.get('chimney'):
        cx = ox + fw - 16
        draw.rectangle([cx, oy - 12, cx + 10, oy + 10], fill=shade(wall_color, 0.72))
        draw.rectangle([cx - 1, oy - 14, cx + 11, oy - 9], fill=shade(wall_color, 0.88))

    sign = style.get('sign')
    if sign:
        # Hung out over the street on a bracket, so it reads against the wall
        # whatever the wall is made of.
        sx = ox + fw + 4 if style.get('sign_side', 1) > 0 else ox - 4
        draw.line([(sx, wall_top - 2), (sx, wall_top + 4)], fill=rgb('#3a2a18'), width=2)
        draw.rounded_rectangle([sx - 11, wall_top + 3, sx + 11, wall_top + 22], radius=3, fill=rgb('#3a2a18'))
        draw.rounded_rectangle([sx - 9, wall_top + 5, sx + 9, wall_top + 20], radius=2, fill=rgb('#c8ac74'))
        _glyph(draw, sign, sx, wall_top + 12, rgb('#3a2a18'))

    if style.get('banner'):
        for bx in (ox + 6, ox + fw - 8):
            draw.rectangle([bx, oy + roof_h + 6, bx + 5, oy + roof_h + 26], fill=style['banner'])
            draw.polygon(
                [
                    (bx, oy + roof_h + 26),
                    (bx + 5, oy + roof_h + 26),
                    (bx + 2, oy + roof_h + 31),
                ],
                fill=shade(style['banner'], 0.8),
            )

    if style.get('snow'):
        for x in range(roof_box[0], roof_box[2], 3):
            draw.line([(x, oy - 3), (x, oy + rng.ri(2, 7))], fill=rgb('#e6eef6'))

    sprite.outline()
    return sprite.img


# --------------------------------------------------------------------------
# scenery
# --------------------------------------------------------------------------

LEAF_SUMMER = ramp('#24471f', '#356629', '#4c8637', '#6faa4c')
LEAF_DARK = ramp('#17301a', '#234322', '#325a2b', '#487438')
LEAF_AUTUMN = ramp('#663a10', '#8a5316', '#ac7220', '#cf9a34')
LEAF_PALE = ramp('#3c5a42', '#4e7050', '#688a64', '#8cae82')
LEAF_FROST = ramp('#2a4a4a', '#3a6058', '#4e7a68', '#6c9a84')
TRUNK_BROWN = rgb('#4c3520')


def _speckle_within(sprite: Sprite, rng: Rng, count: int, colors: Sequence[Color], box) -> None:
    """Scatters pixels, but only where the sprite already has paint."""
    x0, y0, x1, y1 = box
    pixels = sprite.img.load()
    for _ in range(count):
        px, py = rng.ri(x0, x1), rng.ri(y0, y1)
        if 0 <= px < sprite.width and 0 <= py < sprite.height and pixels[px, py][3] > 0:
            sprite.draw.point((px, py), fill=rng.pick(colors))


def tree_round(rng: Rng, radius: int = 30, leaves: Sequence[Color] = LEAF_SUMMER, trunk: Color = TRUNK_BROWN):
    """A broad-leaved tree lit from the upper left.

    The canopy is built in four passes — silhouette, midtone, highlight, then
    an underside of shadow — because a single flat blob reads as a bush at
    this size no matter how big it is.
    """
    width = radius * 2 + 12
    height = int(radius * 2.35) + 22
    sprite = Sprite(width, height)
    draw = sprite.draw
    cx, cy = width // 2, radius + 8
    trunk_top = cy + radius // 3

    draw.polygon(
        [(cx - 5, trunk_top), (cx + 4, trunk_top), (cx + 7, height - 3), (cx - 8, height - 3)],
        fill=trunk,
    )
    draw.line([(cx - 5, trunk_top), (cx - 7, height - 4)], fill=shade(trunk, 1.28), width=2)
    draw.line([(cx + 4, trunk_top), (cx + 6, height - 4)], fill=shade(trunk, 0.72), width=2)
    for side in (-1, 1):
        draw.line([(cx, trunk_top + 4), (cx + side * (radius // 3), trunk_top - radius // 4)], fill=trunk, width=3)

    import math

    canopy = Sprite(width, height)
    leaf_draw = canopy.draw
    blobs = []
    for index in range(rng.ri(9, 12)):
        angle = index / 10 * 6.283 + rng.rf(-0.3, 0.3)
        distance = rng.rf(radius * 0.16, radius * 0.44)
        bx = cx + int(distance * math.cos(angle))
        by = cy + int(distance * 0.82 * math.sin(angle))
        blobs.append((bx, by, rng.ri(int(radius * 0.54), int(radius * 0.76))))
    blobs.append((cx, cy - radius // 8, int(radius * 0.72)))

    # Concentric hard bands rather than blended blobs: the same silhouette
    # redrawn smaller and pushed towards the light gives four flat tones with
    # crisp steps between them, which is how leaves are shaded in a tileset.
    for shrink, color in ((0, leaves[0]), (3, leaves[1]), (8, leaves[2]), (14, leaves[3])):
        for bx, by, br in blobs:
            r = br - shrink
            if r < 3:
                continue
            ox, oy = bx - shrink // 2, by - int(shrink * 0.7)
            leaf_draw.ellipse([ox - r, oy - r, ox + r, oy + r], fill=color)

    # Leaf clumps, wall to wall. A canopy in this style is a mat of small
    # arcs — three-tone, packed on a 3px grid — not a shaded blob with a few
    # marks on it, so the whole silhouette gets stamped.
    pixels = canopy.img.load()
    for gy in range(cy - radius, cy + radius, 3):
        for gx in range(cx - radius, cx + radius, 3):
            px, py = gx + rng.ri(0, 2), gy + rng.ri(0, 2)
            if not (0 <= px < width - 3 and 0 <= py < height - 3 and pixels[px, py][3] > 0):
                continue
            # Light falls from the upper left; the underside stays dark. Two
            # tones beyond the ramp keep the form readable once the clumps
            # cover the shading underneath.
            reach = ((px - cx) + (py - cy) * 1.2) / max(1, radius)
            roll = rng.py.random()
            if reach < -0.55:
                color = shade(leaves[3], 1.16) if roll < 0.6 else leaves[3]
            elif reach < -0.15:
                color = leaves[3] if roll < 0.5 else leaves[2]
            elif reach < 0.25:
                color = leaves[2] if roll < 0.5 else leaves[1]
            elif reach < 0.6:
                color = leaves[1] if roll < 0.5 else leaves[0]
            else:
                color = shade(leaves[0], 0.76) if roll < 0.6 else leaves[0]
            # A leaf clump: two pixels, a shoulder, and a tail.
            leaf_draw.rectangle([px, py, px + 1, py], fill=color)
            leaf_draw.point((px + 2, py + 1), fill=color)
            if rng.chance(0.45):
                leaf_draw.point((px, py + 1), fill=color)

    # A few branch tips showing through the gaps.
    for _ in range(rng.ri(2, 4)):
        angle = rng.rf(0.6, 2.5)
        length = rng.ri(radius // 3, radius // 2)
        ex = cx + int(math.cos(angle) * length * rng.pick([-1, 1]))
        ey = cy + int(math.sin(angle) * length * 0.5)
        if 0 <= ex < width and 0 <= ey < height and pixels[max(0, min(width - 1, ex)), max(0, min(height - 1, ey))][3] > 0:
            leaf_draw.line([(cx, cy + 2), (ex, ey)], fill=shade(trunk, 1.1))

    sprite.img.alpha_composite(canopy.img)
    sprite.draw = ImageDraw.Draw(sprite.img)
    sprite.outline()
    return sprite.img


def tree_pine(rng: Rng, height_px: int = 62, leaves: Sequence[Color] = LEAF_DARK, snow: bool = False):
    """A conifer built from feathered branches.

    Flat triangles read as bunting at this size. Reference conifers are drawn
    branch by branch: a stroke out from the trunk with needles hanging off it,
    each tier wider and lower than the one above.
    """
    width = int(height_px * 0.74)
    sprite = Sprite(width, height_px)
    draw = sprite.draw
    cx = width // 2

    trunk_top = int(height_px * 0.30)
    draw.rectangle([cx - 3, trunk_top, cx + 2, height_px - 2], fill=shade(TRUNK_BROWN, 0.85))
    draw.line([(cx - 3, trunk_top), (cx - 3, height_px - 2)], fill=shade(TRUNK_BROWN, 1.2))

    # Tiers overlap so the needle mass closes up, and each branch is a run of
    # short diagonal strokes sweeping down and away from the trunk — vertical
    # strokes on a regular grid come out looking like basketwork.
    tiers = max(6, height_px // 8)
    spacing = (height_px - 18) / tiers
    crown_tones = (leaves[3], leaves[2], leaves[1])
    tier_rows = []

    for tier in range(tiers):
        progress = tier / (tiers - 1)
        y = int(8 + progress * (height_px - 20)) + rng.ri(-1, 1)
        reach = max(5, int(width * (0.11 + 0.40 * progress)) + rng.ri(-1, 1))
        tier_rows.append((y, reach))
        for side in (-1, 1):
            for step in range(0, reach + 1, 2):
                t = step / max(1, reach)
                nx = cx + side * step
                ny = y + int(spacing * 0.45 * t)
                length = int(spacing * (0.85 + 0.35 * t))
                # Needles fan out at roughly 30 degrees, lit on the left.
                out_x = nx + side * max(2, length // 2)
                lit = crown_tones[0] if side < 0 else crown_tones[1]
                draw.line([(nx, ny), (out_x, ny + length)], fill=leaves[0], width=2)
                draw.line([(nx, ny), (out_x - side, ny + length - 2)], fill=leaves[1])
                if step % 4 == 0:
                    draw.line([(nx, ny - 1), (out_x - side * 2, ny + length - 4)], fill=lit)
        draw.rectangle([cx - 3, y - 1, cx + 2, int(y + spacing)], fill=leaves[0])

    # Crown: a tight spike so the tree ends in a point, not a stub.
    draw.polygon([(cx, 0), (cx + 5, 15), (cx - 5, 15)], fill=leaves[1])
    draw.polygon([(cx + 1, 3), (cx + 4, 15), (cx + 1, 15)], fill=leaves[0])
    draw.line([(cx - 1, 4), (cx - 3, 14)], fill=leaves[3])

    if snow:
        for y, reach in tier_rows:
            for step in range(-reach, reach, 3):
                if rng.chance(0.45):
                    run = rng.ri(2, 4)
                    draw.rectangle([cx + step, y, cx + step + run, y + 1], fill=rgb('#e2ecf5'))

    sprite.outline()
    return sprite.img


def tree_palm(rng: Rng, height_px: int = 74):
    """Leaning trunk with six drooping fronds and a bunch of dates."""
    import math

    sprite = Sprite(74, height_px)
    draw = sprite.draw
    cx = 37
    lean = rng.ri(-8, 8)
    crown_y = 16

    for step in range(height_px - crown_y):
        y = height_px - 3 - step
        progress = step / (height_px - crown_y)
        x = cx + int(lean * progress**2)
        half = 6 - int(progress * 2)
        band = step % 6
        base = rgb('#5e4a2c') if band < 2 else rgb('#7d6238')
        draw.line([(x - half, y), (x + half, y)], fill=base)
        draw.line([(x - half, y), (x - half + 2, y)], fill=shade(base, 1.25))
        draw.line([(x + half - 1, y), (x + half, y)], fill=shade(base, 0.74))
    top_x = cx + lean

    # Each frond is a tapered blade that rises out of the crown and bends over.
    # Drawn as a filled shape rather than a bundle of strokes, which at this
    # size just turns into a smudge.
    for tip_dx, tip_dy, lift in (
        (-32, 20, -16),
        (-27, 0, -22),
        (-14, -13, -24),
        (14, -13, -24),
        (27, 0, -22),
        (32, 20, -16),
    ):
        tip = (top_x + tip_dx + rng.ri(-2, 2), crown_y + tip_dy + rng.ri(-2, 2))
        mid = (top_x + tip_dx * 0.42, crown_y + lift)
        spine = []
        for step in range(11):
            t = step / 10
            inv = 1 - t
            spine.append(
                (
                    inv * inv * top_x + 2 * inv * t * mid[0] + t * t * tip[0],
                    inv * inv * crown_y + 2 * inv * t * mid[1] + t * t * tip[1],
                )
            )
        widths = [1 + 4.2 * math.sin(index / 10 * math.pi) for index in range(11)]
        upper = [(px, py - w) for (px, py), w in zip(spine, widths)]
        lower = [(px, py + w) for (px, py), w in zip(spine, widths)]
        draw.polygon(upper + lower[::-1], fill=rgb('#2f5a28'))
        draw.polygon([(px, py - w * 0.55) for (px, py), w in zip(spine, widths)] + lower[::-1], fill=rgb('#3f7a33'))
        for index in range(1, 10):
            px, py = spine[index]
            w = widths[index]
            draw.line([(px, py - w), (px + rng.ri(-1, 1), py + w)], fill=rgb('#274a22'))
        draw.line(spine, fill=rgb('#5a9a44'), width=1, joint='curve')

    for _ in range(5):
        dx, dy = rng.ri(-6, 4), rng.ri(2, 8)
        draw.ellipse(
            [top_x + dx, crown_y + dy, top_x + dx + rng.ri(3, 5), crown_y + dy + rng.ri(3, 5)],
            fill=rgb('#a8642c'),
        )
    draw.ellipse([top_x - 5, crown_y - 4, top_x + 5, crown_y + 6], fill=rgb('#7a5c32'))
    sprite.outline()
    return sprite.img


def tree_dead(rng: Rng, height_px: int = 58, color: Color = rgb('#4a4038')):
    sprite = Sprite(48, height_px)
    draw = sprite.draw
    cx = 24
    draw.rectangle([cx - 3, height_px // 3, cx + 2, height_px - 3], fill=color)
    for _ in range(rng.ri(5, 8)):
        y = rng.ri(6, height_px // 2)
        side = rng.pick([-1, 1])
        draw.line([(cx, y + 8), (cx + side * rng.ri(8, 18), y)], fill=color, width=2)
        draw.line([(cx + side * rng.ri(8, 14), y + 2), (cx + side * rng.ri(14, 22), y - 8)], fill=color)
    sprite.outline()
    return sprite.img


def bush(rng: Rng, size: int = 20, leaves: Sequence[Color] = LEAF_SUMMER, berries: Color | None = None):
    sprite = Sprite(size + 6, size + 4)
    draw = sprite.draw
    for _ in range(rng.ri(4, 6)):
        bx = rng.ri(size // 4, size - size // 5)
        by = rng.ri(size // 3, size - 3)
        br = rng.ri(size // 4, size // 2)
        draw.ellipse([bx - br, by - br, bx + br, by + br], fill=rng.pick(leaves[:3]))
    # Same leaf-clump mat as the trees, so a bush is not a flat blob beside one.
    pixels = sprite.img.load()
    for gy in range(0, size + 3, 3):
        for gx in range(0, size + 5, 3):
            px, py = gx + rng.ri(0, 2), gy + rng.ri(0, 2)
            if not (0 <= px < sprite.width - 2 and 0 <= py < sprite.height - 2 and pixels[px, py][3] > 0):
                continue
            lit = px + py < size
            color = rng.pick(leaves[2:]) if lit else rng.pick(leaves[:2])
            draw.rectangle([px, py, px + 1, py], fill=color)
            if rng.chance(0.4):
                draw.point((px + 1, py + 1), fill=color)
    if berries:
        for _ in range(rng.ri(3, 6)):
            bx, by = rng.ri(3, size), rng.ri(3, size - 2)
            draw.ellipse([bx, by, bx + 2, by + 2], fill=berries)
    sprite.outline()
    return sprite.img


def rock(rng: Rng, size: int = 22, color: Color = rgb('#6a6a72')):
    """A faceted boulder: lit crown, shadowed base, cracks and a little moss.

    A single-facet blob is the thing that most reads as programmer-art, so the
    body is split into planes with hard tonal steps and the top edge catches a
    bright rim, the way a chiselled rock face does.
    """
    import math

    sprite = Sprite(size + 8, size + 6)
    draw = sprite.draw
    cx, cy = (size + 8) / 2, (size + 6) / 2 + 1

    points = []
    for index in range(9):
        angle = index / 9 * 6.28318
        radius = size / 2 * rng.rf(0.74, 1.0)
        points.append((cx + radius * math.cos(angle), cy + radius * 0.82 * math.sin(angle)))

    def scaled(factor: float, dx: float, dy: float):
        return [(cx + (x - cx) * factor + dx, cy + (y - cy) * factor + dy) for x, y in points]

    # Three concentric planes: body, shadow pushed away from the light, lit
    # face pulled towards it. Taking only the upper vertices instead leaves a
    # spike where the hull narrows.
    draw.polygon(points, fill=color)
    draw.polygon(scaled(0.86, 2, 3), fill=shade(color, 0.74))
    draw.polygon(scaled(0.54, -2, -3), fill=shade(color, 1.20))

    # Cracks, grain and moss go on a clipped layer so nothing escapes the
    # silhouette.
    detail = Sprite(sprite.width, sprite.height)
    for _ in range(rng.ri(2, 3)):
        x, y = rng.ri(int(cx - size // 4), int(cx + size // 4)), int(cy - size // 5)
        for _ in range(rng.ri(2, 4)):
            nx, ny = x + rng.ri(-3, 3), y + rng.ri(2, 4)
            detail.draw.line([(x, y), (nx, ny)], fill=shade(color, 0.58))
            x, y = nx, ny
    top = min(points, key=lambda p: p[1])
    detail.draw.line([(top[0] - 3, top[1] + 2), (top[0] + 4, top[1] + 3)], fill=shade(color, 1.38))
    for _ in range(size * 2):
        detail.draw.point(
            (rng.ri(0, sprite.width - 1), rng.ri(0, sprite.height - 1)),
            fill=rng.pick([shade(color, 0.86), shade(color, 1.10)]),
        )
    for _ in range(rng.ri(3, 5)):
        mx, my = rng.ri(2, sprite.width - 3), rng.ri(int(cy), sprite.height - 2)
        detail.draw.rectangle([mx, my, mx + 1, my + 1], fill=rgb('#4a6a34'))
        detail.draw.point((mx + rng.ri(-1, 1), my + 1), fill=rgb('#5c7d3f'))

    detail.img.putalpha(ImageChops.multiply(detail.img.split()[3], sprite.img.split()[3]))
    sprite.img.alpha_composite(detail.img)
    sprite.draw = ImageDraw.Draw(sprite.img)
    sprite.outline()
    return sprite.img


def barrel(rng: Rng, color: Color = rgb('#7a5a30')):
    sprite = Sprite(18, 22)
    draw = sprite.draw
    draw.rounded_rectangle([2, 3, 15, 20], radius=4, fill=color)
    draw.ellipse([2, 1, 15, 8], fill=shade(color, 1.2))
    draw.ellipse([4, 3, 13, 6], fill=shade(color, 0.7))
    for y in (8, 15):
        draw.line([(2, y), (15, y)], fill=rgb('#4a3a28'), width=2)
    draw.line([(4, 5), (4, 19)], fill=shade(color, 1.2))
    sprite.outline()
    return sprite.img


def crate(rng: Rng, color: Color = rgb('#8a6a3c'), size: int = 18):
    sprite = Sprite(size + 2, size + 2)
    draw = sprite.draw
    draw.rectangle([1, 1, size, size], fill=color)
    draw.rectangle([1, 1, size, 4], fill=shade(color, 1.2))
    draw.line([(1, 1), (size, size)], fill=shade(color, 0.72), width=2)
    draw.line([(size, 1), (1, size)], fill=shade(color, 0.72), width=2)
    draw.rectangle([1, 1, size, size], outline=shade(color, 0.6))
    sprite.outline()
    return sprite.img


def sack(rng: Rng, color: Color = rgb('#b09a6c')):
    sprite = Sprite(16, 20)
    draw = sprite.draw
    draw.ellipse([1, 6, 14, 19], fill=color)
    draw.polygon([(5, 8), (10, 8), (9, 1), (6, 1)], fill=shade(color, 0.86))
    draw.line([(5, 7), (10, 7)], fill=shade(color, 0.6), width=2)
    draw.ellipse([3, 9, 8, 14], fill=shade(color, 1.12))
    sprite.outline()
    return sprite.img


def haystack(rng: Rng, color: Color = rgb('#c0a04c')):
    sprite = Sprite(34, 30)
    draw = sprite.draw
    draw.polygon([(17, 1), (33, 28), (1, 28)], fill=color)
    # Straw runs down the cone in 2px strands, with two binding ropes.
    for px in range(1, 34, 2):
        for py in range(4, 28, 4):
            if abs(px - 17) < (py - 1) * 0.58:
                draw.rectangle(
                    [px, py, px, py + 2],
                    fill=rng.pick([shade(color, 0.78), shade(color, 0.92), shade(color, 1.18)]),
                )
    for rope_y in (14, 22):
        half = (rope_y - 1) * 0.58
        draw.rectangle([17 - half + 1, rope_y, 17 + half - 1, rope_y + 1], fill=shade(color, 0.66))
        draw.rectangle([17 - half + 1, rope_y, 17 + half - 1, rope_y], fill=shade(color, 1.10))
    sprite.outline()
    return sprite.img


def well(rng: Rng, stone: Color = rgb('#7c7a82')):
    sprite = Sprite(40, 46)
    draw = sprite.draw
    draw.ellipse([2, 22, 37, 42], fill=stone)
    draw.ellipse([6, 25, 33, 39], fill=rgb('#243244'))
    draw.ellipse([9, 28, 30, 37], fill=rgb('#31506e'))
    draw.arc([9, 28, 30, 37], start=200, end=340, fill=rgb('#4d7ea4'), width=2)
    for x in range(3, 36, 6):
        draw.rectangle([x, 24 + abs(x - 19) // 4, x + 4, 34], fill=rng.jitter(stone, 8))
    for x in (7, 30):
        draw.rectangle([x, 4, x + 3, 26], fill=rgb('#5c4326'))
    draw.polygon([(20, 0), (35, 12), (5, 12)], fill=rgb('#7a4436'))
    for y in range(2, 12, 3):
        draw.line([(20 - y * 1.25, y + 1), (20 + y * 1.25, y + 1)], fill=rgb('#5e3228'))
    draw.line([(7, 14), (32, 14)], fill=rgb('#4a3a24'), width=2)
    draw.line([(20, 15), (20, 26)], fill=rgb('#2c2418'))
    draw.rectangle([17, 26, 23, 31], fill=rgb('#6a5230'))
    sprite.outline()
    return sprite.img


def fountain(rng: Rng, stone: Color = rgb('#9a98a4'), water: Color = rgb('#3f6f9c'), size: int = 74):
    sprite = Sprite(size, int(size * 0.78))
    draw = sprite.draw
    w, h = sprite.width, sprite.height
    draw.ellipse([1, h - int(h * 0.86), w - 2, h - 2], fill=stone)
    draw.ellipse([5, h - int(h * 0.78), w - 6, h - 6], fill=shade(stone, 0.74))
    draw.ellipse([8, h - int(h * 0.72), w - 9, h - 9], fill=water)
    draw.ellipse([12, h - int(h * 0.66), w - 20, h - 22], fill=shade(water, 1.28))
    cx = w // 2
    draw.rectangle([cx - 5, h - int(h * 0.75), cx + 4, h - int(h * 0.32)], fill=shade(stone, 1.06))
    draw.ellipse([cx - 13, h - int(h * 0.52), cx + 12, h - int(h * 0.34)], fill=stone)
    draw.ellipse([cx - 9, h - int(h * 0.49), cx + 8, h - int(h * 0.38)], fill=water)
    draw.rectangle([cx - 3, 6, cx + 2, h - int(h * 0.48)], fill=shade(stone, 1.12))
    draw.ellipse([cx - 5, 2, cx + 4, 11], fill=shade(stone, 1.24))
    for side in (-1, 1):
        for step in range(6):
            draw.point((cx + side * (2 + step), 8 + step * 2), fill=shade(water, 1.5))
    sprite.outline()
    return sprite.img


def statue(rng: Rng, stone: Color = rgb('#a8a6b2'), height_px: int = 66):
    sprite = Sprite(38, height_px)
    draw = sprite.draw
    base_y = height_px - 2
    draw.rectangle([2, base_y - 14, 35, base_y], fill=shade(stone, 0.8))
    draw.rectangle([5, base_y - 20, 32, base_y - 13], fill=stone)
    draw.rectangle([13, base_y - 44, 24, base_y - 19], fill=shade(stone, 1.08))
    draw.ellipse([14, base_y - 56, 24, base_y - 44], fill=shade(stone, 1.14))
    draw.polygon([(13, base_y - 40), (5, base_y - 30), (8, base_y - 27), (14, base_y - 34)], fill=shade(stone, 1.02))
    draw.polygon([(24, base_y - 42), (31, base_y - 58), (34, base_y - 56), (26, base_y - 38)], fill=shade(stone, 1.02))
    draw.line([(30, base_y - 60), (33, base_y - 40)], fill=shade(stone, 1.2), width=3)
    draw.line([(13, base_y - 44), (13, base_y - 20)], fill=shade(stone, 0.78), width=2)
    sprite.outline()
    return sprite.img


def campfire(rng: Rng):
    sprite = Sprite(32, 32)
    draw = sprite.draw
    for angle, length in ((0, 12), (60, 11), (120, 12), (200, 10), (300, 11)):
        radians = angle / 57.3
        import math

        dx, dy = math.cos(radians) * length, math.sin(radians) * length * 0.55
        draw.line([(16 - dx, 24 - dy), (16 + dx, 24 + dy)], fill=rgb('#5a4028'), width=4)
        draw.line([(16 - dx, 24 - dy), (16 + dx, 24 + dy)], fill=rgb('#3c2a1a'), width=1)
    draw.ellipse([6, 20, 26, 30], outline=rgb('#6d6a70'), width=2)
    draw.polygon([(16, 4), (22, 16), (16, 22), (10, 16)], fill=rgb('#e0641e'))
    draw.polygon([(16, 8), (20, 17), (16, 21), (12, 17)], fill=rgb('#f2a02a'))
    draw.polygon([(16, 12), (18, 18), (16, 20), (14, 18)], fill=rgb('#ffe08a'))
    sprite.outline()
    return sprite.img


def brazier(rng: Rng, bowl: Color = rgb('#6a6270'), flame: Color = rgb('#e0641e')):
    """Iron bowl on a stand. The metal is deliberately light — against dark
    basalt a dark brazier disappears and only the flame reads."""
    sprite = Sprite(26, 44)
    draw = sprite.draw
    draw.ellipse([1, 36, 25, 44], fill=(*shade(flame, 0.55), 90))
    draw.rectangle([11, 20, 15, 39], fill=bowl)
    draw.line([(11, 20), (11, 39)], fill=shade(bowl, 1.3))
    draw.polygon([(3, 38), (23, 38), (20, 43), (6, 43)], fill=shade(bowl, 0.82))
    draw.polygon([(3, 15), (23, 15), (19, 26), (7, 26)], fill=bowl)
    draw.line([(3, 15), (23, 15)], fill=shade(bowl, 1.40), width=2)
    draw.line([(7, 26), (19, 26)], fill=shade(bowl, 0.70), width=2)
    draw.polygon([(13, 5), (18, 13), (13, 19), (8, 13)], fill=shade(flame, 0.85))
    draw.polygon([(13, 6), (17, 14), (13, 18), (9, 14)], fill=flame)
    draw.polygon([(13, 9), (15, 14), (13, 17), (11, 14)], fill=rgb('#ffe8a8'))
    sprite.outline()
    return sprite.img


def market_stall(rng: Rng, awning: Color = rgb('#b8452e'), goods: Sequence[Color] = ()):
    sprite = Sprite(70, 52)
    draw = sprite.draw
    for x in (4, 62):
        draw.rectangle([x, 10, x + 3, 48], fill=rgb('#6a4c2c'))
    draw.rectangle([2, 32, 67, 48], fill=rgb('#8a6738'))
    for x in range(2, 68, 8):
        draw.line([(x, 32), (x, 48)], fill=rgb('#6f5029'))
    draw.polygon([(0, 8), (69, 8), (65, 26), (4, 26)], fill=awning)
    for index, x in enumerate(range(0, 70, 9)):
        if index % 2 == 0:
            draw.polygon([(x, 8), (x + 9, 8), (x + 8, 26), (x - 1, 26)], fill=rgb('#efe5d2'))
    draw.line([(4, 26), (65, 26)], fill=shade(awning, 0.7), width=2)
    for index in range(6):
        color = goods[index % len(goods)] if goods else rgb('#c8a028')
        gx = 8 + index * 10
        draw.ellipse([gx, 26, gx + 7, 33], fill=color)
        draw.ellipse([gx + 1, 27, gx + 4, 30], fill=shade(color, 1.3))
    sprite.outline()
    return sprite.img


def signpost(rng: Rng, text_color: Color = rgb('#e2d3a8')):
    sprite = Sprite(28, 40)
    draw = sprite.draw
    draw.rectangle([12, 8, 15, 38], fill=rgb('#6a4c2c'))
    draw.polygon([(1, 10), (22, 10), (26, 16), (22, 22), (1, 22)], fill=rgb('#8a6738'))
    draw.line([(3, 14), (18, 14)], fill=text_color)
    draw.line([(3, 18), (14, 18)], fill=text_color)
    sprite.outline()
    return sprite.img


def lamp_post(rng: Rng, metal: Color = rgb('#3f3a44'), glow: Color = rgb('#ffdc8c')):
    sprite = Sprite(18, 52)
    draw = sprite.draw
    draw.rectangle([7, 12, 10, 50], fill=metal)
    draw.ellipse([4, 46, 14, 51], fill=shade(metal, 0.8))
    draw.polygon([(3, 10), (15, 10), (12, 2), (6, 2)], fill=metal)
    draw.rectangle([5, 10, 13, 20], fill=glow)
    draw.rectangle([6, 12, 9, 16], fill=shade(glow, 1.2))
    draw.polygon([(3, 20), (15, 20), (12, 24), (6, 24)], fill=metal)
    sprite.outline()
    return sprite.img


def fence(rng: Rng, length_px: int, color: Color = rgb('#7a5c34'), height_px: int = 26):
    sprite = Sprite(length_px, height_px)
    draw = sprite.draw
    for y in (height_px - 18, height_px - 10):
        draw.rectangle([0, y, length_px - 1, y + 3], fill=shade(color, 1.08))
    for x in range(2, length_px - 2, 12):
        draw.rectangle([x, 2, x + 4, height_px - 2], fill=rng.jitter(color, 8))
        draw.polygon([(x, 2), (x + 4, 2), (x + 2, -2)], fill=shade(color, 1.15))
    sprite.outline()
    return sprite.img


def palisade(rng: Rng, length_px: int, color: Color = rgb('#6a4f2e'), height_px: int = 40):
    sprite = Sprite(length_px, height_px)
    draw = sprite.draw
    for x in range(0, length_px, 11):
        tone = rng.jitter(color, 9)
        draw.rectangle([x, 6, x + 9, height_px - 1], fill=tone)
        draw.polygon([(x, 8), (x + 9, 8), (x + 5, 0)], fill=shade(tone, 1.12))
        draw.line([(x + 9, 8), (x + 9, height_px - 1)], fill=shade(tone, 0.7))
    draw.rectangle([0, height_px - 18, length_px - 1, height_px - 15], fill=shade(color, 0.78))
    sprite.outline()
    return sprite.img


def stone_wall(rng: Rng, length_px: int, color: Color = rgb('#82808c'), height_px: int = 34):
    sprite = Sprite(length_px, height_px)
    draw = sprite.draw
    draw.rectangle([0, 8, length_px - 1, height_px - 1], fill=shade(color, 0.7))
    for row, y in enumerate(range(10, height_px - 1, 9)):
        offset = 7 if row % 2 else 0
        for x in range(-14, length_px, 15):
            left, right = max(0, x + offset), min(length_px - 1, x + offset + 13)
            if right - left < 3:
                continue
            block = rng.jitter(color, 9)
            draw.rectangle([left, y, right, y + 7], fill=block)
            draw.line([(left, y), (right, y)], fill=shade(block, 1.2))
    for x in range(0, length_px, 10):
        draw.rectangle([x, 2, x + 6, 9], fill=rng.jitter(color, 7))
    sprite.outline()
    return sprite.img


def gate_arch(rng: Rng, color: Color = rgb('#8a8894'), width_px: int = 96, height_px: int = 88):
    sprite = Sprite(width_px, height_px)
    draw = sprite.draw
    tower = width_px // 4
    for x in (0, width_px - tower):
        draw.rectangle([x, 10, x + tower - 1, height_px - 1], fill=color)
        for row, y in enumerate(range(14, height_px, 9)):
            offset = 6 if row % 2 else 0
            for bx in range(x - 12, x + tower, 13):
                left, right = max(x, bx + offset), min(x + tower - 1, bx + offset + 11)
                if right - left > 3:
                    draw.rectangle([left, y, right, y + 7], fill=rng.jitter(color, 8))
        for cx in range(x, x + tower - 4, 9):
            draw.rectangle([cx, 2, cx + 5, 11], fill=shade(color, 1.1))
    draw.rectangle([tower, 20, width_px - tower - 1, height_px - 1], fill=shade(color, 0.94))
    inner = (tower + 6, 34, width_px - tower - 7, height_px - 1)
    draw.rectangle(inner, fill=rgb('#1e1a20'))
    draw.pieslice([inner[0], inner[1] - 18, inner[2], inner[1] + 18], start=180, end=360, fill=rgb('#1e1a20'))
    for x in range(inner[0], inner[2], 6):
        draw.line([(x, inner[1] - 6), (x, height_px - 1)], fill=rgb('#3a3038'))
    sprite.outline()
    return sprite.img


def dock(rng: Rng, width_px: int, height_px: int, color: Color = rgb('#7a5c38')):
    sprite = Sprite(width_px, height_px)
    draw = sprite.draw
    for y in range(0, height_px, 9):
        draw.rectangle([0, y, width_px - 1, y + 7], fill=rng.jitter(color, 8))
        draw.line([(0, y + 7), (width_px - 1, y + 7)], fill=shade(color, 0.68))
    for x in (3, width_px - 8):
        draw.rectangle([x, 0, x + 4, height_px - 1], fill=shade(color, 0.82))
    sprite.outline()
    return sprite.img


def boat(rng: Rng, hull: Color = rgb('#6b4a2c'), sail: Color | None = rgb('#e6dcc4')):
    sprite = Sprite(72, 58)
    draw = sprite.draw
    base = 54
    draw.polygon([(4, base - 12), (68, base - 12), (60, base), (12, base)], fill=hull)
    # Hull planking: three strakes with caulk lines, gunwale on top.
    for strake in range(base - 11, base, 4):
        draw.line([(6, strake), (66, strake)], fill=shade(hull, 0.76))
        draw.line([(6, strake + 1), (66, strake + 1)], fill=shade(hull, 1.08))
    draw.rectangle([4, base - 16, 68, base - 12], fill=shade(hull, 1.20))
    draw.rectangle([4, base - 16, 68, base - 15], fill=shade(hull, 1.38))
    # Ribs inside the hull and a thwart bench.
    for rib in range(12, 62, 10):
        draw.line([(rib, base - 14), (rib, base - 2)], fill=shade(hull, 0.70))
    draw.rectangle([26, base - 15, 46, base - 12], fill=shade(hull, 0.86))
    if sail:
        draw.rectangle([35, 4, 37, base - 14], fill=rgb('#4a3520'))
        draw.line([(35, 4), (35, base - 14)], fill=rgb('#6a5232'))
        draw.polygon([(38, 6), (63, 24), (38, 38)], fill=sail)
        draw.polygon([(34, 8), (15, 26), (34, 36)], fill=shade(sail, 0.86))
        # Seam panels and a billow crease down each sail.
        for panel in (14, 22, 30):
            draw.line([(38, panel), (60, panel + 4)], fill=shade(sail, 0.80))
            draw.line([(34, panel), (18, panel + 4)], fill=shade(sail, 0.74))
        draw.line([(38, 6), (38, 38)], fill=shade(sail, 0.66))
        draw.point((6, 4), fill=rgb('#c04a3a'))  # a little pennant
        draw.line([(36, 4), (44, 3)], fill=rgb('#c04a3a'), width=2)
    sprite.outline()
    return sprite.img


def cart(rng: Rng, wood: Color = rgb('#7a5a32')):
    sprite = Sprite(52, 34)
    draw = sprite.draw
    draw.rectangle([4, 6, 47, 24], fill=wood)
    for x in range(6, 46, 7):
        draw.line([(x, 6), (x, 24)], fill=shade(wood, 0.76))
    draw.rectangle([4, 4, 47, 8], fill=shade(wood, 1.16))
    for cx in (13, 39):
        draw.ellipse([cx - 8, 16, cx + 8, 32], fill=rgb('#3a2a18'))
        draw.ellipse([cx - 6, 18, cx + 6, 30], fill=shade(wood, 0.86))
        draw.ellipse([cx - 3, 21, cx + 3, 27], fill=rgb('#3a2a18'))
        # Four spokes and a hub.
        for ang in (0, 45, 90, 135):
            import math

            dx, dy = math.cos(math.radians(ang)) * 6, math.sin(math.radians(ang)) * 6
            draw.line([(cx - dx, 24 - dy), (cx + dx, 24 + dy)], fill=shade(wood, 1.10))
        draw.ellipse([cx - 2, 22, cx + 2, 26], fill=shade(wood, 1.2))
    sprite.outline()
    return sprite.img


def flowers(rng: Rng, color: Color = rgb('#e2d05a')):
    sprite = Sprite(16, 14)
    draw = sprite.draw
    for _ in range(rng.ri(3, 5)):
        fx, fy = rng.ri(2, 13), rng.ri(2, 11)
        draw.line([(fx, fy), (fx, fy + 3)], fill=rgb('#3f6b30'))
        draw.point([(fx, fy), (fx - 1, fy), (fx + 1, fy), (fx, fy - 1), (fx, fy + 1)], fill=color)
    return sprite.img


def gravestone(rng: Rng, color: Color = rgb('#8a8890')):
    sprite = Sprite(22, 28)
    draw = sprite.draw
    # A leaning slab on a little mound, cross carved in, cracked and mossy.
    lean = rng.ri(-1, 1)
    draw.ellipse([1, 22, 20, 27], fill=rgb('#4a5a34'))  # grassy mound
    draw.rounded_rectangle([4 + lean, 3, 17 + lean, 24], radius=6, fill=color)
    draw.line([(5 + lean, 5), (5 + lean, 22)], fill=shade(color, 1.22))
    draw.line([(16 + lean, 6), (16 + lean, 22)], fill=shade(color, 0.72))
    # Carved cross, cut as a shadow line with a lit edge.
    draw.line([(10 + lean, 8), (10 + lean, 17)], fill=shade(color, 0.62), width=2)
    draw.line([(7 + lean, 11), (14 + lean, 11)], fill=shade(color, 0.62), width=2)
    draw.point([(9 + lean, 8), (7 + lean, 10)], fill=shade(color, 1.25))
    # A crack and moss creeping up the base.
    draw.line([(12 + lean, 14), (11 + lean, 22)], fill=shade(color, 0.58))
    for _ in range(rng.ri(3, 5)):
        mx, my = rng.ri(5, 15), rng.ri(19, 23)
        draw.point([(mx, my), (mx + 1, my)], fill=rgb('#5c7d3f'))
    sprite.outline()
    return sprite.img


def obelisk(rng: Rng, color: Color = rgb('#5e5470'), glow: Color = rgb('#9d8ce0')):
    sprite = Sprite(28, 74)
    draw = sprite.draw
    draw.rectangle([2, 62, 25, 72], fill=shade(color, 0.8))
    draw.polygon([(14, 2), (22, 22), (22, 64), (6, 64), (6, 22)], fill=color)
    draw.polygon([(14, 2), (18, 22), (18, 64), (14, 64)], fill=shade(color, 0.8))
    for y in range(28, 60, 9):
        draw.line([(9, y), (18, y)], fill=glow)
    draw.ellipse([11, 8, 17, 16], fill=glow)
    sprite.outline()
    return sprite.img


def crystal(rng: Rng, color: Color = rgb('#6ec8d8'), height_px: int = 40):
    """A cluster of faceted shards. Each shard gets a lit face, a shadow face
    and a bright edge so it reads as a cut gem rather than a flat lozenge."""
    sprite = Sprite(30, height_px)
    draw = sprite.draw
    # A faint glow pooled at the base.
    draw.ellipse([2, height_px - 8, 27, height_px - 1], fill=(*shade(color, 1.2), 70))
    for offset, scale in ((-8, 0.58), (7, 0.70), (0, 1.0)):
        cx = 15 + offset
        top = int(height_px * (1 - scale)) + 2
        bottom = height_px - 3
        mid = top + 11
        # Left (lit) face, right (shadow) face, then a bright central ridge.
        draw.polygon([(cx, top), (cx + 6, mid), (cx + 4, bottom), (cx - 5, bottom), (cx - 6, mid)], fill=shade(color, 0.72))
        draw.polygon([(cx, top), (cx - 6, mid), (cx - 5, bottom), (cx, bottom)], fill=shade(color, 1.0))
        draw.polygon([(cx, top), (cx + 2, mid), (cx + 1, bottom), (cx, bottom)], fill=shade(color, 1.32))
        draw.line([(cx, top), (cx, bottom)], fill=shade(color, 1.5))
        draw.point([(cx - 2, top + 3), (cx - 3, top + 6)], fill=shade(color, 1.55))
    sprite.outline()
    return sprite.img


def cactus(rng: Rng, color: Color = rgb('#3f7a44')):
    sprite = Sprite(34, 52)
    draw = sprite.draw
    draw.rounded_rectangle([13, 6, 21, 50], radius=4, fill=color)
    draw.rounded_rectangle([3, 20, 10, 40], radius=4, fill=color)
    draw.rectangle([8, 30, 15, 36], fill=color)
    draw.rounded_rectangle([24, 14, 31, 34], radius=4, fill=color)
    draw.rectangle([19, 24, 26, 30], fill=color)
    # Ribs: a lit crease and a shaded one down each limb.
    for x, y0, y1 in ((13, 8, 48), (17, 10, 48), (5, 22, 38), (26, 16, 32)):
        draw.line([(x, y0), (x, y1)], fill=shade(color, 1.26))
        draw.line([(x + 3, y0 + 2), (x + 3, y1)], fill=shade(color, 0.78))
    # Spines paired along each rib.
    for x, y0, y1 in ((15, 10, 48), (5, 24, 38), (27, 18, 32)):
        for y in range(y0, y1, 4):
            draw.point([(x - 2, y), (x + 3, y + 1)], fill=rgb('#e6ecb0'))
    # A crown flower on the tallest arm.
    draw.ellipse([15, 3, 19, 7], fill=rgb('#e26a8a'))
    draw.point((17, 5), fill=rgb('#f4a8c0'))
    sprite.outline()
    return sprite.img


def ice_spike(rng: Rng, color: Color = rgb('#a8d4e8'), height_px: int = 44):
    sprite = Sprite(26, height_px)
    draw = sprite.draw
    draw.polygon([(13, 1), (22, height_px - 2), (4, height_px - 2)], fill=color)
    draw.polygon([(13, 1), (17, height_px - 3), (13, height_px - 3)], fill=shade(color, 0.8))
    draw.line([(11, 6), (8, height_px - 4)], fill=shade(color, 1.3), width=2)
    sprite.outline()
    return sprite.img


def cave_mouth(rng: Rng, width_px: int, height_px: int, color: Color = rgb('#5c5a62')):
    """A rock face with a dark opening — the entrance to an expedition."""
    sprite = Sprite(width_px, height_px)
    draw = sprite.draw
    import math

    points = []
    for index in range(14):
        angle = index / 14 * 6.28318
        rx = width_px / 2 * rng.rf(0.82, 1.0)
        ry = height_px / 2 * rng.rf(0.8, 1.0)
        points.append((width_px / 2 + rx * math.cos(angle), height_px / 2 + ry * math.sin(angle)))
    draw.polygon(points, fill=color)
    for _ in range(width_px // 3):
        px, py = rng.ri(4, width_px - 5), rng.ri(4, height_px - 5)
        draw.ellipse([px, py, px + rng.ri(4, 11), py + rng.ri(3, 8)], fill=rng.jitter(color, 12))
    mouth_w, mouth_h = int(width_px * 0.42), int(height_px * 0.62)
    mx, my = (width_px - mouth_w) // 2, height_px - mouth_h - 2
    draw.pieslice([mx, my, mx + mouth_w, my + mouth_h * 2], start=180, end=360, fill=rgb('#14121a'))
    draw.rectangle([mx, my + mouth_h - 2, mx + mouth_w, height_px - 2], fill=rgb('#14121a'))
    draw.arc([mx - 2, my - 2, mx + mouth_w + 2, my + mouth_h * 2], start=180, end=360, fill=shade(color, 1.25), width=3)
    for _ in range(6):
        px = rng.ri(mx + 2, mx + mouth_w - 4)
        draw.polygon([(px, my + 4), (px + 3, my + 4), (px + 1, my + rng.ri(8, 16))], fill=shade(color, 1.1))
    sprite.outline()
    return sprite.img


def arena_ring(rng: Rng, width_px: int, height_px: int, sand: Color = rgb('#c2a878'), wall: Color = rgb('#8a7c68')):
    """An open fighting pit: banked sand ring behind a low palisade."""
    sprite = Sprite(width_px, height_px)
    draw = sprite.draw
    draw.ellipse([0, 4, width_px - 1, height_px - 1], fill=shade(wall, 0.72))
    draw.ellipse([5, 9, width_px - 6, height_px - 5], fill=wall)
    draw.ellipse([11, 15, width_px - 12, height_px - 10], fill=sand)
    draw.ellipse([15, 19, width_px - 16, height_px - 14], outline=shade(sand, 0.90))
    for _ in range(width_px):
        px, py = rng.ri(6, width_px // 2 - 7) * 2, rng.ri(8, height_px // 2 - 6) * 2
        draw.rectangle([px, py, px + 1, py + 1], fill=rng.pick([shade(sand, 0.88), shade(sand, 1.10)]))
    # Scuffed-up sand where the fighting happens.
    for _ in range(6):
        px, py = rng.ri(9, width_px // 2 - 9) * 2, rng.ri(10, height_px // 2 - 8) * 2
        draw.rectangle([px, py, px + rng.ri(3, 7) * 2, py + 1], fill=shade(sand, 0.84))
    for index in range(12):
        angle = index / 12 * 6.28318
        import math

        px = width_px / 2 + (width_px / 2 - 4) * math.cos(angle)
        py = height_px / 2 + 2 + (height_px / 2 - 6) * math.sin(angle)
        draw.rectangle([px - 3, py - 12, px + 2, py + 2], fill=rgb('#6a4f2e'))
        draw.polygon([(px - 3, py - 12), (px + 2, py - 12), (px, py - 16)], fill=rgb('#7d5f38'))
    for x, y in ((width_px // 2 - 16, height_px // 2), (width_px // 2 + 12, height_px // 2 + 8)):
        draw.line([(x, y), (x + 10, y - 8)], fill=rgb('#9a9aa4'), width=3)
        draw.line([(x + 10, y - 8), (x + 13, y - 11)], fill=rgb('#6a5a3a'), width=3)
    sprite.outline()
    return sprite.img


def portal_stones(rng: Rng, width_px: int, height_px: int, stone: Color = rgb('#7a7484'), glow: Color = rgb('#7fd8c8')):
    """The world-map exit: a trilithon gate straddling the road out of town."""
    sprite = Sprite(width_px, height_px)
    draw = sprite.draw

    post_w = max(13, width_px // 7)
    post_h = int(height_px * 0.66)
    ground = height_px - 4
    left_x, right_x = 6, width_px - 6 - post_w

    draw.ellipse([left_x - 4, ground - 16, right_x + post_w + 4, ground + 3], fill=shade(glow, 0.55))
    draw.ellipse([left_x + 6, ground - 13, right_x + post_w - 6, ground], fill=glow)
    draw.ellipse([left_x + 14, ground - 10, right_x + post_w - 14, ground - 3], fill=shade(glow, 1.35))

    for x in (left_x, right_x):
        top = ground - post_h
        draw.polygon(
            [(x + 1, top), (x + post_w - 1, top + 2), (x + post_w, ground), (x, ground - 2)],
            fill=rng.jitter(stone, 6),
        )
        draw.line([(x + 2, top + 2), (x + 2, ground - 3)], fill=shade(stone, 1.30), width=2)
        draw.line([(x + post_w - 2, top + 3), (x + post_w - 2, ground - 1)], fill=shade(stone, 0.72), width=2)
        for _ in range(4):
            gy = rng.ri(top + 6, ground - 8)
            draw.line([(x + 3, gy), (x + post_w - 3, gy + rng.ri(-2, 2))], fill=shade(stone, 0.84))

    lintel_top = ground - post_h - 12
    draw.polygon(
        [(left_x - 3, lintel_top + 2), (right_x + post_w + 3, lintel_top), (right_x + post_w + 2, lintel_top + 13), (left_x - 2, lintel_top + 15)],
        fill=shade(stone, 1.08),
    )
    draw.line([(left_x - 3, lintel_top + 2), (right_x + post_w + 3, lintel_top)], fill=shade(stone, 1.32), width=2)
    for x in range(left_x + 6, right_x + post_w, 14):
        draw.line([(x, lintel_top + 4), (x, lintel_top + 12)], fill=glow)
    sprite.outline()
    return sprite.img


def tough_lair(rng: Rng, width_px: int, height_px: int, bone: Color = rgb('#d8d2bc'), ground: Color = rgb('#4a4038')):
    """Where the strong enemies wait: a bone-strewn hollow with a skull totem."""
    sprite = Sprite(width_px, height_px)
    draw = sprite.draw
    draw.ellipse([0, 6, width_px - 1, height_px - 1], fill=ground)
    draw.ellipse([6, 12, width_px - 7, height_px - 5], fill=shade(ground, 1.18))
    for _ in range(width_px // 6):
        px, py = rng.ri(8, width_px - 12), rng.ri(16, height_px - 8)
        draw.line([(px, py), (px + rng.ri(5, 11), py + rng.ri(-3, 3))], fill=bone, width=2)
    cx = width_px // 2
    draw.rectangle([cx - 3, height_px - 30, cx + 2, height_px - 6], fill=rgb('#5c4a30'))
    draw.ellipse([cx - 10, height_px - 48, cx + 9, height_px - 28], fill=bone)
    draw.rectangle([cx - 7, height_px - 34, cx + 6, height_px - 26], fill=bone)
    draw.ellipse([cx - 6, height_px - 43, cx - 2, height_px - 38], fill=rgb('#2a2028'))
    draw.ellipse([cx + 1, height_px - 43, cx + 5, height_px - 38], fill=rgb('#2a2028'))
    for x in range(cx - 6, cx + 6, 3):
        draw.line([(x, height_px - 32), (x, height_px - 27)], fill=rgb('#2a2028'))
    sprite.outline()
    return sprite.img


# --------------------------------------------------------------------------
# people
# --------------------------------------------------------------------------

SKIN_TONES = ramp('#f0c69c', '#e0ab7c', '#c68a5e', '#9e6743', '#7a4d31')
HAIR_TONES = ramp('#2c2018', '#4a3020', '#6b4526', '#8a5a2c', '#c09858', '#d8d2c4', '#7a2c20')


def character(rng: Rng, spec: dict) -> Image.Image:
    """A 32x48 townsfolk sprite, facing the player."""
    sprite = Sprite(32, 48)
    draw = sprite.draw

    skin = spec.get('skin', SKIN_TONES[1])
    hair = spec.get('hair', HAIR_TONES[0])
    tunic = spec.get('tunic', rgb('#6a5a8a'))
    trim = spec.get('trim', shade(tunic, 1.3))
    pants = spec.get('pants', rgb('#3f3a48'))
    boots = spec.get('boots', rgb('#3a2a1e'))
    cloak = spec.get('cloak')
    hat = spec.get('hat')
    held = spec.get('held')
    robe = spec.get('robe', False)

    sprite.drop_shadow((9, 41, 23, 47), alpha=85)

    if cloak:
        # Three tones and hanging folds — a flat silhouette behind the body is
        # what makes a cloak read as cardboard.
        draw.polygon([(7, 21), (25, 21), (29, 45), (3, 45)], fill=cloak)
        draw.polygon([(7, 21), (16, 21), (16, 45), (3, 45)], fill=shade(cloak, 1.14))
        draw.polygon([(22, 22), (25, 21), (29, 45), (24, 45)], fill=shade(cloak, 0.76))
        for fold_x, lean in ((9, -2), (13, -1), (20, 1), (24, 2)):
            draw.line([(fold_x, 26), (fold_x + lean, 44)], fill=shade(cloak, 0.82))
        draw.rectangle([3, 44, 29, 45], fill=shade(cloak, 0.66))
        # Clasp at the throat.
        draw.rectangle([15, 21, 17, 23], fill=rgb('#d8bb63'))
        draw.point((15, 21), fill=rgb('#f4e2a4'))

    if robe:
        draw.polygon([(10, 22), (22, 22), (26, 45), (6, 45)], fill=tunic)
        draw.polygon([(10, 22), (16, 22), (16, 45), (6, 45)], fill=shade(tunic, 1.14))
        draw.polygon([(21, 23), (22, 22), (26, 45), (23, 45)], fill=shade(tunic, 0.76))
        draw.line([(16, 24), (16, 45)], fill=shade(tunic, 0.8))
        # Hem band, and folds falling from the waist.
        draw.rectangle([6, 43, 26, 46], fill=shade(tunic, 0.78))
        draw.rectangle([6, 43, 26, 43], fill=shade(tunic, 1.18))
        for fold_x, lean in ((12, -1), (20, 1)):
            draw.line([(fold_x, 28), (fold_x + lean * 2, 43)], fill=shade(tunic, 0.84))
        draw.rectangle([10, 26, 22, 27], fill=trim)
    else:
        draw.rectangle([12, 33, 15, 44], fill=pants)
        draw.rectangle([17, 33, 20, 44], fill=pants)
        draw.line([(12, 34), (12, 43)], fill=shade(pants, 1.18))
        draw.line([(20, 34), (20, 43)], fill=shade(pants, 0.80))
        draw.rectangle([11, 43, 16, 46], fill=boots)
        draw.rectangle([16, 43, 21, 46], fill=boots)
        # Boot cuffs and a sole line.
        draw.rectangle([11, 42, 16, 42], fill=shade(boots, 1.35))
        draw.rectangle([16, 42, 21, 42], fill=shade(boots, 1.35))
        draw.rectangle([11, 46, 21, 46], fill=shade(boots, 0.7))
        draw.rounded_rectangle([10, 21, 22, 35], radius=3, fill=tunic)
        # Three tones across the torso: lit left, mid, shadowed right edge.
        draw.rectangle([10, 21, 15, 35], fill=shade(tunic, 1.14))
        draw.rectangle([21, 22, 22, 35], fill=shade(tunic, 0.76))
        # Folds down the front, then the belt over them.
        draw.line([(14, 24), (14, 31)], fill=shade(tunic, 0.86))
        draw.line([(19, 25), (19, 31)], fill=shade(tunic, 0.86))
        # Collar over the shoulders.
        draw.line([(11, 22), (14, 20)], fill=shade(trim, 1.10))
        draw.line([(21, 22), (18, 20)], fill=shade(trim, 0.86))
        draw.rectangle([10, 31, 22, 34], fill=trim)
        draw.rectangle([10, 31, 22, 31], fill=shade(trim, 1.25))
        draw.rectangle([15, 31, 17, 33], fill=rgb('#d8bb63'))
        draw.point((15, 31), fill=rgb('#f4e2a4'))

    # arms, with cuffs at the wrist
    sleeve = spec.get('sleeve', tunic)
    draw.rounded_rectangle([7, 22, 10, 34], radius=2, fill=shade(sleeve, 1.1))
    draw.rounded_rectangle([21, 22, 24, 34], radius=2, fill=shade(sleeve, 0.9))
    draw.rectangle([7, 32, 10, 32], fill=trim)
    draw.rectangle([21, 32, 24, 32], fill=trim)
    draw.rectangle([7, 33, 10, 36], fill=skin)
    draw.rectangle([21, 33, 24, 36], fill=skin)
    draw.line([(7, 33), (7, 36)], fill=shade(skin, 1.12))

    # collar, neck and head
    draw.rectangle([13, 19, 19, 22], fill=shade(skin, 0.86))
    draw.rectangle([12, 21, 20, 22], fill=shade(tunic, 0.82))
    draw.ellipse([10, 8, 21, 21], fill=skin)
    draw.ellipse([10, 8, 16, 21], fill=shade(skin, 1.06))
    # Brows, eyes with a catchlight, nose and mouth.
    draw.rectangle([12, 14, 14, 14], fill=shade(hair, 0.85))
    draw.rectangle([17, 14, 19, 14], fill=shade(hair, 0.85))
    draw.rectangle([13, 15, 13, 16], fill=rgb('#2a2028'))
    draw.rectangle([18, 15, 18, 16], fill=rgb('#2a2028'))
    draw.point([(13, 15), (18, 15)], fill=rgb('#8fa8c0'))
    draw.point((16, 17), fill=shade(skin, 0.84))
    draw.line([(14, 19), (17, 19)], fill=shade(skin, 0.66))
    draw.point([(11, 17), (20, 17)], fill=shade(skin, 0.90))

    style = spec.get('hair_style', 'short')
    if style != 'bald':
        draw.pieslice([9, 5, 22, 20], start=180, end=360, fill=hair)
        draw.rectangle([9, 11, 22, 13], fill=hair)
        if style == 'long':
            draw.rectangle([9, 11, 12, 27], fill=hair)
            draw.rectangle([19, 11, 22, 27], fill=hair)
            draw.rectangle([9, 24, 22, 28], fill=shade(hair, 0.92))
            draw.line([(10, 14), (10, 26)], fill=shade(hair, 1.28))
            draw.line([(21, 16), (21, 26)], fill=shade(hair, 0.80))
        elif style == 'bun':
            draw.ellipse([12, 1, 20, 8], fill=hair)
            draw.arc([12, 1, 20, 8], start=190, end=320, fill=shade(hair, 1.32))
        elif style == 'braid':
            draw.rectangle([9, 11, 12, 24], fill=hair)
            draw.rectangle([19, 11, 22, 24], fill=hair)
            for knot in range(14, 24, 3):
                draw.rectangle([9, knot, 12, knot], fill=shade(hair, 0.82))
                draw.rectangle([19, knot, 22, knot], fill=shade(hair, 0.82))
        # Strands catching the light along the parting.
        draw.line([(11, 9), (15, 6)], fill=shade(hair, 1.38))
        draw.line([(12, 11), (16, 8)], fill=shade(hair, 1.20))
        draw.line([(19, 8), (20, 12)], fill=shade(hair, 0.78))
    if spec.get('beard'):
        beard_color = spec.get('beard_color', hair)
        draw.pieslice([11, 12, 21, 24], start=0, end=180, fill=beard_color)
        draw.rectangle([13, 19, 19, 23], fill=beard_color)
        draw.line([(13, 20), (13, 22)], fill=shade(beard_color, 1.30))
        draw.line([(19, 20), (19, 22)], fill=shade(beard_color, 0.80))
        draw.rectangle([15, 18, 17, 18], fill=shade(skin, 0.78))

    if hat == 'wide':
        color = spec.get('hat_color', rgb('#5a4028'))
        draw.ellipse([4, 6, 27, 13], fill=color)
        draw.ellipse([10, 1, 21, 10], fill=shade(color, 1.12))
    elif hat == 'hood':
        # A cowl over the head, not a cone over the whole figure.
        color = spec.get('hat_color', rgb('#40384e'))
        draw.pieslice([8, 4, 24, 22], start=180, end=360, fill=color)
        draw.rectangle([8, 13, 24, 21], fill=color)
        draw.pieslice([8, 4, 16, 22], start=180, end=290, fill=shade(color, 1.16))
        draw.ellipse([11, 9, 21, 21], fill=skin)
        draw.rectangle([12, 14, 14, 14], fill=shade(hair, 0.85))
        draw.rectangle([17, 14, 19, 14], fill=shade(hair, 0.85))
        draw.rectangle([13, 15, 13, 16], fill=rgb('#2a2028'))
        draw.rectangle([18, 15, 18, 16], fill=rgb('#2a2028'))
        draw.line([(14, 19), (17, 19)], fill=shade(skin, 0.66))
        draw.arc([10, 8, 22, 22], start=190, end=350, fill=shade(color, 0.76))
    elif hat == 'helm':
        color = spec.get('hat_color', rgb('#8a8894'))
        draw.pieslice([8, 3, 23, 20], start=180, end=360, fill=color)
        draw.rectangle([8, 10, 23, 14], fill=shade(color, 0.82))
        draw.rectangle([15, 10, 17, 19], fill=shade(color, 0.9))
        draw.line([(10, 6), (14, 4)], fill=shade(color, 1.4))
    elif hat == 'crown':
        color = spec.get('hat_color', rgb('#d8b44c'))
        draw.rectangle([10, 6, 21, 9], fill=color)
        for x in (10, 14, 18):
            draw.polygon([(x, 6), (x + 3, 6), (x + 1, 2)], fill=color)
    elif hat == 'cap':
        color = spec.get('hat_color', rgb('#7a3c2c'))
        draw.pieslice([9, 4, 22, 17], start=180, end=360, fill=color)
        draw.rectangle([8, 10, 23, 12], fill=shade(color, 0.8))

    if held == 'staff':
        wood = spec.get('held_color', rgb('#6a4c2c'))
        draw.rectangle([24, 8, 26, 46], fill=wood)
        draw.ellipse([22, 3, 29, 10], fill=spec.get('gem', rgb('#7fd8c8')))
    elif held == 'spear':
        draw.rectangle([24, 4, 26, 46], fill=rgb('#6a4c2c'))
        draw.polygon([(25, 0), (29, 8), (21, 8)], fill=rgb('#c2c6d0'))
    elif held == 'lute':
        body = spec.get('held_color', rgb('#a3703a'))
        draw.ellipse([18, 28, 30, 42], fill=body)
        draw.ellipse([22, 32, 26, 37], fill=shade(body, 0.6))
        draw.rectangle([23, 16, 26, 30], fill=shade(body, 0.8))
    elif held == 'basket':
        color = spec.get('held_color', rgb('#b08a4c'))
        draw.rounded_rectangle([21, 32, 31, 41], radius=2, fill=color)
        draw.arc([21, 27, 31, 36], start=180, end=360, fill=shade(color, 0.8), width=2)
    elif held == 'hammer':
        draw.rectangle([24, 20, 26, 40], fill=rgb('#6a4c2c'))
        draw.rectangle([20, 15, 30, 22], fill=rgb('#7a7884'))
    elif held == 'book':
        draw.rectangle([20, 30, 30, 39], fill=spec.get('held_color', rgb('#8a3c34')))
        draw.rectangle([24, 30, 26, 39], fill=rgb('#e8e0cc'))
    elif held == 'lantern':
        draw.rectangle([24, 22, 25, 30], fill=rgb('#4a4048'))
        draw.rounded_rectangle([21, 30, 29, 39], radius=2, fill=rgb('#4a4048'))
        draw.rectangle([23, 32, 27, 37], fill=rgb('#ffd98a'))

    sprite.outline(color=(24, 18, 22))
    return sprite.img


def dog(rng: Rng, color: Color = rgb('#8a6a3c')) -> Image.Image:
    sprite = Sprite(26, 22)
    draw = sprite.draw
    sprite.drop_shadow((4, 17, 22, 21), alpha=70)
    draw.rounded_rectangle([4, 7, 19, 16], radius=4, fill=color)
    draw.ellipse([15, 3, 24, 12], fill=color)
    draw.polygon([(16, 4), (19, 0), (20, 6)], fill=shade(color, 0.8))
    draw.polygon([(21, 4), (24, 1), (24, 7)], fill=shade(color, 0.8))
    draw.point([(19, 7), (22, 7)], fill=rgb('#2a2028'))
    draw.ellipse([22, 8, 24, 10], fill=rgb('#2a2028'))
    for x in (5, 9, 14, 17):
        draw.rectangle([x, 14, x + 2, 20], fill=shade(color, 0.86))
    draw.line([(4, 9), (0, 3)], fill=color, width=2)
    sprite.outline()
    return sprite.img


def cat(rng: Rng, color: Color = rgb('#5a5058')) -> Image.Image:
    sprite = Sprite(20, 18)
    draw = sprite.draw
    sprite.drop_shadow((3, 14, 17, 17), alpha=60)
    draw.rounded_rectangle([3, 7, 14, 14], radius=4, fill=color)
    draw.ellipse([11, 3, 19, 11], fill=color)
    draw.polygon([(12, 4), (13, 0), (16, 4)], fill=shade(color, 0.82))
    draw.polygon([(16, 4), (18, 0), (19, 5)], fill=shade(color, 0.82))
    draw.point([(14, 6), (17, 6)], fill=rgb('#c8e060'))
    for x in (4, 8, 11):
        draw.rectangle([x, 13, x + 2, 16], fill=shade(color, 0.88))
    draw.line([(3, 9), (0, 2)], fill=color, width=2)
    sprite.outline()
    return sprite.img
