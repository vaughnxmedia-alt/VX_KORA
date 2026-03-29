-- Create table to store user-specific tab visibility settings
CREATE TABLE public.user_tab_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tab_key TEXT NOT NULL,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, tab_key)
);

-- Enable RLS
ALTER TABLE public.user_tab_permissions ENABLE ROW LEVEL SECURITY;

-- Admins can manage all tab permissions
CREATE POLICY "Admins can manage all tab permissions"
ON public.user_tab_permissions
FOR ALL
USING (get_user_role(auth.uid()) = 'admin')
WITH CHECK (get_user_role(auth.uid()) = 'admin');

-- Users can view their own tab permissions
CREATE POLICY "Users can view their own tab permissions"
ON public.user_tab_permissions
FOR SELECT
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_user_tab_permissions_updated_at
BEFORE UPDATE ON public.user_tab_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();