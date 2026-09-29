#!/usr/bin/env python
"""
Fill coordinates for taluka HQs / stations that GeoNames didn't match, using
Wikipedia page coordinates (prop=coordinates). Tries "<HQ>, <District>",
"<HQ>, Maharashtra", "<HQ>" and accepts a result only within 120 km of the
stop's MSRTC division HQ. Updates data/msrtc/reference/stop-coords.json.
"""
import json, math, time, urllib.parse, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
COORDS = ROOT / "data" / "msrtc" / "reference" / "stop-coords.json"
UA = {"User-Agent": "ST-Bus-Timetable-PWA/0.1 (geocoding taluka HQs; open-source project)"}


def hav(a, b):
    la1, lo1, la2, lo2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 12742 * math.asin(math.sqrt(h))


def wiki_coords(titles):
    q = urllib.parse.urlencode({"action": "query", "prop": "coordinates", "redirects": 1, "format": "json",
                                "titles": "|".join(titles)})
    d = json.load(urllib.request.urlopen(urllib.request.Request("https://en.wikipedia.org/w/api.php?" + q, headers=UA), timeout=30))
    norm = {n["from"]: n["to"] for n in d["query"].get("normalized", [])}
    red = {n["from"]: n["to"] for n in d["query"].get("redirects", [])}
    got = {p["title"]: (p["coordinates"][0]["lat"], p["coordinates"][0]["lon"])
           for p in d["query"]["pages"].values() if p.get("coordinates")}
    out = {}
    for t in titles:
        t2 = red.get(norm.get(t, t), norm.get(t, t))
        if t2 in got:
            out[t] = got[t2]
    return out


def main():
    coords = json.loads(COORDS.read_text(encoding="utf8"))
    stops = json.load(open(ROOT / "data" / ".tmp" / "staged.json", encoding="utf8"))["normalized"]["stops"]
    districts = json.load(open(ROOT / "data" / "demo" / "reference" / "districts.json", encoding="utf8"))
    hq_stop = {t["stop"]: (t, d) for d in districts for t in d["talukas"]}
    # anchor = median of already-known coords in the same division
    by_div = {}
    for s in stops:
        if s["id"] in coords:
            by_div.setdefault(s["division"], []).append(coords[s["id"]][:2])
    anchor = {k: (sorted(p[0] for p in v)[len(v) // 2], sorted(p[1] for p in v)[len(v) // 2]) for k, v in by_div.items()}

    todo = [s for s in stops if s["id"] not in coords and (s["id"] in hq_stop or s.get("type") == "station")]
    wanted = {}
    for s in todo:
        base = s["name"].split(" (")[0]
        dist = hq_stop[s["id"]][1]["name"] if s["id"] in hq_stop else s.get("district", "")
        titles = [f"{base}, {dist}" if dist and dist != "Unknown" else None, f"{base}, Maharashtra", base]
        wanted[s["id"]] = [t for t in titles if t]
    all_titles = sorted({t for ts in wanted.values() for t in ts})
    got = {}
    for i in range(0, len(all_titles), 45):
        chunk = all_titles[i:i + 45]
        for attempt in range(4):
            try:
                got.update(wiki_coords(chunk))
                break
            except Exception as e:  # 429 etc.: back off, never guess
                print("retry", i, e)
                time.sleep(5 * (attempt + 1))
        time.sleep(1.5)
    added = 0
    for s in todo:
        for t in wanted[s["id"]]:
            if t in got:
                c = got[t]
                a = anchor.get(s["division"])
                if s["id"] in hq_stop:  # district HQ town is a tighter anchor
                    first = hq_stop[s["id"]][1]["talukas"][0]["stop"]
                    if first in coords and first != s["id"]:
                        a = coords[first][:2]
                if a and hav(a, c) > 120:
                    continue
                coords[s["id"]] = [round(c[0], 5), round(c[1], 5), "wikipedia"]
                added += 1
                break
    COORDS.write_text(json.dumps(coords, ensure_ascii=False, separators=(",", ":")), encoding="utf8")
    print(f"wikipedia: +{added} of {len(todo)} tried; total {len(coords)}")


if __name__ == "__main__":
    main()
