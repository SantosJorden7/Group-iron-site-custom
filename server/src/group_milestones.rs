use crate::auth_middleware::AuthedGroupId;
use crate::error::ApiError;
use crate::db::{get_member_id, get_group_members};
use actix_web::{web, HttpResponse, Scope};
use deadpool_postgres::Pool;
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

// ========== Data Structures ==========

/// Group milestone definition
#[derive(Serialize, Deserialize)]
pub struct GroupMilestone {
    /// Unique milestone ID
    #[serde(skip_deserializing)]
    pub milestone_id: Option<i32>,
    
    /// Title of the milestone
    pub title: String,
    
    /// Detailed description of the milestone
    pub description: String,
    
    /// Type of milestone (skill, quest, collection, etc.)
    pub milestone_type: String,
    
    /// Target data in JSON format (specific to milestone type)
    pub target_data: serde_json::Value,
    
    /// Auto-completion criteria (JSON format for rule-based evaluation)
    #[serde(default)]
    pub completion_criteria: Option<serde_json::Value>,
    
    /// Start date for the milestone (default: now)
    #[serde(default = "default_now", skip_deserializing)]
    pub start_date: DateTime<Utc>,
    
    /// Optional end date for time-limited milestones
    pub end_date: Option<DateTime<Utc>>,
    
    /// Whether the milestone has been completed
    #[serde(default, skip_deserializing)]
    pub completed: bool,
    
    /// When the milestone was completed (if applicable)
    #[serde(default, skip_deserializing)]
    pub completed_at: Option<DateTime<Utc>>,
    
    /// Creation timestamp
    #[serde(default = "default_now", skip_deserializing)]
    pub created_at: DateTime<Utc>,
}

fn default_now() -> DateTime<Utc> {
    Utc::now()
}

/// Member progress for a milestone
#[derive(Serialize)]
pub struct MemberMilestoneProgress {
    /// Member name
    pub member_name: String,
    
    /// Current progress value
    pub current_progress: serde_json::Value,
    
    /// Percentage complete (0-100)
    pub percent_complete: f32,
    
    /// Last update timestamp
    pub last_updated: DateTime<Utc>,
}

/// Milestone with progress information
#[derive(Serialize)]
pub struct MilestoneWithProgress {
    /// The milestone details
    pub milestone: GroupMilestone,
    
    /// Overall group progress (0-100)
    pub group_progress: f32,
    
    /// Individual member progress
    pub member_progress: Vec<MemberMilestoneProgress>,
}

/// Response for milestone list
#[derive(Serialize)]
pub struct MilestoneListResponse {
    /// List of milestones with progress
    pub milestones: Vec<MilestoneWithProgress>,
}

/// Parameters for filtering milestones
#[derive(Deserialize)]
pub struct GetMilestonesParams {
    /// Filter by milestone type
    pub milestone_type: Option<String>,
    
    /// Include completed milestones
    #[serde(default = "default_true")]
    pub include_completed: bool,
}

fn default_true() -> bool {
    true
}

// ========== API Endpoints ==========

/// Get group milestones with progress information
#[actix_web::get("/milestones")]
pub async fn get_milestones(
    pool: web::Data<Pool>,
    auth: AuthedGroupId,
    query: web::Query<GetMilestonesParams>,
) -> Result<HttpResponse, ApiError> {
    get_group_milestones(pool, auth, query).await
}

/// Create a new group milestone
#[actix_web::post("/milestones")]
pub async fn create_milestone(
    pool: web::Data<Pool>,
    auth: AuthedGroupId,
    milestone_data: web::Json<GroupMilestone>,
) -> Result<HttpResponse, ApiError> {
    create_group_milestone(pool, auth, milestone_data).await
}

/// Update a milestone's completion status
#[actix_web::patch("/milestones/{milestone_id}/status")]
pub async fn update_status(
    pool: web::Data<Pool>,
    auth: AuthedGroupId,
    path: web::Path<i32>,
    status: web::Json<serde_json::Value>,
) -> Result<HttpResponse, ApiError> {
    update_milestone_status(pool, auth, path, status).await
}

