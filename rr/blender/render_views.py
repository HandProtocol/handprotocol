#!/usr/bin/env blender --background --python
"""
Reimagine Ranch — Compost Latrine: extra orthographic views.

Opens compost_latrine.blend and renders a top (plan) view and a front elevation to
complement the main 3/4 iso. Each camera aims at a shared target via a TRACK_TO
constraint (reliable across Blender versions — raw rotation_euler on a fresh camera
proved flaky and produced duplicate frames).

    blender --background rr/blender/compost_latrine.blend --python rr/blender/render_views.py < /dev/null
"""
import bpy, os

HERE = os.path.dirname(os.path.abspath(__file__))
RENDER_DIR = os.path.join(HERE, "renders")
os.makedirs(RENDER_DIR, exist_ok=True)
FT = 0.3048

scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"
scene.cycles.samples = 80
scene.cycles.use_denoising = True

# Shared aim point near the centre of the build, a little above the deck.
target = bpy.data.objects.get("CamTarget")
if target is None:
    target = bpy.data.objects.new("CamTarget", None)
    bpy.context.collection.objects.link(target)
target.location = (8.0 * FT, 6.0 * FT, 3.0 * FT)


def shoot(name, location, ortho_scale, res=(1400, 1000)):
    cam_data = bpy.data.cameras.new(name)
    cam_data.type = "ORTHO"
    cam_data.ortho_scale = ortho_scale
    cam = bpy.data.objects.new(name, cam_data)
    bpy.context.collection.objects.link(cam)
    cam.location = location
    c = cam.constraints.new(type="TRACK_TO")
    c.target = target
    c.track_axis = "TRACK_NEGATIVE_Z"
    c.up_axis = "UP_Y"
    # Force the constraint to evaluate before rendering.
    bpy.context.view_layer.update()
    scene.camera = cam
    scene.render.resolution_x, scene.render.resolution_y = res
    scene.render.filepath = os.path.join(RENDER_DIR, f"compost_latrine_{name}.png")
    bpy.ops.render.render(write_still=True)
    print(f"[RR] view '{name}' -> {scene.render.filepath}")


# Plan: straight down the Z axis (target directly below) -> top-down footprint.
shoot("plan", (8.0 * FT, 6.0 * FT, 60.0 * FT), ortho_scale=12.5)

# Front elevation: far out on -Y, low, looking toward +Y at the front face + ramp.
shoot("front", (8.0 * FT, -50.0 * FT, 5.0 * FT), ortho_scale=13.5)

print("[RR] views DONE")
