'use client'

import { useEffect } from 'react'

interface AlertProps {
  title?: string
  message: string
  type?: 'info' | 'success' | 'error' | 'warning'
  onClose: () => void
}

export default function Alert({ title, message, type = 'info', onClose }: AlertProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [onClose])

  const colors = {
    info: { bg: '#D1ECFF', border: '#5E18EB', text: '#1F0354' },
    success: { bg: '#D1ECFF', border: '#5E18EB', text: '#1F0354' },
    error: { bg: '#FFE5E5', border: '#FF6012', text: '#1F0354' },
    warning: { bg: '#FFF0FB', border: '#FF5BC7', text: '#1F0354' }
  }

  const color = colors[type]

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(31, 3, 84, 0.75)' }}
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6 border-4 animate-scale-in"
        style={{ borderColor: color.border, backgroundColor: color.bg }}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <h3 className="text-xl font-bold mb-3" style={{ color: color.text }}>
            {title}
          </h3>
        )}
        <p className="text-base mb-6" style={{ color: color.text }}>
          {message}
        </p>
        <button
          onClick={onClose}
          className="w-full py-3 rounded-md font-semibold text-white hover:opacity-90 transition-opacity"
          style={{ backgroundColor: color.border }}
        >
          Aceptar
        </button>
      </div>
      <style jsx>{`
        @keyframes scale-in {
          from {
            transform: scale(0.9);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }
      `}</style>
    </div>
  )
}
