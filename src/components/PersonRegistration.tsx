import { useState, useRef, useEffect } from 'react';
import { UserPlus, Camera, Volume2, Loader2, Check, X } from 'lucide-react';
import { useFaceDetection } from '@/hooks/useFaceDetection';
import { RegisteredPerson } from '@/types/face';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface PersonRegistrationProps {
  onRegister: (person: RegisteredPerson) => void;
  onClose: () => void;
}

// Default notification sounds
const DEFAULT_SOUNDS = [
  { name: 'Bienvenido', url: 'https://www.soundjay.com/buttons/beep-01a.mp3' },
  { name: 'Alerta', url: 'https://www.soundjay.com/buttons/beep-07.mp3' },
  { name: 'Confirmación', url: 'https://www.soundjay.com/buttons/beep-08b.mp3' },
];

export const PersonRegistration = ({ onRegister, onClose }: PersonRegistrationProps) => {
  const [step, setStep] = useState<'name' | 'capture' | 'sound'>('name');
  const [name, setName] = useState('');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedDescriptor, setCapturedDescriptor] = useState<Float32Array | null>(null);
  const [selectedSound, setSelectedSound] = useState(DEFAULT_SOUNDS[0].url);
  const [isCapturing, setIsCapturing] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  
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

  const handleCapture = async () => {
    setIsCapturing(true);
    
    const descriptor = await captureDescriptor();
    const image = captureSnapshot();
    
    if (descriptor && image) {
      setCapturedDescriptor(descriptor);
      setCapturedImage(image);
      stopCamera();
      setCameraActive(false);
      setStep('sound');
    } else {
      alert('No se detectó ningún rostro. Por favor, posiciona tu cara frente a la cámara.');
    }
    
    setIsCapturing(false);
  };

  const handleRegister = () => {
    if (!capturedDescriptor || !capturedImage) return;

    const person: RegisteredPerson = {
      id: crypto.randomUUID(),
      name,
      descriptor: capturedDescriptor,
      soundUrl: selectedSound,
      imageDataUrl: capturedImage,
      createdAt: new Date()
    };

    onRegister(person);
    onClose();
  };

  const playSound = (url: string) => {
    const audio = new Audio(url);
    audio.play().catch(console.error);
  };

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card border border-border/50 rounded-lg p-6 animate-scale-in border-glow">
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
          {['name', 'capture', 'sound'].map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-display ${
                step === s ? 'bg-primary text-primary-foreground' : 
                ['name', 'capture', 'sound'].indexOf(step) > i ? 'bg-success text-success-foreground' : 
                'bg-muted text-muted-foreground'
              }`}>
                {['name', 'capture', 'sound'].indexOf(step) > i ? <Check className="w-4 h-4" /> : i + 1}
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
            <p className="text-sm text-muted-foreground text-center">
              Posiciona tu rostro en el centro y haz clic en capturar
            </p>
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
                  Capturar Rostro
                </>
              )}
            </Button>
          </div>
        )}

        {step === 'sound' && (
          <div className="space-y-4">
            {capturedImage && (
              <div className="flex justify-center mb-4">
                <img
                  src={capturedImage}
                  alt={name}
                  className="w-24 h-24 rounded-full object-cover border-2 border-primary glow-primary"
                />
              </div>
            )}
            <p className="text-sm text-muted-foreground text-center mb-4">
              Selecciona el sonido que se reproducirá al detectar a <strong className="text-foreground">{name}</strong>
            </p>
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
