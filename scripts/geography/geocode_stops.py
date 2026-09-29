#!/usr/bin/env python
"""
Give every reference stop coordinates, from the GeoNames India gazetteer
(https://download.geonames.org/export/dump/IN.zip, CC BY 4.0).

    py scripts/geography/geocode_stops.py <path/to/IN.txt> [--staged]

Matching: English name (qualifier in brackets dropped), Marathi name and
aliases against GeoNames name / asciiname / alternatenames (which include
Devanagari). Among same-name candidates we prefer, in order: the stop's
district, Maharashtra, then the one nearest the stop's MSRTC division HQ,
with a bonus for population. Stops that don't match stay without coordinates;
nothing is guessed. Output is a sidecar file data/msrtc/reference/stop-coords.json
({stopId: [lat, lng, source]}), merged by the generator.

With --staged the stop list is taken from data/.tmp/staged.json (so newly
discovered villages are geocoded too), else from the reference stops.
"""
import json, math, re, sys, unicodedata
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "data" / "msrtc" / "reference" / "stop-coords.json"

# GeoNames admin2 (district) names → our district names
ADMIN2 = {
    "Ahmadnagar": "Ahilyanagar", "Aurangabad": "Chhatrapati Sambhajinagar", "Bid": "Beed",
    "Osmanabad": "Dharashiv", "Raigarh": "Raigad", "Gondiya": "Gondia", "Mumbai": "Mumbai City",
    "Amravati Division": "Amravati", "Nagpur Division": "Nagpur", "Nashik Division": "Nashik",
    "Satara Division": "Satara", "Pune Division": "Pune",
}
ADMIN2_CODES = {  # IN.16.<code>
    "510": "Yavatmal", "504": "Wardha", "517": "Thane", "526": "Solapur", "528": "Ratnagiri",
    "513": "Parbhani", "525": "Osmanabad", "511": "Nanded", "530": "Kolhapur", "499": "Jalgaon",
    "518": "Mumbai Suburban", "498": "Dhule", "500": "Buldhana", "523": "Bid", "506": "Bhandara",
    "501": "Akola", "502": "Washim", "514": "Jalna", "512": "Hingoli", "522": "Ahmadnagar",
    "507": "Gondiya", "508": "Gadchiroli", "524": "Latur", "529": "Sindhudurg", "520": "Raigarh",
    "497": "Nandurbar", "503": "Amravati Division", "515": "Aurangabad", "505": "Nagpur Division",
    "516": "Nashik Division", "527": "Satara Division", "509": "Chandrapur", "531": "Sangli",
    "519": "Mumbai", "521": "Pune Division", "665": "Palghar",
}
DIVISION_HQ = {
    "mumbai": "Mumbai", "thane": "Thane", "palghar": "Palghar", "raigad": "Alibag", "ratnagiri": "Ratnagiri",
    "sindhudurg": "Kudal|Oros|Kankavli", "pune": "Pune", "satara": "Satara", "sangli": "Sangli", "solapur": "Sholapur|Solapur",
    "kolhapur": "Kolhapur", "nashik": "Nashik", "dhule": "Dhule", "jalgaon": "Jalgaon",
    "ahilyanagar": "Ahmadnagar|Ahilyanagar|Ahmednagar", "sambhajinagar": "Aurangabad|Chhatrapati Sambhajinagar", "beed": "Beed|Bid", "jalna": "Jalna",
    "latur": "Latur", "nanded": "Nanded", "dharashiv": "Dharashiv|Osmanabad", "parbhani": "Parbhani",
    "nagpur": "Nagpur", "bhandara": "Bhandara", "wardha": "Wardha", "chandrapur": "Chanda|Chandrapur",
    "gadchiroli": "Gadchiroli|Gadchiroli|Garhchiroli", "amravati": "Amravati", "akola": "Akola", "yavatmal": "Yavatmal",
    "buldhana": "Buldana|Buldhana",
}
# Well-known bus-stand names inside a city → that city
CITY_PREFIX = ["Pune", "Mumbai", "Thane", "Nashik", "Solapur", "Kolhapur", "Nagpur", "Satara", "Sangli", "Latur"]
# Places outside Maharashtra that MSRTC serves (pick the big one, not a namesake village)
PREFER_BIG = True


