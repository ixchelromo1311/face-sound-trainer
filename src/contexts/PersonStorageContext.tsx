import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { RegisteredPerson } from '@/types/face';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PersonStorageContextType {
  people: RegisteredPerson[];
  isLoading: boolean;
  isSyncing: boolean;
  addPerson: (person: RegisteredPerson) => Promise<void>;
  removePerson: (id: string) => Promise<void>;
  updatePerson: (person: RegisteredPerson) => Promise<void>;
  refreshPeople: () => Promise<void>;
  syncToCloud: () => Promise<void>;
}

const PersonStorageContext = createContext<PersonStorageContextType | null>(null);

// Helper to upload file to storage
const uploadToStorage = async (
  bucket: string,
  path: string,
  dataUrl: string
): Promise<string | null> => {
  try {
    // Convert data URL to blob
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, blob, { upsert: true });
    
    if (error) {
      console.error('Upload error:', error);
      return null;
    }
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);
    
    return urlData.publicUrl;
  } catch (err) {
    console.error('Upload failed:', err);
    return null;
  }
};

// Helper to delete file from storage
const deleteFromStorage = async (bucket: string, url: string) => {
  try {
    // Extract path from URL
    const urlObj = new URL(url);
    const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)/);
    if (pathMatch) {
      await supabase.storage.from(bucket).remove([pathMatch[1]]);
    }
  } catch (err) {
    console.error('Delete from storage failed:', err);
  }
};

export const PersonStorageProvider = ({ children }: { children: ReactNode }) => {
  const [people, setPeople] = useState<RegisteredPerson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Load people from database
  const loadPeople = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('registered_people')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error loading from database:', error);
        return;
      }
      
      if (data) {
        console.log('Loaded from database:', data);
        const restored: RegisteredPerson[] = data.map((p) => ({
          id: p.id,
          name: p.name,
          descriptors: (p.descriptors as number[][]).map(d => new Float32Array(d)),
          soundUrl: p.sound_url || '',
          soundData: undefined,
          videoData: p.video_url || undefined, // Map video URL
          imageDataUrl: p.image_url || '',
          createdAt: new Date(p.created_at)
        }));
        console.log('Restored people:', restored);
        setPeople(restored);
      }
    } catch (err) {
      console.error('Error loading people:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Add person to database
  const addPerson = useCallback(async (person: RegisteredPerson) => {
    try {
      setIsSyncing(true);
      
      // Upload image to storage
      let imageUrl = '';
      if (person.imageDataUrl) {
        const uploadedUrl = await uploadToStorage(
          'face-images',
          `${person.id}/profile.jpg`,
          person.imageDataUrl
        );
        if (uploadedUrl) imageUrl = uploadedUrl;
      }
      
      // Upload sound if custom
      let soundUrl = person.soundUrl;
      if (person.soundData) {
        const uploadedUrl = await uploadToStorage(
          'person-media',
          `${person.id}/sound.mp3`,
          person.soundData
        );
        if (uploadedUrl) soundUrl = uploadedUrl;
      }
      
      // Upload video if exists
      let videoUrl = '';
      if (person.videoData) {
        const uploadedUrl = await uploadToStorage(
          'person-media',
          `${person.id}/video.mp4`,
          person.videoData
        );
        if (uploadedUrl) videoUrl = uploadedUrl;
      }
      
      // Convert descriptors to serializable format
      const descriptorsArray = person.descriptors.map(d => Array.from(d));
      
      const { error } = await supabase
        .from('registered_people')
        .insert({
          id: person.id,
          name: person.name,
          descriptors: descriptorsArray,
          image_url: imageUrl,
          sound_url: soundUrl,
          video_url: videoUrl || null
        });
      
      if (error) {
        console.error('Error saving to database:', error);
        toast.error('Error al guardar en la nube');
        return;
      }
      
      // Update local state with cloud URLs
      const cloudPerson: RegisteredPerson = {
        ...person,
        imageDataUrl: imageUrl || person.imageDataUrl,
        soundUrl: soundUrl || person.soundUrl,
      };
      
      setPeople(prev => [cloudPerson, ...prev]);
      toast.success('Persona guardada en la nube');
    } catch (err) {
      console.error('Error adding person:', err);
      toast.error('Error al guardar');
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Remove person from database
  const removePerson = useCallback(async (id: string) => {
    try {
      setIsSyncing(true);
      
      // Get person to delete their files
      const person = people.find(p => p.id === id);
      
      // Delete from database
      const { error } = await supabase
        .from('registered_people')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Error deleting from database:', error);
        toast.error('Error al eliminar');
        return;
      }
      
      // Delete files from storage
      if (person) {
        if (person.imageDataUrl?.includes('supabase')) {
          await deleteFromStorage('face-images', person.imageDataUrl);
        }
        if (person.soundUrl?.includes('supabase')) {
          await deleteFromStorage('person-media', person.soundUrl);
        }
      }
      
      setPeople(prev => prev.filter(p => p.id !== id));
      toast.success('Persona eliminada');
    } catch (err) {
      console.error('Error removing person:', err);
      toast.error('Error al eliminar');
    } finally {
      setIsSyncing(false);
    }
  }, [people]);

  // Update person in database
  const updatePerson = useCallback(async (updatedPerson: RegisteredPerson) => {
    try {
      setIsSyncing(true);
      
      // Upload new image if changed
      let imageUrl = updatedPerson.imageDataUrl;
      if (updatedPerson.imageDataUrl?.startsWith('data:')) {
        const uploadedUrl = await uploadToStorage(
          'face-images',
          `${updatedPerson.id}/profile.jpg`,
          updatedPerson.imageDataUrl
        );
        if (uploadedUrl) imageUrl = uploadedUrl;
      }
      
      // Upload new sound if changed
      let soundUrl = updatedPerson.soundUrl;
      if (updatedPerson.soundData?.startsWith('data:')) {
        const uploadedUrl = await uploadToStorage(
          'person-media',
          `${updatedPerson.id}/sound.mp3`,
          updatedPerson.soundData
        );
        if (uploadedUrl) soundUrl = uploadedUrl;
      }
      
      // Convert descriptors
      const descriptorsArray = updatedPerson.descriptors.map(d => Array.from(d));
      
      const { error } = await supabase
        .from('registered_people')
        .update({
          name: updatedPerson.name,
          descriptors: descriptorsArray,
          image_url: imageUrl,
          sound_url: soundUrl
        })
        .eq('id', updatedPerson.id);
      
      if (error) {
        console.error('Error updating in database:', error);
        toast.error('Error al actualizar');
        return;
      }
      
      setPeople(prev => prev.map(p => 
        p.id === updatedPerson.id ? { ...updatedPerson, imageDataUrl: imageUrl } : p
      ));
      toast.success('Persona actualizada');
    } catch (err) {
      console.error('Error updating person:', err);
      toast.error('Error al actualizar');
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Sync button function - reload from cloud
  const syncToCloud = useCallback(async () => {
    toast.info('Sincronizando con la nube...');
    await loadPeople();
    toast.success('Sincronización completa');
  }, [loadPeople]);

  // Load on mount
  useEffect(() => {
    loadPeople();
  }, [loadPeople]);

  return (
    <PersonStorageContext.Provider value={{ 
      people, 
      isLoading,
      isSyncing,
      addPerson, 
      removePerson, 
      updatePerson,
      refreshPeople: loadPeople,
      syncToCloud
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
