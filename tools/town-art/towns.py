"""The ten lands of Margatron Duel, described in tiles.

Each entry drives three things at once: the rendered map, the click rectangles
written into `src/game/catalog.ts`, and the NPC sprites overlaid on top. The
canvas is 25 x 16 tiles; site rectangles are `(x, y, w, h)` from the top-left
corner, scenery is anchored on its ground line.

Level bands and the gameplay wiring live in the catalog — nothing here knows
what a monster is. This file only decides what a place looks like.
"""

from compose import area, ground, person, prop, road, site
from pixelart import (
    ASH_DARK,
    COBBLE_GREY,
    COBBLE_WARM,
    DIRT_PATH,
    GRASS_DRY,
    GRASS_FOREST,
    GRASS_MEADOW,
    MARBLE_PALE,
    ROCK_GREY,
    SAND_PALE,
    SNOW_PALE,
    WATER_DEEP,
    WATER_TROPIC,
    ramp,
    rgb,
)
from sprites import LEAF_AUTUMN, LEAF_DARK, LEAF_FROST, LEAF_PALE, LEAF_SUMMER


def house(roof, wall, roof_color, wall_color, **extra) -> dict:
    return dict(roof=roof, wall=wall, roof_color=rgb(roof_color), wall_color=rgb(wall_color), **extra)


def look(**kwargs) -> dict:
    """Shorthand for a character's appearance; every field has a default."""
    for key in ('skin', 'hair', 'tunic', 'trim', 'pants', 'boots', 'cloak', 'hat_color', 'held_color', 'gem', 'beard_color', 'sleeve'):
        if isinstance(kwargs.get(key), str):
            kwargs[key] = rgb(kwargs[key])
    return kwargs


# --------------------------------------------------------------------------
# 1 — Olszawa: the alder hamlet where every character starts
# --------------------------------------------------------------------------

OLSZAWA = dict(
    id=1,
    slug='olszawa',
    name='Olszawa',
    seed='olszawa-01',
    ground=ground('grass', GRASS_FOREST),
    patches=[
        area('grass', GRASS_MEADOW, points=[(0, 5), (9, 3), (14, 7), (10, 13), (2, 12)], rough=0.38, scale=10),
        area('dirt', DIRT_PATH, points=[(16, 12), (24, 11), (25, 16), (15, 16)], rough=0.42, scale=12),
    ],
    roads=[
        road('dirt', DIRT_PATH, [(12.5, 16.4), (12.6, 13.4), (12.2, 10.6), (12.6, 7.2), (12.6, 3.6)], width=1.52),
        road('dirt', DIRT_PATH, [(4, 12.4), (7.6, 10.6), (12.3, 9.4)], width=1.19),
        road('dirt', DIRT_PATH, [(12.6, 7.4), (17.2, 6.4), (21.4, 5.2)], width=1.12),
        road('dirt', DIRT_PATH, [(13.4, 10.8), (18, 11.4), (21.6, 12)], width=1.12),
        road('dirt', DIRT_PATH, [(12.4, 6.6), (8, 6), (4.4, 6.2)], width=1.06),
    ],
    sites=[
        site('badger-cave', 'battle', 'Jaskinia Borsuka', (11, 1, 3, 3), dict(kind='cave', color=rgb('#5f5a52'))),
        site('damp-ravine', 'battle', 'Wilgotny Jar', (20, 2, 4, 3), dict(kind='cave', color=rgb('#5a6252'))),
        site('arena', 'arena', 'Arena', (20, 10, 4, 4), dict(kind='arena')),
        site('tough', 'toughenemy', 'Mocny przeciwnik', (2, 4, 3, 3), dict(kind='lair')),
        site(
            'inn',
            'rest',
            'Zajazd pod Krzywą Osiką',
            (10, 9, 4, 3),
            dict(kind='building', style=house('thatch', 'log', '#b8944e', '#8a6a42', sign='mug', chimney=True, sign_side=-1)),
        ),
        site(
            'shop',
            'shop',
            'Kuźnia',
            (2, 10, 4, 3),
            dict(kind='building', style=house('shingle', 'plank', '#7a4a30', '#96703f', sign='anvil', chimney=True)),
        ),
        site('world', 'worldmap', 'Mapa Świata', (11, 14, 3, 2), dict(kind='portal', glow=rgb('#8fd0a8'))),
    ],
    props=[
        prop('house', 7.5, 4.2, tiles_w=3, tiles_h=3, style=house('thatch', 'log', '#a8894c', '#7f6038', chimney=True)),
        prop('house', 17.5, 9.6, tiles_w=3, tiles_h=3, style=house('thatch', 'plank', '#ab8b4a', '#8f6c3e')),
        prop('house', 17.0, 15.2, tiles_w=3, tiles_h=3, style=house('shingle', 'log', '#7d5334', '#846445')),
        prop('house', 6.2, 16.6, tiles_w=3, tiles_h=3, style=house('thatch', 'log', '#b08c4a', '#82623a')),
        prop('well', 8.6, 12.6),
        prop('cart', 15.2, 12.4),
        prop('haystack', 19.0, 7.2),
        prop('haystack', 20.0, 7.6),
        prop('signpost', 13.6, 13.2),
        prop('fence', 5.6, 8.8, length_px=104),
        prop('fence', 9.4, 8.8, length_px=64),
        prop('barrel', 3.4, 13.6),
        prop('barrel', 4.2, 13.8),
        prop('crate', 5.2, 13.7),
        prop('sack', 9.4, 12.1),
        prop('bush', 15.6, 4.6, size=22, leaves=LEAF_SUMMER, berries=rgb('#b8384a')),
        prop('bush', 2.2, 8.6, size=20, leaves=LEAF_SUMMER),
        prop('flowers', 10.4, 6.4, color=rgb('#e2d05a')),
        prop('flowers', 14.6, 8.2, color=rgb('#d8709a')),
        prop('flowers', 6.8, 11.4, color=rgb('#e8e0f0')),
        prop('tree', 1.6, 2.4, radius=30, leaves=LEAF_SUMMER),
        prop('tree', 4.6, 1.8, radius=26, leaves=LEAF_SUMMER),
        prop('tree', 8.4, 1.6, radius=24, leaves=LEAF_AUTUMN),
        prop('tree', 16.2, 1.8, radius=28, leaves=LEAF_SUMMER),
        prop('tree', 24.0, 1.4, radius=26, leaves=LEAF_AUTUMN),
        prop('pine', 18.6, 3.0, height_px=76, leaves=LEAF_DARK),
        prop('pine', 0.9, 6.0, height_px=68, leaves=LEAF_DARK),
        prop('tree', 1.4, 11.0, radius=24, leaves=LEAF_SUMMER),
        prop('tree', 24.2, 8.4, radius=28, leaves=LEAF_SUMMER),
        prop('tree', 22.0, 16.4, radius=30, leaves=LEAF_SUMMER),
        prop('tree', 9.8, 16.6, radius=26, leaves=LEAF_AUTUMN),
        prop('pine', 0.8, 15.0, height_px=72, leaves=LEAF_DARK),
        prop('rock', 6.4, 5.0, size=20),
        prop('rock', 15.0, 13.4, size=16),
        prop('pine', 3.0, 3.4, height_px=58, leaves=LEAF_DARK),
        prop('pine', 6.0, 2.2, height_px=54, leaves=LEAF_DARK),
        prop('tree', 10.0, 1.6, radius=20, leaves=LEAF_SUMMER),
        prop('pine', 13.0, 1.4, height_px=52, leaves=LEAF_DARK),
        prop('tree', 19.0, 1.6, radius=18, leaves=LEAF_AUTUMN),
        prop('pine', 22.0, 2.2, height_px=56, leaves=LEAF_DARK),
        prop('pine', 2.0, 13.4, height_px=54, leaves=LEAF_DARK),
        prop('tree', 4.0, 16.4, radius=20, leaves=LEAF_SUMMER),
        prop('pine', 7.0, 15.4, height_px=52, leaves=LEAF_DARK),
        prop('tree', 13.0, 16.6, radius=18, leaves=LEAF_AUTUMN),
        prop('pine', 19.0, 16.4, height_px=56, leaves=LEAF_DARK),
        prop('tree', 24.0, 12.4, radius=20, leaves=LEAF_SUMMER),
        prop('bush', 8.0, 3.4, size=16, leaves=LEAF_SUMMER),
        prop('bush', 21.0, 14.4, size=16, leaves=LEAF_SUMMER),
        prop('rock', 11.0, 5.4, size=14),
    ],
    npcs=[
        person('elder', 'Stary Borzywój', look(tunic='#6b5a3c', trim='#8a7550', pants='#443a2c', hair='#c8c2b4', beard=True, beard_color='#d8d2c4', hair_style='short', held='staff', gem='#8fd0a8'), 9.3, 8.6),
        person('herbalist', 'Kalina Zielarka', look(tunic='#4a7a52', trim='#8ec08a', hair='#6b4526', hair_style='braid', held='basket', skin='#e0ab7c'), 6.4, 9.5),
        person('woodcutter', 'Miłosz Drwal', look(tunic='#8a4a34', trim='#c07a4c', pants='#3f4a58', hair='#2c2018', beard=True, held='hammer', hat='cap', hat_color='#5a4028'), 14.7, 6.3),
        person('campfire', 'Ognisko', {}, 17.2, 4.6, sprite='campfire'),
        person('dog', 'Burek', dict(color=rgb('#9a7442')), 10.4, 13.3, sprite='dog'),
    ],
)


