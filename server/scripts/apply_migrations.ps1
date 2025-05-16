# Apply database migrations
param(
    [string]$db_host = "localhost",
    [string]$db_port = "5432",
    [string]$db_name = "group_ironman",
    [string]$db_user = "postgres",
    [string]$db_password = "postgres"
)

# Set environment variables for psql
$env:PGPASSWORD = $db_password

# Create schema_migrations table if it doesn't exist
$initCmd = @"
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'groupironman') THEN
        CREATE SCHEMA groupironman;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'groupironman' AND tablename = 'schema_migrations') THEN
        CREATE TABLE groupironman.schema_migrations (
            migration VARCHAR(255) PRIMARY KEY,
            applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    END IF;
END \$\$;
"@

Write-Host "Initializing database schema..." -ForegroundColor Cyan
& psql -h $db_host -p $db_port -U $db_user -d $db_name -c $initCmd

# Get all migration files
$migrations = Get-ChildItem -Path "$PSScriptRoot/../migrations" -Filter "*.sql" | Sort-Object Name

Write-Host "Found $($migrations.Count) migration(s) to apply" -ForegroundColor Cyan

foreach ($migration in $migrations) {
    $migrationName = $migration.Name
    Write-Host "Applying migration: $migrationName" -ForegroundColor Yellow
    
    # Check if migration has already been applied
    $checkCmd = "SELECT 1 FROM groupironman.schema_migrations WHERE migration = '$migrationName'"
    $alreadyApplied = & psql -h $db_host -p $db_port -U $db_user -d $db_name -t -c $checkCmd
    
    if ($alreadyApplied -match "1") {
        Write-Host "  ✓ Already applied" -ForegroundColor Green
        continue
    }
    
    # Apply the migration within a transaction
    $migrationPath = $migration.FullName.Replace('\', '/')
    $transactionCmd = @"
        BEGIN;
        \i "$migrationPath"
        INSERT INTO groupironman.schema_migrations (migration, applied_at) 
        VALUES ('$migrationName', NOW());
        COMMIT;
"@
    
    # Execute the migration
    try {
        $output = & psql -h $db_host -p $db_port -U $db_user -d $db_name -c $transactionCmd 2>&1
        
        if ($LASTEXITCODE -ne 0) {
            throw "Migration failed with exit code $LASTEXITCODE: $output"
        }
        
        Write-Host "  ✓ Applied successfully" -ForegroundColor Green
    } catch {
        Write-Host "  ✗ Failed to apply migration: $_" -ForegroundColor Red
        exit 1
    }
}

Write-Host "All migrations applied successfully!" -ForegroundColor Green

# Clear the password from environment
$env:PGPASSWORD = ""