def key(s: str) -> str:
    s = unicodedata.normalize("NFKD", s or "")
    s = "".join(c for c in s if not unicodedata.combining(c)).lower()
    s = re.sub(r"\(.*?\)", " ", s)
    s = re.sub(r"\b(bus stand|st stand|stand|station|cbs|depot|agar|naka|phata|railway)\b", " ", s)
    s = re.sub(r"[^a-zऀ-ॿ]+", "", s)
    return s


def phon(k: str) -> str:
    """Loose Latin key: Kurundwad≈Kurundvad, Nrusinhwadi≈Narsinhwadi, Ajra≈Ajara."""
    if not k or not k.isascii():
        return ""
    for a, b in (("aa", "a"), ("ee", "i"), ("oo", "u"), ("ou", "u"), ("w", "v"), ("ph", "f"),
                 ("sh", "s"), ("kh", "k"), ("gh", "g"), ("chh", "c"), ("ch", "c"), ("th", "t"),
                 ("dh", "d"), ("bh", "b"), ("jh", "j"), ("z", "j"), ("y", "i"), ("q", "k"), ("ru", "r"), ("ri", "r")):
        k = k.replace(a, b)
    k = re.sub(r"[aeiou]", "", k)
    return k if len(k) >= 3 else ""


EXTRA = {"belagavi": "Belgaum", "vijayapura": "Bijapur", "kalaburagi": "Gulbarga", "hubballi": "Hubli",
         "ballari": "Bellary", "mumbai-central": "Mumbai", "dadar": "Dadar", "chhatrapati-sambhajinagar": "Aurangabad",
         "sambhajinagar": "Aurangabad|Chhatrapati Sambhajinagar", "dharashiv": "Dharashiv|Osmanabad", "ahilyanagar": "Ahmadnagar|Ahilyanagar|Ahmednagar", "wadsa": "Desaiganj", "buldhana": "Buldana"}


def hav(a, b):
    la1, lo1, la2, lo2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 6371 * 2 * math.asin(math.sqrt(h))


