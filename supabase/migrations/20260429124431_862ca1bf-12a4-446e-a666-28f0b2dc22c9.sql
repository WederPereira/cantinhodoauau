-- Add new role 'admin_comercial' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'admin_comercial';