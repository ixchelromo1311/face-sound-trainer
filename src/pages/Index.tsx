import { useState, useCallback } from 'react';
import { Scan, UserPlus, Settings } from 'lucide-react';
import { CameraView } from '@/components/CameraView';
import { PersonRegistration } from '@/components/PersonRegistration';
import { PersonList } from '@/components/PersonList';
import { DetectionLog } from '@/components/DetectionLog';
import { StatsPanel } from '@/components/StatsPanel';
import { usePersonStorage } from '@/hooks/usePersonStorage';
import { DetectionResult } from '@/types/face';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const Index = () => {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [showRegistration, setShowRegistration] = useState(false);
  const [detections, setDetections] = useState<DetectionResult[]>([]);
  const [totalDetections, setTotalDetections] = useState(0);

  const { people, addPerson, removePerson } = usePersonStorage();

  const handleDetection = useCallback((result: DetectionResult) => {
    setDetections(prev => [...prev.slice(-50), result]);
    if (result.personId) {
      setTotalDetections(prev => prev + 1);
    }
  }, []);

  return (
    <div className="min-h-screen bg-background p-4 lg:p-8">
      {/* Header */}
      <header className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center glow-primary">
            <Scan className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground text-glow">
              FaceGuard
            </h1>
            <p className="text-sm text-muted-foreground">
              Sistema de Reconocimiento Facial
            </p>
          </div>
        </div>

        <Button
          onClick={() => setShowRegistration(true)}
          className="bg-primary text-primary-foreground hover:glow-primary font-display"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Añadir Persona
        </Button>
      </header>

      {/* Stats */}
      <StatsPanel
        people={people}
        isActive={isCameraActive}
        totalDetections={totalDetections}
      />

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        {/* Camera section */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <h2 className="font-display text-sm uppercase tracking-wider text-muted-foreground">
              Vista de Cámara
            </h2>
          </div>
          <CameraView
            registeredPeople={people}
            onDetection={handleDetection}
            isActive={isCameraActive}
            onToggle={() => setIsCameraActive(!isCameraActive)}
          />
        </div>

        {/* Side panel */}
        <div className="lg:col-span-1">
          <Tabs defaultValue="people" className="h-full">
            <TabsList className="w-full bg-secondary/50 border border-border/50">
              <TabsTrigger value="people" className="flex-1 font-display text-xs">
                Personas
              </TabsTrigger>
              <TabsTrigger value="log" className="flex-1 font-display text-xs">
                Registro
              </TabsTrigger>
            </TabsList>

            <div className="mt-4 p-4 bg-card border border-border/50 rounded-lg min-h-[400px]">
              <TabsContent value="people" className="mt-0">
                <PersonList people={people} onRemove={removePerson} />
              </TabsContent>

              <TabsContent value="log" className="mt-0 h-full">
                <DetectionLog detections={detections} />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>

      {/* Registration modal */}
      {showRegistration && (
        <PersonRegistration
          onRegister={addPerson}
          onClose={() => setShowRegistration(false)}
        />
      )}
    </div>
  );
};

export default Index;
