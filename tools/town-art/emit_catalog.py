"""Rewrites the `npcs` and `locations` arrays in `src/game/catalog.ts`.

The click rectangles come straight from `layout.json`, which `build.py` writes
from the same layout that drew the map. Everything that decides how a place
*plays* — the level gate, the enemy roster, the PA cost, the shop tier, the
battle backdrop — is listed here and carried across untouched, because none of
it changed when the art did.

    python3 tools/town-art/emit_catalog.py
"""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CATALOG = ROOT / 'src' / 'game' / 'catalog.ts'
LAYOUT = Path(__file__).resolve().parent / 'layout.json'

# Per land: the old constant name, and every site's gameplay wiring keyed by
# its new id. `was` is the pre-rename location id, used to migrate saved
# expedition progress in `state.ts`.
PLAY = {
    1: {
        'const': 'ITHAN',
        'new_const': 'OLSZAWA',
        'sites': {
            'badger-cave': dict(bg='004.jpg', was='ithan-hunters-cave', req=1, lo=1, hi=5, enemies=['goblin', 'rat'], pa=1),
            'damp-ravine': dict(bg='009.jpg', was='ithan-yss', req=3, lo=6, hi=10, enemies=['wolf', 'spider'], pa=1),
            'arena': dict(bg='001.jpg', pa=1),
            'tough': dict(bg='025.jpg', pa=2),
            'inn': dict(bg='025.jpg', pa=1),
            'shop': dict(bg='001.jpg', shop='blacksmith_1'),
            'world': dict(bg='', pa=1),
        },
    },
    2: {
        'const': 'TORNEG',
        'new_const': 'RUDZIN',
        'sites': {
            'quarry': dict(bg='005.jpg', was='torneg-mountain-cave', req=9, lo=11, hi=15, enemies=['dark_wolf', 'pelzacz'], pa=2),
            'catacombs': dict(bg='005.jpg', was='torneg-spider-nest', req=12, lo=16, hi=20, enemies=['giant_spider', 'spider_queen'], pa=2),
            'arena': dict(bg='030.jpg', pa=3, req=9),
            'tough': dict(bg='009.jpg', pa=2),
            'inn': dict(bg='025.jpg', pa=1),
            'shop': dict(bg='001.jpg', shop='blacksmith_2'),
            'world': dict(bg='', pa=1),
        },
    },
    3: {
        'const': 'KARKA_HAN',
        'new_const': 'WIELGRAD',
        'sites': {
            'flooded-docks': dict(bg='009.jpg', was='karka-virgin-forest', req=20, lo=21, hi=25, enemies=['zubr', 'grzechotnik'], pa=2),
            'canals': dict(bg='007.jpg', was='karka-zulu-settlement', req=24, lo=26, hi=30, enemies=['giant_spider', 'spider_queen'], pa=2),
            'arena': dict(bg='001.jpg', pa=3, req=20),
            'tough': dict(bg='035.jpg', pa=2),
            'inn': dict(bg='025.jpg', pa=1),
            'shop': dict(bg='001.jpg', shop='blacksmith_2'),
            'world': dict(bg='', pa=1),
        },
    },
    4: {
        'const': 'WERBIN',
        'new_const': 'CZARNOBOR',
        'sites': {
            'tar-forest': dict(bg='010.jpg', was='werbin-heaths', req=30, lo=31, hi=35, enemies=['zubr', 'grzechotnik'], pa=2),
            'barrows': dict(bg='009.jpg', was='werbin-goblin-forest', req=35, lo=36, hi=40, enemies=['giant_spider', 'spider_queen'], pa=2),
            'wolf-grove': dict(bg='008.jpg', was='werbin-tristam', req=35, lo=36, hi=40, enemies=['giant_spider', 'spider_queen'], pa=2),
            'arena': dict(bg='001.jpg', pa=3, req=35),
            'tough': dict(bg='011.jpg', pa=2),
            'inn': dict(bg='025.jpg', pa=1),
            'shop': dict(bg='001.jpg', shop='blacksmith_3'),
            'world': dict(bg='', pa=1),
        },
    },
    5: {
        'const': 'EAQUIA',
        'new_const': 'SOLWAR',
        'sites': {
            'salt-pans': dict(bg='012.jpg', was='eaquia-wrecks', req=40, lo=41, hi=45, enemies=['thief', 'madHunter'], pa=3),
            'castaway-bay': dict(bg='019.jpg', was='eaquia-undercity', req=45, lo=46, hi=50, enemies=['blackKnight', 'witch'], pa=3),
            'arena': dict(bg='030.jpg', pa=3, req=40),
            'tough': dict(bg='013.jpg', pa=3),
            'inn': dict(bg='025.jpg', pa=1),
            'shop': dict(bg='001.jpg', shop='blacksmith_4'),
            'world': dict(bg='', pa=1),
        },
    },
    6: {
        'const': 'NITHAL',
        'new_const': 'NIHRAST',
        'sites': {
            'basalt-stairs': dict(bg='005.jpg', was='nithal-cliff', req=50, lo=51, hi=55, enemies=['abyssSpawn', 'darkMonk'], pa=3),
            'ash-crypt': dict(bg='021.jpg', was='nithal-temple', req=55, lo=56, hi=60, enemies=['inquisitor', 'evilMage'], pa=3),
            'arena': dict(bg='001.jpg', pa=3, req=50),
            'tough': dict(bg='022.jpg', pa=3),
            'inn': dict(bg='025.jpg', pa=1),
            'shop': dict(bg='001.jpg', shop='blacksmith_4'),
            'temple': dict(bg='', pa=1),
        },
    },
    7: {
        'const': 'TUZMER',
        'new_const': 'ZHURMAT',
        'sites': {
            'dunes': dict(bg='008.jpg', was='tuzmer-port', req=60, lo=61, hi=65, enemies=['wraith', 'minotaur'], pa=3),
            'necropolis': dict(bg='018.jpg', was='tuzmer-catacombs', req=65, lo=66, hi=70, enemies=['cerberus', 'apostate'], pa=3),
            'arena': dict(bg='030.jpg', pa=3, req=60),
            'tough': dict(bg='011.jpg', pa=3),
            'inn': dict(bg='025.jpg', pa=1),
            'shop': dict(bg='001.jpg', shop='blacksmith_5'),
            'world': dict(bg='', pa=1),
        },
    },
    8: {
        'const': 'THUZAL',
        'new_const': 'GRZMIEL',
        'sites': {
            'thunder-ridge': dict(bg='010.jpg', was='thuzal-highlands', req=70, lo=71, hi=75, enemies=['possessedPaladin', 'boneLord'], pa=3),
            'mine-shafts': dict(bg='023.jpg', was='thuzal-fortress', req=75, lo=76, hi=80, enemies=['blackDemon', 'avenger'], pa=3),
            'arena': dict(bg='001.jpg', pa=3, req=70),
            'tough': dict(bg='035.jpg', pa=3),
            'inn': dict(bg='025.jpg', pa=1),
            'shop': dict(bg='001.jpg', shop='blacksmith_5'),
            'world': dict(bg='', pa=1),
        },
    },
    9: {
        'const': 'HILAIA',
        'new_const': 'ISMERIA',
        'sites': {
            'ice-rifts': dict(bg='014.jpg', was='hilaia-burnt-fields', req=80, lo=81, hi=85, enemies=['blackDemon', 'boneLord'], pa=3),
            'frozen-haven': dict(bg='027.jpg', was='hilaia-sanctuary', req=85, lo=86, hi=90, enemies=['founder', 'cerberus'], pa=3),
            'arena': dict(bg='030.jpg', pa=3, req=80),
            'tough': dict(bg='028.jpg', pa=3),
            'inn': dict(bg='025.jpg', pa=1),
            'shop': dict(bg='001.jpg', shop='blacksmith_6'),
            'world': dict(bg='', pa=1),
        },
    },
    10: {
        'const': 'ELIZJA',
        'new_const': 'ZORYAN',
        'sites': {
            'marble-gate': dict(bg='031.jpg', was='elizja-gate', req=90, lo=91, hi=95, enemies=['founder', 'veryEvilPatrick'], pa=3),
            'dawn-throne': dict(bg='033.jpg', was='elizja-throne', req=95, lo=96, hi=100, enemies=['blackDemon', 'boneLord'], pa=3),
            'arena': dict(bg='001.jpg', pa=3, req=90),
            'tough': dict(bg='034.jpg', pa=3),
            'inn': dict(bg='025.jpg', pa=1),
            'shop': dict(bg='001.jpg', shop='blacksmith_6'),
            'world': dict(bg='', pa=1),
        },
    },
}

