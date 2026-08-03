"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { TrendingUp, TrendingDown, ShieldAlert, DollarSign, Activity, RefreshCw, Zap } from "lucide-react"

export function SimulationPanel() {
  // Parámetros de simulación
  const [initialPrice, setInitialPrice] = useState<number>(3000)
  const [currentPrice, setCurrentPrice] = useState<number>(3000)
  const [ethDeposit, setEthDeposit] = useState<number>(10)

  // Cálculos matemáticos en vivo (LTV 75%)
  const LTV_PERCENTAGE = 75
  const initialCollateralUSD = ethDeposit * initialPrice
  const mintedUsdJ = (initialCollateralUSD * LTV_PERCENTAGE) / 100
  const initialEquityETH = ethDeposit * (1 - LTV_PERCENTAGE / 100) // 2.5 ETH a $3000 = $7500
  const initialEquityUSD = initialEquityETH * initialPrice

  // Al cambiar el precio actual de ETH:
  const currentCollateralUSD = ethDeposit * currentPrice
  const ethRequiredForStables = currentPrice > 0 ? mintedUsdJ / currentPrice : 0
  const surplusETHForVolatile = Math.max(0, ethDeposit - ethRequiredForStables)
  const currentEquityUSD = surplusETHForVolatile * currentPrice

  // ROI de jETH
  const equityGainUSD = currentEquityUSD - initialEquityUSD
  const roiPercentage = initialEquityUSD > 0 ? (equityGainUSD / initialEquityUSD) * 100 : 0

  // Health Factor LTV
  const currentLTV = currentCollateralUSD > 0 ? (mintedUsdJ / currentCollateralUSD) * 100 : 0
  let healthStatus = "Seguro"
  let healthColor = "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"

  if (currentLTV > 90) {
    healthStatus = "Riesgo Alto de Insolvencia"
    healthColor = "text-rose-400 border-rose-500/30 bg-rose-500/10"
  } else if (currentLTV > 75) {
    healthStatus = "Bajo Presión de Mercado"
    healthColor = "text-amber-400 border-amber-500/30 bg-amber-500/10"
  }

  return (
    <div className="w-full rounded-3xl border border-white/10 bg-black/80 p-6 md:p-8 backdrop-blur-xl shadow-[0_0_50px_rgba(0,0,0,0.8)]">
      {/* Encabezado del Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 text-vault-cyan font-mono text-xs uppercase tracking-widest mb-1">
            <Zap className="h-4 w-4" /> Simulador de Mercado & Apalancamiento DeFi
          </div>
          <h3 className="text-2xl font-bold text-white">Simulador Interactivo de Precios (ETH / usdJ / jETH)</h3>
          <p className="text-sm text-white/50 mt-1">
            Ajusta el precio simulado de ETH para observar en tiempo real cómo cambia el valor de tus tokens <span className="text-emerald-400 font-medium">usdJ</span> y <span className="text-indigo-400 font-medium">jETH</span>.
          </p>
        </div>
        <button
          onClick={() => {
            setInitialPrice(3000)
            setCurrentPrice(3000)
            setEthDeposit(10)
          }}
          className="self-start md:self-auto flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs font-semibold text-white/80 hover:bg-white/10 transition-all"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Reiniciar Valores
        </button>
      </div>

      {/* Controles de Entrada */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 my-8">
        {/* Depósito de ETH */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <label className="text-xs font-bold uppercase tracking-wider text-white/70 block mb-2">
            Monto de Depósito Simulado en ETH
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              value={ethDeposit}
              onChange={(e) => setEthDeposit(Math.max(0.1, Number(e.target.value)))}
              className="w-full bg-black/60 border border-white/20 rounded-xl px-4 py-2.5 text-lg font-bold text-white focus:outline-none focus:border-vault-cyan"
            />
            <span className="text-sm font-bold text-vault-cyan">ETH</span>
          </div>
          <p className="text-[0.75rem] text-white/40 mt-2">
            Colateral inicial a un precio base de <strong>${initialPrice.toLocaleString()} USD</strong> = <strong>${initialCollateralUSD.toLocaleString()} USD</strong> total.
          </p>
        </div>

        {/* Slider de Precio ETH */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs font-bold uppercase tracking-wider text-white/70">
              Precio Simulado de ETH en Mercado
            </label>
            <span className="text-xl font-extrabold text-vault-cyan font-mono">
              ${currentPrice.toLocaleString()} USD
            </span>
          </div>
          <input
            type="range"
            min={1000}
            max={8000}
            step={50}
            value={currentPrice}
            onChange={(e) => setCurrentPrice(Number(e.target.value))}
            className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-vault-cyan"
          />
          {/* Botones Predefinidos de Escenario */}
          <div className="grid grid-cols-4 gap-2 mt-4">
            <button
              onClick={() => setCurrentPrice(1500)}
              className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-2 py-1.5 text-[0.7rem] font-bold text-rose-400 hover:bg-rose-500/20"
            >
              📉 $1,500 (-50%)
            </button>
            <button
              onClick={() => setCurrentPrice(3000)}
              className="rounded-lg border border-white/20 bg-white/10 px-2 py-1.5 text-[0.7rem] font-bold text-white/80 hover:bg-white/20"
            >
              ⚖️ $3,000 (Base)
            </button>
            <button
              onClick={() => setCurrentPrice(4500)}
              className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-2 py-1.5 text-[0.7rem] font-bold text-indigo-400 hover:bg-indigo-500/20"
            >
              🚀 $4,500 (+50%)
            </button>
            <button
              onClick={() => setCurrentPrice(6000)}
              className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1.5 text-[0.7rem] font-bold text-emerald-400 hover:bg-emerald-500/20"
            >
              🌕 $6,000 (+100%)
            </button>
          </div>
        </div>
      </div>

      {/* Resultados de la Simulación */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* usdJ (Stablecoin) */}
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">usdJ (Moneda Estable)</span>
            <ShieldAlert className="h-5 w-5 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            {mintedUsdJ.toLocaleString("en-US", { minimumFractionDigits: 2 })} <span className="text-xs font-normal text-emerald-400">usdJ</span>
          </div>
          <p className="text-xs text-white/60 mt-2">
            Equivale a <strong>${mintedUsdJ.toLocaleString()} USD</strong> en poder adquisitivo constante (0% volatilidad).
          </p>
          <div className="mt-4 pt-3 border-t border-emerald-500/20 text-[0.75rem] text-white/50">
            ETH Requerido para respaldarlo al precio actual: <strong className="text-white">{ethRequiredForStables.toFixed(4)} ETH</strong>
          </div>
        </div>

        {/* jETH (Volatile Token) */}
        <div className="rounded-2xl border border-indigo-500/30 bg-indigo-950/20 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">jETH (Apalancamiento)</span>
            <Activity className="h-5 w-5 text-indigo-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            {surplusETHForVolatile.toFixed(4)} <span className="text-xs font-normal text-indigo-400">ETH Retirable</span>
          </div>
          <p className="text-xs text-white/60 mt-2">
            Valor de tus jETH al precio actual: <strong>${currentEquityUSD.toLocaleString("en-US", { maximumFractionDigits: 0 })} USD</strong>
          </p>
          <div className="mt-4 pt-3 border-t border-indigo-500/20 text-[0.75rem] flex justify-between items-center">
            <span className="text-white/50">Rendimiento en jETH:</span>
            <span className={`font-bold font-mono ${roiPercentage >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {roiPercentage >= 0 ? `+${roiPercentage.toFixed(1)}%` : `${roiPercentage.toFixed(1)}%`}
            </span>
          </div>
        </div>

        {/* Indicador de Salud LTV */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-white/70">Estado de Salud de Bóveda</span>
              <DollarSign className="h-5 w-5 text-vault-cyan" />
            </div>
            <div className="text-2xl font-extrabold text-white font-mono">
              {currentLTV.toFixed(1)}% <span className="text-xs font-normal text-white/50">LTV Actual</span>
            </div>
          </div>

          <div className={`mt-4 rounded-xl border px-3 py-2 text-center text-xs font-bold ${healthColor}`}>
            {healthStatus}
          </div>
        </div>
      </div>

      {/* Explicación de Acciones Simuladas */}
      <div className="rounded-2xl border border-white/10 bg-black/40 p-5 text-xs leading-relaxed text-white/70">
        <h4 className="font-bold text-sm text-white mb-2 flex items-center gap-2">
          💡 Explicación de lo que sucedería si ejecutas las operaciones hoy a ${currentPrice.toLocaleString()} USD:
        </h4>
        <ul className="space-y-2 list-disc list-inside">
          <li>
            <strong>Si ejecutas "Canjear usdJ":</strong> Entregas tus {mintedUsdJ.toLocaleString()} usdJ y quemas tus jETH. La bóveda te devolverá tus {ethDeposit} ETH completos (valorados en ${(ethDeposit * currentPrice).toLocaleString()} USD).
          </li>
          <li>
            <strong>Si ejecutas "Canjear jETH":</strong> Conservas tus {mintedUsdJ.toLocaleString()} usdJ en tu billetera y retiras {surplusETHForVolatile.toFixed(4)} ETH en ganancias netas directo a tu saldo personal.
          </li>
        </ul>
      </div>
    </div>
  )
}
