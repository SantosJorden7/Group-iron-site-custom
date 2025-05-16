use crate::auth_middleware::AuthedGroupId;
use crate::db::{get_member_id};
use crate::error::ApiError;
use actix_web::{web, HttpResponse};
use deadpool_postgres::Pool;
use serde::{Deserialize, Serialize};

// Request types
#[derive(Deserialize)]
pub struct AddPointsRequest {
    member_name: String,
    point_type: String,
    points: i32,
}

#[derive(Deserialize)]
pub struct GetPointsRequest {
    member_name: Option<String>,
    point_type: Option<String>,
}

#[derive(Deserialize)]
pub struct CompleteActivityRequest {
    member_name: String,
    activity_id: i32,
    proof_data: Option<serde_json::Value>,
}

// Response types
#[derive(Serialize)]
pub struct MemberPoints {
    member_name: String,
    point_type: String,
    points: i32,
    last_updated: chrono::DateTime<chrono::Utc>,
}

#[derive(Serialize)]
pub struct Activity {
    activity_id: i32,
    activity_name: String,
    activity_description: Option<String>,
    point_value: i32,
    category: Option<String>,
    icon_url: Option<String>,
    required_proof: bool,
}

#[derive(Serialize)]
pub struct PlayerActivity {
    activity_id: i32,
    activity_name: String,
    completion_date: chrono::DateTime<chrono::Utc>,
    verified: bool,
}

// Add points to a player
pub async fn add_points(
    pool: web::Data<Pool>,
    auth: AuthedGroupId,
    request: web::Json<AddPointsRequest>,
) -> Result<HttpResponse, ApiError> {
    let client = pool.get().await?;
    let member_id = get_member_id(&client, auth.0, &request.member_name).await?;
    
    let stmt = client
        .prepare_cached(
            "INSERT INTO groupironman.player_points (member_id, point_type, points) 
             VALUES ($1, $2, $3) 
             ON CONFLICT (member_id, point_type) 
             DO UPDATE SET points = groupironman.player_points.points + $3, 
                          last_updated = CURRENT_TIMESTAMP
             RETURNING points, last_updated"
        )
        .await?;
    
    let row = client
        .query_one(&stmt, &[&member_id, &request.point_type, &request.points])
        .await?;
    
    let total_points: i32 = row.try_get(0)?;
    let last_updated: chrono::DateTime<chrono::Utc> = row.try_get(1)?;
    
    Ok(HttpResponse::Ok().json(MemberPoints {
        member_name: request.member_name.clone(),
        point_type: request.point_type.clone(),
        points: total_points,
        last_updated,
    }))
}

// Get points for a player or group
pub async fn get_points(
    pool: web::Data<Pool>,
    auth: AuthedGroupId,
    query: web::Query<GetPointsRequest>,
) -> Result<HttpResponse, ApiError> {
    let client = pool.get().await?;
    
    let mut points = Vec::new();
    
    if let Some(member_name) = &query.member_name {
        // Get points for a specific player
        let member_id = get_member_id(&client, auth.0, member_name).await?;
        
        let stmt = client
            .prepare_cached(
                "SELECT point_type, points, last_updated 
                 FROM groupironman.player_points 
                 WHERE member_id = $1
                 ORDER BY point_type"
            )
            .await?;
        
        let point_type_filter = if let Some(pt) = &query.point_type {
            pt.clone()
        } else {
            "%".to_string()
        };
        
        let rows = client
            .query(&stmt, &[&member_id])
            .await?;
        
        for row in rows {
            let point_type: String = row.try_get(0)?;
            
            if point_type.contains(&point_type_filter) || point_type_filter == "%" {
                let point_value: i32 = row.try_get(1)?;
                let last_updated: chrono::DateTime<chrono::Utc> = row.try_get(2)?;
                
                points.push(MemberPoints {
                    member_name: member_name.clone(),
                    point_type,
                    points: point_value,
                    last_updated,
                });
            }
        }
    } else {
        // Get points for all players in the group
        let stmt = client
            .prepare_cached(
                "SELECT m.name, pp.point_type, pp.points, pp.last_updated
                 FROM groupironman.members m
                 JOIN groupironman.player_points pp ON m.id = pp.member_id
                 WHERE m.group_id = $1
                 ORDER BY m.name, pp.point_type"
            )
            .await?;
        
        let point_type_filter = if let Some(pt) = &query.point_type {
            pt.clone()
        } else {
            "%".to_string()
        };
        
        let rows = client
            .query(&stmt, &[&auth.0])
            .await?;
        
        for row in rows {
            let member_name: String = row.try_get(0)?;
            let point_type: String = row.try_get(1)?;
            
            if point_type.contains(&point_type_filter) || point_type_filter == "%" {
                let point_value: i32 = row.try_get(2)?;
                let last_updated: chrono::DateTime<chrono::Utc> = row.try_get(3)?;
                
                points.push(MemberPoints {
                    member_name,
                    point_type,
                    points: point_value,
                    last_updated,
                });
            }
        }
    }
    
    Ok(HttpResponse::Ok().json(points))
}

