-- 002_role_system.sql
CREATE TYPE user_role AS ENUM ('owner', 'admin', 'cleaning_staff');

CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'admin',
    full_name VARCHAR(150) NOT NULL,
    phone_number VARCHAR(25),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_property ON user_profiles(property_id);
