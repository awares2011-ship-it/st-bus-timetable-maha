"""One-off: give every existing transcription fixture a `division` (and copy the
Kolhapur/Sindhudurg depot transcriptions from data/demo/source into
data/msrtc/source/agar) so the msrtc-pdf pipeline rebuilds the full dataset."""
import json, re, shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MANUAL = ROOT / "data" / "msrtc" / "source" / "manual"
AGAR = ROOT / "data" / "msrtc" / "source" / "agar"
DEMO_SRC = ROOT / "data" / "demo" / "source"

MANUAL_DIV = {"10": "pune", "20": "mumbai", "30": "nagpur", "40": "nashik", "50": "sambhajinagar",
              "60": "amravati", "70": "satara", "75": "ahilyanagar", "80": "kolhapur", "85": "solapur",
              "90": "latur", "95": "jalgaon", "100": "dhule", "105": "nanded", "110": "raigad"}


def tag(path: Path, division: str, unverified: bool | None = None) -> None:
    d = json.loads(path.read_text(encoding="utf-8"))
    d = {"division": division, **{k: v for k, v in d.items() if k != "division"}}
    if unverified is not None:
        d["unverified"] = unverified
    path.write_text(json.dumps(d, ensure_ascii=False, indent=1), encoding="utf-8")


for f in MANUAL.glob("*.json"):
    tag(f, MANUAL_DIV[f.name.split("-")[0]])

AGAR.mkdir(parents=True, exist_ok=True)
for f in sorted(DEMO_SRC.glob("*.json")):
    n = int(f.name.split("-")[0])
    if not 5 <= n <= 25:
        continue
    dst = AGAR / f.name
    shutil.copyfile(f, dst)
    note = json.loads(dst.read_text(encoding="utf-8")).get("note", "")
    tag(dst, "kolhapur" if n <= 19 else "sindhudurg", unverified=bool(re.search(r"unverified", note, re.I)))
print("tagged", len(list(MANUAL.glob("*.json"))), "manual +", len(list(AGAR.glob("*.json"))), "agar fixtures")
