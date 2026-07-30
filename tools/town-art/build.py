"""Renders every town and writes the assets the game loads.

    python3 tools/town-art/build.py            # write PNGs + layout.json
    python3 tools/town-art/build.py --check    # validate layouts only
    python3 tools/town-art/build.py --town 3   # one land, for iterating

Output:
    public/game-assets/maps/<slug>.png     the 800x512 town map
    public/game-assets/npcs/<slug>-<id>.png  one sprite per townsperson
    tools/town-art/layout.json             click areas + NPC anchors

`layout.json` is the hand-off to `src/game/catalog.ts`. The numbers there are
generated, never typed: a click area is wrong only if the map itself is.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from PIL import Image

from compose import SPRITE_SIZES, render, render_npcs
from pixelart import MAP_H, MAP_W, TILE
from towns import TOWNS

ROOT = Path(__file__).resolve().parents[2]
MAPS_DIR = ROOT / 'public' / 'game-assets' / 'maps'
NPCS_DIR = ROOT / 'public' / 'game-assets' / 'npcs'
LAYOUT_FILE = Path(__file__).resolve().parent / 'layout.json'

TILES_X, TILES_Y = MAP_W // TILE, MAP_H // TILE


def check(town: dict) -> list[str]:
    """Catches the layout mistakes that would show up as a misplaced hitbox."""
    problems: list[str] = []
    seen: dict[str, tuple] = {}

    for entry in town['sites']:
        x, y, w, h = entry['tile']
        if x < 0 or y < 0 or x + w > TILES_X or y + h > TILES_Y:
            problems.append(f"{town['slug']}/{entry['id']}: {entry['tile']} runs off the map")
        for other_id, (ox, oy, ow, oh) in seen.items():
            if x < ox + ow and ox < x + w and y < oy + oh and oy < y + h:
                problems.append(f"{town['slug']}: {entry['id']} overlaps {other_id}")
        seen[entry['id']] = (x, y, w, h)

    roles = [entry['role'] for entry in town['sites']]
    for required in ('shop', 'rest', 'arena', 'toughenemy', 'worldmap'):
        if required not in roles:
            problems.append(f"{town['slug']}: no {required} site")
    if roles.count('battle') < 2:
        problems.append(f"{town['slug']}: fewer than two expeditions")

    for entry in town.get('npcs', []):
        width, height = SPRITE_SIZES[entry['sprite']]
        left, top = entry['x'] * TILE - width / 2, entry['y'] * TILE - height
        if left < 0 or top < 0 or left + width > MAP_W or top + height > MAP_H:
            problems.append(f"{town['slug']}/{entry['id']}: npc at ({entry['x']}, {entry['y']}) is off the map")
        for site_entry in town['sites']:
            sx, sy, sw, sh = site_entry['tile']
            if sx <= entry['x'] <= sx + sw and sy <= entry['y'] <= sy + sh:
                problems.append(f"{town['slug']}/{entry['id']}: npc stands inside {site_entry['id']}")

    return problems


def quantize(image: Image.Image, colors: int = 64) -> Image.Image:
    """A hard 64-colour palette, matching the flat item icons.

    Anything wider lets the dithered ramps resolve back into smooth gradients,
    which is what made the first pass look painted."""
    return image.convert('RGB').quantize(colors=colors, method=Image.MEDIANCUT, dither=Image.NONE)


def build(only: int | None = None, validate_only: bool = False) -> int:
    problems = [problem for town in TOWNS for problem in check(town)]
    if problems:
        print('Layout problems:')
        for problem in problems:
            print(f'  - {problem}')
        return 1
    print(f'{len(TOWNS)} layouts valid.')
    if validate_only:
        return 0

    MAPS_DIR.mkdir(parents=True, exist_ok=True)
    NPCS_DIR.mkdir(parents=True, exist_ok=True)
    layouts = []

    for town in TOWNS:
        if only and town['id'] != only:
            continue
        image, exported = render(town)
        target = MAPS_DIR / f"{town['slug']}.png"
        quantize(image).save(target, optimize=True)

        for filename, sprite in render_npcs(town).items():
            sprite.save(NPCS_DIR / filename, optimize=True)

        exported['id'] = town['id']
        layouts.append(exported)
        size = target.stat().st_size // 1024
        print(f"  {town['id']:>2}. {town['name']:<10} {target.relative_to(ROOT)}  {size} KB")

    if only is None:
        LAYOUT_FILE.write_text(json.dumps(layouts, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        print(f'Wrote {LAYOUT_FILE.relative_to(ROOT)}')
    return 0


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--town', type=int, default=None, help='render a single land by id')
    parser.add_argument('--check', action='store_true', help='validate layouts without rendering')
    options = parser.parse_args()
    sys.exit(build(options.town, options.check))
