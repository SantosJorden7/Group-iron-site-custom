# Group Ironmen API Testing Suite

This directory contains testing scripts for the custom API endpoints in the Group Ironmen application.

## Overview

The testing suite consists of:

1. **PowerShell Scripts** - For Windows environments
   - `test_slayer_tasks.ps1`: Tests the Slayer Task API endpoints
   - `test_valuable_drops.ps1`: Tests the Valuable Drops API endpoints

2. **Python Script**
   - `test_api_endpoints.py`: Comprehensive testing suite that validates API responses programmatically

## Prerequisites

For PowerShell scripts:
- Windows PowerShell 5.1 or later
- The Group Ironmen server running locally
- A valid authentication token (obtained by logging in)

For Python script:
- Python 3.6 or later
- `requests` library (`pip install requests`)
- The Group Ironmen server running locally
- A valid authentication token (obtained by logging in)

## Configuration

Before running any tests, you need to:

1. Start the Group Ironmen server
2. Obtain a valid authentication token
3. Update the scripts with your auth token and test member name

### Getting an Auth Token

1. Log into the Group Ironmen web interface
2. Open browser developer tools (F12)
3. Go to Application > Local Storage
4. Copy the value of the `auth_token` key

## Running the Tests

### PowerShell Tests

Open PowerShell and run:

```powershell
# Navigate to the tests directory
cd "C:\Users\OSRS\Desktop\New Project\Fresh Group Iron Site Project\group-ironmen\server\tests"

# Run Slayer Task tests
.\test_slayer_tasks.ps1

# Run Valuable Drops tests
.\test_valuable_drops.ps1
```

### Python Tests

```powershell
# Navigate to the tests directory
cd "C:\Users\OSRS\Desktop\New Project\Fresh Group Iron Site Project\group-ironmen\server\tests"

# Run all API tests
python test_api_endpoints.py --token "your_auth_token_here" --member "YourTestMember"

# Run with custom server URL (if not localhost:8080)
python test_api_endpoints.py --token "your_auth_token_here" --url "http://your-server:port"
```

## Test Cases

### Slayer Task API Tests

1. **Get current slayer task** - Verifies retrieval of task data
2. **Submit new slayer task** - Tests task submission
3. **Verify task assignment** - Confirms task was properly saved
4. **Complete task** - Tests task completion flow
5. **Check task history** - Verifies history tracking
6. **Error handling** - Tests handling of invalid inputs

### Valuable Drops API Tests

1. **Get valuable drops** - Verifies drop list retrieval
2. **Submit valuable drop** - Tests drop submission
3. **Submit drop with location** - Tests extended drop data
4. **Filter by member** - Tests filtering functionality
5. **Filter by value** - Tests value-based filtering
6. **Sort drops** - Tests sorting functionality
7. **Delete drop** - Tests drop removal
8. **Pagination** - Tests pagination handling
9. **Error handling** - Tests handling of invalid inputs

## Troubleshooting

- **Authentication errors**: Ensure your auth token is valid and properly formatted
- **404 errors**: Check that the server is running and API routes are correctly configured
- **500 errors**: Check server logs for backend issues

## Integration with CI/CD

These tests can be integrated into CI/CD pipelines by:

1. Running the Python tests with command-line parameters
2. Using the exit code to determine test success/failure
3. Configuring the CI system to fail builds when tests fail

## Extending the Tests

To add new test cases:

1. Follow the existing patterns in the scripts
2. Add new test functions for new API endpoints
3. Update this README to document the new tests
