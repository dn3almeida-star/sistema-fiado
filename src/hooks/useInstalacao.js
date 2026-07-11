import { useState, useEffect, useRef, useCallback } from 'react'
import { decidirInstalacao } from '../utils/instalacao.js'

function detectarIOS() {
  if (typeof navigator === 'undefined') return false
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream
}

function detectarInstalado() {
  if (typeof window === 'undefined') return false
  return window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true
}

// Gerencia o convite de instalação do PWA: guarda o evento beforeinstallprompt
// (Android/Chrome) e detecta iOS/standalone. modo: 'android' | 'ios' | null.
export function useInstalacao() {
  const promptRef = useRef(null)
  const [podeInstalar, setPodeInstalar] = useState(false)
  const [instalado, setInstalado] = useState(detectarInstalado())
  const [dispensado, setDispensado] = useState(() => localStorage.getItem('instalar_dispensado') === '1')
  const ehIOS = detectarIOS()

  useEffect(() => {
    function onPrompt(e) {
      e.preventDefault()          // impede o mini-infobar padrão; usamos nosso banner
      promptRef.current = e
      setPodeInstalar(true)
    }
    function onInstalado() {
      setInstalado(true)
      setPodeInstalar(false)
      promptRef.current = null
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalado)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalado)
    }
  }, [])

  const instalar = useCallback(async () => {
    const evt = promptRef.current
    if (!evt) return
    evt.prompt()
    try { await evt.userChoice } catch { /* ignore */ }
    promptRef.current = null
    setPodeInstalar(false)
  }, [])

  const dispensar = useCallback(() => {
    localStorage.setItem('instalar_dispensado', '1')
    setDispensado(true)
  }, [])

  const modo = decidirInstalacao({ instalado, dispensado, podeInstalar, ehIOS })
  return { modo, instalar, dispensar }
}
