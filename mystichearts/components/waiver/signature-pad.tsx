"use client";

import { Eraser } from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent } from "react";

// An optional drawn signature (the typed name is the legal signature). Exports a small PNG.
const WIDTH = 560;
const HEIGHT = 160;

export function SignaturePad({ onChange }: { onChange: (dataUrl: string | null) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [empty, setEmpty] = useState(true);

  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#f6ecdf";
  }, []);

  const point = (event: PointerEvent<HTMLCanvasElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    return { x: ((event.clientX - box.left) / box.width) * WIDTH, y: ((event.clientY - box.top) / box.height) * HEIGHT };
  };

  const start = (event: PointerEvent<HTMLCanvasElement>) => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drawing.current = true;
    const { x, y } = point(event);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };
  const move = (event: PointerEvent<HTMLCanvasElement>) => {
    const ctx = canvas.current?.getContext("2d");
    if (!drawing.current || !ctx) return;
    const { x, y } = point(event);
    ctx.lineTo(x, y);
    ctx.stroke();
    if (empty) setEmpty(false);
  };
  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    if (!empty && canvas.current) onChange(canvas.current.toDataURL("image/png"));
  };
  const clear = () => {
    const ctx = canvas.current?.getContext("2d");
    ctx?.clearRect(0, 0, WIDTH, HEIGHT);
    setEmpty(true);
    onChange(null);
  };

  return (
    <div className="wv-pad">
      <canvas
        ref={canvas}
        width={WIDTH}
        height={HEIGHT}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
        aria-label="Draw your signature here (optional)"
        role="img"
      />
      {empty ? (
        <span className="wv-pad-hint" aria-hidden="true">
          Draw your signature (optional)
        </span>
      ) : (
        <button type="button" className="wv-pad-clear" onClick={clear}>
          <Eraser size={14} aria-hidden="true" /> Clear
        </button>
      )}
    </div>
  );
}
