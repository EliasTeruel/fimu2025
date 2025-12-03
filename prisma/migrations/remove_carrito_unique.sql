-- Eliminar la restricción única en CarritoItem que impide que múltiples usuarios agreguen el mismo producto
-- Esta restricción causa: "Unique constraint failed on the fields: (`producto_id`)"

ALTER TABLE "carrito_items" DROP CONSTRAINT IF EXISTS "carrito_items_producto_id_session_id_key";
