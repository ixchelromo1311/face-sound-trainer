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
        video: { facingMode: 'user', width: 640, height: 480 }
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
      if (audioSource) {
        const audio = new Audio(audioSource);
        audio.loop = false;
        audio.play().catch(console.error);
      }
    };

    const detectFaces = async () => {
      if (!videoRef.current || !modelsLoaded) return;

      try {
        const detections = await faceapi
          .detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions())
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

          // Draw greeting label only (no box)
          if (canvasRef.current && bestMatch) {
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) {
              const text = `¡Hola, ${bestMatch.person.name}!`;
              ctx.font = '900 20px Barlow';
              const textMetrics = ctx.measureText(text);
              const textWidth = textMetrics.width;
              const textHeight = 24;
              const padding = 20;
              const labelWidth = textWidth + padding * 2;
              const labelHeight = textHeight + 16;
              const labelX = box.x + (box.width - labelWidth) / 2;
              const labelY = box.y - labelHeight - 10;
              
              // Draw pill-shaped background
              const radius = labelHeight / 2;
              ctx.beginPath();
              ctx.moveTo(labelX + radius, labelY);
              ctx.lineTo(labelX + labelWidth - radius, labelY);
              ctx.arc(labelX + labelWidth - radius, labelY + radius, radius, -Math.PI / 2, Math.PI / 2);
              ctx.lineTo(labelX + radius, labelY + labelHeight);
              ctx.arc(labelX + radius, labelY + radius, radius, Math.PI / 2, -Math.PI / 2);
              ctx.closePath();
              ctx.fillStyle = 'rgba(0, 180, 120, 0.5)';
              ctx.fill();
              
              // Draw text
              ctx.fillStyle = '#00ff88';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(text, labelX + labelWidth / 2, labelY + labelHeight / 2);
              ctx.textAlign = 'left';
              ctx.textBaseline = 'alphabetic';
            }
          }
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
