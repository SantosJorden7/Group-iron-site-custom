use std::env;

/// Configuration for custom features of the Group Ironmen site
pub struct CustomConfig {
    /// Number of points awarded for boss kills based on difficulty
    pub boss_points_easy: i32,
    pub boss_points_medium: i32,
    pub boss_points_hard: i32,
    
    /// Number of points awarded for skill milestones
    pub skill_level_92_points: i32,
    pub skill_level_99_points: i32,
    
    /// Number of points awarded for collection log completions
    pub collection_points_per_item: i32,
    pub collection_set_completion_bonus: i32,
    
    /// Number of days to keep player activity history
    pub activity_history_days: i32,
    
    /// Enable or disable certain features
    pub enable_group_challenges: bool,
    pub enable_leaderboards: bool,
    
    /// Cache settings (in seconds)
    pub points_cache_ttl: i32,
    pub activities_cache_ttl: i32,
}

impl Default for CustomConfig {
    fn default() -> Self {
        Self {
            boss_points_easy: 10,
            boss_points_medium: 25,
            boss_points_hard: 50,
            
            skill_level_92_points: 25,
            skill_level_99_points: 50,
            
            collection_points_per_item: 1,
            collection_set_completion_bonus: 25,
            
            activity_history_days: 30,
            
            enable_group_challenges: true,
            enable_leaderboards: true,
            
            points_cache_ttl: 60,
            activities_cache_ttl: 300,
        }
    }
}

impl CustomConfig {
    /// Load configuration from environment variables, falling back to defaults
    pub fn from_env() -> Self {
        Self {
            boss_points_easy: get_env_int("CUSTOM_BOSS_POINTS_EASY", 10),
            boss_points_medium: get_env_int("CUSTOM_BOSS_POINTS_MEDIUM", 25),
            boss_points_hard: get_env_int("CUSTOM_BOSS_POINTS_HARD", 50),
            
            skill_level_92_points: get_env_int("CUSTOM_SKILL_LEVEL_92_POINTS", 25),
            skill_level_99_points: get_env_int("CUSTOM_SKILL_LEVEL_99_POINTS", 50),
            
            collection_points_per_item: get_env_int("CUSTOM_COLLECTION_POINTS_PER_ITEM", 1),
            collection_set_completion_bonus: get_env_int("CUSTOM_COLLECTION_SET_COMPLETION_BONUS", 25),
            
            activity_history_days: get_env_int("CUSTOM_ACTIVITY_HISTORY_DAYS", 30),
            
            enable_group_challenges: get_env_bool("CUSTOM_ENABLE_GROUP_CHALLENGES", true),
            enable_leaderboards: get_env_bool("CUSTOM_ENABLE_LEADERBOARDS", true),
            
            points_cache_ttl: get_env_int("CUSTOM_POINTS_CACHE_TTL", 60),
            activities_cache_ttl: get_env_int("CUSTOM_ACTIVITIES_CACHE_TTL", 300),
        }
    }
}

/// Helper function to get integer from environment variable with default
fn get_env_int(name: &str, default: i32) -> i32 {
    env::var(name)
        .ok()
        .and_then(|val| val.parse().ok())
        .unwrap_or(default)
}

/// Helper function to get boolean from environment variable with default
fn get_env_bool(name: &str, default: bool) -> bool {
    match env::var(name) {
        Ok(val) => match val.to_lowercase().as_str() {
            "true" | "1" | "yes" | "y" | "on" => true,
            "false" | "0" | "no" | "n" | "off" => false,
            _ => default,
        },
        Err(_) => default,
    }
}
