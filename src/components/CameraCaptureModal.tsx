import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Camera,
  X,
  RefreshCw,
  Check,
  RotateCcw,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (imageDataUrl: string) => void;
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  isOpen,
  onClose,
  onCapture,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // Check if multiple cameras are available
  useEffect(() => {
    if (navigator.mediaDevices?.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices().then((devices) => {
        const videoDevices = devices.filter((d) => d.kind === 'videoinput');
        setHasMultipleCameras(videoDevices.length > 1);
      });
    }
  }, []);

  // Start camera stream
  const startCamera = useCallback(async (mode: 'environment' | 'user') => {
    setIsInitializing(true);
    setCameraError(null);

    // Stop existing stream if any
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Akses kamera tidak didukung di peramban ini.');
      }

      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      setStream(newStream);

      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        videoRef.current.play().catch((err) => {
          console.warn('Video play error:', err);
        });
      }
    } catch (err: any) {
      console.warn('Camera error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Izin akses kamera belum diberikan. Harap izinkan akses kamera pada browser Anda.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('Perangkat kamera tidak ditemukan.');
      } else {
        setCameraError('Tidak dapat membuka kamera: ' + (err.message || 'Kesalahan hardware'));
      }
    } finally {
      setIsInitializing(false);
    }
  }, []);

  // Open/Close life cycle
  useEffect(() => {
    if (isOpen) {
      setCapturedImage(null);
      startCamera(facingMode);
    } else {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
        setStream(null);
      }
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [isOpen, facingMode]);

  // Handle Switch Camera (Front / Back)
  const handleToggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  // Capture frame to canvas
  const handleSnapPhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');

    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setCapturedImage(dataUrl);

    // Pause video playback temporarily
    video.pause();
  };

  // Retake photo
  const handleRetake = () => {
    setCapturedImage(null);
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  };

  // Confirm photo and pass back
  const handleConfirm = () => {
    if (!capturedImage) return;
    onCapture(capturedImage);
    handleClose();
  };

  // Close & release stream
  const handleClose = () => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
    setCapturedImage(null);
    onClose();
  };

  // Fallback upload if camera fails
  const handleFallbackFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      onCapture(dataUrl);
      handleClose();
    };
    reader.readAsDataURL(file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-0 sm:p-5 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-neutral-950 rounded-none sm:rounded-3xl overflow-hidden border-0 sm:border border-neutral-800 shadow-2xl flex flex-col h-full sm:h-auto sm:max-h-[92vh]">
        {/* Top Floating Control Bar */}
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-5 py-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold tracking-wide text-white/90 uppercase font-mono">
              Pemindai Struk
            </span>
          </div>

          <div className="flex items-center gap-3">
            {hasMultipleCameras && !capturedImage && (
              <button
                type="button"
                onClick={handleToggleFacingMode}
                className="p-2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-md transition-colors cursor-pointer"
                title="Ganti Kamera Depan/Belakang"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={handleClose}
              className="p-2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-md transition-colors cursor-pointer"
              title="Tutup Kamera"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Viewfinder Area */}
        <div className="relative flex-1 bg-black aspect-[3/4] sm:aspect-[4/5] flex items-center justify-center overflow-hidden">
          {capturedImage ? (
            /* Snapshot Preview */
            <img
              src={capturedImage}
              alt="Hasil Jepretan Struk"
              className="w-full h-full object-contain"
            />
          ) : cameraError ? (
            /* Error State with fallback file input */
            <div className="p-6 text-center text-neutral-300 space-y-3 max-w-xs">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <p className="text-xs text-neutral-400 leading-relaxed">{cameraError}</p>
              <div>
                <label className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors cursor-pointer">
                  <span>Pilih dari Galeri</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFallbackFileInput}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          ) : (
            /* Live Camera Feed */
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* Elegant Scanner Bounding Overlay */}
              <div className="absolute inset-8 sm:inset-10 pointer-events-none flex flex-col justify-between">
                {/* Top Corner Markers */}
                <div className="flex justify-between">
                  <div className="w-6 h-6 border-t-2 border-l-2 border-emerald-400 rounded-tl-lg" />
                  <div className="w-6 h-6 border-t-2 border-r-2 border-emerald-400 rounded-tr-lg" />
                </div>

                {/* Center scan line guidance */}
                <div className="text-center px-4">
                  <span className="text-[11px] font-medium text-white/70 bg-black/40 backdrop-blur-sm px-3 py-1 rounded-full">
                    Arahkan kamera ke struk belanja
                  </span>
                </div>

                {/* Bottom Corner Markers */}
                <div className="flex justify-between">
                  <div className="w-6 h-6 border-b-2 border-l-2 border-emerald-400 rounded-bl-lg" />
                  <div className="w-6 h-6 border-b-2 border-r-2 border-emerald-400 rounded-br-lg" />
                </div>
              </div>
            </>
          )}

          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Bottom Shutter / Action Controls */}
        <div className="px-6 py-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] bg-neutral-950 border-t border-neutral-900 flex items-center justify-around">
          {capturedImage ? (
            /* Confirm or Retake Options */
            <div className="flex items-center justify-between w-full gap-4">
              <button
                type="button"
                onClick={handleRetake}
                className="flex-1 py-3 px-4 text-xs font-semibold text-neutral-300 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-2xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Foto Ulang</span>
              </button>

              <button
                type="button"
                onClick={handleConfirm}
                className="flex-1 py-3 px-3 sm:px-4 text-[11px] sm:text-xs font-semibold text-neutral-950 bg-emerald-400 hover:bg-emerald-300 rounded-2xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 shrink-0" />
                <span className="truncate">Pakai & Pindai AI</span>
              </button>
            </div>
          ) : (
            /* Live Shutter Button */
            <div className="flex items-center justify-center w-full relative">
              <button
                type="button"
                onClick={handleSnapPhoto}
                disabled={isInitializing || !!cameraError}
                className="w-18 h-18 rounded-full border-4 border-white/20 p-1 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform disabled:opacity-50 cursor-pointer"
              >
                <div className="w-full h-full bg-white rounded-full flex items-center justify-center shadow-lg">
                  <Camera className="w-6 h-6 text-neutral-950" />
                </div>
              </button>

              {/* Secondary Gallery file picker icon */}
              <label
                className="absolute right-0 text-white/70 hover:text-white text-xs flex flex-col items-center gap-1 cursor-pointer"
                title="Buka dari file galeri"
              >
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFallbackFileInput}
                  className="hidden"
                />
                <span className="text-[11px] font-medium bg-neutral-900 border border-neutral-800 px-3 py-1.5 rounded-xl hover:bg-neutral-800 transition-colors">
                  Galeri
                </span>
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
