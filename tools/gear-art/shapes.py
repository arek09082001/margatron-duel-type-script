"""One drawing routine per gear shape — sixteen weapons, twelve armours, twelve
talismans, matching the shape tables in `src/game/gear.ts`.

Weapons are described in *haft coordinates*: `du` runs from the butt of the grip
towards the tip, `dv` sticks out to the up-left. That is what makes an axe head
statable as "five pixels out from the shaft, three either side of it" instead of
as a diagonal polygon nobody can read. Armour and talismans are drawn straight
into canvas coordinates, centred on x = 16.
"""

from __future__ import annotations

import math
from typing import Callable, Sequence

from canvas import (
    Canvas,
    Mask,
    Point,
    bright_tones,
    curve,
    disc_mask,
    gem_tones,
    interior,
    polygon_mask,
    rect_mask,
    ring_mask,
    stroke_mask,
    taper,
    tones,
)
from palettes import CORD, LEATHER, WOOD, TierPalette
from pixelart import rgb, shade

BUTT: Point = (6.5, 25.5)
#: Length of the diagonal from the butt to the far corner, in pixels.
REACH = 27.5

Frame = Callable[[float, float], Point]


def frame(butt: Point = BUTT) -> Frame:
    """Maps (along the haft, out to the up-left) onto canvas pixels."""
    root = 1 / math.sqrt(2)

    def at(du: float, dv: float = 0.0) -> Point:
        return (butt[0] + du * root - dv * root, butt[1] - du * root - dv * root)

    return at


# --------------------------------------------------------------------------
# weapon parts
# --------------------------------------------------------------------------


def _grip(c: Canvas, at: Frame, length: float, wraps: int = 2, half: float = 1.15) -> None:
    c.paint(stroke_mask([at(0.4), at(length)], half), (LEATHER[0], LEATHER[1], LEATHER[2]))

    for index in range(wraps):
        position = length * (index + 1) / (wraps + 1)
        c.paint(
            stroke_mask([at(position, -half - 0.4), at(position, half + 0.4)], 0.5),
            (shade(LEATHER[0], 0.8),),
            flat=True,
        )


def _pommel(c: Canvas, p: TierPalette, at: Frame, du: float = 0.0, radius: float = 1.7) -> None:
    c.paint(disc_mask(at(du), radius), (shade(p.trim, 0.6), p.trim, p.trim_light))


def _crossguard(c: Canvas, p: TierPalette, at: Frame, du: float, span: float, half: float = 0.9) -> None:
    c.paint(
        stroke_mask([at(du, -span), at(du, span)], half),
        (shade(p.trim, 0.6), p.trim, p.trim_light),
    )


def _blade(
    c: Canvas,
    p: TierPalette,
    at: Frame,
    start: float,
    end: float,
    width: tuple[float, float],
    power: float = 1.2,
) -> Mask:
    return c.paint(
        stroke_mask([at(start), at(end)], taper(width[0], width[1], power)),
        tones(p.metal),
    )


def _shaft(c: Canvas, at: Frame, length: float, half: float = 1.3, start: float = 0.4) -> None:
    c.paint(stroke_mask([at(start), at(length)], half), (WOOD[0], WOOD[1], WOOD[3]))


def _curved(
    c: Canvas,
    p: TierPalette,
    at: Frame,
    spine: Sequence[tuple[float, float]],
    outer: tuple[float, float],
    inner: tuple[float, float],
) -> Mask:
    """A single-edged blade: `outer` is the cutting side, `inner` the spine side."""
    points = [at(du, dv) for du, dv in spine]

    return c.paint(
        stroke_mask(points, taper(outer[0], outer[1], 1.3), taper(inner[0], inner[1], 1.3)),
        tones(p.metal),
    )


def _hafted(c: Canvas, p: TierPalette, at: Frame, length: float = 20.0, half: float = 1.2) -> Point:
    """Shaft up to `length`, capped with the collar its head is fitted into.

    Returns the collar's position. Heads are then drawn in *canvas* space around
    it, upright rather than rotated with the shaft: at 32 pixels a head turned
    45 degrees loses its silhouette and every hafted weapon starts to look like
    the same lump on a stick.
    """
    _shaft(c, at, length, half=half)
    anchor = at(length)
    c.paint(
        rect_mask(anchor[0] - 1.3, anchor[1] - 1.3, anchor[0] + 1.3, anchor[1] + 1.3),
        (shade(p.trim, 0.6), p.trim, p.trim_light),
    )

    return anchor


def _edge(c: Canvas, p: TierPalette, head: Mask, spine: Sequence[Point], width: float = 0.7) -> None:
    """Lights the cutting side of a head, which is what names the weapon."""
    c.dots(stroke_mask(spine, width) & head, p.metal[4])


