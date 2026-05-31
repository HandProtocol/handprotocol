#!/usr/bin/env blender --background --python louver_panel.py
"""
Reimagine Ranch — Louvered cedar wall panel (massing).

Recreates the framed horizontal-louver shutter panel in the reference photo: a light
construction-lumber frame (two side posts with little horns up top, a top rail, an open
base frame at the bottom) filled with closely-spaced ANGLED cedar louver blades.

This is the standalone panel. It will become one of 3 walls (with a curved metal sheet)
in a later step — perfect the panel first.

    blender --background --python rr/blender/louver_panel.py < /dev/null            # build + render
    blender --background --python rr/blender/louver_panel.py -- --no-render < /dev/null

All authored dimensions in FEET. Tweakable knobs are grouped under PANEL below.
"""
import bpy
import math
import os
import sys

FT = 0.3048
HERE = os.path.dirname(os.path.abspath(__file__))
RENDER_DIR = os.path.join(HERE, "renders")
os.makedirs(RENDER_DIR, exist_ok=True)
BLEND_PATH = os.path.join(HERE, "louver_panel.blend")
RENDER_PATH = os.path.join(RENDER_DIR, "louver_panel_iso.png")
DO_RENDER = "--no-render" not in sys.argv

# ─── Tweakable panel parameters (feet / degrees) ──────────────────────────────────
PANEL = dict(
    W=3.0,            # overall width
    H=7.2,            # overall height (incl. post horns)
    DEP=0.18,         # frame / assembly depth (Y)
    POST_W=0.30,      # side-post width (~3.5 in 2x4 face)
    RAIL_T=0.30,      # top-rail thickness (vertical)
    HORN=0.0,         # post height above the top rail (0 = level/flush top — no horns)
    BASE_H=1.00,      # height of the open base frame
    SILL_T=0.16,      # bottom sill plate thickness
    LOUVER_BW=0.30,   # louver blade width (the board face)
    LOUVER_TH=0.045,  # louver blade thickness
    LOUVER_PITCH=0.16,# vertical center-to-center spacing (smaller = denser/overlap)
    LOUVER_RAKE=35.0, # blade tilt (deg); tops lean back, bottoms out — sheds + vents
)


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for coll in (bpy.data.meshes, bpy.data.cameras, bpy.data.lights):
        for b in list(coll):
            if b.users == 0:
                coll.remove(b)


def mat(name, rgb, rough=0.7, metallic=0.0):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes.get("Principled BSDF")
    b.inputs["Base Color"].default_value = (*rgb, 1.0)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metallic
    return m


def box(name, p0, p1, material=None, rot_x=0.0):
    cx, cy, cz = ((p0[0]+p1[0])/2, (p0[1]+p1[1])/2, (p0[2]+p1[2])/2)
    sx, sy, sz = (abs(p1[0]-p0[0]), abs(p1[1]-p0[1]), abs(p1[2]-p0[2]))
    bpy.ops.mesh.primitive_cube_add(size=2, location=(cx*FT, cy*FT, cz*FT))
    o = bpy.context.active_object
    o.name = name
    o.scale = (sx/2*FT, sy/2*FT, sz/2*FT)
    if rot_x:
        o.rotation_euler = (math.radians(rot_x), 0.0, 0.0)
    else:
        bpy.ops.object.transform_apply(scale=True)
    if material:
        o.data.materials.append(material)
    return o


# ─── Build ────────────────────────────────────────────────────────────────────────
clear_scene()

M_FRAME = mat("Frame", (0.80, 0.66, 0.42), rough=0.7)       # pale construction lumber
M_LOUVER = mat("Louver", (0.74, 0.50, 0.31), rough=0.6)     # warm cedar
M_GRADE = mat("Grade", (0.16, 0.27, 0.11), rough=0.95)
M_SCREW = mat("Screw", (0.18, 0.16, 0.14), rough=0.5, metallic=0.7)

P = PANEL
W, H, DEP, PW = P["W"], P["H"], P["DEP"], P["POST_W"]
y0, y1 = 0.0, DEP

# Side posts (full height, incl. horns above the top rail)
box("Post_L", (0.0, y0, 0.0), (PW, y1, H), M_FRAME)
box("Post_R", (W - PW, y0, 0.0), (W, y1, H), M_FRAME)

# Top rail (between the posts, sitting below the horns)
rail_top = H - P["HORN"]
box("TopRail", (PW, y0, rail_top - P["RAIL_T"]), (W - PW, y1, rail_top), M_FRAME)

# Open base frame: a bottom sill + vertical studs + a base top rail the louvers sit on
box("Sill", (0.0, y0, 0.0), (W, y1, P["SILL_T"]), M_FRAME)
base_top = P["BASE_H"]
for i, sx in enumerate((PW, (W - PW) / 2 + PW / 2, W - PW - 0.16)):
    box(f"BaseStud_{i}", (sx - 0.08, y0, P["SILL_T"]), (sx + 0.08, y1, base_top), M_FRAME)
