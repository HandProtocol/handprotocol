#!/usr/bin/env blender --background --python louver_stall.py
"""
Reimagine Ranch — 3-wall louver + curved-metal stall (massing).

Recreates the outdoor-shower build from the reference photo: TWO louvered cedar panels
as splayed side walls + a CURVED corrugated galvanized-metal sheet as the back wall,
open at the front. This is the base design that becomes the toilet stall (we add a
little more — roof / fixtures — in a later step).

    blender --background --python rr/blender/louver_stall.py < /dev/null
    blender --background --python rr/blender/louver_stall.py -- --no-render < /dev/null

All authored dimensions in FEET / degrees. Tweak PANEL + STALL below.
"""
import bpy
import math
import os
import sys
import mathutils

FT = 0.3048
HERE = os.path.dirname(os.path.abspath(__file__))
RENDER_DIR = os.path.join(HERE, "renders")
os.makedirs(RENDER_DIR, exist_ok=True)
BLEND_PATH = os.path.join(HERE, "louver_stall.blend")
RENDER_PATH = os.path.join(RENDER_DIR, "louver_stall_iso.png")
DO_RENDER = "--no-render" not in sys.argv

# Single panel (matches louver_panel.py; level top — HORN 0)
PANEL = dict(W=3.0, H=7.0, DEP=0.18, POST_W=0.30, RAIL_T=0.30, HORN=0.0,
             SILL_T=0.16, LOUVER_BW=0.30, LOUVER_TH=0.045,
             LOUVER_PITCH=0.16, LOUVER_RAKE=35.0,
             VENT_H=1.10)   # top vent band of raked vertical slats (the relocated opening)

