"""Turns a town layout into a map image plus the coordinates the game needs.

A town is described once, in tiles. This module renders it and hands back the
click rectangles, so `src/game/catalog.ts` and the PNG can never disagree
about where the blacksmith is.

Draw order is painter's algorithm on the ground line: whatever stands further
down the map is drawn last and overlaps what is behind it.
"""

from __future__ import annotations

from PIL import Image, ImageDraw, ImageEnhance

import sprites as S
from pixelart import (
    MAP_H,
    MAP_W,
    TILE,
    Rng,
    ash_texture,
    blit,
    cast_shadow,
    cobble_texture,
    dirt_texture,
    grass_texture,
    ground_blit,
    marble_texture,
    path_shape,
    polygon_shape,
    ragged_mask,
    rect_shape,
    rim,
    rock_texture,
    sand_texture,
    shade,
    snow_texture,
    water_texture,
)

TEXTURES = {
    'grass': grass_texture,
    'dirt': dirt_texture,
    'sand': sand_texture,
    'snow': snow_texture,
    'rock': rock_texture,
    'ash': ash_texture,
    'cobble': cobble_texture,
    'marble': marble_texture,
    'water': water_texture,
}


def px(tiles: float) -> int:
    return round(tiles * TILE)


# --------------------------------------------------------------------------
# layout authoring helpers
# --------------------------------------------------------------------------


def site(id: str, role: str, name: str, tile, art: dict) -> dict:
    """A clickable place. `tile` is `(x, y, w, h)` in tiles, top-left based."""
    return {'id': id, 'role': role, 'name': name, 'tile': tile, 'art': art}


def prop(kind: str, x: float, y: float, **kwargs) -> dict:
    """Scenery standing at tile `(x, y)` — `y` is the ground line, not the top."""
    return {'kind': kind, 'x': x, 'y': y, 'args': kwargs}


def person(id: str, name: str, look: dict, x: float, y: float, sprite: str = 'character') -> dict:
    """A townsperson whose feet rest on tile `(x, y)`."""
    return {'id': id, 'name': name, 'look': look, 'x': x, 'y': y, 'sprite': sprite}


def ground(kind: str, palette, **kwargs) -> dict:
    return {'kind': kind, 'palette': palette, 'args': kwargs}


def area(kind: str, palette, points=None, rect=None, rough: float = 0.3, scale: int = 16, **kwargs) -> dict:
    return {'kind': kind, 'palette': palette, 'points': points, 'rect': rect, 'rough': rough, 'scale': scale, **kwargs}


def road(kind: str, palette, points, width: float = 2.0, rough: float = 0.22, **kwargs) -> dict:
    return {'kind': kind, 'palette': palette, 'points': points, 'width': width, 'rough': rough, **kwargs}


# --------------------------------------------------------------------------
# scenery dispatch
# --------------------------------------------------------------------------


def _house_prop(rng: Rng, tiles_w: int = 3, tiles_h: int = 3, style: dict | None = None) -> Image.Image:
    """A building nobody can click — the rest of the town around the sites."""
    return S.building(rng, tiles_w, tiles_h, style or {})


PROPS = {
    'house': _house_prop,
    'tree': S.tree_round,
    'pine': S.tree_pine,
    'palm': S.tree_palm,
    'dead_tree': S.tree_dead,
    'bush': S.bush,
    'rock': S.rock,
    'barrel': S.barrel,
    'crate': S.crate,
    'sack': S.sack,
    'haystack': S.haystack,
    'well': S.well,
    'fountain': S.fountain,
    'statue': S.statue,
    'campfire': S.campfire,
    'brazier': S.brazier,
    'stall': S.market_stall,
    'signpost': S.signpost,
    'lamp': S.lamp_post,
    'fence': S.fence,
    'palisade': S.palisade,
    'wall': S.stone_wall,
    'gate': S.gate_arch,
    'dock': S.dock,
    'boat': S.boat,
    'cart': S.cart,
    'flowers': S.flowers,
    'grave': S.gravestone,
    'obelisk': S.obelisk,
    'crystal': S.crystal,
    'cactus': S.cactus,
    'ice_spike': S.ice_spike,
}

# Props that sit flat on the ground rather than standing up in front of what
# is behind them — no cast shadow, and no silhouette to respect.
FLAT_PROPS = {'dock', 'flowers', 'fence', 'palisade', 'wall'}

