#!/usr/bin/env python3
"""
Check what's actually listening on port 6000 while game is running.
"""
import subprocess
import socket
import time

game_exe = "C:\\Users\\boter\\AppData\\Local\\0 A.D. Empires Ascendant\\binaries\\system\\pyrogenesis.exe"

print("=" * 70)
print("Network State Inspection During Game Launch")
print("=" * 70)
print()

# Start game
print("[1] Starting 0 A.D. with RL Interface flag...")
proc = subprocess.Popen(
    [game_exe, "--rl-interface=127.0.0.1:6000", "--mod=public"],
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True
)
print("[1] Process started, PID: {}".format(proc.pid))
print()

time.sleep(2)

# Check if port is listening
print("[2] Checking if port 6000 is listening...")
sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
sock.settimeout(1)
result = sock.connect_ex(("127.0.0.1", 6000))
sock.close()

if result == 0:
    print("[2] YES - Port 6000 is listening")
else:
    print("[2] NO - Port 6000 is not listening")
print()

# Try netstat to see what's listening
print("[3] Active listeners (netstat -ano):")
try:
    output = subprocess.check_output(
        ["netstat", "-ano"],
        text=True,
        stderr=subprocess.DEVNULL
    )
    for line in output.split('\n'):
        if '6000' in line or 'LISTENING' in line and proc.pid:
            print("  " + line)
except Exception as e:
    print("  (netstat not available: {})".format(e))
print()

# Try to list open ports differently
print("[4] Check Windows ports:")
try:
    output = subprocess.check_output(
        ["netstat", "-ano", "-p", "TCP"],
        text=True,
        stderr=subprocess.DEVNULL
    )
    for line in output.split('\n'):
        if '6000' in line:
            print("  " + line)
except:
    print("  (unable to query)")
print()

# Send a simple request and observe process behavior
print("[5] Sending test request to port 6000...")
try:
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(2)
    sock.connect(("127.0.0.1", 6000))

    # Send minimal HTTP GET
    sock.sendall(b"GET / HTTP/1.1\r\nHost: localhost\r\n\r\n")

    response = sock.recv(1024)
    sock.close()

    print("[5] Got response: {} bytes".format(len(response)))
    if response:
        print("[5] Status: {}".format(response.split(b'\r\n')[0]))
except Exception as e:
    print("[5] Connection failed: {}".format(e))
print()

# Check process is still running
time.sleep(1)
poll = proc.poll()
if poll is None:
    print("[6] Game process still running (PID {})".format(proc.pid))
else:
    print("[6] Game process exited with code: {}".format(poll))
    stdout, stderr = proc.communicate()
    if stdout:
        print("[6] stdout: {}".format(stdout[:200]))
    if stderr:
        print("[6] stderr: {}".format(stderr[:200]))
print()

# Cleanup
print("[7] Killing process...")
proc.kill()
try:
    proc.wait(timeout=3)
    print("[7] Process terminated")
except:
    print("[7] Process force killed")