INDENT = ' ' * 8
WRAP = 112


def number(value: float) -> str:
    return str(int(value)) if float(value).is_integer() else str(value)


def call(name: str, args: list[str]) -> str:
    single = f'{INDENT}{name}({", ".join(args)}),'
    if len(single) <= WRAP:
        return single
    body = ''.join(f'{INDENT}    {arg},\n' for arg in args)
    return f'{INDENT}{name}(\n{body}{INDENT}),'


def location_line(slug: str, entry: dict, play: dict) -> str:
    full_id = f"{slug}-{entry['id']}"
    common = [
        f"'{full_id}'",
        f"'{entry['name']}'",
        f"'{play['bg']}'",
        number(entry['x']),
        number(entry['y']),
        number(entry['w']),
        number(entry['h']),
    ]

    if entry['role'] == 'battle':
        enemies = ', '.join(f"'{name}'" for name in play['enemies'])
        return call(
            'battle',
            common + [str(play['req']), str(play['lo']), str(play['hi']), f'[{enemies}]', str(play['pa'])],
        )

    if entry['role'] == 'shop':
        return call('shopLocation', common + [f"'{play['shop']}'"])

    args = common[:2] + [f"'{entry['role']}'"] + common[2:] + [str(play.get('pa', 1))]
    if 'req' in play:
        args.append(f"{{ levelReq: {play['req']} }}")
    return call('location', args)


