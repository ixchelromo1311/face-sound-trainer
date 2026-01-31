import { useState, useRef, useEffect } from 'react';
import { UserPlus, Camera, Volume2, Loader2, Check, X, Upload, Music, Video } from 'lucide-react';
import { useFaceDetection } from '@/hooks/useFaceDetection';
import { RegisteredPerson } from '@/types/face';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface PersonRegistrationProps {
  onRegister: (person: RegisteredPerson) => void;
  onClose: () => void;
}

const REQUIRED_CAPTURES = 5;

// Default notification sounds
const DEFAULT_SOUNDS = [
  { name: 'Bienvenido', url: 'https://www.soundjay.com/buttons/beep-01a.mp3' },
  { name: 'Alerta', url: 'https://www.soundjay.com/buttons/beep-07.mp3' },
  { name: 'Confirmación', url: 'https://www.soundjay.com/buttons/beep-08b.mp3' },
];

export const PersonRegistration = ({ onRegister, onClose }: PersonRegistrationProps) => {
  const [step, setStep] = useState<'name' | 'capture' | 'media'>('name');
  const [name, setName] = useState('');
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [capturedDescriptors, setCapturedDescriptors] = useState<Float32Array[]>([]);
  const [selectedSound, setSelectedSound] = useState(DEFAULT_SOUNDS[0].url);
  const [customSoundData, setCustomSoundData] = useState<string | null>(null);
  const [customSoundName, setCustomSoundName] = useState<string | null>(null);
  const [videoData, setVideoData] = useState<string | null>(null);
  const [videoName, setVideoName] = useState<string | null>(null);
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
    if (step === 'capture' && isModelLoaded && videoRef.current && !cameraActive) {
      startCamera(videoRef.current).then(success => {
        if (success) {
          videoRef.current?.play();
          setCameraActive(true);
        }
      });
    }

    return () => {
      if (step !== 'capture') {
        stopCamera();
        setCameraActive(false);
      }
    };
  }, [step, isModelLoaded, startCamera, stopCamera, cameraActive]);

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
        setStep('media');
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

  const handleRegister = () => {
    if (capturedDescriptors.length === 0 || capturedImages.length === 0) return;

    const person: RegisteredPerson = {
      id: crypto.randomUUID(),
      name,
      descriptors: capturedDescriptors,
      soundUrl: selectedSound === 'custom' ? '' : selectedSound,
      soundData: selectedSound === 'custom' ? customSoundData || undefined : undefined,
      videoData: videoData || undefined,
      imageDataUrl: capturedImages[0], // Use first image as profile
      createdAt: new Date()
    };

    onRegister(person);
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

  const capturesRemaining = REQUIRED_CAPTURES - capturedDescriptors.length;

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card border border-border/50 rounded-lg p-6 animate-scale-in border-glow max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-display text-foreground flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            Registrar Persona
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress steps */}
        <div className="flex items-center justify-center gap-4 mb-8">
          {['name', 'capture', 'media'].map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-display ${
                step === s ? 'bg-primary text-primary-foreground' : 
                ['name', 'capture', 'media'].indexOf(step) > i ? 'bg-success text-success-foreground' : 
                'bg-muted text-muted-foreground'
              }`}>
                {['name', 'capture', 'media'].indexOf(step) > i ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              {i < 2 && <div className="w-8 h-0.5 bg-muted" />}
            </div>
          ))}
        </div>

        {/* Step content */}
        {step === 'name' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-muted-foreground mb-2">Nombre de la persona</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Juan García"
                className="bg-secondary border-border/50"
              />
            </div>
            <Button
              onClick={() => setStep('capture')}
              disabled={!name.trim()}
              className="w-full bg-primary text-primary-foreground hover:glow-primary"
            >
              Continuar
            </Button>
          </div>
        )}

        {step === 'capture' && (
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

            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Captura <strong className="text-primary">{REQUIRED_CAPTURES}</strong> fotos para mayor precisión
              </p>
              <p className="text-xs text-muted-foreground">
                Mueve ligeramente la cabeza entre capturas (izquierda, derecha, arriba, abajo)
              </p>
              {capturedDescriptors.length > 0 && (
                <p className="text-sm text-success font-display">
                  {capturedDescriptors.length} de {REQUIRED_CAPTURES} capturas completadas
                </p>
              )}
            </div>

            <Button
              onClick={handleCapture}
              disabled={isCapturing || isLoading}
              className="w-full bg-primary text-primary-foreground hover:glow-primary"
            >
              {isCapturing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Capturando...
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4 mr-2" />
                  Capturar Foto {capturedDescriptors.length + 1} de {REQUIRED_CAPTURES}
                </>
              )}
            </Button>
          </div>
        )}

        {step === 'media' && (
          <div className="space-y-4">
            {/* Profile images preview */}
            <div className="flex justify-center gap-2 mb-4">
              {capturedImages.slice(0, 3).map((img, idx) => (
                <img
                  key={idx}
                  src={img}
                  alt={`${name} ${idx + 1}`}
                  className={`rounded-full object-cover border-2 border-primary ${
                    idx === 0 ? 'w-20 h-20 glow-primary' : 'w-12 h-12 opacity-70'
                  }`}
                />
              ))}
            </div>

            {/* Video upload */}
            <div className="mb-4">
              <label className="block text-sm text-muted-foreground mb-2">
                Video de bienvenida (opcional)
              </label>
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

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/50" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Sonido de notificación</span>
              </div>
            </div>

            {/* Custom sound upload */}
            <div className="mb-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className={`w-full p-4 rounded-lg flex items-center justify-center gap-3 transition-all border-2 border-dashed ${
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
                    <span className="text-muted-foreground">Subir archivo MP3 personalizado</span>
                  </>
                )}
              </button>
            </div>

            <div className="space-y-2">
              {DEFAULT_SOUNDS.map((sound) => (
                <button
                  key={sound.url}
                  onClick={() => {
                    setSelectedSound(sound.url);
                  }}
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

            <Button
              onClick={handleRegister}
              className="w-full bg-success text-success-foreground hover:glow-success"
            >
              <Check className="w-4 h-4 mr-2" />
              Registrar Persona
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
