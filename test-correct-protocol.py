#!/usr/bin/env python3
"""
Test with the CORRECT RL Interface protocol based on official source code.

Key Findings from RLInterface.cpp:
- /reset: Expects POST body (scenario content) + optional query params (saveReplay, playerID)
- /step: Expects POST body with newline-delimited commands in format "playerId;jsonCommand"
"""
import subprocess
import socket
import time
import json

game_exe = "C:\\Users\\boter\\AppData\\Local\\0 A.D. Empires Ascendant\\binaries\\system\\pyrogenesis.exe"

print("=" * 70)
print("Testing RL Interface with CORRECT Protocol")
print("=" * 70)
print()

# Start game
print("[SETUP] Starting 0 A.D. with RL Interface...")
proc = subprocess.Popen(
    [game_exe, "--rl-interface=127.0.0.1:6000", "--mod=public"],
    stdout=subprocess.DEVNULL,
    stderr=subprocess.DEVNULL
)
time.sleep(3)

try:
    # Test 1: POST /reset with scenario JSON as body
    print("Test 1: POST /reset with scenario config as body")
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(3)
    sock.connect(("127.0.0.1", 6000))

    # Minimal 0 A.D. scenario (based on source code, expects JSON)
    scenario = {
        "settings": {
            "Map": "Skirmish\/Cantabria",
            "PlayerData": [
                {
                    "Civ": "athen"
                },
                {
                    "Civ": "gaul"
                }
            ]
        }
    }

    scenario_json = json.dumps(scenario)
    request = (
        "POST /reset HTTP/1.1\r\n"
        "Host: localhost\r\n"
        "Content-Type: application/json\r\n"
        "Content-Length: {}\r\n"
        "Connection: close\r\n"
        "\r\n"
        "{}"
    ).format(len(scenario_json), scenario_json)

    print("  Sending {} bytes of scenario config".format(len(scenario_json)))
    sock.sendall(request.encode())

    data = b""
    sock.settimeout(2)
    try:
        while True:
            chunk = sock.recv(4096)
            if not chunk:
                break
            data += chunk
    except socket.timeout:
        pass
    sock.close()

    if data:
        lines = data.split(b'\r\n')
        status = lines[0] if lines else b"(no response)"
        print("  Status: {}".format(status))

        # Find body
        try:
            body_start = data.find(b'\r\n\r\n') + 4
            body = data[body_start:]
            if body:
                print("  Response length: {} bytes".format(len(body)))
                try:
                    response_json = json.loads(body.decode())
                    print("  Response is valid JSON!")
                    if 'tick' in response_json:
                        print("  Tick: {}".format(response_json['tick']))
                except:
                    print("  Response: {}".format(body[:100]))
        except:
            pass
    else:
        print("  (no response)")

    print()

    # Test 2: POST /step with newline-delimited commands
    print("Test 2: POST /step with commands (format: playerId;jsonCommand)")
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(3)
    sock.connect(("127.0.0.1", 6000))

    # Format: playerId;jsonCommand\nplayerId;jsonCommand...
    commands = "1;{}\n".format(json.dumps({}))  # Empty command for player 1

    request = (
        "POST /step HTTP/1.1\r\n"
        "Host: localhost\r\n"
        "Content-Type: text/plain\r\n"
        "Content-Length: {}\r\n"
        "Connection: close\r\n"
        "\r\n"
        "{}"
    ).format(len(commands), commands)

    print("  Sending command: {}".format(repr(commands)))
    sock.sendall(request.encode())

    data = b""
    sock.settimeout(2)
    try:
        while True:
            chunk = sock.recv(4096)
            if not chunk:
                break
            data += chunk
    except socket.timeout:
        pass
    sock.close()

    if data:
        lines = data.split(b'\r\n')
        status = lines[0] if lines else b"(no response)"
        print("  Status: {}".format(status))
    else:
        print("  (no response)")

    print()

finally:
    print("[CLEANUP] Killing process...")
    proc.kill()
    try:
        proc.wait(timeout=2)
    except:
        pass
