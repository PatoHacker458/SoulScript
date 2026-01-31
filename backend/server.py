from fastapi import FastAPI
from pydantic import BaseModel
from typing import List
import ufoLib2
import cv2
import numpy as np
import os
import sys
import subprocess
import base64

app = FastAPI()

from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class LetraInput(BaseModel):
    caracter: str
    variante: int
    svg_path: str 

class Payload(BaseModel):
    letras: List[LetraInput]

def crear_notdef(font):
    glyph = font.newGlyph(".notdef")
    glyph.width = 500
    pen = glyph.getPen()
    pen.moveTo((50, 0)); pen.lineTo((50, 700))
    pen.lineTo((450, 700)); pen.lineTo((450, 0))
    pen.closePath()

def calcular_area_firmada(puntos):
    area = 0.0
    for i in range(len(puntos)):
        x1, y1 = puntos[i]
        x2, y2 = puntos[(i + 1) % len(puntos)]
        area += (x1 * y2 - x2 * y1)
    return area / 2.0

@app.post("/generar-fuente")
async def generar_fuente(payload: Payload):
    print(f"🔄 Modo Winding Correction: Procesando {len(payload.letras)} letras...")
    
    font = ufoLib2.Font()
    font.info.familyName = "SoulScriptIA"
    font.info.unitsPerEm = 1000
    font.info.ascender = 800
    font.info.descender = -200
    
    crear_notdef(font)
    variaciones = {}

    for item in payload.letras:
        nombre_glifo = item.caracter
        codepoint = ord(item.caracter) if len(item.caracter) == 1 else None

        if item.variante > 0:
            nombre_glifo = f"{item.caracter}.{item.variante:02d}"
            codepoint = None
            if item.caracter not in variaciones: variaciones[item.caracter] = []
            variaciones[item.caracter].append(nombre_glifo)
        elif item.variante == 0 and item.caracter not in variaciones:
             variaciones[item.caracter] = []

        glyph = font.newGlyph(nombre_glifo)
        if codepoint: glyph.unicodes = [codepoint]
        
        try:
            header, encoded = item.svg_path.split(",", 1)
            img_bytes = base64.b64decode(encoded)
            nparr = np.frombuffer(img_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_UNCHANGED)

            if len(img.shape) == 3: gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            elif len(img.shape) == 4: gray = img[:, :, 3] 
            else: gray = img

            h, w = gray.shape
            gray = gray[5:h-5, 5:w-5]

            _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

            contours, hierarchy = cv2.findContours(thresh, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
            
            if not contours:
                glyph.width = 500
                continue
            
            hierarchy = hierarchy[0]

            all_points = np.vstack(contours)
            min_x = float(np.min(all_points[:, :, 0]))
            max_x = float(np.max(all_points[:, :, 0]))
            min_y = float(np.min(all_points[:, :, 1]))
            max_y = float(np.max(all_points[:, :, 1]))
            
            orig_h = max_y - min_y
            orig_w = max_x - min_x
            if orig_h <= 0: continue

            TARGET_H = 700
            scale = TARGET_H / orig_h

            def tx(val): return float((val - min_x) * scale)
            def ty(val): return float((max_y - val) * scale) 

            pen = glyph.getPen()
            
            for i, cnt in enumerate(contours):
                if cv2.contourArea(cnt) < 30: continue
                
                depth = 0
                parent_idx = hierarchy[i][3]
                while parent_idx != -1:
                    depth += 1
                    parent_idx = hierarchy[parent_idx][3]
                
                es_agujero = (depth % 2 != 0)

                cnt = cv2.approxPolyDP(cnt, 2.0, True)
                if len(cnt) < 3: continue
                
                font_points = []
                for pt in cnt:
                    px, py = pt[0]
                    font_points.append((tx(px), ty(py)))

                area = calcular_area_firmada(font_points)
                
                needs_reverse = False
                
                if not es_agujero:
                    if area < 0: needs_reverse = True
                else:
                    if area > 0: needs_reverse = True
                
                if needs_reverse:
                    font_points = font_points[::-1]

                start_pt = font_points[0]
                pen.moveTo(start_pt)
                for j in range(1, len(font_points)):
                    pen.lineTo(font_points[j])
                pen.closePath()
            
            glyph.width = int(float(orig_w * scale)) + 50
            print(f"✅ {nombre_glifo} OK. Winding corregido.")

        except Exception as e:
            print(f"❌ Error en {nombre_glifo}: {e}")
            glyph.width = 500
            continue

    cod_feature = "languagesystem DFLT dflt;\nlanguagesystem latn dflt;\n\nfeature calt {\n"
    for char, vars_list in variaciones.items():
        if not vars_list: continue
        cod_feature += f"    sub {char} {char}' by {vars_list[0]};\n"
        for i in range(len(vars_list) - 1):
            cod_feature += f"    sub {vars_list[i]} {char}' by {vars_list[i+1]};\n"
    cod_feature += "} calt;\n"
    font.features.text = cod_feature

    os.makedirs("build", exist_ok=True)
    font.save("temp.ufo", overwrite=True)
    try:
        subprocess.run([sys.executable, "-m", "fontmake", "-u", "temp.ufo", "-o", "otf", "--output-dir", "build"], check=True)
        
        archivo_otf = None
        candidatos = [f for f in os.listdir("build") if f.endswith(".otf")]
        if candidatos: 
            archivo_otf = os.path.join("build", "SoulScriptIA-Regular.otf") if "SoulScriptIA-Regular.otf" in candidatos else os.path.join("build", candidatos[0])
            
        if archivo_otf and os.path.exists(archivo_otf):
            with open(archivo_otf, "rb") as f:
                font_data = base64.b64encode(f.read()).decode('utf-8')
            return {"font_file": font_data, "filename": "SoulScriptIA.otf"}
        else:
             return {"error": "No se generó el archivo OTF"}
             
    except Exception as e:
        return {"error": str(e)}