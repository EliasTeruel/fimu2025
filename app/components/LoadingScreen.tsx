import Spinner from './Spinner'

interface LoadingScreenProps {
  message?: string
  backgroundColor?: string
  textColor?: string
}

export default function LoadingScreen({ 
  message = 'Cargando...', 
  backgroundColor = '#FFC3E5',
  textColor = '#1F0354'
}: LoadingScreenProps) {
  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center gap-4" 
      style={{ backgroundColor, paddingTop: '100px' }}
    >
      <Spinner size="lg" color={textColor} />
      <p className="text-xl font-semibold" style={{ color: textColor }}>
        {message}
      </p>
    </div>
  )
}
