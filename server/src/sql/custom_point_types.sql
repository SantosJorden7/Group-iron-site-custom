-- Custom Point Types Schema Extensions

-- Table for custom point types
CREATE TABLE IF NOT EXISTS groupironman.custom_point_types (
    point_type_id SERIAL PRIMARY KEY,
    type_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon_url VARCHAR(255),
    color_hex VARCHAR(7),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    active BOOLEAN DEFAULT TRUE
);

-- Table for group milestones based on point types
CREATE TABLE IF NOT EXISTS groupironman.group_milestones (
    milestone_id SERIAL PRIMARY KEY,
    group_id INT NOT NULL REFERENCES groupironman.groups(group_id),
    title VARCHAR(100) NOT NULL,
    description TEXT,
    point_type_id INT REFERENCES groupironman.custom_point_types(point_type_id),
    point_threshold INT NOT NULL,
    reward_description TEXT,
    start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_date TIMESTAMP WITH TIME ZONE,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for tracking member contributions to milestones
CREATE TABLE IF NOT EXISTS groupironman.milestone_contributions (
    contribution_id SERIAL PRIMARY KEY,
    milestone_id INT NOT NULL REFERENCES groupironman.group_milestones(milestone_id),
    member_id INT NOT NULL REFERENCES groupironman.members(member_id),
    points_contributed INT NOT NULL DEFAULT 0,
    last_contribution_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(milestone_id, member_id)
);

-- Table for point events (when points are earned)
CREATE TABLE IF NOT EXISTS groupironman.point_events (
    event_id SERIAL PRIMARY KEY,
    member_id INT NOT NULL REFERENCES groupironman.members(member_id),
    point_type_id INT NOT NULL REFERENCES groupironman.custom_point_types(point_type_id),
    points INT NOT NULL,
    event_description TEXT,
    source_type VARCHAR(50) NOT NULL,
    source_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default point types
INSERT INTO groupironman.custom_point_types (type_name, description, color_hex)
VALUES 
    ('bossing', 'Points earned from boss kills', '#e74c3c'),
    ('skilling', 'Points earned from skill achievements', '#3498db'),
    ('collection', 'Points earned from collection log completions', '#2ecc71'),
    ('challenges', 'Points earned from completing group challenges', '#f39c12'),
    ('questing', 'Points earned from completing quests', '#9b59b6')
ON CONFLICT (type_name) DO NOTHING;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_milestone_contributions_milestone ON groupironman.milestone_contributions(milestone_id);
CREATE INDEX IF NOT EXISTS idx_milestone_contributions_member ON groupironman.milestone_contributions(member_id);
CREATE INDEX IF NOT EXISTS idx_point_events_member ON groupironman.point_events(member_id);
CREATE INDEX IF NOT EXISTS idx_point_events_point_type ON groupironman.point_events(point_type_id);
