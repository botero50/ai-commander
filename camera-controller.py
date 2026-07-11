#!/usr/bin/env python3
"""
Camera controller for 0 A.D. using pynput
Sends keyboard input to the game window

Usage:
    python camera-controller.py w 2000      # Press W for 2 seconds
    python camera-controller.py minus 1000  # Press minus for 1 second
"""

import sys
import time
import ctypes
from pynput.keyboard import Controller, Key

keyboard = Controller()

def focus_game_window():
    """Focus the 0 A.D. game window using Windows API"""
    try:
        import win32gui
        import win32con

        # Find window by title
        hwnd = win32gui.FindWindow(None, "0 A.D")
        if hwnd == 0:
            # Try finding by partial title
            def enum_windows(hwnd, lParam):
                if "0 A.D" in win32gui.GetWindowText(hwnd):
                    win32gui.SetForegroundWindow(hwnd)
                    win32gui.ShowWindow(hwnd, win32con.SW_SHOW)
                    return False
                return True

            win32gui.EnumWindows(enum_windows, None)
            time.sleep(0.15)
            return True
        else:
            # Found exact match
            win32gui.SetForegroundWindow(hwnd)
            win32gui.ShowWindow(hwnd, win32con.SW_SHOW)
            time.sleep(0.15)
            return True
    except ImportError:
        print("Installing pywin32...")
        import subprocess
        subprocess.run([sys.executable, "-m", "pip", "install", "pywin32"], capture_output=True)
        return focus_game_window()
    except Exception as e:
        print(f"Could not focus game window: {e}")
        return False

def send_key(key_name, duration_ms):
    """Send a key for specified duration"""

    # Map key names to pynput keys
    key_map = {
        'w': 'w',
        'a': 'a',
        's': 's',
        'd': 'd',
        'q': 'q',
        'e': 'e',
        'up': Key.up,
        'down': Key.down,
        'left': Key.left,
        'right': Key.right,
        'minus': '-',
        'plus': '+',
        'underscore': '_',
    }

    if key_name not in key_map:
        print(f"Error: Unknown key '{key_name}'")
        print(f"Valid keys: {', '.join(key_map.keys())}")
        sys.exit(1)

    key = key_map[key_name]
    duration_sec = duration_ms / 1000.0

    # Focus the game window first
    focus_game_window()
    time.sleep(0.15)

    # Press key down
    keyboard.press(key)
    time.sleep(duration_sec)
    # Release key
    keyboard.release(key)

    print(f"✓ Sent '{key_name}' for {duration_ms}ms")

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: python camera-controller.py <key> <duration_ms>")
        print("Example: python camera-controller.py w 2000")
        sys.exit(1)

    key_name = sys.argv[1].lower()
    try:
        duration = int(sys.argv[2])
    except ValueError:
        print(f"Error: Invalid duration '{sys.argv[2]}'")
        sys.exit(1)

    send_key(key_name, duration)
