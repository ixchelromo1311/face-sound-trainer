import { useRef, useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface VideoPlayerProps {
  videoData: string;
  personName: string;
  onClose: () => void;
}

export const VideoPlayer = ({ videoData, personName, onClose }: VideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [showBlackScreen, setShowBlackScreen] = useState(false);

  useEffect(() => {
    // 2 second delay before showing video
    const showTimer = setTimeout(() => {
      setIsVisible(true);
      if (videoRef.current) {
        videoRef.current.play().catch(console.error);
      }
    }, 2000);

    return () => clearTimeout(showTimer);
  }, []);

  const handleVideoEnd = () => {
    // Start fade out animation
    setIsEnding(true);
    
    // After fade out, show black screen
    setTimeout(() => {
      setShowBlackScreen(true);
    }, 500);

    // Close after black screen fades in
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-500 ${
      showBlackScreen 
        ? 'bg-black' 
        : isVisible 
          ? 'bg-background/95 backdrop-blur-sm' 
          : 'bg-transparent'
    }`}>
      {/* Black screen overlay for ending */}
      {showBlackScreen && (
        <div className="absolute inset-0 bg-black animate-fade-in" />
      )}

      <div className={`relative w-full max-w-4xl bg-card border border-border/50 rounded-lg overflow-hidden border-glow transition-all duration-700 ${
        isVisible && !isEnding
          ? 'opacity-100 scale-100' 
          : 'opacity-0 scale-95'
      }`}>
        {/* Header */}
        <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between">
          <div className="px-4 py-2 bg-background/80 rounded-full border border-border/50">
            <p className="text-primary font-display text-sm uppercase tracking-wider">
              ¡Bienvenido, {personName}!
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-background/80 text-muted-foreground hover:text-foreground border border-border/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video */}
        <video
          ref={videoRef}
          src={videoData}
          className="w-full aspect-video object-contain bg-black"
          onEnded={handleVideoEnd}
          controls
          playsInline
        />
      </div>
    </div>
  );
};
