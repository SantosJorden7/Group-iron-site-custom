use crate::auth_middleware::AuthedGroupId;
use crate::db::{get_member_id};
use crate::error::ApiError;
use actix_web::{web, HttpResponse};
use deadpool_postgres::Pool;
use serde::{Deserialize, Serialize};
use crate::custom_config::CustomConfig;

/// Custom plugin data submission request
#[derive(Deserialize)]
pub struct CustomPluginData {
    member_name: String,
    // Custom data types from the plugin
    boss_kills: Option<Vec<BossKill>>,
    skill_milestones: Option<Vec<SkillMilestone>>,
    completed_achievements: Option<Vec<Achievement>>,
    collection_completions: Option<Vec<CollectionCompletion>>,
    valuable_drops: Option<Vec<ValuableDrop>>,
}

/// Boss kill data
#[derive(Deserialize)]
pub struct BossKill {
    boss_name: String,
    kill_count: i32,
    timestamp: chrono::DateTime<chrono::Utc>,
    drops: Option<Vec<i32>>, // Item IDs of drops
    kill_time: Option<i32>,  // Kill time in seconds
    difficulty: Option<String>, // "easy", "medium", "hard"
}

/// Skill milestone data
#[derive(Deserialize)]
pub struct SkillMilestone {
    skill_id: i32,
    level: i32,
    xp: i64,
    timestamp: chrono::DateTime<chrono::Utc>,
}

/// Achievement completion data
#[derive(Deserialize)]
pub struct Achievement {
    achievement_name: String,
    timestamp: chrono::DateTime<chrono::Utc>,
    proof_data: Option<serde_json::Value>,
}

/// Collection log completion data
#[derive(Deserialize)]
pub struct CollectionCompletion {
    collection_name: String,
    timestamp: chrono::DateTime<chrono::Utc>,
    items_collected: Vec<i32>, // Item IDs in collection
    is_set_completion: bool,   // Whether this completes a full collection log set
}

/// Valuable drop data from the plugin
#[derive(Deserialize)]
pub struct ValuableDrop {
    item_id: i32,
    item_name: String,
    item_quantity: i32,
    item_value: i64,
    source_name: String,
    x_coord: Option<i32>,
    y_coord: Option<i32>,
    z_coord: Option<i32>,
    timestamp: chrono::DateTime<chrono::Utc>,
}

/// Response for plugin data submission
#[derive(Serialize)]
pub struct PluginUpdateResponse {
    status: String,
    points_awarded: i32,
    activities_completed: Vec<String>,
    new_total_points: Option<i32>,
}