/// Update member progress for a milestone
#[actix_web::patch("/milestones/{milestone_id}/members/{member_name}/progress")]
pub async fn update_progress(
    pool: web::Data<Pool>,
    auth: AuthedGroupId,
    path: web::Path<(i32, String)>,
    progress: web::Json<serde_json::Value>,
) -> Result<HttpResponse, ApiError> {
    update_member_progress(pool, auth, path, progress).await
}

/// Delete a milestone
#[actix_web::delete("/milestones/{milestone_id}")]
pub async fn delete(
    pool: web::Data<Pool>,
    auth: AuthedGroupId,
    path: web::Path<i32>,
) -> Result<HttpResponse, ApiError> {
    delete_milestone(pool, auth, path).await
}

/// Get group milestones with progress information
pub async fn get_group_milestones(
    pool: web::Data<Pool>,
    auth: AuthedGroupId,
    query: web::Query<GetMilestonesParams>,
) -> Result<HttpResponse, ApiError> {
    let client = pool.get().await?;
    
    // Build query
    let mut base_query = String::from(
        "SELECT 
            m.milestone_id, 
            m.title, 
            m.description, 
            m.milestone_type,
            m.target_data, 
            m.completion_criteria,
            m.start_date, 
            m.end_date,
            m.completed, 
            m.completed_at,
            m.created_at
         FROM 
            groupironman.group_milestones m
         WHERE 
            m.group_id = $1"
    );
    
    let mut params: Vec<&(dyn tokio_postgres::types::ToSql + Sync)> = vec![&auth.0];
    
    // Add filter for milestone type if provided
    if let Some(milestone_type) = &query.milestone_type {
        base_query.push_str(&format!(" AND m.milestone_type = ${}", params.len() + 1));
        params.push(milestone_type);
    }
    
    // Add filter for completion status
    if !query.include_completed {
        base_query.push_str(" AND m.completed = false");
    }
    
    // Add order by
    base_query.push_str(" ORDER BY m.completed, m.created_at DESC");
    
    // Execute query
    let stmt = client.prepare(&base_query).await?;
    let rows = client.query(&stmt, &params[..]).await?;
    
    // Get group members
    let members = get_group_members(&client, auth.0).await?;
    
    // Build response
    let mut milestones: Vec<MilestoneWithProgress> = Vec::new();
    
    for row in rows {
        let milestone = GroupMilestone {
            milestone_id: Some(row.get("milestone_id")),
            title: row.get("title"),
            description: row.get("description"),
            milestone_type: row.get("milestone_type"),
            target_data: row.get("target_data"),
            completion_criteria: row.get("completion_criteria"),
            start_date: row.get("start_date"),
            end_date: row.get("end_date"),
            completed: row.get("completed"),
            completed_at: row.get("completed_at"),
            created_at: row.get("created_at"),
        };
        
        // Get progress for each member
        let milestone_id: i32 = row.get("milestone_id");
        let progress_stmt = client.prepare(
            "SELECT 
                mem.member_name,
                mp.current_progress,
                mp.percent_complete,
                mp.last_updated
             FROM 
                groupironman.milestone_progress mp
                JOIN groupironman.members mem ON mp.member_id = mem.member_id
             WHERE 
                mp.milestone_id = $1"
        ).await?;
        
        let progress_rows = client.query(&progress_stmt, &[&milestone_id]).await?;
        
        let mut member_progress: Vec<MemberMilestoneProgress> = Vec::new();
        let mut total_progress: f32 = 0.0;
        
        for progress_row in progress_rows {
            let progress = MemberMilestoneProgress {
                member_name: progress_row.get("member_name"),
                current_progress: progress_row.get("current_progress"),
                percent_complete: progress_row.get("percent_complete"),
                last_updated: progress_row.get("last_updated"),
            };
            
            total_progress += progress.percent_complete;
            member_progress.push(progress);
        }
        
        // Calculate group progress (average of member progress)
        let group_progress = if !member_progress.is_empty() {
            total_progress / member_progress.len() as f32
        } else {
            0.0
        };
        
        milestones.push(MilestoneWithProgress {
            milestone,
            group_progress,
            member_progress,
        });
    }
    
    Ok(HttpResponse::Ok().json(MilestoneListResponse { milestones }))
}

