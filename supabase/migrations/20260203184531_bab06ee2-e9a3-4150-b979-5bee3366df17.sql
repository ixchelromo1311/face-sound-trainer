-- Add idle video field for background video when camera is off
ALTER TABLE public.registered_people 
ADD COLUMN idle_video_url TEXT DEFAULT NULL;