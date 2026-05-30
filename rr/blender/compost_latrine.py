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
os.makedirs(RENDER_DIR, exist_ok=True)

DO_RENDER = "--no-render" not in sys.argv

# Optional UPGRADE PACKAGES — opt-in add-ons enabled per render, so ONE source file
# yields MANY renders (base latrine vs. upgraded). Each enabled set writes its own
# suffixed .blend + render so they coexist on disk.
#   blender --background --python compost_latrine.py -- --upgrade=rainwater
#   blender --background --python compost_latrine.py            (base, no upgrades)
ALL_UPGRADES = {"rainwater"}
ENABLED_UPGRADES = set()
for _a in sys.argv:
    if _a.startswith("--upgrade="):
        ENABLED_UPGRADES |= set(_a.split("=", 1)[1].split(","))
    elif _a == "--upgrade":
        ENABLED_UPGRADES |= ALL_UPGRADES
ENABLED_UPGRADES &= ALL_UPGRADES

# LAYOUT variant (same one-file-many-configs idea): "3x3" (default, 3 stalls + 3 showers)
# or "2x2" (2 stalls + 2 showers, narrower deck).  --layout=2x2
LAYOUT = "3x3"
for _a in sys.argv:
    if _a.startswith("--layout="):
        LAYOUT = _a.split("=", 1)[1].strip()

# VENT style — powered, solar + battery, 24/7 extraction. Several versions to compare:
#   passive (default) | stackfan (discreet inline fans) | solarchimney (tall cowled) | cupola (big)
VENT = "passive"
for _a in sys.argv:
    if _a.startswith("--vent="):
        VENT = _a.split("=", 1)[1].strip()
if VENT not in ("passive", "stackfan", "solarchimney", "cupola"):
    VENT = "passive"

_parts = ([LAYOUT] if LAYOUT != "3x3" else []) + ([VENT] if VENT != "passive" else []) \
    + sorted(ENABLED_UPGRADES)
SUFFIX = ("_" + "_".join(_parts)) if _parts else ""
BLEND_PATH = os.path.join(HERE, f"compost_latrine{SUFFIX}.blend")
RENDER_PATH = os.path.join(RENDER_DIR, f"compost_latrine{SUFFIX}_iso.png")


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
M_GRAVEL = mat("Gravel", (0.42, 0.41, 0.39), rough=1.0)
M_PIPE = mat("GalvPipe", (0.62, 0.63, 0.66), rough=0.4, metallic=0.9)
M_GLASS = mat("Glazing", (0.06, 0.10, 0.13), rough=0.08, metallic=0.5)  # dark tinted clerestory glass
M_TANK = mat("RainTank", (0.20, 0.30, 0.26), rough=0.7)  # dark-green poly rainwater cistern
M_SOLAR = mat("SolarPanel", (0.04, 0.06, 0.14), rough=0.15, metallic=0.6)  # dark-blue PV
M_BATT = mat("BatteryBox", (0.17, 0.18, 0.20), rough=0.5, metallic=0.3)    # grey equipment box
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
DECK_X0 = 0.0
DECK_Y0, DECK_Y1 = 0.0, 12.0
FFL = 2.0           # finished floor level (deck top) above grade
SLAB = 0.5          # deck slab thickness
WALL_T = 0.33
WALL_TOP = FFL + 7.0  # 7 ft stall walls
PATIO_DEPTH = 5.0     # front covered strip

# Stall set per LAYOUT. Each: (key, x0, x1, y0, accessible, door(gx0,gx1), vent_x,
# throne(x0,y0,x1,y1), hatch(x0,x1)). All stalls share the back wall at DECK_Y1.
_ACC = ("Accessible", 0.0, 7.5, 6.5, True, (2.6, 5.6), 3.75, (5.6, 9.5, 7.1, 11.0), (1.5, 5.0))
_STD1 = ("Standard1", 8.0, 11.5, 7.5, False, (9.0, 10.5), 9.75, (9.9, 10.4, 11.1, 11.6), (8.0, 11.0))
_STD2 = ("Standard2", 12.0, 15.5, 7.5, False, (13.0, 14.5), 13.75, (13.9, 10.4, 15.1, 11.6), (12.0, 15.5))
if LAYOUT == "2x2":
    STALLS, DECK_X1 = [_ACC, _STD1], 12.0      # 2 bathrooms + (with rainwater) 2 showers
