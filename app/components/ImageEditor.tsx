'use client';

import { useState, useRef } from 'react';
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

interface ImageEditorProps {
  imageUrl: string;
  onSave: (editedImageBlob: Blob) => void;
  onCancel: () => void;
}

export default function ImageEditor({ imageUrl, onSave, onCancel }: ImageEditorProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    width: 75,
    height: 100,
    x: 12.5,
    y: 0,
  });
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [loading, setLoading] = useState(false);
  const [cropLibre, setCropLibre] = useState(false);

  const getCroppedImg = async (): Promise<Blob> => {
    const image = imgRef.current;
    const crop = completedCrop;

    if (!image || !crop) {
      throw new Error('No hay imagen o área de recorte');
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('No se pudo crear el contexto del canvas');
    }

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    canvas.width = crop.width;
    canvas.height = crop.height;

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);

    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;

    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      crop.width,
      crop.height
    );

    ctx.restore();

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Error al crear el blob de la imagen'));
        }
      }, 'image/jpeg', 0.95);
    });
  };

  const handleSave = async () => {
    if (!completedCrop) {
      alert('Por favor ajusta el área de recorte');
      return;
    }

    try {
      setLoading(true);
      const croppedImage = await getCroppedImg();
      onSave(croppedImage);
    } catch (error) {
      console.error('Error al procesar la imagen:', error);
      alert('Error al procesar la imagen');
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = () => {
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setRotation(0);
  };

  const setCropFijo = () => {
    setCrop({
      unit: '%',
      width: 75,
      height: 100,
      x: 12.5,
      y: 0,
    });
    setCropLibre(false);
  };

  const setCropLibreMode = () => {
    setCrop({
      unit: '%',
      width: 80,
      height: 80,
      x: 10,
      y: 10,
    });
    setCropLibre(true);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex flex-col">
      {/* Header */}
      <div className="bg-gray-900 text-white p-3 sm:p-4 flex justify-between items-center">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 sm:px-4 sm:py-2 bg-gray-700 hover:bg-gray-600 rounded font-body text-sm sm:text-base"
          disabled={loading}
        >
          Cancelar
        </button>
        <h2 className="font-heading text-base sm:text-xl">Editar Imagen</h2>
        <button
          onClick={handleSave}
          className="px-3 py-1.5 sm:px-4 sm:py-2 bg-primary hover:bg-primary-dark rounded font-body text-sm sm:text-base"
          disabled={loading}
        >
          {loading ? 'Guardando...' : 'Guardar'}
        </button>
      </div>

      {/* Crop Area */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-2 sm:p-4">
        <ReactCrop
          crop={crop}
          onChange={(c) => setCrop(c)}
          onComplete={(c) => setCompletedCrop(c)}
          aspect={cropLibre ? undefined : 3 / 4}
        >
          <img
            ref={imgRef}
            src={imageUrl}
            alt="Editar"
            crossOrigin="anonymous"
            style={{
              filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`,
              transform: `rotate(${rotation}deg)`,
              maxWidth: '100%',
              maxHeight: 'calc(100vh - 300px)',
              touchAction: 'none',
            }}
          />
        </ReactCrop>
      </div>

      {/* Controls */}
      <div className="bg-gray-900 text-white p-3 sm:p-6 space-y-3 sm:space-y-4 max-h-[45vh] sm:max-h-[40vh] overflow-y-auto">
        {/* Modo de Crop */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={setCropFijo}
            className={`flex-1 px-2 py-1.5 sm:px-4 sm:py-2 rounded font-body text-xs sm:text-sm transition-colors ${
              !cropLibre 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            📐 Fijo (3:4)
          </button>
          <button
            type="button"
            onClick={setCropLibreMode}
            className={`flex-1 px-2 py-1.5 sm:px-4 sm:py-2 rounded font-body text-xs sm:text-sm transition-colors ${
              cropLibre 
                ? 'bg-green-600 text-white' 
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            🔓 Libre
          </button>
        </div>

        {cropLibre && (
          <p className="text-xs text-yellow-300 text-center font-body">
            ⚠️ Arrastra las esquinas o bordes del recuadro azul
          </p>
        )}

        {/* Rotation */}
        <div>
          <label className="block text-xs sm:text-sm font-body mb-1 sm:mb-2">
            Rotación: {rotation}°
          </label>
          <input
            type="range"
            min={0}
            max={360}
            step={1}
            value={rotation}
            onChange={(e) => setRotation(parseInt(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Brightness */}
        <div>
          <label className="block text-xs sm:text-sm font-body mb-1 sm:mb-2">
            Brillo: {brightness}%
          </label>
          <input
            type="range"
            min={0}
            max={200}
            step={1}
            value={brightness}
            onChange={(e) => setBrightness(parseInt(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Contrast */}
        <div>
          <label className="block text-xs sm:text-sm font-body mb-1 sm:mb-2">
            Contraste: {contrast}%
          </label>
          <input
            type="range"
            min={0}
            max={200}
            step={1}
            value={contrast}
            onChange={(e) => setContrast(parseInt(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Saturation */}
        <div>
          <label className="block text-xs sm:text-sm font-body mb-1 sm:mb-2">
            Saturación: {saturation}%
          </label>
          <input
            type="range"
            min={0}
            max={200}
            step={1}
            value={saturation}
            onChange={(e) => setSaturation(parseInt(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Reset Button */}
        <button
          onClick={resetFilters}
          className="w-full px-3 py-1.5 sm:px-4 sm:py-2 bg-gray-700 hover:bg-gray-600 rounded font-body text-xs sm:text-sm"
        >
          ↩️ Restablecer Filtros
        </button>
      </div>
    </div>
  );
}
