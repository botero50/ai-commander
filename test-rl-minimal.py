#!/usr/bin/env python3
"""
Minimal RL Interface client - follows official documentation exactly.
No AI Commander, no adapters, no abstractions.
Just HTTP requests to the RL Interface.
"""
import socket
import http.client
import json
import sys
import time

def test_rl_interface(host="127.0.0.1", port=6000):
    """Test RL Interface with minimal HTTP requests."""

    print("[{}] Attempting to connect to {}:{}".format(time.strftime('%H:%M:%S'), host, port))
    print()

    # Try to establish TCP connection first
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(2)
        result = sock.connect_ex((host, int(port)))
        if result != 0:
            print("[TCP FAIL] Cannot connect to {}:{}".format(host, port))
            print("[TCP FAIL] Error code: {}".format(result))
            sock.close()
            return False
        else:
            print("[TCP OK] Connected to {}:{}".format(host, port))
            sock.close()
    except Exception as e:
        print("[TCP ERROR] {}: {}".format(type(e).__name__, e))
        return False

    print()

    # Now try HTTP
    try:
        conn = http.client.HTTPConnection(host, port, timeout=5)

        # Test 1: GET /
        print("[HTTP] Sending: GET /")
        conn.request("GET", "/")
        response = conn.getresponse()
        print("[HTTP] Status: {} {}".format(response.status, response.reason))
        data = response.read().decode('utf-8', errors='ignore')
        print("[HTTP] Body length: {} bytes".format(len(data)))
        print("[HTTP] Body: {}".format(data[:200]))
        conn.close()

    except Exception as e:
        print("[HTTP ERROR] {}: {}".format(type(e).__name__, e))

    print()

    # Test 2: GET /state
    try:
        conn = http.client.HTTPConnection(host, port, timeout=5)
        print("[HTTP] Sending: GET /state")
        conn.request("GET", "/state")
        response = conn.getresponse()
        print("[HTTP] Status: {} {}".format(response.status, response.reason))
        data = response.read().decode('utf-8', errors='ignore')
        print("[HTTP] Body length: {} bytes".format(len(data)))
        if data:
            print("[HTTP] First 300 chars: {}".format(data[:300]))
            try:
                json_data = json.loads(data)
                print("[HTTP] JSON decoded successfully")
                if 'entity_orders' in json_data or 'globalScriptsMetadata' in json_data:
                    print("[HTTP] OK - Game state detected")
                else:
                    print("[HTTP] Got JSON but not game state")
            except json.JSONDecodeError as e:
                print("[HTTP] Not JSON: {}".format(e))
        conn.close()

    except Exception as e:
        print("[HTTP ERROR] {}: {}".format(type(e).__name__, e))

    print()

    # Test 3: POST to /reset
    try:
        conn = http.client.HTTPConnection(host, port, timeout=5)
        print("[HTTP] Sending: POST /reset")
        conn.request("POST", "/reset", body="")
        response = conn.getresponse()
        print("[HTTP] Status: {} {}".format(response.status, response.reason))
        data = response.read().decode('utf-8', errors='ignore')
        print("[HTTP] Body length: {} bytes".format(len(data)))
        if data:
            print("[HTTP] Body: {}".format(data[:300]))
        conn.close()
        return True

    except Exception as e:
        print("[HTTP ERROR] {}: {}".format(type(e).__name__, e))
        return False

if __name__ == "__main__":
    host = sys.argv[1] if len(sys.argv) > 1 else "127.0.0.1"
    port = sys.argv[2] if len(sys.argv) > 2 else "6000"

    print("=" * 60)
    print("RL Interface Minimal Test Client")
    print("=" * 60)
    print()

    test_rl_interface(host, port)

    print()
    print("=" * 60)
    print("Test complete")
    print("=" * 60)
