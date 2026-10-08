"""The room's light: a late-morning sun through the windows, a soft sky
beyond them, the warm practicals inside (the desk lamp, screens, LEDs come
from their own emissive materials). Tuned for the bake; the previews use it
as is."""

import math

import bpy

from space import T


def _world(strength=0.55):
    w = bpy.data.worlds.new("sky")
    w.use_nodes = True
    bg = w.node_tree.nodes["Background"]
    # a warm, pale sky: it fills the shadows through the windows and the
    # open sides with soft light
    bg.inputs["Color"].default_value = (1.0, 0.86, 0.7, 1)
    bg.inputs["Strength"].default_value = strength
    bpy.context.scene.world = w


def _light(name, kind, at, energy, color, **o):
    data = bpy.data.lights.new(name, kind)
    data.energy = energy
    data.color = color
    for k, v in o.items():
        setattr(data, k, v)
    obj = bpy.data.objects.new(name, data)
    obj.location = T(*at)
    bpy.context.scene.collection.objects.link(obj)
    return obj


def aim(obj, target):
    d = T(*target) - obj.location
    obj.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()


def setup():
    """The bible's L1 and L2: the low golden sun through the two clerestory
    windows, and a pale sky beyond them. The practicals (desk lamp, LED
    strips, rack glow, candle, screens) belong to their objects' modules."""
    _world(0.14)
    w = bpy.context.scene.world.node_tree.nodes["Background"]
    # a pale evening sky: only faintly cool, so shadows stay warm as in the design
    w.inputs["Color"].default_value = (0.78, 0.8, 0.86, 1)
    sun = _light("sun", "SUN", (0, 0, 0), 4.5, (1.0, 0.72, 0.44), angle=math.radians(1.2))
    # from the sun toward the room: (-0.55, -0.42, -0.72) in site axes
    d = T(-0.55, -0.42, -0.72).normalized()
    sun.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
    # a faint warm fill from the open front, so the room's front never goes
    # black where neither window reaches
    fill = _light("fill", "AREA", (1.0, 3.6, 8.0), 70, (1.0, 0.84, 0.66), shape="RECTANGLE", size=7, size_y=4)
    aim(fill, (2.8, 0.9, 1.6))
    # the sun leaves the right wall in its own shadow: a warm bounce, as off
    # the sunlit floor, lifts it so the board and the sail read
    bounce = _light("bounce", "AREA", (3.2, 1.4, 2.6), 80, (1.0, 0.76, 0.5), shape="RECTANGLE", size=1.6, size_y=1.6)
    aim(bounce, (5.6, 1.3, 2.3))


# The room's own lights (the lamp, the shelf strips, the rack, the candle)
# against the daylight: the design is a golden hour where the practicals
# carry the mood, so they are pushed well past their real wattage.
PRACTICAL = 3.0
DAYLIGHT = {"sun", "fill", "bounce"}


def grade():
    """Scale every practical light the modules made, in one place."""
    for o in bpy.context.scene.objects:
        if o.type == "LIGHT" and o.name not in DAYLIGHT:
            o.data.energy *= PRACTICAL
