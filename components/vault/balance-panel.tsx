"use client"

import { motion } from "framer-motion"
import { RefreshCw, Sparkles } from "lucide-react"
import type { Balances } from "@/hooks/use-vault"

type BalancePanelProps = {
  balances: Balances
  refreshing: boolean
  connected: boolean
  onRefresh: () => void
}

const ITEMS = [
  {
    key: "eth" as const,
    label: "ETH Colateral",
    symbol: "ETH",
    accent: "text-white font-mono drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]",
    border: "border-white/20 hover:border-white/40",
    glow: "from-white/10 to-transparent",
  },
  {
    key: "stable" as const,
    label: "Dyad Stable",
    symbol: "usdJ",
    accent: "text-emerald-400 font-mono drop-shadow-[0_0_20px_rgba(52,211,153,0.5)]",
    border: "border-emerald-500/30 hover:border-emerald-400/60",
    glow: "from-emerald-500/15 to-transparent",
  },
  {
    key: "volatile" as const,
    label: "Dyad Volatile",
    symbol: "jETH",
    accent: "text-amber-400 font-mono drop-shadow-[0_0_20px_rgba(245,158,11,0.5)]",
    border: "border-amber-500/30 hover:border-amber-400/60",
    glow: "from-amber-500/15 to-transparent",
  },
]

export function BalancePanel({ balances, refreshing, connected, onRefresh }: BalancePanelProps) {
  return (
    <section aria-label="Saldos de la bóveda">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-vault-cyan" />
          <h2 className="text-xs font-bold uppercase tracking-[0.3em] text-vault-cyan">
            Tu Posición en Bóveda
          </h2>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onRefresh}
          disabled={!connected || refreshing}
          className="flex items-center gap-1.5 rounded-full border border-vault-cyan/30 bg-black/60 px-4 py-1.5 text-xs font-bold text-vault-cyan transition-all hover:bg-vault-cyan/20 disabled:opacity-40"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} aria-hidden="true" />
          Actualizar Saldo
        </motion.button>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {ITEMS.map((item, idx) => (
          <motion.div
            key={item.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: idx * 0.1 }}
            whileHover={{ y: -4, scale: 1.02 }}
            className={`group relative overflow-hidden rounded-3xl border bg-black/70 p-6 backdrop-blur-xl transition-all duration-300 ${item.border}`}
          >
            <div
              className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${item.glow} opacity-0 transition-opacity group-hover:opacity-100`}
              aria-hidden="true"
            />
            <div className="relative flex flex-col items-center text-center">
              <span className="mb-3 text-[0.7rem] font-bold uppercase tracking-[0.25em] text-white/50">
                {item.label}
              </span>
              <motion.span
                key={connected ? balances[item.key] : "empty"}
                initial={{ scale: 0.9, opacity: 0.5 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 15 }}
                className={`text-4xl font-extrabold tabular-nums tracking-tight ${item.accent}`}
              >
                {connected ? balances[item.key] : "--"}
              </motion.span>
              <span className="mt-2 text-xs font-bold text-white/60 tracking-wider">{item.symbol}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
