import { useState, useRef } from 'react'
import { ReactSketchCanvas, type ReactSketchCanvasRef } from 'react-sketch-canvas'
import axios from 'axios'

interface LetraData {
  caracter: string
  variante: number
  svg_path: string
}

// TU MAPA DE RUTA
const CARACTERES = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
  'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
  'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
  'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
  '.', ',', '!', '?', '-', '@', ' '
];

function App() {
  const canvasRef = useRef<ReactSketchCanvasRef>(null)

  // Navegación
  const [indiceChar, setIndiceChar] = useState(0)
  const [varianteActual, setVarianteActual] = useState(0)
  const [coleccion, setColeccion] = useState<LetraData[]>([])

  // UI States
  const [loading, setLoading] = useState(false)
  const [fuenteLista, setFuenteLista] = useState(false)
  const [textoPreview, setTextoPreview] = useState("Escribe aquí para probar tu fuente...")

  // --- NUEVOS ESTADOS PARA SEPARAR DESCARGA ---
  const [fontFile, setFontFile] = useState<string | null>(null) // Guarda el Base64
  const [fileName, setFileName] = useState<string>("")          // Guarda el nombre

  const letraActual = CARACTERES[indiceChar];
  const totalPasos = CARACTERES.length;

  const guardarLetra = async () => {
    if (!canvasRef.current) return
    const base64Image = await canvasRef.current.exportImage("png");

    if (letraActual !== ' ') {
      const nuevaLetra = {
        caracter: letraActual,
        variante: varianteActual,
        svg_path: base64Image
      }
      setColeccion(prev => [...prev, nuevaLetra])
    }
    avanzar()
  }

  const saltarLetra = () => avanzar(true)

  const avanzar = (forzarCambioLetra = false) => {
    canvasRef.current?.clearCanvas()
    if (varianteActual < 2 && !forzarCambioLetra) {
      setVarianteActual(varianteActual + 1)
    } else {
      if (indiceChar < CARACTERES.length - 1) {
        setIndiceChar(indiceChar + 1)
        setVarianteActual(0)
      } else {
        alert("¡Has terminado todo el alfabeto! 🎉")
      }
    }
  }

  // --- ACCIÓN 1: GENERAR Y PROBAR (SIN DESCARGAR) ---
  const generarYProbar = async () => {
    setLoading(true)
    try {
      // 1. DEFINIMOS LA URL INTELIGENTE
      // Intenta leer la variable de entorno VITE_API_URL.
      // Si no existe (ej. en tu PC local), usa 'http://localhost:8000'.
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

      // 2. USAMOS ESA VARIABLE EN LA PETICIÓN (Fíjate en las comillas invertidas ``)
      const response = await axios.post(`${API_URL}/generar-fuente`, {
        letras: coleccion
      })

      const fontData = response.data.font_file;
      const fName = response.data.filename;

      // 1. Inyectar en el navegador (Live Preview)
      const nombreFuente = 'SoulScriptPreview';
      // Un truco para forzar al navegador a recargar la fuente si la regeneras: añadir un timestamp
      const fontUrl = `data:font/otf;base64,${fontData}`;
      const fontFace = new FontFace(nombreFuente, `url(${fontUrl})`);

      await fontFace.load();
      document.fonts.add(fontFace); // Si ya existe, la actualiza

      // 2. Guardar en memoria para permitir la descarga luego
      setFontFile(fontData)
      setFileName(fName)
      setFuenteLista(true)

      // 3. Feedback visual
      if (textoPreview === "Escribe aquí para probar tu fuente...") {
        setTextoPreview(`¡Hola! Probando: Aa Bb Cc 123.`);
      }

    } catch (error) {
      console.error("Error", error)
      alert("Error al conectar con el backend.")
    }
    setLoading(false)
  }

  // --- ACCIÓN 2: DESCARGAR (SOLO SI YA SE GENERÓ) ---
  const descargarArchivo = () => {
    if (!fontFile) return;

    const link = document.createElement('a')
    link.href = `data:font/otf;base64,${fontFile}`
    link.download = fileName
    link.click()
  }

  return (
    <>
      <style>{`
        body, html, #root { margin: 0; padding: 0; width: 100%; min-height: 100vh; background-color: #1a1a1a; color: #eee; }
        #root { display: flex; flex-direction: column; alignItems: center; justify-content: flex-start; }
        * { box-sizing: border-box; }
      `}</style>

      <div style={{ width: '100%', maxWidth: '1200px', padding: '20px', fontFamily: "'Segoe UI', sans-serif", display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

        {/* CABECERA */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{ fontSize: '3rem', margin: '0 0 10px 0' }}>SoulScript IA ✍️</h1>
          <div style={{ backgroundColor: '#2a2a2a', padding: '10px 25px', borderRadius: '20px', display: 'inline-flex', alignItems: 'center', gap: '15px' }}>
            <h2 style={{ margin: 0, fontSize: '1.2rem' }}>
              Dibujando: <span style={{ fontSize: '1.4em', color: '#4da6ff', fontWeight: 'bold' }}>
                {letraActual === ' ' ? '(Espacio)' : letraActual}
              </span>
            </h2>
            <span style={{ width: '1px', height: '20px', backgroundColor: '#555' }}></span>
            <p style={{ margin: 0, color: '#aaa', fontSize: '0.9rem' }}>Variante {varianteActual + 1}/3</p>
            <span style={{ width: '1px', height: '20px', backgroundColor: '#555' }}></span>
            <p style={{ margin: 0, color: '#aaa', fontSize: '0.9rem' }}>Progreso: {indiceChar + 1}/{totalPasos}</p>
          </div>
        </div>

        {/* GRID PRINCIPAL */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '30px', justifyContent: 'center', width: '100%', alignItems: 'flex-start' }}>

          {/* COLUMNA 1: LIENZO */}
          <div style={{ flex: '1 1 350px', maxWidth: '450px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: '100%', marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 'bold', color: '#ccc' }}>✏️ Lienzo</span>
              <button onClick={() => canvasRef.current?.clearCanvas()} style={{ background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer' }}>🗑️ Borrar</button>
            </div>

            <div style={{ position: 'relative', width: '100%', aspectRatio: '1 / 1', border: '4px solid #333', backgroundColor: 'white', borderRadius: '15px', overflow: 'hidden' }}>
              {/* GUÍAS */}
              <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 10 }}>
                <div style={{ position: 'absolute', top: '25%', width: '100%', borderTop: '1px dashed rgba(0,0,255,0.3)' }}></div>
                <div style={{ position: 'absolute', top: '45%', width: '100%', borderTop: '1px dotted rgba(0,0,0,0.2)' }}></div>
                <div style={{ position: 'absolute', top: '75%', width: '100%', borderTop: '2px solid rgba(255,0,0,0.4)' }}></div>
                <span style={{ position: 'absolute', top: '76%', right: '10px', fontSize: '10px', color: 'red', opacity: 0.5 }}>Línea Base</span>
              </div>
              <ReactSketchCanvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, zIndex: 1 }} strokeWidth={20} strokeColor="black" canvasColor="white" width="100%" height="100%" />
            </div>

            <div style={{ display: 'flex', gap: 10, width: '100%', marginTop: 20 }}>
              <button onClick={saltarLetra} style={{ flex: 1, padding: '15px', fontWeight: 'bold', cursor: 'pointer', backgroundColor: '#555', color: 'white', border: 'none', borderRadius: '10px' }}>
                ⏭️ Saltar
              </button>
              <button onClick={guardarLetra} style={{ flex: 2, padding: '15px', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '10px', boxShadow: '0 4px 0 #1e7e34' }}>
                Siguiente 👉
              </button>
            </div>
          </div>

          {/* COLUMNA 2: PREVIEW */}
          <div style={{ flex: '1 1 350px', maxWidth: '450px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ width: '100%', marginBottom: 10, fontWeight: 'bold', color: '#ccc' }}>📝 Vista Previa</div>
            <div style={{ position: 'relative', width: '100%', aspectRatio: '1 / 1', backgroundColor: 'white', borderRadius: '15px', border: '4px solid #333', overflow: 'hidden' }}>
              <textarea
                value={textoPreview}
                onChange={(e) => setTextoPreview(e.target.value)}
                placeholder="Escribe aquí..."
                style={{ width: '100%', height: '100%', padding: '25px', fontSize: '40px', lineHeight: '1.2', color: 'black', backgroundColor: 'transparent', fontFamily: fuenteLista ? 'SoulScriptPreview' : 'sans-serif', border: 'none', resize: 'none', outline: 'none' }}
              />
              {/* Etiqueta flotante */}
              <div style={{ position: 'absolute', bottom: '15px', right: '15px', backgroundColor: fuenteLista ? 'rgba(40, 167, 69, 0.9)' : 'rgba(0,0,0,0.1)', color: fuenteLista ? 'white' : '#aaa', padding: '5px 10px', borderRadius: '5px', fontSize: '0.8rem', pointerEvents: 'none' }}>
                {fuenteLista ? "✅ Live Preview Activo" : "ℹ️ Esperando generación..."}
              </div>
            </div>
          </div>
        </div>

        <hr style={{ width: '100%', maxWidth: '800px', margin: '40px 0', borderColor: '#333' }} />

        {/* --- ZONA DE ACCIONES (2 BOTONES) --- */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '20px',
          justifyContent: 'center',
          width: '100%',
          marginBottom: '60px'
        }}>

          {/* BOTÓN 1: GENERAR Y PROBAR */}
          <button
            onClick={generarYProbar}
            disabled={coleccion.length === 0 || loading}
            style={{
              flex: '1 1 250px', // Crece y se adapta, base 250px
              maxWidth: '400px',
              fontSize: '1.2rem',
              padding: '18px 30px',
              backgroundColor: loading ? 'gray' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '15px',
              cursor: loading || coleccion.length === 0 ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              boxShadow: '0 4px 15px rgba(0,123,255,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
            }}
          >
            {loading ? "⚙️ Procesando..." : "⚡ 1. Generar y Probar"}
          </button>

          {/* BOTÓN 2: DESCARGAR (Bloqueado si no hay fuente generada) */}
          <button
            onClick={descargarArchivo}
            disabled={!fontFile} // SOLO SE ACTIVA SI YA HAY ARCHIVO
            style={{
              flex: '1 1 250px',
              maxWidth: '400px',
              fontSize: '1.2rem',
              padding: '18px 30px',
              // Color Naranja para descarga, o Gris si está bloqueado
              backgroundColor: !fontFile ? '#444' : '#fd7e14',
              color: !fontFile ? '#888' : 'white',
              border: 'none',
              borderRadius: '15px',
              cursor: !fontFile ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              boxShadow: !fontFile ? 'none' : '0 4px 15px rgba(253, 126, 20, 0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              transition: 'all 0.3s'
            }}
          >
            {!fontFile ? "🔒 Descarga Bloqueada" : "💾 2. Descargar .OTF"}
          </button>
        </div>

      </div>
    </>
  )
}

export default App