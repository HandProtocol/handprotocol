#!/usr/bin/env blender --background --python
"""
Reimagine Ranch — Compost Sawdust Latrine: massing model.

Builds the v1 massing for the two-stall, raised, accessible composting latrine from the
dimensions locked in ../research/compost-latrine.md §7. Reproducible: edit a dimension,
re-run, get an updated .blend + render.

    blender --background --python rr/blender/compost_latrine.py            # from repo root
    blender --background --python rr/blender/compost_latrine.py -- --no-render   # geometry only

Design intent: nice (real proportions, daylight, materials), sustainable (cedar / metal /
no-concrete read), efficient (compact switchback ramp, single shed roof, shared patio).

All authored dimensions are in FEET; FT converts to meters (Blender's unit) at build time.
"""

import bpy
import bmesh
import math
import os
import sys

# --------------------------------------------------------------------------------------
# Units & helpers
# --------------------------------------------------------------------------------------
FT = 0.3048  # feet -> meters

HERE = os.path.dirname(os.path.abspath(__file__))
RENDER_DIR = os.path.join(HERE, "renders")
BLEND_PATH = os.path.join(HERE, "compost_latrine.blend")
RENDER_PATH = os.path.join(RENDER_DIR, "compost_latrine_iso.png")
os.makedirs(RENDER_DIR, exist_ok=True)

DO_RENDER = "--no-render" not in sys.argv


def clear_scene():
    """Wipe the default scene. Run BEFORE creating materials, or freshly created
    (still-unused) materials get purged out from under us."""
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for coll in (bpy.data.meshes, bpy.data.cameras, bpy.data.lights):
        for block in list(coll):
            if block.users == 0:
                coll.remove(block)


def mat(name, rgb, rough=0.7, metallic=0.0):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*rgb, 1.0)
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = metallic
    return m


def _finish(obj, material):
    if material:
        obj.data.materials.append(material)
    return obj


def box(name, p0, p1, material=None):
    """Axis-aligned cuboid from two corner points (feet)."""
    cx, cy, cz = ((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2, (p0[2] + p1[2]) / 2)
    sx, sy, sz = (abs(p1[0] - p0[0]), abs(p1[1] - p0[1]), abs(p1[2] - p0[2]))
    bpy.ops.mesh.primitive_cube_add(size=2, location=(cx * FT, cy * FT, cz * FT))
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = (sx / 2 * FT, sy / 2 * FT, sz / 2 * FT)
    bpy.ops.object.transform_apply(scale=True)
    return _finish(obj, material)


def sloped_slab(name, x0, x1, y0, y1, z_y0, z_y1, thickness, material=None):
    """Slab whose TOP surface slopes along Y from z_y0 (at y0) to z_y1 (at y1).

    Used for ramp runs and the shed roof. Built from explicit verts so the incline is exact.
    """
    t = thickness
    verts = [
        (x0, y0, z_y0), (x1, y0, z_y0), (x1, y1, z_y1), (x0, y1, z_y1),          # top
        (x0, y0, z_y0 - t), (x1, y0, z_y0 - t), (x1, y1, z_y1 - t), (x0, y1, z_y1 - t),  # bottom
    ]
    verts = [(vx * FT, vy * FT, vz * FT) for (vx, vy, vz) in verts]
    faces = [(0, 1, 2, 3), (7, 6, 5, 4), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)]
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    me.update()
    obj = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(obj)
    return _finish(obj, material)


def cylinder(name, x, y, z0, z1, radius, material=None):
    bpy.ops.mesh.primitive_cylinder_add(
        radius=radius * FT, depth=(z1 - z0) * FT, vertices=20,
        location=(x * FT, y * FT, ((z0 + z1) / 2) * FT),
    )
    obj = bpy.context.active_object
    obj.name = name
    return _finish(obj, material)


def walled_room(name, x0, x1, y0, y1, z0, z1, wall_t, door, material):
    """Four walls (with a door gap on the front / -Y side) on top of the deck."""
    # back + sides
    box(f"{name}_back", (x0, y1 - wall_t, z0), (x1, y1, z1), material)
    box(f"{name}_left", (x0, y0, z0), (x0 + wall_t, y1, z1), material)
    box(f"{name}_right", (x1 - wall_t, y0, z0), (x1, y1, z1), material)
    # front wall with door gap (door = (gx0, gx1))
    gx0, gx1 = door
    box(f"{name}_front_a", (x0, y0, z0), (gx0, y0 + wall_t, z1), material)
    box(f"{name}_front_b", (gx1, y0, z0), (x1, y0 + wall_t, z1), material)
    # header above door
    box(f"{name}_front_hdr", (gx0, y0, z1 - 0.75, ), (gx1, y0 + wall_t, z1), material)


