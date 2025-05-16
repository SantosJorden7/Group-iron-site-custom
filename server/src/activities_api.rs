use actix_web::{web, HttpResponse, Responder};
use deadpool_postgres::{Client, Pool};
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use std::error::Error;

#[derive(Debug, Serialize, Deserialize)]
pub struct Activity {
    pub id: Option<i64>,
    pub group_id: i64,
    pub title: String,
    pub description: Option<String>,
    pub activity_type: String,
    pub points: i32,
    pub created_by: String,
    pub created_at: DateTime<Utc>,
    pub completed: bool,
    pub completed_at: Option<DateTime<Utc>>,
    pub completed_by: Option<String>,
}

// Get all activities for a group
pub async fn get_activities(
    pool: web::Data<Pool>,
    path: web::Path<(i64,)>,
) -> Result<HttpResponse, Box<dyn Error>> {
    let client = pool.get().await?;
    let (group_id,) = path.into_inner();
    
    let rows = client.query(
        "SELECT id, group_id, title, description, activity_type, points, created_by, created_at, completed, completed_at, completed_by FROM activities WHERE group_id = $1 ORDER BY created_at DESC",
        &[&group_id]
    ).await?;
    
    let activities: Vec<Activity> = rows.iter().map(|row| Activity {
        id: row.get(0),
        group_id: row.get(1),
        title: row.get(2),
        description: row.get(3),
        activity_type: row.get(4),
        points: row.get(5),
        created_by: row.get(6),
        created_at: row.get(7),
        completed: row.get(8),
        completed_at: row.get(9),
        completed_by: row.get(10),
    }).collect();
    
    Ok(HttpResponse::Ok().json(activities))
}

// Create a new activity
pub async fn create_activity(
    pool: web::Data<Pool>,
    path: web::Path<(i64,)>,
    activity: web::Json<Activity>,
) -> Result<HttpResponse, Box<dyn Error>> {
    let client = pool.get().await?;
    let (group_id,) = path.into_inner();
    
    let row = client.query_one(
        "INSERT INTO activities (group_id, title, description, activity_type, points, created_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
        &[&group_id, &activity.title, &activity.description, &activity.activity_type, &activity.points, &activity.created_by]
    ).await?;
    
    let activity_id: i64 = row.get(0);
    
    Ok(HttpResponse::Created().json(serde_json::json!({"id": activity_id})))
}

// Get a single activity
pub async fn get_activity(
    pool: web::Data<Pool>,
    path: web::Path<(i64, i64)>,
) -> Result<HttpResponse, Box<dyn Error>> {
    let client = pool.get().await?;
    let (group_id, activity_id) = path.into_inner();
    
    let row = client.query_one(
        "SELECT id, group_id, title, description, activity_type, points, created_by, created_at, completed, completed_at, completed_by FROM activities WHERE id = $1 AND group_id = $2",
        &[&activity_id, &group_id]
    ).await?;
    
    let activity = Activity {
        id: row.get(0),
        group_id: row.get(1),
        title: row.get(2),
        description: row.get(3),
        activity_type: row.get(4),
        points: row.get(5),
        created_by: row.get(6),
        created_at: row.get(7),
        completed: row.get(8),
        completed_at: row.get(9),
        completed_by: row.get(10),
    };
    
    Ok(HttpResponse::Ok().json(activity))
}

// Update an activity
pub async fn update_activity(
    pool: web::Data<Pool>,
    path: web::Path<(i64, i64)>,
    activity: web::Json<Activity>,
) -> Result<HttpResponse, Box<dyn Error>> {
    let client = pool.get().await?;
    let (group_id, activity_id) = path.into_inner();
    
    client.execute(
        "UPDATE activities SET title = $1, description = $2, activity_type = $3, points = $4 WHERE id = $5 AND group_id = $6",
        &[&activity.title, &activity.description, &activity.activity_type, &activity.points, &activity_id, &group_id]
    ).await?;
    
    Ok(HttpResponse::Ok().finish())
}

// Delete an activity
pub async fn delete_activity(
    pool: web::Data<Pool>,
    path: web::Path<(i64, i64)>,
) -> Result<HttpResponse, Box<dyn Error>> {
    let client = pool.get().await?;
    let (group_id, activity_id) = path.into_inner();
    
    client.execute(
        "DELETE FROM activities WHERE id = $1 AND group_id = $2",
        &[&activity_id, &group_id]
    ).await?;
    
    Ok(HttpResponse::NoContent().finish())
}

// Mark an activity as complete
pub async fn complete_activity(
    pool: web::Data<Pool>,
    path: web::Path<(i64, i64)>,
    completed_by: web::Json<serde_json::Value>,
) -> Result<HttpResponse, Box<dyn Error>> {
    let client = pool.get().await?;
    let (group_id, activity_id) = path.into_inner();
    let username = completed_by.get("username")
        .and_then(|v| v.as_str())
        .ok_or_else(|| "Missing username")?;
    
    client.execute(
        "UPDATE activities SET completed = true, completed_at = NOW(), completed_by = $1 WHERE id = $2 AND group_id = $3",
        &[&username, &activity_id, &group_id]
    ).await?;
    
    Ok(HttpResponse::Ok().finish())
}
