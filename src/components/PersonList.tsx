import { Trash2, Volume2, User } from 'lucide-react';
import { RegisteredPerson } from '@/types/face';

interface PersonListProps {
  people: RegisteredPerson[];
  onRemove: (id: string) => void;
}

export const PersonList = ({ people, onRemove }: PersonListProps) => {
  const playSound = (url: string) => {
    const audio = new Audio(url);
    audio.play().catch(console.error);
  };

  if (people.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <User className="w-12 h-12 mb-4 opacity-50" />
        <p className="font-display text-sm">No hay personas registradas</p>
        <p className="text-xs mt-1">Haz clic en "Añadir Persona" para comenzar</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {people.map((person) => (
        <div
          key={person.id}
          className="flex items-center gap-4 p-4 bg-secondary/50 rounded-lg border border-border/50 hover:border-primary/30 transition-all group"
        >
          <img
            src={person.imageDataUrl}
            alt={person.name}
            className="w-12 h-12 rounded-full object-cover border-2 border-primary/50"
          />
          <div className="flex-1 min-w-0">
            <h3 className="font-display text-foreground truncate">{person.name}</h3>
            <p className="text-xs text-muted-foreground">
              Registrado: {person.createdAt.toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => playSound(person.soundUrl)}
              className="p-2 rounded-full bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
              title="Reproducir sonido"
            >
              <Volume2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onRemove(person.id)}
              className="p-2 rounded-full bg-destructive/20 text-destructive hover:bg-destructive/30 transition-colors"
              title="Eliminar persona"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
