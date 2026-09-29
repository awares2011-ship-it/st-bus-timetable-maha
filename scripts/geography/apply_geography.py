#!/usr/bin/env python
"""
Merge data/msrtc/reference/geography.json into the pipeline's reference data
(data/demo/reference/{divisions,stops}.json):

  * divisions.json  -> all 31 MSRTC divisions (+ region, districts, official PDF link)
  * stops.json      -> every taluka HQ becomes a `station` with district + taluka;
                       existing stops are matched by name/Marathi name/alias and
                       enriched rather than duplicated. Stops whose district is a
                       Maharashtra district get their division corrected.
  * districts.json  -> new: 36 districts with their talukas (for the browse UI)

Idempotent. Run after maharashtra_geography.py.
"""
import json, re, unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
REF = ROOT / "data" / "demo" / "reference"
GEO = json.loads((ROOT / "data" / "msrtc" / "reference" / "geography.json").read_text(encoding="utf-8"))

# Spelling variants seen on Wikipedia / MSRTC boards -> canonical HQ name
VARIANTS = {
    "Malvan": ["Malwan"], "Pali": ["Sudhagad-Pali", "Sudhagad Pali"], "Shindkheda": ["Sindkheda", "Shindkhede"],
    "Murtijapur": ["Murtajapur", "Murtizapur"], "Chandur Railway": ["Chandur"], "Dhamangaon Railway": ["Dhamangaon"],
    "Teosa": ["Tiosa", "Tivsa"], "Kalmeshwar": ["Kalameshwar"], "Tirora": ["Tiroda"], "Gondpipri": ["Gondpimpri"],
    "Brahmapuri": ["Bramhapuri"], "Basmat": ["Basmath", "Vasmat"], "Selu": ["Sailu"], "Manwat": ["Manwath"],
    "Chhatrapati Sambhajinagar": ["Aurangabad", "Sambhajinagar", "Chh. Sambhajinagar", "CSN"],
    "Khultabad": ["Khuldabad"], "Dharashiv": ["Osmanabad"], "Sangola": ["Sangole"], "Mangalwedha": ["Mangalvedhe", "Mangalvedha"],
    "Ahilyanagar": ["Ahmednagar", "Nagar"], "Saswad": [], "Dahiwadi": [],
    "Vita": [], "Hatkanangle": ["Hatkanangale"], "Ajara": ["Ajra"], "Satana": [],
    "Islampur": ["Uran Islampur"], "Rajgurunagar": [], "Ghodegaon": [],
    "Vadgaon Maval": ["Wadgaon Maval"], "Paud": [], "Medha": [], "Vaduj": [],
    "Gargoti": [], "Dhadgaon": [], "Pandharkawada": ["Pandharkawda"], "Wadsa": [],
    "Paratwada": [], "Devrukh": [], "Karanja Lad": ["Karanja (Washim)"],
    "Karanja Ghadge": ["Karanja (Wardha)"], "Parli Vaijnath": ["Parli", "Parali"], "Vengurla": ["Vengurle"],
    "Kankavli": ["Kankavali"], "Georai": ["Gevrai"], "Kaij": ["Kej"], "Umarga": ["Omerga"], "Ambajogai": ["Ambejogai"],
    "Mahur": ["Mahurgad"], "Nandgaon Khandeshwar": ["Nandgaon Kh."], "Anjangaon Surji": ["Anjangaon"],
    "Deulgaon Raja": ["Deulgaon Raja", "Dusarbid"], "Kalamnuri": ["Kalamnori"], "Aundha Nagnath": ["Aundha"],
    "Seloo": ["Selu (Wardha)"], "Kamptee": ["Kamthi"], "Parseoni": ["Parshivni"], "Arvi": ["Arvi"],
    "Trimbakeshwar": ["Trimbak"], "Igatpuri": ["Igatpuri"], "Mumbai Central": ["Mumbai", "Mumbai Central Bus Stand"],
}


def key(s: str) -> str:
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not ("̀" <= c <= "ͯ"))
    s = s.lower()
    s = re.sub(r"\b(s\.?t\.?|bus\s*stand|bus\s*stop|depot|stand|station)\b", "", s)
    s = re.sub(r"[^a-z0-9ऀ-ॿ]+", " ", s).strip()
    return re.sub(r"\s+", " ", s)


