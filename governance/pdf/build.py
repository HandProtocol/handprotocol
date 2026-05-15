#!/usr/bin/env python3
"""
HAND Protocol governance PDF kit builder.

Reads bundle definitions, concatenates the source markdown documents into
single bundle markdown files, renders each to HTML with print-friendly CSS,
then uses headless Chrome to produce a PDF.

Usage: python3 build.py
"""

import os
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent  # repo root
GOV = ROOT / "governance"
OUT = GOV / "pdf"
BUNDLES = OUT / "bundles"
HTML = OUT / "html"
PDFS = OUT / "out"

# Bundle definitions: (slug, title, subtitle, [list of markdown paths relative to governance/])
BUNDLES_DEFS = [
    (
        "01-filing-kit",
        "Filing Kit",
        "Articles of Incorporation, Bylaws, Compliance Calendar, and Form 1023 narrative",
        [
            "README.md",
            "articles-of-incorporation.md",
            "bylaws.md",
            "COMPLIANCE-CALENDAR.md",
            "form-1023/narrative-draft.md",
        ],
    ),
    (
        "02-policy-book",
        "Policy Book",
        "All fourteen policies: IRS-required, financial, operational, AI, and community",
        [
            "policies/conflict-of-interest.md",
            "policies/whistleblower.md",
            "policies/document-retention.md",
            "policies/executive-compensation.md",
            "policies/financial-management.md",
            "policies/gift-acceptance.md",
            "policies/fiscal-sponsorship.md",
            "policies/grant-management.md",
            "policies/code-of-ethics.md",
            "policies/equal-opportunity-and-harassment.md",
            "policies/privacy.md",
            "policies/data-sovereignty-and-ai.md",
            "policies/community-standards-and-content.md",
            "policies/volunteer-and-contributor.md",
        ],
    ),
    (
        "03-board-kit",
        "Board Kit",
        "Member Agreement, Succession Protocols, Officer Job Descriptions, Recruitment Materials",
        [
            "board/member-agreement.md",
            "board/succession-and-replacement.md",
            "board/emergency-succession-plan.md",
            "board/officer-job-descriptions.md",
            "board/composition-matrix.md",
            "board/annual-disclosure-form.md",
            "board/director-prospect-brief.md",
            "board/outreach-templates.md",
        ],
    ),
    (
        "04-program-kit",
        "Program Kit",
        "Theory of Change, Logic Model, Strategic Plan, Reciprocate Selection",
        [
            "programs/theory-of-change.md",
            "programs/logic-model.md",
            "programs/strategic-plan-2026-2028.md",
            "programs/reciprocate-selection-and-graduation.md",
        ],
    ),
    (
        "05-grant-kit",
        "Grant Kit",
        "Boilerplate, Capacity Statement, Attachments Checklist, Budget, Funder Pipeline",
        [
            "grants/organizational-boilerplate.md",
            "grants/capacity-statement.md",
            "grants/standard-attachments-checklist.md",
            "grants/budget-template.md",
            "grants/funder-pipeline.md",
        ],
    ),
    (
        "00-master",
        "Complete Governance Package",
        "Every governance document in a single bound volume",
        [
            "README.md",
            "articles-of-incorporation.md",
            "bylaws.md",
            "COMPLIANCE-CALENDAR.md",
            "policies/conflict-of-interest.md",
            "policies/whistleblower.md",
            "policies/document-retention.md",
            "policies/executive-compensation.md",
            "policies/financial-management.md",
            "policies/gift-acceptance.md",
            "policies/fiscal-sponsorship.md",
            "policies/grant-management.md",
            "policies/code-of-ethics.md",
            "policies/equal-opportunity-and-harassment.md",
            "policies/privacy.md",
            "policies/data-sovereignty-and-ai.md",
            "policies/community-standards-and-content.md",
            "policies/volunteer-and-contributor.md",
            "board/member-agreement.md",
            "board/succession-and-replacement.md",
            "board/emergency-succession-plan.md",
            "board/officer-job-descriptions.md",
            "board/composition-matrix.md",
            "board/annual-disclosure-form.md",
            "board/director-prospect-brief.md",
            "board/outreach-templates.md",
            "programs/theory-of-change.md",
            "programs/logic-model.md",
            "programs/strategic-plan-2026-2028.md",
            "programs/reciprocate-selection-and-graduation.md",
            "grants/organizational-boilerplate.md",
            "grants/capacity-statement.md",
            "grants/standard-attachments-checklist.md",
            "grants/budget-template.md",
            "grants/funder-pipeline.md",
            "form-1023/narrative-draft.md",
        ],
    ),
]

