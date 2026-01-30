import { useState, useCallback, useEffect } from 'react';
import { RegisteredPerson } from '@/types/face';

const STORAGE_KEY = 'face-detector-people';

export const usePersonStorage = () => {
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
              ? [new Float32Array(p.descriptor)] // Legacy support
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

  const updatePersonSound = useCallback((id: string, soundUrl: string, soundData?: string) => {
    setPeople(prev => {
      const updated = prev.map(p => 
        p.id === id ? { ...p, soundUrl, soundData } : p
      );
      savePeople(updated);
      return updated;
    });
  }, [savePeople]);

  useEffect(() => {
    loadPeople();
  }, [loadPeople]);

  return {
    people,
    addPerson,
    removePerson,
    updatePersonSound
  };
};
