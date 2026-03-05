-- Create a new type for user roles
CREATE TYPE public.user_role AS ENUM ('admin', 'author', 'client');

-- Create a security definer function to get user roles
CREATE OR REPLACE FUNCTION public.get_user_role(p_user_id uuid)
RETURNS text AS $$
DECLARE
  user_role_name text;
BEGIN
  SELECT role::text INTO user_role_name
  FROM public.user_roles
  WHERE user_id = p_user_id;
  RETURN user_role_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create a table for user roles
CREATE TABLE public.user_roles (
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  role user_role NOT NULL,
  PRIMARY KEY (user_id)
);

-- RLS for user_roles table
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow admin users to manage user roles"
ON public.user_roles
FOR ALL
USING ( (SELECT get_user_role(auth.uid())) = 'admin' )
WITH CHECK ( (SELECT get_user_role(auth.uid())) = 'admin' );

CREATE POLICY "Allow users to view their own roles"
ON public.user_roles
FOR SELECT
USING ( auth.uid() = user_id );

-- Create a table for public profiles
CREATE TABLE public.profiles (
  id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  updated_at timestamptz,
  full_name text,
  avatar_url text,
  website text,
  PRIMARY KEY (id)
);

-- RLS for profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by owner and admins."
ON public.profiles FOR SELECT
USING ( auth.uid() = id OR get_user_role(auth.uid()) = 'admin' );

CREATE POLICY "Users can insert their own profile."
ON public.profiles FOR INSERT
WITH CHECK ( auth.uid() = id );

CREATE POLICY "Users can update their own profile."
ON public.profiles FOR UPDATE
USING ( auth.uid() = id );

CREATE POLICY "Admins can update any profile."
ON public.profiles FOR UPDATE
USING ( get_user_role(auth.uid()) = 'admin' );

-- Function to create a public profile and assign a default role for a new user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (new.id);
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'client');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to call the function when a new user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- Create the blog_posts table
CREATE TABLE public.blog_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    title TEXT NOT NULL,
    tagline TEXT,
    description TEXT,
    content TEXT,
    category TEXT,
    read_time TEXT,
    published_date DATE,
    author_name TEXT,
    is_featured BOOLEAN DEFAULT false,
    is_hot_topic BOOLEAN DEFAULT false,
    icon_name TEXT,
    tags TEXT[],
    video_url TEXT,
    author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    view_count INTEGER NOT NULL DEFAULT 0
);

-- RLS for blog_posts table
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- Allow public read access to all blog posts
CREATE POLICY "Allow public read access to blog posts"
ON public.blog_posts
FOR SELECT
USING (true);

-- Allow authors to insert new blog posts
CREATE POLICY "Allow authors to insert blog posts"
ON public.blog_posts
FOR INSERT
WITH CHECK (
  get_user_role(auth.uid()) IN ('author', 'admin')
);

-- Allow authors to update their own blog posts
CREATE POLICY "Allow authors to update their own blog posts"
ON public.blog_posts
FOR UPDATE
USING (
  auth.uid() = author_id AND
  get_user_role(auth.uid()) IN ('author', 'admin')
)
WITH CHECK (
  auth.uid() = author_id
);

-- Allow admins to update any blog post
CREATE POLICY "Allow admins to update any blog post"
ON public.blog_posts
FOR UPDATE
USING ( get_user_role(auth.uid()) = 'admin' );


-- Allow authors to delete their own blog posts
CREATE POLICY "Allow authors to delete their own blog posts"
ON public.blog_posts
FOR DELETE
USING (
  auth.uid() = author_id AND
  get_user_role(auth.uid()) IN ('author', 'admin')
);

-- Allow admins to delete any blog post
CREATE POLICY "Allow admins to delete any blog post"
ON public.blog_posts
FOR DELETE
USING ( get_user_role(auth.uid()) = 'admin' );

-- Create a function to increment the view count for a blog post
CREATE OR REPLACE FUNCTION public.increment_view_count(post_id uuid)
RETURNS void AS $$
  UPDATE public.blog_posts
  SET view_count = view_count + 1
  WHERE id = post_id;
$$ LANGUAGE sql;

-- Add a function to update the updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add triggers to update the updated_at column on blog_posts and profiles
CREATE TRIGGER update_blog_posts_updated_at
BEFORE UPDATE ON public.blog_posts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to handle single featured post constraint
CREATE OR REPLACE FUNCTION public.handle_featured_post()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_featured = true THEN
    UPDATE public.blog_posts
    SET is_featured = false
    WHERE id != NEW.id AND is_featured = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for single featured post
DROP TRIGGER IF EXISTS on_featured_post_change ON public.blog_posts;
CREATE TRIGGER on_featured_post_change
  BEFORE INSERT OR UPDATE OF is_featured
  ON public.blog_posts
  FOR EACH ROW
  WHEN (NEW.is_featured = true)
  EXECUTE PROCEDURE public.handle_featured_post();