# --------------------------------------------------------------------------------------
# Clear the default scene FIRST (so the materials below survive), then build materials.
# --------------------------------------------------------------------------------------
clear_scene()

# --------------------------------------------------------------------------------------
# Materials (sustainable palette: cedar, cypress deck, standing-seam metal, black stacks)
# --------------------------------------------------------------------------------------
M_GRADE = mat("Grade", (0.16, 0.27, 0.11), rough=0.95)
M_DECK = mat("CedarDeck", (0.55, 0.35, 0.18), rough=0.65)
M_PATIO = mat("PatioDeck", (0.62, 0.42, 0.24), rough=0.6)
M_WALL = mat("CedarWall", (0.50, 0.31, 0.16), rough=0.75)
M_ROOF = mat("StandingSeamMetal", (0.32, 0.34, 0.37), rough=0.35, metallic=0.85)
M_STACK = mat("VentStackBlack", (0.02, 0.02, 0.02), rough=0.5)
M_RAIL = mat("CedarRail", (0.58, 0.38, 0.20), rough=0.6)
M_RAMP = mat("CedarRamp", (0.60, 0.40, 0.22), rough=0.6)
M_SKIRT = mat("Skirt", (0.38, 0.24, 0.13), rough=0.85)
M_HATCH = mat("LouverHatch", (0.28, 0.18, 0.10), rough=0.9)
M_PIER = mat("ScrewPier", (0.20, 0.20, 0.22), rough=0.6, metallic=0.5)
M_ACCENT = mat("AccessibleAccent", (0.07, 0.40, 0.85), rough=0.4)
M_SIGN_WHITE = mat("SignWhite", (0.98, 0.98, 1.0), rough=0.3)
# Make the placard self-lit so the ISA wheelchair reads even in the deep roof shade.
for _m, _str in ((M_ACCENT, 0.5), (M_SIGN_WHITE, 1.2)):
    _bsdf = _m.node_tree.nodes.get("Principled BSDF")
    try:
        _bsdf.inputs["Emission Color"].default_value = (*_m.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value[:3], 1.0)
        _bsdf.inputs["Emission Strength"].default_value = _str
    except Exception:
        pass
M_THRONE = mat("Throne", (0.74, 0.71, 0.64), rough=0.5)

# --------------------------------------------------------------------------------------
# Locked dimensions (feet) — from research §7
# --------------------------------------------------------------------------------------
DECK_X0, DECK_X1 = 0.0, 16.0
DECK_Y0, DECK_Y1 = 0.0, 12.0
FFL = 2.0           # finished floor level (deck top) above grade
SLAB = 0.5          # deck slab thickness
WALL_T = 0.33
WALL_TOP = FFL + 7.0  # 7 ft stall walls
PATIO_DEPTH = 5.0     # front covered strip

# --------------------------------------------------------------------------------------
# Build
# --------------------------------------------------------------------------------------
# 1. Grade plane ---------------------------------------------------------------------
box("Plane_Grade", (-18, -10, -0.25), (40, 26, 0.0), M_GRADE)

# 2. Deck plane (raised floor) -------------------------------------------------------
box("Plane_Deck", (DECK_X0, DECK_Y0, FFL - SLAB), (DECK_X1, DECK_Y1, FFL), M_DECK)

# 3. Patio plane (front covered strip, same level — a thin overlay) ------------------
box("Plane_Patio", (DECK_X0, DECK_Y0, FFL), (DECK_X1, DECK_Y0 + PATIO_DEPTH, FFL + 0.04), M_PATIO)

