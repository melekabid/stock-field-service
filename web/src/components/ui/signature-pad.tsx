'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

export type SignaturePadHandle = {
  clear: () => void;
  toDataUrl: () => string | null;
  isEmpty: () => boolean;
};

type SignaturePadProps = {
  label: string;
  initialDataUrl?: string;
};

export const SignaturePad = forwardRef<SignaturePadHandle, SignaturePadProps>(function SignaturePad(
  { label, initialDataUrl },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [preview, setPreview] = useState(initialDataUrl ?? '');

  useEffect(() => {
    setPreview(initialDataUrl ?? '');
    setHasDrawn(false);
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ratio = window.devicePixelRatio || 1;
    const width = canvas.offsetWidth || 640;
    const height = 220;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }

    context.scale(ratio, ratio);
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
    context.strokeStyle = '#0f172a';
    context.lineWidth = 2.6;
    context.lineCap = 'round';
    context.lineJoin = 'round';
  }, [initialDataUrl]);

  useImperativeHandle(ref, () => ({
    clear() {
      const canvas = canvasRef.current;
      const context = canvas?.getContext('2d');
      if (!canvas || !context) {
        return;
      }

      context.save();
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.restore();
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.offsetWidth || 640, 220);
      setHasDrawn(false);
      setPreview('');
    },
    toDataUrl() {
      if (!hasDrawn) {
        return null;
      }

      return canvasRef.current?.toDataURL('image/png') ?? null;
    },
    isEmpty() {
      return !hasDrawn;
    },
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) {
      return;
    }

    let drawing = false;

    const position = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };

    const start = (event: PointerEvent) => {
      drawing = true;
      const point = position(event);
      context.beginPath();
      context.moveTo(point.x, point.y);
      canvas.setPointerCapture(event.pointerId);
      setHasDrawn(true);
      setPreview('');
    };

    const move = (event: PointerEvent) => {
      if (!drawing) {
        return;
      }
      const point = position(event);
      context.lineTo(point.x, point.y);
      context.stroke();
    };

    const stop = (event: PointerEvent) => {
      drawing = false;
      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
    };

    canvas.addEventListener('pointerdown', start);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', stop);
    canvas.addEventListener('pointerleave', stop);

    return () => {
      canvas.removeEventListener('pointerdown', start);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', stop);
      canvas.removeEventListener('pointerleave', stop);
    };
  }, []);

  return (
    <div className="rounded-[1.6rem] border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-slate-500">{label}</p>
        <button
          type="button"
          onClick={() => ref && typeof ref !== 'function' && ref.current?.clear()}
          className="rounded-full border border-slate-200 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-slate-600"
        >
          Effacer
        </button>
      </div>
      <div className="rounded-[1.2rem] border border-dashed border-blue-200 bg-slate-50 p-3">
        {preview ? (
          <img src={preview} alt={label} className="h-[220px] w-full rounded-[1rem] object-contain bg-white" />
        ) : null}
        <canvas
          ref={canvasRef}
          className={`h-[220px] w-full rounded-[1rem] bg-white ${preview ? 'mt-3' : ''}`}
        />
      </div>
      <p className="mt-3 text-xs text-slate-500">Dessinez a la main. Si vous ne redessinez pas, la signature existante sera conservee.</p>
    </div>
  );
});
