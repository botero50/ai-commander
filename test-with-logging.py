#!/usr/bin/env python3
"""
Start 0 A.D. with debug/verbose flags to capture any RL Interface messages.
"""
import subprocess
import time
import os

game_exe = "C:\\Users\\boter\\AppData\\Local\\0 A.D. Empires Ascendant\\binaries\\system\\pyrogenesis.exe"

print("=" * 70)
print("Testing with Debug/Verbose Flags")
print("=" * 70)
print()

# Possible debug flags
flag_combinations = [
    # Standard flags
    ["--rl-interface=127.0.0.1:6000", "--mod=public"],

    # With debug flags
    ["--rl-interface=127.0.0.1:6000", "--mod=public", "-debug"],
    ["--rl-interface=127.0.0.1:6000", "--mod=public", "--test"],

    # With different mods
    ["--rl-interface=127.0.0.1:6000", "--mod=mod1"],
]

for i, flags in enumerate(flag_combinations, 1):
    print("[Test {}] Flags: {}".format(i, " ".join(flags)))

    try:
        proc = subprocess.Popen(
            [game_exe] + flags,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1
        )
        print("[Test {}] Started PID: {}".format(i, proc.pid))

        # Wait for startup
        time.sleep(3)

        # Try to connect
        import socket
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(1)
        result = sock.connect_ex(("127.0.0.1", 6000))
        sock.close()

        if result == 0:
            print("[Test {}] Port 6000: LISTENING".format(i))
        else:
            print("[Test {}] Port 6000: NOT LISTENING".format(i))

        # Kill and collect output
        proc.kill()
        stdout, stderr = proc.communicate(timeout=2)

        if stdout:
            print("[Test {}] stdout: {}".format(i, stdout[:300]))
        if stderr:
            print("[Test {}] stderr: {}".format(i, stderr[:300]))

    except Exception as e:
        print("[Test {}] Error: {}".format(i, e))

    print()