# 4. Skirt + louvered hatches + screw piers under the deck ---------------------------
box("Skirt_front", (DECK_X0, DECK_Y0, 0.0), (DECK_X1, DECK_Y0 + 0.1, FFL - SLAB), M_SKIRT)
box("Skirt_back", (DECK_X0, DECK_Y1 - 0.1, 0.0), (DECK_X1, DECK_Y1, FFL - SLAB), M_SKIRT)
box("Skirt_left", (DECK_X0, DECK_Y0, 0.0), (DECK_X0 + 0.1, DECK_Y1, FFL - SLAB), M_SKIRT)
box("Skirt_right", (DECK_X1 - 0.1, DECK_Y0, 0.0), (DECK_X1, DECK_Y1, FFL - SLAB), M_SKIRT)
# removable louver hatch under each chamber bay (on the back skirt) — 3 stalls
box("Hatch_accessible", (1.5, DECK_Y1 - 0.12, 0.2), (5.0, DECK_Y1, FFL - SLAB - 0.2), M_HATCH)
box("Hatch_standard1", (8.0, DECK_Y1 - 0.12, 0.2), (11.0, DECK_Y1, FFL - SLAB - 0.2), M_HATCH)
box("Hatch_standard2", (12.0, DECK_Y1 - 0.12, 0.2), (15.5, DECK_Y1, FFL - SLAB - 0.2), M_HATCH)
# 9 screw piers on a ~6 ft grid
for gx in (1.0, 8.0, 15.0):
    for gy in (1.0, 6.0, 11.0):
        cylinder(f"Pier_{int(gx)}_{int(gy)}", gx, gy, 0.0, FFL - SLAB, 0.25, M_PIER)

# 5. Stall floor planes + walls ------------------------------------------------------
# Three stalls across the 16 ft back: ONE wide accessible + TWO small standard.

def accessibility_sign(name, cx, y_face, z_base):
    """A clear blue ISA-style handicap placard on the EXTERIOR (-Y) front wall:
    blue panel + a white wheelchair glyph protruding toward the viewer (-Y), so the
    south-facing camera sees the glyph in front of the panel, not occluded by it."""
    s = 1.1  # placard half-size (~2.2 ft square)
    # Panel: mostly proud of the wall toward -Y (exterior / camera side)
    box(f"{name}_panel", (cx - s, y_face - 0.08, z_base - s), (cx + s, y_face + 0.02, z_base + s), M_ACCENT)
    # White glyph, protruding FURTHER toward -Y so it sits in front of the blue panel
    yg0, yg1 = y_face - 0.13, y_face - 0.08
    box(f"{name}_head", (cx - 0.22, yg0, z_base + 0.50), (cx + 0.22, yg1, z_base + 0.92), M_SIGN_WHITE)  # head
    box(f"{name}_back", (cx - 0.15, yg0, z_base - 0.12), (cx + 0.08, yg1, z_base + 0.58), M_SIGN_WHITE)  # seat back
    box(f"{name}_seat", (cx - 0.15, yg0, z_base - 0.22), (cx + 0.55, yg1, z_base - 0.02), M_SIGN_WHITE)  # seat
    box(f"{name}_wheel", (cx - 0.50, yg0, z_base - 0.66), (cx + 0.50, yg1, z_base - 0.48), M_SIGN_WHITE) # wheel
    box(f"{name}_foot", (cx + 0.40, yg0, z_base - 0.22), (cx + 0.62, yg1, z_base - 0.48), M_SIGN_WHITE)  # foot

# 5a. Accessible stall (the BIG one): ~7.5 x 5.5 interior, door on front (-Y) side
AX0, AX1, AY0, AY1 = 0.0, 7.5, 6.5, 12.0
box("Plane_StallFloor_Accessible", (AX0, AY0, FFL), (AX1, AY1, FFL + 0.04), M_PATIO)
walled_room("Stall_Accessible", AX0, AX1, AY0, AY1, FFL, WALL_TOP, WALL_T,
            door=(2.6, 5.6), material=M_WALL)
# Handicap placard on the solid front wall beside the door (eye level ~5 ft AFF)
accessibility_sign("ISA_Accessible", 1.3, AY0, FFL + 2.6)
box("Throne_Accessible", (5.6, 9.5, FFL), (7.1, 11.0, FFL + 1.5), M_THRONE)
# Side + rear grab bars (cedar) to read as the accessible fixture
box("Grab_side_Accessible", (4.9, 9.3, FFL + 2.8), (7.2, 9.5, FFL + 3.0), M_RAIL)
box("Grab_rear_Accessible", (5.4, 11.0, FFL + 2.8), (7.1, 11.2, FFL + 3.0), M_RAIL)

# 5b. Standard stall 1 (small): ~3.5 x 4.5 interior
S1X0, S1X1, S1Y0, S1Y1 = 8.0, 11.5, 7.5, 12.0
box("Plane_StallFloor_Standard1", (S1X0, S1Y0, FFL), (S1X1, S1Y1, FFL + 0.04), M_PATIO)
walled_room("Stall_Standard1", S1X0, S1X1, S1Y0, S1Y1, FFL, WALL_TOP, WALL_T,
            door=(9.0, 10.5), material=M_WALL)
box("Throne_Standard1", (9.9, 10.4, FFL), (11.1, 11.6, FFL + 1.5), M_THRONE)