// Get all available activities
pub async fn get_activities(
    pool: web::Data<Pool>,
    _auth: AuthedGroupId,
) -> Result<HttpResponse, ApiError> {
    let client = pool.get().await?;
    
    let stmt = client
        .prepare_cached(
            "SELECT id, name, description, points, category, icon_url, requires_proof 
             FROM groupironman.activities 
             ORDER BY category, name"
        )
        .await?;
    
    let rows = client.query(&stmt, &[]).await?;
    
    let activities: Vec<Activity> = rows
        .iter()
        .map(|row| {
            Ok(Activity {
                activity_id: row.try_get(0)?,
                activity_name: row.try_get(1)?,
                activity_description: row.try_get(2)?,
                point_value: row.try_get(3)?,
                category: row.try_get(4)?,
                icon_url: row.try_get(5)?,
                required_proof: row.try_get(6)?,
            })
        })
        .collect::<Result<_, tokio_postgres::Error>>()?;
    
    Ok(HttpResponse::Ok().json(activities))
}

// Mark an activity as completed
pub async fn complete_activity(
    pool: web::Data<Pool>,
    auth: AuthedGroupId,
    request: web::Json<CompleteActivityRequest>,
) -> Result<HttpResponse, ApiError> {
    let client = pool.get().await?;
    
    // Get member ID
    let member_id = get_member_id(&client, auth.0, &request.member_name).await?;
    
    // Get activity details
    let stmt = client
        .prepare_cached(
            "SELECT name, points, requires_proof 
             FROM groupironman.activities 
             WHERE id = $1"
        )
        .await?;
    
    let row = client
        .query_one(&stmt, &[&request.activity_id])
        .await?;
    
    let activity_name: String = row.try_get(0)?;
    let points: i32 = row.try_get(1)?;
    let requires_proof: bool = row.try_get(2)?;
    
    // Check if proof is required but not provided
    let verified = if requires_proof {
        match &request.proof_data {
            Some(_) => true,
            None => false,
        }
    } else {
        true
    };
    
    // Record completion
    let stmt = client
        .prepare_cached(
            "INSERT INTO groupironman.player_activities 
             (member_id, activity_id, completion_date, verified, proof_data) 
             VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4)
             RETURNING completion_date"
        )
        .await?;
    
    let row = client
        .query_one(
            &stmt,
            &[
                &member_id,
                &request.activity_id,
                &verified,
                &request.proof_data,
            ],
        )
        .await?;
    
    let completion_date: chrono::DateTime<chrono::Utc> = row.try_get(0)?;
    
    // Award points if verified
    if verified {
        let stmt = client
            .prepare_cached(
                "INSERT INTO groupironman.player_points (member_id, point_type, points) 
                 VALUES ($1, 'activity', $2) 
                 ON CONFLICT (member_id, point_type) 
                 DO UPDATE SET points = groupironman.player_points.points + $2,
                              last_updated = CURRENT_TIMESTAMP"
            )
            .await?;
        
        client
            .execute(&stmt, &[&member_id, &points])
            .await?;
    }
    
    Ok(HttpResponse::Ok().json(PlayerActivity {
        activity_id: request.activity_id,
        activity_name,
        completion_date,
        verified,
    }))
}

// Get completed activities for a player
pub async fn get_player_activities(
    pool: web::Data<Pool>,
    auth: AuthedGroupId,
    member_name: web::Path<String>,
) -> Result<HttpResponse, ApiError> {
    let client = pool.get().await?;
    
    // Get member ID
    let member_id = get_member_id(&client, auth.0, &member_name).await?;
    
    let stmt = client
        .prepare_cached(
            "SELECT a.id, a.name, pa.completion_date, pa.verified
             FROM groupironman.player_activities pa
             JOIN groupironman.activities a ON pa.activity_id = a.id
             WHERE pa.member_id = $1
             ORDER BY pa.completion_date DESC"
        )
        .await?;
    
    let rows = client.query(&stmt, &[&member_id]).await?;
    
    let activities: Vec<PlayerActivity> = rows
        .iter()
        .map(|row| {
            Ok(PlayerActivity {
                activity_id: row.try_get(0)?,
                activity_name: row.try_get(1)?,
                completion_date: row.try_get(2)?,
                verified: row.try_get(3)?,
            })
        })
        .collect::<Result<_, tokio_postgres::Error>>()?;
    
    Ok(HttpResponse::Ok().json(activities))
}
