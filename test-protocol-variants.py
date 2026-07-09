#!/usr/bin/env python3
"""
Test variant protocol formats - maybe JSON-RPC, protobuf, or custom.
"""
import socket
import time

def send_request(label, payload):
    """Send request and capture response."""
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(2)

    try:
        sock.connect(("127.0.0.1", 6000))
        print("[TEST] {}".format(label))

        if isinstance(payload, str):
            payload = payload.encode()

        print("[SEND] {} bytes".format(len(payload)))
        print("[SEND] Hex: {}".format(payload.hex()[:100]))

        sock.sendall(payload)

        data = b""
        try:
            while True:
                chunk = sock.recv(4096)
                if not chunk:
                    break
                data += chunk
        except socket.timeout:
            pass

        if data:
            status = data.split(b'\r\n')[0] if b'\r\n' in data else data[:50]
            print("[RECV] {} bytes - {}".format(len(data), status))
        else:
            print("[RECV] (no response)")

        print()
        return data

    finally:
        sock.close()

if __name__ == "__main__":
    print("=" * 70)
    print("Testing RL Interface Protocol Variants")
    print("=" * 70)
    print()

    # Start the game
    import subprocess, os
    game_exe = "C:\\Users\\boter\\AppData\\Local\\0 A.D. Empires Ascendant\\binaries\\system\\pyrogenesis.exe"

    print("[SETUP] Starting 0 A.D. with RL Interface...")
    proc = subprocess.Popen(
        [game_exe, "--rl-interface=127.0.0.1:6000", "--mod=public"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )
    time.sleep(3)
    print("[SETUP] Process started, waiting for server...")
    time.sleep(2)

    try:
        # Test 1: Standard HTTP POST
        print("1. Standard HTTP POST with JSON")
        send_request(
            "HTTP POST /reset with empty JSON",
            b"POST /reset HTTP/1.1\r\nHost: localhost\r\nContent-Type: application/json\r\nContent-Length: 2\r\n\r\n{}"
        )

        # Test 2: JSON-RPC style
        print("2. JSON-RPC format (raw)")
        send_request(
            "Raw JSON-RPC",
            b'{"jsonrpc":"2.0","method":"reset","params":{},"id":1}'
        )

        # Test 3: Just JSON without HTTP
        print("3. Raw JSON (no HTTP headers)")
        send_request(
            "Raw JSON object",
            b'{"action":"reset"}'
        )

        # Test 4: Maybe it expects a tick field
        print("4. Minimal JSON with tick")
        send_request(
            "JSON with tick field",
            b'{"tick":0}'
        )

        # Test 5: Maybe it's a binary protocol with magic bytes
        print("5. Testing if maybe first byte is magic")
        send_request(
            "Magic byte 0x01 + JSON",
            b'\x01' + b'{"tick":0}'
        )

        # Test 6: Try GET with no body
        print("6. GET /reset")
        send_request(
            "GET /reset",
            b"GET /reset HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n"
        )

        # Test 7: POST to /step instead
        print("7. POST /step endpoint")
        send_request(
            "POST /step",
            b"POST /step HTTP/1.1\r\nHost: localhost\r\nContent-Type: application/json\r\nContent-Length: 2\r\n\r\n[]"
        )

        # Test 8: Maybe it uses protobuf or msgpack - send bytes that might be valid
        print("8. Empty array as JSON")
        send_request(
            "POST /reset with empty array",
            b"POST /reset HTTP/1.1\r\nHost: localhost\r\nContent-Type: application/json\r\nContent-Length: 2\r\n\r\n[]"
        )

    finally:
        print("[CLEANUP] Killing process...")
        proc.kill()
        proc.wait(timeout=5)
