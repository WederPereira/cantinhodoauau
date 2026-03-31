
-- Task assignments table
CREATE TABLE public.work_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  assigned_to uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  scheduled_time time NOT NULL,
  recurrence text NOT NULL DEFAULT 'daily',
  status text NOT NULL DEFAULT 'pending',
  completed_at timestamp with time zone,
  completion_note text,
  due_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.work_tasks ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage all tasks" ON public.work_tasks
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Employees can view their own tasks
CREATE POLICY "Users can view own tasks" ON public.work_tasks
  FOR SELECT TO authenticated
  USING (assigned_to = auth.uid());

-- Employees can update their own tasks (to mark as done)
CREATE POLICY "Users can update own tasks" ON public.work_tasks
  FOR UPDATE TO authenticated
  USING (assigned_to = auth.uid());
