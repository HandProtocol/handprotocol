#!/usr/bin/env blender --background hex_toilet.blend --python hex_views.py
"""Render the hexagonal toilet from several angles.

    blender --background rr/blender/hex_toilet.blend --python rr/blender/hex_views.py < /dev/null
"""
import bpy
import os
import math

HERE = os.path.dirname(os.path.abspath(__file__))
RENDER_DIR = os.path.join(HERE, "renders")
os.makedirs(RENDER_DIR, exist_ok=True)
FT = 0.3048

scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"
scene.cycles.samples = 90
scene.cycles.use_denoising = True

target = bpy.data.objects.get("CamTarget")
if target is None:
    target = bpy.data.objects.new("CamTarget", None)
    bpy.context.collection.objects.link(target)


def shoot(name, location, look=(0, 0, 4.6), lens=34, ortho=None, res=(1400, 1050)):
    target.location = (look[0]*FT, look[1]*FT, look[2]*FT)
    cam_data = bpy.data.cameras.new(name)
    if ortho:
        cam_data.type = "ORTHO"
        cam_data.ortho_scale = ortho
    else:
        cam_data.lens = lens
    cam = bpy.data.objects.new(name, cam_data)
    bpy.context.collection.objects.link(cam)
    cam.location = (location[0]*FT, location[1]*FT, location[2]*FT)
    c = cam.constraints.new(type="TRACK_TO")
    c.target = target
    c.track_axis = "TRACK_NEGATIVE_Z"
    c.up_axis = "UP_Y"
    bpy.context.view_layer.update()
    scene.camera = cam
    scene.render.resolution_x, scene.render.resolution_y = res
    scene.render.filepath = os.path.join(RENDER_DIR, f"hex_toilet_{name}.png")
    bpy.ops.render.render(write_still=True)
    print(f"[RR] view '{name}' -> {scene.render.filepath}")


# Front elevation (straight on the door)
shoot("front", (0, -17, 4.6), look=(0, 0, 4.6), lens=42)
# Profile / side — reads the toroidal roof curve
shoot("side", (18, 0, 5.2), look=(0, 0, 5.0), lens=44)
# Back 3/4 — roof slopes, oculus, metal connectors
shoot("back", (-8, 13, 7.5), look=(0, 1.0, 5.2), lens=33)
# High aerial 3/4 — the toroidal roof + oculus throat
shoot("aerial", (10, -10, 16), look=(0, 0, 5.5), lens=40)
# Plan / top-down — hexagon footprint + central oculus
shoot("top", (0.01, 0, 60), look=(0, 0, 3), ortho=10.5)

print("[RR] hex views DONE")