# 5c. Standard stall 2 (small): ~3.5 x 4.5 interior
S2X0, S2X1, S2Y0, S2Y1 = 12.0, 15.5, 7.5, 12.0
box("Plane_StallFloor_Standard2", (S2X0, S2Y0, FFL), (S2X1, S2Y1, FFL + 0.04), M_PATIO)
walled_room("Stall_Standard2", S2X0, S2X1, S2Y0, S2Y1, FFL, WALL_TOP, WALL_T,
            door=(13.0, 14.5), material=M_WALL)
box("Throne_Standard2", (13.9, 10.4, FFL), (15.1, 11.6, FFL + 1.5), M_THRONE)

# 6. Shed roof (single slope, high at back, big front overhang shading patio) --------
ROOF_BACK_Z = WALL_TOP + 0.6        # ~9.6 ft at back ridge
RUN = 14.5                          # roof run in Y (back y=12.5 to front y=-2.0)
ROOF_FRONT_Z = ROOF_BACK_Z - RUN * (2.0 / 12.0)  # 2:12 pitch
sloped_slab("Roof_Shed", -1.0, 17.0, -2.0, 12.5,
            z_y0=ROOF_FRONT_Z, z_y1=ROOF_BACK_Z, thickness=0.35, material=M_ROOF)

# 7. Vent stacks (4 in dia, through roof, above ridge, painted black) — one per stall
for sname, sx in (("Accessible", 3.75), ("Standard1", 9.75), ("Standard2", 13.75)):
    cylinder(f"VentStack_{sname}", sx, 11.6, 0.5, ROOF_BACK_Z + 1.5, 0.20, M_STACK)
    box(f"RainCap_{sname}", (sx - 0.30, 11.3, ROOF_BACK_Z + 1.4),
        (sx + 0.30, 11.9, ROOF_BACK_Z + 1.7), M_STACK)

# 8. Straight wide wooden ramp down to grade (Raw Republic style) -----------------
# A single long, gentle, WIDE plank ramp running off the deck's front (-Y) edge down
# to grade, low to the ground over a light gravel base — the Austin "Raw Republic"
# deck-ramp look. At 1:12 a 24 in rise needs 24 ft of run, so it's long and gentle.
# The ramp slopes in Y (deck at y=0, z=2.0 -> grade at y=-24, z=0.12).

RW0, RW1 = 2.0, 8.0           # ramp X band (6 ft wide -- broad like the photo)
RY_DECK = 0.0                 # top of ramp meets deck front edge
RY_GRADE = -24.0             # ramp reaches grade here (24 ft run at 1:12)
RAMP_TOP_Z, RAMP_GRADE_Z = 2.00, 0.12

# Plank deck of the ramp (slopes in Y: z_y0 at y0=grade, z_y1 at y1=deck)
sloped_slab("Plane_Ramp", RW0, RW1, RY_GRADE, RY_DECK,
            z_y0=RAMP_GRADE_Z, z_y1=RAMP_TOP_Z, thickness=0.30, material=M_RAMP)
# Low timber cribbing under the long edges + a light gravel pad (like the photo)
box("Ramp_crib_W", (RW0, RY_GRADE, 0.0), (RW0 + 0.3, RY_DECK, RAMP_GRADE_Z + 0.1), M_SKIRT)
box("Ramp_crib_E", (RW1 - 0.3, RY_GRADE, 0.0), (RW1, RY_DECK, RAMP_GRADE_Z + 0.1), M_SKIRT)
box("Ramp_gravel", (RW0 - 0.8, RY_GRADE - 0.8, -0.04), (RW1 + 0.8, RY_DECK, 0.05), M_GRAVEL)

# 9. Simple thin metal-pipe handrail (two horizontal rails + slim posts) ----------
# Galvanized-pipe rails like the photo: a top rail (~36 in) and a mid rail (~21 in),
# thin posts every few feet. No chunky cedar curbs -- just light steel pipe.
PR = 0.09           # pipe half-thickness (~2 in)
RAIL_TOP, RAIL_MID = 3.0, 1.75   # 36 in and 21 in above the running surface

def pipe_rail_y(name, x_edge, y0, y1, z_y0, z_y1, n_posts=7):
    """Two horizontal pipe rails + slim posts along a run that slopes in Y."""
    for h, tag in ((RAIL_TOP, "top"), (RAIL_MID, "mid")):
        sloped_slab(f"{name}_{tag}", x_edge - PR, x_edge + PR, y0, y1,
                    z_y0 + h, z_y1 + h, 2 * PR, M_PIPE)
    for i in range(n_posts):
        f = i / (n_posts - 1)
        py = y0 + f * (y1 - y0)
        pz = z_y0 + f * (z_y1 - z_y0)
        box(f"{name}_post_{i}", (x_edge - PR, py - PR, pz),
            (x_edge + PR, py + PR, pz + RAIL_TOP + PR), M_PIPE)

