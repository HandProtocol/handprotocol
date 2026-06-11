# biz-samples — image licensing record

Curated sample library for HAND demo sites. These images appear on **public** demo
pages as ambient imagery (the business's real photos stay gated to pitch pages), so
every image here was selected against a strict bar:

- **Allowed**: CC0 1.0 / Public Domain dedication, or the Unsplash License — both
  permit commercial use with **no attribution requirement**.
- **Rejected**: CC BY / CC BY-SA (attribution burden), editorial-only, anything with
  visible brand logos or readable real-business signage, faces as the subject.

All 20 images were visually reviewed (curation pass on 2026-06-11), verified as real
image files via `file` + `ffprobe`, and re-encoded to webp (max 1600px wide,
libwebp `-preset photo -quality 80`), which strips original EXIF.

Attribution below is recorded as a courtesy and provenance trail only — none of these
licenses require it.

| File | Source | Author | License | Why it permits this use |
|---|---|---|---|---|
| taco-1.webp | https://stocksnap.io/photo/mexican-tacos-UPG7YS3LGW | Tim Sullivan | CC0 1.0 | StockSnap publishes all photos under CC0: free for commercial use, no attribution. |
| taco-2.webp | https://www.rawpixel.com/image/5970864/tortillas | rawpixel | CC0 1.0 | Indexed by Openverse as CC0 (public-domain dedication); commercial use, no attribution. |
| taco-3.webp | https://wordpress.org/photos/photo/65365382d8/ | Michelle Frechette | CC0 1.0 | WordPress Photo Directory requires contributors to dedicate uploads CC0. |
| bbq-1.webp | https://www.rawpixel.com/image/5920703/photo-image-public-domain-summer-food | rawpixel | CC0 1.0 | Indexed by Openverse as CC0; commercial use, no attribution. |
| bbq-2.webp | https://www.rawpixel.com/image/5920641/photo-image-public-domain-leaf-red | rawpixel | CC0 1.0 | Indexed by Openverse as CC0; commercial use, no attribution. |
| burger-1.webp | https://www.rawpixel.com/image/5970429/burger-fries | rawpixel | CC0 1.0 | Indexed by Openverse as CC0; commercial use, no attribution. |
| coffee-1.webp | https://www.rawpixel.com/image/5908079/image-public-domain-art-coffee | rawpixel | CC0 1.0 | Indexed by Openverse as CC0; commercial use, no attribution. |
| coffee-2.webp | https://www.rawpixel.com/image/5926460/photo-image-public-domain-art-hands | rawpixel | CC0 1.0 | Indexed by Openverse as CC0; commercial use, no attribution. Hands only, no identifiable face. |
| bakery-1.webp | https://wordpress.org/photos/photo/210622cf27/ | Reyes Martínez | CC0 1.0 | WordPress Photo Directory requires contributors to dedicate uploads CC0. |
| bakery-2.webp | https://www.rawpixel.com/image/463160/free-photo-image-patisserie-baked-bakery | Markus Spiske | CC0 1.0 | Indexed by Openverse as CC0; commercial use, no attribution. |
| asian-1.webp | https://www.rawpixel.com/image/5921090/xiaolongbao-free-food-public-domain-cc0-photo | rawpixel | CC0 1.0 | Indexed by Openverse as CC0; commercial use, no attribution. |
| asian-2.webp | https://www.rawpixel.com/image/5925639/photo-image-public-domain-food-free | rawpixel | CC0 1.0 | Indexed by Openverse as CC0; commercial use, no attribution. |
| thai-1.webp | https://www.rawpixel.com/image/5928354/photo-image-public-domain-food-free | rawpixel | CC0 1.0 | Indexed by Openverse as CC0; commercial use, no attribution. |
| viet-1.webp | https://www.rawpixel.com/image/5975051/eating-vietnamese-pho-soup-with-fresh-lime | rawpixel | CC0 1.0 | Indexed by Openverse as CC0; commercial use, no attribution. Top 12% cropped to remove a partially visible third-party brand mark; hands only, no face. |
| viet-2.webp | https://www.rawpixel.com/image/447770/free-photo-image-sandwich-bread-vietnamese-food | Jakub Kapusnak | CC0 1.0 | Indexed by Openverse as CC0; commercial use, no attribution. Hands only, no face. |
| med-1.webp | https://www.rawpixel.com/image/448189/free-photo-image-falafel-sandwich-bread | Jakub Kapusnak | CC0 1.0 | Indexed by Openverse as CC0; commercial use, no attribution. Plain unbranded takeaway box. |
| seafood-1.webp | https://www.rawpixel.com/image/6032120/grilled-shrimp-free-public-domain-cc0-photo | rawpixel | CC0 1.0 | Indexed by Openverse as CC0; commercial use, no attribution. |
| breakfast-1.webp | https://stocksnap.io/photo/breakfast-eggs-KZTN4JDEIX | Foodie Girl | CC0 1.0 | StockSnap publishes all photos under CC0: free for commercial use, no attribution. |
| caribbean-1.webp | https://unsplash.com/photos/a-grill-with-meat-on-it-ofXy_NRwyjI | Jopopz Tallorin | Unsplash License | Standard (non-Plus) Unsplash photo: free for commercial use, no permission or attribution needed. Verified not Unsplash+. Gloved hands only; grill shows no readable branding. |
| default-1.webp | https://www.flickr.com/photos/88123769@N02/11194506414 | Bernard Spragg | CC0 1.0 | Photographer marks his Flickr work CC0 (public-domain dedication); commercial use, no attribution. Market produce stall, no faces or readable business signage. |

## Provenance / rejection notes

- Sourced via the Openverse API (`license=cc0,pdm`), StockSnap (CC0 site-wide), the
  WordPress Photo Directory (CC0 by policy), and one standard-license Unsplash photo.
- Rejected during curation, for the record: an Unsplash-derived burger photo with
  readable "DelFuente Hamburguesas" wrapping paper; a croissant photo with a Starbucks
  cup logo in frame; a shawarma platter and a chicken-mandi plate with readable
  restaurant branding; Taco Bell / Burger King product shots; several PDM-marked
  Flickr photos of real storefronts with readable signage; and low-quality
  home-flash photos that failed the "appetizing, professional" bar.
- Every download was checked with `file` and `ffprobe` to confirm it was a real
  image and not an HTML error page.
