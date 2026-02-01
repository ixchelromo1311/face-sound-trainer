import { useState, useEffect, useCallback } from 'react';
import { Scan, Settings, Loader2 } from 'lucide-react';
import { SimpleCameraView } from '@/components/SimpleCameraView';
import { MediaPlayer } from '@/components/MediaPlayer';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface MediaData {
  soundUrl: string | null;
  videoUrl: string | null;
  name: string;
}

const CameraOnly = () => {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [media, setMedia] = useState<MediaData | null>(null);
  const [isPlayingMedia, setIsPlayingMedia] = useState(false);

  // Load media from database (just get the first person's media)
  useEffect(() => {
    const loadMedia = async () => {
      try {
        const { data, error } = await supabase
          .from('registered_people')
          .select('name, sound_url, video_url')
          .limit(1)
          .single();

        if (error) {
          console.log('No media configured:', error.message);
        } else if (data) {
          setMedia({
            name: data.name,
            soundUrl: data.sound_url,
            videoUrl: data.video_url
          });
          console.log('Media loaded:', data);
        }
      } catch (err) {
        console.error('Error loading media:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadMedia();
  }, []);

  const handlePlayMedia = useCallback(() => {
    if (media && (media.soundUrl || media.videoUrl)) {
      setIsPlayingMedia(true);
    }
  }, [media]);

  const handleMediaClose = useCallback(() => {
    setIsPlayingMedia(false);
  }, []);

  return (
    <div className="h-[100dvh] bg-background flex flex-col overflow-hidden">
      {/* Minimal header */}
      <header className="flex-shrink-0 flex items-center justify-between p-2 sm:p-4 border-b border-border/30">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary/20 rounded-lg flex items-center justify-center">
            <Scan className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          </div>
          <h1 className="text-lg sm:text-xl font-display font-bold text-foreground">
            FaceGuard
          </h1>
        </div>

        <Link to="/admin">
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground w-8 h-8 sm:w-10 sm:h-10">
            <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
        </Link>
      </header>

      {/* Full screen camera */}
      <div className="flex-1 p-2 sm:p-4 flex flex-col min-h-0">
        <div className="flex-1 relative min-h-0">
          <SimpleCameraView
            media={media}
            isActive={isCameraActive}
            onToggle={() => setIsCameraActive(!isCameraActive)}
            onPlayMedia={handlePlayMedia}
          />
        </div>

        {/* Status bar */}
        <div className="flex-shrink-0 mt-2 sm:mt-4 flex items-center justify-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
          {isLoading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Cargando...
            </span>
          ) : (
            <>
              <span className="font-display">
                {media ? `Media: ${media.name}` : 'Sin media configurado'}
              </span>
              <span className="w-1 h-1 rounded-full bg-muted-foreground" />
              <span className={`flex items-center gap-1 sm:gap-2 ${isCameraActive ? 'text-success' : ''}`}>
                <span className={`w-2 h-2 rounded-full ${isCameraActive ? 'bg-success animate-pulse' : 'bg-muted-foreground'}`} />
                {isCameraActive ? 'Activo' : 'Inactivo'}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Media player */}
      {isPlayingMedia && media && (
        <MediaPlayer
          videoUrl={media.videoUrl}
          soundUrl={media.soundUrl}
          personName={media.name}
          onClose={handleMediaClose}
        />
      )}
    </div>
  );
};

export default CameraOnly;
