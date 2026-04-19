CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM users WHERE email = NEW.email) THEN
    UPDATE users SET auth_id = NEW.id WHERE email = NEW.email;
  ELSE
    INSERT INTO users (id, auth_id, name, email, role, is_active, created_at)
    VALUES (
      gen_random_uuid()::text,
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'role', 'member'),
      true,
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$;
