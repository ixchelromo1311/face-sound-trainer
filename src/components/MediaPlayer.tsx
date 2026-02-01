import { useEffect, useRef, useState } from 'react';

interface MediaPlayerProps {
  videoUrl: string | null;
  soundUrl: string | null;
  personName: string;
  onClose: () => void;
}

export const MediaPlayer = ({ videoUrl, soundUrl, personName, onClose }: MediaPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Fade in
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Play audio if no video, or both
    if (soundUrl && !videoUrl) {
      const audio = new Audio(soundUrl);
      audio.volume = 1.0;
      audioRef.current = audio as unknown as HTMLAudioElement;
      
      audio.onended = () => {
        handleClose();
      };
      
      audio.onerror = (e) => {
        console.error('Audio error:', e);
        handleClose();
      };
      
      audio.play().catch(err => {
        console.error('Audio play failed:', err);
        handleClose();
      });
    }
  }, [soundUrl, videoUrl]);

  useEffect(() => {
    if (videoUrl && videoRef.current) {
      const video = videoRef.current;
      video.muted = false;
      video.volume = 1.0;
      
      // Try to play with sound
      video.play().catch(err => {
        console.error('Video play failed, trying muted:', err);
        // If autoplay fails, try muted first then unmute
        video.muted = true;
        video.play().then(() => {
          // Unmute after play starts
          setTimeout(() => {
            video.muted = false;
          }, 100);
        }).catch(console.error);
      });
    }
    
    // Also play audio if both video and audio are present
    if (videoUrl && soundUrl) {
      const audio = new Audio(soundUrl);
      audio.volume = 1.0;
      audioRef.current = audio as unknown as HTMLAudioElement;
      
      audio.play().catch(err => {
        console.log('Separate audio play failed (expected with video):', err);
      });
    }
  }, [videoUrl, soundUrl]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 500);
  };

  const handleVideoEnded = () => {
    handleClose();
  };

  const handleVideoError = () => {
    console.error('Video error');
    handleClose();
  };

  // If only audio, show a simple notification
  if (!videoUrl && soundUrl) {
    return (
      <div 
        className={`fixed inset-0 z-50 flex items-center justify-center bg-black/80 transition-opacity duration-500 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleClose}
      >
        <div className="text-center">
          <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
            <svg className="w-12 h-12 text-primary" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
            </svg>
          </div>
          <p className="text-white font-display text-2xl">
            ¡Hola, {personName}!
          </p>
        </div>
      </div>
    );
  }

  // Video player
  if (videoUrl) {
    return (
      <div 
        className={`fixed inset-0 z-50 bg-black transition-opacity duration-500 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full h-full object-contain"
          playsInline
          onEnded={handleVideoEnded}
          onError={handleVideoError}
          onClick={handleClose}
        />
        
      </div>
    );
  }

  return null;
};
