import { useState, useEffect } from 'react';
import { Activity, CheckCircle, AlertCircle } from 'lucide-react';
import { DetectionResult } from '@/types/face';

interface DetectionLogProps {
  detections: DetectionResult[];
}

export const DetectionLog = ({ detections }: DetectionLogProps) => {
  const [log, setLog] = useState<Array<{ result: DetectionResult; timestamp: Date }>>([]);

  useEffect(() => {
    if (detections.length > 0) {
      const latest = detections[detections.length - 1];
      if (latest.personId) {
        setLog(prev => [
          { result: latest, timestamp: new Date() },
          ...prev.slice(0, 9)
        ]);
      }
    }
  }, [detections]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-5 h-5 text-primary" />
        <h3 className="font-display text-sm uppercase tracking-wider text-foreground">
          Registro de Detecciones
        </h3>
      </div>

      {log.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
          <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
          <p className="text-sm">Sin detecciones recientes</p>
        </div>
      ) : (
        <div className="flex-1 overflow-auto space-y-2">
          {log.map((entry, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 bg-success/10 border border-success/30 rounded-lg animate-fade-in"
            >
              <CheckCircle className="w-5 h-5 text-success flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {entry.result.personName}
                </p>
                <p className="text-xs text-muted-foreground">
                  Confianza: {entry.result.confidence.toFixed(0)}%
                </p>
              </div>
              <span className="text-xs text-muted-foreground">
                {entry.timestamp.toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
