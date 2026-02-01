import { useRef, useEffect, useState, useCallback } from 'react';
import { Camera, CameraOff, Loader2 } from 'lucide-react';
import { useSimpleFaceDetection } from '@/hooks/useSimpleFaceDetection';
import { FacePositionGuide } from '@/components/FacePositionGuide';

interface MediaData {
  soundUrl: string | null;
  videoUrl: string | null;
  name: string;
}

interface SimpleCameraViewProps {
  media: MediaData | null;
  isActive: boolean;
  onToggle: () => void;
  onPlayMedia: () => void;
}

export const SimpleCameraView = ({ media, isActive, onToggle, onPlayMedia }: SimpleCameraViewProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [isFaceDetected, setIsFaceDetected] = useState(false);
  const [isFaceAligned, setIsFaceAligned] = useState(false);
  
  const {
    isModelLoaded,
    isLoading,
    error,
    loadModels,
    startCamera,
    stopCamera,
    startDetection,
    resetPlayingState
  } = useSimpleFaceDetection();

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  useEffect(() => {
    let cancelled = false;
    const videoEl = videoRef.current;
    if (!videoEl) return;

    const markReady = () => {
      if (cancelled) return;
      if (videoEl.videoWidth > 0 && videoEl.videoHeight > 0) {
        setIsVideoReady(true);
        videoEl.play().catch(() => {});
      }
    };

    const handleCamera = async () => {
      if (isActive && isModelLoaded) {
        setIsVideoReady(false);
        videoEl.addEventListener('loadedmetadata', markReady);
        videoEl.addEventListener('canplay', markReady);

        const success = await startCamera(videoEl);
        if (success) {
          markReady();
        }
      } else {
        stopCamera();
        setIsVideoReady(false);
        setIsFaceDetected(false);
      }
    };

    handleCamera();

    return () => {
      cancelled = true;
      videoEl.removeEventListener('loadedmetadata', markReady);
      videoEl.removeEventListener('canplay', markReady);
    };
  }, [isActive, isModelLoaded, startCamera, stopCamera]);

  const handleFaceDetected = useCallback((detected: boolean, box?: { x: number; y: number; width: number; height: number }) => {
    setIsFaceDetected(detected);
    
    // Check if face is centered (within the oval guide area)
    if (detected && box && videoRef.current) {
      const videoWidth = videoRef.current.videoWidth;
      const videoHeight = videoRef.current.videoHeight;
      
      const faceCenterX = box.x + box.width / 2;
      const faceCenterY = box.y + box.height / 2;
      
      const centerX = videoWidth / 2;
      const centerY = videoHeight / 2;
      
      // Face is aligned if center is within 20% of video center
      const toleranceX = videoWidth * 0.2;
      const toleranceY = videoHeight * 0.2;
      
      const isAligned = 
        Math.abs(faceCenterX - centerX) < toleranceX &&
        Math.abs(faceCenterY - centerY) < toleranceY;
      
      setIsFaceAligned(isAligned);
    } else {
      setIsFaceAligned(false);
    }
  }, []);

  const handlePlayMedia = useCallback(() => {
    onPlayMedia();
  }, [onPlayMedia]);

  useEffect(() => {
    if (isVideoReady && isActive) {
      startDetection(media, handleFaceDetected, handlePlayMedia);
    }
  }, [isVideoReady, isActive, media, handleFaceDetected, handlePlayMedia, startDetection]);

  // Reset playing state when media playback ends (called externally)
  useEffect(() => {
    return () => {
      resetPlayingState();
    };
  }, [resetPlayingState]);

  return (
    <div className="relative w-full h-full bg-black rounded-lg overflow-hidden">
      {/* Video feed */}
      <video
        ref={videoRef}
        className={`w-full h-full object-cover ${isActive ? 'block' : 'hidden'}`}
        playsInline
        muted
      />

      {/* Face position guide overlay - estilo Face ID */}
      {isActive && isVideoReady && (
        <FacePositionGuide
          isFaceDetected={isFaceDetected}
          isFaceAligned={isFaceAligned}
          isScanning={isActive && isVideoReady}
        />
      )}

      {/* Status overlays */}
      {!isActive && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-secondary/50">
          <CameraOff className="w-12 h-12 sm:w-16 sm:h-16 text-muted-foreground" />
          <p className="text-muted-foreground font-display text-sm sm:text-base">Cámara desactivada</p>
        </div>
      )}

      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background/90">
          <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 text-primary animate-spin" />
          <p className="text-primary font-display text-xs sm:text-sm">Cargando modelo...</p>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-destructive/10">
          <p className="text-destructive font-display text-xs sm:text-sm px-4 text-center">{error}</p>
        </div>
      )}

      {/* Control button */}
      <button
        onClick={onToggle}
        disabled={isLoading}
        className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 sm:px-6 py-2 sm:py-3 bg-primary text-primary-foreground rounded-full font-display text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2 hover:opacity-90 transition-all disabled:opacity-50 z-30"
      >
        {isActive ? (
          <>
            <CameraOff className="w-3 h-3 sm:w-4 sm:h-4" />
            Detener
          </>
        ) : (
          <>
            <Camera className="w-3 h-3 sm:w-4 sm:h-4" />
            Iniciar
          </>
        )}
      </button>

      {/* Status indicator */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-background/80 rounded-full border border-border/50 z-30">
        <div className={`w-2 h-2 rounded-full ${isActive && isVideoReady ? 'bg-success animate-pulse' : 'bg-muted-foreground'}`} />
        <span className="text-[10px] sm:text-xs font-display uppercase tracking-wider">
          {isActive && isVideoReady ? 'Escaneando' : 'Inactivo'}
        </span>
      </div>
    </div>
  );
};
