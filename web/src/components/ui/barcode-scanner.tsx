'use client';

import { useEffect, useRef, useState } from 'react';

type BarcodeScannerProps = {
  onDetected: (code: string) => void;
};

type BarcodeDetectorCtor = new (options?: { formats?: string[] }) => {
  detect: (source: CanvasImageSource) => Promise<Array<{ rawValue?: string }>>;
};

declare global {
  interface Window {
    BarcodeDetector?: BarcodeDetectorCtor;
  }
}

export function BarcodeScanner({ onDetected }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [supported, setSupported] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let stream: MediaStream | null = null;
    let timer: number | null = null;
    let active = true;

    async function start() {
      if (!window.BarcodeDetector) {
        setSupported(false);
        setError('Le scan camera n’est pas supporte sur ce navigateur. Utilisez la saisie manuelle.');
        return;
      }

      setSupported(true);
      const detector = new window.BarcodeDetector({
        formats: ['code_128', 'ean_13', 'ean_8', 'qr_code', 'upc_a', 'upc_e'],
      });

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });

        if (!videoRef.current) {
          return;
        }

        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        timer = window.setInterval(async () => {
          if (!active || !videoRef.current) {
            return;
          }

          try {
            const results = await detector.detect(videoRef.current);
            const code = results.find((item) => item.rawValue)?.rawValue;
            if (code) {
              onDetected(code);
            }
          } catch {
            // Ignore intermittent scan frames.
          }
        }, 700);
      } catch {
        setError('Impossible d’acceder a la camera. Autorisez-la ou utilisez la saisie manuelle.');
      }
    }

    start();

    return () => {
      active = false;
      if (timer != null) {
        window.clearInterval(timer);
      }
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [onDetected]);

  return (
    <div className="rounded-[1.6rem] border border-slate-200 bg-white p-4">
      <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-blue-600">Scan camera</p>
      <div className="mt-4 overflow-hidden rounded-[1.4rem] border border-slate-200 bg-slate-950">
        <video ref={videoRef} muted playsInline className="h-[280px] w-full object-cover" />
      </div>
      {error ? <p className="mt-3 text-sm font-semibold text-red-600">{error}</p> : null}
      {!supported && !error ? <p className="mt-3 text-sm text-slate-500">Verification du support camera...</p> : null}
    </div>
  );
}
