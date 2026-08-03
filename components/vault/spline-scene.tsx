"use client"

import { useState } from "react"
import { Loader2, Sparkles, ExternalLink, Lock, CheckCircle2 } from "lucide-react"

export function SplineScene() {
  const [loaded, setLoaded] = useState(false)
  const [customPublicUrl, setCustomPublicUrl] = useState("")
  const [activeUrl, setActiveUrl] = useState("https://my.spline.design/cdf5daf5-ca7c-409c-a94d-9b1875d40b0f/")

  const handleUpdateUrl = (e: React.FormEvent) => {
    e.preventDefault()
    if (customPublicUrl.trim()) {
      setActiveUrl(customPublicUrl.trim())
      setLoaded(false)
    }
  }

  return (
    <div className="relative w-full h-[500px] md:h-[650px] rounded-3xl overflow-hidden border border-white/10 bg-gradient-to-b from-black/90 via-zinc-950/80 to-black/90 shadow-[0_0_80px_rgba(0,240,255,0.12)] group">
      {/* Encabezado e insignias */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2 rounded-full border border-vault-cyan/40 bg-black/80 px-3.5 py-1.5 backdrop-blur-md text-xs font-bold text-vault-cyan">
        <Sparkles className="h-3.5 w-3.5" /> Escena 3D Spline
      </div>

      <a
        href="https://app.spline.design/file/cdf5daf5-ca7c-409c-a94d-9b1875d40b0f"
        target="_blank"
        rel="noopener noreferrer"
        className="absolute top-4 right-4 z-20 flex items-center gap-1.5 rounded-full border border-white/20 bg-black/80 px-3 py-1.5 backdrop-blur-md text-xs font-semibold text-white/80 hover:bg-white/20 transition-all"
      >
        <span>Abrir Spline Editor</span>
        <ExternalLink className="h-3 w-3" />
      </a>

      {/* Visor 3D Embebido de Spline */}
      <iframe
        src={activeUrl}
        onLoad={() => setLoaded(true)}
        className="w-full h-full border-none relative z-10"
        title="Escena 3D Spline Dyad Finance"
        allow="autoplay; fullscreen; xr-spatial-tracking"
      />

      {/* Panel Asistente si la escena requiere enlace público */}
      <div className="absolute bottom-4 left-4 right-4 z-20 rounded-2xl border border-white/10 bg-black/80 p-4 backdrop-blur-xl flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-white/70">
          <Lock className="h-4 w-4 text-amber-400 shrink-0" />
          <span>
            <strong>¿Tu diseño aparece privado?</strong> Abre Spline Editor ➔ Presiona <strong>Export</strong> ➔ Selecciona <strong>Public URL (Publish)</strong> y pega el enlace aquí:
          </span>
        </div>

        <form onSubmit={handleUpdateUrl} className="flex items-center gap-2 w-full md:w-auto shrink-0">
          <input
            type="url"
            placeholder="https://my.spline.design/..."
            value={customPublicUrl}
            onChange={(e) => setCustomPublicUrl(e.target.value)}
            className="bg-black/60 border border-white/20 rounded-xl px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-vault-cyan w-full md:w-[240px]"
          />
          <button
            type="submit"
            className="rounded-xl border border-vault-cyan/40 bg-vault-cyan/20 px-3 py-1.5 text-xs font-bold text-vault-cyan hover:bg-vault-cyan/30 transition-all shrink-0"
          >
            Actualizar Escena 3D
          </button>
        </form>
      </div>

      {!loaded && (
        <div className="absolute inset-0 z-15 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 text-vault-cyan">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="text-xs font-mono font-bold tracking-widest uppercase">Cargando Escena 3D...</span>
          </div>
        </div>
      )}
    </div>
  )
}
