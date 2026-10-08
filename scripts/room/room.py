"""Build the About room in Blender, and preview, bake or export it.

    blender -b --factory-startup --python scripts/room/room.py -- <command> [options]

Commands:
    preview   render the room (or part of it) to a PNG to look at
              --view overview | <story id> | x,y,z:tx,ty,tz   (site coordinates)
              --only werk,decor_plants,...   build only these modules
              --engine eevee | cycles   --samples N   --res 1600x900
              --out path.png
    save      build and save a .blend to look at in Blender  (--out path.blend)
    bake      build, bake the light into textures            (see bake.py)
    export    bake and write public/room/room.glb            (see export.py)

Modules: shell.py and light.py, every pieces/<story>.py and decor/<name>.py.
Each has `build(k)`, k being the Kit (kit.py).
"""

import argparse
import importlib
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import bpy  # noqa: E402

import light  # noqa: E402
from kit import Kit  # noqa: E402
from space import OVERVIEW, T, orbit  # noqa: E402

STORIES = ["werk", "homelab", "windsurfen", "mountainbiken", "wielrennen", "motorrijden", "groei", "skien", "gamen"]


def modules():
    """Every module that builds part of the room, by name."""
    names = ["shell"]
    names += [f"pieces.{s}" for s in STORIES if os.path.exists(os.path.join(HERE, "pieces", f"{s}.py"))]
    decor = os.path.join(HERE, "decor")
    names += [f"decor.{f[:-3]}" for f in sorted(os.listdir(decor)) if f.endswith(".py") and not f.startswith("_")]
    return names


def build(only=None):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    light.setup()
    k = Kit()
    for name in modules():
        short = name.split(".")[-1]
        if only and short not in only and name not in only and not (short == "shell" and "shell" in only):
            continue
        mod = importlib.import_module(name)
        mod.build(k)
    light.grade()
    return k


def camera(view, res):
    """A camera at the overview, at a story's close-up, or at x,y,z:tx,ty,tz."""
    w, h = res
    scene = bpy.context.scene
    scene.render.resolution_x, scene.render.resolution_y = w, h
    cam_data = bpy.data.cameras.new("cam")
    cam_data.sensor_fit = "VERTICAL"
    cam_data.angle_y = __import__("math").radians(OVERVIEW["fov"])
    cam = bpy.data.objects.new("cam", cam_data)
    scene.collection.objects.link(cam)
    scene.camera = cam
    target = OVERVIEW["target"]
    pos = orbit(target, OVERVIEW["azimuth"], OVERVIEW["elevation"], OVERVIEW["distance"])
    if view in STORIES:
        e = bpy.data.objects.get(f"view_{view}")
        if e is None:
            raise SystemExit(f"no view_{view} marker: set k.view('{view}', target, offset) in its module")
        loc = e.location
        target = (loc.x, loc.z, -loc.y)
        off = e["offset"]
        pos = (target[0] + off[0], target[1] + off[1], target[2] + off[2])
        if "fov" in e:
            cam_data.angle_y = __import__("math").radians(e["fov"])
    elif view != "overview":
        a, b = view.split(":")
        pos = tuple(float(v) for v in a.split(","))
        target = tuple(float(v) for v in b.split(","))
    cam.location = T(*pos)
    d = T(*target) - cam.location
    cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()


def render(engine, samples, out):
    scene = bpy.context.scene
    scene.render.film_transparent = True
    scene.view_settings.view_transform = "AgX"
    scene.view_settings.look = "AgX - Medium High Contrast"
    if engine == "cycles":
        scene.render.engine = "CYCLES"
        prefs = bpy.context.preferences.addons["cycles"].preferences
        prefs.compute_device_type = "METAL"
        prefs.get_devices()
        for d in prefs.devices:
            d.use = True
        scene.cycles.device = "GPU"
        scene.cycles.samples = samples
        scene.cycles.use_denoising = True
    else:
        scene.render.engine = "BLENDER_EEVEE"
        scene.eevee.taa_render_samples = samples
        scene.eevee.use_raytracing = True
        scene.eevee.use_shadows = True
    scene.render.filepath = out
    bpy.ops.render.render(write_still=True)


def main():
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    ap = argparse.ArgumentParser(prog="room.py")
    ap.add_argument("command", choices=["preview", "save", "bake", "export"])
    ap.add_argument("--view", default="overview")
    ap.add_argument("--only", default="")
    ap.add_argument("--engine", default="eevee")
    ap.add_argument("--samples", type=int, default=32)
    ap.add_argument("--res", default="1600x900")
    ap.add_argument("--out", default=os.path.join(HERE, "..", "..", ".room-cache", "preview.png"))
    ap.add_argument("--groups", default="", help="bake only these collections (e.g. story_werk), for a quick look")
    a = ap.parse_args(argv)
    only = set(filter(None, a.only.split(",")))
    build(only or None)
    if a.command == "preview":
        camera(a.view, tuple(int(v) for v in a.res.split("x")))
        render(a.engine, a.samples, os.path.abspath(a.out))
    elif a.command == "save":
        bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(a.out))
    elif a.command in ("bake", "export"):
        import bake

        baked = bake.bake_all(HERE, set(filter(None, a.groups.split(","))) or None)
        if a.command == "export":
            import export

            export.write(baked, HERE)


if __name__ == "__main__":
    main()