# Stall layout: 3 walls — a curved metal BACK joining two louver SIDE panels, + a front door.
# The two side panels run front-to-back; the metal spans between their back edges and is
# what holds them together; a louver door closes the front (shown ajar).
STALL = dict(
    HALF_W=1.5,      # half stall width (back + door panels are 3 ft = full width)
    SIDE_BACK=1.4,   # y where the side louver panels begin (metal fills SIDE_BACK..BACK_Y)
    BACK_Y=2.4,      # y of the back louver wall
    BOW=0.22,        # how far the metal connectors bow outward (the curve)
    METAL_H=6.8,     # corrugated metal height (a touch under the 7 ft panels)
    DOOR_AJAR=22.0,  # front-door swing (deg) so it reads as a door
    ROOF_RISE=1.4,   # gable ridge height above the eave (the roof pitch)
    ROOF_OH=0.6,     # roof overhang past the walls
    ROOF_GAP=0.12,   # gap between the wall tops and the roof
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


def box_local(name, p0, p1, material, objs, rot_x=0.0):
    """Box kept as an OBJECT transform (no apply) so the whole panel can be moved/rotated
    later by premultiplying matrix_world."""
    cx, cy, cz = ((p0[0]+p1[0])/2, (p0[1]+p1[1])/2, (p0[2]+p1[2])/2)
    sx, sy, sz = (abs(p1[0]-p0[0]), abs(p1[1]-p0[1]), abs(p1[2]-p0[2]))
    bpy.ops.mesh.primitive_cube_add(size=2, location=(cx*FT, cy*FT, cz*FT))
    o = bpy.context.active_object
    o.name = name
    o.scale = (sx/2*FT, sy/2*FT, sz/2*FT)
    if rot_x:
        o.rotation_euler = (math.radians(rot_x), 0.0, 0.0)
    o.data.materials.append(material)
    objs.append(o)
    return o


def build_panel(objs, M_FRAME, M_LOUVER, M_SCREW):
    """One louver panel in its local frame: a flat wall in X-Z facing -Y, hinge at x=0."""
    P = PANEL
    W, H, DEP, PW = P["W"], P["H"], P["DEP"], P["POST_W"]
    y0, y1 = 0.0, DEP
    yc = (y0 + y1) / 2.0
    box_local("Post_L", (0.0, y0, 0.0), (PW, y1, H), M_FRAME, objs)
    box_local("Post_R", (W-PW, y0, 0.0), (W, y1, H), M_FRAME, objs)
    rail_top = H - P["HORN"]
    box_local("TopRail", (PW, y0, rail_top-P["RAIL_T"]), (W-PW, y1, rail_top), M_FRAME, objs)
    box_local("Sill", (0.0, y0, 0.0), (W, y1, P["SILL_T"]), M_FRAME, objs)   # closed bottom
    bx0, bx1 = PW+0.04, W-PW-0.04

    # TOP vent band (the opening, now moved up): raked VERTICAL slats — our latrine-crown
    # style — closing the opening while keeping it vented / feeling open.
    vent_hi = rail_top - P["RAIL_T"] - 0.04
    vent_lo = vent_hi - P["VENT_H"]
    box_local("VentRail", (PW, y0, vent_lo-0.12), (W-PW, y1, vent_lo), M_FRAME, objs)
    sw, vp, vdep = 0.14, 0.30, 0.13
    xx, i = bx0 + 0.10, 0
    while xx <= bx1 - 0.05:
        box_local(f"VentSlat_{i}", (xx, yc-vdep/2, vent_lo+0.02), (xx+sw, yc+vdep/2, vent_hi-0.02),
                  M_LOUVER, objs, rot_x=15.0)
        xx += vp
        i += 1

    # MAIN horizontal louver field — now runs from just above the sill up to the vent band
    bw, th = P["LOUVER_BW"], P["LOUVER_TH"]
    field_lo, field_hi = P["SILL_T"] + 0.08, vent_lo - 0.16
    z, i = field_lo + bw/2, 0
    while z <= field_hi:
        box_local(f"Louver_{i}", (bx0, yc-bw/2, z-th/2), (bx1, yc+bw/2, z+th/2),
                  M_LOUVER, objs, rot_x=P["LOUVER_RAKE"])
        z += P["LOUVER_PITCH"]
        i += 1

    # mosquito netting over the whole vented area (main field + vent band), exterior (-Y)
    box_local("Net", (bx0-0.05, -0.15, field_lo-0.05), (bx1+0.05, -0.13, vent_hi+0.05), M_NET, objs)


def place(objs, M):
    # use matrix_basis (always reflects loc/rot/scale) — matrix_world can be stale for
    # objects not created via bpy.ops (e.g. the FONT text), which would drop their placement.
    for o in objs:
        o.matrix_world = M @ o.matrix_basis


def T(tx, ty, deg, mirror=False):
    m = mathutils.Matrix.Translation((tx*FT, ty*FT, 0)) @ mathutils.Matrix.Rotation(math.radians(deg), 4, "Z")
    if mirror:
        m = m @ mathutils.Matrix.Diagonal((-1, 1, 1, 1))
    return m


def build_metal(objs, xa, ya, xb, yb, bow, H, material, ribs=30):
    """Curved corrugated metal sheet: a row of vertical ribs along a bowed arc."""
    dx, dy = xb-xa, yb-ya
    L = math.hypot(dx, dy)
    nx, ny = -dy/L, dx/L
    pts = []
    for i in range(ribs):
        t = i/(ribs-1)
        off = 4*bow*t*(1-t)
        pts.append((xa+dx*t+nx*off, ya+dy*t+ny*off))
    w = (L/ribs)*1.15
    for i, (x, y) in enumerate(pts):
        j0, j1 = max(0, i-1), min(ribs-1, i+1)
        ang = math.atan2(pts[j1][1]-pts[j0][1], pts[j1][0]-pts[j0][0])
        d = 0.05 + (0.05 if i % 2 == 0 else 0.0)   # alternating proud ribs = corrugation
        bpy.ops.mesh.primitive_cube_add(size=2, location=(x*FT, y*FT, (H/2)*FT))
        o = bpy.context.active_object
        o.name = f"Metal_{i}"
        o.scale = (w/2*FT, d/2*FT, H/2*FT)
        o.rotation_euler = (0, 0, ang)
        o.data.materials.append(material)
        objs.append(o)


def roof_slope(name, x_ridge, x_eave, y0, y1, z_ridge, z_eave, thick, material, objs):
    """One pitched roof plane (a thin slab) from the ridge line to an eave line."""
    verts = [(x_ridge, y0, z_ridge), (x_ridge, y1, z_ridge), (x_eave, y1, z_eave), (x_eave, y0, z_eave),
             (x_ridge, y0, z_ridge-thick), (x_ridge, y1, z_ridge-thick),
             (x_eave, y1, z_eave-thick), (x_eave, y0, z_eave-thick)]
    verts = [(a*FT, b*FT, c*FT) for a, b, c in verts]
    faces = [(0, 1, 2, 3), (7, 6, 5, 4), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)]
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    me.update()
    o = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(o)
    o.data.materials.append(material)
    objs.append(o)


def build_gable_roof(objs, half_w, oh, y_a, y_b, z_eave, rise, metal, frame):
    """A real gable metal roof: two pitched slopes meeting at a ridge, ridge cap, eave
    fascia, and an overhang past the walls. Gable ends left open (vented)."""
    ex = half_w + oh
    z_ridge = z_eave + rise
    roof_slope("Roof_L", 0.0, -ex, y_a, y_b, z_ridge, z_eave, 0.14, metal, objs)
    roof_slope("Roof_R", 0.0, ex, y_a, y_b, z_ridge, z_eave, 0.14, metal, objs)
    box_local("RidgeCap", (-0.13, y_a, z_ridge-0.05), (0.13, y_b, z_ridge+0.13), metal, objs)
    box_local("Fascia_L", (-ex-0.03, y_a, z_eave-0.40), (-ex+0.08, y_b, z_eave+0.03), frame, objs)
    box_local("Fascia_R", (ex-0.08, y_a, z_eave-0.40), (ex+0.03, y_b, z_eave+0.03), frame, objs)


