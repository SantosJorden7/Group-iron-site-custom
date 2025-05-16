# Valuable Drops API Testing Script
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

# Helper function to make DELETE requests
function Invoke-DeleteRequest($url) {
    try {
        $response = Invoke-RestMethod -Uri $url -Headers $headers -Method Delete
        return $response
    }
    catch {
        Write-Error "Request failed: $_"
        Write-Error $_.Exception.Response.StatusCode
        Write-Error $_.ErrorDetails.Message
        return $null
    }
}

# TEST 1: Get valuable drops (should return empty or existing drops)
Write-Section "TEST 1: Get valuable drops"
$dropsResponse = Invoke-GetRequest "$baseUrl/custom/valuable-drops"

if ($dropsResponse) {
    Write-Success "Successfully retrieved valuable drops"
    Write-Info "Total drops: $($dropsResponse.pagination.total_count)"
    Write-Info "Current page drops: $($dropsResponse.drops.Count)"
    Write-Info "Has more: $($dropsResponse.pagination.has_more)"
}

# TEST 2: Submit a valuable drop
Write-Section "TEST 2: Submit a valuable drop for $memberName"

$valuableDrop = @{
    member_name = $memberName
    item_id = 11286
    item_name = "Draconic visage"
    item_quantity = 1
    item_value = 5000000
    source_name = "Vorkath"
}

$submitResponse = Invoke-PostRequest "$baseUrl/custom/valuable-drops" $valuableDrop

if ($submitResponse) {
    Write-Success "Successfully submitted valuable drop"
    Write-Info "Drop ID: $($submitResponse.drop_id)"
    
    # Store the drop ID for later tests
    $dropId = $submitResponse.drop_id
}
else {
    $dropId = $null
}

# TEST 3: Submit a second valuable drop with location data
Write-Section "TEST 3: Submit a valuable drop with location data"

$valuableDrop2 = @{
    member_name = $memberName
    item_id = 22322
    item_name = "Dragon Warhammer"
    item_quantity = 1
    item_value = 41000000
    source_name = "Lizardman shaman"
    x_coord = 1250
    y_coord = 3750
    z_coord = 0
}

$submitResponse2 = Invoke-PostRequest "$baseUrl/custom/valuable-drops" $valuableDrop2

if ($submitResponse2) {
    Write-Success "Successfully submitted valuable drop with location"
    Write-Info "Drop ID: $($submitResponse2.drop_id)"
}

# TEST 4: Verify the drops were stored - filter by member
Write-Section "TEST 4: Verify drops - filter by member name"
$memberDrops = Invoke-GetRequest "$baseUrl/custom/valuable-drops?member_name=$memberName"

if ($memberDrops -and $memberDrops.drops.Count -gt 0) {
    Write-Success "Successfully filtered drops by member name"
    Write-Info "Total drops for $memberName: $($memberDrops.pagination.total_count)"
    
    foreach ($drop in $memberDrops.drops) {
        Write-Info "$($drop.item_name) - $($drop.item_value) gp from $($drop.source_name)"
    }
}

# TEST 5: Filter by minimum value
Write-Section "TEST 5: Filter drops by minimum value"
$minValue = 10000000 # 10M gp
$valueDrops = Invoke-GetRequest "$baseUrl/custom/valuable-drops?min_value=$minValue"

if ($valueDrops) {
    Write-Success "Successfully filtered drops by minimum value"
    Write-Info "Drops worth $minValue gp or more: $($valueDrops.pagination.total_count)"
    
    foreach ($drop in $valueDrops.drops) {
        Write-Info "$($drop.item_name) - $($drop.item_value) gp from $($drop.source_name)"
    }
}

# TEST 6: Sort drops by value (descending)
Write-Section "TEST 6: Sort drops by value (descending)"
$sortedDrops = Invoke-GetRequest "$baseUrl/custom/valuable-drops?sort=item_value&direction=desc"

if ($sortedDrops -and $sortedDrops.drops.Count -gt 0) {
    Write-Success "Successfully sorted drops by value"
    Write-Info "Most valuable drops:"
    
    for ($i = 0; $i -lt [Math]::Min(3, $sortedDrops.drops.Count); $i++) {
        $drop = $sortedDrops.drops[$i]
        Write-Info "$($i+1). $($drop.item_name) - $($drop.item_value) gp"
    }
}

# TEST 7: Delete a valuable drop
Write-Section "TEST 7: Delete a valuable drop"
if ($dropId) {
    $deleteResponse = Invoke-DeleteRequest "$baseUrl/custom/valuable-drops/$dropId"
    
    if ($deleteResponse) {
        Write-Success "Successfully deleted drop with ID $dropId"
        Write-Info "Response: $($deleteResponse.message)"
        
        # Verify the drop was deleted
        $verifyDelete = Invoke-GetRequest "$baseUrl/custom/valuable-drops"
        
        if ($verifyDelete) {
            $stillExists = $false
            foreach ($drop in $verifyDelete.drops) {
                if ($drop.drop_id -eq $dropId) {
                    $stillExists = $true
                    break
                }
            }
            
            if (-not $stillExists) {
                Write-Success "Verification successful: Drop was properly deleted"
            }
            else {
                Write-Error "Verification failed: Drop still exists after deletion"
            }
        }
    }
}
else {
    Write-Error "No drop ID available for deletion test"
}

# TEST 8: Test pagination
Write-Section "TEST 8: Test pagination"
$page1 = Invoke-GetRequest "$baseUrl/custom/valuable-drops?limit=2&offset=0"

if ($page1) {
    Write-Success "Successfully retrieved page 1"
    Write-Info "Items per page: 2"
    Write-Info "Items on page 1: $($page1.drops.Count)"
    Write-Info "Total items: $($page1.pagination.total_count)"
    
    if ($page1.pagination.has_more) {
        Write-Info "Getting page 2..."
        $page2 = Invoke-GetRequest "$baseUrl/custom/valuable-drops?limit=2&offset=2"
        
        if ($page2) {
            Write-Success "Successfully retrieved page 2"
            Write-Info "Items on page 2: $($page2.drops.Count)"
            
            # Verify the items are different
            $different = $true
            if ($page1.drops.Count -gt 0 -and $page2.drops.Count -gt 0) {
                if ($page1.drops[0].drop_id -eq $page2.drops[0].drop_id) {
                    $different = $false
                }
            }
            
            if ($different) {
                Write-Success "Pagination working correctly - different items on different pages"
            }
            else {
                Write-Error "Pagination issue - same items appear on different pages"
            }
        }
    }
    else {
        Write-Info "Not enough items for pagination test"
    }
}

# TEST 9: Error handling - Invalid member
Write-Section "TEST 9: Test error handling - Invalid member name"
$invalidDrop = @{
    member_name = "NonExistentMember"
    item_id = 11286
    item_name = "Draconic visage"
    item_quantity = 1
    item_value = 5000000
    source_name = "Vorkath"
}

$invalidResponse = Invoke-PostRequest "$baseUrl/custom/valuable-drops" $invalidDrop

if (-not $invalidResponse) {
    Write-Success "Server correctly rejected drop for invalid member"
}
else {
    Write-Error "Server unexpectedly accepted drop for invalid member"
}

Write-Section "Testing complete"
