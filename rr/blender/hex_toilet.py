#!/usr/bin/env blender --background --python hex_toilet.py
"""
Reimagine Ranch — Hexagonal composting toilet, sacred-geometry / toroidal-hexa field.

A HEXAGONAL plan (6 walls: a branded louver door + 3 louver panels + 2 curved corrugated
metal connectors) capped by a TOROIDAL HEX ROOF: six facets flaring at the eaves and
sweeping up to a central OCULUS vent. The oculus is the torus throat — the passive compost
updraft rises through it, so the toroidal field is also the ventilation. Inside: a new-age
composting toilet; outside: mosquito netting over the louvers.

    blender --background --python rr/blender/hex_toilet.py < /dev/null
    blender --background --python rr/blender/hex_toilet.py -- --no-render < /dev/null
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
DO_RENDER = "--no-render" not in sys.argv
NIGHT = "--night" in sys.argv               # night-beacon mode (glowing oculus + lantern)
SUF = "_night" if NIGHT else ""
BLEND_PATH = os.path.join(HERE, f"hex_toilet{SUF}.blend")
RENDER_PATH = os.path.join(RENDER_DIR, f"hex_toilet{SUF}_iso.png")
TWIST = math.radians(26)                    # total roof vortex twist (eave -> oculus)

PANEL = dict(W=3.0, H=7.0, DEP=0.18, POST_W=0.30, RAIL_T=0.30, HORN=0.0,
             SILL_T=0.16, LOUVER_BW=0.30, LOUVER_TH=0.045,
             LOUVER_PITCH=0.16, LOUVER_RAKE=35.0, VENT_H=1.10)

HEX = dict(
    SIDE=3.0,         # hexagon side = panel width; vertex radius = side
    BOW=0.15,         # metal-connector wall curve
    METAL_H=6.9,      # corrugated metal wall height
    DOOR_AJAR=24.0,   # door swing
    ROOF_EAVE_R=3.7,  # roof eave vertex radius (wall vertex 3.0 + overhang)
    ROOF_EAVE_Z=7.5,  # eave height — ABOVE the 7 ft walls/door so the door clears when open;
                      # the wall-top..eave gap is the vented toroidal intake
    OCULUS_R=0.9,     # oculus (torus throat) vertex radius
    OCULUS_Z=9.7,     # oculus height
    ROOF_COURSES=5,   # facet rings from eave to oculus
)

# All six walls are WOOD louver panels (door + 5 louver). Metal is used ONLY to conjoin
# them — slim corrugated CORNER connectors at the vertices, not as full walls.
ROLES = ["door", "louver", "louver", "louver", "louver", "louver"]


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


def place(objs, M):
    for o in objs:
        o.matrix_world = M @ o.matrix_basis


def T(tx, ty, deg):
    return mathutils.Matrix.Translation((tx*FT, ty*FT, 0)) @ mathutils.Matrix.Rotation(math.radians(deg), 4, "Z")


def quad_slab(name, p0, p1, p2, p3, thick, material, objs):
    top = [p0, p1, p2, p3]
    verts = [(x*FT, y*FT, z*FT) for (x, y, z) in top] + [(x*FT, y*FT, (z-thick)*FT) for (x, y, z) in top]
    faces = [(0, 1, 2, 3), (7, 6, 5, 4), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)]
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    me.update()
    o = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(o)
    o.data.materials.append(material)
    objs.append(o)


def cyl_z(name, x, y, z0, z1, r, material, objs, verts=20):
    bpy.ops.mesh.primitive_cylinder_add(radius=r*FT, depth=(z1-z0)*FT, vertices=verts,
                                        location=(x*FT, y*FT, ((z0+z1)/2)*FT))
    o = bpy.context.active_object
    o.name = name
    o.data.materials.append(material)
    objs.append(o)
    return o


def cyl_y(name, x, y, z, r, depth, material, objs):
    bpy.ops.mesh.primitive_cylinder_add(radius=r*FT, depth=depth*FT, vertices=24,
                                        location=(x*FT, y*FT, z*FT))
    o = bpy.context.active_object
    o.name = name
    o.rotation_euler = (math.radians(90), 0, 0)
    o.data.materials.append(material)
    objs.append(o)


def text_obj(body, x, y, z, size_ft, material, objs):
    c = bpy.data.curves.new("BrandTextCurve", type="FONT")
    c.body = body
    c.align_x = "CENTER"
    c.align_y = "CENTER"
    c.size = size_ft*FT
    c.extrude = 0.004
    o = bpy.data.objects.new("BrandText", c)
    bpy.context.collection.objects.link(o)
    o.location = (x*FT, y*FT, z*FT)
    o.rotation_euler = (math.radians(90), 0, 0)
    o.data.materials.append(material)
    objs.append(o)


# ── materials ──────────────────────────────────────────────────────────────────────
clear_scene()
M_FRAME = mat("Frame", (0.80, 0.66, 0.42), rough=0.7)
M_LOUVER = mat("Louver", (0.74, 0.50, 0.31), rough=0.6)
M_METAL = mat("GalvSheet", (0.66, 0.68, 0.71), rough=0.35, metallic=0.85)
M_GRADE = mat("Grade", (0.16, 0.27, 0.11), rough=0.95)
M_SIGN = mat("SignPlate", (0.16, 0.11, 0.07), rough=0.6)
M_BRAND = mat("Brand", (0.93, 0.89, 0.78), rough=0.5)
M_FIXTURE = mat("Fixture", (0.90, 0.89, 0.85), rough=0.5)
M_SEAT = mat("Seat", (0.96, 0.96, 0.95), rough=0.4)
M_VENT = mat("VentPipe", (0.05, 0.05, 0.05), rough=0.5)
M_NET = mat("MozzieNet", (0.05, 0.06, 0.06), rough=0.9)
try:
    M_NET.node_tree.nodes["Principled BSDF"].inputs["Alpha"].default_value = 0.40
except Exception:
    pass
M_COPPER = mat("Copper", (0.62, 0.34, 0.17), rough=0.32, metallic=0.95)
M_CHARRED = mat("CharredCedar", (0.06, 0.055, 0.05), rough=0.8)
M_SOLAR = mat("SolarPV", (0.04, 0.06, 0.14), rough=0.15, metallic=0.6)
M_GLASS = mat("OculusGlass", (0.55, 0.72, 0.85), rough=0.05, metallic=0.2)
M_GLOW = mat("Glow", (1.0, 0.74, 0.34), rough=0.5)
for _m, _alpha in ((M_GLASS, 0.35),):
    try:
        _m.node_tree.nodes["Principled BSDF"].inputs["Alpha"].default_value = _alpha
    except Exception:
        pass
try:  # the oculus glow ring (and a warm interior) carry the night beacon
    _b = M_GLOW.node_tree.nodes["Principled BSDF"]
    _b.inputs["Emission Color"].default_value = (1.0, 0.72, 0.32, 1.0)
    _b.inputs["Emission Strength"].default_value = 16.0 if NIGHT else 3.5
except Exception:
    pass


def build_panel(objs, louver_mat=None):
    lm = louver_mat or M_LOUVER
    P = PANEL
    W, H, DEP, PW = P["W"], P["H"], P["DEP"], P["POST_W"]
    y0, y1 = 0.0, DEP
    yc = (y0+y1)/2.0
    box_local("Post_L", (0.0, y0, 0.0), (PW, y1, H), M_FRAME, objs)
    box_local("Post_R", (W-PW, y0, 0.0), (W, y1, H), M_FRAME, objs)
    rail_top = H - P["HORN"]
    box_local("TopRail", (PW, y0, rail_top-P["RAIL_T"]), (W-PW, y1, rail_top), M_FRAME, objs)
    box_local("Sill", (0.0, y0, 0.0), (W, y1, P["SILL_T"]), M_FRAME, objs)
    bx0, bx1 = PW+0.04, W-PW-0.04
    vent_hi = rail_top - P["RAIL_T"] - 0.04
    vent_lo = vent_hi - P["VENT_H"]
    box_local("VentRail", (PW, y0, vent_lo-0.12), (W-PW, y1, vent_lo), M_FRAME, objs)
    xx, i = bx0+0.10, 0
    while xx <= bx1-0.05:
        box_local(f"VentSlat_{i}", (xx, yc-0.065, vent_lo+0.02), (xx+0.14, yc+0.065, vent_hi-0.02),
                  lm, objs, rot_x=15.0)
        xx += 0.30
        i += 1
    bw, th = P["LOUVER_BW"], P["LOUVER_TH"]
    field_lo, field_hi = P["SILL_T"]+0.08, vent_lo-0.16
    z, i = field_lo + bw/2, 0
    while z <= field_hi:
        box_local(f"Louver_{i}", (bx0, yc-bw/2, z-th/2), (bx1, yc+bw/2, z+th/2),
                  lm, objs, rot_x=P["LOUVER_RAKE"])
        z += P["LOUVER_PITCH"]
        i += 1
    box_local("Net", (bx0-0.05, -0.15, field_lo-0.05), (bx1+0.05, -0.13, vent_hi+0.05), M_NET, objs)


def build_door_branding(objs):
    box_local("Sign_plate", (0.5, -0.20, 3.25), (2.5, -0.16, 5.15), M_SIGN, objs)
    box_local("OH_body", (1.33, -0.235, 4.22), (1.67, -0.205, 4.66), M_BRAND, objs)
    box_local("OH_roof", (1.26, -0.235, 4.64), (1.74, -0.205, 4.73), M_BRAND, objs)
    box_local("OH_door", (1.42, -0.25, 4.22), (1.58, -0.235, 4.54), M_SIGN, objs)
    cyl_y("OH_moon", 1.50, -0.255, 4.42, 0.052, 0.02, M_BRAND, objs)
    cyl_y("OH_moonbite", 1.517, -0.262, 4.425, 0.044, 0.02, M_SIGN, objs)
    text_obj("Reimagine", 1.5, -0.215, 3.86, 0.20, M_BRAND, objs)
    text_obj("Ranch", 1.5, -0.215, 3.54, 0.20, M_BRAND, objs)


def build_metal_wall(xa, ya, xb, yb, bow, H, ribs=22):
    dx, dy = xb-xa, yb-ya
    L = math.hypot(dx, dy)
    nx, ny = -dy/L, dx/L
    pts = [(xa+dx*(i/(ribs-1))+nx*4*bow*(i/(ribs-1))*(1-i/(ribs-1)),
            ya+dy*(i/(ribs-1))+ny*4*bow*(i/(ribs-1))*(1-i/(ribs-1))) for i in range(ribs)]
    w = (L/ribs)*1.2
    for i, (x, y) in enumerate(pts):
        j0, j1 = max(0, i-1), min(ribs-1, i+1)
        ang = math.atan2(pts[j1][1]-pts[j0][1], pts[j1][0]-pts[j0][0])
        d = 0.05 + (0.05 if i % 2 == 0 else 0.0)
        bpy.ops.mesh.primitive_cube_add(size=2, location=(x*FT, y*FT, (H/2)*FT))
        o = bpy.context.active_object
        o.name = f"Metal_{int(xa*10)}_{i}"
        o.scale = (w/2*FT, d/2*FT, H/2*FT)
        o.rotation_euler = (0, 0, ang)
        o.data.materials.append(M_METAL)


def build_corner_connectors(eave_z):
    """Slim corrugated metal strips at the 6 hexagon vertices — they CONJOIN the wood
    panels (and run up to the eave to carry the roof). Metal as connector, not wall."""
    Rv = HEX["SIDE"]
    for j in range(6):
        phi = math.radians(-120 + 60*j)
        cxv, cyv = Rv*math.cos(phi), Rv*math.sin(phi)
        tang = phi + math.radians(90)
        hx, hy = 0.28*math.cos(tang), 0.28*math.sin(tang)
        build_metal_wall(cxv-hx, cyv-hy, cxv+hx, cyv+hy, 0.0, eave_z, ribs=5)


def build_toilet():
    cx, ty = 0.0, 1.3
    objs = []
    box_local("CT_body", (cx-0.62, ty-0.7, 0.0), (cx+0.62, ty+0.7, 1.18), M_FIXTURE, objs)
    box_local("CT_deck", (cx-0.66, ty-0.74, 1.18), (cx+0.66, ty+0.74, 1.36), M_FIXTURE, objs)
    box_local("CT_seat", (cx-0.52, ty-0.5, 1.36), (cx+0.52, ty+0.58, 1.45), M_SEAT, objs)
    box_local("CT_hole", (cx-0.26, ty-0.26, 1.40), (cx+0.26, ty+0.30, 1.46), M_VENT, objs)
    box_local("CT_lid", (cx-0.52, ty+0.5, 1.45), (cx+0.52, ty+0.58, 2.05), M_SEAT, objs, rot_x=-18)


def build_toroidal_hex_roof():
    H = HEX
    ang = [math.radians(-120 + 60*j) for j in range(6)]   # the 6 hexagon vertices

    def ring(rad, z, tw=0.0):
        return [(rad*math.cos(a+tw), rad*math.sin(a+tw), z) for a in ang]

    Rv_e, z_e, Rv_o, z_o, C = H["ROOF_EAVE_R"], H["ROOF_EAVE_Z"], H["OCULUS_R"], H["OCULUS_Z"], H["ROOF_COURSES"]
    rings = [ring(Rv_e + 0.30, z_e - 0.20, 0.0)]          # flared eave lip (stays above the 7 ft door)
    for i in range(C + 1):
        t = i / C
        rad = Rv_e + (Rv_o - Rv_e) * t
        z = z_e + (z_o - z_e) * (t ** 1.6)                # concave rise = vortex throat
        rings.append(ring(rad, z, TWIST * t))             # VORTEX: each course twists toward the throat
    objs = []
    for i in range(len(rings) - 1):
        A, B = rings[i], rings[i+1]
        for j in range(6):
            k = (j + 1) % 6
            quad_slab(f"RoofF_{i}_{j}", A[j], A[k], B[k], B[j], 0.12, M_METAL, objs)
    # solar PV collar — a low dark-blue band just outside the throat (powers the night ring)
    pv = rings[-2]
    for j in range(6):
        k = (j + 1) % 6
        quad_slab(f"PV_{j}", pv[j], pv[k], (pv[k][0]*0.7, pv[k][1]*0.7, pv[k][2]+0.18),
                  (pv[j][0]*0.7, pv[j][1]*0.7, pv[j][2]+0.18), 0.04, M_SOLAR, objs)
    # oculus rim (copper band around the open throat)
    top = rings[-1]
    for j in range(6):
        k = (j + 1) % 6
        quad_slab(f"OcRim_{j}", top[j], top[k],
                  (top[k][0], top[k][1], top[k][2]+0.30), (top[j][0], top[j][1], top[j][2]+0.30),
                  0.05, M_COPPER, objs)
    build_oculus_crown(Rv_o, z_o, TWIST)


def build_oculus_crown(rv_o, z_o, tw):
    """Copper finial ring + Flower-of-Life glass cap + a glow ring (the night beacon)."""
    cz = z_o + 0.32
    # glass cap (hex disc) over the throat
    g = cyl_z("OculusGlass", 0.0, 0.0, cz, cz + 0.06, rv_o*0.95, M_GLASS, [], verts=6)
    g.rotation_euler = (0, 0, tw)
    # copper finial ring above the cap
    bpy.ops.mesh.primitive_torus_add(major_radius=rv_o*0.8*FT, minor_radius=0.06*FT,
                                     location=(0, 0, (cz+0.16)*FT))
    bpy.context.active_object.name = "Finial"
    bpy.context.active_object.data.materials.append(M_COPPER)
    # Seed of Life — 7 small copper rings on the cap
    sr = rv_o*0.40
    for jj in range(7):
        if jj == 0:
            ox, oy = 0.0, 0.0
        else:
            aa = math.radians(60*(jj-1))
            ox, oy = sr*math.cos(aa), sr*math.sin(aa)
        bpy.ops.mesh.primitive_torus_add(major_radius=sr*FT, minor_radius=0.018*FT,
                                         location=(ox*FT, oy*FT, (cz+0.085)*FT))
        bpy.context.active_object.name = f"Seed_{jj}"
        bpy.context.active_object.data.materials.append(M_COPPER)
    # glow ring at the rim — the portal beacon (emissive; blazes at night)
    bpy.ops.mesh.primitive_torus_add(major_radius=rv_o*0.78*FT, minor_radius=0.05*FT,
                                     location=(0, 0, (z_o+0.16)*FT))
    bpy.context.active_object.name = "GlowRing"
    bpy.context.active_object.data.materials.append(M_GLOW)


# ── Build the hexagon of walls ──────────────────────────────────────────────────────
# CHARRED-cedar accents: alternate charred / natural louver panels in a Flower-of-Life
# rhythm (door stays natural so the branding reads).
Rv = HEX["SIDE"]
lcount = 0
for k, role in enumerate(ROLES):
    th = -90 + 60*k
    a0, a1 = math.radians(th - 30), math.radians(th + 30)
    vs = (Rv*math.cos(a0), Rv*math.sin(a0))
    ve = (Rv*math.cos(a1), Rv*math.sin(a1))
    edge_dir = math.degrees(math.atan2(ve[1]-vs[1], ve[0]-vs[0]))
    if role == "louver":
        lm = M_CHARRED if (lcount % 2 == 1) else M_LOUVER
        lcount += 1
        P = []
        build_panel(P, louver_mat=lm)
        place(P, T(vs[0], vs[1], edge_dir))
    elif role == "metal":
        build_metal_wall(vs[0], vs[1], ve[0], ve[1], HEX["BOW"], HEX["METAL_H"])
    elif role == "door":
        D = []
        build_panel(D, louver_mat=M_LOUVER)
        build_door_branding(D)
        place(D, T(vs[0], vs[1], edge_dir - HEX["DOOR_AJAR"]))
        for hz in (0.8, 3.4, 6.2):
            cyl_z(f"Hinge_{int(hz*10)}", vs[0], vs[1], hz-0.22, hz+0.22, 0.06, M_VENT, [], verts=12)

# Metal corner connectors conjoin the wood panels + carry the roof
build_corner_connectors(HEX["ROOF_EAVE_Z"])

# ── Raised hex platform + front step + a wrap bench (lift it into a little temple) ───
_plat_r = HEX["SIDE"] + 0.9
bpy.ops.mesh.primitive_cylinder_add(vertices=6, radius=_plat_r*FT, depth=0.5*FT, location=(0, 0, -0.20*FT))
_pf = bpy.context.active_object
_pf.name = "Platform"
_pf.data.materials.append(M_FRAME)
box_local("Step", (-1.3, -4.5, -0.45), (1.3, -3.4, 0.12), M_FRAME, [])     # front step at the door
# wrap bench on the two back-side edges (a cedar ledge on charred legs)
for _bx in (-2.5, 2.5):
    box_local(f"BenchTop_{int(_bx)}", (_bx-0.55, 1.6, 1.28), (_bx+0.55, 3.0, 1.42), M_FRAME, [])
    box_local(f"BenchLeg_{int(_bx)}a", (_bx-0.5, 1.7, 0.05), (_bx-0.38, 1.9, 1.28), M_CHARRED, [])
    box_local(f"BenchLeg_{int(_bx)}b", (_bx+0.38, 2.7, 0.05), (_bx+0.5, 2.9, 1.28), M_CHARRED, [])

# Toroidal hex roof + central oculus vent (the torus axis = the compost updraft)
build_toroidal_hex_roof()
cyl_z("OculusVent", 0.0, 0.0, 1.2, HEX["OCULUS_Z"] + 0.5, 0.16, M_VENT, [])

# Composting toilet inside + ground
build_toilet()
box_local("Plane_Grade", (-7, -7, -0.05), (7, 7, 0.0), M_GRADE, [])

# ── World + sun ─────────────────────────────────────────────────────────────────────
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
ramp.color_ramp.elements[1].position = 0.9
if NIGHT:                                    # dusk sky for the night beacon
    ramp.color_ramp.elements[0].color = (0.03, 0.04, 0.08, 1.0)
    ramp.color_ramp.elements[1].color = (0.02, 0.02, 0.05, 1.0)
else:
    ramp.color_ramp.elements[0].color = (0.60, 0.65, 0.54, 1.0)
    ramp.color_ramp.elements[1].color = (0.36, 0.50, 0.62, 1.0)
tex = wn.nodes.new("ShaderNodeTexCoord")
mp = wn.nodes.new("ShaderNodeMapping")
mp.inputs["Rotation"].default_value = (math.radians(90), 0, 0)
wn.links.new(tex.outputs["Generated"], mp.inputs["Vector"])
wn.links.new(mp.outputs["Vector"], grad.inputs["Vector"])
wn.links.new(grad.outputs["Color"], ramp.inputs["Fac"])
wn.links.new(ramp.outputs["Color"], bg.inputs["Color"])
bg.inputs["Strength"].default_value = 0.10 if NIGHT else 1.1
wn.links.new(bg.outputs["Background"], out.inputs["Surface"])

sun_d = bpy.data.lights.new("Sun", type="SUN")
sun_d.energy = 0.12 if NIGHT else 3.0        # moonlight vs daylight
sun_d.angle = math.radians(2.5)
sun = bpy.data.objects.new("Sun", sun_d)
bpy.context.collection.objects.link(sun)
sun.rotation_euler = (math.radians(62), math.radians(8), math.radians(-46))

# Warm interior light — washes out by day, but at NIGHT it leaks through the louver gaps
# and up the oculus: the stall becomes a lantern / the oculus a glowing portal.
il = bpy.data.lights.new("Interior", type="POINT")
il.energy = (2600 if NIGHT else 240)
il.color = (1.0, 0.72, 0.42)
ilo = bpy.data.objects.new("Interior", il)
bpy.context.collection.objects.link(ilo)
ilo.location = (0, 0.4*FT, 3.4*FT)

# ── Camera ──────────────────────────────────────────────────────────────────────────
target = bpy.data.objects.new("CamTarget", None)
bpy.context.collection.objects.link(target)
target.location = (0, 0, 5.0*FT)
cam_d = bpy.data.cameras.new("Camera")
cam_d.lens = 30
cam = bpy.data.objects.new("Camera", cam_d)
bpy.context.collection.objects.link(cam)
cam.location = (9.0*FT, -17.0*FT, 8.6*FT)
trk = cam.constraints.new(type="TRACK_TO")
trk.target = target
trk.track_axis = "TRACK_NEGATIVE_Z"
trk.up_axis = "UP_Y"
bpy.context.scene.camera = cam

# ── Render ──────────────────────────────────────────────────────────────────────────
scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"
scene.cycles.samples = 96
scene.cycles.use_denoising = True
scene.render.resolution_x = 1400
scene.render.resolution_y = 1100
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
