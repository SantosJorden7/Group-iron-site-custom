use crate::auth_middleware::AuthedGroupId;
use crate::db::{get_member_id, get_group_members};
use crate::error::ApiError;
use actix_web::{web, HttpResponse};
use deadpool_postgres::Pool;
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

/// Request to manually add a valuable drop
#[derive(Deserialize)]
pub struct AddValuableDropRequest {
    /// Member name who received the drop
    pub member_name: String,
    
    /// Item ID of the dropped item
    pub item_id: i32,
    
    /// Name of the item
    pub item_name: String,
    
    /// Quantity of the item (default 1)
    #[serde(default = "default_quantity")]
    pub item_quantity: i32,
    
    /// GE value of the item
    pub item_value: i64,
    
    /// Source where the item was obtained (e.g., monster name, chest)
    pub source_name: String,
    
    /// Optional location coordinates
    pub x_coord: Option<i32>,
    pub y_coord: Option<i32>,
    pub z_coord: Option<i32>,
    
    /// Optional timestamp (defaults to now)
    pub timestamp: Option<DateTime<Utc>>,
}

fn default_quantity() -> i32 {
    1
}

/// Response for valuable drops data
#[derive(Serialize)]
pub struct ValuableDropsResponse {
    /// List of valuable drops
    pub drops: Vec<ValuableDrop>,
    /// Pagination information
    pub pagination: PaginationInfo,
}

/// Pagination information for valuable drops
#[derive(Serialize)]
pub struct PaginationInfo {
    /// Total count of drops matching the filter
    pub total_count: i64,
    /// Offset from the start
    pub offset: i64,
    /// Limit per page
    pub limit: i32,
    /// Whether there are more drops to load
    pub has_more: bool,
}

/// Valuable drop data structure
#[derive(Serialize)]
pub struct ValuableDrop {
    /// Drop ID
    pub drop_id: i64,
    
    /// Member name who received the drop
    pub member_name: String,
    
    /// Item ID of the dropped item
    pub item_id: i32,
    
    /// Name of the item
    pub item_name: String,
    
    /// Quantity of the item
    pub item_quantity: i32,
    
    /// GE value of the item
    pub item_value: i64,
    
    /// Total value (quantity * value)
    pub total_value: i64,
    
    /// Source where the item was obtained
    pub source_name: String,
    
    /// Location coordinates
    pub x_coord: Option<i32>,
    pub y_coord: Option<i32>,
    pub z_coord: Option<i32>,
    
    /// When the drop was received
    pub timestamp: DateTime<Utc>,
}

/// Parameters for filtering valuable drops
#[derive(Deserialize)]
pub struct GetValuableDropsParams {
    /// Optional member name filter
    pub member_name: Option<String>,
    
    /// Optional minimum value filter
    pub min_value: Option<i64>,
    
    /// Optional source name filter
    pub source_name: Option<String>,
    
    /// Optional item name filter
    pub item_name: Option<String>,
    
    /// Optional start date filter
    pub start_date: Option<DateTime<Utc>>,
    
    /// Optional end date filter
    pub end_date: Option<DateTime<Utc>>,
    
    /// Pagination offset
    #[serde(default)]
    pub offset: i64,
    
    /// Pagination limit
    #[serde(default = "default_limit")]
    pub limit: i32,
    
    /// Sort field
    #[serde(default = "default_sort_field")]
    pub sort: String,
    
    /// Sort direction (asc or desc)
    #[serde(default = "default_sort_direction")]
    pub direction: String,
}

fn default_limit() -> i32 {
    25
}

fn default_sort_field() -> String {
    "timestamp".to_string()
}

fn default_sort_direction() -> String {
    "desc".to_string()
}

