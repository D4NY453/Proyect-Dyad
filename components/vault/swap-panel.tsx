"use client"

import { useState, useEffect } from "react"
import { ArrowDown, ShieldCheck, AlertCircle, CheckCircle2, PlusCircle } from "lucide-react"
import { ethers } from "ethers"
import { VAULT_CONTRACT_ADDRESS, VAULT_ABI } from "@/lib/vault"

type Balances = {
  eth: string
  stable: string
  volatile?: string
  usdc?: string
}

export function SwapPanel({ balances, onRefresh }: { balances: Balances; onRefresh: () => void }) {
  const [payAmount, setPayAmount] = useState("")
  const [isSwapping, setIsSwapping] = useState(false)
  const [oraclePrice, setOraclePrice] = useState<number>(3000)
  const [statusMsg, setStatusMsg] = useState<{ type: "error" | "success" | "warning"; text: string } | null>(null)

  const volatileBalNum = Number(balances.volatile || "0")
  const totalUsdjAvailable = balances.stable || "0.0"

  // Consultar el precio real del Oráculo de Sepolia para sincronizar los cálculos al 100%
  useEffect(() => {
    const fetchOraclePrice = async () => {
      if (typeof window !== "undefined" && (window as any).ethereum) {
        try {
          const provider = new ethers.BrowserProvider((window as any).ethereum)
          const vaultContract = new ethers.Contract(VAULT_CONTRACT_ADDRESS, VAULT_ABI, provider)
          const pWei = await vaultContract.getLatestPrice()
          const pNum = Number(ethers.formatUnits(pWei, 18))
          if (pNum > 0) setOraclePrice(pNum)
        } catch (e) {
          // Fallback
        }
      }
    }
    fetchOraclePrice()
  }, [])

  // Cobertura máxima real en USD respaldada por el jETH del usuario
  const maxVaultRedeemUsdJ = (volatileBalNum * oraclePrice).toFixed(2)

  const estimatedReceive =
    payAmount && !isNaN(Number(payAmount)) && Number(payAmount) > 0
      ? (Number(payAmount) / oraclePrice).toFixed(6)
      : "0.0"

  // Auto-deposita ETH exacto aplicando el multiplicador 4x (por acuñación de 75% LTV) y canjea el 100% a 0.00 usdJ
  const handleDepositExtraEthAndRedeem = async (targetUsdj: string) => {
    if (!(window as any).ethereum) return
    setIsSwapping(true)

    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum)
      const signer = await provider.getSigner()
      const userAddress = await signer.getAddress()
      const vaultContract = new ethers.Contract(VAULT_CONTRACT_ADDRESS, VAULT_ABI, signer)

      const volatileTokenAddress = await vaultContract.volatileToken()
      const erc20Abi = ["function balanceOf(address) external view returns (uint256)"]
      const volatileContract = new ethers.Contract(volatileTokenAddress, erc20Abi, provider)

      const vEthBalanceWei: bigint = BigInt(await volatileContract.balanceOf(userAddress))
      const currentPriceWei: bigint = BigInt(await vaultContract.getLatestPrice())

      const targetUsdjWei = ethers.parseUnits(targetUsdj, 18)
      const currentVethUsdCoverageWei = (vEthBalanceWei * currentPriceWei) / (10n ** 18n)

      let ethToDepositWei = 0n
      if (targetUsdjWei > currentVethUsdCoverageWei) {
        const usdJDeficitWei = targetUsdjWei - currentVethUsdCoverageWei
        const vEthDeficitWei = (usdJDeficitWei * (10n ** 18n)) / currentPriceWei
        ethToDepositWei = (vEthDeficitWei * 4n) + ethers.parseEther("0.005")
      } else {
        ethToDepositWei = ethers.parseEther("0.005")
      }

      const ethNeededStr = ethers.formatEther(ethToDepositWei)

      setStatusMsg({
        type: "success",
        text: `🦊 Paso 1/2: Abriendo MetaMask para depositar ${ethNeededStr} ETH y completar tu cobertura...`,
      })

      // 1. Depositar ETH
      const depositTx = await vaultContract.deposit({ value: ethToDepositWei })
      setStatusMsg({ type: "success", text: `🚀 Paso 1/2 Confirmado. Depositados ${ethNeededStr} ETH. Consultando saldo final...` })
      await depositTx.wait(1)

      // 2. Consultar el saldo total real actualizado de usdJ de la billetera
      const stableTokenAddress = await vaultContract.stableToken()
      const stableContract = new ethers.Contract(stableTokenAddress, erc20Abi, provider)
      const totalUsdjBalanceWei = await stableContract.balanceOf(userAddress)

      setStatusMsg({
        type: "success",
        text: `🦊 Paso 2/2: Abriendo MetaMask para canjear el 100% de tus usdJ (${ethers.formatUnits(totalUsdjBalanceWei, 18)} usdJ)...`,
      })

      // 3. Canjear TODO el saldo de usdJ para dejar 0.00 usdJ residuales
      const redeemTx = await vaultContract.redeemStable(totalUsdjBalanceWei)
      await redeemTx.wait(1)

      const totalRedeemedUsdjStr = ethers.formatUnits(totalUsdjBalanceWei, 18)
      const receiveEst = (Number(totalRedeemedUsdjStr) / oraclePrice).toFixed(6)

      setStatusMsg({
        type: "success",
        text: `✅ ¡Operación Completa y Liquidada a 0.00 usdJ! Se quemaron ${totalRedeemedUsdjStr} usdJ totales y recibiste ~${receiveEst} Sepolia ETH directamente en tu MetaMask.`,
      })
      setPayAmount("")
      onRefresh()
    } catch (err: any) {
      console.error(err)
      setStatusMsg({ type: "error", text: "Error en la operación: " + (err?.reason || err?.message || "Rechazado en MetaMask") })
    } finally {
      setIsSwapping(false)
    }
  }

  // Ejecuta Canje Directo en Sepolia de forma fluida y con doble cota de seguridad (usdJ balance + vETH coverage)
  const executeRedeemOnSepolia = async (targetUsdjAmount: string) => {
    setStatusMsg(null)
    if (!(window as any).ethereum) return setStatusMsg({ type: "error", text: "MetaMask no detectado." })

    setIsSwapping(true)
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum)
      const signer = await provider.getSigner()
      const userAddress = await signer.getAddress()
      const vaultContract = new ethers.Contract(VAULT_CONTRACT_ADDRESS, VAULT_ABI, signer)

      const stableTokenAddress = await vaultContract.stableToken()
      const volatileTokenAddress = await vaultContract.volatileToken()
      const erc20Abi = ["function balanceOf(address) external view returns (uint256)"]

      const stableContract = new ethers.Contract(stableTokenAddress, erc20Abi, provider)
      const volatileContract = new ethers.Contract(volatileTokenAddress, erc20Abi, provider)

      const [userStableBalWei, vEthBalanceWei, currentPriceWei] = await Promise.all([
        stableContract.balanceOf(userAddress),
        volatileContract.balanceOf(userAddress),
        vaultContract.getLatestPrice(),
      ])

      // Si no hay saldo de vETH en absoluto, invocar el auto-depósito directamente
      if (vEthBalanceWei === 0n) {
        setIsSwapping(false)
        return await handleDepositExtraEthAndRedeem(targetUsdjAmount)
      }

      // Máximo usdJ respaldado por vETH con margen de seguridad estricto
      let maxCoveredUsdjWei = (BigInt(vEthBalanceWei) * BigInt(currentPriceWei)) / (10n ** 18n)
      
      // Margen de seguridad de 0.000001 usdJ
      if (maxCoveredUsdjWei > 1000000000000n) {
        maxCoveredUsdjWei = maxCoveredUsdjWei - 1000000000000n
      }

      let requestedUsdjWei = ethers.parseUnits(targetUsdjAmount, 18)

      // Cota 1: NUNCA solicitar más usdJ del que el usuario realmente posee en la blockchain en wei (evita redondeos hacia arriba de toFixed(2))
      if (requestedUsdjWei > userStableBalWei) {
        requestedUsdjWei = userStableBalWei
      }

      // Cota 2: NUNCA solicitar más usdJ del que su saldo de jETH alcanza a respaldar
      if (requestedUsdjWei > maxCoveredUsdjWei) {
        requestedUsdjWei = maxCoveredUsdjWei
      }

      if (requestedUsdjWei <= 0n) {
        throw new Error("No tienes usdJ o jETH disponible en Sepolia para realizar este canje.")
      }

      const formattedUsdjToRedeem = ethers.formatUnits(requestedUsdjWei, 18)
      setStatusMsg({
        type: "success",
        text: `🦊 Abriendo MetaMask para firmar el canje directo de ${formattedUsdjToRedeem} usdJ...`,
      })

      const tx = await vaultContract.redeemStable(requestedUsdjWei)
      setStatusMsg({ type: "success", text: `🚀 Transacción enviada a Sepolia (Tx: ${tx.hash.slice(0, 14)}...). Confirmando...` })
      await tx.wait(1)

      const receiveEst = (Number(formattedUsdjToRedeem) / oraclePrice).toFixed(6)
      setStatusMsg({
        type: "success",
        text: `✅ ¡Canje Exitoso en Sepolia! Se quemaron ${formattedUsdjToRedeem} usdJ y recibiste ~${receiveEst} Sepolia ETH directamente en tu MetaMask.`,
      })

      setPayAmount("")
      onRefresh()
    } catch (error: any) {
      console.error(error)
      const msg = error?.reason || error?.message || "Transacción rechazada por el usuario."
      setStatusMsg({ type: "error", text: "Error en el canje: " + msg })
    } finally {
      setIsSwapping(false)
    }
  }

  const handleSwap = async () => {
    setStatusMsg(null)
    if (!payAmount || isNaN(Number(payAmount)) || Number(payAmount) <= 0) return

    const payNum = Number(payAmount)
    if (payNum > Number(totalUsdjAvailable)) {
      return setStatusMsg({ type: "error", text: `Saldo Insuficiente: Tu balance real es de ${totalUsdjAvailable} usdJ.` })
    }

    // Ejecutar la transacción de canje directamente en Sepolia sin bloqueos molestos
    await executeRedeemOnSepolia(payAmount)
  }

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-md mx-auto">
      <div className="w-full bg-[#131313] rounded-[24px] border border-white/10 p-4 shadow-2xl overflow-hidden relative">
        {/* Header de Canje On-Chain */}
        <div className="flex items-center justify-between px-2 py-2 mb-3 bg-[#1C1C1C] rounded-2xl p-2 border border-white/5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
            <span className="font-bold text-white/90 text-sm">Canje On-Chain en Sepolia</span>
          </div>
          <span className="text-[0.68rem] font-bold text-vault-cyan bg-vault-cyan/10 border border-vault-cyan/30 px-2.5 py-1 rounded-full">
            Contrato VaultV2
          </span>
        </div>

        {/* Banner Informativo de Cobertura */}
        <div className="mb-3 px-3 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[0.72rem] text-emerald-300 leading-relaxed">
          <div className="font-bold flex items-center justify-between mb-0.5">
            <span>Balance Total usdJ: {totalUsdjAvailable}</span>
            <span className="text-white/70 font-mono text-[0.68rem]">
              (Cobertura jETH: {maxVaultRedeemUsdJ} usdJ)
            </span>
          </div>
        </div>

        {/* Notificación de Estado & Opciones de Acción */}
        {statusMsg && (
          <div
            className={`mb-3 p-3 rounded-xl border text-xs font-medium leading-relaxed ${
              statusMsg.type === "error"
                ? "bg-rose-500/10 border-rose-500/40 text-rose-300"
                : statusMsg.type === "warning"
                ? "bg-amber-500/10 border-amber-500/40 text-amber-300"
                : "bg-emerald-500/10 border-emerald-500/40 text-emerald-300"
            }`}
          >
            <div className="flex items-start gap-2 mb-2">
              {statusMsg.type === "error" ? (
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
              ) : statusMsg.type === "warning" ? (
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
              ) : (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
              )}
              <span>{statusMsg.text}</span>
            </div>
          </div>
        )}

        {/* Opción opcional para liquidar el 100% a cero si supera la cobertura */}
        {Number(payAmount) > Number(maxVaultRedeemUsdJ) && Number(totalUsdjAvailable) > 0 && (
          <div className="mb-3 p-3 rounded-xl bg-vault-cyan/10 border border-vault-cyan/30 text-xs flex flex-col gap-2">
            <div className="flex items-center gap-2 text-vault-cyan font-bold">
              <PlusCircle className="h-4 w-4" />
              <span>¿Quieres liquidar el 100% (${totalUsdjAvailable} usdJ) a 0.00?</span>
            </div>
            <p className="text-[0.7rem] text-white/70">
              Al hacer clic abajo, se auto-depositará la pequeña diferencia de ETH necesaria y se canjeará el 100% de tus usdJ.
            </p>
            <button
              type="button"
              onClick={() => handleDepositExtraEthAndRedeem(payAmount || totalUsdjAvailable)}
              className="w-full py-2 px-3 rounded-xl bg-vault-cyan/20 text-vault-cyan hover:bg-vault-cyan/30 text-xs font-bold transition-all text-left flex items-center justify-between font-mono"
            >
              <span>Auto-depositar y canjear el 100% (0.00 usdJ residuales)</span>
              <span className="text-[0.65rem] text-vault-cyan font-mono">🦊 Firmar en MetaMask</span>
            </button>
          </div>
        )}

        {/* Sección de Pago */}
        <div className="bg-[#1C1C1C] rounded-[20px] p-4 relative border border-white/5">
          <div className="flex justify-between mb-2 text-xs">
            <span className="font-medium text-white/50">Tú pagas</span>
            <div className="flex items-center gap-1 font-mono text-white/70">
              <span>Balance: {totalUsdjAvailable} usdJ</span>
              {Number(totalUsdjAvailable) > 0 && (
                <button
                  type="button"
                  onClick={() => setPayAmount(totalUsdjAvailable)}
                  className="ml-1 text-[0.65rem] font-bold text-emerald-400 hover:underline"
                >
                  MÁX
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between gap-4">
            <input
              type="number"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              placeholder="0.0"
              className="bg-transparent text-3xl font-bold outline-none w-full text-white placeholder:text-white/20"
            />
            <div className="flex items-center gap-2 bg-[#2C2C2C] rounded-full px-3.5 py-1.5 shrink-0">
              <span className="font-bold text-sm text-vault-cyan">usdJ</span>
            </div>
          </div>
        </div>

        {/* Botón de Dirección */}
        <div className="relative h-[#10px] w-full flex items-center justify-center z-10 my-1">
          <div className="bg-[#2C2C2C] border-2 border-[#131313] p-1.5 rounded-xl">
            <ArrowDown className="h-4 w-4 text-emerald-400" />
          </div>
        </div>

        {/* Sección de Recepción */}
        <div className="bg-[#1C1C1C] rounded-[20px] p-4 relative border border-white/5">
          <div className="flex justify-between mb-2 text-xs">
            <span className="font-medium text-white/50">Tú recibes (Sepolia ETH)</span>
            <span className="font-mono text-white/50">Balance: {balances.eth} ETH</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <input
              type="text"
              value={estimatedReceive}
              readOnly
              placeholder="0.0"
              className="bg-transparent text-3xl font-bold outline-none w-full text-emerald-400 placeholder:text-white/20 font-mono"
            />
            <div className="flex items-center gap-2 bg-[#2C2C2C] rounded-full px-3.5 py-1.5 shrink-0">
              <span className="font-bold text-sm text-white">ETH</span>
            </div>
          </div>
        </div>

        {/* Botón de Acción con MetaMask */}
        <button
          onClick={handleSwap}
          disabled={!payAmount || isSwapping}
          className={`w-full mt-4 py-3.5 rounded-[16px] font-bold text-sm transition-all ${
            !payAmount
              ? "bg-[#2C2C2C] text-white/30 cursor-not-allowed"
              : isSwapping
              ? "bg-emerald-500/50 text-black cursor-wait"
              : "bg-emerald-400 text-black hover:scale-[1.01] active:scale-[0.99] shadow-[0_0_20px_rgba(52,211,153,0.25)]"
          }`}
        >
          {isSwapping ? "Procesando..." : !payAmount ? "Ingresa un monto" : "Ejecutar Canje en Sepolia 🦊"}
        </button>
      </div>
    </div>
  )
}
