export function haptic(padrao = 15) {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(padrao)
    }
  } catch {
    /* sem suporte: ignora */
  }
}
