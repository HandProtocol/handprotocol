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
M_ACCENT = mat("AccessibleAccent", (0.09, 0.34, 0.62), rough=0.5)
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
# removable louver hatch under each chamber bay (on the back skirt)
box("Hatch_accessible", (2.0, DECK_Y1 - 0.12, 0.2), (5.5, DECK_Y1, FFL - SLAB - 0.2), M_HATCH)
box("Hatch_standard", (9.0, DECK_Y1 - 0.12, 0.2), (12.0, DECK_Y1, FFL - SLAB - 0.2), M_HATCH)
# 9 screw piers on a ~6 ft grid
for gx in (1.0, 8.0, 15.0):
    for gy in (1.0, 6.0, 11.0):
        cylinder(f"Pier_{int(gx)}_{int(gy)}", gx, gy, 0.0, FFL - SLAB, 0.25, M_PIER)

# 5. Stall floor planes + walls ------------------------------------------------------
# Accessible stall: ~7x5 interior, door on front (-Y) side
AX0, AX1, AY0, AY1 = 0.0, 7.5, 6.5, 12.0
box("Plane_StallFloor_Accessible", (AX0, AY0, FFL), (AX1, AY1, FFL + 0.04), M_PATIO)
walled_room("Stall_Accessible", AX0, AX1, AY0, AY1, FFL, WALL_TOP, WALL_T,
            door=(2.6, 5.6), material=M_WALL)
box("Stall_Accessible_marker", (2.6, AY0, FFL + 4.5), (5.6, AY0 + WALL_T, FFL + 5.3), M_ACCENT)
box("Throne_Accessible", (5.6, 9.5, FFL), (7.1, 11.0, FFL + 1.5), M_THRONE)

# Standard stall: 4x4 interior
SX0, SX1, SY0, SY1 = 8.5, 13.0, 7.5, 12.0
box("Plane_StallFloor_Standard", (SX0, SY0, FFL), (SX1, SY1, FFL + 0.04), M_PATIO)
walled_room("Stall_Standard", SX0, SX1, SY0, SY1, FFL, WALL_TOP, WALL_T,
            door=(9.8, 11.7), material=M_WALL)
box("Throne_Standard", (11.3, 9.8, FFL), (12.7, 11.2, FFL + 1.5), M_THRONE)

# 6. Shed roof (single slope, high at back, big front overhang shading patio) --------
ROOF_BACK_Z = WALL_TOP + 0.6        # ~9.6 ft at back ridge
RUN = 14.5                          # roof run in Y (back y=12.5 to front y=-2.0)
ROOF_FRONT_Z = ROOF_BACK_Z - RUN * (2.0 / 12.0)  # 2:12 pitch
sloped_slab("Roof_Shed", -1.0, 17.0, -2.0, 12.5,
            z_y0=ROOF_FRONT_Z, z_y1=ROOF_BACK_Z, thickness=0.35, material=M_ROOF)

# 7. Vent stacks (4 in dia, through roof, above ridge, painted black) ---------------
cylinder("VentStack_Accessible", 3.75, 11.6, 0.5, ROOF_BACK_Z + 1.5, 0.20, M_STACK)
cylinder("VentStack_Standard", 10.75, 11.6, 0.5, ROOF_BACK_Z + 1.5, 0.20, M_STACK)
box("RainCap_Accessible", (3.45, 11.3, ROOF_BACK_Z + 1.4), (4.05, 11.9, ROOF_BACK_Z + 1.7), M_STACK)
box("RainCap_Standard", (10.45, 11.3, ROOF_BACK_Z + 1.4), (11.05, 11.9, ROOF_BACK_Z + 1.7), M_STACK)

# 8. Hairpin ramp (1:12), running EAST off the deck -------------------------------
# A clean switchback: two parallel lanes run east (+X) from the deck, offset in Y so
# they never overlap, joined by ONE flat turn-landing at the far (east) end. Enter at
# grade on the SOUTH lane, climb east, turn 180 deg on the landing, climb west on the
# NORTH lane onto the deck. Runs slope along X, so we need an X-sloping slab helper
# (sloped_slab only slopes along Y).

def sloped_slab_x(name, x0, x1, y0, y1, z_x0, z_x1, thickness, material=None):
    """Slab whose TOP surface slopes along X from z_x0 (at x0) to z_x1 (at x1)."""
    t = thickness
    verts = [
        (x0, y0, z_x0), (x0, y1, z_x0), (x1, y1, z_x1), (x1, y0, z_x1),                  # top
        (x0, y0, z_x0 - t), (x0, y1, z_x0 - t), (x1, y1, z_x1 - t), (x1, y0, z_x1 - t),  # bottom
    ]
    verts = [(vx * FT, vy * FT, vz * FT) for (vx, vy, vz) in verts]
    faces = [(0, 1, 2, 3), (7, 6, 5, 4), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)]
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    me.update()
    obj = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(obj)
    return _finish(obj, material)