PRINT_CSS = """
@page {
  size: Letter;
  margin: 0.85in 0.85in 1in 0.85in;
  @bottom-center {
    content: "HAND Protocol Foundation  ·  " counter(page) " of " counter(pages);
    font-family: 'Inter', -apple-system, sans-serif;
    font-size: 8pt;
    color: #6B7280;
  }
}

@page :first {
  margin: 0;
  @bottom-center { content: none; }
}

* { box-sizing: border-box; }

html, body {
  font-family: 'Inter', -apple-system, 'Segoe UI', sans-serif;
  font-size: 10.5pt;
  line-height: 1.55;
  color: #111827;
  margin: 0;
  padding: 0;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

/* Cover page */
.cover {
  page-break-after: always;
  height: 100vh;
  padding: 1.5in 1.2in;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  background:
    radial-gradient(circle at 30% 20%, rgba(217,119,6,0.08), transparent 50%),
    radial-gradient(circle at 70% 80%, rgba(13,148,136,0.04), transparent 40%),
    #FBF8F1;
}
.cover__eyebrow {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9pt;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #D97706;
}
.cover__title {
  font-family: 'Inter', sans-serif;
  font-size: 36pt;
  font-weight: 800;
  line-height: 1.1;
  color: #111827;
  margin: 0.3in 0 0.15in 0;
  letter-spacing: -0.02em;
}
.cover__subtitle {
  font-family: 'Inter', sans-serif;
  font-size: 14pt;
  font-weight: 400;
  line-height: 1.4;
  color: #4B5563;
  max-width: 5in;
}
.cover__meta {
  border-top: 1px solid #D1D5DB;
  padding-top: 0.25in;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 0.3in;
}
.cover__meta-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 8pt;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #6B7280;
}
.cover__meta-value {
  font-family: 'Inter', sans-serif;
  font-size: 10.5pt;
  font-weight: 500;
  color: #111827;
  margin-top: 0.05in;
}
.cover__footer {
  font-family: 'Inter', sans-serif;
  font-size: 9pt;
  color: #6B7280;
}

/* DRAFT watermark */
.draft-watermark {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(-30deg);
  font-family: 'Inter', sans-serif;
  font-size: 96pt;
  font-weight: 800;
  color: rgba(217,119,6,0.07);
  letter-spacing: 0.1em;
  z-index: -1;
  pointer-events: none;
}

/* Table of contents */
.toc {
  page-break-after: always;
  padding: 0.2in 0;
}
.toc h2 {
  font-size: 20pt;
  font-weight: 700;
  margin: 0 0 0.3in 0;
  color: #111827;
  border-bottom: 2px solid #D97706;
  padding-bottom: 0.1in;
}
.toc__list {
  list-style: none;
  padding: 0;
  margin: 0;
  font-size: 10.5pt;
}
.toc__item {
  padding: 0.08in 0;
  border-bottom: 1px dotted #E5E7EB;
  display: flex;
  justify-content: space-between;
  gap: 0.2in;
}
.toc__item-title {
  font-weight: 500;
}
.toc__item-num {
  font-family: 'JetBrains Mono', monospace;
  font-size: 8.5pt;
  color: #6B7280;
}

/* Document headings */
h1 {
  font-size: 22pt;
  font-weight: 700;
  line-height: 1.15;
  margin: 0.4in 0 0.2in 0;
  page-break-before: always;
  page-break-after: avoid;
  color: #111827;
  letter-spacing: -0.01em;
}
.doc-section:first-of-type h1 {
  page-break-before: avoid;
}
h2 {
  font-size: 14pt;
  font-weight: 700;
  line-height: 1.25;
  margin: 0.3in 0 0.1in 0;
  page-break-after: avoid;
  color: #111827;
}
h3 {
  font-size: 11.5pt;
  font-weight: 700;
  margin: 0.2in 0 0.05in 0;
  page-break-after: avoid;
  color: #111827;
}
h4 {
  font-size: 10.5pt;
  font-weight: 600;
  margin: 0.15in 0 0.05in 0;
  page-break-after: avoid;
  color: #374151;
}

/* Paragraphs */
p {
  margin: 0 0 0.12in 0;
  orphans: 3;
  widows: 3;
}

blockquote {
  margin: 0.15in 0;
  padding: 0.1in 0.2in;
  border-left: 3px solid #D97706;
  background: #FEF9EC;
  font-size: 10pt;
  color: #4B5563;
  page-break-inside: avoid;
}
blockquote p { margin-bottom: 0; }

/* Lists */
ul, ol {
  margin: 0.05in 0 0.12in 0.25in;
  padding: 0;
}
li {
  margin: 0.04in 0;
  line-height: 1.5;
}

/* Code */
code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9pt;
  background: #F3F4F6;
  padding: 1pt 4pt;
  border-radius: 3pt;
  color: #B45309;
}
pre {
  background: #F8F7F4;
  border: 1px solid #E5E7EB;
  border-radius: 4pt;
  padding: 0.1in 0.15in;
  font-family: 'JetBrains Mono', monospace;
  font-size: 8.5pt;
  line-height: 1.4;
  overflow-x: auto;
  page-break-inside: avoid;
  margin: 0.1in 0;
}
pre code { background: none; padding: 0; color: #111827; }

/* Tables */
table {
  width: 100%;
  border-collapse: collapse;
  margin: 0.15in 0;
  font-size: 9.5pt;
  page-break-inside: auto;
}
thead { display: table-header-group; }
tr { page-break-inside: avoid; }
th, td {
  border: 1px solid #E5E7EB;
  padding: 0.05in 0.08in;
  text-align: left;
  vertical-align: top;
}
th {
  background: #F8F7F4;
  font-weight: 600;
  color: #111827;
}
tbody tr:nth-child(2n) td {
  background: #FAFAF9;
}

/* Links */
a {
  color: #B45309;
  text-decoration: none;
  border-bottom: 1px solid rgba(180,83,9,0.3);
}

/* HR */
hr {
  border: none;
  border-top: 1px solid #E5E7EB;
  margin: 0.3in 0;
}

strong { font-weight: 600; color: #111827; }
em { font-style: italic; }

/* Status banner at top of each document section */
.doc-status {
  font-family: 'JetBrains Mono', monospace;
  font-size: 8pt;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #6B7280;
  border: 1px solid #E5E7EB;
  background: #FBF8F1;
  padding: 4pt 8pt;
  display: inline-block;
  margin-bottom: 0.1in;
  border-radius: 3pt;
}
"""

HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>{title} — HAND Protocol Foundation</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>{css}</style>
</head>
<body>

<div class="cover">
  <div>
    <div class="cover__eyebrow">HAND Protocol Foundation · Governance</div>
    <h1 class="cover__title">{title}</h1>
    <div class="cover__subtitle">{subtitle}</div>
  </div>
  <div>
    <div class="cover__meta">
      <div>
        <div class="cover__meta-label">Status</div>
        <div class="cover__meta-value">Draft v0.1<br>Pending counsel review</div>
      </div>
      <div>
        <div class="cover__meta-label">Date</div>
        <div class="cover__meta-value">May 2026</div>
      </div>
      <div>
        <div class="cover__meta-label">Source</div>
        <div class="cover__meta-value">handprotocol.org/governance</div>
      </div>
    </div>
    <p class="cover__footer">Pre-incorporation. Reciprocate to the foundation campaign at handprotocol.org. All documents in this kit are working drafts; adoption follows board ratification.</p>
  </div>
</div>

<div class="draft-watermark">DRAFT</div>

<div class="toc">
  <h2>Contents</h2>
  <ol class="toc__list">
{toc}
  </ol>
</div>

{body}

</body>
</html>
"""


def normalize_md_for_bundle(md: str, doc_index: int) -> str:
    """Adjust headings so each bundled doc is properly nested under a common scheme.

    The first H1 of each source doc becomes the section H1. Status lines
    (the **Status:** line near the top of every doc) get a distinct CSS class.
    """
    # Wrap status line for special styling
    md = re.sub(
        r"^(\*\*Status:\*\*[^\n]+)$",
        r'<div class="doc-status">\1</div>',
        md,
        count=1,
        flags=re.MULTILINE,
    )
    # Strip leading blockquote summary at very top (purely cosmetic)
    return md


def build_bundles():
    try:
        from markdown_it import MarkdownIt
    except ImportError:
        print("ERROR: markdown-it-py not installed. Run: pip install markdown-it-py", file=sys.stderr)
        sys.exit(1)

    md_renderer = MarkdownIt("commonmark", {"breaks": False, "html": True}).enable(["table", "strikethrough"])

    for slug, title, subtitle, paths in BUNDLES_DEFS:
        print(f"\n=== Building {slug}: {title} ===")
        sections_html = []
        toc_items = []
        for i, rel_path in enumerate(paths):
            full = GOV / rel_path
            if not full.exists():
                print(f"  ! missing: {rel_path}")
                continue
            md_text = full.read_text(encoding="utf-8")
            md_text = normalize_md_for_bundle(md_text, i)

            # Extract first H1 for TOC
            h1_match = re.search(r"^# (.+)$", md_text, flags=re.MULTILINE)
            doc_title = h1_match.group(1).strip() if h1_match else rel_path
            # Strip trailing tag-wrappers from heading for TOC
            doc_title_clean = re.sub(r"<[^>]+>", "", doc_title).strip()
            toc_items.append(f'<li class="toc__item"><span class="toc__item-title">{doc_title_clean}</span><span class="toc__item-num">{rel_path}</span></li>')

            section_html = md_renderer.render(md_text)
            sections_html.append(f'<section class="doc-section">{section_html}</section>')

        bundle_md_path = BUNDLES / f"{slug}.md"
        bundle_md_path.write_text(
            "\n\n<!-- bundle separator -->\n\n".join([f"# {title}\n\n_{subtitle}_\n"] + [f"<!-- source: {p} -->" for p in paths]),
            encoding="utf-8",
        )

        html = HTML_TEMPLATE.format(
            title=title,
            subtitle=subtitle,
            css=PRINT_CSS,
            toc="\n".join(toc_items),
            body="\n\n".join(sections_html),
        )
        html_path = HTML / f"{slug}.html"
        html_path.write_text(html, encoding="utf-8")
        print(f"  wrote {html_path.relative_to(ROOT)}")

        # Render PDF
        pdf_path = PDFS / f"{slug}.pdf"
        cmd = [
            "google-chrome",
            "--headless=new",
            "--disable-gpu",
            "--no-sandbox",
            "--no-pdf-header-footer",
            f"--print-to-pdf={pdf_path}",
            "--print-to-pdf-no-header",
            f"file://{html_path.absolute()}",
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        if result.returncode != 0:
            print(f"  ! chrome error: {result.stderr[:300]}", file=sys.stderr)
        else:
            size_kb = pdf_path.stat().st_size // 1024
            print(f"  wrote {pdf_path.relative_to(ROOT)} ({size_kb} KB)")


if __name__ == "__main__":
    build_bundles()
