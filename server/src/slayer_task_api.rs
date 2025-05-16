use crate::auth_middleware::AuthedGroupId;
use crate::db::{get_member_id};
use crate::error::ApiError;
use actix_web::{web, HttpResponse};
use deadpool_postgres::Pool;
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

/// Request to submit a new slayer task for a player
#[derive(Deserialize)]
pub struct SlayerTaskSubmission {
    /// Name of the slayer monster assigned
    pub monster_name: String,
    
    /// Quantity of monsters to kill
    pub quantity: i32,
    
    /// Slayer master who assigned the task
    pub slayer_master: String,
    
    /// Current slayer task streak
    pub task_streak: Option<i32>,
    
    /// Slayer points earned from completing the task (if completed)
    pub slayer_points: Option<i32>,
    
    /// Whether this is a boss task
    pub is_boss_task: Option<bool>,
}

/// Response for slayer task data
#[derive(Serialize)]
pub struct SlayerTaskResponse {
    /// Member name
    pub member_name: String,
    
    /// Currently assigned task
    pub current_task: Option<SlayerTask>,
    
    /// Task history
    pub task_history: Vec<SlayerTask>,
    
    /// Current slayer points
    pub slayer_points: i32,
    
    /// Current task streak
    pub task_streak: i32,
}

/// Slayer task data structure
#[derive(Serialize)]
pub struct SlayerTask {
    /// Task ID
    pub task_id: i64,
    
    /// Name of the slayer monster assigned
    pub monster_name: String,
    
    /// Quantity of monsters to kill
    pub quantity: i32,
    
    /// Slayer master who assigned the task
    pub slayer_master: String,
    
    /// Whether the task is complete
    pub is_complete: bool,
    
    /// Whether this is a boss task
    pub is_boss_task: bool,
    
    /// Time when this task was assigned
    pub assigned_at: DateTime<Utc>,
    
    /// Time when this task was completed (if completed)
    pub completed_at: Option<DateTime<Utc>>,
}

/// Get the current slayer task and task history for a player
/// 
/// This endpoint retrieves:
/// - Current assigned slayer task
/// - History of completed tasks
/// - Player's slayer points and task streak
pub async fn get_slayer_task(
    pool: web::Data<Pool>,
    auth: AuthedGroupId,
    member_name: web::Path<String>,
) -> Result<HttpResponse, ApiError> {
    let mut client = pool.get().await?;
    
    // Get member ID
    let member_id = get_member_id(&client, auth.0, &member_name).await?;
    
    // Get current task
    let current_task_stmt = client
        .prepare_cached(
            "SELECT 
                task_id, monster_name, quantity, slayer_master, 
                is_complete, is_boss_task, assigned_at, completed_at 
             FROM groupironman.slayer_tasks 
             WHERE member_id = $1 
             AND is_complete = false
             ORDER BY assigned_at DESC 
             LIMIT 1"
        )
        .await?;
    
    let current_task_row = client
        .query_opt(&current_task_stmt, &[&member_id])
        .await?;
    
    let current_task = if let Some(row) = current_task_row {
        Some(SlayerTask {
            task_id: row.try_get(0)?,
            monster_name: row.try_get(1)?,
            quantity: row.try_get(2)?,
            slayer_master: row.try_get(3)?,
            is_complete: row.try_get(4)?,
            is_boss_task: row.try_get(5)?,
            assigned_at: row.try_get(6)?,
            completed_at: row.try_get(7)?,
        })
    } else {
        None
    };
    
    // Get task history
    let history_stmt = client
        .prepare_cached(
            "SELECT 
                task_id, monster_name, quantity, slayer_master, 
                is_complete, is_boss_task, assigned_at, completed_at 
             FROM groupironman.slayer_tasks 
             WHERE member_id = $1 
             AND is_complete = true
             ORDER BY completed_at DESC 
             LIMIT 10"
        )
        .await?;
    
    let history_rows = client
        .query(&history_stmt, &[&member_id])
        .await?;
    
    let task_history: Vec<SlayerTask> = history_rows
        .iter()
        .map(|row| {
            SlayerTask {
                task_id: row.try_get(0).unwrap(),
                monster_name: row.try_get(1).unwrap(),
                quantity: row.try_get(2).unwrap(),
                slayer_master: row.try_get(3).unwrap(),
                is_complete: row.try_get(4).unwrap(),
                is_boss_task: row.try_get(5).unwrap(),
                assigned_at: row.try_get(6).unwrap(),
                completed_at: row.try_get(7).unwrap(),
            }
        })
        .collect();
    
    // Get slayer points and streak
    let stats_stmt = client
        .prepare_cached(
            "SELECT slayer_points, task_streak FROM groupironman.slayer_stats WHERE member_id = $1"
        )
        .await?;
    
    let stats_row = client
        .query_opt(&stats_stmt, &[&member_id])
        .await?;
    
    let (slayer_points, task_streak) = if let Some(row) = stats_row {
        (row.try_get(0)?, row.try_get(1)?)
    } else {
        (0, 0)
    };
    
    // Return the full response
    Ok(HttpResponse::Ok().json(SlayerTaskResponse {
        member_name: member_name.into_inner(),
        current_task,
        task_history,
        slayer_points,
        task_streak,
    }))
}