else:
    STALLS, DECK_X1 = [_ACC, _STD1, _STD2], 16.0
EAST_FACE = DECK_X1 - 0.5    # x of the east gable exterior face (where the last stall ends)

# --------------------------------------------------------------------------------------
# Build
# --------------------------------------------------------------------------------------
# 1. Grade plane ---------------------------------------------------------------------
box("Plane_Grade", (-24, -12, -0.25), (40, 26, 0.0), M_GRADE)

# 2. Deck plane (raised floor) -------------------------------------------------------
box("Plane_Deck", (DECK_X0, DECK_Y0, FFL - SLAB), (DECK_X1, DECK_Y1, FFL), M_DECK)

# 3. Patio plane (front covered strip, same level — a thin overlay) ------------------
box("Plane_Patio", (DECK_X0, DECK_Y0, FFL), (DECK_X1, DECK_Y0 + PATIO_DEPTH, FFL + 0.04), M_PATIO)

# 4. Skirt + louvered hatches + screw piers under the deck ---------------------------
box("Skirt_front", (DECK_X0, DECK_Y0, 0.0), (DECK_X1, DECK_Y0 + 0.1, FFL - SLAB), M_SKIRT)
box("Skirt_back", (DECK_X0, DECK_Y1 - 0.1, 0.0), (DECK_X1, DECK_Y1, FFL - SLAB), M_SKIRT)
box("Skirt_left", (DECK_X0, DECK_Y0, 0.0), (DECK_X0 + 0.1, DECK_Y1, FFL - SLAB), M_SKIRT)
box("Skirt_right", (DECK_X1 - 0.1, DECK_Y0, 0.0), (DECK_X1, DECK_Y1, FFL - SLAB), M_SKIRT)
# removable louver hatch under each chamber bay (on the back skirt) — one per stall
for (_k, _x0, _x1, _y0, _acc, _door, _vx, _thr, _hatch) in STALLS:
    box(f"Hatch_{_k}", (_hatch[0], DECK_Y1 - 0.12, 0.2), (_hatch[1], DECK_Y1, FFL - SLAB - 0.2), M_HATCH)
# screw piers on a ~6 ft grid (spans the actual deck width)
for gx in (1.0, DECK_X1 / 2.0, DECK_X1 - 1.0):
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

# Build every stall in the LAYOUT: floor, walls + door, throne; the accessible one
# also gets the ISA placard and grab bars.
for (key, sx0, sx1, sy0, acc, door, vent_x, throne, hatch) in STALLS:
    box(f"Plane_StallFloor_{key}", (sx0, sy0, FFL), (sx1, DECK_Y1, FFL + 0.04), M_PATIO)
    walled_room(f"Stall_{key}", sx0, sx1, sy0, DECK_Y1, FFL, WALL_TOP, WALL_T,
                door=door, material=M_WALL)
    tx0, ty0, tx1, ty1 = throne
    box(f"Throne_{key}", (tx0, ty0, FFL), (tx1, ty1, FFL + 1.5), M_THRONE)
    if acc:
        accessibility_sign(f"ISA_{key}", 1.3, sy0, FFL + 2.6)   # placard beside the door
        box(f"Grab_side_{key}", (4.9, 9.3, FFL + 2.8), (7.2, 9.5, FFL + 3.0), M_RAIL)
        box(f"Grab_rear_{key}", (5.4, 11.0, FFL + 2.8), (7.1, 11.2, FFL + 3.0), M_RAIL)

