"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  pdfUrl: string;
  pageNumber: number;
};

export default function PdfPageViewer({ pdfUrl, pageNumber }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      setError(null);
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

        const doc = await pdfjs.getDocument(pdfUrl).promise;
        const page = await doc.getPage(Math.min(Math.max(1, pageNumber), doc.numPages));
        const viewport = page.getViewport({ scale: 1.35 });
        const canvas = canvasRef.current;
        if (!canvas || cancelled) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await page.render({ canvasContext: ctx, viewport }).promise;
      } catch {
        if (!cancelled) setError("Could not render PDF page — switch to extracted text.");
      }
    }

    render();
    return () => {
      cancelled = true;
    };
  }, [pdfUrl, pageNumber]);

  if (error) {
    return <p className="source-inline-error">{error}</p>;
  }

  return (
    <div className="pdf-viewer-wrap panel panel-elevated">
      <canvas ref={canvasRef} className="pdf-viewer-canvas" />
    </div>
  );
}