# --------------------------------------------------------------------------
# 2 — Rudzin: the cobbled market town
# --------------------------------------------------------------------------

RUDZIN = dict(
    id=2,
    slug='rudzin',
    name='Rudzin',
    seed='rudzin-02',
    ground=ground('grass', GRASS_MEADOW),
    patches=[area('dirt', DIRT_PATH, points=[(0, 0), (25, 0), (25, 2.4), (0, 3.2)], rough=0.4, scale=12)],
    plazas=[
        area('cobble', COBBLE_GREY, points=[(5, 4.6), (20, 4.2), (20.6, 12.6), (4.6, 13)], rough=0.22, scale=18, kerb=rgb('#585460')),
    ],
    roads=[
        road('cobble', COBBLE_WARM, [(12.5, 16.4), (12.5, 13.2)], width=1.98),
        road('dirt', DIRT_PATH, [(0.5, 8), (3.6, 8.2)], width=1.32),
        road('dirt', DIRT_PATH, [(21.6, 6.5), (24.6, 6.2)], width=1.32),
    ],
    sites=[
        site('quarry', 'battle', 'Kamieniołom', (1, 1, 4, 3), dict(kind='cave', color=rgb('#726c62'))),
        site('catacombs', 'battle', 'Zapadłe Katakumby', (20, 12, 4, 3), dict(kind='cave', color=rgb('#5e5a66'))),
        site('arena', 'arena', 'Arena', (20, 1, 4, 3), dict(kind='arena', sand=rgb('#c8ae7c'))),
        site('tough', 'toughenemy', 'Mocny przeciwnik', (1, 12, 3, 3), dict(kind='lair')),
        site(
            'inn',
            'rest',
            'Karczma pod Miedzianym Dzbanem',
            (15, 8, 4, 3),
            dict(kind='building', style=house('tiles', 'plaster', '#a8442e', '#e4dac0', sign='mug', chimney=True)),
        ),
        site(
            'shop',
            'shop',
            'Kuźnia',
            (6, 8, 4, 3),
            dict(kind='building', style=house('tiles', 'stone', '#8c3f2c', '#9a94a0', sign='anvil', sign_side=-1, chimney=True)),
        ),
        site('world', 'worldmap', 'Mapa Świata', (11, 14, 3, 2), dict(kind='portal', glow=rgb('#8ec4e0'))),
    ],
    props=[
        prop('house', 8.0, 4.4, tiles_w=4, tiles_h=3, style=house('tiles', 'plaster', '#b5563a', '#ddd2b6', chimney=True)),
        prop('house', 15.5, 4.4, tiles_w=3, tiles_h=3, style=house('tiles', 'plaster', '#8f4a68', '#e8dfc8', chimney=True)),
        prop('house', 3.5, 6.8, tiles_w=3, tiles_h=3, style=house('shingle', 'plank', '#6f4a2e', '#a07f4e')),
        prop('house', 22.0, 9.6, tiles_w=3, tiles_h=3, style=house('tiles', 'stone', '#a8442e', '#a09aa6')),
        prop('house', 6.5, 16.4, tiles_w=4, tiles_h=3, style=house('tiles', 'plaster', '#9a4a34', '#e0d6bc', chimney=True)),
        prop('house', 18.0, 16.4, tiles_w=3, tiles_h=3, style=house('shingle', 'plaster', '#7a5a34', '#d8ceb4')),
        prop('fountain', 12.6, 8.4, size=86),
        prop('stall', 8.2, 12.4, awning=rgb('#b8452e'), goods=(rgb('#c85a3a'), rgb('#d8b038'), rgb('#7aa040'))),
        prop('stall', 16.6, 12.4, awning=rgb('#3a6a9a'), goods=(rgb('#e0d0a0'), rgb('#a8703a'), rgb('#c0407a'))),
        prop('cart', 5.6, 11.4),
        prop('barrel', 19.2, 11.0),
        prop('barrel', 19.9, 11.2),
        prop('crate', 18.6, 11.4),
        prop('sack', 6.4, 12.6),
        prop('lamp', 9.4, 6.6),
        prop('lamp', 16.0, 6.6),
        prop('lamp', 9.4, 12.8),
        prop('lamp', 16.0, 12.8),
        prop('tree', 5.0, 3.0, radius=26, leaves=LEAF_SUMMER),
        prop('tree', 19.0, 6.2, radius=24, leaves=LEAF_AUTUMN),
        prop('tree', 1.6, 4.4, radius=22, leaves=LEAF_SUMMER),
        prop('tree', 23.6, 16.2, radius=26, leaves=LEAF_SUMMER),
        prop('tree', 2.0, 16.4, radius=24, leaves=LEAF_AUTUMN),
        prop('bush', 11.0, 4.4, size=20),
        prop('bush', 14.0, 4.4, size=20),
        prop('flowers', 10.6, 10.2, color=rgb('#e2d05a')),
        prop('flowers', 14.4, 10.2, color=rgb('#d8709a')),
    ],
    npcs=[
        person('merchant', 'Radomiła Kupcowa', look(tunic='#7a3a6a', trim='#d8a8c8', hair='#4a3020', hair_style='bun', held='book', held_color='#c8a038'), 10.4, 12.4),
        person('guard', 'Strażnik Ziemowit', look(tunic='#3a4a7a', trim='#c2c6d0', pants='#2c3244', hat='helm', held='spear', skin='#c68a5e'), 12.6, 5.6),
        person('baker', 'Piekarka Jaga', look(tunic='#c8a860', trim='#f0e2c0', hair='#8a5a2c', hair_style='long', held='basket', skin='#f0c69c'), 18.0, 12.5),
        person('cat', 'Mruczek', dict(color=rgb('#6a5a52')), 6.0, 6.4, sprite='cat'),
    ],
)


# --------------------------------------------------------------------------
# 3 — Wielgrad: the stone city on the river
# --------------------------------------------------------------------------

