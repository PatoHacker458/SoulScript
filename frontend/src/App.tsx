import { useState, useRef } from 'react'
import { ReactSketchCanvas, type ReactSketchCanvasRef } from 'react-sketch-canvas'
import axios from 'axios'
import './App.css'

interface LetraData {
  caracter: string
  variante: number
  svg_path: string
}

const CARACTERES = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
  'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
  'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
  'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
  '.', ',', '!', '?', '-', '@', ':', ';', "'", '"', '(', ')', '[', ']', '{', '}', '+', '=', '/', '*', '&', '^', '%', '$', '#', '<', '>', ' '
];

function App() {
  const canvasRef = useRef<ReactSketchCanvasRef>(null)

  const [indiceChar, setIndiceChar] = useState(0)
  const [varianteActual, setVarianteActual] = useState(0)
  const [coleccion, setColeccion] = useState<LetraData[]>([])

  const [loading, setLoading] = useState(false)
  const [fuenteLista, setFuenteLista] = useState(false)
  const [textoPreview, setTextoPreview] = useState("Escribe aquí para probar tu fuente...")

  const [fontFile, setFontFile] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string>("")

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
        alert("Proceso completado: Has terminado todo el alfabeto.")
      }
    }
  }

  const generarYProbar = async () => {
    setLoading(true)
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

      const response = await axios.post(`${API_URL}/generar-fuente`, {
        letras: coleccion
      })

      const fontData = response.data.font_file;
      const fName = response.data.filename;

      const nombreFuente = 'SoulScriptPreview';
      const fontUrl = `data:font/otf;base64,${fontData}`;
      const fontFace = new FontFace(nombreFuente, `url(${fontUrl})`);

      await fontFace.load();
      document.fonts.add(fontFace);

      setFontFile(fontData)
      setFileName(fName)
      setFuenteLista(true)

      if (textoPreview === "Escribe aquí para probar tu fuente...") {
        setTextoPreview(`Hola Mundo. Probando: Aa Bb Cc 123.`);
      }

    } catch (error) {
      console.error("Error", error)
      alert("Error al conectar con el motor de compilación.")
    }
    setLoading(false)
  }

  const descargarArchivo = () => {
    if (!fontFile) return;
    const link = document.createElement('a')
    link.href = `data:font/otf;base64,${fontFile}`
    link.download = fileName
    link.click()
  }

  return (
    <div className="app-layout">
      {/* PANEL LATERAL: CONTROLES */}
      <aside className="sidebar">
        <div className="brand-header">
          <h1>SoulScript</h1>
          <p>Motor Tipográfico</p>
        </div>

        <div className="status-card">
          <p className="status-label">Dibujando carácter</p>
          <h2 className="current-char">
            {letraActual === ' ' ? '(Espacio)' : letraActual}
          </h2>
          <div className="status-metrics">
            <span>Variante {varianteActual + 1}/3</span>
            <span className="dot-separator">•</span>
            <span>Progreso {indiceChar + 1}/{totalPasos}</span>
          </div>
        </div>

        <div className="action-group">
          <button className="btn btn-secondary" onClick={() => canvasRef.current?.clearCanvas()}>
            Borrar Lienzo
          </button>
          <div className="action-row">
            <button className="btn btn-outline" onClick={saltarLetra}>
              Saltar
            </button>
            <button className="btn btn-primary" onClick={guardarLetra}>
              Siguiente
            </button>
          </div>
        </div>

        <div className="divider"></div>

        <div className="global-actions">
          <button 
            className="btn btn-dark" 
            onClick={generarYProbar} 
            disabled={coleccion.length === 0 || loading}
          >
            {loading ? "Procesando vectores..." : "Generar y Probar"}
          </button>
          <button 
            className="btn btn-accent" 
            onClick={descargarArchivo} 
            disabled={!fontFile}
          >
            Descargar Archivo .OTF
          </button>
        </div>
      </aside>

      {/* ÁREA CENTRAL: LIENZO Y VISTA PREVIA */}
      <main className="workspace">
        <div className="workspace-grid">
          
          {/* SECCIÓN DEL LIENZO */}
          <section className="panel canvas-panel">
            <div className="panel-header">
              <h3>Lienzo de captura</h3>
            </div>
            <div className="canvas-wrapper">
              {/* Líneas Guía Tipográficas */}
              <div className="guidelines">
                <div className="guide ascender"></div>
                <div className="guide x-height"></div>
                <div className="guide baseline">
                  <span className="guide-label">Línea base</span>
                </div>
              </div>
              
              <ReactSketchCanvas 
                ref={canvasRef} 
                className="sketch-canvas"
                strokeWidth={18} 
                strokeColor="#000000" 
                canvasColor="#ffffff" 
              />
            </div>
          </section>

          {/* SECCIÓN DE VISTA PREVIA */}
          <section className="panel preview-panel">
            <div className="panel-header">
              <h3>Prueba de renderizado</h3>
              <span className={`status-badge ${fuenteLista ? 'active' : ''}`}>
                {fuenteLista ? 'En vivo' : 'Inactivo'}
              </span>
            </div>
            <div className="preview-wrapper">
              <textarea
                value={textoPreview}
                onChange={(e) => setTextoPreview(e.target.value)}
                placeholder="Escribe aquí..."
                spellCheck="false"
                style={{ fontFamily: fuenteLista ? 'SoulScriptPreview' : 'inherit' }}
                className="preview-textarea"
              />
            </div>
          </section>

        </div>
      </main>
    </div>
  )
}

export default App