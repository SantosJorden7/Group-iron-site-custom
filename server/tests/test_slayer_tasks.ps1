# Slayer Task API Testing Script
# Prerequisites: 
# - Server must be running locally at http://localhost:8080
# - You must have a valid auth token (can be obtained by logging in and checking browser localStorage)

# Configuration
$baseUrl = "http://localhost:8080"
$authToken = "test_token_123" # Simplified token for testing
$headers = @{
    "Authorization" = "Bearer $authToken"
    "Content-Type" = "application/json"
}

# Test member name - use one from our mock data
$memberName = "TestPlayer1"

# Colors for better readability
function Write-Success($message) {
    Write-Host $message -ForegroundColor Green
}

function Write-Error($message) {
    Write-Host $message -ForegroundColor Red
}

function Write-Info($message) {
    Write-Host $message -ForegroundColor Cyan
}

function Write-Section($message) {
    Write-Host "`n==== $message ====`n" -ForegroundColor Yellow
}

# Helper function to make GET requests
function Invoke-GetRequest($url) {
    try {
        $response = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
        return $response
    }
    catch {
        Write-Error "Request failed: $_"
        Write-Error $_.Exception.Response.StatusCode
        Write-Error $_.ErrorDetails.Message
        return $null
    }
}

# Helper function to make POST requests
function Invoke-PostRequest($url, $body) {
    try {
        $jsonBody = ConvertTo-Json $body
        $response = Invoke-RestMethod -Uri $url -Headers $headers -Method Post -Body $jsonBody
        return $response
    }
    catch {
        Write-Error "Request failed: $_"
        Write-Error $_.Exception.Response.StatusCode
        Write-Error $_.ErrorDetails.Message
        return $null
    }
}

# TEST 1: Get slayer task (should return no task if member doesn't have one)
Write-Section "TEST 1: Get slayer task for $memberName"
$taskResponse = Invoke-GetRequest "$baseUrl/custom/slayer-task/$memberName"

if ($taskResponse) {
    Write-Success "Successfully retrieved slayer task data"
    Write-Info "Member: $($taskResponse.member_name)"
    Write-Info "Current task: $(if ($taskResponse.current_task) { 'Yes' } else { 'No task assigned' })"
    Write-Info "Task history count: $($taskResponse.task_history.Count)"
    Write-Info "Slayer points: $($taskResponse.slayer_points)"
    Write-Info "Task streak: $($taskResponse.task_streak)"
}

# TEST 2: Submit a new slayer task
Write-Section "TEST 2: Submit a new slayer task for $memberName"

$newTask = @{
    monster_name = "Abyssal demons"
    quantity = 150
    slayer_master = "Duradel"
    task_streak = 5
    slayer_points = 20
    is_boss_task = $false
}

$submitResponse = Invoke-PostRequest "$baseUrl/custom/slayer-task/$memberName" $newTask

if ($submitResponse) {
    Write-Success "Successfully submitted new slayer task"
    Write-Info "Task ID: $($submitResponse.task_id)"
    Write-Info "Completed previous task: $($submitResponse.completed_previous)"
}

# TEST 3: Verify the new task was assigned
Write-Section "TEST 3: Verify the new task was assigned to $memberName"
$verifyResponse = Invoke-GetRequest "$baseUrl/custom/slayer-task/$memberName"

if ($verifyResponse -and $verifyResponse.current_task) {
    Write-Success "Successfully verified task assignment"
    Write-Info "Monster: $($verifyResponse.current_task.monster_name)"
    Write-Info "Quantity: $($verifyResponse.current_task.quantity)"
    Write-Info "Slayer Master: $($verifyResponse.current_task.slayer_master)"
    if ($verifyResponse.current_task.monster_name -eq $newTask.monster_name) {
        Write-Success "Task verification passed! Monster matches submitted task"
    }
    else {
        Write-Error "Task verification failed! Monster doesn't match"
    }
}
else {
    Write-Error "Failed to verify task assignment"
}

# TEST 4: Submit another task (should complete the previous one)
Write-Section "TEST 4: Submit another task to complete the previous one"

$nextTask = @{
    monster_name = "Gargoyles"
    quantity = 180
    slayer_master = "Nieve"
    task_streak = 6
    slayer_points = 25
    is_boss_task = $false
}

$submitResponse2 = Invoke-PostRequest "$baseUrl/custom/slayer-task/$memberName" $nextTask

if ($submitResponse2) {
    Write-Success "Successfully submitted next slayer task"
    Write-Info "Task ID: $($submitResponse2.task_id)"
    Write-Info "Completed previous task: $($submitResponse2.completed_previous)"
    
    if ($submitResponse2.completed_previous) {
        Write-Success "Previous task was correctly marked as completed"
    }
    else {
        Write-Error "Previous task was not marked as completed"
    }
}

# TEST 5: Check task history
Write-Section "TEST 5: Check task history for $memberName"
$historyResponse = Invoke-GetRequest "$baseUrl/custom/slayer-task/$memberName"

if ($historyResponse) {
    Write-Success "Successfully retrieved task history"
    Write-Info "Task history count: $($historyResponse.task_history.Count)"
    
    if ($historyResponse.task_history.Count -gt 0) {
        Write-Info "Most recent completed task: $($historyResponse.task_history[0].monster_name)"
    }
}

# TEST 6: Error handling - Invalid member
Write-Section "TEST 6: Test error handling - Invalid member name"
$invalidResponse = Invoke-GetRequest "$baseUrl/custom/slayer-task/NonExistentMember"

if (-not $invalidResponse) {
    Write-Success "Server correctly rejected request for invalid member"
}
else {
    Write-Error "Server unexpectedly accepted request for invalid member"
}

Write-Section "Testing complete"
