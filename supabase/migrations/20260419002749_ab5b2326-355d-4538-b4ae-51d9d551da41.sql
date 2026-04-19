-- Create private bucket for backups
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('backups', 'backups', false, 524288000) -- 500MB
ON CONFLICT (id) DO NOTHING;

-- RLS policies for backups bucket (admin only)
CREATE POLICY "Admins can view backups"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'backups' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can upload backups"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'backups' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete backups"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'backups' AND has_role(auth.uid(), 'admin'::app_role));

-- Backup history table
CREATE TABLE public.backup_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_path TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'manual', -- 'manual' | 'auto'
  triggered_by UUID,
  triggered_by_name TEXT DEFAULT '',
  total_clients INTEGER DEFAULT 0,
  total_photos INTEGER DEFAULT 0,
  total_records INTEGER DEFAULT 0,
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.backup_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view backup_history"
ON public.backup_history FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert backup_history"
ON public.backup_history FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete backup_history"
ON public.backup_history FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_backup_history_created ON public.backup_history(created_at DESC);

-- Enable required extensions for cron
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;