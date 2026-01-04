#!/usr/bin/env python3
"""
Test script for Alsom API - tries different request combinations
Run locally with: python3 scripts/test_alsom_api.py

This script tests various request payloads to determine which configuration
works best with the Alsom API.
"""
import json
import urllib.request
import urllib.error
import uuid
from datetime import datetime

ALSOM_API_URL = "https://alsom.vercel.app/api/chat"

def test_request(name, payload):
    """Send a test request and print the result"""
    print(f"\n{'='*60}")
    print(f"TEST: {name}")
    print(f"{'='*60}")
    print(f"Payload: {json.dumps(payload, indent=2)}")
    
    try:
        req = urllib.request.Request(
            ALSOM_API_URL,
            data=json.dumps(payload).encode('utf-8'),
            headers={
                'Content-Type': 'application/json',
            },
            method='POST'
        )
        
        with urllib.request.urlopen(req, timeout=60) as response:
            status = response.status
            body = response.read().decode('utf-8')
            data = json.loads(body)
            
            print(f"\n✅ SUCCESS (HTTP {status})")
            reply = data.get('reply', 'N/A')
            print(f"Reply: {reply[:300]}..." if len(reply) > 300 else f"Reply: {reply}")
            if data.get('error'):
                print(f"Error in response: {data.get('error')}")
            if data.get('debug'):
                print(f"Debug: {json.dumps(data.get('debug'), indent=2)}")
            if data.get('usage'):
                print(f"Usage: {json.dumps(data.get('usage'), indent=2)}")
            return True, data
            
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8')
        print(f"\n❌ HTTP ERROR {e.code}")
        print(f"Response: {body[:500]}")
        try:
            error_data = json.loads(body)
            print(f"Error details: {json.dumps(error_data, indent=2)}")
        except:
            pass
        return False, None
        
    except urllib.error.URLError as e:
        print(f"\n❌ URL ERROR: {e.reason}")
        return False, None
        
    except Exception as e:
        print(f"\n❌ EXCEPTION: {type(e).__name__}: {e}")
        return False, None

def main():
    print("🔬 Alsom API Test Suite")
    print(f"API URL: {ALSOM_API_URL}")
    print(f"Time: {datetime.now().isoformat()}")
    
    session_id = f"test_{uuid.uuid4()}"
    user_id = f"testuser_{uuid.uuid4()}"
    
    results = []
    
    # Test 1: Minimal required fields
    success, _ = test_request("1. Minimal required fields", {
        "site": "eduscrapeapp",
        "user_id": user_id,
        "session_id": session_id,
        "messages": [
            {"role": "user", "content": "hi"}
        ]
    })
    results.append(("Minimal required fields", success))
    
    # Test 2: With system message
    success, _ = test_request("2. With system message", {
        "site": "eduscrapeapp",
        "user_id": user_id,
        "session_id": session_id,
        "messages": [
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": "hi"}
        ]
    })
    results.append(("With system message", success))
    
    # Test 3: With time tool enabled
    success, _ = test_request("3. With time tool enabled", {
        "site": "eduscrapeapp",
        "user_id": user_id,
        "session_id": session_id,
        "messages": [
            {"role": "user", "content": "hi"}
        ],
        "tools": ["time"]
    })
    results.append(("With time tool", success))
    
    # Test 4: With websearch tool
    success, _ = test_request("4. With websearch tool", {
        "site": "eduscrapeapp",
        "user_id": user_id,
        "session_id": session_id,
        "messages": [
            {"role": "user", "content": "hi"}
        ],
        "tools": ["websearch"]
    })
    results.append(("With websearch tool", success))
    
    # Test 5: With both tools
    success, _ = test_request("5. With both tools", {
        "site": "eduscrapeapp",
        "user_id": user_id,
        "session_id": session_id,
        "messages": [
            {"role": "user", "content": "hi"}
        ],
        "tools": ["time", "websearch"]
    })
    results.append(("With both tools", success))
    
    # Test 6: With add_tools=true
    success, _ = test_request("6. With add_tools=true", {
        "site": "eduscrapeapp",
        "user_id": user_id,
        "session_id": session_id,
        "messages": [
            {"role": "user", "content": "hi"}
        ],
        "add_tools": True
    })
    results.append(("With add_tools=true", success))
    
    # Test 7: With add_tools=false explicitly
    success, _ = test_request("7. With add_tools=false", {
        "site": "eduscrapeapp",
        "user_id": user_id,
        "session_id": session_id,
        "messages": [
            {"role": "user", "content": "hi"}
        ],
        "add_tools": False
    })
    results.append(("With add_tools=false", success))
    
    # Test 8: Empty tools array
    success, _ = test_request("8. Empty tools array", {
        "site": "eduscrapeapp",
        "user_id": user_id,
        "session_id": session_id,
        "messages": [
            {"role": "user", "content": "hi"}
        ],
        "tools": []
    })
    results.append(("Empty tools array", success))
    
    # Test 9: Full EduScrapeApp configuration
    success, _ = test_request("9. Full EduScrapeApp config", {
        "site": "eduscrapeapp",
        "user_id": user_id,
        "session_id": session_id,
        "messages": [
            {"role": "system", "content": "You are an AI assistant for EduScrapeApp, an educational platform."},
            {"role": "user", "content": "hi"}
        ],
        "tools": ["time", "websearch"],
        "add_tools": False
    })
    results.append(("Full EduScrapeApp config", success))
    
    # Test 10: Simple question
    success, _ = test_request("10. Simple question", {
        "site": "eduscrapeapp",
        "user_id": user_id,
        "session_id": session_id,
        "messages": [
            {"role": "user", "content": "What is 2 + 2?"}
        ]
    })
    results.append(("Simple question", success))
    
    # Test 11: Without optional fields (no tools, no add_tools)
    success, _ = test_request("11. No optional fields", {
        "site": "eduscrapeapp",
        "user_id": user_id,
        "session_id": session_id,
        "messages": [
            {"role": "user", "content": "Hello, how are you?"}
        ]
    })
    results.append(("No optional fields", success))
    
    # Test 12: Different site name
    success, _ = test_request("12. Different site name", {
        "site": "test",
        "user_id": user_id,
        "session_id": session_id,
        "messages": [
            {"role": "user", "content": "hi"}
        ]
    })
    results.append(("Different site name", success))
    
    # Summary
    print(f"\n{'='*60}")
    print("SUMMARY")
    print(f"{'='*60}")
    for name, success in results:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {name}")
    
    passed = sum(1 for _, s in results if s)
    total = len(results)
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed > 0:
        print("\n🎉 Working configurations found! Use the successful payload format in the app.")
    else:
        print("\n⚠️  No working configurations found. API may be down or misconfigured.")

if __name__ == "__main__":
    main()