# 6. Shed roof (single slope) -------------------------------------------------------
# Drains to the BACK: the low eave is at the back so roof runoff feeds the rainwater
# tank + showers behind the shed (see the rainwater upgrade). HIGH at the front. The
# pitch + back height are set so the underside clears the 7 ft stall walls across the
# WHOLE footprint (the front of the walls is the worst case) — fixes walls poking out.
ROOF_PITCH = 1.5 / 12.0
ROOF_FRONT_Y, ROOF_BACK_Y = -2.0, 13.0     # front overhang (high) .. back eave (low)
ROOF_BACK_Z = WALL_TOP + 0.5               # 9.5 ft low eave -> clears the 9 ft back wall
ROOF_FRONT_Z = ROOF_BACK_Z + (ROOF_BACK_Y - ROOF_FRONT_Y) * ROOF_PITCH


def roof_z(y):
    """Top-of-roof height at a given Y along the single shed plane."""
    f = (y - ROOF_FRONT_Y) / (ROOF_BACK_Y - ROOF_FRONT_Y)
    return ROOF_FRONT_Z + f * (ROOF_BACK_Z - ROOF_FRONT_Z)


sloped_slab("Roof_Shed", -1.0, DECK_X1 + 1.0, ROOF_FRONT_Y, ROOF_BACK_Y,
            z_y0=ROOF_FRONT_Z, z_y1=ROOF_BACK_Z, thickness=0.35, material=M_ROOF)

# Crown slat parameters live in crown_config.py so they're easy to tweak (edit that file,
# re-run). Fall back to built-in defaults if it's missing or has a typo.
CROWN = {"RAKE_DEG": 15.0, "SLAT_PITCH": 0.40, "SLAT_WIDTH": 0.16, "SLAT_DEPTH": 0.12,
         "BAND_HEIGHT": 1.20, "CAP_THICK": 0.16, "WRAP_ALL": True}
try:
    import importlib.util as _ilu
    _ccfg = os.path.join(HERE, "crown_config.py")
    if os.path.exists(_ccfg):
        _spec = _ilu.spec_from_file_location("crown_config", _ccfg)
        _cmod = _ilu.module_from_spec(_spec)
        _spec.loader.exec_module(_cmod)
        for _k in CROWN:
            if hasattr(_cmod, _k):
                CROWN[_k] = getattr(_cmod, _k)
        print(f"[RR] crown_config loaded: {CROWN}")
except Exception as _e:
    print(f"[RR] crown_config load skipped ({_e}); using defaults")

# 6b. Vent crown — VERTICAL cedar slats raked 15° (about X), wrapping all four sides. -
# Vertical slats like the original, each tipped 15° (tops leaning outward) so the band
# reads as a raked louver rather than flat pickets. Framed by a continuous top cap +
# bottom rail that wrap the whole building envelope.
def _raked_slat(name, cx, cy, z0, z1, run_w, depth, rot_axis, deg, mat):
    """A vertical slat centred at (cx, cy) spanning z0..z1, rotated `deg` about rot_axis
    ('X' for front/back faces, 'Y' for end faces). run_w = width along the wall run."""
    h = z1 - z0
    bpy.ops.mesh.primitive_cube_add(size=2, location=(cx * FT, cy * FT, (z0 + h / 2.0) * FT))
    o = bpy.context.active_object
    o.name = name
    if rot_axis == "X":
        o.scale = (run_w / 2 * FT, depth / 2 * FT, h / 2 * FT)
        o.rotation_euler = (math.radians(deg), 0.0, 0.0)
    else:  # 'Y'
        o.scale = (depth / 2 * FT, run_w / 2 * FT, h / 2 * FT)
        o.rotation_euler = (0.0, math.radians(deg), 0.0)
    return _finish(o, mat)