/// Create a new group milestone
pub async fn create_group_milestone(
    pool: web::Data<Pool>,
    auth: AuthedGroupId,
    milestone_data: web::Json<GroupMilestone>,
) -> Result<HttpResponse, ApiError> {
    let client = pool.get().await?;
    
    // Insert milestone
    let stmt = client.prepare(
        "INSERT INTO groupironman.group_milestones (
            group_id, 
            title, 
            description, 
            milestone_type,
            target_data,
            completion_criteria,
            start_date,
            end_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING milestone_id"
    ).await?;
    
    let row = client.query_one(
        &stmt,
        &[
            &auth.0,
            &milestone_data.title,
            &milestone_data.description,
            &milestone_data.milestone_type,
            &milestone_data.target_data,
            &milestone_data.completion_criteria,
            &Utc::now(),
            &milestone_data.end_date,
        ],
    ).await?;
    
    let milestone_id: i32 = row.get(0);
    
    // Return the created milestone
    Ok(HttpResponse::Created().json(serde_json::json!({
        "milestone_id": milestone_id,
        "message": "Milestone created successfully"
    })))
}

/// Update a milestone's completion status
pub async fn update_milestone_status(
    pool: web::Data<Pool>,
    auth: AuthedGroupId,
    path: web::Path<i32>,
    status: web::Json<serde_json::Value>,
) -> Result<HttpResponse, ApiError> {
    let client = pool.get().await?;
    let milestone_id = path.into_inner();
    
    // Check if milestone belongs to the authenticated group
    let check_stmt = client.prepare(
        "SELECT milestone_id FROM groupironman.group_milestones 
         WHERE milestone_id = $1 AND group_id = $2"
    ).await?;
    
    let row = client.query_opt(&check_stmt, &[&milestone_id, &auth.0]).await?;
    
    if row.is_none() {
        return Err(ApiError::NotFound("Milestone not found".to_string()));
    }
    
    // Update milestone status
    let completed = status.get("completed").and_then(|v| v.as_bool()).unwrap_or(false);
    
    let update_stmt = client.prepare(
        "UPDATE groupironman.group_milestones
         SET 
            completed = $1,
            completed_at = CASE WHEN $1 = true THEN NOW() ELSE NULL END
         WHERE 
            milestone_id = $2"
    ).await?;
    
    client.execute(&update_stmt, &[&completed, &milestone_id]).await?;
    
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "message": "Milestone status updated successfully"
    })))
}

