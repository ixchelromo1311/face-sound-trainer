import { useRef, useEffect, useState } from 'react';
import { Camera, CameraOff, Loader2 } from 'lucide-react';
import { useFaceDetection } from '@/hooks/useFaceDetection';
import { RegisteredPerson, DetectionResult } from '@/types/face';

interface CameraViewProps {
  registeredPeople: RegisteredPerson[];
  onDetection: (result: DetectionResult) => void;
  isActive: boolean;
  onToggle: () => void;
}

export const CameraView = ({ registeredPeople, onDetection, isActive, onToggle }: CameraViewProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isVideoReady, setIsVideoReady] = useState(false);
  
  const {
    isModelLoaded,
    isLoading,
    error,
    loadModels,
    startCamera,
    stopCamera,
    startDetection
  } = useFaceDetection();

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  useEffect(() => {
    let cancelled = false;
    const videoEl = videoRef.current;
    if (!videoEl) return;

    const markReady = () => {
      if (cancelled) return;
      // Wait until we have real dimensions; otherwise face-api will struggle / return nothing.
      if (videoEl.videoWidth > 0 && videoEl.videoHeight > 0) {
        setIsVideoReady(true);
        videoEl.play().catch(() => {
          // Autoplay can still be blocked in some contexts; detection can still run.
        });
      }
    };

    const handleCamera = async () => {
      if (isActive && isModelLoaded) {
        setIsVideoReady(false);

        // Attach listeners BEFORE setting srcObject to avoid missing the event.
        videoEl.addEventListener('loadedmetadata', markReady);
        videoEl.addEventListener('loadeddata', markReady);
        videoEl.addEventListener('canplay', markReady);

        const success = await startCamera(videoEl);
        if (success) {
          // In case events already fired.
          markReady();
        }
      } else {
        stopCamera();
        setIsVideoReady(false);
      }
    };

    handleCamera();

    return () => {
      cancelled = true;
      videoEl.removeEventListener('loadedmetadata', markReady);
      videoEl.removeEventListener('loadeddata', markReady);
      videoEl.removeEventListener('canplay', markReady);
    };
  }, [isActive, isModelLoaded, startCamera, stopCamera]);

  useEffect(() => {
    if (isVideoReady && canvasRef.current && isActive) {
      startDetection(registeredPeople, onDetection, canvasRef.current);
    }
  }, [isVideoReady, isActive, registeredPeople, onDetection, startDetection]);

  return (
    <div className="relative w-full aspect-video bg-secondary/50 rounded-lg overflow-hidden border border-border/50 border-glow">
      {/* Scanner overlay */}
      {isActive && isVideoReady && (
        <div className="absolute inset-0 pointer-events-none z-10">
          <div className="scanner-line absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-60" />
          <div className="absolute inset-0 border-2 border-primary/30 rounded-lg" />
          <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-primary" />
          <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-primary" />
          <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-primary" />
          <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-primary" />
        </div>
      )}

      {/* Video feed */}
      <video
        ref={videoRef}
        className={`w-full h-full object-cover ${isActive ? 'block' : 'hidden'}`}
        playsInline
        muted
      />

      {/* Detection canvas overlay */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />

      {/* Status overlays */}
      {!isActive && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
          <CameraOff className="w-16 h-16 text-muted-foreground" />
          <p className="text-muted-foreground font-display">Cámara desactivada</p>
        </div>
      )}

      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background/80">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
          <p className="text-primary font-display text-sm">Cargando modelos...</p>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-destructive/10">
          <p className="text-destructive font-display text-sm">{error}</p>
        </div>
      )}

      {/* Control button */}
      <button
        onClick={onToggle}
        disabled={isLoading}
        className="absolute bottom-4 left-1/2 -translate-x-1/2 px-6 py-3 bg-primary text-primary-foreground rounded-full font-display text-sm uppercase tracking-wider flex items-center gap-2 hover:glow-primary transition-all disabled:opacity-50"
      >
        {isActive ? (
          <>
            <CameraOff className="w-4 h-4" />
            Detener
          </>
        ) : (
          <>
            <Camera className="w-4 h-4" />
            Iniciar
          </>
        )}
      </button>

      {/* Status indicator */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 bg-background/80 rounded-full border border-border/50">
        <div className={`w-2 h-2 rounded-full ${isActive && isVideoReady ? 'bg-success animate-pulse' : 'bg-muted-foreground'}`} />
        <span className="text-xs font-display uppercase tracking-wider">
          {isActive && isVideoReady ? 'Escaneando' : 'Inactivo'}
        </span>
      </div>
    </div>
  );
};