RW = 4.0                          # lane clear width (48 in)
LAND_Z = 1.0                      # turn-landing height (half the 2 ft rise)
X_DECK = 16.0                     # deck east edge (ramp starts here)
X_LAND0, X_LAND1 = 28.0, 32.5     # flat turn-landing X extent (~4.5 ft deep)
Y_S0, Y_S1 = 3.0, 7.0            # SOUTH lane (lower run)
Y_N0, Y_N1 = 8.0, 12.0           # NORTH lane (upper run) — 1 ft gap between lanes

# North lane = UPPER run: deck (x=16, z=2.0) down to landing (x=28, z=1.0)
sloped_slab_x("Plane_Ramp_Upper", X_DECK, X_LAND0, Y_N0, Y_N1,
              z_x0=2.00, z_x1=LAND_Z, thickness=0.25, material=M_RAMP)
# South lane = LOWER run: grade entry (x=16.5, z=0.12) up to landing (x=28, z=1.0)
sloped_slab_x("Plane_Ramp_Lower", 16.5, X_LAND0, Y_S0, Y_S1,
              z_x0=0.12, z_x1=LAND_Z, thickness=0.25, material=M_RAMP)
# Flat turn landing joining both lanes at the east end
box("Plane_Ramp_Landing", (X_LAND0, Y_S0, LAND_Z - 0.25), (X_LAND1, Y_N1, LAND_Z), M_RAMP)

# 9. Handrails (36 in top rail) + posts + edge curbs --------------------------------
RAIL_H, RAIL_T, POST = 3.0, 0.18, 0.13

def rail_run_x(name, x0, x1, y_edge, z_x0, z_x1, n_posts=7):
    """Curb + sloped top rail + posts along a run that slopes in X, at constant y_edge."""
    sloped_slab_x(f"{name}_curb", x0, x1, y_edge - 0.05, y_edge + 0.05,
                  z_x0 + 0.34, z_x1 + 0.34, 0.34, M_RAIL)
    sloped_slab_x(f"{name}_top", x0, x1, y_edge - RAIL_T / 2, y_edge + RAIL_T / 2,
                  z_x0 + RAIL_H + RAIL_T, z_x1 + RAIL_H + RAIL_T, RAIL_T, M_RAIL)
    for i in range(n_posts):
        f = i / (n_posts - 1)
        px = x0 + f * (x1 - x0)
        pz = z_x0 + f * (z_x1 - z_x0)
        box(f"{name}_post_{i}", (px - POST, y_edge - POST, pz),
            (px + POST, y_edge + POST, pz + RAIL_H), M_RAIL)

def rail_run_y(name, y0, y1, x_edge, z_flat, n_posts=4):
    """Flat rail along the landing's far (east) edge — runs in Y at constant x_edge."""
    box(f"{name}_curb", (x_edge - 0.05, y0, z_flat), (x_edge + 0.05, y1, z_flat + 0.34), M_RAIL)
    box(f"{name}_top", (x_edge - RAIL_T / 2, y0, z_flat + RAIL_H),
        (x_edge + RAIL_T / 2, y1, z_flat + RAIL_H + RAIL_T), M_RAIL)
    for i in range(n_posts):
        f = i / (n_posts - 1)
        py = y0 + f * (y1 - y0)
        box(f"{name}_post_{i}", (x_edge - POST, py - POST, z_flat),
            (x_edge + POST, py + POST, z_flat + RAIL_H), M_RAIL)

# Outer long edge of each lane + the inner spine between them + the landing's east edge.
rail_run_x("RampN_out", X_DECK, X_LAND0, Y_N1, 2.00, LAND_Z)   # north lane, outer edge
rail_run_x("RampN_in", X_DECK, X_LAND0, Y_N0, 2.00, LAND_Z)    # north lane, inner edge
rail_run_x("RampS_out", 16.5, X_LAND0, Y_S0, 0.12, LAND_Z)     # south lane, outer edge
rail_run_x("RampS_in", 16.5, X_LAND0, Y_S1, 0.12, LAND_Z)      # south lane, inner edge
rail_run_y("RampLandE", Y_S0, Y_N1, X_LAND1, LAND_Z)           # landing east edge

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
