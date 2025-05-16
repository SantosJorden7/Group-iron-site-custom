#!/usr/bin/env python3
"""
Group Ironmen Custom API Endpoints Test Suite
--------------------------------------------
Comprehensive testing suite for the custom API endpoints including:
- Slayer Task API
- Valuable Drops API

This script performs automated testing with validation checks on response data.
"""

import requests
import json
import sys
from datetime import datetime
import argparse

# Default configuration
DEFAULT_BASE_URL = "http://localhost:8080"
DEFAULT_MEMBER_NAME = "TestMember"

class APITester:
    def __init__(self, base_url, auth_token, member_name):
        self.base_url = base_url
        self.headers = {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
        self.member_name = member_name
        self.test_results = {
            "pass": 0,
            "fail": 0,
            "total": 0
        }
        
    def print_separator(self):
        print("\n" + "-" * 50 + "\n")
        
    def assert_test(self, condition, message, error_message=None):
        self.test_results["total"] += 1
        if condition:
            print(f"✅ PASS: {message}")
            self.test_results["pass"] += 1
            return True
        else:
            print(f"❌ FAIL: {error_message or message}")
            self.test_results["fail"] += 1
            return False
    
    def print_section(self, title):
        print(f"\n{'=' * 20} {title} {'=' * 20}\n")
    
    def print_response(self, response):
        try:
            formatted_json = json.dumps(response.json(), indent=2)
            print(f"Response (Status {response.status_code}):")
            print(formatted_json)
        except:
            print(f"Response (Status {response.status_code}):")
            print(response.text)
    
    def make_request(self, method, endpoint, data=None):
        url = f"{self.base_url}{endpoint}"
        print(f"Making {method} request to: {url}")
        
        try:
            if method == "GET":
                response = requests.get(url, headers=self.headers)
            elif method == "POST":
                response = requests.post(url, headers=self.headers, json=data)
            elif method == "DELETE":
                response = requests.delete(url, headers=self.headers)
            else:
                print(f"Unsupported method: {method}")
                return None
                
            self.print_response(response)
            return response
            
        except Exception as e:
            print(f"Request error: {str(e)}")
            return None
    
    def test_slayer_task_api(self):
        self.print_section("SLAYER TASK API TESTS")
        
        # Test 1: Get initial slayer task
        self.print_separator()
        print("Test 1: Get initial slayer task")
        response = self.make_request("GET", f"/custom/slayer-task/{self.member_name}")
        
        if response:
            self.assert_test(
                response.status_code == 200,
                "Successfully retrieved slayer task data",
                "Failed to retrieve slayer task data"
            )
            
            if response.status_code == 200:
                data = response.json()
                self.assert_test(
                    "member_name" in data and data["member_name"] == self.member_name,
                    "Response contains correct member name",
                    f"Expected member_name={self.member_name}, got {data.get('member_name', 'not found')}"
                )
        
        # Test 2: Submit new slayer task
        self.print_separator()
        print("Test 2: Submit new slayer task")
        task_data = {
            "monster_name": "Abyssal demons",
            "quantity": 150,
            "slayer_master": "Duradel",
            "task_streak": 5,
            "slayer_points": 20,
            "is_boss_task": False
        }
        
        response = self.make_request("POST", f"/custom/slayer-task/{self.member_name}", task_data)
        
        if response:
            success = self.assert_test(
                response.status_code == 200,
                "Successfully submitted new slayer task",
                "Failed to submit new slayer task"
            )
            
            if success:
                data = response.json()
                self.assert_test(
                    "task_id" in data and isinstance(data["task_id"], int),
                    "Response contains valid task_id",
                    "Response missing task_id or invalid type"
                )
        
        # Test 3: Verify task was assigned
        self.print_separator()
        print("Test 3: Verify task was assigned")
        response = self.make_request("GET", f"/custom/slayer-task/{self.member_name}")
        
        if response and response.status_code == 200:
            data = response.json()
            
            current_task = data.get("current_task", None)
            self.assert_test(
                current_task is not None,
                "Current task exists",
                "Current task is missing"
            )
            
            if current_task:
                self.assert_test(
                    current_task.get("monster_name") == task_data["monster_name"],
                    "Task monster matches submitted task",
                    f"Expected {task_data['monster_name']}, got {current_task.get('monster_name')}"
                )
                
                self.assert_test(
                    current_task.get("quantity") == task_data["quantity"],
                    "Task quantity matches submitted task",
                    f"Expected {task_data['quantity']}, got {current_task.get('quantity')}"
                )
        
        # Test 4: Submit another task (completing previous)
        self.print_separator()
        print("Test 4: Submit another task (completing previous)")
        next_task = {
            "monster_name": "Gargoyles",
            "quantity": 180,
            "slayer_master": "Nieve",
            "task_streak": 6,
            "slayer_points": 25,
            "is_boss_task": False
        }
        
        response = self.make_request("POST", f"/custom/slayer-task/{self.member_name}", next_task)
        
        if response and response.status_code == 200:
            data = response.json()
            self.assert_test(
                data.get("completed_previous") == True,
                "Previous task was marked as completed",
                "Previous task was not marked as completed"
            )
        
        # Test 5: Check task history
        self.print_separator()
        print("Test 5: Check task history")
        response = self.make_request("GET", f"/custom/slayer-task/{self.member_name}")
        
        if response and response.status_code == 200:
            data = response.json()
            task_history = data.get("task_history", [])
            
            self.assert_test(
                len(task_history) >= 1,
                "Task history contains entries",
                "Task history is empty"
            )
            
            if len(task_history) >= 1:
                completed_task = task_history[0]
                self.assert_test(
                    completed_task.get("monster_name") == task_data["monster_name"],
                    "History contains previously completed task",
                    f"Expected {task_data['monster_name']}, got {completed_task.get('monster_name')}"
                )
                
                self.assert_test(
                    completed_task.get("is_complete") == True,
                    "Task in history is marked as complete",
                    "Task in history is not marked as complete"
                )
        
    def test_valuable_drops_api(self):
        self.print_section("VALUABLE DROPS API TESTS")
        drop_id = None
        
        # Test 1: Get initial valuable drops
        self.print_separator()
        print("Test 1: Get initial valuable drops")
        response = self.make_request("GET", "/custom/valuable-drops")
        
        if response:
            self.assert_test(
                response.status_code == 200,
                "Successfully retrieved valuable drops",
                "Failed to retrieve valuable drops"
            )
            
            if response.status_code == 200:
                data = response.json()
                self.assert_test(
                    "drops" in data and isinstance(data["drops"], list),
                    "Response contains drops array",
                    "Response missing drops array"
                )
                
                self.assert_test(
                    "pagination" in data and isinstance(data["pagination"], dict),
                    "Response contains pagination object",
                    "Response missing pagination object"
                )
        
        # Test 2: Submit a valuable drop
        self.print_separator()
        print("Test 2: Submit a valuable drop")
        drop_data = {
            "member_name": self.member_name,
            "item_id": 11286,
            "item_name": "Draconic visage",
            "item_quantity": 1,
            "item_value": 5000000,
            "source_name": "Vorkath"
        }
        
        response = self.make_request("POST", "/custom/valuable-drops", drop_data)
        
        if response:
            success = self.assert_test(
                response.status_code == 200,
                "Successfully submitted valuable drop",
                "Failed to submit valuable drop"
            )
            
            if success:
                data = response.json()
                drop_id = data.get("drop_id")
                self.assert_test(
                    drop_id is not None and isinstance(drop_id, int),
                    "Response contains valid drop_id",
                    "Response missing drop_id or invalid type"
                )
        
        # Test 3: Submit another drop with location data
        self.print_separator()
        print("Test 3: Submit drop with location data")
        drop_data_with_location = {
            "member_name": self.member_name,
            "item_id": 22322,
            "item_name": "Dragon Warhammer",
            "item_quantity": 1,
            "item_value": 41000000,
            "source_name": "Lizardman shaman",
            "x_coord": 1250,
            "y_coord": 3750,
            "z_coord": 0
        }
        
        response = self.make_request("POST", "/custom/valuable-drops", drop_data_with_location)
        
        if response:
            self.assert_test(
                response.status_code == 200,
                "Successfully submitted drop with location data",
                "Failed to submit drop with location data"
            )
        
        # Test 4: Filter by member
        self.print_separator()
        print("Test 4: Filter drops by member")
        response = self.make_request("GET", f"/custom/valuable-drops?member_name={self.member_name}")
        
        if response and response.status_code == 200:
            data = response.json()
            drops = data.get("drops", [])
            
            if drops:
                all_match_member = all(drop.get("member_name") == self.member_name for drop in drops)
                self.assert_test(
                    all_match_member,
                    "All filtered drops match the specified member",
                    "Some filtered drops belong to other members"
                )
        
        # Test 5: Filter by min value
        self.print_separator()
        print("Test 5: Filter drops by minimum value")
        min_value = 10000000  # 10M gp
        response = self.make_request("GET", f"/custom/valuable-drops?min_value={min_value}")
        
        if response and response.status_code == 200:
            data = response.json()
            drops = data.get("drops", [])
            
            if drops:
                all_above_min = all(drop.get("item_value", 0) >= min_value for drop in drops)
                self.assert_test(
                    all_above_min,
                    f"All filtered drops have value >= {min_value}",
                    "Some filtered drops have value below minimum"
                )
        
        # Test 6: Sort by value
        self.print_separator()
        print("Test 6: Sort drops by value (descending)")
        response = self.make_request("GET", "/custom/valuable-drops?sort=item_value&direction=desc")
        
        if response and response.status_code == 200:
            data = response.json()
            drops = data.get("drops", [])
            
            if len(drops) >= 2:
                is_sorted = drops[0].get("item_value", 0) >= drops[1].get("item_value", 0)
                self.assert_test(
                    is_sorted,
                    "Drops are correctly sorted by value (descending)",
                    "Drops are not sorted by value"
                )
        
        # Test 7: Delete drop
        if drop_id:
            self.print_separator()
            print(f"Test 7: Delete drop (ID: {drop_id})")
            response = self.make_request("DELETE", f"/custom/valuable-drops/{drop_id}")
            
            if response:
                self.assert_test(
                    response.status_code == 200,
                    f"Successfully deleted drop {drop_id}",
                    f"Failed to delete drop {drop_id}"
                )
                
                # Verify deletion
                verify_response = self.make_request("GET", "/custom/valuable-drops")
                if verify_response and verify_response.status_code == 200:
                    data = verify_response.json()
                    drops = data.get("drops", [])
                    drop_ids = [drop.get("drop_id") for drop in drops]
                    
                    self.assert_test(
                        drop_id not in drop_ids,
                        "Drop was successfully deleted (not found in list)",
                        "Drop still exists after deletion"
                    )
    
    def run_all_tests(self):
        print(f"Starting API tests at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"Base URL: {self.base_url}")
        print(f"Testing with member: {self.member_name}")
        self.print_separator()
        
        try:
            self.test_slayer_task_api()
            self.test_valuable_drops_api()
            
            # Print summary
            self.print_section("TEST SUMMARY")
            print(f"Total tests: {self.test_results['total']}")
            print(f"Passed: {self.test_results['pass']}")
            print(f"Failed: {self.test_results['fail']}")
            
            if self.test_results['fail'] == 0:
                print("\n✅ All tests passed!")
            else:
                print(f"\n❌ {self.test_results['fail']} tests failed")
                
        except Exception as e:
            print(f"Error running tests: {str(e)}")
            return 1
            
        return 0

def main():
    parser = argparse.ArgumentParser(description="Group Ironmen API Test Suite")
    parser.add_argument("--url", default=DEFAULT_BASE_URL, help=f"Base URL for the API (default: {DEFAULT_BASE_URL})")
    parser.add_argument("--token", required=True, help="Authentication token")
    parser.add_argument("--member", default=DEFAULT_MEMBER_NAME, help=f"Member name to use for testing (default: {DEFAULT_MEMBER_NAME})")
    
    args = parser.parse_args()
    
    tester = APITester(args.url, args.token, args.member)
    sys.exit(tester.run_all_tests())

if __name__ == "__main__":
    main()
