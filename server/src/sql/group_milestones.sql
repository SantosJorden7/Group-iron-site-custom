-- Group Milestones Schema

-- Table for group milestones
CREATE TABLE IF NOT EXISTS groupironman.group_milestones (
    milestone_id SERIAL PRIMARY KEY,
    group_id INT NOT NULL REFERENCES groupironman.groups(group_id),
    title VARCHAR(100) NOT NULL,
    description TEXT,
    milestone_type VARCHAR(50) NOT NULL,
    target_data JSONB NOT NULL,
    completion_criteria JSONB,
    start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_date TIMESTAMP WITH TIME ZONE,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for tracking member progress on milestones
CREATE TABLE IF NOT EXISTS groupironman.milestone_progress (
    milestone_id INT NOT NULL REFERENCES groupironman.group_milestones(milestone_id) ON DELETE CASCADE,
    member_id INT NOT NULL REFERENCES groupironman.members(member_id),
    current_progress JSONB NOT NULL DEFAULT '{}'::jsonb,
    percent_complete REAL NOT NULL DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (milestone_id, member_id)
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_milestone_group ON groupironman.group_milestones(group_id);
CREATE INDEX IF NOT EXISTS idx_milestone_progress_milestone ON groupironman.milestone_progress(milestone_id);
CREATE INDEX IF NOT EXISTS idx_milestone_progress_member ON groupironman.milestone_progress(member_id);

-- Milestone types for reference (these would be used in the application logic)
COMMENT ON TABLE groupironman.group_milestones IS 'Stores group milestones with the following milestone_type values:
- skill_total: Group skill total level milestones
- boss_kc: Group boss kill count milestones
- collection_log: Collection log completion milestones
- quest_completion: Group quest completion milestones
- achievement_diary: Achievement diary completion milestones
- custom: Custom defined milestones';