def louver_crown(x0, x1, y0, y1, z0, z1, pitch=0.40, w=0.16, depth=0.12, rake=15.0,
                 cap_t=0.16, wrap_all=True):
    """Continuous crown wrapping the building: top cap + bottom rail frame, with raked
    vertical slats between them on every face (tops lean outward). All params come from
    crown_config.py. wrap_all=False omits the back (front + two ends only)."""
    sides = ["F", "W", "E"] + (["B"] if wrap_all else [])
    capboxes = {
        "F": lambda zz, hh, pr: ((x0 - 0.06, y0 - pr, zz), (x1 + 0.06, y0 + 0.06, zz + hh)),
        "B": lambda zz, hh, pr: ((x0 - 0.06, y1 - 0.06, zz), (x1 + 0.06, y1 + pr, zz + hh)),
        "W": lambda zz, hh, pr: ((x0 - pr, y0 - 0.06, zz), (x0 + 0.06, y1 + 0.06, zz + hh)),
        "E": lambda zz, hh, pr: ((x1 - 0.06, y0 - 0.06, zz), (x1 + pr, y1 + 0.06, zz + hh)),
    }
    for nm, zz, hh, pr in (("cap", z1 - cap_t, cap_t, 0.12), ("btm", z0, 0.12, 0.03)):
        for s in sides:
            p0, p1 = capboxes[s](zz, hh, pr)
            box(f"Crown_{nm}_{s}", p0, p1, M_WALL)
    sz0, sz1 = z0 + 0.13, z1 - cap_t - 0.02     # slat vertical span (between the rails)
    # front (-Y) + back (+Y): slats arrayed along X, raked about X (tops lean outward)
    xx, i = x0 + 0.25, 0
    while xx <= x1 - 0.15:
        _raked_slat(f"Lvr_F_{i}", xx, y0 + 0.02, sz0, sz1, w, depth, "X", +rake, M_RAMP)
        if wrap_all:
            _raked_slat(f"Lvr_B_{i}", xx, y1 - 0.02, sz0, sz1, w, depth, "X", -rake, M_RAMP)
        xx += pitch
        i += 1
    # west (-X) + east (+X) ends: slats arrayed along Y, raked about Y (tops lean outward)
    yy, j = y0 + 0.25, 0
    while yy <= y1 - 0.15:
        _raked_slat(f"Lvr_W_{j}", x0 + 0.02, yy, sz0, sz1, w, depth, "Y", -rake, M_RAMP)
        _raked_slat(f"Lvr_E_{j}", x1 - 0.02, yy, sz0, sz1, w, depth, "Y", +rake, M_RAMP)
        yy += pitch
        j += 1


# Wrap the whole stall-block envelope (front y=6.5 .. back y=12, x=0 .. east face),
# using the editable crown_config.py parameters.
louver_crown(0.0, EAST_FACE, 6.5, 12.0, WALL_TOP - CROWN["BAND_HEIGHT"], WALL_TOP,
             pitch=CROWN["SLAT_PITCH"], w=CROWN["SLAT_WIDTH"], depth=CROWN["SLAT_DEPTH"],
             rake=CROWN["RAKE_DEG"], cap_t=CROWN["CAP_THICK"], wrap_all=CROWN["WRAP_ALL"])

# 6c. Clerestory ribbon windows + horizontal lap-siding reveals (photo references) ---
# raw REPUBLIC contributes the high horizontal strip window; the cedar-wall photo
# contributes the lapped-plank coursing. Both land on the two camera-visible faces
# (front, and the east gable at x=15.5) so the iso reads them. Glass is a dark tinted
# reflective panel — a massing stand-in, not real transmission.
def lap_reveals(name, face, a0, a1, z0, z1, plane, course=0.85, proud=0.03, thick=0.05):
    """Horizontal lap-siding shadow lines across a wall region. plane='Y' -> face is a
    constant Y and the band spans X (a0..a1); plane='X' -> constant X, band spans Y."""
    z = z0 + course
    i = 0
    while z < z1 - 0.05:
        if plane == "Y":
            box(f"{name}_{i}", (a0, face - proud, z - thick / 2),
                (a1, face + proud, z + thick / 2), M_SKIRT)
        else:  # constant X
            box(f"{name}_{i}", (face - proud, a0, z - thick / 2),
                (face + proud, a1, z + thick / 2), M_SKIRT)
        z += course
        i += 1

