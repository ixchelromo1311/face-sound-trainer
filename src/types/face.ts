export interface RegisteredPerson {
  id: string;
  name: string;
  descriptors: Float32Array[]; // Multiple descriptors for better accuracy
  soundUrl: string;
  soundData?: string; // Base64 audio data for custom sounds
  videoData?: string; // Base64 video data for detection playback
  imageDataUrl: string;
  createdAt: Date;
}

export interface DetectionResult {
  personId: string | null;
  personName: string | null;
  confidence: number;
  box: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}
