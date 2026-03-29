-- First, unfeature all currently featured posts
UPDATE blog_posts SET is_featured = false WHERE is_featured = true;

-- Then feature the specific PR post
UPDATE blog_posts 
SET is_featured = true 
WHERE title = 'What is Public Relations? Beginner''s Guide for Entrepreneurs & Content Creators';