def slug(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def main() -> None:
    stops = json.loads((REF / "stops.json").read_text(encoding="utf-8"))
    divisions_old = {d["id"]: d for d in json.loads((REF / "divisions.json").read_text(encoding="utf-8"))}

    # ---- divisions
    divisions = []
    for d in GEO["divisions"]:
        old = divisions_old.get(d["id"], {})
        divisions.append({**old, **d})
    (REF / "divisions.json").write_text(json.dumps(divisions, ensure_ascii=False, indent=1), encoding="utf-8")

    district_by_name = {}
    for d in GEO["districts"]:
        district_by_name[key(d["name"])] = d
    # legacy district labels used in the old stops file
    for alias, did in {"mumbai": "mumbai-city", "ahmednagar": "ahilyanagar", "aurangabad": "sambhajinagar",
                       "osmanabad": "dharashiv"}.items():
        district_by_name[alias] = next(x for x in GEO["districts"] if x["id"] == did)

    # Fix division for any stop whose district is a Maharashtra district.
    fixed = 0
    for s in stops:
        d = district_by_name.get(key(s.get("district", "")))
        if d:
            if s["division"] != d["division"]:
                s["division"] = d["division"]; fixed += 1
            s["district"] = d["name"]

    # Name index of existing stops.
    idx: dict[str, list[dict]] = {}
    def index(s):
        for n in [s["name"], s["nameMr"], s.get("nameHi", ""), *s.get("aliases", [])]:
            k = key(n)
            if k: idx.setdefault(k, []).append(s)
    for s in stops: index(s)

    # Which HQ names occur in more than one district -> need disambiguated ids/names.
    hq_count: dict[str, set] = {}
    for t in GEO["talukas"]:
        hq_count.setdefault(key(t["hq"]), set()).add(t["district"])

    added = enriched = 0
    ids = {s["id"] for s in stops}
    seen_hq: dict[tuple, dict] = {}
    for t in GEO["talukas"]:
        dist = next(x for x in GEO["districts"] if x["id"] == t["district"])
        ambiguous = len(hq_count[key(t["hq"])]) > 1
        hq_key = (key(t["hq"]), t["district"])
        if hq_key in seen_hq:            # e.g. Solapur North + South share Solapur HQ
            st = seen_hq[hq_key]
            st.setdefault("talukas", [])
            if t["name"] not in st["talukas"]: st["talukas"].append(t["name"])
            continue
        # find existing stop in the same district (or with unknown district)
        cands = idx.get(key(t["hq"]), []) + idx.get(key(t["hqMr"]), [])
        match = None
        for c in cands:
            cd = district_by_name.get(key(c.get("district", "")))
            if cd and cd["id"] == t["district"]: match = c; break
        if not match and not ambiguous:
            for c in cands:
                if c.get("district") in ("Unknown", "", None): match = c; break
        variants = VARIANTS.get(t["hq"], [])
        # Taluka names are not aliases of the HQ town: many are villages in
        # their own right (Walwa, Khatav, Sangameshwar, Ambegaon…).
        extra = []
        if match:
            match["district"] = dist["name"]
            match["division"] = t["division"]
            match["taluka"] = t["name"]
            match.setdefault("talukas", [])
            if t["name"] not in match["talukas"]: match["talukas"].append(t["name"])
            match["type"] = "station"
            al = set(match.get("aliases", []))
            for a in variants + extra:
                if key(a) != key(match["name"]): al.add(a)
            match["aliases"] = sorted(al)
            if match["nameMr"] == match["name"]:
                match["nameMr"] = t["hqMr"]; match["nameHi"] = t["hqMr"]
            seen_hq[hq_key] = match
            enriched += 1
            continue
        base = slug(t["hq"])
        sid = f"{base}-{slug(dist['name'])}" if (ambiguous or base in ids) else base
        name = f"{t['hq']} ({dist['name']})" if ambiguous else t["hq"]
        name_mr = f"{t['hqMr']} ({dist['nameMr']})" if ambiguous else t["hqMr"]
        aliases = sorted({a for a in variants + extra + ([t["hq"], t["hqMr"]] if ambiguous else [])})
        st = {
            "id": sid, "name": name, "nameMr": name_mr, "nameHi": name_mr,
            "aliases": aliases, "division": t["division"], "district": dist["name"],
            "taluka": t["name"], "talukas": [t["name"]], "type": "station",
        }
        stops.append(st); ids.add(sid); index(st); seen_hq[hq_key] = st
        added += 1

    # An alias must not be another taluka town's real name ("Khed" on
    # Rajgurunagar would capture every board's Khed, which is usually Khed in
    # Ratnagiri).
    hq_names: dict[str, set] = {}
    for s in stops:
        if s.get("taluka"):
            hq_names.setdefault(key(s["name"].split(" (")[0]), set()).add(s["id"])
    for s in stops:
        s["aliases"] = [a for a in s.get("aliases", []) if s["id"] in hq_names.get(key(a), {s["id"]})]

    (REF / "stops.json").write_text(json.dumps(stops, ensure_ascii=False, indent=1), encoding="utf-8")

    districts = []
    for d in GEO["districts"]:
        tl = [t for t in GEO["talukas"] if t["district"] == d["id"]]
        districts.append({
            "id": d["id"], "name": d["name"], "nameMr": d["nameMr"], "division": d["division"],
            "talukas": [{"name": t["name"], "nameMr": t["nameMr"], "hq": t["hq"], "hqMr": t["hqMr"],
                         "stop": seen_hq[(key(t["hq"]), t["district"])]["id"]} for t in tl],
        })
    (REF / "districts.json").write_text(json.dumps(districts, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"divisions={len(divisions)} stops={len(stops)} (+{added} new, {enriched} enriched, {fixed} division fixes)")


if __name__ == "__main__":
    main()
