import cv2
import numpy as np
import os
import subprocess

INPUT_FOLDER = 'input'
TEMP_FOLDER = 'temp'
OUTPUT_FOLDER = 'output_svgs'

TEXTO_GUIA = "AAAABU"

os.makedirs(TEMP_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)


def procesar_hoja(nombre_imagen):
    ruta_img = os.path.join(INPUT_FOLDER, nombre_imagen)
    img = cv2.imread(ruta_img)

    if img is None:
        print("Error: No se encontró la imagen.")
        return

    gris = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    _, umbral = cv2.threshold(gris, 127, 255, cv2.THRESH_BINARY_INV)
    contornos, _ = cv2.findContours(umbral, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    contornos = sorted(contornos, key=lambda ctr: cv2.boundingRect(ctr)[0])

    contornos_limpios = []
    for cnt in contornos:
        x, y, w, h = cv2.boundingRect(cnt)
        if w > 10 and h > 10:
            contornos_limpios.append(cnt)

    print(f"Letras detectadas: {len(contornos_limpios)}")
    print(f"Letras esperadas: {len(TEXTO_GUIA)}")

    if len(contornos_limpios) != len(TEXTO_GUIA):
        print("⚠️ ALERTA: El número de letras detectadas no coincide con el texto guía.")
        print("Revisa que no haya manchas en el papel o que las letras no se toquen.")

    for i, (cnt, letra_real) in enumerate(zip(contornos_limpios, TEXTO_GUIA)):
        x, y, w, h = cv2.boundingRect(cnt)

        # Padding
        padding = 10
        # Aseguramos que el recorte no se salga de la imagen
        y1 = max(0, y - padding)
        y2 = min(umbral.shape[0], y + h + padding)
        x1 = max(0, x - padding)
        x2 = min(umbral.shape[1], x + w + padding)

        roi = umbral[y1:y2, x1:x2]

        # --- CORRECCIÓN CRÍTICA ---
        # Invertimos los colores de nuevo para que Potrace vea:
        # Letra = NEGRO, Fondo = BLANCO
        roi = cv2.bitwise_not(roi)
        # --------------------------

        archivo_temp = os.path.join(TEMP_FOLDER, f'temp_{i}.bmp')
        cv2.imwrite(archivo_temp, roi)

        nombre_archivo = f"letra_{letra_real}_{i}.svg"
        archivo_svg = os.path.join(OUTPUT_FOLDER, nombre_archivo)

        subprocess.run(["potrace", archivo_temp, "-s", "-o", archivo_svg])
        print(f"Generado: {nombre_archivo} (Corresponde a '{letra_real}')")

    print(f"¡Listo! Revisa la carpeta {OUTPUT_FOLDER}")


if __name__ == "__main__":
    if os.listdir(INPUT_FOLDER):
        imagen_prueba = os.listdir(INPUT_FOLDER)[0]
        procesar_hoja(imagen_prueba)
    else:
        print("Carpeta input vacía")