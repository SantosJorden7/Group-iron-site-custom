-- Base schema file for Group Ironmen database
-- Run this in pgAdmin Query Tool

-- First, make sure we have the schema created
CREATE SCHEMA IF NOT EXISTS groupironman;

-- Core tables from schema.sql
CREATE TABLE IF NOT EXISTS groupironman.groups(
       group_id BIGSERIAL UNIQUE,
       group_name TEXT NOT NULL,
       group_token_hash CHAR(64) NOT NULL,
       PRIMARY KEY (group_name, group_token_hash)
);

-- Create the members table which is referenced by custom tables
CREATE TABLE IF NOT EXISTS groupironman.members(
       member_id BIGSERIAL PRIMARY KEY,
       group_id BIGINT NOT NULL REFERENCES groupironman.groups(group_id),
       member_name TEXT NOT NULL UNIQUE
);

-- Create a test group for development
INSERT INTO groupironman.groups (group_name, group_token_hash) 
VALUES ('TestGroup', '0123456789012345678901234567890123456789012345678901234567890123')
ON CONFLICT DO NOTHING;

-- Create test members
INSERT INTO groupironman.members (group_id, member_name)
VALUES 
  ((SELECT group_id FROM groupironman.groups WHERE group_name = 'TestGroup'), 'TestPlayer1'),
  ((SELECT group_id FROM groupironman.groups WHERE group_name = 'TestGroup'), 'TestPlayer2')
ON CONFLICT DO NOTHING;
