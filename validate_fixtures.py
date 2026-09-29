import json, os, sys
sys.stdout.reconfigure(encoding='utf-8')

files = [
  r'D:\ST bus\Claude outputs\maharashtra-st-bus-timetable-extracted\data\msrtc\source\manual\95-jalgaon-depo-2025-03-01.json',
  r'D:\ST bus\Claude outputs\maharashtra-st-bus-timetable-extracted\data\msrtc\source\manual\100-dhule-depo-2025-03-01.json',
  r'D:\ST bus\Claude outputs\maharashtra-st-bus-timetable-extracted\data\msrtc\source\manual\105-nanded-depo-2025-03-01.json',
  r'D:\ST bus\Claude outputs\maharashtra-st-bus-timetable-extracted\data\msrtc\source\manual\110-raigad-depo-2025-03-01.json'
]
for f in files:
    try:
        with open(f, 'r', encoding='utf-8') as fh:
            data = json.load(fh)
        fname = os.path.basename(f)
        print(f'VALID: {fname} - {len(data["trips"])} trips')
    except Exception as e:
        fname = os.path.basename(f)
        print(f'ERROR: {fname} - {e}')