WIELGRAD = dict(
    id=3,
    slug='wielgrad',
    name='Wielgrad',
    seed='wielgrad-03',
    ground=ground('cobble', COBBLE_GREY),
    patches=[area('grass', GRASS_MEADOW, points=[(0, 0), (7, 0), (5, 5), (0, 6)], rough=0.36, scale=12)],
    water=[
        area('water', WATER_DEEP, points=[(0, 13.6), (25, 12.4), (25, 16), (0, 16)], rough=0.2, scale=20, shore=SAND_PALE, shore_width=5),
    ],
    plazas=[area('marble', MARBLE_PALE, rect=(9, 5.5, 8, 6), radius=44, rough=0.2, scale=20, kerb=rgb('#6e6a7a'))],
    roads=[
        road('cobble', COBBLE_WARM, [(12.8, 13.6), (12.8, 11.2)], width=2.11),
        road('cobble', COBBLE_WARM, [(2, 8.6), (9, 8.4)], width=1.58),
        road('cobble', COBBLE_WARM, [(17, 8.4), (23.5, 8.6)], width=1.58),
    ],
    sites=[
        site('flooded-docks', 'battle', 'Zalane Doki', (1, 1, 4, 3), dict(kind='cave', color=rgb('#5a6470'))),
        site('canals', 'battle', 'Kanały Wielgradu', (20, 1, 4, 3), dict(kind='cave', color=rgb('#606a76'))),
        site('arena', 'arena', 'Arena', (19, 9, 5, 4), dict(kind='arena', sand=rgb('#cbb488'), wall=rgb('#8e8a96'))),
        site('tough', 'toughenemy', 'Mocny przeciwnik', (1, 9, 3, 3), dict(kind='lair', ground=rgb('#4a4650'))),
        site(
            'inn',
            'rest',
            'Gospoda Rzeczna',
            (6, 11, 4, 3),
            dict(kind='building', style=house('tiles', 'plaster', '#9a4436', '#dcd2bc', sign='mug', chimney=True)),
        ),
        site(
            'shop',
            'shop',
            'Zbrojownia',
            (15, 11, 4, 3),
            dict(kind='building', style=house('slate', 'stone', '#5a6a86', '#9e9aa6', sign='sword', sign_side=-1, banner=rgb('#3a5a9a'))),
        ),
        site('world', 'worldmap', 'Mapa Świata', (11, 1, 3, 2), dict(kind='portal', glow=rgb('#8ec4e0'), stone=rgb('#8a8894'))),
    ],
    props=[
        prop('house', 8.0, 4.6, tiles_w=3, tiles_h=3, style=house('slate', 'stone', '#4f5f7a', '#a6a2ae', banner=rgb('#7a3a4a'))),
        prop('house', 17.5, 4.6, tiles_w=3, tiles_h=3, style=house('slate', 'stone', '#4f5f7a', '#a6a2ae', banner=rgb('#3a6a5a'))),
        prop('house', 3.5, 6.6, tiles_w=3, tiles_h=3, style=house('tiles', 'stone', '#8c3f2c', '#9a94a0')),
        prop('house', 22.0, 6.6, tiles_w=3, tiles_h=3, style=house('tiles', 'stone', '#8c3f2c', '#9a94a0')),
        prop('statue', 12.9, 9.6, height_px=76),
        prop('wall', 5.0, 13.0, length_px=150),
        prop('wall', 20.0, 13.0, length_px=150),
        prop('dock', 4.2, 15.4, width_px=54, height_px=76),
        prop('dock', 20.8, 15.4, width_px=54, height_px=76),
        prop('boat', 8.6, 15.0),
        prop('boat', 17.0, 15.6),
        prop('crate', 3.2, 14.0),
        prop('crate', 3.9, 14.2),
        prop('barrel', 21.6, 14.0),
        prop('barrel', 22.3, 14.2),
        prop('lamp', 10.4, 12.4),
        prop('lamp', 15.0, 12.4),
        prop('lamp', 6.2, 8.2),
        prop('lamp', 19.4, 8.2),
        prop('tree', 2.2, 3.4, radius=26, leaves=LEAF_SUMMER),
        prop('tree', 5.4, 2.2, radius=22, leaves=LEAF_SUMMER),
        prop('bush', 10.2, 6.4, size=22),
        prop('bush', 15.6, 6.4, size=22),
        prop('bush', 10.2, 11.0, size=22),
        prop('bush', 15.6, 11.0, size=22),
        prop('flowers', 11.4, 6.0, color=rgb('#e8e0f0')),
        prop('flowers', 14.4, 11.4, color=rgb('#e2d05a')),
    ],
    npcs=[
        person('castellan', 'Kasztelan Dobrogost', look(tunic='#2f3f6a', trim='#c8b45a', pants='#26304a', cloak='#7a2c3a', hat='helm', beard=True, beard_color='#4a3020'), 12.9, 12.4),
        person('fisher', 'Rybak Świerad', look(tunic='#4a6a7a', trim='#9ac0c8', pants='#3a4450', hat='wide', hat_color='#7a6238', skin='#c68a5e'), 6.4, 14.6),
        person('lady', 'Lady Ludmiła', look(tunic='#6a3a7a', trim='#e0c8f0', hair='#c09858', hair_style='long', robe=True, held='book', held_color='#3a5a9a'), 16.2, 8.0),
        person('lampman', 'Latarnik Rościsław', look(tunic='#3a4a44', trim='#8aa08a', pants='#2f3830', hair='#6b4526', held='lantern', hat='cap', hat_color='#4a3a2c'), 19.4, 14.6),
    ],
)


# --------------------------------------------------------------------------
# 4 — Czarnobór: the stockade in the black pinewood
# --------------------------------------------------------------------------

CZARNOBOR = dict(
    id=4,
    slug='czarnobor',
    name='Czarnobór',
    seed='czarnobor-04',
    ground=ground('grass', ramp('#233a22', '#2b4527', '#33502d', '#3c5c35', '#476a3f')),
    patches=[
        area('dirt', ramp('#4a3d2c', '#584a35', '#66573f', '#736349', '#807055'), points=[(8, 6), (17, 5.6), (17.6, 12), (7.4, 12.4)], rough=0.3, scale=14),
        area('grass', GRASS_DRY, points=[(0, 12), (6, 13), (5, 16), (0, 16)], rough=0.4, scale=10),
    ],
    roads=[
        road('dirt', ramp('#524432', '#60513c', '#6e5f47', '#7c6c53', '#897960'), [(12.5, 16.4), (12.5, 13.6), (12.2, 10), (12.5, 6.4)], width=1.72),
        road('dirt', ramp('#524432', '#60513c', '#6e5f47', '#7c6c53', '#897960'), [(6.4, 9.6), (12.3, 9.4), (18.6, 9.6)], width=1.45),
    ],
    sites=[
        site('tar-forest', 'battle', 'Smolna Puszcza', (1, 1, 4, 3), dict(kind='cave', color=rgb('#4a4a3e'))),
        site('barrows', 'battle', 'Kurhany Czarnoboru', (20, 1, 4, 3), dict(kind='cave', color=rgb('#55503e'))),
        site('wolf-grove', 'battle', 'Wilcze Uroczysko', (20, 12, 4, 3), dict(kind='cave', color=rgb('#454a3c'))),
        site('arena', 'arena', 'Arena', (9, 1, 5, 3), dict(kind='arena', sand=rgb('#b09a68'), wall=rgb('#6a5a40'))),
        site('tough', 'toughenemy', 'Mocny przeciwnik', (1, 12, 3, 3), dict(kind='lair', ground=rgb('#3f3a30'))),
        site(
            'inn',
            'rest',
            'Karczma Traperów',
            (15, 5, 4, 3),
            dict(kind='building', style=house('thatch', 'log', '#96793f', '#6f5533', sign='mug', chimney=True)),
        ),
        site(
            'shop',
            'shop',
            'Skład Traperski',
            (6, 5, 4, 3),
            dict(kind='building', style=house('shingle', 'log', '#5f4028', '#77592f', sign='anvil', sign_side=-1, chimney=True)),
        ),
        site('world', 'worldmap', 'Mapa Świata', (11, 13, 3, 2), dict(kind='portal', glow=rgb('#a8c86a'), stone=rgb('#6a6458'))),
    ],
    props=[
        prop('house', 8.0, 12.6, tiles_w=3, tiles_h=3, style=house('thatch', 'log', '#8f7239', '#6a5030', chimney=True)),
        prop('house', 17.0, 12.6, tiles_w=3, tiles_h=3, style=house('shingle', 'log', '#5a3d26', '#70532e')),
        prop('house', 4.0, 8.6, tiles_w=3, tiles_h=2, style=house('thatch', 'log', '#8a6e36', '#654c2e')),
        prop('house', 21.0, 8.6, tiles_w=3, tiles_h=2, style=house('thatch', 'log', '#8a6e36', '#654c2e')),
        prop('palisade', 6.0, 4.2, length_px=132),
        prop('palisade', 19.0, 4.2, length_px=132),
        prop('palisade', 3.0, 11.4, length_px=110),
        prop('palisade', 22.0, 11.4, length_px=110),
        prop('haystack', 6.0, 11.4),
        prop('cart', 18.2, 11.0),
        prop('barrel', 10.2, 7.4),
        prop('barrel', 10.9, 7.6),
        prop('crate', 14.2, 7.5),
        prop('signpost', 13.8, 12.4),
        prop('dead_tree', 3.0, 6.0, height_px=64),
        prop('dead_tree', 22.4, 6.2, height_px=58),
        prop('pine', 0.9, 5.4, height_px=86, leaves=LEAF_DARK),
        prop('pine', 2.4, 4.2, height_px=72, leaves=LEAF_DARK),
        prop('pine', 24.2, 5.4, height_px=84, leaves=LEAF_DARK),
        prop('pine', 6.0, 2.6, height_px=76, leaves=LEAF_DARK),
        prop('pine', 16.4, 2.6, height_px=78, leaves=LEAF_DARK),
        prop('pine', 8.0, 16.6, height_px=88, leaves=LEAF_DARK),
        prop('pine', 16.8, 16.6, height_px=84, leaves=LEAF_DARK),
        prop('pine', 1.0, 16.2, height_px=80, leaves=LEAF_DARK),
        prop('pine', 24.0, 16.2, height_px=82, leaves=LEAF_DARK),
        prop('rock', 5.4, 15.0, size=24),
        prop('rock', 19.6, 15.4, size=20),
        prop('bush', 9.0, 8.2, size=18, leaves=LEAF_DARK),
        prop('bush', 15.8, 8.2, size=18, leaves=LEAF_DARK),
        prop('pine', 4.0, 2.4, height_px=62, leaves=LEAF_DARK),
        prop('pine', 10.0, 16.4, height_px=64, leaves=LEAF_DARK),
        prop('pine', 13.0, 16.6, height_px=58, leaves=LEAF_DARK),
        prop('pine', 19.0, 16.4, height_px=62, leaves=LEAF_DARK),
        prop('pine', 22.0, 16.2, height_px=56, leaves=LEAF_DARK),
        prop('pine', 3.0, 16.6, height_px=60, leaves=LEAF_DARK),
        prop('pine', 24.0, 3.4, height_px=58, leaves=LEAF_DARK),
        prop('pine', 1.0, 3.2, height_px=54, leaves=LEAF_DARK),
        prop('bush', 7.0, 15.4, size=16, leaves=LEAF_DARK),
        prop('bush', 18.0, 15.4, size=16, leaves=LEAF_DARK),
    ],
    npcs=[
        person('trapper', 'Traper Wilkosz', look(tunic='#5a4430', trim='#8a7048', pants='#3a3226', cloak='#4a3a28', hat='wide', hat_color='#4a3a24', beard=True), 11.0, 8.6),
        person('healer', 'Znachorka Wierzba', look(tunic='#3f5a48', trim='#7fa07a', hair='#d8d2c4', hair_style='long', robe=True, held='staff', gem='#a8c86a'), 14.0, 8.6),
        person('hunter', 'Łowczy Godzimir', look(tunic='#4a5a34', trim='#8aa050', pants='#33402a', held='spear', hat='hood', hat_color='#3a4a30'), 20.0, 10.6),
        person('campfire', 'Ognisko', {}, 12.5, 11.8, sprite='campfire'),
        person('dog', 'Sfora', dict(color=rgb('#4a4038')), 15.6, 11.4, sprite='dog'),
    ],
)