/// Update member progress for a milestone
pub async fn update_member_progress(
    pool: web::Data<Pool>,
    auth: AuthedGroupId,
    path: web::Path<(i32, String)>,
    progress: web::Json<serde_json::Value>,
) -> Result<HttpResponse, ApiError> {
    let client = pool.get().await?;
    let (milestone_id, member_name) = path.into_inner();
    
    // Check if milestone belongs to the authenticated group
    let check_stmt = client.prepare(
        "SELECT milestone_id FROM groupironman.group_milestones 
         WHERE milestone_id = $1 AND group_id = $2"
    ).await?;
    
    let row = client.query_opt(&check_stmt, &[&milestone_id, &auth.0]).await?;
    
    if row.is_none() {
        return Err(ApiError::NotFound("Milestone not found".to_string()));
    }
    
    // Get member ID
    let member_id = get_member_id(&client, auth.0, &member_name).await?;
    
    // Extract progress data
    let current_progress = progress.get("current_progress").cloned().unwrap_or(serde_json::json!({}));
    let percent_complete = progress.get("percent_complete").and_then(|v| v.as_f64()).unwrap_or(0.0) as f32;
    
    // Update or insert progress
    let upsert_stmt = client.prepare(
        "INSERT INTO groupironman.milestone_progress (
            milestone_id,
            member_id,
            current_progress,
            percent_complete,
            last_updated
        ) VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (milestone_id, member_id) 
        DO UPDATE SET
            current_progress = $3,
            percent_complete = $4,
            last_updated = NOW()"
    ).await?;
    
    client.execute(
        &upsert_stmt,
        &[&milestone_id, &member_id, &current_progress, &percent_complete],
    ).await?;
    
    // Check if milestone should be automatically completed
    // If all members have 100% progress, mark the milestone as completed
    let check_completion_stmt = client.prepare(
        "SELECT 
            COUNT(*) as total_members,
            SUM(CASE WHEN mp.percent_complete = 100 THEN 1 ELSE 0 END) as completed_members
         FROM 
            groupironman.milestone_progress mp
            JOIN groupironman.members m ON mp.member_id = m.member_id
         WHERE 
            mp.milestone_id = $1
            AND m.group_id = $2"
    ).await?;
    
    let completion_row = client.query_one(&check_completion_stmt, &[&milestone_id, &auth.0]).await?;
    let total_members: i64 = completion_row.get("total_members");
    let completed_members: i64 = completion_row.get("completed_members");
    
    if total_members > 0 && total_members == completed_members {
        // All members have completed their part, mark milestone as completed
        let complete_milestone_stmt = client.prepare(
            "UPDATE groupironman.group_milestones
             SET 
                completed = true,
                completed_at = NOW()
             WHERE 
                milestone_id = $1
                AND NOT completed"
        ).await?;
        
        client.execute(&complete_milestone_stmt, &[&milestone_id]).await?;
    }
    
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "message": "Progress updated successfully"
    })))
}

/// Delete a milestone
pub async fn delete_milestone(
    pool: web::Data<Pool>,
    auth: AuthedGroupId,
    path: web::Path<i32>,
) -> Result<HttpResponse, ApiError> {
    let client = pool.get().await?;
    let milestone_id = path.into_inner();
    
    // Check if milestone belongs to the authenticated group
    let check_stmt = client.prepare(
        "SELECT milestone_id FROM groupironman.group_milestones 
         WHERE milestone_id = $1 AND group_id = $2"
    ).await?;
    
    let row = client.query_opt(&check_stmt, &[&milestone_id, &auth.0]).await?;
    
    if row.is_none() {
        return Err(ApiError::NotFound("Milestone not found".to_string()));
    }
    
    // Delete milestone (will cascade to progress records)
    let delete_stmt = client.prepare(
        "DELETE FROM groupironman.group_milestones 
         WHERE milestone_id = $1"
    ).await?;
    
    client.execute(&delete_stmt, &[&milestone_id]).await?;
    
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "message": "Milestone deleted successfully"
    })))
}

/// Function to automatically update milestone progress based on RuneLite plugin data
pub async fn auto_update_milestone_progress(
    pool: web::Data<Pool>,
    group_id: i64,
    member_name: &str,
    member_data: &GroupMember,
) -> Result<(), ApiError> {
    let client = pool.get().await?;
    
    // Get member ID
    let member_id = get_member_id(&client, group_id, member_name).await?;
    
    // Get all incomplete milestones for this group
    let get_milestones_stmt = client.prepare(
        "SELECT 
            milestone_id, 
            milestone_type, 
            target_data,
            completion_criteria
         FROM 
            groupironman.group_milestones 
         WHERE 
            group_id = $1 
            AND completed = false"
    ).await?;
    
    let milestone_rows = client.query(&get_milestones_stmt, &[&group_id]).await?;
    
    for row in milestone_rows {
        let milestone_id: i32 = row.get("milestone_id");
        let milestone_type: String = row.get("milestone_type");
        let target_data: serde_json::Value = row.get("target_data");
        let completion_criteria: serde_json::Value = row.get("completion_criteria");
        
        // Calculate progress based on milestone type and member data
        let (current_progress, percent_complete) = calculate_progress(
            &milestone_type,
            &target_data,
            &completion_criteria,
            member_data,
        )?;
        
        // Update progress in database
        let upsert_stmt = client.prepare(
            "INSERT INTO groupironman.milestone_progress (
                milestone_id,
                member_id,
                current_progress,
                percent_complete,
                last_updated
            ) VALUES ($1, $2, $3, $4, NOW())
            ON CONFLICT (milestone_id, member_id) 
            DO UPDATE SET
                current_progress = $3,
                percent_complete = $4,
                last_updated = NOW()"
        ).await?;
        
        client.execute(
            &upsert_stmt,
            &[&milestone_id, &member_id, &current_progress, &percent_complete],
        ).await?;
        
        // Check if milestone should be marked as completed
        check_milestone_completion(&client, milestone_id, group_id).await?;
    }
    
    Ok(())
}

