"use client"

import { useState } from "react"
import { ShieldCheck, Eye, EyeOff, Lock, Cpu, Sparkles, CheckCircle2, ArrowRight, Info, AlertTriangle } from "lucide-react"
import { generateShieldProof, depositShieldedAztecL2, type ShieldProof, type AztecShieldedNote } from "@/lib/aztec-shield"
import type { Balances } from "@/hooks/use-vault"

export function ShieldPanel({ account, balances }: { account: string; balances?: Balances }) {
  const [isHumanVerifiedMode, setIsHumanVerifiedMode] = useState<boolean>(true)
  const [loadingProof, setLoadingProof] = useState(false)
  const [proof, setProof] = useState<ShieldProof | null>(null)
  const [ethAmount, setEthAmount] = useState(balances?.eth && parseFloat(balances.eth) > 0 ? balances.eth : "0.01")
  const [depositing, setDepositing] = useState(false)
  const [shieldedNote, setShieldedNote] = useState<AztecShieldedNote | null>(null)
  const [showPrivateValues, setShowPrivateValues] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const maxEthAvailable = parseFloat(balances?.eth || "0")

  const handleGenerateProof = async () => {
    setErrorMessage(null)
    setSuccessMessage(null)
    
    if (!isHumanVerifiedMode) {
      setErrorMessage("❌ Acceso Denegado: La prueba de Shield (human.tech) detectó un bot/dirección no verificada. No se permite continuar.")
      setProof(null)
      return
    }

    setLoadingProof(true)
    try {
      const generated = await generateShieldProof(account || "0x0000000000000000000000000000000000000000")
      setProof(generated)
      setSuccessMessage("✅ Prueba ZK de Cumplimiento e Identidad Generada con Éxito por Shield SDK.")
    } catch (err: any) {
      setErrorMessage("Error al generar la prueba ZK: " + err.message)
    } finally {
      setLoadingProof(false)
    }
  }

  const handleDepositAztec = async () => {
    setErrorMessage(null)
    setSuccessMessage(null)

    const amountNum = parseFloat(ethAmount || "0")

    if (amountNum <= 0) {
      setErrorMessage("❌ Ingresa un monto de ETH válido.")
      return
    }

    if (maxEthAvailable > 0 && amountNum > maxEthAvailable) {
      setErrorMessage(`❌ Saldo Insuficiente: Tu balance real es de ${maxEthAvailable} ETH. No puedes depositar ${amountNum} ETH.`)
      return
    }

    if (!proof || !proof.cleanCompliancePassed) {
      setErrorMessage("❌ Operación Bloqueada: Se requiere una prueba ZK válida de Shield para emitir notas privadas.")
      return
    }

    setDepositing(true)
    try {
      const res = await depositShieldedAztecL2(account || "0x0000000000000000000000000000000000000000", ethAmount, proof)
      setShieldedNote(res.note)
      setSuccessMessage(`🔒 ¡Éxito! Se ha emitido la Nota Privada de ${ethAmount} ETH en el Shielded Pool de Aztec L2. Tx: ${res.txHash.slice(0, 16)}...`)
    } catch (err: any) {
      setErrorMessage("Error al ejecutar depósito privado: " + err.message)
    } finally {
      setDepositing(false)
    }
  }

  return (
    <div className="w-full rounded-3xl border border-vault-cyan/30 bg-gradient-to-b from-black/90 via-zinc-950/80 to-black/90 p-6 md:p-8 backdrop-blur-2xl shadow-[0_0_60px_rgba(0,240,255,0.15)]">
      {/* Banner de Cabecera */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 text-vault-cyan font-mono text-xs uppercase tracking-widest mb-1">
            <Lock className="h-4 w-4" /> Aztec Layer 2 + Shield Infrastructure (human.tech)
          </div>
          <h3 className="text-2xl font-bold text-white">Bóveda Privada ZK (Clean Privacy SDK)</h3>
          <p className="text-sm text-white/50 mt-1">
            Módulo de privacidad Zero-Knowledge. Transfiere tu saldo real de ETH al estado privado cifrado sin exponer tu dirección pública ni montos.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="rounded-full border border-vault-cyan/40 bg-vault-cyan/10 px-3.5 py-1.5 text-xs font-bold text-vault-cyan flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" /> Aztec L2 Protected State
          </span>
        </div>
      </div>

      {/* Control Interactivo de Prueba de Identidad */}
      <div className="my-6 rounded-2xl border border-white/10 bg-white/5 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Info className="h-5 w-5 text-vault-cyan shrink-0" />
          <span className="text-xs text-white/80">
            <strong>Simulador de Estado de Identidad:</strong> Selecciona si deseas probar como un usuario legítimo o no verificado.
          </span>
        </div>
        <div className="flex items-center gap-2 bg-black/60 p-1.5 rounded-xl border border-white/10 shrink-0">
          <button
            onClick={() => {
              setIsHumanVerifiedMode(true)
              setProof(null)
              setErrorMessage(null)
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              isHumanVerifiedMode
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                : "text-white/40 hover:text-white"
            }`}
          >
            🟢 Humano Verificado
          </button>
          <button
            onClick={() => {
              setIsHumanVerifiedMode(false)
              setProof(null)
              setErrorMessage(null)
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              !isHumanVerifiedMode
                ? "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                : "text-white/40 hover:text-white"
            }`}
          >
            🔴 No Verificado / Bot
          </button>
        </div>
      </div>

      {/* Notificaciones de Alerta */}
      {errorMessage && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-xs font-medium text-rose-300">
          <AlertTriangle className="h-5 w-5 shrink-0 text-rose-400" />
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-xs font-medium text-emerald-300">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
          {successMessage}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 my-6">
        {/* Paso 1: Verificación de Privacidad con Shield Clean SDK */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-vault-cyan flex items-center gap-2">
                <Cpu className="h-4 w-4" /> 1. Generar Prueba ZK de Cumplimiento (Shield SDK)
              </span>
              {proof?.cleanCompliancePassed && (
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" /> Verificado
                </span>
              )}
            </div>
            <p className="text-xs text-white/60 leading-relaxed mb-6">
              El Clean SDK de Shield (human.tech) verifica que la transacción proviene de un humano legítimo sin revelar su identidad en la blockchain.
            </p>

            {proof && (
              <div className="space-y-2 rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-4 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-white/40">Proof ID:</span>
                  <span className="text-emerald-300 font-bold truncate max-w-[180px]">{proof.proofId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40">Human Verified:</span>
                  <span className="text-emerald-400 font-bold">Sí (Proof of Humanity)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40">Nullifier:</span>
                  <span className="text-white/80 truncate max-w-[180px]">{proof.nullifierHash}</span>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleGenerateProof}
            disabled={loadingProof}
            className="mt-6 w-full rounded-xl border border-vault-cyan/50 bg-vault-cyan/20 px-4 py-3 text-sm font-bold text-vault-cyan hover:bg-vault-cyan/30 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {loadingProof ? "Generando Prueba ZK en Shield..." : proof ? "Regenerar Prueba Shield" : "Generar Prueba Clean SDK"}
          </button>
        </div>

        {/* Paso 2: Depósito Privado a Aztec L2 */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" /> 2. Depositar en Bóveda Privada Aztec L2
              </span>
            </div>
            <p className="text-xs text-white/60 leading-relaxed mb-4">
              Transfiere una cantidad de tu saldo de ETH al Estado Privado de Aztec Layer 2.
            </p>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[0.7rem] font-bold uppercase text-white/50">Monto a Depositar (ETH)</label>
                  {maxEthAvailable > 0 && (
                    <button
                      type="button"
                      onClick={() => setEthAmount(maxEthAvailable.toString())}
                      className="text-[0.65rem] font-bold text-vault-cyan hover:underline"
                    >
                      MÁX: {maxEthAvailable} ETH
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  step="0.001"
                  max={maxEthAvailable > 0 ? maxEthAvailable : undefined}
                  value={ethAmount}
                  onChange={(e) => setEthAmount(e.target.value)}
                  className="w-full bg-black/60 border border-white/20 rounded-xl px-4 py-2 text-sm font-bold text-white focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div className="rounded-xl border border-white/10 bg-black/40 p-3 text-xs space-y-1">
                <div className="flex justify-between text-white/50">
                  <span>`usdJ` Privado a emitir (75% LTV):</span>
                  <span className="text-emerald-400 font-bold">{(parseFloat(ethAmount || "0") * 3000 * 0.75).toFixed(2)} usdJ</span>
                </div>
                <div className="flex justify-between text-white/50">
                  <span>`jETH` Privado a emitir:</span>
                  <span className="text-indigo-400 font-bold">{parseFloat(ethAmount || "0").toFixed(4)} jETH</span>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleDepositAztec}
            disabled={!proof || depositing}
            className="mt-6 w-full rounded-xl border border-emerald-500/50 bg-emerald-500/20 px-4 py-3 text-sm font-bold text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-40 transition-all flex items-center justify-center gap-2"
          >
            {depositing ? "Emitiendo Nota Privada..." : "Ejecutar Depósito Privado en Aztec"} <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Visualización de Notas Privadas Aztec L2 */}
      {shieldedNote && (
        <div className="mt-8 rounded-2xl border border-emerald-500/30 bg-emerald-950/30 p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
              <Lock className="h-4 w-4" /> Tus Notas Privadas en Aztec L2 (Shielded State)
            </h4>
            <button
              onClick={() => setShowPrivateValues(!showPrivateValues)}
              className="flex items-center gap-1.5 text-xs font-bold text-white/70 hover:text-white"
            >
              {showPrivateValues ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showPrivateValues ? "Ocultar Valores" : "Revelar Valores"}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs mb-4">
            <div className="rounded-xl border border-white/10 bg-black/50 p-4">
              <span className="text-white/40 block text-[0.7rem] uppercase mb-1">`usdJ` Privado</span>
              <span className="text-lg font-bold text-emerald-400">
                {showPrivateValues ? `${shieldedNote.usdjAmountPrivate} usdJ` : "••••••••"}
              </span>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/50 p-4">
              <span className="text-white/40 block text-[0.7rem] uppercase mb-1">`jETH` Privado</span>
              <span className="text-lg font-bold text-indigo-400">
                {showPrivateValues ? `${shieldedNote.jEthAmountPrivate} jETH` : "••••••••"}
              </span>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/50 p-4">
              <span className="text-white/40 block text-[0.7rem] uppercase mb-1">Commitment Hash</span>
              <span className="text-xs font-bold text-white/80 truncate block">{shieldedNote.commitmentHash}</span>
            </div>
          </div>

          <p className="text-[0.75rem] text-white/50 leading-relaxed">
            ℹ️ <strong>¿Por qué no cambia tu balance público superior?</strong> Las notas emitidas en Aztec L2 son **Zero-Knowledge (Estado Privado)**. En la blockchain pública (L1) tu saldo no es visible para nadie; solo tú puedes ver y gastar estas notas cifradas en tu billetera privada.
          </p>
        </div>
      )}
    </div>
  )
}