def blocks(town: dict) -> str:
    play = PLAY[town['id']]
    lines = ['    npcs: [']
    for person in town['npcs']:
        lines.append(
            call(
                'npc',
                [
                    f"'{town['slug']}-{person['id']}'",
                    f"'{person['name']}'",
                    f"'{person['file']}'",
                    number(person['x']),
                    number(person['y']),
                    str(person['width']),
                    str(person['height']),
                ],
            )
        )
    lines.append('    ],')
    lines.append('    locations: [')
    for entry in town['locations']:
        lines.append(location_line(town['slug'], entry, play['sites'][entry['id']]))
    lines.append('    ],')
    return '\n'.join(lines) + '\n'


def main() -> None:
    towns = {town['id']: town for town in json.loads(LAYOUT.read_text(encoding='utf-8'))}
    source = CATALOG.read_text(encoding='utf-8')

    for map_id, play in PLAY.items():
        pattern = re.compile(
            rf"(const {play['const']}: GameMapData = buildMap\({map_id}, \{{\n).*?(    enemies: \{{)",
            re.DOTALL,
        )
        replacement = pattern.sub(lambda m: m.group(1) + blocks(towns[map_id]) + m.group(2), source, count=1)
        if replacement == source:
            raise SystemExit(f'could not locate map {map_id} ({play["const"]}) in catalog.ts')
        source = replacement

    for play in PLAY.values():
        source = re.sub(rf'\b{play["const"]}\b', play['new_const'], source)

    CATALOG.write_text(source, encoding='utf-8')
    print(f'Rewrote {CATALOG.relative_to(ROOT)}')

    renames = {
        f"{map_id}_{site['was']}": f"{map_id}_{towns[map_id]['slug']}-{new_id}"
        for map_id, play in PLAY.items()
        for new_id, site in play['sites'].items()
        if 'was' in site
    }
    print(json.dumps(renames, indent=4, ensure_ascii=False))


if __name__ == '__main__':
    main()
