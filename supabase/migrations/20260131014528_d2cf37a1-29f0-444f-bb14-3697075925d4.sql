-- Create storage buckets for face images and media files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('face-images', 'face-images', true);

INSERT INTO storage.buckets (id, name, public) 
VALUES ('person-media', 'person-media', true);

-- Storage policies for public access
CREATE POLICY "Public can read face images"
ON storage.objects FOR SELECT
USING (bucket_id = 'face-images');

CREATE POLICY "Anyone can upload face images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'face-images');

CREATE POLICY "Anyone can delete face images"
ON storage.objects FOR DELETE
USING (bucket_id = 'face-images');

CREATE POLICY "Public can read person media"
ON storage.objects FOR SELECT
USING (bucket_id = 'person-media');

CREATE POLICY "Anyone can upload person media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'person-media');

CREATE POLICY "Anyone can delete person media"
ON storage.objects FOR DELETE
USING (bucket_id = 'person-media');

-- Create table for registered people
CREATE TABLE public.registered_people (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  descriptors JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of face descriptor arrays
  image_url TEXT, -- URL to profile image in storage
  sound_url TEXT, -- URL to custom sound in storage
  video_url TEXT, -- URL to video in storage
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.registered_people ENABLE ROW LEVEL SECURITY;

-- Public access policies (no auth required for this kiosk-style app)
CREATE POLICY "Anyone can view registered people"
ON public.registered_people FOR SELECT
USING (true);

CREATE POLICY "Anyone can insert registered people"
ON public.registered_people FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update registered people"
ON public.registered_people FOR UPDATE
USING (true);

CREATE POLICY "Anyone can delete registered people"
ON public.registered_people FOR DELETE
USING (true);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_registered_people_updated_at
BEFORE UPDATE ON public.registered_people
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();