#!/usr/bin/env python3
"""
External Camera Controller for 0 A.D.
Moves the in-game camera via keyboard input without taking mouse/keyboard control.
Can be called from Node.js via child_process or HTTP endpoint.

Usage:
    python3 camera-controller.py move up 2000      # Move up for 2 seconds
    python3 camera-controller.py move down 1000    # Move down for 1 second
    python3 camera-controller.py move left 1500    # Move left for 1.5 seconds
    python3 camera-controller.py move right 1000   # Move right for 1 second
    python3 camera-controller.py zoom in 1000      # Zoom in for 1 second
    python3 camera-controller.py zoom out 1000     # Zoom out for 1 second
    python3 camera-controller.py key W 2000        # Hold any key for duration
"""

import sys
import time
import subprocess
from typing import Literal

# Windows keyboard key codes
KEY_CODES = {
    'W': 0x57,      # Up
    'A': 0x41,      # Left
    'S': 0x53,      # Down
    'D': 0x44,      # Right
    'UP': 0x26,     # Arrow Up
    'DOWN': 0x28,   # Arrow Down
    'LEFT': 0x25,   # Arrow Left
    'RIGHT': 0x27,  # Arrow Right
    'E': 0x45,      # Zoom in
    'Q': 0x51,      # Zoom out
}

DIRECTION_TO_KEY = {
    'up': 'W',
    'down': 'S',
    'left': 'A',
    'right': 'D',
    'zoom-in': 'E',
    'zoom-out': 'Q',
}


def send_key_windows(key_code: int, duration_ms: int):
    """
    Send keyboard input on Windows using PowerShell.
    This doesn't steal focus - just sends key events to the active window.
    """
    ps_script = f"""
Add-Type @"
using System;
using System.Runtime.InteropServices;

public class Keyboard {{
    [DllImport("user32.dll")]
    public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, int dwExtraInfo);

    public const uint KEYEVENTF_KEYDOWN = 0;
    public const uint KEYEVENTF_KEYUP = 2;
}}
"@

# Press key
[Keyboard]::keybd_event({key_code}, 0, 0, 0);

# Hold for duration
[System.Threading.Thread]::Sleep({duration_ms});

# Release key
[Keyboard]::keybd_event({key_code}, 2, 0, 0);
"""

    try:
        subprocess.run(
            ["powershell", "-NoProfile", "-Command", ps_script],
            capture_output=True,
            timeout=duration_ms / 1000 + 5,
            check=False,
        )
    except subprocess.TimeoutExpired:
        print(f"Warning: Key press timed out for duration {duration_ms}ms", file=sys.stderr)
    except Exception as e:
        print(f"Error sending key: {e}", file=sys.stderr)
        sys.exit(1)


def move_camera(direction: str, duration_ms: int):
    """Move camera in a direction for specified duration."""
    direction = direction.lower()

    if direction not in DIRECTION_TO_KEY:
        print(f"Invalid direction: {direction}", file=sys.stderr)
        print(f"Valid directions: {', '.join(DIRECTION_TO_KEY.keys())}", file=sys.stderr)
        sys.exit(1)

    key = DIRECTION_TO_KEY[direction]
    key_code = KEY_CODES.get(key)

    if key_code is None:
        print(f"Unknown key: {key}", file=sys.stderr)
        sys.exit(1)

    print(f"Moving camera {direction} for {duration_ms}ms...")
    send_key_windows(key_code, duration_ms)
    print(f"✓ Camera moved {direction}")


def hold_key(key: str, duration_ms: int):
    """Hold a specific key for duration."""
    key = key.upper()
    key_code = KEY_CODES.get(key)

    if key_code is None:
        print(f"Unknown key: {key}", file=sys.stderr)
        print(f"Valid keys: {', '.join(sorted(KEY_CODES.keys()))}", file=sys.stderr)
        sys.exit(1)

    print(f"Holding key {key} for {duration_ms}ms...")
    send_key_windows(key_code, duration_ms)
    print(f"✓ Key {key} released")


def main():
    """Parse command line arguments and execute camera movement."""
    if len(sys.argv) < 2:
        print("Usage: python3 camera-controller.py <command> [args...]", file=sys.stderr)
        print("", file=sys.stderr)
        print("Commands:", file=sys.stderr)
        print("  move <direction> <duration_ms>  - Move camera (up/down/left/right)", file=sys.stderr)
        print("  zoom <direction> <duration_ms>  - Zoom camera (in/out)", file=sys.stderr)
        print("  key <key> <duration_ms>         - Hold a key for duration", file=sys.stderr)
        print("", file=sys.stderr)
        print("Examples:", file=sys.stderr)
        print("  python3 camera-controller.py move up 2000", file=sys.stderr)
        print("  python3 camera-controller.py move down 1000", file=sys.stderr)
        print("  python3 camera-controller.py zoom in 500", file=sys.stderr)
        print("  python3 camera-controller.py key W 2000", file=sys.stderr)
        sys.exit(1)

    command = sys.argv[1].lower()

    if command == 'move':
        if len(sys.argv) < 4:
            print("Usage: move <direction> <duration_ms>", file=sys.stderr)
            sys.exit(1)
        direction = sys.argv[2]
        try:
            duration = int(sys.argv[3])
        except ValueError:
            print(f"Invalid duration: {sys.argv[3]}", file=sys.stderr)
            sys.exit(1)
        move_camera(direction, duration)

    elif command == 'zoom':
        if len(sys.argv) < 4:
            print("Usage: zoom <direction> <duration_ms>", file=sys.stderr)
            sys.exit(1)
        direction = sys.argv[2].lower()
        try:
            duration = int(sys.argv[3])
        except ValueError:
            print(f"Invalid duration: {sys.argv[3]}", file=sys.stderr)
            sys.exit(1)
        if direction == 'in':
            move_camera('zoom-in', duration)
        elif direction == 'out':
            move_camera('zoom-out', duration)
        else:
            print(f"Invalid zoom direction: {direction}", file=sys.stderr)
            sys.exit(1)

    elif command == 'key':
        if len(sys.argv) < 4:
            print("Usage: key <key> <duration_ms>", file=sys.stderr)
            sys.exit(1)
        key = sys.argv[2]
        try:
            duration = int(sys.argv[3])
        except ValueError:
            print(f"Invalid duration: {sys.argv[3]}", file=sys.stderr)
            sys.exit(1)
        hold_key(key, duration)

    else:
        print(f"Unknown command: {command}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