# Front hero panel (left of the accessible door): lap siding -> clerestory -> crown.
lap_reveals("Lap_FL", 6.5, 0.15, 2.5, FFL + 0.2, 6.6, plane="Y")
box("Clerestory_FL", (0.3, 6.5 - 0.03, 6.75), (2.45, 6.5 + 0.07, 7.75), M_GLASS)
# Front panel right of the accessible door.
lap_reveals("Lap_FR", 6.5, 5.6, 7.4, FFL + 0.2, 6.6, plane="Y")
# East gable (the visible right end): lap siding + a clerestory ribbon, at EAST_FACE.
lap_reveals("Lap_E", EAST_FACE, 7.7, 11.9, FFL + 0.2, 6.6, plane="X")
box("Clerestory_E", (EAST_FACE - 0.03, 8.0, 6.75), (EAST_FACE + 0.07, 11.7, 7.85), M_GLASS)

# 7. Ventilation — passive by default; powered (solar + battery, 24/7) via --vent=. -----
# Styles: passive | stackfan (discreet inline solar fans) | solarchimney (tall cowled
# solar-thermal chimneys) | cupola (one big louvered roof vent pulling all stalls). Any
# powered style adds a roof PV panel + an equipment battery box so airflow NEVER stops.
VENT_Y = 11.6


def build_solar_power():
    """Roof PV panel + ground equipment battery box — the always-on power for the fans."""
    cx = DECK_X1 / 2.0
    sloped_slab("Solar_PVframe", cx - 2.7, cx + 2.7, 0.9, 6.1,
                roof_z(0.9) + 0.28, roof_z(6.1) + 0.28, 0.06, M_BATT)
    sloped_slab("Solar_PV", cx - 2.6, cx + 2.6, 1.0, 6.0,
                roof_z(1.0) + 0.34, roof_z(6.0) + 0.34, 0.07, M_SOLAR)   # PV lies on the sunny front roof
    # battery + controller enclosure on grade at the east side (clearly serviceable)
    box("Batt_box", (DECK_X1 + 0.4, 2.0, 0.0), (DECK_X1 + 1.9, 4.0, 1.7), M_BATT)
    cylinder("Solar_conduit", cx + 2.4, 5.6, 0.1, roof_z(5.6) + 0.30, 0.05, M_BATT)  # PV -> battery run


def build_vent(style):
    """Per-stall vertical vents (passive stack, inline fan, or tall solar chimney)."""
    for (key, sx0, sx1, sy0, acc, door, vent_x, throne, hatch) in STALLS:
        vtop = roof_z(VENT_Y) + 1.4
        if style == "solarchimney":
            top = roof_z(VENT_Y) + 3.2
            cylinder(f"Vent_{key}", vent_x, VENT_Y, 0.5, top, 0.34, M_STACK)             # fat matte-black flue
            cylinder(f"VentCowl_{key}", vent_x, VENT_Y, top, top + 0.5, 0.46, M_PIPE)     # powered turbine head
            box(f"VentCap_{key}", (vent_x - 0.5, VENT_Y - 0.5, top + 0.45),
                (vent_x + 0.5, VENT_Y + 0.5, top + 0.62), M_STACK)
        else:  # passive + stackfan share the slim black stack
            cylinder(f"Vent_{key}", vent_x, VENT_Y, 0.5, vtop, 0.20, M_STACK)
            box(f"VentCap_{key}", (vent_x - 0.30, VENT_Y - 0.3, vtop - 0.1),
                (vent_x + 0.30, VENT_Y + 0.3, vtop + 0.2), M_STACK)
            if style == "stackfan":
                cylinder(f"VentFan_{key}", vent_x, VENT_Y, vtop + 0.2, vtop + 0.7, 0.30, M_PIPE)   # inline fan housing
                cylinder(f"VentGuard_{key}", vent_x, VENT_Y, vtop + 0.66, vtop + 0.74, 0.32, M_STACK)