def _axe_head(c: Canvas, p: TierPalette, anchor: Point, length: float, height: float) -> Mask:
    """A broad axe head: a tall straight cutting edge narrowing to the collar.

    Built by carving two discs out of a wedge rather than by listing every
    corner. At this size a hand-listed outline rounds off into a paddle; carving
    is what leaves the beard below the edge and the sweep above it.
    """
    x, y = anchor
    wedge = polygon_mask(
        [
            (x - 1.0, y - height * 0.6),
            (x - 1.0, y + height * 0.48),
            (x - length, y + height * 0.4),
            (x - length, y - height),
        ]
    )
    wedge -= disc_mask((x - length * 0.43, y + height * 0.48 + length * 0.32), length * 0.40)
    wedge -= disc_mask((x - length * 0.19, y - height - length * 0.25), length * 0.44)
    head = c.paint(wedge, tones(p.metal))
    c.dots({pixel for pixel in head if pixel[0] <= x - length + 1}, p.metal[4])

    return head


# --------------------------------------------------------------------------
# weapons
# --------------------------------------------------------------------------


def sword(c: Canvas, p: TierPalette) -> None:
    at = frame()
    _grip(c, at, 6.6)
    _blade(c, p, at, 7.4, REACH, (2.4, 0.6))
    _crossguard(c, p, at, 7.2, 4.4)
    _pommel(c, p, at)


def dagger(c: Canvas, p: TierPalette) -> None:
    at = frame((10.5, 22.0))
    _grip(c, at, 4.6, wraps=1)
    _blade(c, p, at, 5.2, 15.5, (1.9, 0.5))
    _crossguard(c, p, at, 5.1, 2.8, half=0.8)
    _pommel(c, p, at, radius=1.4)


def greatsword(c: Canvas, p: TierPalette) -> None:
    at = frame((5.0, 27.0))
    _grip(c, at, 8.8, wraps=3)
    _blade(c, p, at, 9.8, REACH + 1.5, (3.3, 1.0), power=1.6)
    _crossguard(c, p, at, 9.4, 5.6, half=1.1)
    _pommel(c, p, at, radius=2.0)
    # Ricasso collar: the detail that tells a greatsword from a wide sword at
    # this size, since the blade cannot get much longer.
    _crossguard(c, p, at, 12.2, 2.0, half=0.6)


def saber(c: Canvas, p: TierPalette) -> None:
    at = frame((8.0, 25.0))
    _grip(c, at, 6.0, wraps=2)
    _curved(c, p, at, [(6.8, 0.0), (16.0, 1.2), (25.0, 4.4)], (2.5, 0.4), (1.0, 0.3))
    # Knuckle bow, looping under the grip on the down-right side.
    c.paint(
        stroke_mask([at(6.6, -1.2), at(3.6, -4.6), at(0.8, -1.4)], 0.6),
        (shade(p.trim, 0.6), p.trim, p.trim_light),
    )
    _pommel(c, p, at, radius=1.4)


def club(c: Canvas, p: TierPalette) -> None:
    at = frame((8.0, 25.0))
    _shaft(c, at, 14.0, half=1.5)
    # A club widens into its head rather than carrying one: two overlapping
    # discs give the swollen end without a seam where a head would be fitted.
    head = disc_mask(at(19.0), 4.0, squash=0.9) | disc_mask(at(22.6), 4.6, squash=0.9)
    c.paint(head, (WOOD[1], WOOD[2], WOOD[3]))

    for du, dv in ((20.0, 2.0), (22.4, -1.8)):
        c.dots(disc_mask(at(du, dv), 1.1) & interior(head), shade(WOOD[0], 1.1))

    for dv in (-3.4, 3.4):
        c.dots(stroke_mask([at(18.0, dv * 0.4), at(24.0, dv)], 0.5) & interior(head), WOOD[3])


def mace(c: Canvas, p: TierPalette) -> None:
    at = frame((7.0, 26.0))
    anchor = _hafted(c, p, at, 19.0, half=1.2)
    x, y = anchor
    center = (x - 4.6, y - 1.6)

    # Knobs first so the ball sits proud of them.
    for dx, dy in ((-5.4, 0.0), (5.4, 0.0), (0.0, -5.4), (0.0, 5.4)):
        c.paint(rect_mask(center[0] + dx - 1.6, center[1] + dy - 1.6, center[0] + dx + 1.6, center[1] + dy + 1.6),
                tones(p.metal))

    ball = c.paint(disc_mask(center, 4.4), bright_tones(p.metal))
    c.dots(disc_mask((center[0] - 1.4, center[1] - 1.4), 1.6) & interior(ball), p.metal[4])

