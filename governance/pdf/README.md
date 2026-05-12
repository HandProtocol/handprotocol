# Governance PDF Kit

Publication-quality PDFs of HAND Protocol Foundation's governance package, generated from the source markdown in [`governance/`](..). Suitable for funder packages, counsel handoff, board distribution, or printing.

**Status:** Draft v0.1 · May 2026 · Regenerate any time with `python3 build.py`

## Bundles

| File | Pages | Use case |
|---|---|---|
| [`out/00-master.pdf`](out/00-master.pdf) | 226 | Full governance package, single bound volume. For counsel review or comprehensive funder handoff. |
| [`out/01-filing-kit.pdf`](out/01-filing-kit.pdf) | 35 | Articles, Bylaws, Compliance Calendar, Form 1023 narrative. The Texas SOS + IRS filing packet. |
| [`out/02-policy-book.pdf`](out/02-policy-book.pdf) | 88 | All fourteen policies: IRS-required, financial, operational, AI, community. |
| [`out/03-board-kit.pdf`](out/03-board-kit.pdf) | 49 | Member Agreement, succession protocols, officer descriptions, composition matrix, disclosure form, prospect brief, outreach templates. |
| [`out/04-program-kit.pdf`](out/04-program-kit.pdf) | 26 | Theory of Change, Logic Model, Strategic Plan 2026-2028, Companion Selection. Standard grant attachments. |
| [`out/05-grant-kit.pdf`](out/05-grant-kit.pdf) | 34 | Boilerplate, Capacity Statement, Attachments Checklist, Budget Template, Funder Pipeline. The funder-application packet. |

## Layout

Every PDF includes:

- **Cover page** with title, subtitle, status (Draft v0.1), date, and source URL.
- **DRAFT watermark** diagonal across body pages.
- **Table of contents** listing the source documents.
- **Page numbers** at the bottom (e.g., `HAND Protocol Foundation · 12 of 35`).
- **Print-friendly typography** at 10.5pt body, with proper page-break handling for headings, tables, and callouts.

## Regenerate

The build script lives at [`build.py`](build.py). Dependencies:

- `markdown-it-py` (Python markdown parser, already on most systems via `pipx install markdown-it-py`).
- `google-chrome` headless (used for HTML to PDF rendering).

To regenerate after any governance document change:

```bash
cd /path/to/handprotocol
python3 governance/pdf/build.py
```

Outputs land in `governance/pdf/out/`. The script is idempotent.

## Customizing

Edit [`build.py`](build.py):

- **Bundle definitions** at the top: add, remove, or reorder documents in each bundle.
- **PRINT_CSS** constant: adjust typography, page setup, watermark, table styling.
- **HTML_TEMPLATE**: change cover page or TOC layout.

To produce a single-document PDF (e.g., just Bylaws):

```bash
google-chrome --headless=new --no-sandbox \
  --print-to-pdf=bylaws.pdf \
  --print-to-pdf-no-header \
  file:///path/to/governance/pdf/html/02-policy-book.html
```

## Distribution

- **Counsel handoff:** `00-master.pdf` for full review; `01-filing-kit.pdf` for the SOS/IRS filing specifically.
- **Funder application:** typically `04-program-kit.pdf` + `05-grant-kit.pdf` together, plus the most relevant policies excerpted from `02-policy-book.pdf`.
- **Board prospect:** `03-board-kit.pdf` (especially the Director Prospect Brief), with `04-program-kit.pdf` as supporting context.
- **Public download:** linked from the `/governance/` page on the live site.

## File sizes

| File | Size |
|---|---|
| 00-master.pdf | 3.8 MB |
| 01-filing-kit.pdf | 860 KB |
| 02-policy-book.pdf | 1.4 MB |
| 03-board-kit.pdf | 748 KB |
| 04-program-kit.pdf | 432 KB |
| 05-grant-kit.pdf | 688 KB |
| **Total** | **~7.8 MB** |

## Open questions

- **Hosting the PDFs publicly.** The PDFs can be served from `web/governance/pdfs/` as static files. Decide whether to link them prominently from the `/governance/` landing or keep them on-request to reduce expected-readership pressure on the live website.
- **Watermarking.** Drafted with "DRAFT" watermark. Remove on board adoption by editing the `.draft-watermark` rule in `build.py`.
- **Versioning.** Each PDF carries `Draft v0.1` on the cover. Increment via the cover template constant when documents are adopted.
- **Localization.** All English. If translated versions are produced, the build script needs a `--lang` flag and per-language templates.

---

*Generated locally; not committed by default. The markdown sources in [`governance/`](..) are the source of truth.*
