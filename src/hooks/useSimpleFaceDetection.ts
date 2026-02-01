import { useRef, useState, useCallback, useEffect } from 'react';
import * as faceapi from 'face-api.js';

const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';

// Singleton for model loading state
let modelsLoaded = false;
let modelsLoading = false;
let modelLoadPromise: Promise<void> | null = null;

const loadFaceModels = async (): Promise<void> => {
  if (modelsLoaded) return;
  if (modelsLoading && modelLoadPromise) return modelLoadPromise;
  
  modelsLoading = true;
  modelLoadPromise = faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL).then(() => {
    modelsLoaded = true;
    modelsLoading = false;
  });
  
  return modelLoadPromise;
};

interface MediaData {
  soundUrl: string | null;
  videoUrl: string | null;
  name: string;
}

export const useSimpleFaceDetection = () => {
  const [isModelLoaded, setIsModelLoaded] = useState(modelsLoaded);
  const [isLoading, setIsLoading] = useState(!modelsLoaded);
  const [error, setError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const detectionIntervalRef = useRef<number | null>(null);
  const lastPlayedRef = useRef<number>(0);
  const isPlayingRef = useRef<boolean>(false);

  const loadModels = useCallback(async () => {
    if (modelsLoaded) {
      setIsModelLoaded(true);
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    try {
      await loadFaceModels();
      setIsModelLoaded(true);
    } catch (err) {
      setError('Error al cargar el modelo de detección');
      console.error('Error loading models:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const startCamera = useCallback(async (video: HTMLVideoElement) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      });
      video.srcObject = stream;
      videoRef.current = video;
      return true;
    } catch (err) {
      setError('No se pudo acceder a la cámara');
      console.error('Camera error:', err);
      return false;
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
  }, []);

  const startDetection = useCallback((
    media: MediaData | null,
    onFaceDetected: (detected: boolean) => void,
    onPlayMedia: () => void
  ) => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
    }

    const detectorOptions = new faceapi.TinyFaceDetectorOptions({
      scoreThreshold: 0.5,
      inputSize: 160 // Smaller = faster
    });

    const detectFaces = async () => {
      if (!videoRef.current || !modelsLoaded) return;
      if (videoRef.current.readyState < 2) return;
      if (videoRef.current.videoWidth === 0) return;

      try {
        const detection = await faceapi.detectSingleFace(videoRef.current, detectorOptions);
        
        const faceDetected = !!detection;
        onFaceDetected(faceDetected);

        // Play media if face detected, has media, cooldown passed, and not currently playing
        if (faceDetected && media && !isPlayingRef.current) {
          const now = Date.now();
          const cooldown = 30000; // 30 seconds cooldown
          
          if (now - lastPlayedRef.current > cooldown) {
            lastPlayedRef.current = now;
            isPlayingRef.current = true;
            onPlayMedia();
          }
        }
      } catch (err) {
        console.error('Detection error:', err);
      }
    };

    detectionIntervalRef.current = window.setInterval(detectFaces, 300);
  }, []);

  const resetPlayingState = useCallback(() => {
    isPlayingRef.current = false;
  }, []);

  useEffect(() => {
    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
        detectionIntervalRef.current = null;
      }
    };
  }, []);

  return {
    isModelLoaded,
    isLoading,
    error,
    loadModels,
    startCamera,
    stopCamera,
    startDetection,
    resetPlayingState
  };
};
