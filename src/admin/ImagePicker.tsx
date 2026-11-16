import { useRef, useState } from 'react';
import { deleteImage, uploadImage } from '../api';
import type { ImageKind } from '../api';
import { colors } from '../components/theme';
import { Button } from './ui';
import type { Run } from './ui';

const MAX_SIDE = 1200;
const QUALITY = 0.82;

// Reduce una foto a un lado máximo de 1200 px y la convierte a WebP en el navegador.
// Si el navegador no sabe generar WebP, usa JPEG.
async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const toBlob = (type: string) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, QUALITY));
  let blob = await toBlob('image/webp');
  if (!blob || blob.type !== 'image/webp') blob = await toBlob('image/jpeg');
  if (!blob) throw new Error('No se pudo procesar la imagen');
  return blob;
}

type ImagePickerProps = {
  kind: ImageKind;
  id: number;
  imageUrl: string | null;
  run: Run;
};

// Miniatura de la foto de un sabor o producto, con botones para subir,
// cambiar o quitar la foto.
export default function ImagePicker({ kind, id, imageUrl, run }: ImagePickerProps) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  // Comprime el archivo elegido y lo sube.
  async function handleFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    await run(async () => {
      let image: Blob;
      try {
        image = await compressImage(file);
      } catch {
        throw new Error('El archivo elegido no es una imagen válida');
      }
      await uploadImage(kind, id, image);
    }, 'Foto actualizada');
    setBusy(false);
    if (input.current) input.current.value = '';
  }

  // Quita la foto actual.
  async function handleRemove() {
    setBusy(true);
    await run(() => deleteImage(kind, id), 'Foto eliminada');
    setBusy(false);
  }

  return (
    <div className="flex items-center gap-3">
      <div className="size-16 shrink-0 overflow-hidden rounded-xl border border-white/20">
        {imageUrl ? (
          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="galaxy h-full w-full opacity-70" />
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <input
          ref={input}
          type="file"
          accept="image/*"
          className="sr-only"
          aria-label="Elegir foto"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <Button color={colors.purple} disabled={busy} onClick={() => input.current?.click()}>
          {busy ? 'Subiendo…' : imageUrl ? 'Cambiar foto' : 'Subir foto'}
        </Button>
        {imageUrl && (
          <Button color={colors.red} disabled={busy} onClick={handleRemove}>
            Quitar
          </Button>
        )}
      </div>
    </div>
  );
}
