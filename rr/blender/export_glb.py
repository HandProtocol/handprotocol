#!/usr/bin/env blender --background <blend> --python export_glb.py -- <out.glb>
"""Export the currently-open .blend to a GLB for the web wireframe viewer.

Strips the camera, lights, sky and the big grade plane (we only want the building +
ramp + stair), then writes a compact GLB. Run per config:

    blender --background rr/blender/compost_latrine.blend --python rr/blender/export_glb.py -- out.glb
"""
import bpy
import sys

out = sys.argv[-1]

# Remove things we don't want in the 3D toy: cameras, lights, the empty target, the
# ground plane (huge + flat, just clutters the orbit view).
drop = []
for o in bpy.data.objects:
    if o.type in {"CAMERA", "LIGHT", "EMPTY"}:
        drop.append(o)
    elif o.type == "MESH" and o.name.startswith("Plane_Grade"):
        drop.append(o)
for o in drop:
    bpy.data.objects.remove(o, do_unlink=True)

bpy.ops.object.select_all(action="SELECT")
bpy.ops.export_scene.gltf(
    filepath=out,
    export_format="GLB",
    use_selection=True,
    export_apply=True,        # apply transforms/rotations (the raked slats!) into the mesh
    export_yup=True,
)
print(f"[RR] exported GLB -> {out}")
