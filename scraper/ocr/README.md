# OCR pipeline — MSRTC divisional timetable PDFs

The six PDFs supplied by MSRTC (mumbai / pune / nashik / nagpur /
sambhajinagar / amravati) are **scanned images with no embedded text**. Every
value on those pages — station names in Devanagari, service categories,
departure and arrival times — has to be recovered by OCR.

This directory is the OCR half of the ingest. It takes the scanned PDFs and
produces UTF‑8 `.txt` and `.tsv` files under `data/ocr/`. The TypeScript
parsers in `scraper/parsers/msrtc-*` then consume those files and produce
trips in the shape the app already understands.

## One‑time setup

1. **Install Tesseract 5** with the **Marathi** language pack.
   - Windows: <https://github.com/UB-Mannheim/tesseract/wiki> — pick “Additional
     script data (download) → Devanagari” and “Additional language data
     (download) → Marathi” during install.
   - Verify: `tesseract --list-langs` must list both `mar` and `eng`.
2. **Install the Python deps** (Python 3.10+):
   ```
   py -m pip install PyMuPDF pillow pytesseract
   ```

## Run

```
# OCR every page of every PDF at 300 dpi (~10 min on a laptop CPU):
py scraper/ocr/ocr-pdfs.py

# OCR just Mumbai, pages 1–5, at 400 dpi:
py scraper/ocr/ocr-pdfs.py --only=mumbai --pages=1-5 --dpi=400
```

Then run the TypeScript parsers to turn OCR text into trips:

```
npm run scrape           # calls scraper/pipeline.ts
npm run validate         # sanity-checks the normalised dataset
npm run generate         # writes data/generated/*.json
npm run sync-data        # copies to public/data
```

## Design notes

- The script refuses to run if tesseract or `mar` is missing. We never publish
  guessed timetables — a missing OCR step surfaces as “no trips added”, not as
  fabricated data.
- The `.tsv` output preserves bounding boxes so the per‑layout parsers can
  reconstruct columns (Mumbai’s 6‑col table, Nashik’s 3‑col grid, Nagpur’s
  route/times list, Pune / Sambhajinagar’s dense numbered list).
- If MSRTC replaces a PDF later, drop the new file at the path in
  `DEFAULT_PDFS` and re‑run — every downstream step is idempotent.