def build_cupola():
    """One big louvered roof cupola pulling every stall through a short duct manifold."""
    cx = DECK_X1 / 2.0
    base_z = roof_z(10.5)
    cz0, cz1 = base_z + 0.1, base_z + 3.0
    cx0, cx1, cy0, cy1 = cx - 2.2, cx + 2.2, 9.0, 12.0
    for (key, sx0, sx1, sy0, acc, door, vent_x, throne, hatch) in STALLS:
        cylinder(f"Duct_{key}", vent_x, VENT_Y, 0.5, base_z + 0.2, 0.22, M_STACK)        # stall -> cupola
    for cxp in (cx0, cx1):                                                                # corner posts
        box(f"Cup_post_{int(cxp * 10)}f", (cxp - 0.08, cy0, cz0), (cxp + 0.08, cy0 + 0.16, cz1), M_WALL)
        box(f"Cup_post_{int(cxp * 10)}b", (cxp - 0.08, cy1 - 0.16, cz0), (cxp + 0.08, cy1, cz1), M_WALL)
    n = 6                                                                                 # louver slats front + back
    for i in range(n):
        z = cz0 + 0.3 + i * ((cz1 - cz0 - 0.6) / n)
        box(f"Cup_louvF_{i}", (cx0, cy0, z), (cx1, cy0 + 0.12, z + 0.10), M_RAMP)
        box(f"Cup_louvB_{i}", (cx0, cy1 - 0.12, z), (cx1, cy1, z + 0.10), M_RAMP)
    box("Cup_roof", (cx0 - 0.4, cy0 - 0.4, cz1), (cx1 + 0.4, cy1 + 0.4, cz1 + 0.25), M_ROOF)
    cylinder("Cup_fan", cx, 10.5, cz1 - 0.55, cz1 - 0.2, 1.4, M_PIPE)                      # big extraction fan


if VENT == "cupola":
    build_cupola()
else:
    build_vent(VENT)
if VENT != "passive":
    build_solar_power()

# 8. Access — ramp enters the patio from the LEFT (west) + a stair at the east end. --
# The ramp is a simple slab climbing west->east up to the patio's west edge; a short
# stair climbs onto the patio at the east end. Rails are simple cedar (cap + mid rail +
# a few posts) — kept lean: no dense balusters.
CAP_H, MID_H = 3.0, 1.6           # top cap and mid rail heights above the surface


def slab_x(name, y0, y1, x0, x1, z_x0, z_x1, t, material=None):
    """Slab whose top slopes along X from z_x0 (at x0) to z_x1 (at x1)."""
    verts = [(x0, y0, z_x0), (x1, y0, z_x1), (x1, y1, z_x1), (x0, y1, z_x0),
             (x0, y0, z_x0 - t), (x1, y0, z_x1 - t), (x1, y1, z_x1 - t), (x0, y1, z_x0 - t)]
    verts = [(vx * FT, vy * FT, vz * FT) for (vx, vy, vz) in verts]
    faces = [(0, 1, 2, 3), (7, 6, 5, 4), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)]
    me = bpy.data.meshes.new(name); me.from_pydata(verts, [], faces); me.update()
    obj = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(obj)
    return _finish(obj, material)


def rail_x(name, y_edge, x0, x1, z_x0, z_x1=None, n_posts=4):
    """Lean cedar rail along X (level or X-sloping): a cap, a mid rail, a few posts."""
    z1 = z_x0 if z_x1 is None else z_x1
    slab_x(f"{name}_cap", y_edge - 0.16, y_edge + 0.16, x0, x1, z_x0 + CAP_H, z1 + CAP_H, 0.15, M_RAIL)
    slab_x(f"{name}_mid", y_edge - 0.07, y_edge + 0.07, x0, x1, z_x0 + MID_H, z1 + MID_H, 0.10, M_RAIL)
    for i in range(n_posts):
        f = i / (n_posts - 1); pxv = x0 + f * (x1 - x0); pz = z_x0 + f * (z1 - z_x0)
        box(f"{name}_post_{i}", (pxv - 0.1, y_edge - 0.1, pz), (pxv + 0.1, y_edge + 0.1, pz + CAP_H + 0.15), M_RAIL)


