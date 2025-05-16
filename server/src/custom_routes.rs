use crate::auth_middleware::{AuthMiddleware, AuthedGroupId};
use actix_web::{web, Scope, HttpResponse, Responder};
use deadpool_postgres::Pool;
use crate::custom_config::CustomConfig;

// Import our custom API modules
use crate::slayer_task_api;
use crate::custom_plugin_api;
use crate::valuable_drops_api;
use crate::activities_api;
use crate::boss_strategy_api;
use crate::group_challenges_api;
use crate::group_milestones_api;
use crate::shared_calendar_api;

// Health check endpoint
async fn health_check() -> impl Responder {
    HttpResponse::Ok().json(serde_json::json!({
        "status": "ok",
        "version": env!("CARGO_PKG_VERSION"),
        "features": [
            "activities",
            "boss-strategy",
            "collection-log",
            "data-sync",
            "dps-calculator",
            "group-challenges",
            "group-milestones",
            "shared-calendar",
            "slayer-tasks",
            "valuable-drops",
            "wiki-integration"
        ]
    }))
}

/// Creates and configures all custom routes for the Group Ironmen site
pub fn custom_routes(pool: web::Data<Pool>) -> Scope {
    // Create the custom configuration
    let custom_config = web::Data::new(CustomConfig::from_env());
    
    web::scope("/api")
        // Health check endpoint
        .route("/health", web::get().to(health_check))
        
        // Nested scope for all v1 API endpoints
        .service(web::scope("/v1")
            // Group endpoints
            .service(web::scope("/groups/{group_id}")
                // Activities endpoints
                .service(web::scope("/activities")
                    .route("", web::get().to(activities_api::get_activities))
                    .route("", web::post().to(activities_api::create_activity))
                    .route("/{activity_id}", web::get().to(activities_api::get_activity))
                    .route("/{activity_id}", web::put().to(activities_api::update_activity))
                    .route("/{activity_id}", web::delete().to(activities_api::delete_activity))
                    .route("/{activity_id}/complete", web::post().to(activities_api::complete_activity))
                )
                
                // Boss Strategy endpoints
                .service(web::scope("/boss-strategies")
                    .route("", web::get().to(boss_strategy_api::list_strategies))
                    .route("", web::post().to(boss_strategy_api::create_strategy))
                    .route("/{boss_name}", web::get().to(boss_strategy_api::get_strategy))
                    .route("/{boss_name}", web::put().to(boss_strategy_api::update_strategy))
                    .route("/{boss_name}", web::delete().to(boss_strategy_api::delete_strategy))
                )
                
                // Group Challenges endpoints
                .service(web::scope("/challenges")
                    .route("", web::get().to(group_challenges_api::get_challenges))
                    .route("", web::post().to(group_challenges_api::create_challenge))
                    .route("/{challenge_id}", web::get().to(group_challenges_api::get_challenge))
                    .route("/{challenge_id}", web::put().to(group_challenges_api::update_challenge))
                    .route("/{challenge_id}", web::delete().to(group_challenges_api::delete_challenge))
                    .route("/{challenge_id}/complete", web::post().to(group_challenges_api::complete_challenge))
                )
                
                // Group Milestones endpoints
                .service(web::scope("/milestones")
                    .route("", web::get().to(group_milestones_api::get_milestones))
                    .route("", web::post().to(group_milestones_api::create_milestone))
                    .route("/{milestone_id}", web::get().to(group_milestones_api::get_milestone))
                    .route("/{milestone_id}", web::put().to(group_milestones_api::update_milestone))
                    .route("/{milestone_id}", web::delete().to(group_milestones_api::delete_milestone))
                    .route("/{milestone_id}/complete", web::post().to(group_milestones_api::complete_milestone))
                )
                
                // Shared Calendar endpoints
                .service(web::scope("/events")
                    .route("", web::get().to(shared_calendar_api::get_events))
                    .route("", web::post().to(shared_calendar_api::create_event))
                    .route("/{event_id}", web::get().to(shared_calendar_api::get_event))
                    .route("/{event_id}", web::put().to(shared_calendar_api::update_event))
                    .route("/{event_id}", web::delete().to(shared_calendar_api::delete_event))
                )
                
                // Slayer Tasks endpoints
                .service(web::scope("/slayer-tasks")
                    .route("", web::get().to(slayer_task_api::get_slayer_tasks))
                    .route("", web::post().to(slayer_task_api::create_slayer_task))
                    .route("/{task_id}", web::get().to(slayer_task_api::get_slayer_task))
                    .route("/{task_id}", web::put().to(slayer_task_api::update_slayer_task))
                    .route("/{task_id}", web::delete().to(slayer_task_api::delete_slayer_task))
                    .route("/{task_id}/complete", web::post().to(slayer_task_api::complete_slayer_task))
                )
                
                // Valuable Drops endpoints
                .service(web::scope("/valuable-drops")
                    .route("", web::get().to(valuable_drops_api::get_valuable_drops))
                    .route("", web::post().to(valuable_drops_api::add_valuable_drop))
                    .route("/{drop_id}", web::get().to(valuable_drops_api::get_valuable_drop))
                    .route("/{drop_id}", web::delete().to(valuable_drops_api::delete_valuable_drop))
                )
            )
            
            // Plugin API endpoints
            .service(web::scope("/plugin")
                .route("", web::post().to(custom_plugin_api::process_custom_plugin_data))
            )
        )
        
        // Make the custom config available to all routes
        .app_data(custom_config)
        
        // Apply auth middleware to all routes
        .wrap(AuthMiddleware::new(pool.clone()))
}
