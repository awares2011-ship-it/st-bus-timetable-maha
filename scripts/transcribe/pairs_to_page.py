"""Build a timetable-page fixture from boards printed as 'time (destination)' pairs.
usage: py pairs_to_page.py <in.txt> <out.json>
in.txt: header lines 'key: value' (division, pdf, page, from, fromMr, depot, note),
then 'names:' lines 'Code = English | मराठी', then 'pairs:' with 'HH:MM Code' tokens (comma/space separated)."""
import json, sys, re, io
src = io.open(sys.argv[1], encoding="utf-8").read().splitlines()
meta, names, pairs, mode = {}, {}, [], "meta"
for line in src:
    s = line.strip()
    if not s: continue
    if s in ("names:", "pairs:"): mode = s[:-1]; continue
    if mode == "meta":
        k, v = s.split(":", 1); meta[k.strip()] = v.strip()
    elif mode == "names":
        code, rest = s.split("=", 1); en, mr = [x.strip() for x in rest.split("|")]
        names[code.strip()] = (en, mr)
    else:
        pairs += re.findall(r"(\d{1,2}:\d{2})\s+([A-Za-z]+)", s)
rows, order = {}, []
for t, code in pairs:
    if code not in names: sys.exit(f"unknown code {code}")
    h, m = t.split(":"); t = f"{int(h):02d}:{m}"
    if code not in rows: rows[code] = []; order.append(code)
    if t not in rows[code]: rows[code].append(t)
out = {"docType": "timetable-page", "division": meta["division"], "pdf": meta["pdf"], "page": int(meta["page"]),
       "from": meta["from"], "fromMr": meta["fromMr"], "depot": meta.get("depot", meta["from"])}
if "note" in meta: out["note"] = meta["note"]
out["rows"] = [[names[c][0], names[c][1], " ".join(sorted(rows[c]))] for c in order]
io.open(sys.argv[2], "w", encoding="utf-8").write(json.dumps(out, ensure_ascii=False, indent=1))
print(len(pairs), "pairs ->", len(order), "destinations")
