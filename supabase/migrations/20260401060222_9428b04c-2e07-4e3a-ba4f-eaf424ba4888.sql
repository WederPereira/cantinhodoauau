
-- Reels posts table
CREATE TABLE public.reels_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user_name TEXT NOT NULL DEFAULT '',
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL DEFAULT 'image',
  caption TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Reels comments table
CREATE TABLE public.reels_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES public.reels_posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user_name TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Storage bucket for reels media
INSERT INTO storage.buckets (id, name, public) VALUES ('reels', 'reels', true);

-- RLS for reels_posts
ALTER TABLE public.reels_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view reels" ON public.reels_posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert own reels" ON public.reels_posts FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own reels" ON public.reels_posts FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- RLS for reels_comments
ALTER TABLE public.reels_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view comments" ON public.reels_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert comments" ON public.reels_comments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own comments" ON public.reels_comments FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Storage RLS for reels bucket
CREATE POLICY "Authenticated can upload reels" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'reels');
CREATE POLICY "Public can view reels" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'reels');
CREATE POLICY "Users can delete own reels files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'reels');

-- Enable realtime for reels
ALTER PUBLICATION supabase_realtime ADD TABLE public.reels_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reels_comments;
