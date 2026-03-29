-- Update the handle_new_user trigger to set full_name from user metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    new.id,
    COALESCE(
      new.raw_user_meta_data->>'full_name',
      CONCAT(
        COALESCE(new.raw_user_meta_data->>'first_name', ''),
        ' ',
        COALESCE(new.raw_user_meta_data->>'last_name', '')
      )
    )
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'client');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;