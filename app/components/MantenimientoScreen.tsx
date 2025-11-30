export default function MantenimientoScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-white">
      <div className="max-w-2xl w-full">
        {/* Card principal */}
        <div className="bg-white p-8 md:p-12 border-2 border-black">
          
          {/* Título */}
          <h1 className="text-4xl md:text-5xl font-bold text-center mb-6 text-black uppercase tracking-wider font-title">
            En Mantenimiento
          </h1>
          
          {/* Descripción principal */}
          <p className="text-lg text-center mb-8 text-gray-700 tracking-wide font-body">
            Estamos realizando mejoras para brindarte una mejor experiencia de compra
          </p>
          
          {/* Información adicional */}
          <div className="grid md:grid-cols-2 gap-4 mb-8">
            <div className="bg-gray-50 p-6 border-2 border-black">
              <h3 className="font-bold text-lg mb-2 text-black uppercase tracking-wider font-title">
                Volveremos pronto
              </h3>
              <p className="text-sm text-gray-600 font-body">
                Estamos trabajando duro para volver lo antes posible
              </p>
            </div>
            
            <div className="bg-gray-50 p-6 border-2 border-black">
              <h3 className="font-bold text-lg mb-2 text-black uppercase tracking-wider font-title">
                Mantente informado
              </h3>
              <p className="text-sm text-gray-600 font-body">
                Síguenos en redes sociales para actualizaciones
              </p>
            </div>
          </div>

          {/* Mensaje de agradecimiento */}
          <div className="text-center border-t-2 border-black pt-6">
            <p className="text-lg font-bold mb-2 text-black uppercase tracking-wider font-accent">
              Gracias por tu paciencia
            </p>
          </div>
        </div>

        {/* Texto inferior */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-600 uppercase tracking-wider font-body">
            <strong className="text-black font-title">Fimu Vintage</strong> - Ropa vintage, retro y segunda mano
          </p>
        </div>
      </div>
    </div>
  )
}