def hammer(c: Canvas, p: TierPalette) -> None:
    at = frame((6.5, 26.5))
    anchor = _hafted(c, p, at, 19.5, half=1.4)
    x, y = anchor
    head = c.paint(rect_mask(x - 9.5, y - 4.0, x - 0.5, y + 3.0), tones(p.metal))
    c.dots(rect_mask(x - 7.5, y - 2.0, x - 2.5, y + 1.0) & head, p.metal[4])

    # Banded faces at both ends, the way a smith hoops a head onto its haft.
    for face in (x - 9.5, x - 1.5):
        c.paint(rect_mask(face, y - 4.0, face + 1.0, y + 3.0), (shade(p.trim, 0.6), p.trim, p.trim_light))

def warpick(c: Canvas, p: TierPalette) -> None:
    at = frame((6.5, 26.5))
    anchor = _hafted(c, p, at, 19.0, half=1.2)
    x, y = anchor
    spine = [(x - 0.5, y - 1.0), (x - 5.5, y - 4.6), (x - 11.0, y - 3.6)]
    head = c.paint(stroke_mask(spine, taper(2.4, 0.4, 1.3), taper(1.6, 0.4, 1.3)), tones(p.metal))
    _edge(c, p, head, spine, width=0.5)
    # Counterweight on the far side, so the pick does not read as a horn.
    c.paint(rect_mask(x + 0.5, y - 3.4, x + 3.4, y + 0.4), tones(p.metal))

def axe(c: Canvas, p: TierPalette) -> None:
    at = frame((6.0, 27.0))
    _axe_head(c, p, _hafted(c, p, at, 20.5, half=1.3), 10.6, 5.4)

def halberd(c: Canvas, p: TierPalette) -> None:
    at = frame((5.0, 27.5))
    _shaft(c, at, 23.0, half=1.2)
    _blade(c, p, at, 23.0, REACH + 2.5, (1.7, 0.4))
    anchor = at(17.5)
    x, y = anchor
    c.paint(rect_mask(x - 1.2, y - 1.2, x + 1.2, y + 1.2), (shade(p.trim, 0.6), p.trim, p.trim_light))
    _axe_head(c, p, anchor, 7.6, 4.2)
    # Rear hook: an axe on a longer stick is still an axe without this.
    c.paint(
        stroke_mask([(x + 0.5, y - 0.5), (x + 3.4, y - 1.4), (x + 4.6, y - 3.8)], taper(1.3, 0.3), taper(1.0, 0.3)),
        tones(p.metal),
    )

def spear(c: Canvas, p: TierPalette) -> None:
    at = frame((5.5, 27.0))
    _shaft(c, at, 21.0, half=1.1)
    _crossguard(c, p, at, 20.6, 1.5, half=0.7)
    c.paint(
        polygon_mask([at(20.8, 0.0), at(23.2, 1.9), at(REACH + 1.5, 0.0), at(23.2, -1.9)]),
        tones(p.metal),
    )


def trident(c: Canvas, p: TierPalette) -> None:
    at = frame((5.5, 27.0))
    _shaft(c, at, 19.5, half=1.1)
    _crossguard(c, p, at, 20.2, 3.4, half=0.7)

    for dv in (-3.0, 0.0, 3.0):
        length = REACH + 1.5 if dv == 0 else REACH - 1.5
        c.paint(stroke_mask([at(20.4, dv), at(length, dv)], taper(1.1, 0.35)), tones(p.metal))


def glaive(c: Canvas, p: TierPalette) -> None:
    at = frame((6.5, 26.5))
    anchor = _hafted(c, p, at, 17.5, half=1.2)
    x, y = anchor
    spine = [(x - 0.5, y + 0.5), (x - 4.0, y - 6.0), (x - 7.5, y - 12.0)]
    head = c.paint(stroke_mask(spine, taper(3.2, 0.5, 1.4), taper(1.2, 0.4)), tones(p.metal))
    _edge(c, p, head, spine, width=0.5)

def scythe(c: Canvas, p: TierPalette) -> None:
    at = frame((7.0, 26.5))
    anchor = _hafted(c, p, at, 19.5, half=1.2)
    x, y = anchor
    spine = [(x - 0.5, y - 1.0), (x - 6.0, y - 7.0), (x - 13.5, y - 8.0)]
    head = c.paint(stroke_mask(spine, taper(1.0, 0.3), taper(2.8, 0.5, 1.2)), tones(p.metal))
    _edge(c, p, head, spine, width=0.5)