SITE_ART = {
    'cave': S.cave_mouth,
    'arena': S.arena_ring,
    'lair': S.tough_lair,
    'portal': S.portal_stones,
    'gate': S.gate_arch,
}


def _site_sprite(rng: Rng, entry: dict) -> tuple[Image.Image, int, int]:
    """Renders a site's art and returns it with its top-left offset in pixels."""
    x, y, w, h = entry['tile']
    art = entry['art']
    kind = art['kind']
    args = {key: value for key, value in art.items() if key != 'kind'}

    if kind == 'building':
        style = args.pop('style', {})
        image = S.building(rng, w, h, style)
        return image, px(x) - S.PAD, px(y) - S.PAD

    # Landmarks fill their tiles exactly, so the click frame traces the art.
    image = SITE_ART[kind](rng, px(w), px(h), **args)
    return image, px(x), px(y)


def tile_align(sprite: Image.Image) -> Image.Image:
    """Pads a sprite out to whole tiles, standing on the bottom edge.

    Tile-based art reads as tile-based because every object owns a whole
    number of cells. Padding here — rather than sizing each prop by hand —
    means the drawing code stays free to pick whatever silhouette it wants.
    """
    width = -(-sprite.width // TILE) * TILE
    height = -(-sprite.height // TILE) * TILE
    if (width, height) == sprite.size:
        return sprite
    padded = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    padded.alpha_composite(sprite, ((width - sprite.width) // 2, height - sprite.height))
    return padded


# --------------------------------------------------------------------------
# rendering
# --------------------------------------------------------------------------


def _texture(rng: Rng, spec: dict) -> Image.Image:
    return TEXTURES[spec['kind']](rng, spec['palette'], MAP_W, MAP_H, **spec.get('args', {}))


def _mask_for(rng: Rng, spec: dict) -> Image.Image:
    if spec.get('points'):
        shape = polygon_shape([(px(x), px(y)) for x, y in spec['points']])
    else:
        x, y, w, h = spec['rect']
        shape = rect_shape(px(x), px(y), px(w), px(h), radius=spec.get('radius', 0))
    return ragged_mask(rng, shape, roughness=spec.get('rough', 0.3), scale=spec.get('scale', 16))


def render(town: dict) -> tuple[Image.Image, dict]:
    """Draws the town and returns `(image, exported coordinates)`."""
    rng = Rng(town['seed'])
    canvas = _texture(rng.child('ground'), town['ground']).convert('RGBA')

    for index, patch in enumerate(town.get('patches', [])):
        texture = _texture(rng.child(f'patch{index}'), patch).convert('RGBA')
        canvas.paste(texture, (0, 0), _mask_for(rng.child(f'patchmask{index}'), patch))

    for index, body in enumerate(town.get('water', [])):
        mask = _mask_for(rng.child(f'watermask{index}'), body)
        if body.get('shore'):
            shore = _texture(rng.child(f'shore{index}'), {'kind': 'sand', 'palette': body['shore']}).convert('RGBA')
            canvas.paste(shore, (0, 0), rim(mask, body.get('shore_width', 7)))
        texture = _texture(rng.child(f'water{index}'), body).convert('RGBA')
        canvas.paste(texture, (0, 0), mask)
        edge = Image.new('RGBA', canvas.size, (*shade(body['palette'][-1], 1.45), 150))
        canvas.paste(edge, (0, 0), rim(mask, 3, outside=False))

    for index, lane in enumerate(town.get('roads', [])):
        shape = path_shape([(px(x), px(y)) for x, y in lane['points']], px(lane['width']))
        mask = ragged_mask(rng.child(f'roadmask{index}'), shape, roughness=lane.get('rough', 0.14), scale=30)
        texture = _texture(rng.child(f'road{index}'), lane).convert('RGBA')
        canvas.paste(texture, (0, 0), mask)
        if lane.get('kerb'):
            kerb = Image.new('RGBA', canvas.size, (*lane['kerb'], 210))
            canvas.paste(kerb, (0, 0), rim(mask, 3, outside=False))

    for index, plaza in enumerate(town.get('plazas', [])):
        mask = _mask_for(rng.child(f'plazamask{index}'), plaza)
        texture = _texture(rng.child(f'plaza{index}'), plaza).convert('RGBA')
        canvas.paste(texture, (0, 0), mask)
        if plaza.get('kerb'):
            kerb = Image.new('RGBA', canvas.size, (*plaza['kerb'], 220))
            canvas.paste(kerb, (0, 0), rim(mask, 3, outside=False))

    # Everything with a footprint goes into one list and is drawn bottom-last.
    drawables: list[tuple[float, str, dict]] = []
    for entry in town['sites']:
        drawables.append((entry['tile'][1] + entry['tile'][3], 'site', entry))
    for entry in town.get('props', []):
        drawables.append((entry['y'], 'prop', entry))
    drawables.sort(key=lambda item: item[0])

    for _, kind, entry in drawables:
        if kind == 'site':
            image, ox, oy = _site_sprite(rng.child(entry['id']), entry)
            if entry['art']['kind'] != 'building':
                cast_shadow(canvas, ox + image.width / 2, oy + image.height - 4, image.width * 0.9, 12, 60)
            blit(canvas, image, ox, oy)
        else:
            maker = PROPS[entry['kind']]
            image = tile_align(maker(rng.child(f"{entry['kind']}{entry['x']}{entry['y']}"), **entry['args']))
            tiles_w, tiles_h = image.width // TILE, image.height // TILE
            # Snap onto the tile grid: authored positions say roughly where a
            # thing stands, the grid decides exactly where it sits.
            left = round(entry['x'] - tiles_w / 2)
            top = (round(entry['y'] + (S.PAD / TILE if entry['kind'] == 'house' else 0)) - tiles_h)
            if entry['kind'] not in FLAT_PROPS and entry['kind'] != 'house':
                cast_shadow(canvas, px(left + tiles_w / 2), px(top + tiles_h) - 3, image.width * 0.60, 10, 66)
            blit(canvas, image, px(left), px(top))

    # No vignette: the map frame already casts `inset 0 0 50px #000` in CSS,
    # and a baked gradient is the one thing that always reads as a painting.
    #
    # The muting is deliberate. Reference town art sits in a narrow, dusty
    # band — olive greens, grey-purple stone, tan roads — and full-strength
    # hues are what make a generated map look like a toy next to it.
    flat = ImageEnhance.Color(canvas.convert('RGB')).enhance(town.get('saturation', 0.74))
    return flat, export(town)


def export(town: dict) -> dict:
    """The numbers `catalog.ts` needs: click rectangles and NPC anchors."""
    locations = []
    for entry in town['sites']:
        x, y, w, h = entry['tile']
        locations.append(
            {
                'id': entry['id'],
                'role': entry['role'],
                'name': entry['name'],
                # `.map-location` is translate(-50%, -50%), so the game wants
                # the centre of the box, in tiles.
                'x': round(x + w / 2, 3),
                'y': round(y + h / 2, 3),
                'w': w,
                'h': h,
            }
        )

    people = []
    for entry in town.get('npcs', []):
        width, height = (32, 48) if entry['sprite'] == 'character' else SPRITE_SIZES[entry['sprite']]
        people.append(
            {
                'id': entry['id'],
                'name': entry['name'],
                'file': f"{town['slug']}-{entry['id']}.png",
                # NPCs are positioned by their top-left corner in tiles.
                'x': round((px(entry['x']) - width / 2) / TILE, 4),
                'y': round((px(entry['y']) - height) / TILE, 4),
                'width': width,
                'height': height,
            }
        )

    return {'slug': town['slug'], 'name': town['name'], 'locations': locations, 'npcs': people}


SPRITE_SIZES = {'character': (32, 48), 'dog': (26, 22), 'cat': (20, 18), 'campfire': (32, 32)}

NPC_SPRITES = {'character': S.character, 'dog': S.dog, 'cat': S.cat, 'campfire': S.campfire}


def render_npcs(town: dict) -> dict[str, Image.Image]:
    """One PNG per townsperson — the game overlays them on the map itself."""
    out = {}
    for entry in town.get('npcs', []):
        rng = Rng(f"{town['seed']}:{entry['id']}")
        maker = NPC_SPRITES[entry['sprite']]
        image = maker(rng, entry['look']) if entry['sprite'] == 'character' else maker(rng, **entry['look'])
        out[f"{town['slug']}-{entry['id']}.png"] = image
    return out
