use actix_web::{web, HttpResponse, Responder};
use deadpool_postgres::{Client, Pool};
use serde::{Deserialize, Serialize};
use std::error::Error;

#[derive(Debug, Serialize, Deserialize)]
pub struct BossStrategy {
    pub id: Option<i64>,
    pub group_id: i64,
    pub boss_name: String,
    pub difficulty: String,
    pub recommended_gear: String,
    pub recommended_inventory: String,
    pub strategy: String,
    pub created_by: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

// List all boss strategies for a group
pub async fn list_strategies(
    pool: web::Data<Pool>,
    path: web::Path<(i64,)>,
) -> Result<HttpResponse, Box<dyn Error>> {
    let client = pool.get().await?;
    let (group_id,) = path.into_inner();
    
    let rows = client.query(
        "SELECT id, group_id, boss_name, difficulty, recommended_gear, recommended_inventory, strategy, created_by, created_at, updated_at FROM boss_strategies WHERE group_id = $1 ORDER BY boss_name",
        &[&group_id]
    ).await?;
    
    let strategies: Vec<BossStrategy> = rows.iter().map(|row| BossStrategy {
        id: row.get(0),
        group_id: row.get(1),
        boss_name: row.get(2),
        difficulty: row.get(3),
        recommended_gear: row.get(4),
        recommended_inventory: row.get(5),
        strategy: row.get(6),
        created_by: row.get(7),
        created_at: row.get(8),
        updated_at: row.get(9),
    }).collect();
    
    Ok(HttpResponse::Ok().json(strategies))
}

// Get a specific boss strategy
pub async fn get_strategy(
    pool: web::Data<Pool>,
    path: web::Path<(i64, String)>,
) -> Result<HttpResponse, Box<dyn Error>> {
    let client = pool.get().await?;
    let (group_id, boss_name) = path.into_inner();
    
    let row = client.query_one(
        "SELECT id, group_id, boss_name, difficulty, recommended_gear, recommended_inventory, strategy, created_by, created_at, updated_at FROM boss_strategies WHERE group_id = $1 AND LOWER(boss_name) = LOWER($2)",
        &[&group_id, &boss_name]
    ).await?;
    
    let strategy = BossStrategy {
        id: row.get(0),
        group_id: row.get(1),
        boss_name: row.get(2),
        difficulty: row.get(3),
        recommended_gear: row.get(4),
        recommended_inventory: row.get(5),
        strategy: row.get(6),
        created_by: row.get(7),
        created_at: row.get(8),
        updated_at: row.get(9),
    };
    
    Ok(HttpResponse::Ok().json(strategy))
}

// Create a new boss strategy
pub async fn create_strategy(
    pool: web::Data<Pool>,
    path: web::Path<(i64,)>,
    strategy: web::Json<BossStrategy>,
) -> Result<HttpResponse, Box<dyn Error>> {
    let client = pool.get().await?;
    let (group_id,) = path.into_inner();
    
    let row = client.query_one(
        "INSERT INTO boss_strategies (group_id, boss_name, difficulty, recommended_gear, recommended_inventory, strategy, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id",
        &[&group_id, &strategy.boss_name, &strategy.difficulty, &strategy.recommended_gear, &strategy.recommended_inventory, &strategy.strategy, &strategy.created_by]
    ).await?;
    
    let strategy_id: i64 = row.get(0);
    
    Ok(HttpResponse::Created().json(serde_json::json!({"id": strategy_id})))
}

// Update an existing boss strategy
pub async fn update_strategy(
    pool: web::Data<Pool>,
    path: web::Path<(i64, String)>,
    strategy: web::Json<BossStrategy>,
) -> Result<HttpResponse, Box<dyn Error>> {
    let client = pool.get().await?;
    let (group_id, boss_name) = path.into_inner();
    
    client.execute(
        "UPDATE boss_strategies SET difficulty = $1, recommended_gear = $2, recommended_inventory = $3, strategy = $4, updated_at = NOW() WHERE group_id = $5 AND LOWER(boss_name) = LOWER($6)",
        &[&strategy.difficulty, &strategy.recommended_gear, &strategy.recommended_inventory, &strategy.strategy, &group_id, &boss_name]
    ).await?;
    
    Ok(HttpResponse::Ok().finish())
}

// Delete a boss strategy
pub async fn delete_strategy(
    pool: web::Data<Pool>,
    path: web::Path<(i64, String)>,
) -> Result<HttpResponse, Box<dyn Error>> {
    let client = pool.get().await?;
    let (group_id, boss_name) = path.into_inner();
    
    client.execute(
        "DELETE FROM boss_strategies WHERE group_id = $1 AND LOWER(boss_name) = LOWER($2)",
        &[&group_id, &boss_name]
    ).await?;
    
    Ok(HttpResponse::NoContent().finish())
}
