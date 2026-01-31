import { useEffect, useState } from 'react';

interface FacePositionGuideProps {
  isFaceDetected: boolean;
  isFaceAligned: boolean;
  isScanning: boolean;
}

export const FacePositionGuide = ({ isFaceDetected, isFaceAligned, isScanning }: FacePositionGuideProps) => {
  const [segments, setSegments] = useState<boolean[]>(Array(24).fill(false));
  
  useEffect(() => {
    if (isFaceAligned && isScanning) {
      // Animate segments filling up when face is aligned
      const interval = setInterval(() => {
        setSegments(prev => {
          const nextFalseIndex = prev.findIndex(s => !s);
          if (nextFalseIndex === -1) {
            clearInterval(interval);
            return prev;
          }
          const newSegments = [...prev];
          newSegments[nextFalseIndex] = true;
          return newSegments;
        });
      }, 80);
      return () => clearInterval(interval);
    } else {
      // Reset segments when face moves away
      setSegments(Array(24).fill(false));
    }
  }, [isFaceAligned, isScanning]);

  const getStatusColor = () => {
    if (isFaceAligned) return 'hsl(var(--success))';
    if (isFaceDetected) return 'hsl(var(--warning))';
    return 'hsl(var(--primary))';
  };

  const getStatusText = () => {
    if (isFaceAligned) return 'Rostro detectado';
    if (isFaceDetected) return 'Centra tu rostro en el círculo';
    return 'Posiciona tu rostro dentro del círculo';
  };

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20">
      {/* Face frame oval */}
      <div className="relative w-48 h-64 sm:w-56 sm:h-72 md:w-64 md:h-80">
        {/* Outer glow */}
        <div 
          className="absolute inset-0 rounded-[50%] transition-all duration-300"
          style={{
            boxShadow: `0 0 30px ${getStatusColor()}40, inset 0 0 30px ${getStatusColor()}20`
          }}
        />
        
        {/* Main oval frame */}
        <svg className="w-full h-full" viewBox="0 0 100 130">
          {/* Background oval */}
          <ellipse
            cx="50"
            cy="65"
            rx="45"
            ry="58"
            fill="none"
            stroke={getStatusColor()}
            strokeWidth="0.5"
            opacity="0.3"
          />
          
          {/* Segmented progress ring */}
          {segments.map((filled, i) => {
            const angle = (i * 15 - 90) * (Math.PI / 180);
            const nextAngle = ((i + 1) * 15 - 90) * (Math.PI / 180);
            const gap = 0.02; // Small gap between segments
            
            const rx = 45;
            const ry = 58;
            const cx = 50;
            const cy = 65;
            
            const x1 = cx + rx * Math.cos(angle + gap);
            const y1 = cy + ry * Math.sin(angle + gap);
            const x2 = cx + rx * Math.cos(nextAngle - gap);
            const y2 = cy + ry * Math.sin(nextAngle - gap);
            
            return (
              <path
                key={i}
                d={`M ${x1} ${y1} A ${rx} ${ry} 0 0 1 ${x2} ${y2}`}
                fill="none"
                stroke={filled ? 'hsl(var(--success))' : getStatusColor()}
                strokeWidth={filled ? "3" : "2"}
                strokeLinecap="round"
                opacity={filled ? 1 : 0.5}
                className="transition-all duration-200"
                style={{
                  filter: filled ? `drop-shadow(0 0 4px hsl(var(--success)))` : 'none'
                }}
              />
            );
          })}
        </svg>
        
        {/* Corner brackets for alignment */}
        <div className="absolute top-4 left-4 w-6 h-6 border-l-2 border-t-2 rounded-tl-lg transition-colors duration-300" style={{ borderColor: getStatusColor() }} />
        <div className="absolute top-4 right-4 w-6 h-6 border-r-2 border-t-2 rounded-tr-lg transition-colors duration-300" style={{ borderColor: getStatusColor() }} />
        <div className="absolute bottom-4 left-4 w-6 h-6 border-l-2 border-b-2 rounded-bl-lg transition-colors duration-300" style={{ borderColor: getStatusColor() }} />
        <div className="absolute bottom-4 right-4 w-6 h-6 border-r-2 border-b-2 rounded-br-lg transition-colors duration-300" style={{ borderColor: getStatusColor() }} />
        
        {/* Center crosshair */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div 
            className="w-3 h-3 rounded-full transition-all duration-300"
            style={{ 
              backgroundColor: getStatusColor(),
              boxShadow: `0 0 10px ${getStatusColor()}`,
              opacity: isFaceAligned ? 0 : 0.6
            }} 
          />
        </div>
        
        {/* Success checkmark */}
        {isFaceAligned && segments.every(s => s) && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 animate-scale-in">
            <svg className="w-16 h-16 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" className="opacity-20" fill="currentColor" />
              <path d="M8 12l2.5 2.5L16 9" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}
      </div>
      
      {/* Status text */}
      <div className="mt-6 sm:mt-8 px-4 text-center">
        <p 
          className="font-display text-sm sm:text-base tracking-wide transition-colors duration-300"
          style={{ color: getStatusColor() }}
        >
          {getStatusText()}
        </p>
        {!isFaceAligned && isScanning && (
          <p className="text-muted-foreground text-xs sm:text-sm mt-2 animate-pulse">
            Mantén el rostro quieto
          </p>
        )}
      </div>
    </div>
  );
};
