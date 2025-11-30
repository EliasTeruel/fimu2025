interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  color?: string
  className?: string
}

export default function Spinner({ 
  size = 'md', 
  color = '#000000',
  className = '' 
}: SpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 '
  }

  return (
    <div
      className={`${sizeClasses[size]} border-transparent animate-spin ${className}`}
      style={{ 
        borderColor: '#E5E5E5',
        borderTopColor: color,
        borderRadius: '50%'
      }}
    />
  )
}
