-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Function to generate random usernames
CREATE OR REPLACE FUNCTION random_username() RETURNS TEXT AS $$
DECLARE
  adjectives TEXT[] := ARRAY['Happy', 'Sleepy', 'Grumpy', 'Bashful', 'Sneezy', 'Dopey', 'Doc'];
  nouns TEXT[] := ARRAY['Dwarf', 'Elf', 'Hobbit', 'Wizard', 'Knight', 'Dragon', 'Unicorn'];
BEGIN
  RETURN adjectives[floor(random() * array_length(adjectives, 1) + 1)] || 
         nouns[floor(random() * array_length(nouns, 1) + 1)] ||
         floor(random() * 1000)::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Function to generate random emails
CREATE OR REPLACE FUNCTION random_email() RETURNS TEXT AS $$
DECLARE
  domains TEXT[] := ARRAY['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'example.com'];
BEGIN
  RETURN lower(random_username()) || '@' || domains[floor(random() * array_length(domains, 1) + 1)];
END;
$$ LANGUAGE plpgsql;

-- Insert 150 app users
INSERT INTO app_user (id, username, high_score, email)
SELECT 
  uuid_generate_v4(),
  random_username(),
  floor(random() * 1000 + 1),
  random_email()
FROM generate_series(1, 150);

-- Insert attempts for each user
INSERT INTO attempt (score, user_id)
SELECT 
  floor(random() * 1000 + 1),
  id
FROM app_user, generate_series(1, 5);

-- Update current_attempt_id for each user
UPDATE app_user
SET current_attempt_id = (
  SELECT id 
  FROM attempt 
  WHERE attempt.user_id = app_user.id 
  ORDER BY created_at DESC 
  LIMIT 1
);

-- Clean up helper functions
DROP FUNCTION random_username();
DROP FUNCTION random_email();