# --------------------------------------------------------------------------
# 5 — Sołwar: the salt harbour
# --------------------------------------------------------------------------

SOLWAR = dict(
    id=5,
    slug='solwar',
    name='Sołwar',
    seed='solwar-05',
    ground=ground('sand', SAND_PALE),
    patches=[
        area('grass', GRASS_DRY, points=[(0, 0), (25, 0), (25, 4), (0, 5)], rough=0.4, scale=12),
        area('rock', ROCK_GREY, points=[(0, 5), (4, 5), (5, 11), (0, 12)], rough=0.36, scale=12),
    ],
    water=[
        area('water', WATER_TROPIC, points=[(0, 12.8), (25, 11.6), (25, 16), (0, 16)], rough=0.22, scale=18, shore=ramp('#c8b48a', '#d4c196', '#e0cfa8', '#e8dab8', '#f0e4c8'), shore_width=9),
    ],
    plazas=[area('cobble', COBBLE_WARM, rect=(8, 6, 9, 5), radius=6, rough=0.26, scale=18, kerb=rgb('#6a6050'))],
    roads=[
        road('dirt', ramp('#8a7a58', '#978663', '#a49470', '#b0a17d', '#bcae8b'), [(12.5, 12.6), (12.5, 10.8)], width=1.98),
        road('dirt', ramp('#8a7a58', '#978663', '#a49470', '#b0a17d', '#bcae8b'), [(5, 8.4), (8.2, 8.4)], width=1.45),
        road('dirt', ramp('#8a7a58', '#978663', '#a49470', '#b0a17d', '#bcae8b'), [(16.8, 8.4), (20.4, 8.4)], width=1.45),
    ],
    sites=[
        site('salt-pans', 'battle', 'Warzelnie Soli', (1, 1, 4, 3), dict(kind='cave', color=rgb('#9a9184'))),
        site('castaway-bay', 'battle', 'Zatoka Rozbitków', (20, 1, 4, 3), dict(kind='cave', color=rgb('#7e7a70'))),
        site('arena', 'arena', 'Arena', (19, 9, 5, 4), dict(kind='arena', sand=rgb('#d8c496'), wall=rgb('#8c7f66'))),
        site('tough', 'toughenemy', 'Mocny przeciwnik', (1, 9, 3, 3), dict(kind='lair', ground=rgb('#5a5044'), bone=rgb('#e4dcc0'))),
        site(
            'inn',
            'rest',
            'Gospoda pod Latarnią',
            (17, 4, 4, 3),
            dict(kind='building', style=house('tiles', 'plaster', '#3f6a7a', '#e4dcc4', sign='mug', sign_side=-1, chimney=True)),
        ),
        site(
            'shop',
            'shop',
            'Skład Portowy',
            (4, 4, 4, 3),
            dict(kind='building', style=house('tiles', 'plank', '#3f6a7a', '#a08858', sign='coin', chimney=True)),
        ),
        site('world', 'worldmap', 'Mapa Świata', (11, 1, 3, 2), dict(kind='portal', glow=rgb('#7fd8c8'), stone=rgb('#8e8878'))),
    ],
    props=[
        prop('house', 9.5, 5.4, tiles_w=3, tiles_h=2, style=house('tiles', 'plank', '#4a7080', '#98814f')),
        prop('house', 15.5, 5.4, tiles_w=3, tiles_h=2, style=house('tiles', 'plank', '#4a7080', '#98814f')),
        prop('house', 7.0, 11.4, tiles_w=3, tiles_h=3, style=house('tiles', 'plaster', '#3f6a7a', '#dcd0b4')),
        prop('house', 18.0, 11.4, tiles_w=3, tiles_h=3, style=house('tiles', 'plaster', '#3f6a7a', '#dcd0b4')),
        prop('dock', 5.0, 16.2, width_px=58, height_px=104),
        prop('dock', 12.5, 16.2, width_px=64, height_px=110),
        prop('dock', 20.0, 16.2, width_px=58, height_px=104),
        prop('boat', 8.4, 15.2),
        prop('boat', 16.6, 15.8),
        prop('crate', 3.6, 12.4),
        prop('crate', 4.3, 12.6),
        prop('crate', 3.9, 13.0),
        prop('barrel', 21.0, 12.4),
        prop('barrel', 21.7, 12.6),
        prop('sack', 10.0, 12.2),
        prop('sack', 14.8, 12.2),
        prop('stall', 12.5, 9.6, awning=rgb('#3f8a8a'), goods=(rgb('#e0d8c0'), rgb('#c8a038'), rgb('#a8506a'))),
        prop('cart', 6.0, 9.4),
        prop('lamp', 9.0, 7.0),
        prop('lamp', 16.0, 7.0),
        prop('palm', 2.4, 8.0),
        prop('palm', 23.0, 7.6),
        prop('palm', 6.6, 3.2),
        prop('palm', 19.4, 3.2),
        prop('rock', 1.6, 13.4, size=26),
        prop('rock', 23.4, 13.0, size=22),
        prop('bush', 10.6, 4.4, size=18, leaves=LEAF_PALE),
        prop('bush', 14.6, 4.4, size=18, leaves=LEAF_PALE),
    ],
    npcs=[
        person('lightkeeper', 'Latarnik Wawrzyn', look(tunic='#3f5a6a', trim='#a8c8d0', pants='#2f3a48', hat='cap', hat_color='#2f4450', held='lantern', beard=True, beard_color='#c8c2b4'), 15.6, 7.4),
        person('salter', 'Warzelnik Solimir', look(tunic='#c0b090', trim='#f0e8d0', pants='#6a5a44', hair='#6b4526', held='hammer', skin='#c68a5e'), 9.4, 7.4),
        person('sailor', 'Żeglarka Nawoja', look(tunic='#7a3a4a', trim='#e0b8b0', hair='#2c2018', hair_style='braid', pants='#3a4a5a', held='basket'), 12.5, 12.8),
        person('cat', 'Mgiełka', dict(color=rgb('#c8c0b0')), 17.6, 13.4, sprite='cat'),
    ],
)