/// Get valuable drops with optional filtering and pagination
pub async fn get_valuable_drops(
    pool: web::Data<Pool>,
    auth: AuthedGroupId,
    query: web::Query<GetValuableDropsParams>,
) -> Result<HttpResponse, ApiError> {
    let mut client = pool.get().await?;
    
    // Get member IDs for the group
    let members = get_group_members(&client, auth.0).await?;
    let member_ids: Vec<i64> = members.iter().map(|m| m.member_id).collect();
    
    // Start building the query
    let mut query_parts = Vec::new();
    let mut params: Vec<&(dyn tokio_postgres::types::ToSql + Sync)> = Vec::new();
    
    // Base query
    query_parts.push(String::from(
        "SELECT 
            d.drop_id,
            m.member_name,
            d.item_id,
            d.item_name,
            d.item_quantity,
            d.item_value,
            d.source_name,
            d.x_coord,
            d.y_coord,
            d.z_coord,
            d.timestamp,
            COUNT(*) OVER() AS total_count
         FROM 
            groupironman.valuable_drops d
            JOIN groupironman.members m ON d.member_id = m.member_id
         WHERE 
            m.group_id = $1"
    ));
    params.push(&auth.0);
    
    // Add filters
    let param_offset = params.len() + 1;
    let mut param_index = param_offset;
    
    // Filter by member if provided
    if let Some(member_name) = &query.member_name {
        // Get member ID for the provided name
        let member_id_opt = members.iter().find(|m| m.member_name == *member_name).map(|m| m.member_id);
        
        if let Some(member_id) = member_id_opt {
            query_parts.push(format!("AND d.member_id = ${}", param_index));
            params.push(&member_id);
            param_index += 1;
        } else {
            // If member not found, return empty result
            return Ok(HttpResponse::Ok().json(ValuableDropsResponse {
                drops: Vec::new(),
                pagination: PaginationInfo {
                    total_count: 0,
                    offset: query.offset,
                    limit: query.limit,
                    has_more: false,
                },
            }));
        }
    }
    
    // Filter by minimum value
    if let Some(min_value) = query.min_value {
        query_parts.push(format!("AND d.item_value >= ${}", param_index));
        params.push(&min_value);
        param_index += 1;
    }
    
    // Filter by source name
    if let Some(source_name) = &query.source_name {
        let pattern = format!("%{}%", source_name);
        query_parts.push(format!("AND d.source_name ILIKE ${}", param_index));
        params.push(&pattern);
        param_index += 1;
    }
    
    // Filter by item name
    if let Some(item_name) = &query.item_name {
        let pattern = format!("%{}%", item_name);
        query_parts.push(format!("AND d.item_name ILIKE ${}", param_index));
        params.push(&pattern);
        param_index += 1;
    }
    
    // Filter by date range
    if let Some(start_date) = query.start_date {
        query_parts.push(format!("AND d.timestamp >= ${}", param_index));
        params.push(&start_date);
        param_index += 1;
    }
    
    if let Some(end_date) = query.end_date {
        query_parts.push(format!("AND d.timestamp <= ${}", param_index));
        params.push(&end_date);
        param_index += 1;
    }
    
    // Add ordering
    // Validate sort field to prevent SQL injection
    let valid_sort_fields = vec!["timestamp", "item_value", "item_name", "source_name"];
    let sort_field = if valid_sort_fields.contains(&query.sort.as_str()) {
        &query.sort
    } else {
        "timestamp"
    };
    
    // Validate sort direction to prevent SQL injection
    let direction = if query.direction == "asc" { "ASC" } else { "DESC" };
    query_parts.push(format!("ORDER BY {} {}", sort_field, direction));
    
    // Add pagination
    query_parts.push(format!("LIMIT ${}", param_index));
    params.push(&query.limit);
    param_index += 1;
    
    query_parts.push(format!("OFFSET ${}", param_index));
    params.push(&query.offset);
    
    // Build the final query
    let query_string = query_parts.join(" ");
    
    // Prepare and execute the query
    let stmt = client.prepare(&query_string).await?;
    let rows = client.query(&stmt, &params).await?;
    
    // Process results
    let mut drops = Vec::new();
    let mut total_count: i64 = 0;
    
    for row in rows {
        // Get total count from first row
        if total_count == 0 {
            total_count = row.try_get::<_, i64>("total_count")?;
        }
        
        // Convert row to ValuableDrop
        let drop = ValuableDrop {
            drop_id: row.try_get("drop_id")?,
            member_name: row.try_get("member_name")?,
            item_id: row.try_get("item_id")?,
            item_name: row.try_get("item_name")?,
            item_quantity: row.try_get("item_quantity")?,
            item_value: row.try_get("item_value")?,
            total_value: row.try_get::<_, i32>("item_quantity")? as i64 * row.try_get::<_, i64>("item_value")?,
            source_name: row.try_get("source_name")?,
            x_coord: row.try_get("x_coord")?,
            y_coord: row.try_get("y_coord")?,
            z_coord: row.try_get("z_coord")?,
            timestamp: row.try_get("timestamp")?,
        };
        
        drops.push(drop);
    }
    
    // Calculate if there are more results
    let has_more = (query.offset + drops.len() as i64) < total_count;
    
    // Return response
    Ok(HttpResponse::Ok().json(ValuableDropsResponse {
        drops,
        pagination: PaginationInfo {
            total_count,
            offset: query.offset,
            limit: query.limit,
            has_more,
        },
    }))
}

