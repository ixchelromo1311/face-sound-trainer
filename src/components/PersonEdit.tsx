import { useState, useRef, useEffect } from 'react';
import { Edit, Camera, Volume2, Loader2, Check, X, Upload, Music, RotateCcw, Video } from 'lucide-react';
import { useFaceDetection } from '@/hooks/useFaceDetection';
import { RegisteredPerson } from '@/types/face';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface PersonEditProps {
  person: RegisteredPerson;
  onSave: (person: RegisteredPerson) => void;
  onClose: () => void;
}

const DEFAULT_SOUNDS = [
  { name: 'Bienvenido', url: 'https://www.soundjay.com/buttons/beep-01a.mp3' },
  { name: 'Alerta', url: 'https://www.soundjay.com/buttons/beep-07.mp3' },
  { name: 'Confirmación', url: 'https://www.soundjay.com/buttons/beep-08b.mp3' },
];

const REQUIRED_CAPTURES = 5;

export const PersonEdit = ({ person, onSave, onClose }: PersonEditProps) => {
  const [name, setName] = useState(person.name);
  const [selectedSound, setSelectedSound] = useState(
    person.soundData ? 'custom' : person.soundUrl
  );
  const [customSoundData, setCustomSoundData] = useState<string | null>(person.soundData || null);
  const [customSoundName, setCustomSoundName] = useState<string | null>(
    person.soundData ? 'Audio personalizado' : null
  );
  const [videoData, setVideoData] = useState<string | null>(person.videoData || null);
  const [videoName, setVideoName] = useState<string | null>(
    person.videoData ? 'Video personalizado' : null
  );
  const [isRecapturing, setIsRecapturing] = useState(false);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [capturedDescriptors, setCapturedDescriptors] = useState<Float32Array[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const {
    isModelLoaded,
    isLoading,
    loadModels,
    startCamera,
    stopCamera,
    captureDescriptor,
    captureSnapshot
  } = useFaceDetection();

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  useEffect(() => {
    if (isRecapturing && isModelLoaded && videoRef.current && !cameraActive) {
      startCamera(videoRef.current).then(success => {
        if (success) {
          videoRef.current?.play();
          setCameraActive(true);
        }
      });
    }

    return () => {
      if (!isRecapturing) {
        stopCamera();
        setCameraActive(false);
      }
    };
  }, [isRecapturing, isModelLoaded, startCamera, stopCamera, cameraActive]);

  const handleCapture = async () => {
    setIsCapturing(true);

    const descriptor = await captureDescriptor();
    const image = captureSnapshot();

    if (descriptor && image) {
      const newDescriptors = [...capturedDescriptors, descriptor];
      const newImages = [...capturedImages, image];

      setCapturedDescriptors(newDescriptors);
      setCapturedImages(newImages);

      if (newDescriptors.length >= REQUIRED_CAPTURES) {
        stopCamera();
        setCameraActive(false);
        setIsRecapturing(false);
      }
    } else {
      alert('No se detectó ningún rostro. Por favor, posiciona tu cara frente a la cámara.');
    }

    setIsCapturing(false);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      alert('Por favor selecciona un archivo de audio válido (MP3, WAV, etc.)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setCustomSoundData(base64);
      setCustomSoundName(file.name);
      setSelectedSound('custom');
    };
    reader.readAsDataURL(file);
  };

  const handleVideoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      alert('Por favor selecciona un archivo de video válido (MP4, WebM, etc.)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setVideoData(base64);
      setVideoName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    const updatedPerson: RegisteredPerson = {
      ...person,
      name,
      soundUrl: selectedSound === 'custom' ? '' : selectedSound,
      soundData: selectedSound === 'custom' ? customSoundData || undefined : undefined,
      videoData: videoData || undefined,
      ...(capturedDescriptors.length > 0 && {
        descriptors: capturedDescriptors,
        imageDataUrl: capturedImages[0]
      })
    };

    onSave(updatedPerson);
    onClose();
  };

  const playSound = (url: string) => {
    if (url === 'custom' && customSoundData) {
      const audio = new Audio(customSoundData);
      audio.play().catch(console.error);
    } else if (url !== 'custom') {
      const audio = new Audio(url);
      audio.play().catch(console.error);
    }
  };

  const startRecapture = () => {
    setCapturedImages([]);
    setCapturedDescriptors([]);
    setIsRecapturing(true);
  };

  const cancelRecapture = () => {
    stopCamera();
    setCameraActive(false);
    setCapturedImages([]);
    setCapturedDescriptors([]);
    setIsRecapturing(false);
  };

  const capturesRemaining = REQUIRED_CAPTURES - capturedDescriptors.length;
  const hasNewCaptures = capturedDescriptors.length >= REQUIRED_CAPTURES;

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card border border-border/50 rounded-lg p-6 animate-scale-in border-glow max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-display text-foreground flex items-center gap-2">
            <Edit className="w-5 h-5 text-primary" />
            Editar Persona
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Name edit */}
          <div>
            <label className="block text-sm text-muted-foreground mb-2">Nombre</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre de la persona"
              className="bg-secondary border-border/50"
            />
          </div>

          {/* Photo section */}
          <div>
            <label className="block text-sm text-muted-foreground mb-2">Fotos de reconocimiento</label>
            
            {!isRecapturing ? (
              <div className="space-y-3">
                <div className="flex justify-center">
                  <img
                    src={hasNewCaptures ? capturedImages[0] : person.imageDataUrl}
                    alt={name}
                    className="w-24 h-24 rounded-full object-cover border-2 border-primary glow-primary"
                  />
                </div>
                {hasNewCaptures && (
                  <p className="text-center text-sm text-success">
                    ✓ Nuevas fotos capturadas
                  </p>
                )}
                <Button
                  onClick={startRecapture}
                  variant="outline"
                  className="w-full border-primary/50 text-primary hover:bg-primary/10"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Recapturar fotos
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Captured images preview */}
                {capturedImages.length > 0 && (
                  <div className="flex gap-2 justify-center mb-4">
                    {capturedImages.map((img, idx) => (
                      <img
                        key={idx}
                        src={img}
                        alt={`Captura ${idx + 1}`}
                        className="w-12 h-12 rounded-full object-cover border-2 border-success"
                      />
                    ))}
                    {Array.from({ length: capturesRemaining }).map((_, idx) => (
                      <div
                        key={`empty-${idx}`}
                        className="w-12 h-12 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center"
                      >
                        <span className="text-xs text-muted-foreground">{capturedImages.length + idx + 1}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="relative aspect-video bg-secondary rounded-lg overflow-hidden border border-border/50">
                  {isLoading ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    </div>
                  ) : (
                    <>
                      <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
                      <div className="absolute inset-0 border-2 border-primary/30 rounded-lg pointer-events-none" />
                    </>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleCapture}
                    disabled={isCapturing || isLoading}
                    className="flex-1 bg-primary text-primary-foreground"
                  >
                    {isCapturing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Camera className="w-4 h-4 mr-2" />
                        {capturedDescriptors.length + 1}/{REQUIRED_CAPTURES}
                      </>
                    )}
                  </Button>
                  <Button onClick={cancelRecapture} variant="outline">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Video section */}
          <div>
            <label className="block text-sm text-muted-foreground mb-2">Video de bienvenida</label>
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              onChange={handleVideoUpload}
              className="hidden"
            />
            <button
              onClick={() => videoInputRef.current?.click()}
              className={`w-full p-4 rounded-lg flex items-center justify-center gap-3 transition-all border-2 border-dashed ${
                videoData
                  ? 'bg-primary/20 border-primary'
                  : 'bg-secondary/50 border-muted-foreground/30 hover:border-primary/50'
              }`}
            >
              {videoData ? (
                <>
                  <Video className="w-5 h-5 text-success" />
                  <span className="text-foreground">{videoName}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setVideoData(null);
                      setVideoName(null);
                    }}
                    className="p-2 rounded-full bg-destructive/20 text-destructive hover:bg-destructive/30"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5 text-primary" />
                  <span className="text-muted-foreground">Subir video (MP4, WebM)</span>
                </>
              )}
            </button>
          </div>

          {/* Sound section */}
          <div>
            <label className="block text-sm text-muted-foreground mb-2">Sonido de notificación</label>
            
            {/* Custom sound upload */}
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className={`w-full p-4 rounded-lg flex items-center justify-center gap-3 transition-all border-2 border-dashed mb-3 ${
                selectedSound === 'custom'
                  ? 'bg-primary/20 border-primary'
                  : 'bg-secondary/50 border-muted-foreground/30 hover:border-primary/50'
              }`}
            >
              {customSoundData ? (
                <>
                  <Music className="w-5 h-5 text-success" />
                  <span className="text-foreground">{customSoundName}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      playSound('custom');
                    }}
                    className="p-2 rounded-full bg-primary/20 text-primary hover:bg-primary/30"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5 text-primary" />
                  <span className="text-muted-foreground">Subir archivo MP3</span>
                </>
              )}
            </button>

            <div className="space-y-2">
              {DEFAULT_SOUNDS.map((sound) => (
                <button
                  key={sound.url}
                  onClick={() => setSelectedSound(sound.url)}
                  className={`w-full p-3 rounded-lg flex items-center justify-between transition-all ${
                    selectedSound === sound.url
                      ? 'bg-primary/20 border border-primary'
                      : 'bg-secondary border border-border/50 hover:border-primary/50'
                  }`}
                >
                  <span className="text-foreground">{sound.name}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      playSound(sound.url);
                    }}
                    className="p-2 rounded-full bg-primary/20 text-primary hover:bg-primary/30"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </button>
              ))}
            </div>
          </div>

          {/* Save button */}
          <Button
            onClick={handleSave}
            disabled={!name.trim() || isRecapturing}
            className="w-full bg-success text-success-foreground hover:glow-success"
          >
            <Check className="w-4 h-4 mr-2" />
            Guardar Cambios
          </Button>
        </div>
      </div>
    </div>
  );
};