# --------------------------------------------------------------------------
# 6 — Nihrast: the basalt temple town
# --------------------------------------------------------------------------

NIHRAST = dict(
    id=6,
    slug='nihrast',
    name='Nihrast',
    seed='nihrast-06',
    ground=ground('rock', ramp('#3f3a44', '#494350', '#534d5b', '#5d5666', '#675f71')),
    patches=[
        area('ash', ASH_DARK, points=[(0, 0), (25, 0), (25, 5), (0, 6)], rough=0.4, scale=11),
        area('ash', ASH_DARK, points=[(0, 12), (25, 13), (25, 16), (0, 16)], rough=0.4, scale=11),
    ],
    plazas=[area('cobble', ramp('#5a5260', '#655c6c', '#706778', '#7b7284', '#867d90'), rect=(8, 5.5, 9, 6), radius=8, rough=0.24, scale=18, kerb=rgb('#3f3a46'))],
    roads=[
        road('cobble', ramp('#5a5260', '#655c6c', '#706778', '#7b7284', '#867d90'), [(12.5, 16.4), (12.5, 11.4)], width=1.85),
        road('cobble', ramp('#5a5260', '#655c6c', '#706778', '#7b7284', '#867d90'), [(4.6, 8.4), (8.2, 8.4)], width=1.45),
        road('cobble', ramp('#5a5260', '#655c6c', '#706778', '#7b7284', '#867d90'), [(16.8, 8.4), (20.6, 8.4)], width=1.45),
    ],
    sites=[
        site('basalt-stairs', 'battle', 'Bazaltowe Schody', (1, 1, 4, 3), dict(kind='cave', color=rgb('#4a4450'))),
        site('ash-crypt', 'battle', 'Krypta Popiołów', (20, 1, 4, 3), dict(kind='cave', color=rgb('#453e48'))),
        site('arena', 'arena', 'Arena', (19, 11, 5, 4), dict(kind='arena', sand=rgb('#7a6a5a'), wall=rgb('#4e4654'))),
        site('tough', 'toughenemy', 'Mocny przeciwnik', (1, 11, 3, 3), dict(kind='lair', ground=rgb('#332e38'))),
        site(
            'inn',
            'rest',
            'Karczma Popielna',
            (17, 5, 4, 3),
            dict(kind='building', style=house('slate', 'basalt', '#4a4454', '#4f4858', sign='mug', sign_side=-1, lit=True)),
        ),
        site(
            'shop',
            'shop',
            'Kuźnia Żarowa',
            (4, 5, 4, 3),
            dict(kind='building', style=house('slate', 'basalt', '#4a4454', '#4f4858', sign='anvil', lit=True, chimney=True)),
        ),
        site(
            'temple',
            'worldmap',
            'Mapa Świata',
            (11, 1, 3, 2),
            dict(kind='portal', glow=rgb('#e08a3c'), stone=rgb('#5e5668')),
        ),
    ],
    props=[
        prop('house', 9.5, 12.6, tiles_w=3, tiles_h=3, style=house('battlement', 'basalt', '#5a5464', '#4a4452')),
        prop('house', 15.5, 12.6, tiles_w=3, tiles_h=3, style=house('battlement', 'basalt', '#5a5464', '#4a4452')),
        prop('house', 6.5, 11.0, tiles_w=3, tiles_h=2, style=house('slate', 'basalt', '#4a4454', '#514a5a')),
        prop('house', 18.5, 11.0, tiles_w=3, tiles_h=2, style=house('slate', 'basalt', '#4a4454', '#514a5a')),
        prop('obelisk', 12.5, 9.4),
        prop('brazier', 9.4, 6.6, flame=rgb('#e0641e')),
        prop('brazier', 15.6, 6.6, flame=rgb('#e0641e')),
        prop('brazier', 9.4, 10.6, flame=rgb('#e0641e')),
        prop('brazier', 15.6, 10.6, flame=rgb('#e0641e')),
        prop('brazier', 12.5, 15.0, flame=rgb('#e08a3c')),
        prop('rock', 2.6, 8.6, size=26, color=rgb('#4a4450')),
        prop('rock', 22.6, 8.6, size=26, color=rgb('#4a4450')),
        prop('rock', 7.0, 15.4, size=22, color=rgb('#443e4a')),
        prop('rock', 18.0, 15.4, size=22, color=rgb('#443e4a')),
        prop('dead_tree', 5.6, 15.2, height_px=62, color=rgb('#3a3038')),
        prop('dead_tree', 19.6, 15.0, height_px=58, color=rgb('#3a3038')),
        prop('crystal', 3.4, 4.6, color=rgb('#d8642c'), height_px=36),
        prop('crystal', 21.6, 4.6, color=rgb('#d8642c'), height_px=36),
        prop('grave', 7.4, 3.4, color=rgb('#6a6270')),
        prop('grave', 8.6, 3.6, color=rgb('#6a6270')),
        prop('grave', 16.4, 3.4, color=rgb('#6a6270')),
        prop('grave', 17.6, 3.6, color=rgb('#6a6270')),
    ],
    npcs=[
        person('priest', 'Kapłan Ogniec', look(tunic='#7a3a24', trim='#e0a04c', robe=True, hat='hood', hat_color='#6a3020', held='staff', gem='#e0641e'), 12.5, 12.2),
        person('sister', 'Siostra Iskra', look(tunic='#4a3a5a', trim='#c8a8e0', hair='#c8c2b4', hair_style='long', robe=True, held='book', held_color='#8a3c34'), 9.6, 8.6),
        person('smith', 'Kowal Żarowit', look(tunic='#5a4a44', trim='#c07a4c', pants='#3a3230', beard=True, beard_color='#4a3020', held='hammer', skin='#9e6743'), 6.4, 8.6),
        person('watch', 'Straż Nihrastu', look(tunic='#3f3a4a', trim='#8a8494', pants='#2f2c38', hat='helm', hat_color='#7a7484', held='spear'), 16.4, 8.6),
    ],
)


# --------------------------------------------------------------------------
# 7 — Zhurmat: the oasis caravan town
# --------------------------------------------------------------------------

