"""Build a timetable-page fixture from a depot board whose rows name both ends
("दौंड - कोल्हापूर  05.30", "नगर - सातारा 06.45" = a through bus at the board).
usage: py board_to_page.py <in.txt> <out.json>
in.txt:
  header 'key: value' lines: division, pdf, page, board ('English | मराठी'), note
  'names:'  optional 'मराठी = English' overrides / additions
  'rows:'   'ORIGIN - [VIA -] DEST  HH.MM [HH.MM ...] [@Service]'   (Marathi names; '.' or ':')
            a row whose origin is the board town is an ordinary departure;
            otherwise it is a through bus timed at the board.
Marathi names are translated with public/data/stops.json (nameMr -> name)."""
import json, sys, re, io, os
root = os.path.join(os.path.dirname(__file__), "..", "..")
src = io.open(sys.argv[1], encoding="utf-8").read().splitlines()
meta, names, rows, mode = {}, {}, [], "meta"
# shared overrides: scripts/transcribe/names.txt ('मराठी = English' per line)
for line in io.open(os.path.join(os.path.dirname(__file__), "names.txt"), encoding="utf-8"):
    if "=" in line and not line.startswith("#"):
        mr, e = [x.strip() for x in line.split("=", 1)]; names[mr] = e
for line in src:
    s = line.strip()
    if not s or s.startswith("#"): continue
    if s in ("names:", "rows:"): mode = s[:-1]; continue
    if mode == "meta":
        k, v = s.split(":", 1); meta[k.strip()] = v.strip()
    elif mode == "names":
        mr, en = [x.strip() for x in s.split("=", 1)]; names[mr] = en
    else:
        rows.append(s)

stops = json.load(io.open(os.path.join(root, "public", "data", "stops.json"), encoding="utf-8"))
known = {}
for st in sorted(stops, key=lambda x: x.get("type") != "station"):
    mr = st.get("nameMr", "").split(" (")[0].strip()
    if mr and mr not in known: known[mr] = st["name"].split(" (")[0]
ALIAS = {"नगर": "अहिल्यानगर", "अहमदनगर": "अहिल्यानगर", "छ.संभाजीनगर": "छत्रपती संभाजीनगर",
         "छ. संभाजीनगर": "छत्रपती संभाजीनगर", "संभाजीनगर": "छत्रपती संभाजीनगर", "औरंगाबाद": "छत्रपती संभाजीनगर"}

def en(mr):
    mr = ALIAS.get(mr, mr)
    if mr in names: return names[mr], mr
    if mr in known: return known[mr], mr
    return None, mr

boardEn, boardMr = [x.strip() for x in meta["board"].split("|")]
names.setdefault(boardMr, boardEn)
missing, out, order = set(), {}, []
for r in rows:
    svc = ""
    if "@" in r: r, svc = [x.strip() for x in r.split("@", 1)]
    m = re.match(r"^(.*?)\s+((?:\d{1,2}[.:]\d{2}\s*)+)$", r)
    if not m: sys.exit(f"bad row: {r}")
    parts = [p.strip() for p in re.split(r"\s+-\s+|-", m.group(1)) if p.strip()]
    times = [f"{int(h):02d}:{mm}" for h, mm in re.findall(r"(\d{1,2})[.:](\d{2})", m.group(2))]
    o, d = parts[0], parts[-1]
    oe, om = en(o); de, dm = en(d)
    if oe is None: missing.add(om)
    if de is None: missing.add(dm)
    key = (om, dm, svc)
    if key not in out: out[key] = [oe, de, []]; order.append(key)
    for t in times:
        if t not in out[key][2]: out[key][2].append(t)
if missing: sys.exit("unknown names (add under names:): " + ", ".join(sorted(missing)))

res = []
for (om, dm, svc) in order:
    oe, de, ts = out[(om, dm, svc)]
    if dm == boardMr: continue  # arrival at the board, not a departure
    row = [de, dm, " ".join(sorted(ts))]
    if om != boardMr: row += [svc, oe, om]
    elif svc: row.append(svc)
    res.append(row)
doc = {"docType": "timetable-page", "division": meta["division"], "pdf": meta["pdf"], "page": int(meta["page"])}
if meta.get("unverified") == "true": doc["unverified"] = True
if "note" in meta: doc["note"] = meta["note"]
doc["blocks"] = [{"from": boardEn, "fromMr": boardMr, "depot": meta.get("depot", boardEn), "page": int(meta["page"]), "rows": res}]
io.open(sys.argv[2], "w", encoding="utf-8").write(json.dumps(doc, ensure_ascii=False, indent=1))
print(len(rows), "lines ->", len(res), "rows,", sum(len(v[2]) for v in out.values()), "times")
