import { useEffect, useState, useRef } from 'react'
import './Toast.css'
import Button from './Button'

type ToastAction = {
  label: string
  onClick: () => void
}

type ToastProps = {
  message: string
  isOpen: boolean
  onClose: () => void
  action?: ToastAction
  duration?: number
}

export default function Toast({ message, isOpen, onClose, action, duration = 3500 }: ToastProps) {
  const [visible, setVisible] = useState(false)
  const [closing, setClosing] = useState(false)
  const closeTimer = useRef<number | null>(null)
  const exitDelay = 260 // match CSS transition

  useEffect(() => {
    let autoTimer: number | null = null
    if (isOpen) {
      // show immediately
      setVisible(true)
      setClosing(false)
      // schedule auto-dismiss which triggers closing animation first
      autoTimer = window.setTimeout(() => {
        setClosing(true)
        setVisible(false)
        // after exit animation, call onClose
        closeTimer.current = window.setTimeout(() => {
          onClose()
        }, exitDelay)
      }, duration)
    }
    return () => {
      if (autoTimer) window.clearTimeout(autoTimer)
      if (closeTimer.current) window.clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }, [isOpen, duration, onClose])

  function handleClose() {
    if (closing) return
    setClosing(true)
    setVisible(false)
    if (closeTimer.current) window.clearTimeout(closeTimer.current)
    closeTimer.current = window.setTimeout(() => onClose(), exitDelay)
  }

  function handleAction() {
    try { action && action.onClick() } catch (e) { }
    handleClose()
  }

  return (
    <div className="toast-root" aria-live="polite">
      <div className={`toast ${visible ? 'toast--open' : ''} ${closing ? 'toast--closing' : ''}`} role="status">
        <div className="toast-message">{message}</div>
        <div className="toast-actions">
          {action && (
            <Button onClick={handleAction}>
              {action.label}
            </Button>
          )}
          <button className="toast-close" aria-label="Close" onClick={handleClose}>✕</button>
        </div>
      </div>
    </div>
  )
}
