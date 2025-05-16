# Group Ironmen Packaging Script
# This script creates a deployable package of the Group Ironmen application

Write-Host "===== Group Ironmen Deployment Package Creator =====" -ForegroundColor Cyan
Write-Host "This script will create a complete package for deployment to another system" -ForegroundColor Cyan

# Create output directory
$outputFolder = "C:\Users\OSRS\Desktop\GroupIronmen-Deployment"
$outputZip = "C:\Users\OSRS\Desktop\GroupIronmen-Deployment.zip"
$sourceFolder = $PSScriptRoot

Write-Host "Creating deployment package in: $outputFolder" -ForegroundColor Yellow

# Make sure output directory exists
if (Test-Path $outputFolder) {
    Remove-Item -Path $outputFolder -Recurse -Force
}
New-Item -Path $outputFolder -ItemType Directory -Force | Out-Null

# Create a DEPLOYMENT-README.md file with clear instructions
$readmeContent = @"
# Group Ironmen Deployment Package

This package contains a complete deployment-ready version of the Group Ironmen project.

## Prerequisites

- Docker Desktop installed and running
- .NET Core Runtime (if using Windows)
- Port 4000 available for the web interface

## Deployment Steps

1. Extract this ZIP file to a location on your computer
2. Navigate to the extracted folder in a terminal/PowerShell
3. Copy the `.env.example` file to `.env` and update any settings if needed:
   ```
   cp .env.example .env
   ```
4. Start the application with Docker Compose:
   ```
   docker-compose -f docker-compose.optimized.yml up -d
   ```
5. Access the application at [http://localhost:4000](http://localhost:4000)

## Stopping the Application

To stop the application, run:
```
docker-compose -f docker-compose.optimized.yml down
```

## Configuration Options

All configuration options are in the `.env` file. The main settings are:

- `DB_PASSWORD`: Database password
- `DB_USER`: Database username
- `DB_NAME`: Database name
- `WEB_PORT`: Port for the web interface (default: 4000)

## Troubleshooting

If you encounter issues:

1. Check Docker logs:
   ```
   docker-compose -f docker-compose.optimized.yml logs
   ```
2. Ensure Docker Desktop is running
3. Verify no other service is using port 4000 (or change in .env)
4. Restart Docker Desktop if container creation fails

## Feature Overview

This deployment includes all the following features:
- Activities tracking
- Boss strategy guides
- DPS calculator
- Group challenges
- Group milestones
- Shared calendar
- Slayer tasks
- Valuable drops tracking
- RuneLite plugin integration
- Collection log
"@

# Write the README to the output folder
$readmeContent | Out-File -FilePath "$outputFolder\DEPLOYMENT-README.md" -Encoding utf8

# List of essential files/folders to copy
$essentialItems = @(
    "client", 
    "server",
    "docker-compose.optimized.yml",
    "docker-compose.yml",
    ".env.example",
    "README.md",
    "LICENSE"
)

# Copy essential items
foreach ($item in $essentialItems) {
    $source = Join-Path -Path $sourceFolder -ChildPath $item
    $destination = Join-Path -Path $outputFolder -ChildPath $item
    
    if (Test-Path $source) {
        if ((Get-Item $source) -is [System.IO.DirectoryInfo]) {
            Copy-Item -Path $source -Destination $destination -Recurse -Force
            Write-Host "- Copied directory: $item" -ForegroundColor Green
        } else {
            Copy-Item -Path $source -Destination $destination -Force
            Write-Host "- Copied file: $item" -ForegroundColor Green
        }
    } else {
        Write-Host "- Warning: Could not find $item" -ForegroundColor Yellow
    }
}

# Create a simple deployment batch file for Windows
$batchContent = @"
@echo off
echo ===== Group Ironmen Deployment =====
echo.
echo This script will start the Group Ironmen application.
echo Make sure Docker Desktop is running before proceeding.
echo.
echo 1. First deployment
echo 2. Start application (after first deployment)
echo 3. Stop application
echo 4. View logs
echo.
set /p choice="Enter your choice (1-4): "

if "%choice%"=="1" (
    echo === First Deployment ===
    if not exist .env (
        copy .env.example .env
        echo Created .env file from example
    )
    docker-compose -f docker-compose.optimized.yml up -d
    echo.
    echo Application is now running at http://localhost:4000
)
if "%choice%"=="2" (
    echo === Starting Application ===
    docker-compose -f docker-compose.optimized.yml up -d
    echo.
    echo Application is now running at http://localhost:4000
)
if "%choice%"=="3" (
    echo === Stopping Application ===
    docker-compose -f docker-compose.optimized.yml down
    echo.
    echo Application has been stopped
)
if "%choice%"=="4" (
    echo === Viewing Logs ===
    docker-compose -f docker-compose.optimized.yml logs
    pause
)

echo.
echo === Done ===
pause
"@

# Write the batch file to the output folder
$batchContent | Out-File -FilePath "$outputFolder\deploy.bat" -Encoding ascii

# Clean any unnecessary directories to make the package smaller
$unnecessaryDirs = @(
    "$outputFolder\client\node_modules",
    "$outputFolder\server\target"
)

foreach ($dir in $unnecessaryDirs) {
    if (Test-Path $dir) {
        Remove-Item -Path $dir -Recurse -Force
        Write-Host "- Removed unnecessary directory: $dir" -ForegroundColor Green
    }
}

# Create the ZIP file
Write-Host "Creating ZIP archive at: $outputZip" -ForegroundColor Yellow
Compress-Archive -Path "$outputFolder\*" -DestinationPath $outputZip -Force

Write-Host ""
Write-Host "===== Packaging Complete =====" -ForegroundColor Cyan
Write-Host "Package created at: $outputZip" -ForegroundColor Green
Write-Host "This ZIP can now be transferred to your main desktop for deployment" -ForegroundColor Green
Write-Host "Follow the instructions in DEPLOYMENT-README.md to deploy the application" -ForegroundColor Green
