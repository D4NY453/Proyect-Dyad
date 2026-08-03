"use client"

import { useState, useEffect, useCallback } from "react"
import { ethers } from "ethers"
import { VAULT_CONTRACT_ADDRESS, VAULT_ABI, SEPOLIA_CHAIN_ID } from "@/lib/vault"

export type Balances = {
  eth: string
  stable: string
  volatile: string
  points: string
  usdc: string
  link: string
  volatileEthVal?: string
}

export type Toast = {
  id: number
  type: "success" | "error" | "info"
  message: string
}

const ERC20_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
  "function totalSupply() external view returns (uint256)",
  "function approve(address spender, uint256 amount) external returns (bool)",
]

export function useVault() {
  const [account, setAccount] = useState<string>("")
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null)
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null)
  const [chainId, setChainId] = useState<number | null>(null)
  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [balances, setBalances] = useState<Balances>({
    eth: "0",
    stable: "0",
    volatile: "0",
    points: "0",
    usdc: "0",
    link: "0",
  })
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [refreshing, setRefreshing] = useState(false)

  const wrongNetwork = connected && chainId !== null && Number(chainId) !== Number(SEPOLIA_CHAIN_ID)

  const addToast = (type: "success" | "error" | "info", message: string) => {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, type, message }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 5000)
  }

  const dismissToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  const connectWallet = useCallback(async () => {
    if (typeof window === "undefined" || !(window as any).ethereum) {
      alert("Por favor instala MetaMask para usar esta dApp.")
      return
    }

    setConnecting(true)
    try {
      const browserProvider = new ethers.BrowserProvider((window as any).ethereum)
      const accounts = await browserProvider.send("eth_requestAccounts", [])
      if (!accounts || accounts.length === 0) return

      const network = await browserProvider.getNetwork()
      const rpcSigner = await browserProvider.getSigner()

      setProvider(browserProvider)
      setSigner(rpcSigner)
      setAccount(accounts[0])
      setChainId(Number(network.chainId))
      setConnected(true)
      addToast("success", `Billetera conectada: ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`)
    } catch (err: any) {
      console.error("Error al conectar MetaMask:", err)
      addToast("error", "No se pudo conectar MetaMask: " + (err?.message || ""))
    } finally {
      setConnecting(false)
    }
  }, [])

  const disconnectWallet = useCallback(() => {
    setConnected(false)
    setProvider(null)
    setSigner(null)
    setAccount("")
    setBalances({ eth: "0", stable: "0", volatile: "0", points: "0", usdc: "0", link: "0" })
    addToast("info", "Billetera desconectada.")
  }, [])

  const loadBalances = useCallback(async () => {
    if (!signer || !account || !provider) return
    setRefreshing(true)

    try {
      const vault = new ethers.Contract(VAULT_CONTRACT_ADDRESS, VAULT_ABI, signer)

      // Cargar direcciones con fallback seguro
      const [stableAddress, volatileAddress, ethBal] = await Promise.all([
        vault.stableToken().catch(() => "0x2C5d4A0f3379DCFe7deF7D6CFEc9C8EdDBAE5F18"),
        vault.volatileToken().catch(() => "0x6305Cdca94Bc8F58f50c9615E4DD1D57473951b1"),
        provider.getBalance(account).catch(() => 0n),
      ])

      const stable = new ethers.Contract(stableAddress, ERC20_ABI, signer)
      const volatile = new ethers.Contract(volatileAddress, ERC20_ABI, signer)
      const usdc = new ethers.Contract("0x32c994115a670C9b98e0f889337805038C6cFc4A", ERC20_ABI, signer)
      const link = new ethers.Contract("0x779877A7B0D9E8603169DdbD7836e478b4624789", ERC20_ABI, signer)

      const [stableBal, volatileBal, usdcBal, linkBal, currentPrice, totalStableSupply, totalVolatileSupply] = await Promise.all([
        stable.balanceOf(account).catch(() => 0n),
        volatile.balanceOf(account).catch(() => 0n),
        usdc.balanceOf(account).catch(() => 0n),
        link.balanceOf(account).catch(() => 0n),
        vault.getLatestPrice().catch(() => BigInt(3000e18)),
        stable.totalSupply().catch(() => 0n),
        volatile.totalSupply().catch(() => 0n),
      ])

      let volatileEthValue = 0n
      if (totalVolatileSupply > 0n) {
        volatileEthValue = (volatileBal * 1042n) / 1000n
      }

      setBalances({
        eth: parseFloat(ethers.formatEther(ethBal)).toFixed(4),
        stable: parseFloat(ethers.formatUnits(stableBal, 18)).toFixed(2),
        volatile: parseFloat(ethers.formatUnits(volatileBal, 18)).toFixed(4),
        volatileEthVal: parseFloat(ethers.formatEther(volatileEthValue)).toFixed(4),
        points: "0",
        usdc: parseFloat(ethers.formatUnits(usdcBal, 6)).toFixed(2),
        link: parseFloat(ethers.formatUnits(linkBal, 18)).toFixed(2),
      })
    } catch (err) {
      console.error("Error al cargar saldos:", err)
    } finally {
      setRefreshing(false)
    }
  }, [signer, account, provider])

  useEffect(() => {
    if (connected && signer && account) {
      loadBalances()
    }
  }, [connected, signer, account, loadBalances])

  useEffect(() => {
    if (typeof window === "undefined" || !(window as any).ethereum) return
    const ethereum = (window as any).ethereum

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnectWallet()
      } else {
        setAccount(accounts[0])
      }
    }

    const handleChainChanged = (hexChainId: string) => {
      setChainId(parseInt(hexChainId, 16))
    }

    ethereum.on("accountsChanged", handleAccountsChanged)
    ethereum.on("chainChanged", handleChainChanged)

    return () => {
      ethereum.removeListener("accountsChanged", handleAccountsChanged)
      ethereum.removeListener("chainChanged", handleChainChanged)
    }
  }, [disconnectWallet])

  const switchToSepolia = async () => {
    if (!(window as any).ethereum) return
    try {
      await (window as any).ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0xaa36a7" }],
      })
    } catch (err: any) {
      console.error("Error al cambiar a Sepolia:", err)
    }
  }

  const deposit = async (amountEth: string) => {
    if (!signer || !amountEth || Number(amountEth) <= 0) return false
    setLoading((prev) => ({ ...prev, deposit: true }))
    try {
      const vault = new ethers.Contract(VAULT_CONTRACT_ADDRESS, VAULT_ABI, signer)
      const tx = await vault.deposit({ value: ethers.parseEther(amountEth) })
      addToast("info", `Enviando depósito de ${amountEth} ETH a la bóveda...`)
      await tx.wait(1)
      addToast("success", `¡Depósito Exitoso! Depositados ${amountEth} ETH.`)
      await loadBalances()
      return true
    } catch (err: any) {
      console.error("Error al depositar ETH:", err)
      addToast("error", "Error al depositar ETH: " + (err?.reason || err?.message || "Rechazado"))
      return false
    } finally {
      setLoading((prev) => ({ ...prev, deposit: false }))
    }
  }

  const redeemStable = async (amountUsdJ: string) => {
    if (!signer || !amountUsdJ || Number(amountUsdJ) <= 0) return false
    setLoading((prev) => ({ ...prev, redeemStable: true }))
    try {
      const vault = new ethers.Contract(VAULT_CONTRACT_ADDRESS, VAULT_ABI, signer)
      const tx = await vault.redeemStable(ethers.parseUnits(amountUsdJ, 18))
      addToast("info", `Enviando solicitud de canje de ${amountUsdJ} usdJ...`)
      await tx.wait(1)
      addToast("success", `¡Canje Exitoso! Canjeados ${amountUsdJ} usdJ por Sepolia ETH.`)
      await loadBalances()
      return true
    } catch (err: any) {
      console.error("Error al canjear usdJ:", err)
      addToast("error", "Error al canjear usdJ: " + (err?.reason || err?.message || "Rechazado"))
      return false
    } finally {
      setLoading((prev) => ({ ...prev, redeemStable: false }))
    }
  }

  const redeemVolatile = async (amountJEth: string) => {
    if (!signer || !amountJEth || Number(amountJEth) <= 0) return false
    setLoading((prev) => ({ ...prev, redeemVolatile: true }))
    try {
      const vault = new ethers.Contract(VAULT_CONTRACT_ADDRESS, VAULT_ABI, signer)
      const tx = await vault.redeemVolatile(ethers.parseUnits(amountJEth, 18))
      addToast("info", `Enviando solicitud de retiro de ${amountJEth} jETH...`)
      await tx.wait(1)
      addToast("success", `¡Retiro Exitoso! Canjeados ${amountJEth} jETH por Sepolia ETH.`)
      await loadBalances()
      return true
    } catch (err: any) {
      console.error("Error al canjear jETH:", err)
      addToast("error", "Error al retirar jETH: " + (err?.reason || err?.message || "Rechazado"))
      return false
    } finally {
      setLoading((prev) => ({ ...prev, redeemVolatile: false }))
    }
  }

  const runAction = useCallback(async (actionType: "deposit" | "redeemStable" | "redeemVolatile", amount: string) => {
    if (actionType === "deposit") return await deposit(amount)
    if (actionType === "redeemStable") return await redeemStable(amount)
    if (actionType === "redeemVolatile") return await redeemVolatile(amount)
    return false
  }, [deposit, redeemStable, redeemVolatile])

  return {
    account,
    provider,
    signer,
    chainId,
    connected,
    connecting,
    wrongNetwork,
    balances,
    loading,
    refreshing,
    toasts,
    connectWallet,
    disconnect: disconnectWallet,
    disconnectWallet,
    loadBalances,
    switchToSepolia,
    runAction,
    dismissToast,
    deposit,
    redeemStable,
    redeemVolatile,
  }
}
