import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { RegisteredPerson } from '@/types/face';

const STORAGE_KEY = 'face-detector-people';

interface PersonStorageContextType {
  people: RegisteredPerson[];
  addPerson: (person: RegisteredPerson) => void;
  removePerson: (id: string) => void;
  updatePerson: (person: RegisteredPerson) => void;
  refreshPeople: () => void;
}

const PersonStorageContext = createContext<PersonStorageContextType | null>(null);

export const PersonStorageProvider = ({ children }: { children: ReactNode }) => {
  const [people, setPeople] = useState<RegisteredPerson[]>([]);

  const loadPeople = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const restored = parsed.map((p: any) => ({
          ...p,
          descriptors: p.descriptors 
            ? p.descriptors.map((d: number[]) => new Float32Array(d))
            : p.descriptor 
              ? [new Float32Array(p.descriptor)]
              : [],
          createdAt: new Date(p.createdAt)
        }));
        setPeople(restored);
      }
    } catch (err) {
      console.error('Error loading people:', err);
    }
  }, []);

  const savePeople = useCallback((newPeople: RegisteredPerson[]) => {
    try {
      const serialized = newPeople.map(p => ({
        ...p,
        descriptors: p.descriptors.map(d => Array.from(d))
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized));
    } catch (err) {
      console.error('Error saving people:', err);
    }
  }, []);

  const addPerson = useCallback((person: RegisteredPerson) => {
    setPeople(prev => {
      const updated = [...prev, person];
      savePeople(updated);
      return updated;
    });
  }, [savePeople]);

  const removePerson = useCallback((id: string) => {
    setPeople(prev => {
      const updated = prev.filter(p => p.id !== id);
      savePeople(updated);
      return updated;
    });
  }, [savePeople]);

  const updatePerson = useCallback((updatedPerson: RegisteredPerson) => {
    setPeople(prev => {
      const updated = prev.map(p => 
        p.id === updatedPerson.id ? updatedPerson : p
      );
      savePeople(updated);
      return updated;
    });
  }, [savePeople]);

  // Load on mount
  useEffect(() => {
    loadPeople();
  }, [loadPeople]);

  // Listen for storage changes from other tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        loadPeople();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [loadPeople]);

  return (
    <PersonStorageContext.Provider value={{ 
      people, 
      addPerson, 
      removePerson, 
      updatePerson,
      refreshPeople: loadPeople 
    }}>
      {children}
    </PersonStorageContext.Provider>
  );
};

export const usePersonStorage = () => {
  const context = useContext(PersonStorageContext);
  if (!context) {
    throw new Error('usePersonStorage must be used within PersonStorageProvider');
  }
  return context;
};
