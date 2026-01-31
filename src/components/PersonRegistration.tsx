import { useState, useRef, useEffect, useCallback } from 'react';
import { UserPlus, Camera, Volume2, Loader2, Check, X, Upload, Music, Video } from 'lucide-react';
import { useFaceDetection } from '@/hooks/useFaceDetection';
import { FacePositionGuide } from '@/components/FacePositionGuide';
import { RegisteredPerson } from '@/types/face';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import * as faceapi from 'face-api.js';

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
  const [isFaceDetected, setIsFaceDetected] = useState(false);
  const [isFaceAligned, setIsFaceAligned] = useState(false);
  const [alignedTime, setAlignedTime] = useState(0);
  const [autoCapturing, setAutoCapturing] = useState(false);
  const detectionIntervalRef = useRef<number | null>(null);
  const autoCaptureRef = useRef<number | null>(null);
  
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

  // Start face detection for position guide
  const startFaceTracking = useCallback(() => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
    }

    const detectFace = async () => {
      if (!videoRef.current || videoRef.current.readyState < 2) return;
      
      try {
        const detection = await faceapi
          .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }));
        
        if (detection) {
          setIsFaceDetected(true);
          const box = detection.box;
          const videoWidth = videoRef.current.videoWidth;
          const videoHeight = videoRef.current.videoHeight;
          
          const faceCenterX = box.x + box.width / 2;
          const faceCenterY = box.y + box.height / 2;
          const videoCenterX = videoWidth / 2;
          const videoCenterY = videoHeight / 2;
          
          const toleranceX = videoWidth * 0.2;
          const toleranceY = videoHeight * 0.2;
          
          const isAligned = 
            Math.abs(faceCenterX - videoCenterX) < toleranceX &&
            Math.abs(faceCenterY - videoCenterY) < toleranceY;
          
          setIsFaceAligned(isAligned);
        } else {
          setIsFaceDetected(false);
          setIsFaceAligned(false);
        }
      } catch (err) {
        console.error('Face tracking error:', err);
      }
    };

    detectionIntervalRef.current = window.setInterval(detectFace, 150);
  }, []);

  useEffect(() => {
    if (step === 'capture' && isModelLoaded && videoRef.current && !cameraActive) {
      startCamera(videoRef.current).then(success => {
        if (success) {
          videoRef.current?.play();
          setCameraActive(true);
          startFaceTracking();
        }
      });
    }

    return () => {
      if (step !== 'capture') {
        stopCamera();
        setCameraActive(false);
        if (detectionIntervalRef.current) {
          clearInterval(detectionIntervalRef.current);
          detectionIntervalRef.current = null;
        }
      }
    };
  }, [step, isModelLoaded, startCamera, stopCamera, cameraActive, startFaceTracking]);

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

  const handleCapture = useCallback(async () => {
    if (isCapturing || autoCapturing) return;
    
    setIsCapturing(true);
    setAutoCapturing(true);
    
    const descriptor = await captureDescriptor();
    const image = captureSnapshot();
    
    if (descriptor && image) {
      const newDescriptors = [...capturedDescriptors, descriptor];
      const newImages = [...capturedImages, image];
      
      setCapturedDescriptors(newDescriptors);
      setCapturedImages(newImages);
      
      // Reset alignment state for next capture
      setIsFaceAligned(false);
      setAlignedTime(0);
      
      if (newDescriptors.length >= REQUIRED_CAPTURES) {
        // Clear detection interval
        if (detectionIntervalRef.current) {
          clearInterval(detectionIntervalRef.current);
          detectionIntervalRef.current = null;
        }
        stopCamera();
        setCameraActive(false);
        setStep('media');
      }
    }
    
    setIsCapturing(false);
    // Small delay before allowing next auto-capture
    setTimeout(() => setAutoCapturing(false), 800);
  }, [isCapturing, autoCapturing, capturedDescriptors, capturedImages, captureDescriptor, captureSnapshot, stopCamera]);

  // Auto-capture when face is aligned for sufficient time
  useEffect(() => {
    if (isFaceAligned && !isCapturing && !autoCapturing && step === 'capture') {
      // Start counting aligned time
      autoCaptureRef.current = window.setInterval(() => {
        setAlignedTime(prev => {
          const newTime = prev + 100;
          if (newTime >= 1500) { // 1.5 seconds aligned = auto capture
            if (autoCaptureRef.current) {
              clearInterval(autoCaptureRef.current);
              autoCaptureRef.current = null;
            }
            handleCapture();
            return 0;
          }
          return newTime;
        });
      }, 100);
    } else {
      // Reset timer when not aligned
      if (autoCaptureRef.current) {
        clearInterval(autoCaptureRef.current);
        autoCaptureRef.current = null;
      }
      setAlignedTime(0);
    }
    
    return () => {
      if (autoCaptureRef.current) {
        clearInterval(autoCaptureRef.current);
        autoCaptureRef.current = null;
      }
    };
  }, [isFaceAligned, isCapturing, autoCapturing, step, handleCapture]);

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
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-md bg-card border border-border/50 rounded-lg p-6 border-glow my-auto">
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
            <div className="flex gap-2 justify-center mb-2">
              {capturedImages.map((img, idx) => (
                <img
                  key={idx}
                  src={img}
                  alt={`Captura ${idx + 1}`}
                  className="w-10 h-10 rounded-full object-cover border-2 border-success"
                />
              ))}
              {Array.from({ length: capturesRemaining }).map((_, idx) => (
                <div
                  key={`empty-${idx}`}
                  className="w-10 h-10 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center"
                >
                  <span className="text-xs text-muted-foreground">{capturedImages.length + idx + 1}</span>
                </div>
              ))}
            </div>

            <div className="relative aspect-[3/4] bg-black rounded-lg overflow-hidden border border-border/50">
              {isLoading ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
              ) : (
                <>
                  <video 
                    ref={videoRef} 
                    className="w-full h-full object-cover" 
                    playsInline 
                    muted 
                  />
                  {/* Face Position Guide overlay */}
                  <FacePositionGuide
                    isFaceDetected={isFaceDetected}
                    isFaceAligned={isFaceAligned}
                    isScanning={cameraActive}
                    captureMode={true}
                    captureStep={capturedDescriptors.length}
                    totalCaptures={REQUIRED_CAPTURES}
                    alignProgress={(alignedTime / 1500) * 100}
                  />
                </>
              )}
            </div>

            {/* Auto-capture status indicator */}
            <div className="text-center py-2">
              {isCapturing || autoCapturing ? (
                <div className="flex items-center justify-center gap-2 text-success">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="font-display text-sm">Capturando...</span>
                </div>
              ) : isFaceAligned ? (
                <div className="flex items-center justify-center gap-2 text-success">
                  <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                  <span className="font-display text-sm">Mantén la posición...</span>
                </div>
              ) : (
                <span className="text-muted-foreground text-sm">
                  Captura automática al detectar posición correcta
                </span>
              )}
            </div>
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
