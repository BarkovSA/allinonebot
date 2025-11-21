-- AllInOne Bot Database Schema

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    telegram_id BIGINT UNIQUE NOT NULL,
    username VARCHAR(255),
    first_name VARCHAR(255),
    city VARCHAR(255),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    timezone VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast lookup by telegram_id
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Reminders table
CREATE TABLE IF NOT EXISTS reminders (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    reminder_time TIMESTAMPTZ NOT NULL,
    voice_file_id VARCHAR(255),
    is_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast lookup of pending reminders
CREATE INDEX IF NOT EXISTS idx_reminders_time ON reminders(reminder_time) WHERE is_sent = FALSE;
CREATE INDEX IF NOT EXISTS idx_reminders_user ON reminders(user_id);

-- Example queries:
-- Insert or update user:
-- INSERT INTO users (telegram_id, username, first_name, city)
-- VALUES (123456789, 'username', 'First Name', 'Moscow')
-- ON CONFLICT (telegram_id) DO UPDATE
-- SET username = EXCLUDED.username, first_name = EXCLUDED.first_name, updated_at = CURRENT_TIMESTAMP;

-- Get user by telegram_id:
-- SELECT * FROM users WHERE telegram_id = 123456789;
