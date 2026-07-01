import { useEffect } from 'react'
import { animate, useMotionValue, useTransform, motion } from 'framer-motion'

export default function NumeroAnimado({ valor, className }) {
  const count = useMotionValue(0)
  const texto = useTransform(count, v =>
    v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  )

  useEffect(() => {
    const controls = animate(count, valor, { duration: 0.9, ease: [0.22, 1, 0.36, 1] })
    return controls.stop
  }, [valor, count])

  return <motion.span className={className}>{texto}</motion.span>
}