# A pipe rail on each long edge of the ramp.
pipe_rail_y("RampRail_W", RW0 + 0.15, RY_GRADE, RY_DECK, RAMP_GRADE_Z, RAMP_TOP_Z)
pipe_rail_y("RampRail_E", RW1 - 0.15, RY_GRADE, RY_DECK, RAMP_GRADE_Z, RAMP_TOP_Z)

# --------------------------------------------------------------------------------------
# Daylight world (Nishita sky) + sun
# --------------------------------------------------------------------------------------
world = bpy.data.worlds.get("World") or bpy.data.worlds.new("World")
bpy.context.scene.world = world
world.use_nodes = True
wn = world.node_tree
for n in list(wn.nodes):
    wn.nodes.remove(n)
bg = wn.nodes.new("ShaderNodeBackground")
out = wn.nodes.new("ShaderNodeOutputWorld")
# Version-proof sky: a soft sky-blue gradient driven by world Z, instead of the
# ShaderNodeTexSky (whose sky_type enum changes between Blender versions). The sun
# lamp below does the real directional lighting; this is just ambient fill + horizon.
grad = wn.nodes.new("ShaderNodeTexGradient")
grad.gradient_type = "LINEAR"
ramp = wn.nodes.new("ShaderNodeValToRGB")
ramp.color_ramp.elements[0].position = 0.35
ramp.color_ramp.elements[0].color = (0.78, 0.82, 0.88, 1.0)   # horizon haze
ramp.color_ramp.elements[1].position = 0.85
ramp.color_ramp.elements[1].color = (0.27, 0.46, 0.78, 1.0)   # zenith blue
tex = wn.nodes.new("ShaderNodeTexCoord")
mapr = wn.nodes.new("ShaderNodeMapping")
mapr.inputs["Rotation"].default_value = (math.radians(90), 0, 0)
wn.links.new(tex.outputs["Generated"], mapr.inputs["Vector"])
wn.links.new(mapr.outputs["Vector"], grad.inputs["Vector"])
wn.links.new(grad.outputs["Color"], ramp.inputs["Fac"])
wn.links.new(ramp.outputs["Color"], bg.inputs["Color"])
bg.inputs["Strength"].default_value = 1.1
wn.links.new(bg.outputs["Background"], out.inputs["Surface"])

sun_data = bpy.data.lights.new("Sun", type="SUN")
sun_data.energy = 3.2
sun_data.angle = math.radians(2.0)
sun = bpy.data.objects.new("Sun", sun_data)
bpy.context.collection.objects.link(sun)
sun.rotation_euler = (math.radians(52), math.radians(8), math.radians(-58))

# --------------------------------------------------------------------------------------
# Camera (3/4 aerial) aimed at the build via a Track-To empty
# --------------------------------------------------------------------------------------
target = bpy.data.objects.new("CamTarget", None)
bpy.context.collection.objects.link(target)
target.location = (9.0 * FT, 7.0 * FT, 4.0 * FT)

cam_data = bpy.data.cameras.new("Camera")
cam_data.lens = 38
cam = bpy.data.objects.new("Camera", cam_data)
bpy.context.collection.objects.link(cam)
cam.location = (40 * FT, -24 * FT, 30 * FT)
trk = cam.constraints.new(type="TRACK_TO")
trk.target = target
trk.track_axis = "TRACK_NEGATIVE_Z"
trk.up_axis = "UP_Y"
bpy.context.scene.camera = cam

# --------------------------------------------------------------------------------------
# Render settings + save
# --------------------------------------------------------------------------------------
scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"
scene.cycles.samples = 96
scene.cycles.use_denoising = True
scene.render.resolution_x = 1600
scene.render.resolution_y = 900
scene.render.film_transparent = False
scene.render.filepath = RENDER_PATH

bpy.ops.wm.save_as_mainfile(filepath=BLEND_PATH)
print(f"[RR] saved blend -> {BLEND_PATH}")

if DO_RENDER:
    print("[RR] rendering...")
    bpy.ops.render.render(write_still=True)
    print(f"[RR] render -> {RENDER_PATH}")
else:
    print("[RR] geometry only (--no-render)")

print("[RR] DONE objects=%d" % len(bpy.data.objects))