ZHURMAT = dict(
    id=7,
    slug='zhurmat',
    name='Zhurmat',
    seed='zhurmat-07',
    ground=ground('sand', ramp('#b5985f', '#c2a66d', '#cfb47c', '#dbc38d', '#e7d2a1')),
    patches=[area('sand', ramp('#a08650', '#ad935d', '#b9a06a', '#c4ac78', '#d0b986'), points=[(0, 10), (10, 9), (14, 14), (6, 16), (0, 15)], rough=0.42, scale=10)],
    water=[
        area('water', WATER_TROPIC, points=[(9.2, 6.8), (12, 6.2), (15.8, 6.6), (16.6, 9), (14, 10.4), (10.4, 10.2)], rough=0.5, scale=9, shore=ramp('#c8ae74', '#d4bb82', '#dfc891', '#e9d5a1', '#f2e2b4'), shore_width=9),
    ],
    roads=[
        road('dirt', ramp('#a68c5c', '#b19669', '#bca176', '#c6ac83', '#d0b790'), [(12.5, 16.4), (12.5, 13), (12.5, 11)], width=1.2),
        road('dirt', ramp('#a68c5c', '#b19669', '#bca176', '#c6ac83', '#d0b790'), [(3, 8), (9, 7.6)], width=1.45),
        road('dirt', ramp('#a68c5c', '#b19669', '#bca176', '#c6ac83', '#d0b790'), [(16.4, 7.6), (22, 8)], width=1.45),
        road('dirt', ramp('#a68c5c', '#b19669', '#bca176', '#c6ac83', '#d0b790'), [(12.5, 5.8), (12.5, 3.6)], width=1.58),
    ],
    sites=[
        site('dunes', 'battle', 'Wydmy Zhurmatu', (1, 1, 4, 3), dict(kind='cave', color=rgb('#9a8258'))),
        site('necropolis', 'battle', 'Zapomniana Nekropolia', (20, 1, 4, 3), dict(kind='cave', color=rgb('#8e7c5c'))),
        site('arena', 'arena', 'Arena', (19, 11, 5, 4), dict(kind='arena', sand=rgb('#e0c894'), wall=rgb('#a08a5c'))),
        site('tough', 'toughenemy', 'Mocny przeciwnik', (1, 11, 3, 3), dict(kind='lair', ground=rgb('#7a6a48'), bone=rgb('#efe6c8'))),
        site(
            'inn',
            'rest',
            'Karczma Karawan',
            (17, 4, 4, 3),
            dict(kind='building', style=house('dome', 'adobe', '#c89a3c', '#d8b884', sign='mug', sign_side=-1, arched_door=True)),
        ),
        site(
            'shop',
            'shop',
            'Bazar Zhurmatu',
            (4, 4, 4, 3),
            dict(kind='building', style=house('dome', 'adobe', '#3f9a8a', '#dcbe8a', sign='coin', arched_door=True)),
        ),
        site('world', 'worldmap', 'Mapa Świata', (11, 1, 3, 2), dict(kind='portal', glow=rgb('#e0c04c'), stone=rgb('#a8946a'))),
    ],
    props=[
        prop('house', 8.5, 5.4, tiles_w=3, tiles_h=2, style=house('dome', 'adobe', '#b8863c', '#d2b17e', arched_door=True)),
        prop('house', 16.5, 5.4, tiles_w=3, tiles_h=2, style=house('dome', 'adobe', '#b8863c', '#d2b17e', arched_door=True)),
        prop('house', 6.0, 12.6, tiles_w=3, tiles_h=3, style=house('tent', 'adobe', '#a8443c', '#d8b884')),
        prop('house', 16.0, 12.6, tiles_w=3, tiles_h=3, style=house('tent', 'adobe', '#3f6a9a', '#d8b884')),
        prop('house', 3.0, 9.0, tiles_w=3, tiles_h=2, style=house('dome', 'adobe', '#b8863c', '#cfae7c', arched_door=True)),
        prop('house', 22.0, 9.0, tiles_w=3, tiles_h=2, style=house('dome', 'adobe', '#b8863c', '#cfae7c', arched_door=True)),
        prop('stall', 9.4, 12.4, awning=rgb('#b8452e'), goods=(rgb('#d8a038'), rgb('#a8506a'), rgb('#7aa040'))),
        prop('stall', 19.0, 6.6, awning=rgb('#8a5aa0'), goods=(rgb('#e0d8c0'), rgb('#c85a3a'), rgb('#3f9a8a'))),
        prop('cart', 12.5, 14.0),
        prop('crate', 8.0, 9.4),
        prop('crate', 8.7, 9.6),
        prop('sack', 17.0, 9.4),
        prop('sack', 17.8, 9.6),
        prop('barrel', 4.4, 6.6),
        prop('palm', 9.2, 6.4),
        prop('palm', 16.4, 6.2),
        prop('palm', 10.4, 11.2),
        prop('palm', 15.6, 11.0),
        prop('palm', 2.0, 5.0),
        prop('palm', 23.4, 5.0),
        prop('cactus', 6.4, 15.4),
        prop('cactus', 20.4, 15.6),
        prop('cactus', 1.4, 13.2),
        prop('rock', 3.6, 15.0, size=22, color=rgb('#8a7a58')),
        prop('rock', 22.6, 13.4, size=20, color=rgb('#8a7a58')),
        prop('bush', 11.0, 5.6, size=18, leaves=LEAF_PALE),
        prop('bush', 14.6, 5.4, size=18, leaves=LEAF_PALE),
    ],
    npcs=[
        person('caravaneer', 'Karawaniarz Zahed', look(tunic='#3f6a7a', trim='#e0c88c', robe=True, hat='hood', hat_color='#c8a054', beard=True, beard_color='#2c2018', skin='#9e6743'), 12.5, 10.6),
        person('weaver', 'Tkaczka Amira', look(tunic='#8a3a6a', trim='#f0c8a0', hair='#2c2018', hair_style='long', robe=True, held='basket', skin='#c68a5e'), 7.4, 12.4),
        person('waterman', 'Studniarz Hazir', look(tunic='#c8b078', trim='#e8dcb8', pants='#7a6238', hat='wide', hat_color='#b09050', held='basket', skin='#9e6743'), 18.4, 9.4),
        person('guard', 'Straż Oazy', look(tunic='#a8442e', trim='#e0c04c', pants='#5a4028', hat='helm', hat_color='#c8b060', held='spear', skin='#c68a5e'), 12.5, 4.4),
    ],
)


# --------------------------------------------------------------------------
# 8 — Grzmiel: the fortress above the pass
# --------------------------------------------------------------------------

GRZMIEL = dict(
    id=8,
    slug='grzmiel',
    name='Grzmiel',
    seed='grzmiel-08',
    ground=ground('rock', ROCK_GREY),
    patches=[
        area('snow', SNOW_PALE, points=[(0, 0), (25, 0), (25, 3.5), (0, 4.5)], rough=0.42, scale=11),
        area('snow', SNOW_PALE, points=[(0, 13), (7, 12), (12, 14), (6, 16), (0, 16)], rough=0.4, scale=10),
        area('grass', ramp('#3f5a3a', '#4a6742', '#55744b', '#608055', '#6b8c5f'), points=[(15, 12.5), (25, 12), (25, 16), (14, 16)], rough=0.4, scale=11),
    ],
    plazas=[area('cobble', ramp('#6a6870', '#75737c', '#807e88', '#8b8994', '#9694a0'), rect=(8, 5, 9, 6), radius=4, rough=0.2, scale=20, kerb=rgb('#4a4850'))],
    roads=[
        road('cobble', ramp('#6a6870', '#75737c', '#807e88', '#8b8994', '#9694a0'), [(12.5, 16.4), (12.5, 11.4)], width=1.98),
        road('cobble', ramp('#6a6870', '#75737c', '#807e88', '#8b8994', '#9694a0'), [(4.4, 8), (8.2, 8)], width=1.45),
        road('cobble', ramp('#6a6870', '#75737c', '#807e88', '#8b8994', '#9694a0'), [(16.8, 8), (20.6, 8)], width=1.45),
    ],
    sites=[
        site('thunder-ridge', 'battle', 'Grań Piorunów', (1, 1, 4, 3), dict(kind='cave', color=rgb('#666470'))),
        site('mine-shafts', 'battle', 'Sztolnie Grzmiela', (20, 1, 4, 3), dict(kind='cave', color=rgb('#5e5c68'))),
        site('arena', 'arena', 'Arena', (19, 11, 5, 4), dict(kind='arena', sand=rgb('#b8a884'), wall=rgb('#6e6c78'))),
        site('tough', 'toughenemy', 'Mocny przeciwnik', (1, 11, 3, 3), dict(kind='lair', ground=rgb('#4a4854'))),
        site(
            'inn',
            'rest',
            'Gospoda pod Kuszą',
            (17, 4, 4, 3),
            dict(kind='building', style=house('slate', 'stone', '#4a5a72', '#94929e', sign='mug', sign_side=-1, snow=True, chimney=True)),
        ),
        site(
            'shop',
            'shop',
            'Płatnerz',
            (4, 4, 4, 3),
            dict(kind='building', style=house('slate', 'stone', '#4a5a72', '#94929e', sign='sword', snow=True, chimney=True)),
        ),
        site('world', 'worldmap', 'Mapa Świata', (11, 1, 3, 2), dict(kind='portal', glow=rgb('#9ec8e8'), stone=rgb('#7e7c88'))),
    ],
    props=[
        prop('house', 9.5, 12.6, tiles_w=3, tiles_h=3, style=house('battlement', 'stone', '#6e6c78', '#8e8c98')),
        prop('house', 15.5, 12.6, tiles_w=3, tiles_h=3, style=house('battlement', 'stone', '#6e6c78', '#8e8c98')),
        prop('house', 7.0, 10.6, tiles_w=3, tiles_h=2, style=house('slate', 'stone', '#4a5a72', '#9896a2', snow=True)),
        prop('house', 18.0, 10.6, tiles_w=3, tiles_h=2, style=house('slate', 'stone', '#4a5a72', '#9896a2', snow=True)),
        prop('wall', 4.0, 3.4, length_px=150),
        prop('wall', 21.0, 3.4, length_px=150),
        prop('statue', 12.5, 8.6, stone=rgb('#9a98a4'), height_px=70),
        prop('brazier', 9.6, 6.0),
        prop('brazier', 15.4, 6.0),
        prop('brazier', 9.6, 10.4),
        prop('brazier', 15.4, 10.4),
        prop('crate', 6.0, 6.6),
        prop('crate', 6.7, 6.8),
        prop('barrel', 19.0, 6.6),
        prop('barrel', 19.7, 6.8),
        prop('cart', 4.4, 12.6),
        prop('pine', 2.0, 15.6, height_px=84, leaves=LEAF_DARK, snow=True),
        prop('pine', 5.4, 16.4, height_px=76, leaves=LEAF_DARK, snow=True),
        prop('pine', 21.4, 16.2, height_px=80, leaves=LEAF_DARK),
        prop('pine', 17.0, 16.6, height_px=72, leaves=LEAF_DARK),
        prop('rock', 6.6, 2.6, size=26),
        prop('rock', 18.4, 2.6, size=24),
        prop('rock', 2.6, 8.4, size=28),
        prop('rock', 22.6, 8.4, size=26),
        prop('ice_spike', 8.0, 3.0, height_px=34),
        prop('ice_spike', 16.6, 3.0, height_px=30),
    ],
    npcs=[
        person('castellan', 'Kasztelan Grom', look(tunic='#3a4458', trim='#c2c6d0', pants='#2c3240', cloak='#6a2c34', hat='helm', beard=True, beard_color='#4a4038'), 12.5, 12.2),
        person('armourer', 'Płatnerz Wojmir', look(tunic='#5a4a44', trim='#a8a2ae', pants='#3a3438', held='hammer', beard=True, skin='#c68a5e'), 6.4, 8.2),
        person('scout', 'Zwiadowca Turoń', look(tunic='#3f5a4a', trim='#8aa89a', pants='#2f3a34', cloak='#4a5a50', hat='hood', hat_color='#3f4a44', held='spear'), 18.6, 8.2),
        person('watch', 'Straż Przełęczy', look(tunic='#4a5468', trim='#c8ccd8', pants='#333a48', hat='helm', held='spear'), 12.5, 4.4),
    ],
)


