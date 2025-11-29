export default function MantenimientoScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#D1ECFF' }}>
      <div className="max-w-2xl w-full">
        {/* Card principal */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12 border-4" style={{ borderColor: '#FF5BC7' }}>
          {/* Icono animado */}
          <div className="text-center mb-6">
            <div className="inline-block animate-bounce">
              <span className="text-9xl">🔧</span>
            </div>
          </div>
          
          {/* Título */}
          <h1 className="text-4xl md:text-5xl font-bold text-center mb-4" style={{ color: '#1F0354' }}>
            ¡Estamos en Mantenimiento!
          </h1>
          
          {/* Descripción principal */}
          <p className="text-xl text-center mb-8" style={{ color: '#5E18EB' }}>
            Estamos realizando mejoras para brindarte una mejor experiencia de compra ✨
          </p>
          
          {/* Información adicional */}
          <div className="grid md:grid-cols-2 gap-4 mb-8">
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border-2" style={{ borderColor: '#5E18EB' }}>
              <div className="text-3xl mb-2">⏰</div>
              <h3 className="font-semibold text-lg mb-2" style={{ color: '#1F0354' }}>
                Volveremos pronto
              </h3>
              <p className="text-sm" style={{ color: '#5E18EB' }}>
                Estamos trabajando duro para volver lo antes posible
              </p>
            </div>
            
            <div className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-xl p-6 border-2" style={{ borderColor: '#FF5BC7' }}>
              <div className="text-3xl mb-2">💬</div>
              <h3 className="font-semibold text-lg mb-2" style={{ color: '#1F0354' }}>
                Mantente informado
              </h3>
              <p className="text-sm" style={{ color: '#5E18EB' }}>
                Síguenos en redes sociales para actualizaciones
              </p>
            </div>
          </div>

          {/* Mensaje de agradecimiento */}
          <div className="text-center">
            <p className="text-lg font-medium mb-4" style={{ color: '#1F0354' }}>
              Gracias por tu paciencia 💜
            </p>
            <div className="flex justify-center gap-3 text-3xl">
              <span className="animate-pulse">✨</span>
              <span className="animate-pulse" style={{ animationDelay: '0.2s' }}>🛍️</span>
              <span className="animate-pulse" style={{ animationDelay: '0.4s' }}>💕</span>
              <span className="animate-pulse" style={{ animationDelay: '0.6s' }}>👗</span>
              <span className="animate-pulse" style={{ animationDelay: '0.8s' }}>✨</span>
            </div>
          </div>
        </div>

        {/* Texto inferior */}
        <div className="text-center mt-6">
          <p className="text-sm" style={{ color: '#5E18EB' }}>
            <strong>Fimu Vintage</strong> - Ropa vintage, retro y segunda mano
          </p>
        </div>
      </div>
    </div>
  )
}
