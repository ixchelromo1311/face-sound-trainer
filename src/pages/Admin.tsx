import { useState, useEffect, useCallback } from 'react';
import { Scan, Camera, Upload, Video, Music, Loader2, Check, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MediaConfig {
  id: string;
  name: string;
  videoUrl: string | null;
  soundUrl: string | null;
}

const Admin = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [mediaConfig, setMediaConfig] = useState<MediaConfig | null>(null);
  const [name, setName] = useState('Saludo General');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [audioPreview, setAudioPreview] = useState<string | null>(null);

  // Load existing media config
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const { data, error } = await supabase
          .from('registered_people')
          .select('*')
          .limit(1)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error loading config:', error);
        }

        if (data) {
          setMediaConfig({
            id: data.id,
            name: data.name,
            videoUrl: data.video_url,
            soundUrl: data.sound_url
          });
          setName(data.name);
          setVideoPreview(data.video_url);
          setAudioPreview(data.sound_url);
        }
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadConfig();
  }, []);

  const uploadFile = async (file: File, folder: string): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${folder}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('person-media')
      .upload(fileName, file);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('person-media')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      let videoUrl = mediaConfig?.videoUrl || null;
      let soundUrl = mediaConfig?.soundUrl || null;

      // Upload new video if selected
      if (videoFile) {
        videoUrl = await uploadFile(videoFile, 'videos');
      }

      // Upload new audio if selected
      if (audioFile) {
        soundUrl = await uploadFile(audioFile, 'audio');
      }

      if (mediaConfig?.id) {
        // Update existing
        const { error } = await supabase
          .from('registered_people')
          .update({
            name,
            video_url: videoUrl,
            sound_url: soundUrl
          })
          .eq('id', mediaConfig.id);

        if (error) throw error;
      } else {
        // Create new
        const { data, error } = await supabase
          .from('registered_people')
          .insert({
            name,
            video_url: videoUrl,
            sound_url: soundUrl,
            descriptors: []
          })
          .select()
          .single();

        if (error) throw error;

        setMediaConfig({
          id: data.id,
          name: data.name,
          videoUrl: data.video_url,
          soundUrl: data.sound_url
        });
      }

      setVideoPreview(videoUrl);
      setAudioPreview(soundUrl);
      setVideoFile(null);
      setAudioFile(null);

      toast.success('Configuración guardada correctamente');
    } catch (err) {
      console.error('Error saving:', err);
      toast.error('Error al guardar la configuración');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteMedia = async (type: 'video' | 'audio') => {
    if (!mediaConfig?.id) return;

    try {
      const updates = type === 'video' 
        ? { video_url: null } 
        : { sound_url: null };

      const { error } = await supabase
        .from('registered_people')
        .update(updates)
        .eq('id', mediaConfig.id);

      if (error) throw error;

      if (type === 'video') {
        setVideoPreview(null);
        setMediaConfig(prev => prev ? { ...prev, videoUrl: null } : null);
      } else {
        setAudioPreview(null);
        setMediaConfig(prev => prev ? { ...prev, soundUrl: null } : null);
      }

      toast.success(`${type === 'video' ? 'Video' : 'Audio'} eliminado`);
    } catch (err) {
      console.error('Error deleting:', err);
      toast.error('Error al eliminar');
    }
  };

  const handleVideoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      setVideoPreview(URL.createObjectURL(file));
    }
  }, []);

  const handleAudioChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAudioFile(file);
      setAudioPreview(URL.createObjectURL(file));
    }
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 lg:p-8">
      {/* Header */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center glow-primary">
            <Scan className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground text-glow">
              FaceGuard Admin
            </h1>
            <p className="text-sm text-muted-foreground">
              Configuración de Media
            </p>
          </div>
        </div>

        <Link to="/">
          <Button variant="outline" className="font-display">
            <Camera className="w-4 h-4 mr-2" />
            Vista Pública
          </Button>
        </Link>
      </header>

      {/* Main content */}
      <div className="max-w-2xl mx-auto">
        <div className="bg-card border border-border/50 rounded-xl p-6 space-y-8">
          {/* Info banner */}
          <div className="bg-primary/10 border border-primary/30 rounded-lg p-4">
            <p className="text-sm text-primary font-display">
              Configura el video y/o audio que se reproducirá cuando se detecte cualquier rostro humano.
            </p>
          </div>

          {/* Name input */}
          <div className="space-y-2">
            <Label htmlFor="name" className="font-display text-sm uppercase tracking-wider text-muted-foreground">
              Nombre del saludo
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Saludo de bienvenida"
              className="bg-secondary/50 border-border/50"
            />
          </div>

          {/* Video upload */}
          <div className="space-y-4">
            <Label className="font-display text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Video className="w-4 h-4" />
              Video (MP4, WebM)
            </Label>
            
            {videoPreview ? (
              <div className="space-y-3">
                <video
                  src={videoPreview}
                  controls
                  className="w-full max-h-64 rounded-lg bg-black"
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('video-input')?.click()}
                    className="flex-1"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Cambiar video
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteMedia('video')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <label
                htmlFor="video-input"
                className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border/50 rounded-lg cursor-pointer hover:bg-secondary/30 transition-colors"
              >
                <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground">Click para subir video</span>
              </label>
            )}
            <input
              id="video-input"
              type="file"
              accept="video/mp4,video/webm"
              onChange={handleVideoChange}
              className="hidden"
            />
          </div>

          {/* Audio upload */}
          <div className="space-y-4">
            <Label className="font-display text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Music className="w-4 h-4" />
              Audio (MP3)
            </Label>
            
            {audioPreview ? (
              <div className="space-y-3">
                <audio
                  src={audioPreview}
                  controls
                  className="w-full"
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('audio-input')?.click()}
                    className="flex-1"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Cambiar audio
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteMedia('audio')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <label
                htmlFor="audio-input"
                className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border/50 rounded-lg cursor-pointer hover:bg-secondary/30 transition-colors"
              >
                <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground">Click para subir audio</span>
              </label>
            )}
            <input
              id="audio-input"
              type="file"
              accept="audio/mp3,audio/mpeg"
              onChange={handleAudioChange}
              className="hidden"
            />
          </div>

          {/* Save button */}
          <Button
            onClick={handleSave}
            disabled={isSaving || (!name && !videoFile && !audioFile)}
            className="w-full bg-primary text-primary-foreground hover:glow-primary font-display"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Guardar Configuración
              </>
            )}
          </Button>

          {/* Status */}
          {mediaConfig && (videoPreview || audioPreview) && (
            <div className="text-center text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                Media configurado y listo para reproducir
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Admin;