// Helper function to calculate progress based on the member data from RuneLite plugin
fn calculate_progress(
    milestone_type: &str,
    target_data: &serde_json::Value,
    completion_criteria: &serde_json::Value,
    member_data: &GroupMember,
) -> Result<(serde_json::Value, f32), ApiError> {
    let mut current_progress = serde_json::json!({});
    let mut percent_complete: f32 = 0.0;
    
    match milestone_type {
        "skill_total" => {
            // Calculate total level based on skills data
            if let Some(skills) = &member_data.skills {
                let skills_json: serde_json::Value = serde_json::from_str(skills).unwrap_or_default();
                
                if let Some(skills_obj) = skills_json.as_object() {
                    let mut total_level = 0;
                    
                    for (_, skill_data) in skills_obj {
                        if let Some(level) = skill_data.get("level").and_then(|l| l.as_i64()) {
                            total_level += level as i32;
                        }
                    }
                    
                    // Get target total level from milestone criteria
                    let target_total = target_data.get("totalLevel")
                        .and_then(|t| t.as_i64())
                        .unwrap_or(500) as i32;
                    
                    // Calculate percentage
                    percent_complete = (total_level as f32 / target_total as f32) * 100.0;
                    if percent_complete > 100.0 {
                        percent_complete = 100.0;
                    }
                    
                    current_progress = serde_json::json!({
                        "currentTotal": total_level,
                        "targetTotal": target_total
                    });
                }
            }
        },
        "boss_kc" => {
            // Calculate boss KC from stats data
            if let Some(stats) = &member_data.stats {
                let stats_json: serde_json::Value = serde_json::from_str(stats).unwrap_or_default();
                
                if let Some(boss_name) = target_data.get("bossName").and_then(|b| b.as_str()) {
                    let boss_key = format!("{}_kc", boss_name.to_lowercase().replace(' ', "_"));
                    
                    let current_kc = stats_json.get(&boss_key)
                        .and_then(|kc| kc.as_i64())
                        .unwrap_or(0) as i32;
                    
                    let target_kc = target_data.get("killCount")
                        .and_then(|kc| kc.as_i64())
                        .unwrap_or(50) as i32;
                    
                    percent_complete = (current_kc as f32 / target_kc as f32) * 100.0;
                    if percent_complete > 100.0 {
                        percent_complete = 100.0;
                    }
                    
                    current_progress = serde_json::json!({
                        "currentKc": current_kc,
                        "targetKc": target_kc,
                        "bossName": boss_name
                    });
                }
            }
        },
        "collection_log" => {
            // Calculate collection log completion
            if let Some(collection_log) = &member_data.collection_log {
                let collection_log_json: serde_json::Value = 
                    serde_json::from_str(collection_log).unwrap_or_default();
                
                if let Some(collection_name) = target_data.get("collectionName").and_then(|c| c.as_str()) {
                    // Check if this collection exists in the member's data
                    if let Some(collection) = collection_log_json.get(collection_name) {
                        let obtained_count = collection.get("obtained_count")
                            .and_then(|c| c.as_i64())
                            .unwrap_or(0) as i32;
                        
                        let total_count = collection.get("total_count")
                            .and_then(|c| c.as_i64())
                            .unwrap_or(1) as i32; // Prevent division by zero
                        
                        percent_complete = (obtained_count as f32 / total_count as f32) * 100.0;
                        if percent_complete > 100.0 {
                            percent_complete = 100.0;
                        }
                        
                        current_progress = serde_json::json!({
                            "obtainedCount": obtained_count,
                            "totalCount": total_count,
                            "collectionName": collection_name
                        });
                    }
                }
            }
        },
        "quest_completion" => {
            // Calculate quest completion
            if let Some(quests) = &member_data.quests {
                let quests_json: serde_json::Value = 
                    serde_json::from_str(quests).unwrap_or_default();
                
                let target_quests = target_data.get("questList")
                    .and_then(|q| q.as_array())
                    .unwrap_or(&Vec::new());
                
                if !target_quests.is_empty() {
                    let mut completed_count = 0;
                    
                    for quest in target_quests {
                        if let Some(quest_name) = quest.as_str() {
                            if let Some(status) = quests_json.get(quest_name) {
                                if status == "FINISHED" {
                                    completed_count += 1;
                                }
                            }
                        }
                    }
                    
                    percent_complete = (completed_count as f32 / target_quests.len() as f32) * 100.0;
                    
                    current_progress = serde_json::json!({
                        "completedCount": completed_count,
                        "totalQuests": target_quests.len(),
                    });
                }
            }
        },
        "achievement_diary" => {
            // Calculate achievement diary completion
            if let Some(diary_vars) = &member_data.diary_vars {
                let diary_json: serde_json::Value = 
                    serde_json::from_str(diary_vars).unwrap_or_default();
                
                if let Some(diary_name) = target_data.get("diaryName").and_then(|d| d.as_str()) {
                    if let Some(tier) = target_data.get("tier").and_then(|t| t.as_str()) {
                        let key = format!("{}_{}", diary_name.to_lowercase(), tier.to_lowercase());
                        
                        let completed = diary_json.get(&key)
                            .and_then(|c| c.as_bool())
                            .unwrap_or(false);
                        
                        percent_complete = if completed { 100.0 } else { 0.0 };
                        
                        current_progress = serde_json::json!({
                            "completed": completed,
                            "diaryName": diary_name,
                            "tier": tier
                        });
                    }
                }
            }
        },
        _ => {
            // For custom milestones, we don't auto-calculate progress
            current_progress = serde_json::json!({});
            percent_complete = 0.0;
        }
    }
    
    Ok((current_progress, percent_complete))
}

