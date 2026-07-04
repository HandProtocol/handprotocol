#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OUT="$ROOT/web/sprint/assets/video"
SRC="$ROOT/web/sprint/assets/video-source"
FONT="/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONT_BOLD="/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

mkdir -p "$OUT" "$SRC"
rm -f "$SRC"/*.mp4 "$SRC"/*.txt

W=1920
H=1080
FPS=30

escape_text() {
  local text="$1"
  text="${text//:/\\:}"
  text="${text//\'/\\\'}"
  printf "%s" "$text"
}

make_scene() {
  local name="$1"
  local duration="$2"
  local image="$3"
  local eyebrow="$4"
  local title="$5"
  local body="$6"
  local title_size="${7:-74}"
  local body_size="${8:-34}"
  local image_abs="$ROOT/$image"
  local out="$SRC/$name.mp4"
  local frames=$((duration * FPS))
  local e t b
  e="$(escape_text "$eyebrow")"
  t="$(escape_text "$title")"
  b="$(escape_text "$body")"

  ffmpeg -y -hide_banner -loglevel error \
    -framerate "$FPS" -loop 1 -t "$duration" -i "$image_abs" \
    -f lavfi -t "$duration" -i "color=c=#f7f3eb:s=${W}x${H}:r=${FPS}" \
    -filter_complex "\
      [0:v]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},format=rgba,colorchannelmixer=aa=0.34[photo];\
      [1:v][photo]overlay=0:0,\
      drawbox=x=0:y=0:w=${W}:h=${H}:color=0xf7f3eb@0.35:t=fill,\
      drawbox=x=120:y=120:w=1680:h=840:color=0xfffdf8@0.78:t=fill,\
      drawbox=x=120:y=120:w=1680:h=840:color=0xe6ded1@1:t=2,\
      drawtext=fontfile='${FONT_BOLD}':text='${e}':x=180:y=178:fontsize=27:fontcolor=0x8f561b,\
      drawtext=fontfile='${FONT_BOLD}':text='${t}':x=180:y=258:fontsize=${title_size}:fontcolor=0x1f2933:line_spacing=12:box=0,\
      drawtext=fontfile='${FONT}':text='${b}':x=185:y=560:fontsize=${body_size}:fontcolor=0x53606b:line_spacing=12,\
      drawbox=x=180:y=885:w=420:h=6:color=0x8f561b@0.88:t=fill,\
      drawtext=fontfile='${FONT_BOLD}':text='HAND Protocol':x=1340:y=884:fontsize=30:fontcolor=0x25322f,\
      format=yuv420p[v]" \
    -map "[v]" -frames:v "$frames" -r "$FPS" -c:v libx264 -preset ultrafast -crf 28 -threads 2 -pix_fmt yuv420p -movflags +faststart "$out"
}

concat_video() {
  local list="$1"
  local output="$2"
  ffmpeg -y -hide_banner -loglevel error \
    -f concat -safe 0 -i "$list" \
    -c copy "$output"
}

make_scene "short-01" 3 \
  "web/reimagineranch/compost-latrine/img/iso.jpg" \
  "BUILDING BEFORE FUNDS" \
  "Practical infrastructure first." \
  "In late August 2024, HAND was already building patterns before funds arrived." \
  70 34

make_scene "short-02" 3 \
  "web/reimagineranch/compost-latrine/img/front.jpg" \
  "LAND AND HEALTH" \
  "A latrine is more than a toilet." \
  "It is dignity, access, field learning, and community build capacity." \
  66 34

make_scene "short-03" 3 \
  "web/reimagineranch/compost-latrine/img/hex-night.jpg" \
  "MEMORY" \
  "Story work needs protection." \
  "Public goods require consent, privacy, and sovereign choice." \
  70 34

make_scene "short-04" 3 \
  "web/reimagineranch/compost-latrine/img/opt-rainwater.jpg" \
  "FOOD SHARE" \
  "Eggs for protein. Nuts for balance." \
  "Simple nutrition can move through trusted local routes." \
  66 34

make_scene "short-05" 3 \
  "web/reimagineranch/compost-latrine/img/hex-front.jpg" \
  "THE ASK" \
  "Fund the layer that lets care continue." \
  "HAND stands for Holistic Approach to Nurture and Develop." \
  66 34

printf "file '%s'\nfile '%s'\nfile '%s'\nfile '%s'\nfile '%s'\n" \
  "$SRC/short-01.mp4" \
  "$SRC/short-02.mp4" \
  "$SRC/short-03.mp4" \
  "$SRC/short-04.mp4" \
  "$SRC/short-05.mp4" > "$SRC/short.txt"
concat_video "$SRC/short.txt" "$OUT/hand-sprint-15s.mp4"

ffmpeg -y -hide_banner -loglevel error \
  -stream_loop -1 -i "$OUT/hand-sprint-15s.mp4" \
  -t 104 -c:v libx264 -preset ultrafast -crf 28 -pix_fmt yuv420p -movflags +faststart \
  "$OUT/hand-sprint-104s.mp4"

ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$OUT/hand-sprint-15s.mp4"
ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$OUT/hand-sprint-104s.mp4"
