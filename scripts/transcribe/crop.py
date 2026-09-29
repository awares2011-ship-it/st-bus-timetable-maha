import sys,io,fitz
from PIL import Image
pdf,pg,x0,y0,x1,y1,out=sys.argv[1:8]; sc=float(sys.argv[8]) if len(sys.argv)>8 else 2
doc=fitz.open(pdf); p=doc[int(pg)-1]
x=sorted(p.get_images(),key=lambda i:-i[2]*i[3])[0][0]
im=Image.open(io.BytesIO(doc.extract_image(x)['image'])).convert('RGB')
w,h=im.size
c=im.crop((int(w*float(x0)),int(h*float(y0)),int(w*float(x1)),int(h*float(y1))))
c=c.resize((int(c.width*sc),int(c.height*sc)),Image.LANCZOS); c.save(out); print(im.size,c.size)