box("BaseRail", (PW, y0, base_top - 0.15), (W - PW, y1, base_top), M_FRAME)

# Louver blades — horizontal cedar boards, raked, filling the field between base + top rail
bx0, bx1 = PW + 0.04, W - PW - 0.04
yc = (y0 + y1) / 2.0
bw, th = P["LOUVER_BW"], P["LOUVER_TH"]
field_lo, field_hi = base_top + 0.05, rail_top - P["RAIL_T"] - 0.05
z = field_lo + bw / 2
i = 0
while z <= field_hi:
    # a flat board long in X, centered, then raked about X so it reads as a louver
    box(f"Louver_{i}", (bx0, yc - bw / 2, z - th / 2), (bx1, yc + bw / 2, z + th / 2),
        M_LOUVER, rot_x=P["LOUVER_RAKE"])
    z += P["LOUVER_PITCH"]
    i += 1

# A few screw dots on the posts (subtle detail, matches the photo)
for sx in (PW / 2, W - PW / 2):
    for sz in (0.5, rail_top - 0.15, H - 0.18):
        box(f"Screw_{int(sx*100)}_{int(sz*100)}", (sx - 0.02, y0 - 0.01, sz - 0.02),
            (sx + 0.02, y0 + 0.01, sz + 0.02), M_SCREW)

# Ground
box("Plane_Grade", (-4, -4, -0.05), (8, 4, 0.0), M_GRADE)

# ─── World (soft sky gradient) + sun ────────────────────────────────────────────
world = bpy.data.worlds.get("World") or bpy.data.worlds.new("World")
bpy.context.scene.world = world
world.use_nodes = True
wn = world.node_tree
for n in list(wn.nodes):
    wn.nodes.remove(n)
bg = wn.nodes.new("ShaderNodeBackground")
out = wn.nodes.new("ShaderNodeOutputWorld")
grad = wn.nodes.new("ShaderNodeTexGradient")
ramp = wn.nodes.new("ShaderNodeValToRGB")
ramp.color_ramp.elements[0].position = 0.35
ramp.color_ramp.elements[0].color = (0.62, 0.66, 0.55, 1.0)
ramp.color_ramp.elements[1].position = 0.9
ramp.color_ramp.elements[1].color = (0.38, 0.52, 0.62, 1.0)
tex = wn.nodes.new("ShaderNodeTexCoord")
mp = wn.nodes.new("ShaderNodeMapping")
mp.inputs["Rotation"].default_value = (math.radians(90), 0, 0)
wn.links.new(tex.outputs["Generated"], mp.inputs["Vector"])
wn.links.new(mp.outputs["Vector"], grad.inputs["Vector"])
wn.links.new(grad.outputs["Color"], ramp.inputs["Fac"])
wn.links.new(ramp.outputs["Color"], bg.inputs["Color"])
bg.inputs["Strength"].default_value = 1.1
wn.links.new(bg.outputs["Background"], out.inputs["Surface"])

sun_d = bpy.data.lights.new("Sun", type="SUN")
sun_d.energy = 3.0
sun_d.angle = math.radians(2.5)
sun = bpy.data.objects.new("Sun", sun_d)
bpy.context.collection.objects.link(sun)
sun.rotation_euler = (math.radians(54), math.radians(10), math.radians(-50))

# ─── Camera (front-left 3/4, like the photo) ─────────────────────────────────────
target = bpy.data.objects.new("CamTarget", None)
bpy.context.collection.objects.link(target)
target.location = (W / 2 * FT, 0, 3.6 * FT)
cam_d = bpy.data.cameras.new("Camera")
cam_d.lens = 50
cam = bpy.data.objects.new("Camera", cam_d)
bpy.context.collection.objects.link(cam)
cam.location = (-3.2 * FT, -8.5 * FT, 4.3 * FT)
trk = cam.constraints.new(type="TRACK_TO")
trk.target = target
trk.track_axis = "TRACK_NEGATIVE_Z"
trk.up_axis = "UP_Y"
bpy.context.scene.camera = cam

# ─── Render ───────────────────────────────────────────────────────────────────────
scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"
scene.cycles.samples = 96
scene.cycles.use_denoising = True
scene.render.resolution_x = 1100
scene.render.resolution_y = 1500
scene.render.filepath = RENDER_PATH

bpy.ops.wm.save_as_mainfile(filepath=BLEND_PATH)
print(f"[RR] saved blend -> {BLEND_PATH}")
if DO_RENDER:
    print("[RR] rendering...")
    bpy.ops.render.render(write_still=True)
    print(f"[RR] render -> {RENDER_PATH}")
else:
    print("[RR] geometry only")
print("[RR] DONE objects=%d" % len(bpy.data.objects))