def flail(c: Canvas, p: TierPalette) -> None:
    at = frame((8.0, 25.5))
    _shaft(c, at, 10.0, half=1.4)
    _pommel(c, p, at, radius=1.4)
    head = at(10.0)
    ball = (head[0] - 5.6, head[1] - 5.6)

    for step in (0.25, 0.5, 0.75):
        link = (head[0] + (ball[0] - head[0]) * step, head[1] + (ball[1] - head[1]) * step)
        c.paint(disc_mask(link, 1.2), (p.metal[1], p.metal[2], p.metal[4]))

    for angle in range(0, 360, 60):
        radians = math.radians(angle)
        c.paint(
            stroke_mask(
                [ball, (ball[0] + math.cos(radians) * 5.4, ball[1] + math.sin(radians) * 5.4)],
                taper(1.2, 0.3),
            ),
            tones(p.metal),
        )

    c.paint(disc_mask(ball, 3.8), bright_tones(p.metal))

def staff(c: Canvas, p: TierPalette) -> None:
    at = frame((6.0, 26.5))
    _shaft(c, at, 23.5, half=1.3)
    _grip(c, at, 9.0, wraps=2, half=1.5)

    # Two claws holding the stone, so the head reads as mounted rather than
    # floating above the shaft.
    for dv in (-3.0, 3.0):
        c.paint(stroke_mask([at(22.0, dv * 0.3), at(25.4, dv)], taper(1.3, 0.5)), tones(p.metal))

    # A faceted stone rather than a ball: a sphere on a stick is a mace.
    stone = c.paint(
        polygon_mask([at(30.0), at(26.0, 3.2), at(23.0), at(26.0, -3.2)]),
        gem_tones(p.accent, p.accent_light),
    )
    c.dots(stroke_mask([at(24.0), at(29.0)], 0.5) & stone, shade(p.accent, 0.7))
    c.dot(*at(27.0, 1.2), p.accent_light)


WEAPONS: dict[str, Callable[[Canvas, TierPalette], None]] = {
    'club': club,
    'dagger': dagger,
    'sword': sword,
    'axe': axe,
    'hammer': hammer,
    'spear': spear,
    'scythe': scythe,
    'mace': mace,
    'glaive': glaive,
    'greatsword': greatsword,
    'saber': saber,
    'flail': flail,
    'halberd': halberd,
    'staff': staff,
    'trident': trident,
    'warpick': warpick,
}


# --------------------------------------------------------------------------
# armour
# --------------------------------------------------------------------------

CENTER = 16.0


def _torso(
    shoulder: float = 7.4,
    waist: float = 6.0,
    flare: float = 7.4,
    top: float = 9.0,
    hem: float = 25.0,
    cap: float = 1.3,
) -> Mask:
    """The silhouette every chest piece starts from: shoulders, waist, hem."""
    points = [
        (CENTER - shoulder, top + 1.4),
        (CENTER - shoulder - cap, top + 3.6),
        (CENTER - waist, top + 7.2),
        (CENTER - flare, hem),
        (CENTER + flare, hem),
        (CENTER + waist, top + 7.2),
        (CENTER + shoulder + cap, top + 3.6),
        (CENTER + shoulder, top + 1.4),
    ]

    return polygon_mask(points) - disc_mask((CENTER, top + 0.4), 3.2, squash=0.8)


def _neck(c: Canvas, p: TierPalette, top: float = 9.0, width: float = 3.4) -> None:
    c.paint(
        stroke_mask([(CENTER - width, top + 1.6), (CENTER + width, top + 1.6)], 0.7),
        (shade(p.trim, 0.6), p.trim, p.trim_light),
    )


def _belt(c: Canvas, p: TierPalette, y: float, half: float = 7.0) -> None:
    c.paint(stroke_mask([(CENTER - half, y), (CENTER + half, y)], 1.1), (LEATHER[0], LEATHER[1], LEATHER[2]))
    c.paint(rect_mask(CENTER - 1.4, y - 1.0, CENTER + 1.4, y + 1.0), (shade(p.trim, 0.6), p.trim, p.trim_light))


def _rows(mask: Mask, step: int, offset: int = 0) -> Mask:
    return {pixel for pixel in mask if (pixel[1] + offset) % step == 0}


def padded(c: Canvas, p: TierPalette) -> None:
    body = c.paint(_torso(shoulder=7.6, flare=7.8), (p.cloth[0], p.cloth[1], p.cloth[3]))
    inner = interior(body, 2)
    # Quilting: a shaded seam every fourth row with the lit puff above it.
    c.dots(_rows(inner, 4), shade(p.cloth[0], 0.85))
    c.dots(_rows(inner, 4, offset=1), p.cloth[3])
    # Vertical seam down the middle, so the bands read as quilting squares
    # rather than as the hoops of a barrel.
    c.dots(rect_mask(CENTER - 0.5, 11.0, CENTER, 24.0) & inner, shade(p.cloth[0], 0.85))
    _neck(c, p)