def build_toilet(objs):
    """A new-age composting toilet: white pedestal, seat with opening, raised lid, black
    vent pipe up the back. Centered, toward the back wall, facing the door (-Y)."""
    cx, ty = 0.0, 1.5
    box_local("CT_body", (cx-0.62, ty-0.7, 0.0), (cx+0.62, ty+0.7, 1.18), M_FIXTURE, objs)
    box_local("CT_deck", (cx-0.66, ty-0.74, 1.18), (cx+0.66, ty+0.74, 1.36), M_FIXTURE, objs)
    box_local("CT_seat", (cx-0.52, ty-0.5, 1.36), (cx+0.52, ty+0.58, 1.45), M_SEAT, objs)
    box_local("CT_hole", (cx-0.26, ty-0.26, 1.40), (cx+0.26, ty+0.30, 1.46), M_VENT, objs)
    box_local("CT_lid", (cx-0.52, ty+0.5, 1.45), (cx+0.52, ty+0.58, 2.05), M_SEAT, objs, rot_x=-18)
    box_local("CT_vent", (cx+0.42, ty+0.5, 1.2), (cx+0.56, ty+0.64, 6.9), M_VENT, objs)  # vent up the back


def cyl_y(name, x, y, z, r, depth, material, objs):
    """A disc facing -Y (cylinder along the Y axis) — for the crescent moon."""
    bpy.ops.mesh.primitive_cylinder_add(radius=r*FT, depth=depth*FT, vertices=24,
                                         location=(x*FT, y*FT, z*FT))
    o = bpy.context.active_object
    o.name = name
    o.rotation_euler = (math.radians(90), 0, 0)
    o.data.materials.append(material)
    objs.append(o)
    return o


def text_obj(body, x, y, z, size_ft, material, objs):
    """Centered 3D text facing -Y (the door front), in the door's local frame."""
    c = bpy.data.curves.new("BrandTextCurve", type="FONT")
    c.body = body
    c.align_x = "CENTER"
    c.align_y = "CENTER"
    c.size = size_ft * FT
    c.extrude = 0.004
    o = bpy.data.objects.new("BrandText", c)
    bpy.context.collection.objects.link(o)
    o.location = (x*FT, y*FT, z*FT)
    o.rotation_euler = (math.radians(90), 0, 0)
    o.data.materials.append(material)
    objs.append(o)
    return o


def build_door_branding(objs):
    """Mounted sign on the door front (door local frame): dark plate, a little outhouse
    (body + roof + door + crescent moon), and 'Reimagine Ranch' in cream."""
    box_local("Sign_plate", (0.5, -0.20, 3.25), (2.5, -0.16, 5.15), M_SIGN, objs)
    # outhouse emblem (cream), proud of the plate
    box_local("OH_body", (1.33, -0.235, 4.22), (1.67, -0.205, 4.66), M_BRAND, objs)
    box_local("OH_roof", (1.26, -0.235, 4.64), (1.74, -0.205, 4.73), M_BRAND, objs)
    box_local("OH_door", (1.42, -0.25, 4.22), (1.58, -0.235, 4.54), M_SIGN, objs)   # dark doorway
    cyl_y("OH_moon", 1.50, -0.255, 4.42, 0.052, 0.02, M_BRAND, objs)                # cream disc
    cyl_y("OH_moonbite", 1.517, -0.262, 4.425, 0.044, 0.02, M_SIGN, objs)           # dark bite -> crescent
    # lettering
    text_obj("Reimagine", 1.5, -0.215, 3.86, 0.20, M_BRAND, objs)
    text_obj("Ranch", 1.5, -0.215, 3.54, 0.20, M_BRAND, objs)


