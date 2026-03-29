-- This trigger calls the `handle_new_user` function whenever a new user is created in the `auth.users` table.
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user();
