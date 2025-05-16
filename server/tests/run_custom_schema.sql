-- Custom schema for Group Ironmen features 
-- Run this in pgAdmin Query Tool after running the base schema

-- SLAYER TASK TABLES --

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

-- VALUABLE DROPS TABLES --

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

-- Insert some test data for our API tests
INSERT INTO groupironman.slayer_stats (member_id, slayer_points, task_streak)
SELECT member_id, 250, 15
FROM groupironman.members 
WHERE member_name = 'TestPlayer1'
ON CONFLICT DO NOTHING;

INSERT INTO groupironman.slayer_stats (member_id, slayer_points, task_streak)
SELECT member_id, 175, 10
FROM groupironman.members 
WHERE member_name = 'TestPlayer2'
ON CONFLICT DO NOTHING;

-- Add a test slayer task for TestPlayer1
INSERT INTO groupironman.slayer_tasks (member_id, monster_name, quantity, slayer_master, is_complete, is_boss_task)
SELECT member_id, 'Abyssal demons', 145, 'Duradel', false, false
FROM groupironman.members 
WHERE member_name = 'TestPlayer1'
ON CONFLICT DO NOTHING;

-- Add a completed task for history
INSERT INTO groupironman.slayer_tasks (member_id, monster_name, quantity, slayer_master, is_complete, is_boss_task, assigned_at, completed_at)
SELECT member_id, 'Kraken', 125, 'Konar', true, true, CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP - INTERVAL '1 day'
FROM groupironman.members 
WHERE member_name = 'TestPlayer1'
ON CONFLICT DO NOTHING;

-- Add a test valuable drop
INSERT INTO groupironman.valuable_drops (member_id, item_id, item_name, item_quantity, item_value, source_name)
SELECT member_id, 11286, 'Draconic visage', 1, 8000000, 'Vorkath'
FROM groupironman.members 
WHERE member_name = 'TestPlayer1'
ON CONFLICT DO NOTHING;
