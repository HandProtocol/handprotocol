# ─────────────────────────────────────────────────────────────────────────────
# CROWN LOUVER SLATS — tweak these numbers, then re-run the build:
#
#     blender --background --python rr/blender/compost_latrine.py < /dev/null
#     (add  -- --no-render  on the end for a fast geometry-only check)
#
# Everything is in FEET, except RAKE_DEG which is in DEGREES.
# Suggested ranges are in the comments. Just change a value and re-run — the rest of
# the model is untouched.
# ─────────────────────────────────────────────────────────────────────────────

RAKE_DEG    = 15.0   # slat tilt; tops lean OUTWARD.  0 = straight vertical · 10–25 typical
SLAT_PITCH  = 0.40   # spacing center-to-center.  SMALLER = more/denser slats · 0.28–0.55
SLAT_WIDTH  = 0.16   # width of each slat along the wall.  0.10–0.22
SLAT_DEPTH  = 0.12   # how far each slat sticks out from the wall face.  0.08–0.20
BAND_HEIGHT = 1.20   # total height of the crown band, measured down from the roofline.  0.8–1.8
CAP_THICK   = 0.16   # thickness of the top cornice + bottom rail.  0.10–0.24
WRAP_ALL    = True   # True = wrap all four sides · False = front + the two ends only
