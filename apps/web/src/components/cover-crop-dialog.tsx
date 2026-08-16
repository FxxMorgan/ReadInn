'use client';

import { useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { Check, X } from 'lucide-react';

interface CoverCropDialogProps {
  source: string;
  filename: string;
  onCancel: () => void;
  onApply: (file: File) => void;
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('No pudimos abrir la imagen.'));
    image.src = source;
  });
}

async function cropImage(source: string, area: Area, filename: string): Promise<File> {
  const image = await loadImage(source);
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 1200;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('El navegador no permite recortar esta imagen.');
  context.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (value) => value ? resolve(value) : reject(new Error('No pudimos crear la portada.')),
      'image/jpeg',
      0.9,
    );
  });
  const baseName = filename.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]+/g, '-') || 'portada';
  return new File([blob], `${baseName}-2x3.jpg`, { type: 'image/jpeg' });
}

export function CoverCropDialog({ source, filename, onCancel, onApply }: CoverCropDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');

  async function apply() {
    if (!area || working) return;
    setWorking(true);
    setError('');
    try {
      onApply(await cropImage(source, area, filename));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No pudimos recortar la portada.');
      setWorking(false);
    }
  }

  return (
    <div className="modal-backdrop cover-crop-backdrop">
      <section className="modal-card cover-crop-dialog" role="dialog" aria-modal="true" aria-labelledby="cover-crop-title">
        <div className="cover-crop-head">
          <div><h2 id="cover-crop-title">Recortar portada</h2><p>Encuadra la imagen en el formato vertical que se mostrara en ReadInn.</p></div>
          <button type="button" className="icon-button" title="Cancelar recorte" disabled={working} onClick={onCancel}><X size={19} /></button>
        </div>
        <div className="cover-crop-stage">
          <Cropper
            image={source}
            crop={crop}
            zoom={zoom}
            aspect={2 / 3}
            showGrid
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={(_area, pixels) => setArea(pixels)}
          />
        </div>
        <label className="cover-zoom">Zoom<input type="range" min="1" max="3" step="0.05" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} /></label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="modal-actions">
          <button type="button" className="secondary-button" disabled={working} onClick={onCancel}>Cancelar</button>
          <button type="button" className="primary-button" disabled={!area || working} onClick={() => void apply()}><Check size={18} />{working ? 'Recortando...' : 'Usar portada'}</button>
        </div>
      </section>
    </div>
  );
}
