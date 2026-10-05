import { useState } from 'react';
import { ZoomIn, ZoomOut, RotateCw, Maximize, ExternalLink } from 'lucide-react';

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 4;

// Receipt image viewer with zoom & rotate. PDFs fall back to the browser's viewer.
export default function ReceiptViewer({ src }) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  if (!src) return <p className="m-auto text-slate-400">No receipt image</p>;

  if (src.toLowerCase().endsWith('.pdf')) {
    return <iframe src={src} title="Receipt PDF" className="h-full w-full" />;
  }

  const button = 'rounded p-1.5 text-slate-200 hover:bg-white/10';

  return (
    <div className="relative flex h-full w-full flex-col">
      <div className="flex-1 overflow-auto">
        <div className="flex min-h-full min-w-full items-center justify-center p-6">
          <img
            src={src}
            alt="Receipt"
            className="max-w-full object-contain transition-transform duration-150"
            style={{ transform: `scale(${zoom}) rotate(${rotation}deg)`, maxHeight: '80vh' }}
          />
        </div>
      </div>

      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-lg bg-slate-900/80 px-2 py-1 text-sm">
        <button className={button} onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z - 0.25))} aria-label="Zoom out">
          <ZoomOut className="h-4 w-4" />
        </button>
        <span className="w-12 text-center text-slate-200 tabular-nums">{Math.round(zoom * 100)}%</span>
        <button className={button} onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z + 0.25))} aria-label="Zoom in">
          <ZoomIn className="h-4 w-4" />
        </button>
        <button className={button} onClick={() => setRotation((r) => (r + 90) % 360)} aria-label="Rotate">
          <RotateCw className="h-4 w-4" />
        </button>
        <button
          className={button}
          onClick={() => {
            setZoom(1);
            setRotation(0);
          }}
          aria-label="Reset view"
        >
          <Maximize className="h-4 w-4" />
        </button>
        <a className={button} href={src} target="_blank" rel="noreferrer" aria-label="Open full size">
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
}
