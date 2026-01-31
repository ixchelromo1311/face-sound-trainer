import { useState, useCallback } from 'react';
import { Scan, Settings } from 'lucide-react';
import { CameraView } from '@/components/CameraView';
import { VideoPlayer } from '@/components/VideoPlayer';
import { usePersonStorage } from '@/hooks/usePersonStorage';
import { DetectionResult, RegisteredPerson } from '@/types/face';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const CameraOnly = () => {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [lastDetection, setLastDetection] = useState<string | null>(null);
  const [videoToPlay, setVideoToPlay] = useState<{ data: string; name: string } | null>(null);

  const { people } = usePersonStorage();

  const handleDetection = useCallback((result: DetectionResult) => {
    if (result.personId && result.personName) {
      // Find the person to check if they have a video
      const person = people.find(p => p.id === result.personId);
      
      if (person?.videoData && !videoToPlay) {
        // Play video if person has one and no video is currently playing
        setVideoToPlay({ data: person.videoData, name: person.name });
      } else if (!person?.videoData) {
        // Show text notification if no video
        setLastDetection(result.personName);
        setTimeout(() => setLastDetection(null), 3000);
      }
    }
  }, [people, videoToPlay]);

  const handleVideoClose = () => {
    setVideoToPlay(null);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Minimal header */}
      <header className="flex items-center justify-between p-4 border-b border-border/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
            <Scan className="w-5 h-5 text-primary" />
          </div>
          <h1 className="text-xl font-display font-bold text-foreground">
            FaceGuard
          </h1>
        </div>

        <Link to="/admin">
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
            <Settings className="w-5 h-5" />
          </Button>
        </Link>
      </header>

      {/* Full screen camera */}
      <div className="flex-1 p-4 flex flex-col">
        <div className="flex-1 relative">
          <CameraView
            registeredPeople={people}
            onDetection={handleDetection}
            isActive={isCameraActive}
            onToggle={() => setIsCameraActive(!isCameraActive)}
          />


          {/* Detection notification */}
          {lastDetection && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 px-6 py-3 bg-success/20 border border-success/50 rounded-full animate-pulse">
              <p className="text-success font-display text-lg">
                ¡Hola, {lastDetection}!
              </p>
            </div>
          )}
        </div>

        {/* Status bar */}
        <div className="mt-4 flex items-center justify-center gap-4 text-sm text-muted-foreground">
          <span className="font-display">
            {people.length} persona{people.length !== 1 ? 's' : ''} registrada{people.length !== 1 ? 's' : ''}
          </span>
          <span className="w-1 h-1 rounded-full bg-muted-foreground" />
          <span className={`flex items-center gap-2 ${isCameraActive ? 'text-success' : ''}`}>
            <span className={`w-2 h-2 rounded-full ${isCameraActive ? 'bg-success animate-pulse' : 'bg-muted-foreground'}`} />
            {isCameraActive ? 'Activo' : 'Inactivo'}
          </span>
        </div>
      </div>
      {/* Video player modal */}
      {videoToPlay && (
        <VideoPlayer
          videoData={videoToPlay.data}
          personName={videoToPlay.name}
          onClose={handleVideoClose}
        />
      )}
    </div>
  );
};

export default CameraOnly;
