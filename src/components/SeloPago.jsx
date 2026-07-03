import { motion } from 'framer-motion'
import { Check } from 'lucide-react'

export default function SeloPago({ label = 'Pago', className = '' }) {
  return (
    <motion.span
      initial={{ scale: 1.5, rotate: -18, opacity: 0 }}
      animate={{ scale: 1, rotate: -7, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 480, damping: 14 }}
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md border-2 border-brand text-brand font-display font-bold text-xs uppercase tracking-wider ${className}`}
      style={{ boxShadow: '0 0 0 1px rgb(var(--surface))' }}
    >
      <Check size={12} strokeWidth={3} />
      {label}
    </motion.span>
  )
}
