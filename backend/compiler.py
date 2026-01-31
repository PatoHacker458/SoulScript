import ufoLib2
from ufoLib2.objects import Glyph
import svgelements
import os
import sys
import subprocess

# --- CONFIGURACIÓN ---
NOMBRE_FUENTE = "MiLetraIA"
CARPETA_SVGS = "output_svgs"

# MAPEO (Asegúrate que coincida con tus archivos)
MAPEO_LETRAS = {
    'a': 97, 'b': 98, 'c': 99, 'd': 100, 'e': 101,
    'f': 102, 'g': 103, 'h': 104, 'i': 105, 'j': 106,
    'k': 107, 'l': 108, 'm': 109, 'n': 110, 'o': 111,
    'p': 112, 'q': 113, 'r': 114, 's': 115, 't': 116,
    'u': 117, 'v': 118, 'w': 119, 'x': 120, 'y': 121, 'z': 122,
    'A': 65, 'B': 66, 'C': 67
}


def crear_notdef(font):
    glyph = font.newGlyph(".notdef")
    glyph.width = 500
    pen = glyph.getPen()
    pen.moveTo((50, 0))
    pen.lineTo((50, 700))
    pen.lineTo((450, 700))
    pen.lineTo((450, 0))
    pen.closePath()


def obtener_limites_reales(svg):
    """Escanea todos los puntos para encontrar los bordes reales"""
    min_x, min_y = float('inf'), float('inf')
    max_x, max_y = float('-inf'), float('-inf')
    found = False

    for element in svg.elements():
        if isinstance(element, svgelements.Path):
            for seg in element:
                # Revisamos el punto final de cada segmento
                if hasattr(seg, 'end') and seg.end:
                    found = True
                    min_x = min(min_x, seg.end.x)
                    min_y = min(min_y, seg.end.y)
                    max_x = max(max_x, seg.end.x)
                    max_y = max(max_y, seg.end.y)
                # Revisamos puntos de control si es curva (para mayor precisión)
                if hasattr(seg, 'control1') and seg.control1:
                    min_y = min(min_y, seg.control1.y)
                    max_y = max(max_y, seg.control1.y)
                if hasattr(seg, 'control2') and seg.control2:
                    min_y = min(min_y, seg.control2.y)
                    max_y = max(max_y, seg.control2.y)

    return found, min_x, min_y, max_x, max_y


def crear_fuente():
    print("🏗️  Inicializando (Modo Reescritura Manual)...")
    font = ufoLib2.Font()
    font.info.familyName = NOMBRE_FUENTE
    font.info.unitsPerEm = 1000
    font.info.ascender = 800
    font.info.descender = -200
    font.info.xHeight = 500
    font.info.capHeight = 700
    font.info.versionMajor = 1
    font.info.versionMinor = 0
    font.info.copyright = "Generada con SoulScript IA"

    crear_notdef(font)
    variaciones = {}

    if not os.path.exists(CARPETA_SVGS):
        print(f"❌ Error: No existe {CARPETA_SVGS}")
        return

    archivos = sorted(os.listdir(CARPETA_SVGS))

    for archivo in archivos:
        if not archivo.endswith(".svg"): continue

        # --- PARSEO ---
        partes = archivo.replace(".svg", "").split("_")
        if len(partes) < 3: continue
        caracter = partes[1]
        try:
            indice = int(partes[2])
        except ValueError:
            continue

        nombre_glifo = caracter
        codepoint = MAPEO_LETRAS.get(caracter)

        if codepoint is None and indice == 0: continue
        if indice > 0:
            nombre_glifo = f"{caracter}.{indice:02d}"
            codepoint = None
            if caracter not in variaciones: variaciones[caracter] = []
            variaciones[caracter].append(nombre_glifo)

        print(f"🔤 Procesando {nombre_glifo}...", end=" ")

        glyph = font.newGlyph(nombre_glifo)
        if codepoint: glyph.unicodes = [codepoint]
        pen = glyph.getPen()

        svg_path = os.path.join(CARPETA_SVGS, archivo)
        try:
            svg = svgelements.SVG.parse(svg_path)
        except:
            continue

        # 1. OBTENER DIMENSIONES ORIGINALES
        found, min_x, min_y, max_x, max_y = obtener_limites_reales(svg)

        if not found:
            print("Vacío.")
            continue

        orig_h = max_y - min_y
        orig_w = max_x - min_x

        if orig_h <= 0: continue

        # 2. CALCULAR ESCALA Y FACTORES
        TARGET_H = 700
        scale = TARGET_H / orig_h

        print(f"[H_orig: {int(orig_h)} -> H_final: 700]")

        # 3. DIBUJADO CON TRANSFORMACIÓN MANUAL (SIN MATRICES)
        # Fórmula:
        # X = (Original_X - Min_X) * Scale
        # Y = (Max_Y - Original_Y) * Scale  <-- ESTO VOLTEA Y CORRIGE POSICIÓN

        def tx(val):
            return (val - min_x) * scale

        def ty(val):
            return (max_y - val) * scale  # Inversión explicita

        for element in svg.elements():
            if isinstance(element, svgelements.Path):
                for seg in element:
                    if isinstance(seg, svgelements.Move):
                        pen.moveTo((tx(seg.end.x), ty(seg.end.y)))

                    elif isinstance(seg, svgelements.Line):
                        pen.lineTo((tx(seg.end.x), ty(seg.end.y)))

                    elif isinstance(seg, svgelements.Close):
                        pen.closePath()

                    elif isinstance(seg, svgelements.CubicBezier):
                        pen.curveTo(
                            (tx(seg.control1.x), ty(seg.control1.y)),
                            (tx(seg.control2.x), ty(seg.control2.y)),
                            (tx(seg.end.x), ty(seg.end.y))
                        )

                    elif isinstance(seg, svgelements.QuadraticBezier):
                        pen.qCurveTo(
                            (tx(seg.control.x), ty(seg.control.y)),
                            (tx(seg.end.x), ty(seg.end.y))
                        )

        # Ajustar ancho
        glyph.width = int(orig_w * scale) + 50

    # --- FINALIZAR ---
    print("✨ Generando OpenType...")
    cod_feature = "languagesystem DFLT dflt;\nlanguagesystem latn dflt;\n\nfeature calt {\n"
    for char, vars_list in variaciones.items():
        if not vars_list: continue
        cod_feature += f"    sub {char} {char}' by {vars_list[0]};\n"
        for i in range(len(vars_list) - 1):
            cod_feature += f"    sub {vars_list[i]} {char}' by {vars_list[i + 1]};\n"
    cod_feature += "} calt;\n"
    font.features.text = cod_feature

    print("💾 Compilando...")
    font.save("MiFuenteRaw.ufo", overwrite=True)
    subprocess.run([sys.executable, "-m", "fontmake", "-u", "MiFuenteRaw.ufo", "-o", "otf", "--output-dir", "build"],
                   check=True)
    print("✅ ¡ÉXITO! Fuente generada.")


if __name__ == "__main__":
    crear_fuente()