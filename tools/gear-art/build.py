"""Draws every gear icon the loot tables can hand out.

    python3 tools/gear-art/build.py              # write all icons
    python3 tools/gear-art/build.py --sheet      # also write a contact sheet
    python3 tools/gear-art/build.py --tier 3     # one tier, for iterating
    python3 tools/gear-art/build.py --check      # verify the table, draw nothing

Output:
    public/game-assets/items/gear/t<NN>_<shape>.png   32x32 RGBA

`TIER_SHAPES` below is the same table as `GEAR_TIERS` in `src/game/gear.ts`, and
`--check` fails if a tier asks for a shape nobody can draw. Add a shape to the
game and the build tells you what art is missing rather than the game shipping a
broken image link.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
# `pixelart` is the art pipeline's shared primitive layer. It lives with the
# town builder because that came first; importing it beats keeping a second copy
# of the colour ramps and the outline pass in sync by hand.
sys.path.insert(0, str(ROOT / 'tools' / 'town-art'))
sys.path.insert(0, str(Path(__file__).resolve().parent))

from canvas import Canvas  # noqa: E402
from palettes import TIERS, tier  # noqa: E402
from shapes import ARMORS, SHAPES, TALISMANS, WEAPONS  # noqa: E402

OUT_DIR = ROOT / 'public' / 'game-assets' / 'items' / 'gear'

#: Which shapes each tier is cut from — mirror of `GEAR_TIERS` in `gear.ts`.
#: Five weapons, four armours and three talismans per tier, rotating so a
#: backpack at level 90 looks nothing like one at level 10.
TIER_SHAPES: dict[int, dict[str, list[str]]] = {
    1: {
        'weapon': ['club', 'dagger', 'sword', 'staff', 'mace'],
        'armor': ['padded', 'tunic', 'leather', 'cloak'],
        'talisman': ['ring', 'charm', 'pendant'],
    },
    2: {
        'weapon': ['sword', 'axe', 'spear', 'club', 'saber'],
        'armor': ['leather', 'chain', 'brigandine', 'padded'],
        'talisman': ['ring', 'amulet', 'sigil'],
    },
    3: {
        'weapon': ['sword', 'axe', 'hammer', 'halberd', 'saber'],
        'armor': ['chain', 'breastplate', 'brigandine', 'scale'],
        'talisman': ['amulet', 'rune', 'charm'],
    },
    4: {
        'weapon': ['spear', 'mace', 'sword', 'flail', 'warpick'],
        'armor': ['breastplate', 'robe', 'scale', 'bechter'],
        'talisman': ['medallion', 'rune', 'sigil'],
    },
    5: {
        'weapon': ['sword', 'scythe', 'dagger', 'trident', 'glaive'],
        'armor': ['cuirass', 'robe', 'chain', 'cloak'],
        'talisman': ['gem', 'amulet', 'orb'],
    },
    6: {
        'weapon': ['axe', 'glaive', 'hammer', 'flail', 'greatsword'],
        'armor': ['cuirass', 'cloak', 'bechter', 'plate'],
        'talisman': ['gem', 'eye', 'fang'],
    },
    7: {
        'weapon': ['greatsword', 'scythe', 'spear', 'trident', 'halberd'],
        'armor': ['plate', 'chain', 'cuirass', 'scale'],
        'talisman': ['heart', 'medallion', 'fang'],
    },
    8: {
        'weapon': ['greatsword', 'axe', 'mace', 'warpick', 'flail'],
        'armor': ['plate', 'cuirass', 'brigandine', 'bechter'],
        'talisman': ['eye', 'heart', 'orb'],
    },
    9: {
        'weapon': ['scythe', 'glaive', 'dagger', 'saber', 'staff'],
        'armor': ['robe', 'plate', 'cloak', 'tunic'],
        'talisman': ['rune', 'gem', 'sigil'],
    },
    10: {
        'weapon': ['greatsword', 'hammer', 'spear', 'trident', 'sword'],
        'armor': ['plate', 'cuirass', 'robe', 'scale'],
        'talisman': ['heart', 'amulet', 'orb'],
    },
}


def problems() -> list[str]:
    """Catches the mistakes that would ship as a missing icon."""
    found: list[str] = []

    if len(TIER_SHAPES) != len(TIERS):
        found.append(f'{len(TIER_SHAPES)} tiers in the table, {len(TIERS)} palettes')

    for index, groups in sorted(TIER_SHAPES.items()):
        for kind, expected, catalogue in (
            ('weapon', 5, WEAPONS),
            ('armor', 4, ARMORS),
            ('talisman', 3, TALISMANS),
        ):
            shapes = groups.get(kind, [])

            if len(shapes) != expected:
                found.append(f't{index:02d}: {len(shapes)} {kind} shapes, expected {expected}')
            if len(set(shapes)) != len(shapes):
                found.append(f't{index:02d}: repeats a {kind} shape')
            for shape in shapes:
                if shape not in catalogue:
                    found.append(f't{index:02d}: nothing draws {kind} "{shape}"')

    for kind, catalogue in (('weapon', WEAPONS), ('armor', ARMORS), ('talisman', TALISMANS)):
        used = {shape for groups in TIER_SHAPES.values() for shape in groups.get(kind, [])}
        for shape in sorted(set(catalogue) - used):
            found.append(f'{kind} "{shape}" is drawn but no tier carries it')

    return found


def render(index: int, shape: str) -> Image.Image:
    canvas = Canvas()
    SHAPES[shape](canvas, tier(index))

    return canvas.to_image()


def icons(index: int) -> list[str]:
    groups = TIER_SHAPES[index]

    return [shape for kind in ('weapon', 'armor', 'talisman') for shape in groups[kind]]


def write(indices: list[int]) -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    written = 0

    for index in indices:
        for shape in icons(index):
            render(index, shape).save(OUT_DIR / f't{index:02d}_{shape}.png')
            written += 1

    return written


def contact_sheet(indices: list[int], scale: int = 3) -> Image.Image:
    """All twelve icons of a tier per row — the view worth eyeballing."""
    columns = max(len(icons(index)) for index in indices)
    sheet = Image.new('RGBA', (columns * 32, len(indices) * 32), (24, 22, 30, 255))

    for row, index in enumerate(indices):
        for column, shape in enumerate(icons(index)):
            sheet.alpha_composite(render(index, shape), (column * 32, row * 32))

    return sheet.resize((sheet.width * scale, sheet.height * scale), Image.NEAREST)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--tier', type=int, action='append', help='render only this tier (repeatable)')
    parser.add_argument('--check', action='store_true', help='validate the table without drawing')
    parser.add_argument('--sheet', type=Path, nargs='?', const=Path('gear-sheet.png'), help='write a contact sheet')
    args = parser.parse_args()

    found = problems()

    for problem in found:
        print(f'error: {problem}', file=sys.stderr)

    if found:
        return 1

    if args.check:
        print(f'{len(TIER_SHAPES)} tiers, {sum(len(icons(i)) for i in TIER_SHAPES)} icons, table is consistent')

        return 0

    indices = sorted(set(args.tier)) if args.tier else sorted(TIER_SHAPES)

    if args.sheet:
        contact_sheet(indices).save(args.sheet)
        print(f'wrote {args.sheet}')

    print(f'wrote {write(indices)} icons to {OUT_DIR.relative_to(ROOT)}')

    return 0


if __name__ == '__main__':
    raise SystemExit(main())
