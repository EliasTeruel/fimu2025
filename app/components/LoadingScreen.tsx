import Spinner from './Spinner'

interface LoadingScreenProps {
  message?: string
  backgroundColor?: string
  textColor?: string
}

export default function LoadingScreen({ 
  message = 'Cargando...', 
  backgroundColor = '#FFFFFF',
  textColor = '#000000'
}: LoadingScreenProps) {
  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center gap-6" 
      style={{ backgroundColor, paddingTop: '100px' }}
    >
      <Spinner size="lg" color={textColor} />
      <p className="text-lg font-medium uppercase tracking-wider font-body" style={{ color: textColor }}>
        {message}
      </p>
    </div>
  )
}
