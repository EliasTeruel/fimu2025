'use client'

import { useEffect } from 'react'

interface ConfirmProps {
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
}

export default function Confirm({ 
  title = '¿Estás seguro?',
  message, 
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  onConfirm, 
  onCancel 
}: ConfirmProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [onCancel])

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(31, 3, 84, 0.75)' }}
      onClick={onCancel}
    >
      <div 
        className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6 border-4 animate-scale-in"
        style={{ borderColor: '#FF5BC7', backgroundColor: '#FFF0FB' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl font-bold mb-3" style={{ color: '#1F0354' }}>
          {title}
        </h3>
        <p className="text-base mb-6" style={{ color: '#1F0354' }}>
          {message}
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-md font-semibold hover:opacity-90 transition-opacity"
            style={{ backgroundColor: '#FFC3E5', color: '#1F0354' }}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 rounded-md font-semibold text-white hover:opacity-90 transition-opacity"
            style={{ backgroundColor: '#FF6012' }}
          >
            {confirmText}
          </button>
        </div>
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
