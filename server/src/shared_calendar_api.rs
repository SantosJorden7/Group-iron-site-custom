use actix_web::{web, HttpResponse, Responder};
use deadpool_postgres::{Client, Pool};
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use std::error::Error;

#[derive(Debug, Serialize, Deserialize)]
pub struct CalendarEvent {
    pub id: Option<i64>,
    pub group_id: i64,
    pub title: String,
    pub description: Option<String>,
    pub event_type: String,
    pub start_time: DateTime<Utc>,
    pub end_time: Option<DateTime<Utc>>,
    pub all_day: bool,
    pub location: Option<String>,
    pub created_by: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

// Get all events for a group
pub async fn get_events(
    pool: web::Data<Pool>,
    path: web::Path<(i64,)>,
) -> Result<HttpResponse, Box<dyn Error>> {
    let client = pool.get().await?;
    let (group_id,) = path.into_inner();
    
    let rows = client.query(
        "SELECT id, group_id, title, description, event_type, start_time, end_time, all_day, location, created_by, created_at, updated_at FROM calendar_events WHERE group_id = $1 ORDER BY start_time",
        &[&group_id]
    ).await?;
    
    let events: Vec<CalendarEvent> = rows.iter().map(|row| CalendarEvent {
        id: row.get(0),
        group_id: row.get(1),
        title: row.get(2),
        description: row.get(3),
        event_type: row.get(4),
        start_time: row.get(5),
        end_time: row.get(6),
        all_day: row.get(7),
        location: row.get(8),
        created_by: row.get(9),
        created_at: row.get(10),
        updated_at: row.get(11),
    }).collect();
    
    Ok(HttpResponse::Ok().json(events))
}

// Get a single event
pub async fn get_event(
    pool: web::Data<Pool>,
    path: web::Path<(i64, i64)>,
) -> Result<HttpResponse, Box<dyn Error>> {
    let client = pool.get().await?;
    let (group_id, event_id) = path.into_inner();
    
    let row = client.query_one(
        "SELECT id, group_id, title, description, event_type, start_time, end_time, all_day, location, created_by, created_at, updated_at FROM calendar_events WHERE id = $1 AND group_id = $2",
        &[&event_id, &group_id]
    ).await?;
    
    let event = CalendarEvent {
        id: row.get(0),
        group_id: row.get(1),
        title: row.get(2),
        description: row.get(3),
        event_type: row.get(4),
        start_time: row.get(5),
        end_time: row.get(6),
        all_day: row.get(7),
        location: row.get(8),
        created_by: row.get(9),
        created_at: row.get(10),
        updated_at: row.get(11),
    };
    
    Ok(HttpResponse::Ok().json(event))
}

// Create a new event
pub async fn create_event(
    pool: web::Data<Pool>,
    path: web::Path<(i64,)>,
    event: web::Json<CalendarEvent>,
) -> Result<HttpResponse, Box<dyn Error>> {
    let client = pool.get().await?;
    let (group_id,) = path.into_inner();
    
    let row = client.query_one(
        "INSERT INTO calendar_events (group_id, title, description, event_type, start_time, end_time, all_day, location, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id",
        &[
            &group_id, 
            &event.title, 
            &event.description, 
            &event.event_type, 
            &event.start_time, 
            &event.end_time, 
            &event.all_day, 
            &event.location, 
            &event.created_by
        ]
    ).await?;
    
    let event_id: i64 = row.get(0);
    
    Ok(HttpResponse::Created().json(serde_json::json!({"id": event_id})))
}

// Update an event
pub async fn update_event(
    pool: web::Data<Pool>,
    path: web::Path<(i64, i64)>,
    event: web::Json<CalendarEvent>,
) -> Result<HttpResponse, Box<dyn Error>> {
    let client = pool.get().await?;
    let (group_id, event_id) = path.into_inner();
    
    client.execute(
        "UPDATE calendar_events SET title = $1, description = $2, event_type = $3, start_time = $4, end_time = $5, all_day = $6, location = $7, updated_at = NOW() WHERE id = $8 AND group_id = $9",
        &[
            &event.title, 
            &event.description, 
            &event.event_type, 
            &event.start_time, 
            &event.end_time, 
            &event.all_day, 
            &event.location, 
            &event_id, 
            &group_id
        ]
    ).await?;
    
    Ok(HttpResponse::Ok().finish())
}

// Delete an event
pub async fn delete_event(
    pool: web::Data<Pool>,
    path: web::Path<(i64, i64)>,
) -> Result<HttpResponse, Box<dyn Error>> {
    let client = pool.get().await?;
    let (group_id, event_id) = path.into_inner();
    
    client.execute(
        "DELETE FROM calendar_events WHERE id = $1 AND group_id = $2",
        &[&event_id, &group_id]
    ).await?;
    
    Ok(HttpResponse::NoContent().finish())
}
