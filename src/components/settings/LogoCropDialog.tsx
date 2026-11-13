"use client";

import Image from "next/image";
import React, { useEffect, useRef, useState } from "react";

const OUTPUT_WIDTH = 240;
const OUTPUT_HEIGHT = 50;

interface CropResult {
  success: boolean;
  message?: string;
}

interface LogoCropDialogProps {
  file: File;
  source: string;
  onClose: () => void;
  onCrop: (file: File) => Promise<CropResult>;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export default function LogoCropDialog({ file, source, onClose, onCrop }: LogoCropDialogProps) {
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [frameSize, setFrameSize] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const frameRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<{ x: number; y: number; offsetX: number; offsetY: number } | null>(null);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    const measure = () => setFrameSize({ width: frame.clientWidth, height: frame.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [source]);

  const baseScale = imageSize.width && frameSize.width
    ? Math.max(frameSize.width / imageSize.width, frameSize.height / imageSize.height)
    : 1;
  const scale = baseScale * zoom;
  const renderedWidth = imageSize.width * scale;
  const renderedHeight = imageSize.height * scale;
  const ready = Boolean(source && imageSize.width && frameSize.width);

  const updateZoom = (value: number) => {
    const nextZoom = Number(value);
    const nextScale = baseScale * nextZoom;
    const maxX = Math.max(0, (imageSize.width * nextScale - frameSize.width) / 2);
    const maxY = Math.max(0, (imageSize.height * nextScale - frameSize.height) / 2);
    setZoom(nextZoom);
    setOffset((current) => ({
      x: clamp(current.x, -maxX, maxX),
      y: clamp(current.y, -maxY, maxY),
    }));
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!ready || processing) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStart.current = {
      x: event.clientX,
      y: event.clientY,
      offsetX: offset.x,
      offsetY: offset.y,
    };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const start = dragStart.current;
    if (!start || !ready) return;
    const maxX = Math.max(0, (renderedWidth - frameSize.width) / 2);
    const maxY = Math.max(0, (renderedHeight - frameSize.height) / 2);
    setOffset({
      x: clamp(start.offsetX + event.clientX - start.x, -maxX, maxX),
      y: clamp(start.offsetY + event.clientY - start.y, -maxY, maxY),
    });
  };

  const handleCrop = async () => {
    if (!ready || processing) return;
    setProcessing(true);
    setError("");

    try {
      const image = new window.Image();
      image.src = source;
      await image.decode();

      const sourceX = clamp((renderedWidth - frameSize.width) / 2 - offset.x, 0, imageSize.width * scale);
      const sourceY = clamp((renderedHeight - frameSize.height) / 2 - offset.y, 0, imageSize.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT_WIDTH;
      canvas.height = OUTPUT_HEIGHT;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Could not prepare the cropped image.");

      if (file.type === "image/jpeg") {
        context.fillStyle = "#FFFFFF";
        context.fillRect(0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);
      }

      const cropX = sourceX / scale;
      const cropY = sourceY / scale;
      const cropWidth = frameSize.width / scale;
      const cropHeight = frameSize.height / scale;
      context.drawImage(image, cropX, cropY, cropWidth, cropHeight, 0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (result) => result ? resolve(result) : reject(new Error("Could not create the cropped image.")),
          file.type,
          file.type === "image/jpeg" ? 0.92 : undefined
        );
      });
      const extension = file.type === "image/png" ? "png" : "jpg";
      const name = file.name.replace(/\.[^.]+$/, "") || "organizer-logo";
      const croppedFile = new File([blob], `${name}-cropped.${extension}`, { type: file.type });
      const result = await onCrop(croppedFile);
      if (result.success) onClose();
      else setError(result.message || "The cropped logo could not be uploaded. Please try again.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The image could not be cropped. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="logo-crop-title" onClick={processing ? undefined : onClose}>
      <div className="bg-white rounded-lg p-5 sm:p-6 w-full max-w-xl space-y-4 max-h-[calc(100dvh-2rem)] overflow-y-auto" onClick={(event) => event.stopPropagation()}>
        <div>
          <h3 id="logo-crop-title" className="text-base font-medium text-[#15191C]">Edit and crop logo</h3>
          <p className="mt-1 text-xs text-[#6B6B6B]">Drag to reposition, then zoom to fit the 240 × 50 logo area.</p>
        </div>

        <div
          ref={frameRef}
          className="relative w-full aspect-[24/5] overflow-hidden rounded-md border border-[#D2D2D2] bg-[#F3F3F3] cursor-grab active:cursor-grabbing touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={() => { dragStart.current = null; }}
          onPointerCancel={() => { dragStart.current = null; }}
        >
          {source && imageSize.width > 0 && (
            <Image
              src={source}
              alt="Logo crop area"
              width={Math.max(1, Math.ceil(renderedWidth))}
              height={Math.max(1, Math.ceil(renderedHeight))}
              unoptimized
              draggable={false}
              onLoad={(event) => setImageSize({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
              className="absolute max-w-none select-none pointer-events-none"
              style={{
                width: renderedWidth,
                height: renderedHeight,
                left: "50%",
                top: "50%",
                transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
              }}
            />
          )}
          {source && imageSize.width === 0 && (
            <Image
              src={source}
              alt=""
              width={1}
              height={1}
              unoptimized
              onLoad={(event) => setImageSize({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
              className="hidden"
            />
          )}
        </div>

        <label className="block text-xs font-medium text-[#15191C]" htmlFor="logo-crop-zoom">
          Zoom
        </label>
        <input
          id="logo-crop-zoom"
          type="range"
          min="1"
          max="3"
          step="0.01"
          value={zoom}
          onChange={(event) => updateZoom(Number(event.target.value))}
          disabled={!ready || processing}
          className="w-full accent-[#C65318] disabled:opacity-50"
        />
        {error && <p role="alert" className="text-xs font-medium text-rose-600">{error}</p>}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={processing} className="px-4 py-2 border border-[#D2D2D2] rounded-md text-sm font-medium hover:bg-gray-50 disabled:opacity-50">
            Cancel
          </button>
          <button type="button" onClick={handleCrop} disabled={!ready || processing} className="px-4 py-2 rounded-md bg-[#C65318] hover:bg-[#A83800] text-sm font-semibold text-white disabled:opacity-50">
            {processing ? "Uploading…" : "Crop and upload"}
          </button>
        </div>
      </div>
    </div>
  );
}
