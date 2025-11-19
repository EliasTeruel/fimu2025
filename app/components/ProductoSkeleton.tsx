export default function ProductoSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden border-2 animate-pulse" style={{ borderColor: '#FFE6F5' }}>
      {/* Skeleton para imagen */}
      <div className="h-48" style={{ backgroundColor: '#D1ECFF' }}>
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-20 h-20 rounded-full" style={{ backgroundColor: '#FFC3E5' }}></div>
        </div>
      </div>
      
      {/* Skeleton para contenido */}
      <div className="p-3 space-y-3">
        {/* Título */}
        <div className="h-5 rounded" style={{ backgroundColor: '#FFE6F5', width: '80%' }}></div>
        
        {/* Precio y badge */}
        <div className="flex items-center justify-between">
          <div className="h-6 rounded" style={{ backgroundColor: '#E6D5FF', width: '40%' }}></div>
          <div className="h-6 rounded-full" style={{ backgroundColor: '#FFE6F5', width: '30%' }}></div>
        </div>
        
        {/* Botón */}
        <div className="h-9 rounded-md" style={{ backgroundColor: '#E6D5FF' }}></div>
      </div>
    </div>
  )
}
