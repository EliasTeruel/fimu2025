export default function ProductoSkeleton() {
  return (
    <div className="bg-white overflow-hidden animate-pulse">
      {/* Skeleton para imagen - cuadrado sin bordes */}
      <div className="aspect-square w-full bg-gray-100">
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-20 h-20 bg-gray-200"></div>
        </div>
      </div>
      
      {/* Skeleton para contenido */}
      <div className="p-4 space-y-3 bg-white">
        {/* Título */}
        <div className="h-4 bg-gray-200" style={{ width: '75%' }}></div>
        
        {/* Precio y badge */}
        <div className="flex items-center justify-between gap-2">
          <div className="h-6 bg-gray-300" style={{ width: '35%' }}></div>
          <div className="h-6 bg-gray-200" style={{ width: '35%' }}></div>
        </div>
        
        {/* Botón */}
        <div className="h-12 bg-black opacity-10"></div>
      </div>
    </div>
  )
}
