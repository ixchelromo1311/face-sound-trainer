export interface RegisteredPerson {
  id: string;
  name: string;
  descriptor: Float32Array;
  soundUrl: string;
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
