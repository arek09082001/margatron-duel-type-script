"""One palette per gear tier, plus the tones every tier shares.

The ramps are read off the icons the game already shipped, so a regenerated
`t03_sword.png` lands on the same steel blue it always had. Each tier gives
five metal tones (dark to light), a cloth ramp for robes and gambesons, an
accent for gems and glows, and the gold trim that ties the whole set together.
"""

from __future__ import annotations

from dataclasses import dataclass

from pixelart import Color, ramp, rgb

# Shared across every tier: a haft is wood whatever the blade is made of, and
# leather straps never take the tier's colour either.
WOOD = ramp('#3a2a1c', '#4a3526', '#6b4d33', '#8a6845')
LEATHER = ramp('#2e2119', '#4a3526', '#6b5a4a', '#8a7563')
CORD = rgb('#5a4632')
SHADOW = rgb('#1a1418')


@dataclass(frozen=True)
class TierPalette:
    """Everything a tier's icons are allowed to be coloured with."""

    slug: str
    #: Five metal tones, darkest first. Index 1 is the body, 3 the lit edge.
    metal: list[Color]
    #: Four cloth tones for robes, gambesons and cloaks.
    cloth: list[Color]
    #: Gems, runes, glows — the one saturated colour of the tier.
    accent: Color
    #: The lit face of `accent`, for a one-pixel specular.
    accent_light: Color
    #: Guards, rims, buckles.
    trim: Color
    trim_light: Color

    @property
    def dark(self) -> Color:
        return self.metal[0]

    @property
    def body(self) -> Color:
        return self.metal[1]

    @property
    def mid(self) -> Color:
        return self.metal[2]

    @property
    def light(self) -> Color:
        return self.metal[3]

    @property
    def bright(self) -> Color:
        return self.metal[4]


def _tier(
    slug: str,
    metal: list[str],
    cloth: list[str],
    accent: str,
    accent_light: str,
    trim: str = '#a8862c',
    trim_light: str = '#e0c060',
) -> TierPalette:
    return TierPalette(
        slug=slug,
        metal=ramp(*metal),
        cloth=ramp(*cloth),
        accent=rgb(accent),
        accent_light=rgb(accent_light),
        trim=rgb(trim),
        trim_light=rgb(trim_light),
    )


#: Tier 1 is rust and raw hide; tier 10 is polished gold. In between the metal
#: walks iron -> steel -> silver -> crystal -> obsidian -> dragon -> demon ->
#: wraith, matching the adjective each tier carries in `gear.ts`.
TIERS: list[TierPalette] = [
    _tier(
        'rusty',
        ['#241a14', '#4a3526', '#6b5a4a', '#8a7563', '#a89078'],
        ['#3d3225', '#5c4a33', '#7a6446', '#96805c'],
        '#8a6a2c',
        '#c9a349',
        trim='#8a6a2c',
        trim_light='#a8862c',
    ),
    _tier(
        'iron',
        ['#1c2026', '#3d4249', '#5c636d', '#7e8794', '#a4adba'],
        ['#33302a', '#4f4a40', '#6d6657', '#8a8270'],
        '#a8862c',
        '#e0c060',
    ),
    _tier(
        'steel',
        ['#161d26', '#33414f', '#4d6579', '#6f8ca3', '#a4cadf'],
        ['#2b3540', '#43525f', '#5e7183', '#8098aa'],
        '#5fa8d6',
        '#a4cadf',
    ),
    _tier(
        'silver',
        ['#1f222a', '#4a4f5c', '#767d8e', '#a3aabb', '#d2d8e4'],
        ['#3a3548', '#575265', '#7a7590', '#a09ab4'],
        '#c9b3f0',
        '#efe6ff',
        trim='#c8a83c',
        trim_light='#e8c860',
    ),
    _tier(
        'crystal',
        ['#08262b', '#14484f', '#1e5f6b', '#1d7d86', '#35b3bd'],
        ['#123840', '#1c5259', '#2a6d74', '#3d8f96'],
        '#4fe0e6',
        '#c2fbff',
    ),
    _tier(
        'obsidian',
        ['#0b0910', '#22182c', '#2c2440', '#463a63', '#6b5a96'],
        ['#1a1424', '#2c2440', '#433764', '#5f4f8a'],
        '#9a4fd6',
        '#d9a8ff',
    ),
    _tier(
        'dragon',
        ['#1a0808', '#3d1414', '#7a2020', '#b83232', '#e06a5a'],
        ['#2c1210', '#4a1e18', '#6b2e22', '#8f4632'],
        '#f0a03a',
        '#ffe0a0',
        trim='#8a5a10',
        trim_light='#e8c860',
    ),
    _tier(
        'demonic',
        ['#14060a', '#2a0d12', '#5c1622', '#8f2436', '#d64a4a'],
        ['#200c12', '#3a141c', '#57202c', '#7a3040'],
        '#ff6a2a',
        '#ffc48a',
        trim='#8f2a10',
        trim_light='#e8a050',
    ),
    _tier(
        'spectral',
        ['#101a22', '#243138', '#334a5c', '#635a6e', '#a4c2d8'],
        ['#1c2830', '#2e3f4c', '#455c6b', '#6d92a8'],
        '#8fe4ff',
        '#dff6ff',
        trim='#7a94a8',
        trim_light='#dff6ff',
    ),
    _tier(
        'elysian',
        ['#2b2110', '#5a4a1e', '#8a6a1c', '#c0a040', '#fff3c0'],
        ['#3a3018', '#5c4c22', '#8a7434', '#b8a05c'],
        '#ffe680',
        '#fffbe0',
        trim='#c0a040',
        trim_light='#fff3c0',
    ),
]


def tier(index: int) -> TierPalette:
    """`index` is 1-based, the way the gear tiers are numbered in the game."""
    return TIERS[index - 1]