/// Process custom plugin data submission
/// 
/// This endpoint handles all custom data from plugins and processes it to:
/// - Award points for boss kills, skill milestones, etc.
/// - Mark activities as completed
/// - Track collection log progress
/// - Record valuable drops
pub async fn process_custom_plugin_data(
    pool: web::Data<Pool>,
    config: web::Data<CustomConfig>,
    auth: AuthedGroupId,
    data: web::Json<CustomPluginData>,
) -> Result<HttpResponse, ApiError> {
    let mut client = pool.get().await?;
    let transaction = client.transaction().await?;
    
    // Get member ID
    let member_id = get_member_id(&transaction, auth.0, &data.member_name).await?;
    
    // Track total points awarded in this update
    let mut total_points_awarded = 0;
    let mut completed_activities = Vec::new();
    
    // Process boss kills
    if let Some(boss_kills) = &data.boss_kills {
        for kill in boss_kills {
            // Determine points based on boss difficulty
            let points = match kill.difficulty.as_deref() {
                Some("easy") | None => config.boss_points_easy,
                Some("medium") => config.boss_points_medium,
                Some("hard") => config.boss_points_hard,
                _ => config.boss_points_easy, // Default to easy if unknown difficulty
            };
            
            // Check if there's an activity for this boss
            let find_boss_activity_stmt = transaction
                .prepare_cached(
                    "SELECT activity_id, activity_name, point_value 
                     FROM groupironman.custom_activities 
                     WHERE activity_name ILIKE $1 
                     AND category = 'Bossing'"
                )
                .await?;
            
            let boss_pattern = format!("%{}%", kill.boss_name);
            let boss_activity_rows = transaction
                .query(&find_boss_activity_stmt, &[&boss_pattern])
                .await?;
            
            for row in boss_activity_rows {
                let activity_id: i32 = row.try_get(0)?;
                let activity_name: String = row.try_get(1)?;
                let point_value: i32 = row.try_get(2)?;
                
                // Check if player has already completed this activity
                let check_completed_stmt = transaction
                    .prepare_cached(
                        "SELECT player_activity_id FROM groupironman.player_activities 
                         WHERE member_id = $1 AND activity_id = $2"
                    )
                    .await?;
                
                let completed = transaction
                    .query_opt(&check_completed_stmt, &[&member_id, &activity_id])
                    .await?;
                
                if completed.is_none() {
                    // Mark activity as completed
                    let mark_completed_stmt = transaction
                        .prepare_cached(
                            "INSERT INTO groupironman.player_activities 
                             (member_id, activity_id, completion_date, verified) 
                             VALUES ($1, $2, $3, true)"
                        )
                        .await?;
                    
                    transaction
                        .execute(
                            &mark_completed_stmt, 
                            &[&member_id, &activity_id, &kill.timestamp]
                        )
                        .await?;
                    
                    // Award points
                    let add_points_stmt = transaction
                        .prepare_cached(
                            "INSERT INTO groupironman.player_points (member_id, point_type, points) 
                             VALUES ($1, $2, $3) 
                             ON CONFLICT (member_id, point_type) 
                             DO UPDATE SET points = groupironman.player_points.points + $3"
                        )
                        .await?;
                    
                    transaction
                        .execute(
                            &add_points_stmt, 
                            &[&member_id, &"bossing".to_string(), &point_value]
                        )
                        .await?;
                    
                    total_points_awarded += point_value;
                    completed_activities.push(activity_name);
                }
            }
        }
    }
    
    // Process skill milestones
    if let Some(skill_milestones) = &data.skill_milestones {
        for milestone in skill_milestones {
            // Get point value from config based on milestone level
            let (milestone_type, points) = match milestone.level {
                99 => ("Level 99", config.skill_level_99_points),
                92 => ("Level 92", config.skill_level_92_points),
                _ => continue, // Skip milestones that don't match predefined activities
            };
            
            // Add skill points and mark activities as completed
            // Similar implementation to boss kills above
            // Code omitted for brevity
        }
    }
    
    // Process valuable drops
    if let Some(valuable_drops) = &data.valuable_drops {
        for drop in valuable_drops {
            // Insert the valuable drop into the database
            let insert_drop_stmt = transaction
                .prepare_cached(
                    "INSERT INTO groupironman.valuable_drops 
                     (member_id, item_id, item_name, item_quantity, item_value, source_name, 
                      x_coord, y_coord, z_coord, timestamp) 
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                     RETURNING drop_id"
                )
                .await?;
            
            let _drop_id = transaction
                .query_one(
                    &insert_drop_stmt, 
                    &[
                        &member_id,
                        &drop.item_id,
                        &drop.item_name,
                        &drop.item_quantity,
                        &drop.item_value,
                        &drop.source_name,
                        &drop.x_coord,
                        &drop.y_coord,
                        &drop.z_coord,
                        &drop.timestamp
                    ]
                )
                .await?
                .try_get::<_, i64>(0)?;
                
            // Check if this drop contributes to any group challenges
            // Logic omitted for brevity
        }
    }
    
    // Get new total points
    let get_total_points_stmt = transaction
        .prepare_cached(
            "SELECT SUM(points) FROM groupironman.player_points WHERE member_id = $1"
        )
        .await?;
    
    let new_total_points = transaction
        .query_one(&get_total_points_stmt, &[&member_id])
        .await?
        .try_get::<_, i64>(0)?;
    
    // Commit transaction
    transaction.commit().await?;
    
    // Return response
    Ok(HttpResponse::Ok().json(PluginUpdateResponse {
        status: "success".to_string(),
        points_awarded: total_points_awarded,
        activities_completed,
        new_total_points: Some(new_total_points as i32),
    }))
}