def main():
    gn_path = sys.argv[1]
    staged = "--staged" in sys.argv
    idx = defaultdict(list)
    pidx = defaultdict(list)
    exact = defaultdict(list)  # primary/ascii name only, for anchors
    with open(gn_path, encoding="utf8") as f:
        for line in f:
            p = line.rstrip("\n").split("\t")
            if len(p) < 15 or p[6] not in ("P", "S", "A"):
                continue
            if p[6] == "A" and p[7] != "ADM3":  # taluka area: last-resort fallback only
                continue
            if p[6] == "S" and p[7] not in ("BUSTN", "RSTN"):
                continue
            lat, lng = float(p[4]), float(p[5])
            pop = int(p[14] or 0)
            rec = (lat, lng, pop, p[10], p[11], p[1], p[7])
            names = {p[1], p[2], *[n for n in p[3].split(",") if n]}
            for n in (p[1], p[2]):
                exact[key(n)].append(rec)
            for n in names:
                k = key(n)
                if len(k) >= 3:
                    idx[k].append(rec)
                    pk = phon(k)
                    if pk and p[10] == "16":
                        pidx[pk].append(rec)

    def best_city(name):
        c = [r for r in exact.get(key(name), []) if r[3] == "16" and r[6].startswith("PPL")]
        return max(c, key=lambda r: r[2]) if c else None

    def first_city(names):
        found = [r for r in (best_city(n) for n in names.split("|")) if r]
        return max(found, key=lambda r: r[2]) if found else None  # the real (biggest) town

    anchors = {d: first_city(n) for d, n in DIVISION_HQ.items()}
    if "--anchors" in sys.argv:
        for d, r in sorted(anchors.items()):
            print(f"  anchor {d:14} {r[5] if r else None:22} {r[0] if r else ''} {r[1] if r else ''} pop={r[2] if r else ''}")
    missing = [d for d, r in anchors.items() if not r]
    if missing:
        sys.exit(f"no anchor for divisions {missing} — fix DIVISION_HQ")
    anchors = {d: (r[0], r[1]) for d, r in anchors.items() if r}
    city = {n: best_city(n) for n in CITY_PREFIX}

    if staged:
        stops = json.load(open(ROOT / "data" / ".tmp" / "staged.json", encoding="utf8"))["normalized"]["stops"]
    else:
        stops = json.load(open(ROOT / "data" / "demo" / "reference" / "stops.json", encoding="utf8"))

    # Only coordinates set by hand in the reference file are trusted as-is;
    # staged stops carry coords merged from a previous run of this script.
    ref_ll = {r["id"]: (r["lat"], r["lng"]) for r in
              json.load(open(ROOT / "data" / "demo" / "reference" / "stops.json", encoding="utf8"))
              if r.get("lat") and r.get("lng")}
    out, miss = {}, []
    for s in stops:
        if s["id"] in ref_ll:
            out[s["id"]] = [*ref_ll[s["id"]], "reference"]
            continue
        anchor = anchors.get(s["division"])
        names = [s["name"], s.get("nameMr", ""), *s.get("aliases", [])]
        if s["id"] in EXTRA:
            names = [EXTRA[s["id"]]] + names
        cands = []
        for n in names:
            cands += idx.get(key(n), [])
        fuzzy = False
        if not cands and anchor:
            for n in names:
                pk = phon(key(n))
                if pk:
                    cands += [r for r in pidx.get(pk, []) if hav(anchor, (r[0], r[1])) < 160]
            fuzzy = bool(cands)
        # "Pune Swargate", "Thane Khopat" … → the city itself
        if not cands:
            for c in CITY_PREFIX:
                if s["name"].startswith(c + " ") and city.get(c):
                    r = city[c]
                    out[s["id"]] = [round(r[0], 5), round(r[1], 5), f"city:{c}"]
                    break
            else:
                miss.append(s["id"])
            continue
        dist = s.get("district", "")

        def score(r):
            sc = 0.0
            gd = ADMIN2.get(ADMIN2_CODES.get(r[4], ""), ADMIN2_CODES.get(r[4], ""))
            if dist and dist != "Unknown" and r[3] == "16" and gd and gd.split()[0] == dist.split()[0]:
                sc -= 400
            if r[3] != "16":
                sc += 150
            if anchor:
                sc += hav(anchor, (r[0], r[1]))
            sc -= 40 * math.log10(r[2] + 10)
            if r[6] == "ADM3":
                sc += 1000  # only when no town record exists
            elif not r[6].startswith("PPL") and r[6] != "BUSTN":
                sc += 60
            return sc

        def in_dist(r):
            gd = ADMIN2.get(ADMIN2_CODES.get(r[4], ""), ADMIN2_CODES.get(r[4], ""))
            return bool(dist and dist != "Unknown" and r[3] == "16" and gd and gd.split()[0] == dist.split()[0])

        local = [c for c in cands if in_dist(c)]
        if local:
            cands = local
        r = min(cands, key=score)
        # A stop whose district we know must land in that district (or close
        # to its division HQ) — rejects namesakes like Vashi (Navi Mumbai) for
        # Washi (Dharashiv).
        if dist and dist != "Unknown":
            gd = ADMIN2.get(ADMIN2_CODES.get(r[4], ""), ADMIN2_CODES.get(r[4], ""))
            in_district = r[3] == "16" and gd and gd.split()[0] == dist.split()[0]
            if not in_district and (not anchor or hav(anchor, (r[0], r[1])) > 120):
                miss.append(s["id"])
                continue
        # A village named on a division board is almost always within ~300 km
        # of that division; a far-away namesake is more likely a wrong match
        # unless it's a real city (population ≥ 50k).
        # Villages printed on a division's board sit near that division; a
        # distant namesake (Talegaon near Pune for "Talegaon (Wardha)") is a
        # wrong match. Only real cities (≥100k) may be far away.
        far = hav(anchor, (r[0], r[1])) if anchor else 0
        limit = 200 if s.get("type") != "station" else 350
        # Far-away big cities are only expected outside Maharashtra (Indore,
        # Hyderabad, Surat…); inside the state they are stations with coords.
        big_city = r[3] != "16" and r[2] >= 500000 and any(key(n) == key(r[5]) for n in names)
        if anchor and far > limit and not big_city:
            miss.append(s["id"])
            continue
        out[s["id"]] = [round(r[0], 5), round(r[1], 5), "geonames-taluka" if r[6] == "ADM3" else ("geonames~" if fuzzy else "geonames")]

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf8")
    print(f"geocoded {len(out)}/{len(stops)} stops; unmatched {len(miss)}")
    print("sample unmatched:", miss[:40])


if __name__ == "__main__":
    main()