def tunic(c: Canvas, p: TierPalette) -> None:
    body = c.paint(_torso(shoulder=6.8, waist=5.6, flare=7.0, hem=26.0), (p.cloth[0], p.cloth[1], p.cloth[3]))
    # V-neck, cut into the collar rather than drawn over it.
    c.dots(polygon_mask([(CENTER - 3.2, 9.5), (CENTER + 3.2, 9.5), (CENTER, 15.5)]) & body, shade(p.cloth[0], 0.8))
    c.dots(stroke_mask([(CENTER - 3.2, 10.0), (CENTER, 15.5), (CENTER + 3.2, 10.0)], 0.5) & body, p.cloth[3])
    _belt(c, p, 20.5, half=6.2)


def leather(c: Canvas, p: TierPalette) -> None:
    body = c.paint(_torso(), (LEATHER[0], LEATHER[1], LEATHER[2]))
    # One strap over the shoulder plus a buckle: two straps crossing read as a
    # star at this size, not as harness.
    c.dots(stroke_mask([(CENTER - 5.6, 11.0), (CENTER + 4.6, 24.0)], 1.1) & body, shade(LEATHER[0], 1.15))
    c.dots(stroke_mask([(CENTER - 4.6, 11.0), (CENTER + 5.6, 24.0)], 0.5) & body, LEATHER[3])
    _belt(c, p, 21.0, half=6.6)
    c.paint(disc_mask((CENTER - 4.0, 14.5), 1.4), (shade(p.trim, 0.6), p.trim, p.trim_light))


def brigandine(c: Canvas, p: TierPalette) -> None:
    body = c.paint(_torso(shoulder=7.2, flare=7.6), (p.cloth[0], p.cloth[1], p.cloth[3]))
    c.dots({pixel for pixel in interior(body) if pixel[0] % 3 == 1 and pixel[1] % 3 == 0}, p.trim)
    _neck(c, p)
    _belt(c, p, 22.0, half=6.4)


