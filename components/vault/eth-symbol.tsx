"use client"

import { useEffect, useRef } from "react"
import * as THREE from "three"

export function EthSymbol() {
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const width = container.clientWidth || 320
    const height = 340

    // 1. Escena, Cámara y Renderer
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000)
    camera.position.z = 6.8

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.6
    container.appendChild(renderer.domElement)

    // 2. Geometría Octaédrica de Diamante Ethereum
    const ethGeometry = new THREE.OctahedronGeometry(1.2, 0)
    ethGeometry.scale(1, 1.35, 1)

    // 3. Material de Cristal Tornasol Físico (Iridescence: Verde, Naranja y Dorado)
    const diamondMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(0x34d399), // Base Esmeralda
      emissive: new THREE.Color(0x7c2d12), // Reflejo Cobre/Naranja Creador de Profundidad
      emissiveIntensity: 0.4,
      transmission: 0.85,
      opacity: 1.0,
      transparent: true,
      roughness: 0.08,
      metalness: 0.4,
      ior: 2.4, // Refracción Real de Diamante
      thickness: 1.5,
      specularIntensity: 3.0,
      specularColor: new THREE.Color(0xfbbf24), // Brillo Especular Dorado
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      reflectivity: 1.0,
      // Efecto Tornasol Óptico (Interferencia de Película Delgada en Three.js)
      iridescence: 1.0,
      iridescenceIOR: 1.7,
      iridescenceThicknessRange: [100, 400],
    })

    const ethMesh = new THREE.Mesh(ethGeometry, diamondMaterial)
    scene.add(ethMesh)

    // Bordes Dorado Criptográfico Ultrafinos
    const edgesGeo = new THREE.EdgesGeometry(ethGeometry)
    const lineMat = new THREE.LineBasicMaterial({ color: 0xfbbf24, linewidth: 2, transparent: true, opacity: 0.85 })
    const edgesMesh = new THREE.LineSegments(edgesGeo, lineMat)
    scene.add(edgesMesh)

    // 4. Luces Tri-Cromáticas Tornasol (Dorado, Naranja Neón, Verde Esmeralda)
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.8)
    scene.add(ambientLight)

    // Luz Dorada Superior
    const goldLight = new THREE.DirectionalLight(0xfbbf24, 4.0)
    goldLight.position.set(5, 6, 4)
    scene.add(goldLight)

    // Luz Naranja Eléctrica Lateral
    const orangeLight = new THREE.PointLight(0xff5500, 6, 20)
    orangeLight.position.set(-4, 2, 4)
    scene.add(orangeLight)

    // Luz Verde Esmeralda Inferior
    const greenLight = new THREE.PointLight(0x10b981, 5, 20)
    greenLight.position.set(4, -3, 3)
    scene.add(greenLight)

    // 5. Animación de Rotación y Cambio de Tono Tornasol Dinámico
    let mouseX = 0
    let mouseY = 0

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect()
      mouseX = ((e.clientX - rect.left) / width - 0.5) * 2
      mouseY = ((e.clientY - rect.top) / height - 0.5) * 2
    }

    window.addEventListener("mousemove", handleMouseMove)

    let animationId: number
    const clock = new THREE.Clock()

    const animate = () => {
      animationId = requestAnimationFrame(animate)
      const elapsed = clock.getElapsedTime()

      // Rotación suave diagonal y levitación en eje Y
      ethMesh.rotation.y = elapsed * 0.5 + mouseX * 0.5
      ethMesh.rotation.x = Math.sin(elapsed * 0.4) * 0.15 + mouseY * 0.3
      ethMesh.position.y = Math.sin(elapsed * 1.5) * 0.1

      edgesMesh.rotation.copy(ethMesh.rotation)
      edgesMesh.position.copy(ethMesh.position)

      // Transición sutil de tonos tornasol durante la rotación
      diamondMaterial.iridescenceThicknessRange[0] = 100 + Math.sin(elapsed * 2) * 50

      renderer.render(scene, camera)
    }

    animate()

    const handleResize = () => {
      if (!container) return
      const w = container.clientWidth || 320
      camera.aspect = w / height
      camera.updateProjectionMatrix()
      renderer.setSize(w, height)
    }

    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("resize", handleResize)
      cancelAnimationFrame(animationId)
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
      renderer.dispose()
    }
  }, [])

  return (
    <div className="relative flex items-center justify-center w-full select-none">
      {/* Halo Bioluminiscente Tornasol (Verde, Naranja y Dorado) */}
      <div className="absolute h-64 w-64 rounded-full bg-gradient-to-tr from-emerald-500/25 via-orange-500/25 to-amber-400/25 blur-3xl animate-pulse pointer-events-none" />

      {/* Canvas WebGL 3D Real Three.js */}
      <div ref={mountRef} className="w-full max-w-[280px] h-[280px] cursor-grab active:cursor-grabbing z-10" />
    </div>
  )
}
