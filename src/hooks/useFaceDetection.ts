import { useRef, useState, useCallback, useEffect } from 'react';
import * as faceapi from 'face-api.js';
import { RegisteredPerson, DetectionResult } from '@/types/face';

const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';

export const useFaceDetection = () => {
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const detectionIntervalRef = useRef<number | null>(null);
  const lastPlayedRef = useRef<Map<string, number>>(new Map());

  const loadModels = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
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
    if (!videoRef.current || !isModelLoaded) return null;

    const detection = await faceapi
      .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();

    return detection?.descriptor || null;
  }, [isModelLoaded]);

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

  // Find best matching descriptor among all descriptors of a person
  const findBestMatch = useCallback((
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
  }, []);

  const playPersonSound = useCallback((person: RegisteredPerson) => {
    // Use custom sound data if available, otherwise use URL
    const audioSource = person.soundData || person.soundUrl;
    if (audioSource) {
      const audio = new Audio(audioSource);
      audio.play().catch(console.error);
    }
  }, []);

  const detectFaces = useCallback(async (
    registeredPeople: RegisteredPerson[],
    onDetection: (result: DetectionResult) => void
  ) => {
    if (!videoRef.current || !isModelLoaded) return;

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

      // Play sound with cooldown (3 seconds)
      if (bestMatch) {
        const now = Date.now();
        const lastPlayed = lastPlayedRef.current.get(bestMatch.person.id) || 0;
        if (now - lastPlayed > 3000) {
          playPersonSound(bestMatch.person);
          lastPlayedRef.current.set(bestMatch.person.id, now);
        }
      }

      onDetection(result);

      // Draw detection box
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          ctx.strokeStyle = bestMatch ? '#00ff88' : '#00d4ff';
          ctx.lineWidth = 3;
          ctx.strokeRect(box.x, box.y, box.width, box.height);
          
          if (bestMatch) {
            ctx.fillStyle = '#00ff88';
            ctx.font = '16px Orbitron';
            ctx.fillText(
              `${bestMatch.person.name} (${result.confidence.toFixed(0)}%)`,
              box.x,
              box.y - 10
            );
          }
        }
      }
    }
  }, [isModelLoaded, findBestMatch, playPersonSound]);

  const startDetection = useCallback((
    registeredPeople: RegisteredPerson[],
    onDetection: (result: DetectionResult) => void,
    canvas: HTMLCanvasElement
  ) => {
    canvasRef.current = canvas;
    
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
    }

    detectionIntervalRef.current = window.setInterval(() => {
      detectFaces(registeredPeople, onDetection);
    }, 200);
  }, [detectFaces]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

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
