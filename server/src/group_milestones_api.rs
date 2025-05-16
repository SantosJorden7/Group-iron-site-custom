use actix_web::{web, HttpResponse, Responder};
use deadpool_postgres::{Client, Pool};
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use std::error::Error;

#[derive(Debug, Serialize, Deserialize)]
pub struct GroupMilestone {
    pub id: Option<i64>,
    pub group_id: i64,
    pub title: String,
    pub description: Option<String>,
    pub milestone_type: String,
    pub target_date: Option<DateTime<Utc>>,
    pub completed: bool,
    pub completed_at: Option<DateTime<Utc>>,
    pub created_by: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

// Get all milestones for a group
pub async fn get_milestones(
    pool: web::Data<Pool>,
    path: web::Path<(i64,)>,
) -> Result<HttpResponse, Box<dyn Error>> {
    let client = pool.get().await?;
    let (group_id,) = path.into_inner();
    
    let rows = client.query(
        "SELECT id, group_id, title, description, milestone_type, target_date, completed, completed_at, created_by, created_at, updated_at FROM group_milestones WHERE group_id = $1 ORDER BY created_at DESC",
        &[&group_id]
    ).await?;
    
    let milestones: Vec<GroupMilestone> = rows.iter().map(|row| GroupMilestone {
        id: row.get(0),
        group_id: row.get(1),
        title: row.get(2),
        description: row.get(3),
        milestone_type: row.get(4),
        target_date: row.get(5),
        completed: row.get(6),
        completed_at: row.get(7),
        created_by: row.get(8),
        created_at: row.get(9),
        updated_at: row.get(10),
    }).collect();
    
    Ok(HttpResponse::Ok().json(milestones))
}

// Get a single milestone
pub async fn get_milestone(
    pool: web::Data<Pool>,
    path: web::Path<(i64, i64)>,
) -> Result<HttpResponse, Box<dyn Error>> {
    let client = pool.get().await?;
    let (group_id, milestone_id) = path.into_inner();
    
    let row = client.query_one(
        "SELECT id, group_id, title, description, milestone_type, target_date, completed, completed_at, created_by, created_at, updated_at FROM group_milestones WHERE id = $1 AND group_id = $2",
        &[&milestone_id, &group_id]
    ).await?;
    
    let milestone = GroupMilestone {
        id: row.get(0),
        group_id: row.get(1),
        title: row.get(2),
        description: row.get(3),
        milestone_type: row.get(4),
        target_date: row.get(5),
        completed: row.get(6),
        completed_at: row.get(7),
        created_by: row.get(8),
        created_at: row.get(9),
        updated_at: row.get(10),
    };
    
    Ok(HttpResponse::Ok().json(milestone))
}

// Create a new milestone
pub async fn create_milestone(
    pool: web::Data<Pool>,
    path: web::Path<(i64,)>,
    milestone: web::Json<GroupMilestone>,
) -> Result<HttpResponse, Box<dyn Error>> {
    let client = pool.get().await?;
    let (group_id,) = path.into_inner();
    
    let row = client.query_one(
        "INSERT INTO group_milestones (group_id, title, description, milestone_type, target_date, created_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
        &[&group_id, &milestone.title, &milestone.description, &milestone.milestone_type, &milestone.target_date, &milestone.created_by]
    ).await?;
    
    let milestone_id: i64 = row.get(0);
    
    Ok(HttpResponse::Created().json(serde_json::json!({"id": milestone_id})))
}

// Update a milestone
pub async fn update_milestone(
    pool: web::Data<Pool>,
    path: web::Path<(i64, i64)>,
    milestone: web::Json<GroupMilestone>,
) -> Result<HttpResponse, Box<dyn Error>> {
    let client = pool.get().await?;
    let (group_id, milestone_id) = path.into_inner();
    
    client.execute(
        "UPDATE group_milestones SET title = $1, description = $2, milestone_type = $3, target_date = $4, updated_at = NOW() WHERE id = $5 AND group_id = $6",
        &[&milestone.title, &milestone.description, &milestone.milestone_type, &milestone.target_date, &milestone_id, &group_id]
    ).await?;
    
    Ok(HttpResponse::Ok().finish())
}

// Delete a milestone
pub async fn delete_milestone(
    pool: web::Data<Pool>,
    path: web::Path<(i64, i64)>,
) -> Result<HttpResponse, Box<dyn Error>> {
    let client = pool.get().await?;
    let (group_id, milestone_id) = path.into_inner();
    
    client.execute(
        "DELETE FROM group_milestones WHERE id = $1 AND group_id = $2",
        &[&milestone_id, &group_id]
    ).await?;
    
    Ok(HttpResponse::NoContent().finish())
}

// Mark a milestone as complete
pub async fn complete_milestone(
    pool: web::Data<Pool>,
    path: web::Path<(i64, i64)>,
) -> Result<HttpResponse, Box<dyn Error>> {
    let client = pool.get().await?;
    let (group_id, milestone_id) = path.into_inner();
    
    client.execute(
        "UPDATE group_milestones SET completed = true, completed_at = NOW(), updated_at = NOW() WHERE id = $1 AND group_id = $2",
        &[&milestone_id, &group_id]
    ).await?;
    
    Ok(HttpResponse::Ok().finish())
}