// Helper function to check if a milestone should be marked as completed
async fn check_milestone_completion(
    client: &deadpool_postgres::Client,
    milestone_id: i32,
    group_id: i64,
) -> Result<(), ApiError> {
    let check_completion_stmt = client.prepare(
        "SELECT 
            COUNT(*) as total_members,
            SUM(CASE WHEN mp.percent_complete = 100 THEN 1 ELSE 0 END) as completed_members
         FROM 
            groupironman.milestone_progress mp
            JOIN groupironman.members m ON mp.member_id = m.member_id
         WHERE 
            mp.milestone_id = $1
            AND m.group_id = $2"
    ).await?;
    
    let completion_row = client.query_one(&check_completion_stmt, &[&milestone_id, &group_id]).await?;
    let total_members: i64 = completion_row.get("total_members");
    let completed_members: i64 = completion_row.get("completed_members");
    
    if total_members > 0 && total_members == completed_members {
        // All members have completed their part, mark milestone as completed
        let complete_milestone_stmt = client.prepare(
            "UPDATE groupironman.group_milestones
             SET 
                completed = true,
                completed_at = NOW()
             WHERE 
                milestone_id = $1
                AND NOT completed"
        ).await?;
        
        client.execute(&complete_milestone_stmt, &[&milestone_id]).await?;
    }
    
    Ok(())
}

pub fn endpoints(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/api")
            .service(web::resource("/milestones").route(web::get().to(get_milestones)))
            .service(web::resource("/milestones").route(web::post().to(create_milestone)))
            .service(web::resource("/milestones/{milestone_id}/status").route(web::patch().to(update_status)))
            .service(web::resource("/milestones/{milestone_id}/members/{member_name}/progress").route(web::patch().to(update_progress)))
            .service(web::resource("/milestones/{milestone_id}").route(web::delete().to(delete)))
    );
}