# --------------------------------------------------------------------------
# 9 — Ismeria: the frozen city of exiles
# --------------------------------------------------------------------------

ISMERIA = dict(
    id=9,
    slug='ismeria',
    name='Ismeria',
    seed='ismeria-09',
    ground=ground('snow', SNOW_PALE),
    patches=[
        area('rock', ramp('#585a68', '#636574', '#6e7080', '#797b8c', '#848698'), points=[(0, 4), (5, 3.5), (6, 9), (0, 10)], rough=0.36, scale=12),
        area('rock', ramp('#585a68', '#636574', '#6e7080', '#797b8c', '#848698'), points=[(19, 3.5), (25, 4), (25, 10), (19, 9)], rough=0.36, scale=12),
    ],
    water=[
        area('water', ramp('#25405e', '#2d4d70', '#365a82', '#426a93', '#5079a3'), points=[(0, 13.4), (25, 12.6), (25, 16), (0, 16)], rough=0.24, scale=18, shore=ramp('#9eb4c8', '#adc1d3', '#bccddd', '#cbd9e6', '#dae5ef'), shore_width=7),
    ],
    plazas=[area('cobble', ramp('#7a8494', '#858f9f', '#909aaa', '#9ba5b5', '#a6b0c0'), rect=(8, 5, 9, 6), radius=6, rough=0.24, scale=18, kerb=rgb('#5a6472'))],
    roads=[
        road('cobble', ramp('#7a8494', '#858f9f', '#909aaa', '#9ba5b5', '#a6b0c0'), [(12.5, 13.6), (12.5, 11.4)], width=1.98),
        road('cobble', ramp('#7a8494', '#858f9f', '#909aaa', '#9ba5b5', '#a6b0c0'), [(5.4, 8), (8.2, 8)], width=1.45),
        road('cobble', ramp('#7a8494', '#858f9f', '#909aaa', '#9ba5b5', '#a6b0c0'), [(16.8, 8), (19.6, 8)], width=1.45),
    ],
    sites=[
        site('ice-rifts', 'battle', 'Lodowe Rozpadliny', (1, 1, 4, 3), dict(kind='cave', color=rgb('#7a8a9c'))),
        site('frozen-haven', 'battle', 'Zamarzła Przystań', (20, 1, 4, 3), dict(kind='cave', color=rgb('#72828e'))),
        site('arena', 'arena', 'Arena', (19, 10, 5, 4), dict(kind='arena', sand=rgb('#c8ccd8'), wall=rgb('#6e7888'))),
        site('tough', 'toughenemy', 'Mocny przeciwnik', (1, 10, 3, 3), dict(kind='lair', ground=rgb('#525c6a'), bone=rgb('#e8eef4'))),
        site(
            'inn',
            'rest',
            'Karczma pod Szronem',
            (17, 4, 4, 3),
            dict(kind='building', style=house('slate', 'ice', '#48607e', '#a8c8dc', sign='mug', sign_side=-1, snow=True, chimney=True)),
        ),
        site(
            'shop',
            'shop',
            'Zbrojownia Wygnańców',
            (4, 4, 4, 3),
            dict(kind='building', style=house('slate', 'ice', '#48607e', '#a8c8dc', sign='sword', snow=True, chimney=True)),
        ),
        site('world', 'worldmap', 'Mapa Świata', (11, 1, 3, 2), dict(kind='portal', glow=rgb('#8ee0e8'), stone=rgb('#8a94a4'))),
    ],
    props=[
        prop('house', 9.5, 12.6, tiles_w=3, tiles_h=3, style=house('slate', 'ice', '#48607e', '#9cc0d6', snow=True)),
        prop('house', 15.5, 12.6, tiles_w=3, tiles_h=3, style=house('slate', 'ice', '#48607e', '#9cc0d6', snow=True)),
        prop('house', 7.0, 10.6, tiles_w=3, tiles_h=2, style=house('slate', 'stone', '#48607e', '#9a9eae', snow=True)),
        prop('house', 18.0, 10.6, tiles_w=3, tiles_h=2, style=house('slate', 'stone', '#48607e', '#9a9eae', snow=True)),
        prop('fountain', 12.5, 8.8, stone=rgb('#a8b4c4'), water=rgb('#5a90b8'), size=78),
        prop('dock', 6.0, 15.6, width_px=54, height_px=86),
        prop('dock', 19.0, 15.6, width_px=54, height_px=86),
        prop('boat', 9.6, 15.2, hull=rgb('#5a4a3c'), sail=rgb('#cfd8e0')),
        prop('boat', 16.0, 15.8, hull=rgb('#5a4a3c'), sail=None),
        prop('ice_spike', 3.0, 12.4, height_px=48),
        prop('ice_spike', 4.4, 13.0, height_px=36),
        prop('ice_spike', 21.4, 12.6, height_px=44),
        prop('ice_spike', 22.6, 13.2, height_px=34),
        prop('ice_spike', 7.4, 3.4, height_px=40),
        prop('ice_spike', 17.6, 3.4, height_px=38),
        prop('brazier', 9.6, 6.0, flame=rgb('#e08a3c')),
        prop('brazier', 15.4, 6.0, flame=rgb('#e08a3c')),
        prop('brazier', 9.6, 10.6, flame=rgb('#e08a3c')),
        prop('brazier', 15.4, 10.6, flame=rgb('#e08a3c')),
        prop('pine', 2.2, 8.6, height_px=76, leaves=LEAF_FROST, snow=True),
        prop('pine', 23.0, 8.6, height_px=74, leaves=LEAF_FROST, snow=True),
        prop('pine', 6.0, 2.8, height_px=68, leaves=LEAF_FROST, snow=True),
        prop('pine', 18.6, 2.8, height_px=70, leaves=LEAF_FROST, snow=True),
        prop('crate', 12.0, 14.4),
        prop('crate', 12.8, 14.6),
        prop('barrel', 13.8, 14.4),
    ],
    npcs=[
        person('exile', 'Zimosław Wygnaniec', look(tunic='#4a5468', trim='#a8b8cc', pants='#333c4c', cloak='#5a6474', hat='hood', hat_color='#4a5464', beard=True, beard_color='#d8d2c4'), 12.5, 12.2),
        person('shaman', 'Szamanka Wiłna', look(tunic='#3a5a6a', trim='#9ee0e8', hair='#d8d2c4', hair_style='long', robe=True, held='staff', gem='#8ee0e8'), 9.4, 8.2),
        person('smith', 'Kowal Ostroga', look(tunic='#5a4a48', trim='#a8a2ae', pants='#3a3438', held='hammer', beard=True, skin='#c68a5e'), 6.6, 8.2),
        person('cat', 'Śnieżek', dict(color=rgb('#dce4ec')), 16.6, 8.4, sprite='cat'),
    ],
)


