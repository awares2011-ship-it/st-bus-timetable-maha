#!/usr/bin/env python
"""
OCR the six MSRTC Divisional timetable PDFs into raw text.

Requires:
    pip install PyMuPDF pillow pytesseract
    # + tesseract binary WITH the Marathi language pack (mar):
    #   Windows: https://github.com/UB-Mannheim/tesseract/wiki  (choose "Marathi" during install)
    #   Verify:  tesseract --list-langs   →  should include "mar" and "eng"

Usage:
    py scraper/ocr/ocr-pdfs.py [--dpi 300] [--only=mumbai,pune,...] [--pages=1-3]

Output:
    data/ocr/<slug>-p<NN>.txt   (one file per page, UTF-8)
    data/ocr/<slug>-p<NN>.tsv   (tesseract's TSV — has bounding boxes for column detection)

The downstream TypeScript parsers in scraper/parsers/msrtc-* consume these files.
No text is fabricated; if tesseract is not installed the script exits with a
clear message so the pipeline never publishes guessed timetables.
"""
from __future__ import annotations

import argparse, os, sys, shutil
from pathlib import Path

APP_ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = APP_ROOT / "data" / "ocr"

# Adjust these six paths to wherever the source PDFs live on your machine.
DEFAULT_PDFS = {
    "mumbai":        r"C:\Users\Nivrutti Aware\Downloads\मुंबई_विभाग_वेळापत्रक.pdf",
    "pune":          r"C:\Users\Nivrutti Aware\Downloads\पुणे_विभाग_वेळापत्रक.pdf",
    "nashik":        r"C:\Users\Nivrutti Aware\Downloads\नाशिक_विभाग_वेळापत्रक.pdf",
    "nagpur":        r"C:\Users\Nivrutti Aware\Downloads\नागपूर_विभाग_बसस्थानक_वेळापत्रक.pdf",
    "sambhajinagar": r"C:\Users\Nivrutti Aware\Downloads\छ_संभाजीनगर_विभाग_वेळापत्रक.pdf",
    "amravati":      r"C:\Users\Nivrutti Aware\Downloads\अमरावती_विभाग_वेळापत्रक.pdf",
}

def _require(mod: str):
    try:
        return __import__(mod)
    except ImportError:
        sys.exit(
            f"[ocr] Missing dependency `{mod}`. Run:\n"
            f"    py -m pip install PyMuPDF pillow pytesseract\n"
            f"and install the tesseract binary with the Marathi language pack (`mar`).\n"
        )

def _find_tesseract() -> str:
    exe = shutil.which("tesseract")
    if exe: return exe
    for guess in [
        r"C:\Program Files\Tesseract-OCR\tesseract.exe",
        r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
    ]:
        if os.path.exists(guess): return guess
    sys.exit(
        "[ocr] tesseract binary not found on PATH.\n"
        "Install it (Windows: https://github.com/UB-Mannheim/tesseract/wiki)\n"
        "and pick the Marathi (`mar`) language pack during setup."
    )

def _parse_pages(s: str | None, n: int) -> list[int]:
    if not s: return list(range(1, n+1))
    out = set()
    for part in s.split(","):
        if "-" in part:
            a, b = part.split("-", 1); out.update(range(int(a), int(b)+1))
        else:
            out.add(int(part))
    return sorted(p for p in out if 1 <= p <= n)

def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dpi", type=int, default=300)
    ap.add_argument("--only", type=str, default="")
    ap.add_argument("--pages", type=str, default=None)
    args = ap.parse_args()

    fitz = _require("fitz")
    pyt  = _require("pytesseract")
    PIL  = _require("PIL")

    pyt.pytesseract.tesseract_cmd = _find_tesseract()
    langs = pyt.get_languages(config="")
    for need in ("mar", "eng"):
        if need not in langs:
            sys.exit(f"[ocr] tesseract lacks language `{need}`. Install the `{need}` traineddata.")

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    only = {s.strip() for s in args.only.split(",") if s.strip()}

    for slug, path in DEFAULT_PDFS.items():
        if only and slug not in only: continue
        if not os.path.exists(path):
            print(f"[ocr] SKIP {slug}: {path} not found"); continue
        doc = fitz.open(path)
        pages = _parse_pages(args.pages, doc.page_count)
        print(f"[ocr] {slug}: {len(pages)}/{doc.page_count} pages @ {args.dpi} dpi")
        for p in pages:
            pix = doc[p-1].get_pixmap(dpi=args.dpi)
            img = PIL.Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
            base = OUT_DIR / f"{slug}-p{p:03d}"
            txt = pyt.image_to_string(img, lang="mar+eng", config="--psm 6")
            tsv = pyt.image_to_data(img, lang="mar+eng", config="--psm 6",
                                    output_type=pyt.Output.STRING)
            base.with_suffix(".txt").write_text(txt, encoding="utf-8")
            base.with_suffix(".tsv").write_text(tsv, encoding="utf-8")
            print(f"  → {base.name}.{{txt,tsv}}  ({len(txt)} chars)")

if __name__ == "__main__":
    main()
