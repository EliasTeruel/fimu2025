-- Crear tabla de configuración para categorías
CREATE TABLE configuracion_categorias (
  id SERIAL PRIMARY KEY,
  categoria VARCHAR(50) UNIQUE NOT NULL,
  visible BOOLEAN DEFAULT true NOT NULL,
  nombre_mostrar VARCHAR(100) NOT NULL,
  icono VARCHAR(10),
  orden INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear índice para búsquedas rápidas
CREATE INDEX idx_configuracion_categoria ON configuracion_categorias(categoria);
CREATE INDEX idx_configuracion_visible ON configuracion_categorias(visible);

-- Insertar configuración inicial para las dos categorías
INSERT INTO configuracion_categorias (categoria, visible, nombre_mostrar, icono, orden) VALUES
  ('fimu', true, 'Fimu', '🛍️', 1),
  ('perchero', true, 'Perchero', '👗', 2);