# ─── Build ────────────────────────────────────────────────────────────────────────
clear_scene()
M_FRAME = mat("Frame", (0.80, 0.66, 0.42), rough=0.7)
M_LOUVER = mat("Louver", (0.74, 0.50, 0.31), rough=0.6)
M_METAL = mat("GalvSheet", (0.66, 0.68, 0.71), rough=0.35, metallic=0.85)
M_GRADE = mat("Grade", (0.16, 0.27, 0.11), rough=0.95)
M_SCREW = mat("Screw", (0.18, 0.16, 0.14), rough=0.5, metallic=0.7)
M_SIGN = mat("SignPlate", (0.16, 0.11, 0.07), rough=0.6)    # dark routed-board background
M_BRAND = mat("Brand", (0.93, 0.89, 0.78), rough=0.5)       # cream icon + lettering
M_FIXTURE = mat("Fixture", (0.90, 0.89, 0.85), rough=0.5)   # composting-toilet body
M_SEAT = mat("Seat", (0.96, 0.96, 0.95), rough=0.4)         # seat + lid
M_VENT = mat("VentPipe", (0.05, 0.05, 0.05), rough=0.5)     # black vent + seat opening
M_NET = mat("MozzieNet", (0.05, 0.06, 0.06), rough=0.9)     # mosquito netting (translucent)
try:
    M_NET.node_tree.nodes["Principled BSDF"].inputs["Alpha"].default_value = 0.40
except Exception:
    pass

S = STALL
HW, SB, BY = S["HALF_W"], S["SIDE_BACK"], S["BACK_Y"]
FRONTY = SB - PANEL["W"]           # side panels run front-to-back; their front edge

# BACK louver panel — the back wall, facing the door (-Y)
B = []
build_panel(B, M_FRAME, M_LOUVER, M_SCREW)
place(B, T(-HW, BY, 0))

# LEFT + RIGHT louver SIDE panels (run front-to-back); right mirrors left
L = []
build_panel(L, M_FRAME, M_LOUVER, M_SCREW)
MLs = T(-HW, SB, -90)
place(L, MLs)
R = []
build_panel(R, M_FRAME, M_LOUVER, M_SCREW)
place(R, mathutils.Matrix.Diagonal((-1, 1, 1, 1)) @ MLs)

# LEFT + RIGHT curved corrugated metal CONNECTORS — extend out from the back panel corners
# to the side panels (bow outward = the curve). These hold the panels together.
build_metal([], -HW, SB, -HW, BY, S["BOW"], S["METAL_H"], M_METAL)    # left, bows -X (out)
build_metal([], HW, SB, HW, BY, -S["BOW"], S["METAL_H"], M_METAL)     # right, bows +X (out)

# Front HINGED branded louver DOOR — hinges on the left edge, swung open
D = []
build_panel(D, M_FRAME, M_LOUVER, M_SCREW)
build_door_branding(D)
place(D, T(-HW, FRONTY, -S["DOOR_AJAR"]))
for hz in (0.8, 3.4, 6.2):          # barrel hinges on the door's left (hinge) edge
    bpy.ops.mesh.primitive_cylinder_add(radius=0.06*FT, depth=0.45*FT, vertices=12,
                                        location=(-HW*FT, FRONTY*FT, hz*FT))
    o = bpy.context.active_object
    o.name = f"Hinge_{int(hz*10)}"
    o.data.materials.append(M_VENT)

# Real gable metal ROOF over the stall, with overhang
build_gable_roof([], HW, S["ROOF_OH"], FRONTY - S["ROOF_OH"], BY + S["ROOF_OH"],
                 PANEL["H"] + S["ROOF_GAP"], S["ROOF_RISE"], M_METAL, M_FRAME)

# New-age composting toilet inside, against the back, facing the door
build_toilet([])

# Ground
box_local("Plane_Grade", (-6, -6, -0.05), (6, 6, 0.0), M_GRADE, [])

# ─── World + sun ──────────────────────────────────────────────────────────────────
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
ramp.color_ramp.elements[0].color = (0.60, 0.65, 0.54, 1.0)
ramp.color_ramp.elements[1].position = 0.9
ramp.color_ramp.elements[1].color = (0.36, 0.50, 0.62, 1.0)
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
sun.rotation_euler = (math.radians(55), math.radians(12), math.radians(-46))

# ─── Camera (front 3/4, open side toward us, like the photo) ─────────────────────
target = bpy.data.objects.new("CamTarget", None)
bpy.context.collection.objects.link(target)
target.location = (0, 0.4*FT, 4.6*FT)
cam_d = bpy.data.cameras.new("Camera")
cam_d.lens = 32
cam = bpy.data.objects.new("Camera", cam_d)
bpy.context.collection.objects.link(cam)
cam.location = (7.4*FT, -16.0*FT, 7.6*FT)
trk = cam.constraints.new(type="TRACK_TO")
trk.target = target
trk.track_axis = "TRACK_NEGATIVE_Z"
trk.up_axis = "UP_Y"
bpy.context.scene.camera = cam

# ─── Render ─────────────────────────────────────────────────────────────────────
scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"
scene.cycles.samples = 96
scene.cycles.use_denoising = True
scene.render.resolution_x = 1400
scene.render.resolution_y = 1050
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
