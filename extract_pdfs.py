import fitz, os, sys
sys.stdout.reconfigure(encoding='utf-8')

d = r'C:\Users\Nivrutti Aware\Downloads'
o = r'D:\ST bus\Claude outputs\maharashtra-st-bus-timetable-extracted\data\ocr\images'
os.makedirs(o, exist_ok=True)

for f in os.listdir(d):
    if f.endswith('.pdf'):
        for name, marathi in [('jalgaon','जळगाव'), ('dhule','धुळे'), ('nanded','नांदेड'), ('raigad','रायगड')]:
            if marathi in f and 'compressed' not in f:
                path = os.path.join(d, f)
                doc = fitz.open(path)
                print(f'{name}: {f} - {doc.page_count} pages')
                for i in range(min(8, doc.page_count)):
                    doc[i].get_pixmap(dpi=200).save(os.path.join(o, f'{name}-p{i+1:03d}.png'))
                    print(f'  Saved page {i+1}')
                break
