#!/usr/bin/env python3
"""
Em-dash sweep for HAND Protocol governance docs.

Replaces em dashes per the brand voice rule (AGENTS.md):
  > No em dashes. Use commas, colons, semicolons, periods, or parentheses.

Categories of replacement:
  1. Headings with numbered/named sections: `## Section N — Title` → `## Section N. Title`
  2. Mid-prose parenthetical asides: `text — clause — text` → `text, clause, text`
  3. Sentence-final emphasis: `text — emphasis.` → `text: emphasis.`
  4. List item dash separator: `KEY — content` → `KEY  content` or `KEY: content`
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
REPO_ROOT = ROOT.parent
TARGET_DIRS = [ROOT, REPO_ROOT / "funding"]
# Optional sweep of top-level project docs
TOP_LEVEL_MD = ["AGENTS.md", "README.md", "DESIGN.md", "TODO.md", "PRODUCT.md", "DEPLOY.md", "AI-RECIPROCATES.md", "AI-EVAL-FRAMEWORK.md"]
EXCLUDE = {"pdf"}  # don't touch generated/build artifacts

# Headings: `## Section 1 — Title`, `## Article I — Title`, etc.
# Words that legitimately number or label sections in governance docs:
HEADING_LABELS = (
    "Section|Article|Principle|Part|Phase|Chapter|Step|Tier|Year|Quarter|Round|Wave|Round"
)
HEADING_RE = re.compile(
    rf"^(#{{1,6}} (?:{HEADING_LABELS}) [\dIVXLCMA-Za-z]+) — (.+)$",
    re.MULTILINE,
)

# Title heading without numbered label but with em dash: `## Title — Subtitle`
TITLE_HEADING_RE = re.compile(r"^(#{1,6} [^—\n]+) — (.+)$", re.MULTILINE)

# All-caps timeline entries: `JANUARY    — content` (with arbitrary whitespace)
TIMELINE_RE = re.compile(r"^([A-Z]{3,}\s+)— (.+)$", re.MULTILINE)

# Em dash between two phrases mid-line: `phrase — phrase` (parenthetical or appositive)
# We replace conservatively: most uses are appositive, so comma-flanking is right.
INLINE_DASH_RE = re.compile(r" — ")

# Special case: italicized aside flanked by em dashes
# `text — *italic aside* — text` → `text (*italic aside*) text`
ITALIC_ASIDE_RE = re.compile(r" — (\*[^*\n]+\*) — ")

# Special case: paired em dashes around a short aside (≤ 60 chars, no italic)
# `text — short aside — text` → `text (short aside) text`
PAIRED_DASH_RE = re.compile(r" — ([^—\n]{1,60}) — ")


def process_text(text: str) -> tuple[str, int]:
    """Apply replacements in order. Returns new text and total replacements."""
    n = 0

    # 1. Numbered section headings: period
    def heading_sub(m):
        nonlocal n
        n += 1
        return f"{m.group(1)}. {m.group(2)}"

    text = HEADING_RE.sub(heading_sub, text)

    # 2. Other headings (title with subtitle): colon
    def title_heading_sub(m):
        nonlocal n
        n += 1
        return f"{m.group(1)}: {m.group(2)}"

    text = TITLE_HEADING_RE.sub(title_heading_sub, text)

    # 3. Timeline entries
    def timeline_sub(m):
        nonlocal n
        n += 1
        return f"{m.group(1)}{m.group(2)}"

    text = TIMELINE_RE.sub(timeline_sub, text)

    # 4a. Italic aside flanked by em dashes: use parens
    def italic_sub(m):
        nonlocal n
        n += 2  # consumed two em dashes
        return f" ({m.group(1)}) "

    text = ITALIC_ASIDE_RE.sub(italic_sub, text)

    # 4b. Paired em dashes around a short aside: use parens
    def paired_sub(m):
        nonlocal n
        n += 2
        return f" ({m.group(1)}) "

    text = PAIRED_DASH_RE.sub(paired_sub, text)

    # 4c. Remaining single em dashes: replace with comma + space
    new_text, count = INLINE_DASH_RE.subn(", ", text)
    n += count
    text = new_text

    return text, n


def main():
    dry_run = "--dry-run" in sys.argv
    include_toplevel = "--toplevel" in sys.argv
    total_files = 0
    total_replacements = 0

    paths_to_process = []
    for base in TARGET_DIRS:
        if not base.exists():
            continue
        for md_path in base.rglob("*.md"):
            if any(part in EXCLUDE for part in md_path.parts):
                continue
            paths_to_process.append(md_path)
    if include_toplevel:
        for name in TOP_LEVEL_MD:
            p = REPO_ROOT / name
            if p.exists():
                paths_to_process.append(p)

    for md_path in paths_to_process:
        text = md_path.read_text(encoding="utf-8")
        if "—" not in text:
            continue
        new_text, n = process_text(text)
        if n > 0:
            total_files += 1
            total_replacements += n
            rel = md_path.relative_to(REPO_ROOT)
            print(f"  {n:3d}  {rel}")
            if not dry_run:
                md_path.write_text(new_text, encoding="utf-8")
    print()
    print(f"Total: {total_replacements} replacements across {total_files} files")
    if dry_run:
        print("(dry run, no files written)")


if __name__ == "__main__":
    main()
