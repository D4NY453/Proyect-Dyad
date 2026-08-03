"use client"

import { useState, type ReactNode } from "react"
import { motion } from "framer-motion"
import { Loader2 } from "lucide-react"

type Accent = "cyan" | "stable" | "indigo"

const ACCENT_MAP: Record<
  Accent,
  { bar: string; ring: string; focus: string; button: string; iconWrap: string; iconColor: string }
> = {
  cyan: {
    bar: "from-vault-cyan via-cyan-400 to-vault-indigo",
    ring: "hover:border-vault-cyan/50 hover:shadow-[0_0_30px_rgba(0,240,255,0.25)]",
    focus: "focus:border-vault-cyan focus:ring-vault-cyan/20",
    button:
      "bg-gradient-to-r from-vault-cyan to-cyan-400 text-black hover:shadow-[0_0_30px_rgba(0,240,255,0.6)] border border-vault-cyan/40",
    iconWrap: "bg-vault-cyan/10 ring-vault-cyan/30",
    iconColor: "text-vault-cyan",
  },
  stable: {
    bar: "from-vault-stable via-emerald-400 to-vault-cyan",
    ring: "hover:border-vault-stable/50 hover:shadow-[0_0_30px_rgba(52,211,153,0.25)]",
    focus: "focus:border-vault-stable focus:ring-vault-stable/20",
    button:
      "bg-gradient-to-r from-vault-stable to-emerald-400 text-black hover:shadow-[0_0_30px_rgba(52,211,153,0.6)] border border-vault-stable/40",
    iconWrap: "bg-vault-stable/10 ring-vault-stable/30",
    iconColor: "text-vault-stable",
  },
  indigo: {
    bar: "from-vault-indigo via-indigo-500 to-vault-cyan",
    ring: "hover:border-vault-indigo/50 hover:shadow-[0_0_30px_rgba(99,102,241,0.25)]",
    focus: "focus:border-vault-indigo focus:ring-vault-indigo/20",
    button:
      "bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400 text-black hover:shadow-[0_0_30px_rgba(245,158,11,0.6)] border border-amber-400/40",
    iconWrap: "bg-vault-indigo/10 ring-vault-indigo/30",
    iconColor: "text-amber-400",
  },
}

type ActionCardProps = {
  title: string
  description: string
  placeholder: string
  cta: string
  loadingLabel: string
  accent: Accent
  icon: ReactNode
  loading: boolean
  disabled: boolean
  maxValue: string
  maxSymbol: string
  onSubmit: (amount: string) => Promise<boolean | undefined> | void
}

export function ActionCard({
  title,
  description,
  placeholder,
  cta,
  loadingLabel,
  accent,
  icon,
  loading,
  disabled,
  maxValue,
  maxSymbol,
  onSubmit,
}: ActionCardProps) {
  const [value, setValue] = useState("")
  const styles = ACCENT_MAP[accent]

  const numericMax = Number(maxValue)
  const hasBalance = Number.isFinite(numericMax) && numericMax > 0

  const handleSubmit = async () => {
    const ok = await onSubmit(value)
    if (ok) setValue("")
  }

  const handleMax = () => {
    if (hasBalance) setValue(maxValue)
  }

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={`group relative flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-black/60 p-6 backdrop-blur-xl transition-all duration-300 ${styles.ring}`}
    >
      <div
        className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${styles.bar} opacity-60 transition-opacity group-hover:opacity-100`}
        aria-hidden="true"
      />

      <div className="mb-4 flex items-center gap-3">
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ring-1 ${styles.iconWrap}`}>
          <span className={styles.iconColor}>{icon}</span>
        </div>
        <h3 className="text-xl font-bold tracking-tight text-white">{title}</h3>
      </div>

      <p className="mb-6 text-xs leading-relaxed text-white/60">{description}</p>

      <div className="mt-auto flex flex-col gap-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-white/40 uppercase tracking-wider font-semibold text-[0.7rem]">Disponible</span>
          <span className="font-mono font-bold text-white/80">
            {hasBalance ? numericMax.toLocaleString("en-US", { maximumFractionDigits: 6 }) : "0"}{" "}
            <span className={styles.iconColor}>{maxSymbol}</span>
          </span>
        </div>

        <div className="relative">
          <input
            type="number"
            inputMode="decimal"
            min="0"
            placeholder={placeholder}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={disabled || loading}
            className={`w-full rounded-2xl border border-white/15 bg-black/70 px-4 py-3.5 pr-16 font-mono text-sm font-bold text-white outline-none ring-0 transition-all placeholder:text-white/20 focus:ring-2 disabled:opacity-50 ${styles.focus}`}
          />
          <motion.button
            type="button"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleMax}
            disabled={disabled || loading || !hasBalance}
            className={`absolute right-2 top-1/2 -translate-y-1/2 rounded-xl px-3 py-1.5 text-[0.68rem] font-bold uppercase tracking-wider transition-all disabled:cursor-not-allowed disabled:opacity-30 ${styles.iconWrap} ${styles.iconColor} ring-1 hover:brightness-125`}
          >
            Max
          </motion.button>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.96 }}
          onClick={handleSubmit}
          disabled={disabled || loading}
          className={`flex items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-extrabold uppercase tracking-wider transition-all disabled:cursor-not-allowed disabled:opacity-50 ${styles.button}`}
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {loading ? loadingLabel : cta}
        </motion.button>
      </div>
    </motion.div>
  )
}
