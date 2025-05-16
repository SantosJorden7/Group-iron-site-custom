use actix_web::{web, HttpResponse, Responder};
use deadpool_postgres::{Client, Pool};
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use std::error::Error;

#[derive(Debug, Serialize, Deserialize)]
pub struct GroupChallenge {
    pub id: Option<i64>,
    pub group_id: i64,
    pub title: String,
    pub description: Option<String>,
    pub challenge_type: String,
    pub target_value: i32,
    pub current_value: i32,
    pub reward: Option<String>,
    pub created_by: String,
    pub created_at: DateTime<Utc>,
    pub start_date: Option<DateTime<Utc>>,
    pub end_date: Option<DateTime<Utc>>,
    pub completed: bool,
    pub completed_at: Option<DateTime<Utc>>,
}

// Get all challenges for a group
pub async fn get_challenges(
    pool: web::Data<Pool>,
    path: web::Path<(i64,)>,
) -> Result<HttpResponse, Box<dyn Error>> {
    let client = pool.get().await?;
    let (group_id,) = path.into_inner();
    
    let rows = client.query(
        "SELECT id, group_id, title, description, challenge_type, target_value, current_value, reward, created_by, created_at, start_date, end_date, completed, completed_at FROM group_challenges WHERE group_id = $1 ORDER BY created_at DESC",
        &[&group_id]
    ).await?;
    
    let challenges: Vec<GroupChallenge> = rows.iter().map(|row| GroupChallenge {
        id: row.get(0),
        group_id: row.get(1),
        title: row.get(2),
        description: row.get(3),
        challenge_type: row.get(4),
        target_value: row.get(5),
        current_value: row.get(6),
        reward: row.get(7),
        created_by: row.get(8),
        created_at: row.get(9),
        start_date: row.get(10),
        end_date: row.get(11),
        completed: row.get(12),
        completed_at: row.get(13),
    }).collect();
    
    Ok(HttpResponse::Ok().json(challenges))
}

// Get a single challenge
pub async fn get_challenge(
    pool: web::Data<Pool>,
    path: web::Path<(i64, i64)>,
) -> Result<HttpResponse, Box<dyn Error>> {
    let client = pool.get().await?;
    let (group_id, challenge_id) = path.into_inner();
    
    let row = client.query_one(
        "SELECT id, group_id, title, description, challenge_type, target_value, current_value, reward, created_by, created_at, start_date, end_date, completed, completed_at FROM group_challenges WHERE id = $1 AND group_id = $2",
        &[&challenge_id, &group_id]
    ).await?;
    
    let challenge = GroupChallenge {
        id: row.get(0),
        group_id: row.get(1),
        title: row.get(2),
        description: row.get(3),
        challenge_type: row.get(4),
        target_value: row.get(5),
        current_value: row.get(6),
        reward: row.get(7),
        created_by: row.get(8),
        created_at: row.get(9),
        start_date: row.get(10),
        end_date: row.get(11),
        completed: row.get(12),
        completed_at: row.get(13),
    };
    
    Ok(HttpResponse::Ok().json(challenge))
}

// Create a new challenge
pub async fn create_challenge(
    pool: web::Data<Pool>,
    path: web::Path<(i64,)>,
    challenge: web::Json<GroupChallenge>,
) -> Result<HttpResponse, Box<dyn Error>> {
    let client = pool.get().await?;
    let (group_id,) = path.into_inner();
    
    let row = client.query_one(
        "INSERT INTO group_challenges (group_id, title, description, challenge_type, target_value, current_value, reward, created_by, start_date, end_date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id",
        &[
            &group_id, 
            &challenge.title, 
            &challenge.description, 
            &challenge.challenge_type, 
            &challenge.target_value, 
            &challenge.current_value, 
            &challenge.reward, 
            &challenge.created_by,
            &challenge.start_date,
            &challenge.end_date
        ]
    ).await?;
    
    let challenge_id: i64 = row.get(0);
    
    Ok(HttpResponse::Created().json(serde_json::json!({"id": challenge_id})))
}

// Update a challenge
pub async fn update_challenge(
    pool: web::Data<Pool>,
    path: web::Path<(i64, i64)>,
    challenge: web::Json<GroupChallenge>,
) -> Result<HttpResponse, Box<dyn Error>> {
    let client = pool.get().await?;
    let (group_id, challenge_id) = path.into_inner();
    
    client.execute(
        "UPDATE group_challenges SET title = $1, description = $2, challenge_type = $3, target_value = $4, current_value = $5, reward = $6, start_date = $7, end_date = $8 WHERE id = $9 AND group_id = $10",
        &[
            &challenge.title, 
            &challenge.description, 
            &challenge.challenge_type, 
            &challenge.target_value, 
            &challenge.current_value, 
            &challenge.reward,
            &challenge.start_date,
            &challenge.end_date,
            &challenge_id,
            &group_id
        ]
    ).await?;
    
    Ok(HttpResponse::Ok().finish())
}

// Delete a challenge
pub async fn delete_challenge(
    pool: web::Data<Pool>,
    path: web::Path<(i64, i64)>,
) -> Result<HttpResponse, Box<dyn Error>> {
    let client = pool.get().await?;
    let (group_id, challenge_id) = path.into_inner();
    
    client.execute(
        "DELETE FROM group_challenges WHERE id = $1 AND group_id = $2",
        &[&challenge_id, &group_id]
    ).await?;
    
    Ok(HttpResponse::NoContent().finish())
}

// Mark a challenge as complete
pub async fn complete_challenge(
    pool: web::Data<Pool>,
    path: web::Path<(i64, i64)>,
) -> Result<HttpResponse, Box<dyn Error>> {
    let client = pool.get().await?;
    let (group_id, challenge_id) = path.into_inner();
    
    client.execute(
        "UPDATE group_challenges SET completed = true, completed_at = NOW() WHERE id = $1 AND group_id = $2",
        &[&challenge_id, &group_id]
    ).await?;
    
    Ok(HttpResponse::Ok().finish())
}
