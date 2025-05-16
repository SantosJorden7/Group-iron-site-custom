# Group Ironmen Docker Deployment Script
# This script helps set up and deploy the full Group Ironmen project using Docker Desktop

Write-Host "🏆 Group Ironmen - Docker Deployment Helper" -ForegroundColor Green
Write-Host "Preparing to launch the Group Ironmen project with all features..." -ForegroundColor Cyan

# Ensure we're in the project root
$projectRoot = $PSScriptRoot
Set-Location $projectRoot

# Check if .env file exists, create from example if not
if (-not (Test-Path -Path ".env")) {
    Write-Host "Creating .env file from .env.example..." -ForegroundColor Yellow
    Copy-Item -Path ".env.example" -Destination ".env"
    Write-Host "⚠️ IMPORTANT: Please edit the .env file with your database credentials." -ForegroundColor Red
    Write-Host "Press any key to continue once you've updated the .env file..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}

# Check Docker is running
Write-Host "Checking Docker is running..." -ForegroundColor Yellow
$dockerStatus = docker info 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker is not running. Please start Docker Desktop and try again." -ForegroundColor Red
    exit 1
}
Write-Host "✅ Docker is running" -ForegroundColor Green

# Check if using standard or optimized docker-compose
$composeFile = "docker-compose.yml"
if (Test-Path -Path "docker-compose.optimized.yml") {
    Write-Host "Found optimized docker-compose.optimized.yml file." -ForegroundColor Cyan
    $useOptimized = Read-Host "Would you like to use the optimized configuration? (y/n)"
    if ($useOptimized -eq "y") {
        $composeFile = "docker-compose.optimized.yml"
        Write-Host "Using optimized Docker configuration with support for all features." -ForegroundColor Green
    } else {
        Write-Host "Using standard Docker configuration." -ForegroundColor Yellow
    }
}

# Check schema.sql exists
if (-not (Test-Path -Path "server/src/sql/schema.sql")) {
    Write-Host "❌ Could not find server/src/sql/schema.sql" -ForegroundColor Red
    Write-Host "Please ensure the schema.sql file exists at server/src/sql/schema.sql" -ForegroundColor Red
    exit 1
}

# Start the containers
Write-Host "Starting Group Ironmen containers from $composeFile..." -ForegroundColor Cyan
docker-compose -f $composeFile down
docker-compose -f $composeFile up -d

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Group Ironmen is now running!" -ForegroundColor Green
    
    # Show container status
    Write-Host "`nContainer Status:" -ForegroundColor Cyan
    docker-compose -f $composeFile ps
    
    # Output access information
    Write-Host "`n📱 Access Information:" -ForegroundColor Cyan
    Write-Host "Frontend: http://localhost:4000" -ForegroundColor White
    Write-Host "Backend API: http://localhost:5000" -ForegroundColor White
    
    Write-Host "`n📋 Available Features:" -ForegroundColor Cyan
    Write-Host "- Collection Log (enhanced with multi-source integration)" -ForegroundColor White
    Write-Host "- Activities Tracker" -ForegroundColor White
    Write-Host "- Boss Strategy" -ForegroundColor White
    Write-Host "- DPS Calculator" -ForegroundColor White
    Write-Host "- Group Challenges" -ForegroundColor White
    Write-Host "- Group Milestones" -ForegroundColor White
    Write-Host "- Shared Calendar" -ForegroundColor White
    Write-Host "- Slayer Tasks" -ForegroundColor White
    Write-Host "- Valuable Drops" -ForegroundColor White
    Write-Host "- Wiki Integration" -ForegroundColor White
    
    Write-Host "`n⚙️ Plugin Configuration:" -ForegroundColor Cyan
    Write-Host "In the RuneLite plugin settings, set the URL to: http://localhost:5000" -ForegroundColor White
    
    Write-Host "`n🛠️ Troubleshooting:" -ForegroundColor Cyan
    Write-Host "- View logs: docker-compose -f $composeFile logs" -ForegroundColor White
    Write-Host "- Restart services: docker-compose -f $composeFile restart" -ForegroundColor White
    Write-Host "- Stop all: docker-compose -f $composeFile down" -ForegroundColor White
} else {
    Write-Host "❌ Failed to start containers" -ForegroundColor Red
}
