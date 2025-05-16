-- Create activities table
CREATE TABLE IF NOT EXISTS activities (
    id BIGSERIAL PRIMARY KEY,
    group_id BIGINT NOT NULL REFERENCES groupironman.groups(group_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    activity_type VARCHAR(100) NOT NULL,
    points INTEGER NOT NULL DEFAULT 0,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    completed_by VARCHAR(255),
    
    CONSTRAINT fk_group FOREIGN KEY (group_id) REFERENCES groupironman.groups(group_id)
);

-- Create boss_strategies table
CREATE TABLE IF NOT EXISTS boss_strategies (
    id BIGSERIAL PRIMARY KEY,
    group_id BIGINT NOT NULL REFERENCES groupironman.groups(group_id) ON DELETE CASCADE,
    boss_name VARCHAR(255) NOT NULL,
    difficulty VARCHAR(50) NOT NULL,
    recommended_gear TEXT NOT NULL,
    recommended_inventory TEXT NOT NULL,
    strategy TEXT NOT NULL,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT fk_group FOREIGN KEY (group_id) REFERENCES groupironman.groups(group_id),
    CONSTRAINT unique_boss_per_group UNIQUE (group_id, LOWER(boss_name))
);

-- Create group_challenges table
CREATE TABLE IF NOT EXISTS group_challenges (
    id BIGSERIAL PRIMARY KEY,
    group_id BIGINT NOT NULL REFERENCES groupironman.groups(group_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    challenge_type VARCHAR(100) NOT NULL,
    target_value INTEGER NOT NULL,
    current_value INTEGER NOT NULL DEFAULT 0,
    reward TEXT,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    
    CONSTRAINT fk_group FOREIGN KEY (group_id) REFERENCES groupironman.groups(group_id)
);

-- Create group_milestones table
CREATE TABLE IF NOT EXISTS group_milestones (
    id BIGSERIAL PRIMARY KEY,
    group_id BIGINT NOT NULL REFERENCES groupironman.groups(group_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    milestone_type VARCHAR(100) NOT NULL,
    target_date TIMESTAMPTZ,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT fk_group FOREIGN KEY (group_id) REFERENCES groupironman.groups(group_id)
);

-- Create calendar_events table
CREATE TABLE IF NOT EXISTS calendar_events (
    id BIGSERIAL PRIMARY KEY,
    group_id BIGINT NOT NULL REFERENCES groupironman.groups(group_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_type VARCHAR(100) NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    all_day BOOLEAN NOT NULL DEFAULT FALSE,
    location TEXT,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT fk_group FOREIGN KEY (group_id) REFERENCES groupironman.groups(group_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_activities_group_id ON activities(group_id);
CREATE INDEX IF NOT EXISTS idx_activities_completed ON activities(completed);
CREATE INDEX IF NOT EXISTS idx_boss_strategies_group_id ON boss_strategies(group_id);
CREATE INDEX IF NOT EXISTS idx_group_challenges_group_id ON group_challenges(group_id);
CREATE INDEX IF NOT EXISTS idx_group_challenges_completed ON group_challenges(completed);
CREATE INDEX IF NOT EXISTS idx_group_milestones_group_id ON group_milestones(group_id);
CREATE INDEX IF NOT EXISTS idx_group_milestones_completed ON group_milestones(completed);
CREATE INDEX IF NOT EXISTS idx_calendar_events_group_id ON calendar_events(group_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time ON calendar_events(start_time);
