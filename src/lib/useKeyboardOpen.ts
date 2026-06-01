import { useEffect, useState } from 'react'

/**
 * Detecta se o teclado virtual está aberto no mobile usando a
 * visualViewport API. Quando o teclado abre, a altura visual encolhe.
 * Usado para ocultar FAB/bottom-nav e evitar que flutuem sobre o teclado.
 */
export function useKeyboardOpen(): boolean {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return

    const onResize = () => {
      // se a viewport visual ficou bem menor que a janela, o teclado está aberto
      const diff = window.innerHeight - vv.height
      setOpen(diff > 150)
    }
    vv.addEventListener('resize', onResize)
    onResize()
    return () => vv.removeEventListener('resize', onResize)
  }, [])

  return open
}
