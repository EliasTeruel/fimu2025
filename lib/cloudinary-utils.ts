/**
 * Utilidades para optimizar imágenes de Cloudinary
 */

interface CloudinaryTransformOptions {
  width?: number
  height?: number
  quality?: number | 'auto'
  format?: 'webp' | 'avif' | 'jpg' | 'png' | 'auto'
  crop?: 'fill' | 'fit' | 'scale' | 'limit'
}

/**
 * Optimiza una URL de Cloudinary agregando transformaciones
 * @param url - URL original de Cloudinary
 * @param options - Opciones de transformación
 * @returns URL optimizada con transformaciones
 */
export function optimizeCloudinaryImage(
  url: string,
  options: CloudinaryTransformOptions = {}
): string {
  // Si no es una URL de Cloudinary, retornar sin modificar
  if (!url.includes('cloudinary.com')) {
    return url
  }

  const {
    width,
    height,
    quality = 'auto',
    format = 'auto',
    crop = 'fill'
  } = options

  try {
    // Separar la URL en partes
    const urlParts = url.split('/upload/')
    if (urlParts.length !== 2) return url

    const [baseUrl, imagePath] = urlParts

    // Construir transformaciones
    const transformations: string[] = []

    if (width) transformations.push(`w_${width}`)
    if (height) transformations.push(`h_${height}`)
    if (crop) transformations.push(`c_${crop}`)
    if (quality) transformations.push(`q_${quality}`)
    if (format) transformations.push(`f_${format}`)

    // Agregar compresión adicional
    transformations.push('fl_progressive') // Carga progresiva
    transformations.push('fl_lossy') // Compresión con pérdida mínima

    const transformString = transformations.join(',')

    // Reconstruir URL con transformaciones
    return `${baseUrl}/upload/${transformString}/${imagePath}`
  } catch (error) {
    console.error('Error al optimizar imagen de Cloudinary:', error)
    return url
  }
}

/**
 * Presets comunes de optimización
 */
export const CloudinaryPresets = {
  /** Thumbnail pequeño para previews (200x200) */
  thumbnail: (url: string) => optimizeCloudinaryImage(url, {
    width: 200,
    height: 200,
    quality: 70,
    format: 'webp',
    crop: 'fill'
  }),

  /** Card de producto en lista (400x400) */
  productCard: (url: string) => optimizeCloudinaryImage(url, {
    width: 400,
    height: 400,
    quality: 80,
    format: 'webp',
    crop: 'fit'
  }),

  /** Modal de producto (800x800) */
  productModal: (url: string) => optimizeCloudinaryImage(url, {
    width: 800,
    height: 800,
    quality: 85,
    format: 'webp',
    crop: 'fit'
  }),

  /** Vista completa para admin (1200x1200) */
  fullSize: (url: string) => optimizeCloudinaryImage(url, {
    width: 1200,
    height: 1200,
    quality: 90,
    format: 'auto',
    crop: 'limit'
  }),

  /** Avatar de usuario (100x100) */
  avatar: (url: string) => optimizeCloudinaryImage(url, {
    width: 100,
    height: 100,
    quality: 75,
    format: 'webp',
    crop: 'fill'
  })
}
