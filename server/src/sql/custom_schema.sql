-- Custom schema extensions for the Group Ironmen site
-- These extensions add support for points tracking, custom activities, and other features

-- Points tracking for group members
CREATE TABLE IF NOT EXISTS groupironman.player_points (
    point_id BIGSERIAL PRIMARY KEY,
    member_id BIGINT NOT NULL REFERENCES groupironman.members(member_id),
    point_type VARCHAR(50) NOT NULL,
    points INT DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(member_id, point_type)
);

-- Index for faster points retrieval by member
CREATE INDEX IF NOT EXISTS idx_player_points_member_id ON groupironman.player_points(member_id);
-- Index for faster retrieval by point type
CREATE INDEX IF NOT EXISTS idx_player_points_type ON groupironman.player_points(point_type);

-- Custom activities/achievements that can award points
CREATE TABLE IF NOT EXISTS groupironman.custom_activities (
    activity_id SERIAL PRIMARY KEY,
    activity_name VARCHAR(100) NOT NULL,
    activity_description TEXT,
    point_value INT DEFAULT 0,
    category VARCHAR(50),
    icon_url VARCHAR(255),
    required_proof BOOLEAN DEFAULT FALSE
);

-- Index for faster activity lookup by category
CREATE INDEX IF NOT EXISTS idx_custom_activities_category ON groupironman.custom_activities(category);
-- Index for faster activity name search
CREATE INDEX IF NOT EXISTS idx_custom_activities_name ON groupironman.custom_activities(activity_name);

-- Tracking completed activities by players
CREATE TABLE IF NOT EXISTS groupironman.player_activities (
    player_activity_id BIGSERIAL PRIMARY KEY,
    member_id BIGINT NOT NULL REFERENCES groupironman.members(member_id),
    activity_id INT NOT NULL REFERENCES groupironman.custom_activities(activity_id),
    completion_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    proof_data JSONB,
    verified BOOLEAN DEFAULT FALSE,
    UNIQUE(member_id, activity_id)
);

-- Index for faster activity retrieval by member
CREATE INDEX IF NOT EXISTS idx_player_activities_member_id ON groupironman.player_activities(member_id);
-- Index for faster activity retrieval by activity
CREATE INDEX IF NOT EXISTS idx_player_activities_activity_id ON groupironman.player_activities(activity_id);
-- Index for retrieval of verified activities
CREATE INDEX IF NOT EXISTS idx_player_activities_verified ON groupironman.player_activities(verified);
-- Index for fast timestamp-based queries
CREATE INDEX IF NOT EXISTS idx_player_activities_date ON groupironman.player_activities(completion_date);

-- Group challenges for cooperative tasks
CREATE TABLE IF NOT EXISTS groupironman.group_challenges (
    challenge_id SERIAL PRIMARY KEY,
    group_id BIGINT NOT NULL REFERENCES groupironman.groups(group_id),
    challenge_name VARCHAR(100) NOT NULL,
    challenge_description TEXT,
    total_point_value INT DEFAULT 0,
    start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_date TIMESTAMP,
    completed BOOLEAN DEFAULT FALSE
);

-- Index for faster challenge retrieval by group
CREATE INDEX IF NOT EXISTS idx_group_challenges_group_id ON groupironman.group_challenges(group_id);
-- Index for active challenges search
CREATE INDEX IF NOT EXISTS idx_group_challenges_dates ON groupironman.group_challenges(start_date, end_date)
    WHERE end_date IS NOT NULL AND completed = FALSE;

-- Tracking member contributions to group challenges
CREATE TABLE IF NOT EXISTS groupironman.challenge_contributions (
    contribution_id BIGSERIAL PRIMARY KEY,
    challenge_id INT NOT NULL REFERENCES groupironman.group_challenges(challenge_id),
    member_id BIGINT NOT NULL REFERENCES groupironman.members(member_id),
    contribution_value INT DEFAULT 0,
    contribution_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    contribution_data JSONB,
    UNIQUE(challenge_id, member_id)
);

-- Index for faster contributions search by challenge
CREATE INDEX IF NOT EXISTS idx_challenge_contributions_challenge ON groupironman.challenge_contributions(challenge_id);
-- Index for faster contributions search by member
CREATE INDEX IF NOT EXISTS idx_challenge_contributions_member ON groupironman.challenge_contributions(member_id);
-- Index for contribution value searching (for leaderboards)
CREATE INDEX IF NOT EXISTS idx_challenge_contributions_value ON groupironman.challenge_contributions(contribution_value DESC);

-- Slayer task tracking
CREATE TABLE IF NOT EXISTS groupironman.slayer_tasks (
    task_id BIGSERIAL PRIMARY KEY,
    member_id BIGINT NOT NULL REFERENCES groupironman.members(member_id),
    monster_name VARCHAR(100) NOT NULL,
    quantity INT NOT NULL,
    slayer_master VARCHAR(50) NOT NULL,
    is_complete BOOLEAN DEFAULT FALSE,
    is_boss_task BOOLEAN DEFAULT FALSE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Index for faster task retrieval by member
CREATE INDEX IF NOT EXISTS idx_slayer_tasks_member_id ON groupironman.slayer_tasks(member_id);
-- Index for faster retrieval of completed tasks
CREATE INDEX IF NOT EXISTS idx_slayer_tasks_complete ON groupironman.slayer_tasks(is_complete);
-- Index for timestamp-based queries
CREATE INDEX IF NOT EXISTS idx_slayer_tasks_dates ON groupironman.slayer_tasks(assigned_at, completed_at);

-- Slayer stats tracking
CREATE TABLE IF NOT EXISTS groupironman.slayer_stats (
    stats_id SERIAL PRIMARY KEY,
    member_id BIGINT NOT NULL REFERENCES groupironman.members(member_id),
    slayer_points INT DEFAULT 0,
    task_streak INT DEFAULT 0,
    UNIQUE(member_id)
);

-- Valuable drops tracking
CREATE TABLE IF NOT EXISTS groupironman.valuable_drops (
    drop_id BIGSERIAL PRIMARY KEY,
    member_id BIGINT NOT NULL REFERENCES groupironman.members(member_id),
    item_id INT NOT NULL,
    item_name VARCHAR(100) NOT NULL,
    item_quantity INT DEFAULT 1,
    item_value BIGINT NOT NULL,
    source_name VARCHAR(100),
    x_coord INT,
    y_coord INT,
    z_coord INT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster drops retrieval by member
CREATE INDEX IF NOT EXISTS idx_valuable_drops_member_id ON groupironman.valuable_drops(member_id);
-- Index for searching drops by item
CREATE INDEX IF NOT EXISTS idx_valuable_drops_item_id ON groupironman.valuable_drops(item_id);
-- Index for searching drops by value
CREATE INDEX IF NOT EXISTS idx_valuable_drops_value ON groupironman.valuable_drops(item_value DESC);
-- Index for timestamp-based queries
CREATE INDEX IF NOT EXISTS idx_valuable_drops_timestamp ON groupironman.valuable_drops(timestamp);
