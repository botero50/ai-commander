#!/usr/bin/env python3
"""
Test if the RL Interface expects persistent/keep-alive connections or has an issue with Connection handling.
"""
import subprocess
import socket
import time

game_exe = "C:\\Users\\boter\\AppData\\Local\\0 A.D. Empires Ascendant\\binaries\\system\\pyrogenesis.exe"

print("=" * 70)
print("HTTP Keep-Alive and Connection Management Testing")
print("=" * 70)
print()

# Start game
print("[SETUP] Starting game...")
proc = subprocess.Popen(
    [game_exe, "--rl-interface=127.0.0.1:6000", "--mod=public"],
    stdout=subprocess.DEVNULL,
    stderr=subprocess.DEVNULL
)
time.sleep(3)

try:
    # Test 1: Request with Connection: close
    print("Test 1: POST /reset with Connection: close")
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(2)
    sock.connect(("127.0.0.1", 6000))

    request = (
        "POST /reset HTTP/1.1\r\n"
        "Host: localhost\r\n"
        "Content-Type: application/json\r\n"
        "Content-Length: 2\r\n"
        "Connection: close\r\n"
        "\r\n"
        "{}"
    )
    sock.sendall(request.encode())

    data = b""
    while True:
        try:
            chunk = sock.recv(1024)
            if not chunk:
                break
            data += chunk
        except socket.timeout:
            break
    sock.close()

    status = data.split(b'\r\n')[0] if data else b"(no response)"
    print("  Status: {}".format(status))
    print("  Body length: {}".format(len(data)))
    print()

    # Test 2: Request with keep-alive
    print("Test 2: POST /reset with Connection: keep-alive")
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(2)
    sock.connect(("127.0.0.1", 6000))

    request = (
        "POST /reset HTTP/1.1\r\n"
        "Host: localhost\r\n"
        "Content-Type: application/json\r\n"
        "Content-Length: 2\r\n"
        "Connection: keep-alive\r\n"
        "\r\n"
        "{}"
    )
    sock.sendall(request.encode())

    # Try to get response with longer timeout
    data = b""
    sock.settimeout(1)
    try:
        while True:
            chunk = sock.recv(1024)
            if not chunk:
                break
            data += chunk
    except socket.timeout:
        pass
    sock.close()

    status = data.split(b'\r\n')[0] if data else b"(no response)"
    print("  Status: {}".format(status))
    print("  Body length: {}".format(len(data)))
    print()

    # Test 3: No explicit Connection header
    print("Test 3: POST /reset with no Connection header")
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(2)
    sock.connect(("127.0.0.1", 6000))

    request = (
        "POST /reset HTTP/1.1\r\n"
        "Host: localhost\r\n"
        "Content-Type: application/json\r\n"
        "Content-Length: 2\r\n"
        "\r\n"
        "{}"
    )
    sock.sendall(request.encode())

    data = b""
    sock.settimeout(1)
    try:
        while True:
            chunk = sock.recv(1024)
            if not chunk:
                break
            data += chunk
    except socket.timeout:
        pass
    sock.close()

    status = data.split(b'\r\n')[0] if data else b"(no response)"
    print("  Status: {}".format(status))
    print("  Body length: {}".format(len(data)))
    print()

    # Test 4: Raw bytes - maybe it's not HTTP at all?
    print("Test 4: Raw binary - just the data without HTTP wrapper")
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(2)
    sock.connect(("127.0.0.1", 6000))

    sock.sendall(b'{}')  # Just JSON, no HTTP

    data = b""
    sock.settimeout(1)
    try:
        while True:
            chunk = sock.recv(1024)
            if not chunk:
                break
            data += chunk
    except socket.timeout:
        pass
    sock.close()

    status = data.split(b'\r\n')[0] if data else b"(no response)"
    print("  Status: {}".format(status))
    print("  Body length: {}".format(len(data)))
    if data:
        print("  Hex: {}".format(data.hex()[:100]))
    print()

    # Test 5: Try with POST /step
    print("Test 5: POST /step with JSON array")
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(2)
    sock.connect(("127.0.0.1", 6000))

    request = (
        "POST /step HTTP/1.1\r\n"
        "Host: localhost\r\n"
        "Content-Type: application/json\r\n"
        "Content-Length: 2\r\n"
        "\r\n"
        "[]"
    )
    sock.sendall(request.encode())

    data = b""
    sock.settimeout(1)
    try:
        while True:
            chunk = sock.recv(1024)
            if not chunk:
                break
            data += chunk
    except socket.timeout:
        pass
    sock.close()

    status = data.split(b'\r\n')[0] if data else b"(no response)"
    print("  Status: {}".format(status))
    print("  Body length: {}".format(len(data)))
    print()

finally:
    proc.kill()
