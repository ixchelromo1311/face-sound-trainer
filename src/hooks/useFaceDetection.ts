import { useRef, useState, useCallback, useEffect } from 'react';
import * as faceapi from 'face-api.js';
import { RegisteredPerson, DetectionResult } from '@/types/face';

const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';

// Singleton for model loading state
let modelsLoaded = false;
let modelsLoading = false;
let modelLoadPromise: Promise<void> | null = null;

const loadFaceModels = async (): Promise<void> => {
  if (modelsLoaded) return;
  if (modelsLoading && modelLoadPromise) return modelLoadPromise;
  
  modelsLoading = true;
  modelLoadPromise = Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
  ]).then(() => {
    modelsLoaded = true;
    modelsLoading = false;
  });
  
  return modelLoadPromise;
};

export const useFaceDetection = () => {
  const [isModelLoaded, setIsModelLoaded] = useState(modelsLoaded);
  const [isLoading, setIsLoading] = useState(!modelsLoaded);
  const [error, setError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const detectionIntervalRef = useRef<number | null>(null);
  const lastPlayedRef = useRef<Map<string, number>>(new Map());

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
      setError('Error al cargar los modelos de detección facial');
      console.error('Error loading models:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const startCamera = useCallback(async (video: HTMLVideoElement) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        // Prefer higher resolution when available to improve face detection quality,
        // while still allowing the browser to pick a supported size.
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
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

  const captureDescriptor = useCallback(async (): Promise<Float32Array | null> => {
    if (!videoRef.current || !modelsLoaded) return null;

    const detection = await faceapi
      .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();

    return detection?.descriptor || null;
  }, []);

  const captureSnapshot = useCallback((): string | null => {
    if (!videoRef.current) return null;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(videoRef.current, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.8);
  }, []);

  const startDetection = useCallback((
    registeredPeople: RegisteredPerson[],
    onDetection: (result: DetectionResult) => void,
    canvas: HTMLCanvasElement
  ) => {
    canvasRef.current = canvas;
    
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
    }

    const detectorOptions = new faceapi.TinyFaceDetectorOptions({
      // Optimized for speed: smaller input, higher threshold
      scoreThreshold: 0.5,
      inputSize: 224
    });

    const findBestMatch = (
      detectedDescriptor: Float32Array,
      person: RegisteredPerson
    ): number => {
      if (!person.descriptors || person.descriptors.length === 0) return Infinity;
      
      let minDistance = Infinity;
      for (const descriptor of person.descriptors) {
        const distance = faceapi.euclideanDistance(detectedDescriptor, descriptor);
        if (distance < minDistance) {
          minDistance = distance;
        }
      }
      return minDistance;
    };

    const playPersonSound = (person: RegisteredPerson) => {
      const audioSource = person.soundData || person.soundUrl;
      console.log('Playing sound for:', person.name, 'URL:', audioSource);
      
      if (audioSource) {
        const audio = new Audio(audioSource);
        audio.loop = false;
        audio.volume = 1.0;
        
        // Add event listeners for debugging
        audio.oncanplaythrough = () => {
          console.log('Audio ready to play');
          audio.play().catch(err => {
            console.error('Audio play error:', err);
          });
        };
        
        audio.onerror = (e) => {
          console.error('Audio loading error:', e, audioSource);
        };
        
        // Fallback: try to play directly
        audio.play().catch(err => {
          console.warn('Direct play failed, waiting for canplaythrough:', err.message);
        });
      } else {
        console.log('No audio source for person:', person.name);
      }
    };

    const detectFaces = async () => {
      if (!videoRef.current || !modelsLoaded) return;
      if (videoRef.current.readyState < 2) return;
      if (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) return;

      try {
        const detections = await faceapi
          .detectAllFaces(videoRef.current, detectorOptions)
          .withFaceLandmarks()
          .withFaceDescriptors();

        if (canvasRef.current && videoRef.current) {
          const displaySize = {
            width: videoRef.current.videoWidth,
            height: videoRef.current.videoHeight
          };
          faceapi.matchDimensions(canvasRef.current, displaySize);
          
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          }
        }

        for (const detection of detections) {
          const box = detection.detection.box;
          let bestMatch: { person: RegisteredPerson; distance: number } | null = null;

          for (const person of registeredPeople) {
            const distance = findBestMatch(detection.descriptor, person);
            if (distance < 0.6 && (!bestMatch || distance < bestMatch.distance)) {
              bestMatch = { person, distance };
            }
          }

          const result: DetectionResult = {
            personId: bestMatch?.person.id || null,
            personName: bestMatch?.person.name || null,
            confidence: bestMatch ? (1 - bestMatch.distance) * 100 : 0,
            box: { x: box.x, y: box.y, width: box.width, height: box.height }
          };

          // Play sound with cooldown (30 seconds to avoid repetition)
          if (bestMatch) {
            const now = Date.now();
            const lastPlayed = lastPlayedRef.current.get(bestMatch.person.id) || 0;
            if (now - lastPlayed > 30000) {
              playPersonSound(bestMatch.person);
              lastPlayedRef.current.set(bestMatch.person.id, now);
            }
          }

          onDetection(result);

        }
      } catch (err) {
        console.error('Detection error:', err);
      }
    };

    detectionIntervalRef.current = window.setInterval(detectFaces, 200);
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
    captureDescriptor,
    captureSnapshot,
    startDetection
  };
};