/// Add a new valuable drop
pub async fn add_valuable_drop(
    pool: web::Data<Pool>,
    auth: AuthedGroupId,
    drop_data: web::Json<AddValuableDropRequest>,
) -> Result<HttpResponse, ApiError> {
    let mut client = pool.get().await?;
    
    // Get member ID for the provided name
    let member_id = get_member_id(&client, auth.0, &drop_data.member_name).await?;
    
    // Use current timestamp if not provided
    let timestamp = drop_data.timestamp.unwrap_or_else(Utc::now);
    
    // Insert the valuable drop
    let stmt = client
        .prepare_cached(
            "INSERT INTO groupironman.valuable_drops 
             (member_id, item_id, item_name, item_quantity, item_value, source_name, x_coord, y_coord, z_coord, timestamp) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             RETURNING drop_id"
        )
        .await?;
    
    let drop_id = client
        .query_one(
            &stmt,
            &[
                &member_id,
                &drop_data.item_id,
                &drop_data.item_name,
                &drop_data.item_quantity,
                &drop_data.item_value,
                &drop_data.source_name,
                &drop_data.x_coord,
                &drop_data.y_coord,
                &drop_data.z_coord,
                &timestamp,
            ]
        )
        .await?
        .try_get::<_, i64>(0)?;
    
    // Check if any group challenges are related to valuable drops
    // This would involve more complex logic for the Group Challenges feature
    // We'll implement this in the future when adding the Group Challenges feature
    
    // Return success response
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "status": "success",
        "message": "Valuable drop added successfully",
        "drop_id": drop_id
    })))
}

/// Delete a valuable drop by ID
pub async fn delete_valuable_drop(
    pool: web::Data<Pool>,
    auth: AuthedGroupId,
    drop_id: web::Path<i64>,
) -> Result<HttpResponse, ApiError> {
    let mut client = pool.get().await?;
    
    // Delete the drop, ensuring it belongs to the group
    let stmt = client
        .prepare_cached(
            "DELETE FROM groupironman.valuable_drops 
             WHERE drop_id = $1 AND member_id IN (
                 SELECT member_id FROM groupironman.members WHERE group_id = $2
             )
             RETURNING drop_id"
        )
        .await?;
    
    let result = client
        .query_opt(&stmt, &[&drop_id.into_inner(), &auth.0])
        .await?;
    
    // Check if the drop was found and deleted
    if result.is_none() {
        return Ok(HttpResponse::NotFound().json(serde_json::json!({
            "status": "error",
            "message": "Valuable drop not found or not in your group"
        })));
    }
    
    // Return success response
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "status": "success",
        "message": "Valuable drop deleted successfully"
    })))
}