def _mail(c: Canvas, p: TierPalette, body: Mask) -> None:
    """Riveted rings: lit dots on every other row, staggered, over a dark weave.

    Sparse on purpose. A full checkerboard covers the whole chest and reads as
    fishnet — mail needs the body tone showing between the rings.
    """
    inner = interior(body)
    c.dots({pixel for pixel in inner if pixel[1] % 2 == 0 and (pixel[0] + pixel[1] // 2) % 2 == 0}, p.metal[4])
    c.dots({pixel for pixel in inner if pixel[1] % 4 == 3}, p.metal[1])


def chain(c: Canvas, p: TierPalette) -> None:
    body = c.paint(_torso(), tones(p.metal))
    _mail(c, p, body)
    _neck(c, p)
    _belt(c, p, 22.0, half=6.4)


def bechter(c: Canvas, p: TierPalette) -> None:
    body = c.paint(_torso(shoulder=7.2), tones(p.metal))
    _mail(c, p, body)

    # Plates laced into the mail: three bands across the chest.
    for y in (14, 18, 22):
        c.dots(rect_mask(CENTER - 4.5, y, CENTER + 4.5, y + 1) & interior(body), p.metal[4])
        c.dots(rect_mask(CENTER - 4.5, y + 2, CENTER + 4.5, y + 2) & interior(body), p.metal[1])


def scale(c: Canvas, p: TierPalette) -> None:
    body = c.paint(_torso(shoulder=7.2, flare=7.6), tones(p.metal))
    inner = interior(body)

    for row, y in enumerate(range(11, 25, 3)):
        for x in range(3 if row % 2 else 1, 30, 3):
            c.dots(stroke_mask([(x - 1.0, y + 1.4), (x + 0.5, y + 0.4), (x + 2.0, y + 1.4)], 0.5) & inner, p.metal[4])
            c.dots(rect_mask(x - 1, y + 2, x + 1, y + 2) & inner, p.metal[1])

    _neck(c, p)


def breastplate(c: Canvas, p: TierPalette) -> None:
    body = c.paint(_torso(shoulder=7.6, waist=5.6, cap=1.6), tones(p.metal))
    c.dots(rect_mask(CENTER - 0.5, 11.0, CENTER, 24.0) & interior(body), p.metal[4])
    c.dots(stroke_mask([(CENTER - 6.5, 13.0), (CENTER - 3.0, 16.5)], 0.7) & interior(body), p.metal[1])
    c.dots(stroke_mask([(CENTER + 6.5, 13.0), (CENTER + 3.0, 16.5)], 0.7) & interior(body), p.metal[1])
    _neck(c, p)
    _belt(c, p, 22.5, half=6.6)


def cuirass(c: Canvas, p: TierPalette) -> None:
    body = c.paint(_torso(shoulder=8.0, waist=5.2, flare=6.8, cap=1.8), tones(p.metal))
    inner = interior(body)
    # Muscled front: two arcs for the chest, a seam down the middle.
    c.dots(stroke_mask([(CENTER - 6.0, 15.5), (CENTER - 3.0, 17.5), (CENTER - 0.5, 15.5)], 0.7) & inner, p.metal[1])
    c.dots(stroke_mask([(CENTER + 0.5, 15.5), (CENTER + 3.0, 17.5), (CENTER + 6.0, 15.5)], 0.7) & inner, p.metal[1])
    c.dots(rect_mask(CENTER - 0.5, 18.0, CENTER, 24.0) & inner, p.metal[4])
    _neck(c, p, width=3.8)


def plate(c: Canvas, p: TierPalette) -> None:
    body = c.paint(_torso(shoulder=7.8, waist=6.2, flare=7.8, cap=2.0), tones(p.metal))

    # Pauldrons: the one silhouette change that reads instantly as heavy plate.
    for side in (-1, 1):
        c.paint(disc_mask((CENTER + side * 8.2, 12.0), 3.2, squash=0.9), bright_tones(p.metal))

    c.dots(rect_mask(CENTER - 0.5, 12.0, CENTER, 24.0) & interior(body), p.metal[4])

    for y in (13, 17, 21):
        for side in (-1, 1):
            c.dot(CENTER + side * 4.5, y, p.trim)

    _neck(c, p, width=4.0)


def robe(c: Canvas, p: TierPalette) -> None:
    body = c.paint(
        _torso(shoulder=6.2, waist=5.4, flare=8.2, hem=27.0, cap=1.0),
        (p.cloth[0], p.cloth[1], p.cloth[3]),
    )
    inner = interior(body)
    c.dots(rect_mask(CENTER - 1.5, 11.0, CENTER + 1.5, 27.0) & inner, p.trim)
    c.dots(rect_mask(CENTER - 0.5, 11.0, CENTER, 27.0) & inner, p.trim_light)

    for y in (14, 18, 22):
        c.dot(CENTER - 0.5, y, p.accent)

    c.dots(_rows(inner, 9, offset=2), shade(p.cloth[0], 0.9))


def cloak(c: Canvas, p: TierPalette) -> None:
    # Draped, not worn: narrow at the collar, falling wide, and hemmed with a
    # scalloped edge. A straight hem on a straight-sided shape is a sack.
    drape = polygon_mask(
        [
            (CENTER - 3.4, 8.5),
            (CENTER - 6.4, 14.0),
            (CENTER - 9.4, 26.5),
            (CENTER + 9.4, 26.5),
            (CENTER + 6.4, 14.0),
            (CENTER + 3.4, 8.5),
        ]
    )

    for x in (CENTER - 6.5, CENTER - 2.2, CENTER + 2.2, CENTER + 6.5):
        drape -= disc_mask((x, 27.4), 2.0)

    body = c.paint(drape, (p.cloth[0], p.cloth[1], p.cloth[3]))
    inner = interior(body)

    # Folds fanning out of the collar — what tells cloth from plate.
    for top, bottom in ((-1.6, -5.6), (0.6, 1.4), (2.4, 6.4)):
        c.dots(
            stroke_mask([(CENTER + top, 11.0), (CENTER + bottom, 26.0)], 0.6) & inner,
            shade(p.cloth[0], 0.85),
        )
        c.dots(
            stroke_mask([(CENTER + top + 1.0, 11.5), (CENTER + bottom + 1.2, 26.0)], 0.5) & inner,
            p.cloth[3],
        )

    c.paint(
        stroke_mask([(CENTER - 4.2, 10.0), (CENTER + 4.2, 10.0)], 1.1),
        (shade(p.trim, 0.6), p.trim, p.trim_light),
    )
    c.paint(disc_mask((CENTER, 10.0), 1.7), gem_tones(p.accent, p.accent_light))


ARMORS: dict[str, Callable[[Canvas, TierPalette], None]] = {
    'padded': padded,
    'leather': leather,
    'chain': chain,
    'breastplate': breastplate,
    'robe': robe,
    'cuirass': cuirass,
    'cloak': cloak,
    'plate': plate,
    'scale': scale,
    'brigandine': brigandine,
    'bechter': bechter,
    'tunic': tunic,
}


# --------------------------------------------------------------------------
# talismans
# --------------------------------------------------------------------------


def _chain(c: Canvas, p: TierPalette, meet: Point = (CENTER, 13.5), top: float = 6.5) -> None:
    for side in (-1, 1):
        c.paint(
            stroke_mask([(CENTER + side * 5.6, top), (meet[0], meet[1])], 0.55),
            (shade(p.trim, 0.7), p.trim, p.trim_light),
        )


def ring(c: Canvas, p: TierPalette) -> None:
    c.paint(ring_mask((CENTER, 19.5), 6.6, 2.1), bright_tones(p.metal))
    c.paint(polygon_mask([(CENTER - 2.6, 12.6), (CENTER + 2.6, 12.6), (CENTER, 15.0)]), tones(p.metal))
    c.paint(disc_mask((CENTER, 10.6), 3.0), (shade(p.trim, 0.6), p.trim, p.trim_light))
    c.paint(disc_mask((CENTER, 10.6), 1.8), gem_tones(p.accent, p.accent_light))


def charm(c: Canvas, p: TierPalette) -> None:
    c.paint(stroke_mask([(CENTER - 6.0, 7.0), (CENTER, 5.6), (CENTER + 6.0, 7.0)], 0.55), (CORD,), flat=True)
    c.paint(rect_mask(CENTER - 4.5, 8.0, CENTER + 4.5, 10.5), (shade(p.trim, 0.6), p.trim, p.trim_light))
    c.paint(
        polygon_mask([(CENTER - 4.2, 10.5), (CENTER + 4.2, 10.5), (CENTER + 1.6, 25.0), (CENTER - 1.6, 25.0)]),
        tones(p.metal),
    )
    c.dot(CENTER - 0.5, 14.0, p.accent)
    c.dot(CENTER - 0.5, 17.0, p.accent_light)


def pendant(c: Canvas, p: TierPalette) -> None:
    _chain(c, p, meet=(CENTER, 12.5))
    c.paint(ring_mask((CENTER, 13.5), 2.2, 1.0), (shade(p.trim, 0.6), p.trim, p.trim_light))
    # A teardrop: a disc with a cone above it, so it hangs from the loop.
    drop = disc_mask((CENTER, 21.0), 4.6) | polygon_mask(
        [(CENTER - 2.0, 21.0), (CENTER, 14.5), (CENTER + 2.0, 21.0)]
    )
    body = c.paint(drop, gem_tones(p.accent, p.accent_light))
    c.dots(disc_mask((CENTER - 1.6, 19.4), 1.4) & interior(body), p.accent_light)


def amulet(c: Canvas, p: TierPalette) -> None:
    _chain(c, p, meet=(CENTER, 13.0))
    c.paint(rect_mask(CENTER - 5.0, 13.0, CENTER + 5.0, 23.0), tones(p.metal))
    c.paint(rect_mask(CENTER - 3.4, 15.0, CENTER + 3.4, 21.0), (shade(p.trim, 0.6), p.trim, p.trim_light))
    c.paint(disc_mask((CENTER, 18.0), 2.2), gem_tones(p.accent, p.accent_light))


def medallion(c: Canvas, p: TierPalette) -> None:
    _chain(c, p, meet=(CENTER, 13.0))
    c.paint(disc_mask((CENTER, 19.5), 7.0), (shade(p.trim, 0.55), p.trim, p.trim_light))
    c.paint(disc_mask((CENTER, 19.5), 4.6), tones(p.metal))
    c.paint(disc_mask((CENTER, 19.5), 2.0), gem_tones(p.accent, p.accent_light))


def rune(c: Canvas, p: TierPalette) -> None:
    stone = c.paint(
        polygon_mask([(11.0, 8.0), (21.0, 8.0), (22.0, 24.0), (16.0, 26.5), (10.0, 24.0)]),
        (p.metal[0], p.metal[2], p.metal[4]),
    )
    glyph = stroke_mask([(13.5, 12.0), (18.5, 12.0)], 0.6)
    glyph |= stroke_mask([(18.5, 12.0), (18.5, 21.0)], 0.6)
    glyph |= stroke_mask([(18.5, 16.5), (13.5, 16.5)], 0.6)
    glyph |= stroke_mask([(13.5, 16.5), (13.5, 21.0)], 0.6)
    c.dots(glyph & stone, p.accent)


def sigil(c: Canvas, p: TierPalette) -> None:
    hexagon = [
        (CENTER, 8.0),
        (CENTER + 6.6, 12.0),
        (CENTER + 6.6, 20.0),
        (CENTER, 24.5),
        (CENTER - 6.6, 20.0),
        (CENTER - 6.6, 12.0),
    ]
    c.paint(polygon_mask(hexagon), (shade(p.trim, 0.55), p.trim, p.trim_light))
    # A wax field inside the rim: a bare gold hexagon has nowhere for the glyph
    # to read against, and every tier's trim is gold.
    field = c.paint(
        polygon_mask([(CENTER + (x - CENTER) * 0.66, 16.2 + (y - 16.2) * 0.66) for x, y in hexagon]),
        (shade(p.accent, 0.35), shade(p.accent, 0.6), p.accent),
    )
    glyph = stroke_mask([(CENTER - 3.0, 19.0), (CENTER, 12.6), (CENTER + 3.0, 19.0)], 0.55)
    glyph |= stroke_mask([(CENTER - 2.0, 16.8), (CENTER + 2.0, 16.8)], 0.55)
    c.dots(glyph & field, p.accent_light)

def gem(c: Canvas, p: TierPalette) -> None:
    body = c.paint(
        polygon_mask([(CENTER, 7.0), (CENTER + 8.0, 15.0), (CENTER, 26.0), (CENTER - 8.0, 15.0)]),
        gem_tones(p.accent, p.accent_light),
    )
    c.dots(stroke_mask([(CENTER - 8.0, 15.0), (CENTER + 8.0, 15.0)], 0.5) & body, shade(p.accent, 0.7))
    c.dots(stroke_mask([(CENTER - 4.0, 11.0), (CENTER, 15.0), (CENTER + 4.0, 11.0)], 0.5) & body, p.accent_light)
    c.dot(CENTER - 2.5, 12.0, p.accent_light)


def orb(c: Canvas, p: TierPalette) -> None:
    # Cradle first, sitting low enough that its claws show under the sphere.
    for side in (-1, 1):
        c.paint(
            stroke_mask([(CENTER + side * 6.8, 13.5), (CENTER + side * 7.4, 22.0), (CENTER, 26.5)], 1.0),
            tones(p.metal),
        )

    c.paint(stroke_mask([(CENTER - 4.0, 25.0), (CENTER + 4.0, 25.0)], 1.0), tones(p.metal))
    body = c.paint(disc_mask((CENTER, 16.5), 6.6), gem_tones(p.accent, p.accent_light))
    c.dots(disc_mask((CENTER - 2.2, 14.0), 1.8) & interior(body), p.accent_light)
    c.dots(disc_mask((CENTER + 2.6, 19.4), 2.4) & interior(body), shade(p.accent, 0.7))


def eye(c: Canvas, p: TierPalette) -> None:
    lens = c.paint(
        polygon_mask([(4.0, 16.5), (CENTER, 9.0), (28.0, 16.5), (CENTER, 24.0)]),
        (shade(p.trim, 0.6), p.trim, p.trim_light),
    )
    c.dots(disc_mask((CENTER, 16.5), 5.2) & lens, gem_tones(p.accent, p.accent_light)[1])
    c.dots(ring_mask((CENTER, 16.5), 5.2, 1.0) & lens, shade(p.accent, 0.6))
    c.paint(disc_mask((CENTER, 16.5), 2.2), (shade(p.metal[0], 0.8),), flat=True)
    c.dot(CENTER - 1.5, 15.0, p.accent_light)


def fang(c: Canvas, p: TierPalette) -> None:
    # Bone is bone in every land, so this one shape sits outside the tier ramp;
    # the tier shows up in the binding and the spark at the root instead.
    bone = (rgb('#8a7f6a'), rgb('#c9bfa4'), rgb('#efe8d2'))
    c.paint(stroke_mask([(19.5, 7.0), (17.5, 17.0), (12.0, 25.5)], taper(3.6, 0.5, 1.4)), bone)
    c.paint(stroke_mask([(15.2, 7.6), (22.6, 9.8)], 0.8), (CORD,), flat=True)
    c.paint(stroke_mask([(16.2, 10.6), (21.8, 12.6)], 0.8), (CORD,), flat=True)
    c.paint(disc_mask((19.0, 9.0), 1.3), gem_tones(p.accent, p.accent_light))

def heart(c: Canvas, p: TierPalette) -> None:
    lobes = disc_mask((CENTER - 3.4, 14.0), 4.6) | disc_mask((CENTER + 3.4, 14.0), 4.6)
    body = c.paint(
        lobes | polygon_mask([(CENTER - 7.8, 15.6), (CENTER + 7.8, 15.6), (CENTER, 26.0)]),
        gem_tones(p.accent, p.accent_light),
    )
    c.dots(disc_mask((CENTER - 3.6, 12.6), 1.6) & body, p.accent_light)
    c.dots(stroke_mask([(CENTER + 4.6, 17.0), (CENTER + 1.0, 23.0)], 0.6) & body, shade(p.accent, 0.7))


TALISMANS: dict[str, Callable[[Canvas, TierPalette], None]] = {
    'ring': ring,
    'charm': charm,
    'amulet': amulet,
    'rune': rune,
    'medallion': medallion,
    'gem': gem,
    'eye': eye,
    'heart': heart,
    'pendant': pendant,
    'sigil': sigil,
    'fang': fang,
    'orb': orb,
}


SHAPES: dict[str, Callable[[Canvas, TierPalette], None]] = {**WEAPONS, **ARMORS, **TALISMANS}
