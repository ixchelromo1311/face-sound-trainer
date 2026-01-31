import { useRef, useEffect } from 'react';
import { X } from 'lucide-react';

interface VideoPlayerProps {
  videoData: string;
  personName: string;
  onClose: () => void;
}

export const VideoPlayer = ({ videoData, personName, onClose }: VideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(console.error);
    }
  }, []);

  const handleVideoEnd = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="relative w-full max-w-4xl bg-card border border-border/50 rounded-lg overflow-hidden border-glow animate-scale-in">
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