def rail_y(name, x_edge, y0, y1, z_y0, z_y1, n_posts=4):
    """Lean cedar rail along Y (for the stair nosing): a cap, a mid rail, a few posts."""
    sloped_slab(f"{name}_cap", x_edge - 0.16, x_edge + 0.16, y0, y1, z_y0 + CAP_H, z_y1 + CAP_H, 0.15, M_RAIL)
    sloped_slab(f"{name}_mid", x_edge - 0.07, x_edge + 0.07, y0, y1, z_y0 + MID_H, z_y1 + MID_H, 0.10, M_RAIL)
    for i in range(n_posts):
        f = i / (n_posts - 1); py = y0 + f * (y1 - y0); pz = z_y0 + f * (z_y1 - z_y0)
        box(f"{name}_post_{i}", (x_edge - 0.1, py - 0.1, pz), (x_edge + 0.1, py + 0.1, pz + CAP_H + 0.15), M_RAIL)


# --- Ramp: enters from the LEFT (west), climbing up to the patio's west edge (x=0) --
RAMP_Y0, RAMP_Y1 = 0.0, 5.0       # front strip the ramp occupies
RAMP_GRADE_Z = 0.12
RAMP_RUN = 13.0                   # compact massing run (W->E) up to the patio
RAMP_XW = -RAMP_RUN               # low (grade) end, west
sloped = slab_x("Plane_Ramp", RAMP_Y0, RAMP_Y1, RAMP_XW, 0.0,
                z_x0=RAMP_GRADE_Z, z_x1=FFL, t=0.30, material=M_RAMP)
box("Ramp_gravel", (RAMP_XW - 0.8, RAMP_Y0 - 0.8, -0.04), (RAMP_XW + 4.0, RAMP_Y1 + 0.8, 0.05), M_GRAVEL)
rail_x("RampRail_front", RAMP_Y0, RAMP_XW, 0.0, RAMP_GRADE_Z, FFL, n_posts=6)
rail_x("RampRail_back", RAMP_Y1, RAMP_XW, 0.0, RAMP_GRADE_Z, FFL, n_posts=6)

# --- East stair: a short flight up onto the patio at the right end -----------------
ST_X1 = EAST_FACE                 # align the stair to the deck's east edge
ST_X0 = ST_X1 - 3.5
STEP_RISE, STEP_TREAD = 0.5, 1.0
N_STEPS = int(round(FFL / STEP_RISE))
for i in range(N_STEPS):
    z_top = FFL - i * STEP_RISE
    y_near = -i * STEP_TREAD
    box(f"Step_{i}", (ST_X0, y_near - STEP_TREAD, 0.0), (ST_X1, y_near, z_top), M_RAMP)
STAIR_RUN = N_STEPS * STEP_TREAD
box("Stair_gravel", (ST_X0 - 0.6, -STAIR_RUN - 0.6, -0.04), (ST_X1 + 0.6, 0.0, 0.05), M_GRAVEL)
rail_y("StairRail_W", ST_X0 + 0.12, -STAIR_RUN, 0.0, 0.30, FFL, n_posts=4)
rail_y("StairRail_E", ST_X1 - 0.12, -STAIR_RUN, 0.0, 0.30, FFL, n_posts=4)

# --- Patio front guard rail across the open front edge (gap at the stair) ----------
for seg, (gx0, gx1) in (("L", (0.0, ST_X0)), ("R", (ST_X1, DECK_X1))):
    if gx1 - gx0 > 0.4:
        rail_x(f"PatioRail_{seg}", 0.0, gx0, gx1, FFL, n_posts=max(2, int((gx1 - gx0) / 3) + 1))