# --------------------------------------------------------------------------
# 10 — Zoryan: the marble citadel at the end of the road
# --------------------------------------------------------------------------

ZORYAN = dict(
    id=10,
    slug='zoryan',
    name='Zoryan',
    seed='zoryan-10',
    ground=ground('marble', ramp('#8f8aa4', '#9d98b0', '#aba6bc', '#b9b4c8', '#c7c2d4')),
    patches=[
        area('grass', ramp('#3f6a52', '#48765c', '#528266', '#5c8e71', '#679b7c'), points=[(0, 0), (25, 0), (25, 3.5), (0, 4)], rough=0.36, scale=12),
        area('marble', ramp('#c0b48c', '#cdc199', '#d9cea7', '#e4dab6', '#efe6c7'), points=[(7, 5), (18, 5), (19, 12), (6, 12)], rough=0.2, scale=20),
    ],
    plazas=[area('marble', ramp('#a8894c', '#b99a58', '#c9ab68', '#d8bd7e', '#e6d199'), rect=(9, 6, 7, 5), radius=12, rough=0.18, scale=22, kerb=rgb('#7a6438'))],
    roads=[
        road('marble', ramp('#c0bacc', '#cbc5d6', '#d6d0e0', '#e1dbea', '#ece6f4'), [(12.5, 16.4), (12.5, 11.4)], width=2.11),
        road('marble', ramp('#c0bacc', '#cbc5d6', '#d6d0e0', '#e1dbea', '#ece6f4'), [(5.4, 8.4), (9.2, 8.4)], width=1.58),
        road('marble', ramp('#c0bacc', '#cbc5d6', '#d6d0e0', '#e1dbea', '#ece6f4'), [(15.8, 8.4), (19.6, 8.4)], width=1.58),
    ],
    sites=[
        site('marble-gate', 'battle', 'Marmurowe Wrota', (1, 1, 4, 3), dict(kind='cave', color=rgb('#b0aab8'))),
        site('dawn-throne', 'battle', 'Tron Zorzy', (20, 1, 4, 3), dict(kind='cave', color=rgb('#a8a2b4'))),
        site('arena', 'arena', 'Arena', (19, 11, 5, 4), dict(kind='arena', sand=rgb('#e0d8c0'), wall=rgb('#a8a2b8'))),
        site('tough', 'toughenemy', 'Mocny przeciwnik', (1, 11, 3, 3), dict(kind='lair', ground=rgb('#6a6478'), bone=rgb('#f0ead8'))),
        site(
            'inn',
            'rest',
            'Gospoda Ostatniego Świtu',
            (17, 4, 4, 3),
            dict(kind='building', style=house('slate', 'marble', '#6f7cab', '#e2ddea', sign='mug', sign_side=-1, arched_door=True, banner=rgb('#c8a03c'))),
        ),
        site(
            'shop',
            'shop',
            'Skarbiec Zoryanu',
            (4, 4, 4, 3),
            dict(kind='building', style=house('tiles', 'marble', '#c8a03c', '#e2ddea', sign='coin', arched_door=True, banner=rgb('#7a5aa8'))),
        ),
        site('world', 'worldmap', 'Mapa Świata', (11, 1, 3, 2), dict(kind='portal', glow=rgb('#f0d888'), stone=rgb('#c0bacc'))),
    ],
    props=[
        prop('house', 9.5, 13.0, tiles_w=3, tiles_h=3, style=house('dome', 'marble', '#c8a03c', '#dfd9e8', arched_door=True)),
        prop('house', 15.5, 13.0, tiles_w=3, tiles_h=3, style=house('dome', 'marble', '#c8a03c', '#dfd9e8', arched_door=True)),
        prop('house', 7.0, 11.0, tiles_w=3, tiles_h=2, style=house('slate', 'marble', '#7a86b0', '#e4dfec')),
        prop('house', 18.0, 11.0, tiles_w=3, tiles_h=2, style=house('slate', 'marble', '#7a86b0', '#e4dfec')),
        prop('statue', 12.5, 9.0, stone=rgb('#e0dae8'), height_px=80),
        prop('obelisk', 8.0, 5.4),
        prop('obelisk', 17.0, 5.4),
        prop('lamp', 10.0, 6.6, glow=rgb('#ffe8a8')),
        prop('lamp', 15.0, 6.6, glow=rgb('#ffe8a8')),
        prop('lamp', 10.0, 11.4, glow=rgb('#ffe8a8')),
        prop('lamp', 15.0, 11.4, glow=rgb('#ffe8a8')),
        prop('crystal', 3.4, 8.6, color=rgb('#c8a8f0'), height_px=44),
        prop('crystal', 21.6, 8.6, color=rgb('#c8a8f0'), height_px=44),
        prop('crystal', 6.0, 15.4, color=rgb('#8ed0f0'), height_px=36),
        prop('crystal', 19.0, 15.4, color=rgb('#8ed0f0'), height_px=36),
        prop('tree', 2.4, 3.6, radius=26, leaves=LEAF_PALE),
        prop('tree', 22.6, 3.6, radius=26, leaves=LEAF_PALE),
        prop('tree', 7.6, 2.8, radius=22, leaves=LEAF_PALE),
        prop('tree', 17.4, 2.8, radius=22, leaves=LEAF_PALE),
        prop('bush', 10.4, 5.2, size=20, leaves=LEAF_PALE),
        prop('bush', 14.6, 5.2, size=20, leaves=LEAF_PALE),
        prop('flowers', 11.0, 12.2, color=rgb('#f0d888')),
        prop('flowers', 14.0, 12.2, color=rgb('#c8a8f0')),
        prop('wall', 4.0, 16.4, length_px=140),
        prop('wall', 21.0, 16.4, length_px=140),
    ],
    npcs=[
        person('warden', 'Strażniczka Jutrzenka', look(tunic='#d8c884', trim='#fff0c0', hair='#c09858', hair_style='long', cloak='#7a5aa8', hat='crown', held='spear'), 12.5, 12.4),
        person('master', 'Mistrz Wid', look(tunic='#5a4a8a', trim='#c8b4f0', robe=True, hair='#d8d2c4', beard=True, beard_color='#d8d2c4', held='staff', gem='#f0d888'), 9.4, 8.6),
        person('herald', 'Herold Blask', look(tunic='#c8a03c', trim='#fff0c0', pants='#5a4a2c', hat='cap', hat_color='#a8842c', held='book', held_color='#7a5aa8'), 15.8, 8.6),
        person('guard', 'Straż Świtu', look(tunic='#e0dae8', trim='#c8a03c', pants='#a8a2b8', hat='helm', hat_color='#e8e2f0', held='spear'), 12.5, 4.4),
    ],
)


TOWNS = [OLSZAWA, RUDZIN, WIELGRAD, CZARNOBOR, SOLWAR, NIHRAST, ZHURMAT, GRZMIEL, ISMERIA, ZORYAN]
