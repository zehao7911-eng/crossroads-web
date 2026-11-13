"""Export the archived Roblox place's Workspace without running any scripts."""
import json
from pathlib import Path
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent
GROUPS = {'Room', 'Overhead Ramp', 'Trees', 'Tower', 'LockedHillBricks', 'Hideout', 'BlackRock', 'MudHill', 'LostTemple', 'BlackrockCastle'}


def field(node, name, default=None):
    return node.findtext(f'Properties/*[@name="{name}"]', default)


def components(node, names):
    return [round(float(node.findtext(name)), 5) for name in names]


def export():
    root = ET.parse(ROOT / 'roblox/Crossroads.rbxl').getroot()
    workspace = root.find('Item[@class="Workspace"]')
    parts, spawns = [], []
    for item in workspace.findall('Item'):
        group = field(item, 'Name')
        kind = item.get('class')
        if group not in GROUPS and kind != 'SpawnLocation' and not group.startswith('TeamBeacon'):
            continue
        for node in item.iter('Item'):
            kind = node.get('class')
            if kind not in ('Part', 'WedgePart', 'SpawnLocation'):
                continue
            props = node.find('Properties')
            frame = props.find('CoordinateFrame[@name="CFrame"]')
            size = props.find('Vector3[@name="size"]')
            xyz = components(frame, 'XYZ')
            shape = 'wedge' if kind == 'WedgePart' else {'0': 'ball', '1': 'box', '2': 'cylinder'}[field(node, 'shape', '1')]
            opacity = 1 - round(float(field(node, 'Transparency', '0')), 4)
            if kind == 'SpawnLocation':
                spawns.append(xyz)
            parts.append([
                group, field(node, 'Name'), shape, xyz, components(size, 'XYZ'),
                components(frame, [f'R{i}{j}' for i in range(3) for j in range(3)]),
                int(field(node, 'BrickColor', '194')), opacity, field(node, 'CanCollide', 'true') == 'true',
                field(node, 'Anchored', 'false') == 'true',
            ])
    assert len(parts) >= 1600 and len(spawns) >= 6
    return {'parts': parts, 'spawns': spawns}


if __name__ == '__main__':
    data = export()
    (ROOT / 'map.mjs').write_text('export const MAP = ' + json.dumps(data, separators=(',', ':')) + ';\n', encoding='utf-8')
    print(f'{len(data["parts"])} original parts and {len(data["spawns"])} spawn points exported')
