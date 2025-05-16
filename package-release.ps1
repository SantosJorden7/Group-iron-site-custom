# Group Ironmen Release Packaging Script
# This script creates a release package of the Group Ironmen site with all dependencies

Write-Host "🏆 Group Ironmen Site - Release Packaging Script" -ForegroundColor Green
Write-Host "Creating release package v1.0.0..." -ForegroundColor Cyan

# Ensure we're in the project root
$projectRoot = $PSScriptRoot
Set-Location $projectRoot

# Create a temporary directory for the release
$releaseDir = Join-Path $projectRoot "release"
$releaseZip = Join-Path $projectRoot "group-ironmen-v1.0.0.zip"

Write-Host "Creating release directory..." -ForegroundColor Yellow
if (Test-Path $releaseDir) {
    Remove-Item -Path $releaseDir -Recurse -Force
}
New-Item -Path $releaseDir -ItemType Directory | Out-Null

# Create release tag in git
Write-Host "Creating git tag v1.0.0..." -ForegroundColor Yellow
git tag -a "v1.0.0" -m "Release v1.0.0 - Enhanced Collection Log with multi-source integration"

# Copy files to the release directory
Write-Host "Copying project files..." -ForegroundColor Yellow
$filesToCopy = @(
    "client",
    "server",
    "docker-compose.yml",
    ".env.example",
    "README.md",
    "CHANGELOG.md",
    "LICENSE"
)

foreach ($file in $filesToCopy) {
    $source = Join-Path $projectRoot $file
    $destination = Join-Path $releaseDir $file
    
    if (Test-Path $source) {
        if ((Get-Item $source) -is [System.IO.DirectoryInfo]) {
            Copy-Item -Path $source -Destination $destination -Recurse -Force
        } else {
            Copy-Item -Path $source -Destination $destination -Force
        }
    } else {
        Write-Host "Warning: $file not found" -ForegroundColor Yellow
    }
}

# Remove node_modules and other unnecessary files to reduce size
Write-Host "Cleaning up node_modules and other temp files..." -ForegroundColor Yellow
$dirsToRemove = @(
    (Join-Path $releaseDir "client/node_modules"),
    (Join-Path $releaseDir "server/node_modules"),
    (Join-Path $releaseDir "client/.git"),
    (Join-Path $releaseDir "server/.git")
)

foreach ($dir in $dirsToRemove) {
    if (Test-Path $dir) {
        Remove-Item -Path $dir -Recurse -Force
    }
}

# Create a deployment guide
Write-Host "Creating deployment guide..." -ForegroundColor Yellow
$deploymentGuide = @"
# Group Ironmen Deployment Guide

This guide will help you deploy the Group Ironmen site v1.0.0 with enhanced Collection Log features.

## Prerequisites

- Node.js (v16+)
- npm or yarn
- PostgreSQL database
- Docker and docker-compose (optional, for containerized deployment)

## Option 1: Deploy with Docker (Recommended)

1. Copy the \`.env.example\` file to \`.env\` and fill in your database credentials and other settings
2. Run \`docker-compose up -d\` to start the services
3. The application will be available at http://localhost:4000 (or your configured domain)

## Option 2: Manual Deployment

### Backend

1. Navigate to the \`server\` directory
2. Run \`npm install\` to install dependencies
3. Copy \`.env.example\` to \`.env\` and configure your settings
4. Initialize your PostgreSQL database using the \`schema.sql\` file
5. Start the server with \`npm start\`

### Frontend

1. Navigate to the \`client\` directory
2. Run \`npm install\` to install dependencies
3. Build the production version with \`npm run build\`
4. Serve the built files from the \`dist\` directory using Nginx or another web server

## Configuration

See the README.md file for detailed configuration options and environment variables.

## Plugin Configuration

In the RuneLite Group Ironmen plugin settings, set the backend URL to your deployed server address.

## Troubleshooting

If you encounter any issues:
1. Check the server logs for errors
2. Ensure your database is properly set up
3. Verify network connectivity between services
4. Check browser console for frontend errors

## Support

For support, please open an issue on the GitHub repository.
"@

Set-Content -Path (Join-Path $releaseDir "DEPLOY.md") -Value $deploymentGuide

# Create a zip file of the release
Write-Host "Creating release zip..." -ForegroundColor Yellow
Compress-Archive -Path "$releaseDir\*" -DestinationPath $releaseZip -Force

# Clean up the temporary directory
Write-Host "Cleaning up..." -ForegroundColor Yellow
Remove-Item -Path $releaseDir -Recurse -Force

Write-Host "✅ Release package created successfully!" -ForegroundColor Green
Write-Host "Release package: $releaseZip" -ForegroundColor Cyan
Write-Host "Tag created: v1.0.0" -ForegroundColor Cyan
Write-Host ""
Write-Host "To push the tag to remote, run: git push origin v1.0.0" -ForegroundColor Yellow