# --------------------------------------------------------------------------------------
# UPGRADE PACKAGE — "rainwater": roof runoff -> gutter -> big tank -> outdoor showers,
# ONE shower per stall (so 3x3 -> 3 showers, 2x2 -> 2). Self-contained, opt-in builder so
# one source file renders base vs. upgraded. Enable with `-- --upgrade=rainwater`.
# --------------------------------------------------------------------------------------
def build_rainwater_package():
    by = DECK_Y1                    # back wall exterior face (+Y side)
    eave_y = ROOF_BACK_Y            # low roof eave where runoff collects (y = 13.0)
    eave_z = roof_z(eave_y)         # roof height at the back eave (~9.5)

    # Gutter along the low back eave (galvanized half-trough, modeled as a slim box).
    box("RW_Gutter", (-1.0, eave_y - 0.28, eave_z - 0.48),
        (DECK_X1, eave_y + 0.04, eave_z - 0.16), M_PIPE)

    # Big poly cistern standing at the back-east corner, clear of the shed footprint.
    tk_x, tk_y, tk_r, tk_h = DECK_X1 + 1.6, 14.8, 2.5, 7.0
    cylinder("RW_Tank", tk_x, tk_y, 0.0, tk_h, tk_r, M_TANK)
    cylinder("RW_TankLid", tk_x, tk_y, tk_h, tk_h + 0.25, tk_r * 0.55, M_STACK)

    # Downspout: gutter east end -> horizontal run -> drop into the tank lid.
    box("RW_Spout_h", (DECK_X1 - 0.8, eave_y - 0.14, eave_z - 0.46),
        (tk_x, eave_y + 0.14, eave_z - 0.30), M_PIPE)
    cylinder("RW_Spout_v", tk_x, eave_y, tk_h, eave_z - 0.30, 0.16, M_PIPE)

    # Supply line: tank -> along the base of the back wall to the showers.
    box("RW_Supply", (2.6, by + 0.12, 0.45), (tk_x, by + 0.32, 0.70), M_PIPE)

    # One outdoor shower head per stall, on the back wall (+Y), centred on the stall.
    for (key, sx0, sx1, sy0, acc, door, vent_x, throne, hatch) in STALLS:
        sx = (sx0 + sx1) / 2.0
        rtop = 7.2
        cylinder(f"RW_ShRiser_{key}", sx, by + 0.22, 0.55, rtop, 0.07, M_PIPE)      # riser
        box(f"RW_ShArm_{key}", (sx - 0.06, by + 0.16, rtop - 0.10),
            (sx + 0.06, by + 1.05, rtop), M_PIPE)                                    # arm out
        cylinder(f"RW_ShHead_{key}", sx, by + 0.95, rtop - 0.34, rtop - 0.12, 0.22, M_STACK)  # head

    # Shower floor: a light gravel strip behind the back wall.
    box("RW_ShowerPad", (1.5, by + 0.0, 0.0), (EAST_FACE - 1.5, by + 3.0, 0.06), M_GRAVEL)


if "rainwater" in ENABLED_UPGRADES:
    build_rainwater_package()

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
_tx = DECK_X1 * 0.55              # aim point tracks the deck width so 2x2 stays framed
target = bpy.data.objects.new("CamTarget", None)
bpy.context.collection.objects.link(target)
target.location = (_tx * FT, 7.0 * FT, 4.0 * FT)

cam_data = bpy.data.cameras.new("Camera")
cam_data.lens = 38
cam = bpy.data.objects.new("Camera", cam_data)
bpy.context.collection.objects.link(cam)
# Base = front-right hero; rainwater upgrade = back-right so the showers + tank show.
if "rainwater" in ENABLED_UPGRADES:
    cam.location = ((DECK_X1 + 24) * FT, 44 * FT, 30 * FT)
    target.location = (_tx * FT, 11.0 * FT, 4.0 * FT)
else:
    cam.location = ((DECK_X1 + 24) * FT, -24 * FT, 30 * FT)
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
