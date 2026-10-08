"""Poly Haven's CC0 models, fetched once into .room-cache/ and imported as glTF.

https://polyhaven.com/license: CC0, no attribution required (credited on the
site anyway).
"""

import json
import os
import urllib.request

import bpy

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CACHE = os.path.join(ROOT, ".room-cache", "polyhaven")
API = "https://api.polyhaven.com/files/"


def _get(url, path):
    if os.path.exists(path) and os.path.getsize(path) > 0:
        return path
    os.makedirs(os.path.dirname(path), exist_ok=True)
    req = urllib.request.Request(url, headers={"User-Agent": "jasper-portfolio-room/1.0"})
    with urllib.request.urlopen(req, timeout=60) as r, open(path + ".part", "wb") as f:
        f.write(r.read())
    os.replace(path + ".part", path)
    return path


def fetch(asset_id, res="1k"):
    """Download an asset's glTF and everything it includes; returns the .gltf path."""
    folder = os.path.join(CACHE, asset_id, res)
    gltf = os.path.join(folder, f"{asset_id}_{res}.gltf")
    if os.path.exists(gltf):
        return gltf
    meta_path = os.path.join(CACHE, asset_id, "files.json")
    _get(API + asset_id, meta_path)
    with open(meta_path) as f:
        files = json.load(f)
    entry = files["gltf"].get(res) or files["gltf"][sorted(files["gltf"])[0]]
    main = entry["gltf"]
    for rel, inc in main.get("include", {}).items():
        _get(inc["url"], os.path.join(folder, rel))
    _get(main["url"], gltf)
    return gltf


def import_asset(asset_id, res="1k"):
    """Import an asset into the scene; returns the new objects."""
    path = fetch(asset_id, res)
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    new = [o for o in bpy.data.objects if o not in before]
    for o in new:
        o["asset"] = asset_id
    return new