/// Submit a new slayer task for a player
/// 
/// This endpoint handles:
/// - Completing the current task if one exists
/// - Assigning a new task
/// - Updating player slayer points and streak
pub async fn submit_slayer_task(
    pool: web::Data<Pool>,
    auth: AuthedGroupId,
    member_name: web::Path<String>,
    task: web::Json<SlayerTaskSubmission>,
) -> Result<HttpResponse, ApiError> {
    let mut client = pool.get().await?;
    let transaction = client.transaction().await?;
    
    // Get member ID
    let member_id = get_member_id(&transaction, auth.0, &member_name).await?;
    
    // Check and complete any current task
    let current_task_stmt = transaction
        .prepare_cached(
            "UPDATE groupironman.slayer_tasks 
             SET is_complete = true, completed_at = NOW() 
             WHERE member_id = $1 AND is_complete = false
             RETURNING task_id"
        )
        .await?;
    
    let completed_task = transaction
        .query_opt(&current_task_stmt, &[&member_id])
        .await?;
    
    // Insert the new task
    let insert_task_stmt = transaction
        .prepare_cached(
            "INSERT INTO groupironman.slayer_tasks
             (member_id, monster_name, quantity, slayer_master, is_boss_task, assigned_at)
             VALUES ($1, $2, $3, $4, $5, NOW())
             RETURNING task_id"
        )
        .await?;
    
    let is_boss_task = task.is_boss_task.unwrap_or(false);
    
    let new_task_id = transaction
        .query_one(
            &insert_task_stmt, 
            &[
                &member_id, 
                &task.monster_name, 
                &task.quantity, 
                &task.slayer_master,
                &is_boss_task
            ]
        )
        .await?
        .try_get::<_, i64>(0)?;
    
    // Update slayer stats
    let slayer_points = task.slayer_points.unwrap_or(0);
    let task_streak = task.task_streak.unwrap_or(0);
    
    let update_stats_stmt = transaction
        .prepare_cached(
            "INSERT INTO groupironman.slayer_stats 
             (member_id, slayer_points, task_streak) 
             VALUES ($1, $2, $3)
             ON CONFLICT (member_id) 
             DO UPDATE SET slayer_points = $2, task_streak = $3"
        )
        .await?;
    
    transaction
        .execute(&update_stats_stmt, &[&member_id, &slayer_points, &task_streak])
        .await?;
    
    // Commit transaction
    transaction.commit().await?;
    
    // Return success
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "status": "success",
        "message": "Slayer task updated successfully",
        "task_id": new_task_id,
        "completed_previous": completed_task.is_some(),
    })))
}
