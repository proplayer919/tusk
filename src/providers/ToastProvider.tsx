import { createContext, useContext, useState, useCallback } from 'react'
import Toast from '../components/Toast'

type ToastOptions = {
  message: string
  duration?: number
  action?: { label: string; onClick: () => void }
  onClose?: () => void
}

type InternalToast = ToastOptions & { id: number }

type ToastContextValue = {
  show: (opts: ToastOptions) => number
  isShowing: boolean
}

const ToastContext = createContext<ToastContextValue>({ show: () => -1, isShowing: false })

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = useState<InternalToast[]>([])
  const show = useCallback((opts: ToastOptions) => {
    const id = Date.now() + Math.floor(Math.random() * 1000)
    setQueue(q => [...q, { ...opts, id }])
    return id
  }, [])

  const closeCurrent = useCallback(() => {
    setQueue(prev => {
      const current = prev[0]
      const rest = prev.slice(1)
      if (current && typeof current.onClose === 'function') {
        try { current.onClose() } catch (e) { }
      }
      return rest
    })
  }, [])

  const current = queue[0]

  return (
    <ToastContext.Provider value={{ show, isShowing: queue.length > 0 }}>
      {children}
      {current && (
        <Toast
          isOpen={true}
          message={current.message}
          duration={current.duration}
          action={current.action ? { label: current.action.label, onClick: () => { try { current.action!.onClick() } catch (e) { } } } : undefined}
          onClose={() => closeCurrent()}
        />
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}

export default ToastProvider
