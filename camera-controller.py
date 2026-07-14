#!/usr/bin/env python3
"""
Camera controller for 0 A.D. using pynput
Sends keyboard input, mouse clicks, and captures screenshots

Usage:
    python camera-controller.py w 2000              # Press W for 2 seconds
    python camera-controller.py minus 1000          # Press minus for 1 second
    python camera-controller.py click 500 300       # Click at position (500, 300)
    python camera-controller.py screenshot game.png # Capture game window screenshot
"""

import sys
import time
import ctypes
from pynput.keyboard import Controller, Key
from pynput.mouse import Controller as MouseController, Button
from PIL import ImageGrab
import os

keyboard = Controller()
mouse = MouseController()

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

def send_key(key_names, duration_ms):
    """Send one or more keys for specified duration (simultaneous if multiple)"""

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
        'scroll_up': 'scroll_up',      # Mouse wheel up (zoom in)
        'scroll_down': 'scroll_down',  # Mouse wheel down (zoom out)
    }

    # Support both single key (string) and multiple keys (list/comma-separated)
    if isinstance(key_names, str):
        # Support comma-separated keys: "w,a" or single key: "w"
        key_list = [k.strip() for k in key_names.split(',')]
    else:
        key_list = [key_names]

    # Validate all keys
    for key_name in key_list:
        if key_name not in key_map:
            print(f"Error: Unknown key '{key_name}'")
            print(f"Valid keys: {', '.join(key_map.keys())}")
            sys.exit(1)

    # Focus the game window first
    focus_game_window()
    time.sleep(0.15)

    # Handle mouse scroll separately
    if len(key_list) == 1 and key_list[0] in ['scroll_up', 'scroll_down']:
        key_name = key_list[0]
        if key_name == 'scroll_up':
            # Scroll wheel up (zoom in)
            for _ in range(5):
                mouse.scroll(0, 1)
                time.sleep(0.05)
            print(f"✓ Sent mouse scroll UP for {duration_ms}ms")
        else:
            # Scroll wheel down (zoom out)
            for _ in range(5):
                mouse.scroll(0, -1)
                time.sleep(0.05)
            print(f"✓ Sent mouse scroll DOWN for {duration_ms}ms")
        return

    # Handle keyboard keys (single or multiple simultaneously)
    keys_to_press = [key_map[k] for k in key_list]
    duration_sec = duration_ms / 1000.0

    # Press all keys down simultaneously
    for key in keys_to_press:
        keyboard.press(key)
    time.sleep(duration_sec)
    # Release all keys
    for key in keys_to_press:
        keyboard.release(key)

    key_names_str = '+'.join(key_list)
    print(f"✓ Sent '{key_names_str}' for {duration_ms}ms")

def click_at(x, y):
    """Click at specific screen coordinates"""
    try:
        focus_game_window()
        time.sleep(0.1)
        mouse.position = (x, y)
        time.sleep(0.05)
        mouse.click(Button.left, 1)
        print(f"✓ Clicked at ({x}, {y})")
    except Exception as e:
        print(f"Error clicking: {e}")
        sys.exit(1)

def take_screenshot(output_path):
    """Take a screenshot of the entire screen"""
    try:
        # Capture full screen
        screenshot = ImageGrab.grab()
        screenshot.save(output_path)
        print(f"✓ Screenshot saved to {output_path}")
    except Exception as e:
        print(f"Error taking screenshot: {e}")
        sys.exit(1)

def detect_minimap():
    """Detect minimap location on screen by finding the circular border"""
    try:
        import win32gui
        from PIL import ImageGrab
        import numpy as np

        # Get 0 A.D. window
        hwnd = win32gui.FindWindow(None, "0 A.D")
        if hwnd == 0:
            hwnds = []
            def enum_callback(hwnd, ctx):
                title = win32gui.GetWindowText(hwnd)
                if "0 A.D" in title or "0ad" in title.lower():
                    hwnds.append(hwnd)
                return True
            win32gui.EnumWindows(enum_callback, None)
            if not hwnds:
                return None
            hwnd = hwnds[0]

        # Get window coordinates
        rect = win32gui.GetWindowRect(hwnd)
        win_left, win_top, win_right, win_bottom = rect
        print(f"Window: ({win_left}, {win_top}) to ({win_right}, {win_bottom})")

        # Minimap is in bottom-left area of screen
        # Search the full width at the bottom 30% height
        search_left = win_left
        search_top = int(win_top + (win_bottom - win_top) * 0.70)  # Bottom 30% of screen
        search_right = win_right  # Full screen width (don't limit to left 20%)
        search_bottom = win_bottom

        print(f"Searching in area: ({search_left}, {search_top}) to ({search_right}, {search_bottom})")

        # Capture full screen and save for debugging
        full_img = ImageGrab.grab()
        full_img.save('minimap_location_debug.png')

        # Capture the search area
        img = ImageGrab.grab(bbox=(search_left, search_top, search_right, search_bottom))
        img.save('minimap_search_area.png')
        img_array = np.array(img)

        # Look for the dark border/outline of the minimap
        # The minimap has a dark border, so look for dark pixels with circular pattern
        dark_mask = (img_array[:, :, 0] < 100) & (img_array[:, :, 1] < 100) & (img_array[:, :, 2] < 100)

        dark_pixels = np.argwhere(dark_mask)

        if len(dark_pixels) == 0:
            print("Error: Could not detect minimap border")
            return None

        # Find the bounding box of the dark border
        min_y = np.min(dark_pixels[:, 0])
        max_y = np.max(dark_pixels[:, 0])
        min_x = np.min(dark_pixels[:, 1])
        max_x = np.max(dark_pixels[:, 1])

        # Calculate minimap center and size (add some padding)
        minimap_width = max_x - min_x + 20
        minimap_height = max_y - min_y + 20
        minimap_left = search_left + min_x - 10
        minimap_top = search_top + min_y - 10

        print(f"OK: Detected minimap")
        print(f"OK: Position: ({minimap_left}, {minimap_top})")
        print(f"OK: Size: {minimap_width}x{minimap_height}")

        return {
            'left': minimap_left,
            'top': minimap_top,
            'width': minimap_width,
            'height': minimap_height,
        }

    except Exception as e:
        print(f"Error detecting minimap: {e}")
        import traceback
        traceback.print_exc()
        return None

def calibrate_minimap():
    """Click on the minimap and record the pixel coordinates for calibration"""
    try:
        import win32gui
        from PIL import ImageGrab
        import json

        # Detect minimap first
        minimap = detect_minimap()
        if not minimap:
            print("Error: Could not detect minimap")
            sys.exit(1)

        print(f"Minimap detected at: ({minimap['left']}, {minimap['top']})")
        print(f"Minimap size: {minimap['width']}x{minimap['height']}")
        print(f"Minimap center: ({minimap['left'] + minimap['width']//2}, {minimap['top'] + minimap['height']//2})")
        print("")
        print("Please click on the RED BASE on the minimap")
        print("The script will record the click coordinates")
        print("")

        # Wait for mouse click on minimap
        from pynput import mouse as pynput_mouse

        clicked_pos = {'x': None, 'y': None}

        def on_click(x, y, button, pressed):
            if pressed:
                clicked_pos['x'] = x
                clicked_pos['y'] = y
                print(f"Clicked at screen coordinates: ({x}, {y})")
                # Calculate relative to minimap
                rel_x = x - minimap['left']
                rel_y = y - minimap['top']
                print(f"Relative to minimap: ({rel_x}, {rel_y})")
                return False  # Stop listening

        with pynput_mouse.Listener(on_click=on_click) as listener:
            listener.join()

        # Save calibration data
        cal_data = {
            'minimap_left': minimap['left'],
            'minimap_top': minimap['top'],
            'minimap_width': minimap['width'],
            'minimap_height': minimap['height'],
            'red_base_screen_x': clicked_pos['x'],
            'red_base_screen_y': clicked_pos['y'],
            'red_base_relative_x': clicked_pos['x'] - minimap['left'],
            'red_base_relative_y': clicked_pos['y'] - minimap['top'],
        }

        with open('minimap_calibration.json', 'w') as f:
            json.dump(cal_data, f, indent=2)

        print(f"OK: Calibration saved to minimap_calibration.json")
        print(json.dumps(cal_data, indent=2))

    except Exception as e:
        print(f"Error during calibration: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

def detect_bases_on_minimap():
    """Detect red and blue base positions on minimap by color"""
    try:
        from PIL import ImageGrab
        import numpy as np

        # Detect minimap first
        minimap = detect_minimap()
        if not minimap:
            print("Error: Could not detect minimap")
            return None

        # Capture minimap area
        img = ImageGrab.grab(bbox=(minimap['left'], minimap['top'],
                                    minimap['left'] + minimap['width'],
                                    minimap['top'] + minimap['height']))

        # Save for debugging
        img.save('minimap_capture.png')

        img_array = np.array(img)

        # Detect RED base - bright red diamond (R dominant, G and B low)
        # Red diamond appears to be around RGB(200-255, 50-100, 50-100)
        red_mask = (img_array[:, :, 0] > 180) & (img_array[:, :, 1] < 120) & (img_array[:, :, 2] < 120)
        red_pixels = np.argwhere(red_mask)

        # Detect BLUE base - bright blue diamond (B dominant, R and G low)
        # Blue diamond appears to be around RGB(50-100, 50-150, 200-255)
        blue_mask = (img_array[:, :, 2] > 180) & (img_array[:, :, 0] < 120) & (img_array[:, :, 1] < 150)
        blue_pixels = np.argwhere(blue_mask)

        print(f"Red pixels found: {len(red_pixels)}")
        print(f"Blue pixels found: {len(blue_pixels)}")

        # Debug: show some sample pixel colors
        if len(red_pixels) > 0:
            sample_idx = len(red_pixels) // 2
            sample_pixel = img_array[red_pixels[sample_idx, 0], red_pixels[sample_idx, 1]]
            print(f"Sample red pixel color: RGB{tuple(sample_pixel[:3])}")

        if len(blue_pixels) > 0:
            sample_idx = len(blue_pixels) // 2
            sample_pixel = img_array[blue_pixels[sample_idx, 0], blue_pixels[sample_idx, 1]]
            print(f"Sample blue pixel color: RGB{tuple(sample_pixel[:3])}")

        red_pos = None
        blue_pos = None

        if len(red_pixels) > 0:
            red_center_y = int(np.mean(red_pixels[:, 0]))
            red_center_x = int(np.mean(red_pixels[:, 1]))
            red_pos = (red_center_x, red_center_y)
            print(f"OK: Detected red base at minimap ({red_center_x}, {red_center_y})")

        if len(blue_pixels) > 0:
            blue_center_y = int(np.mean(blue_pixels[:, 0]))
            blue_center_x = int(np.mean(blue_pixels[:, 1]))
            blue_pos = (blue_center_x, blue_center_y)
            print(f"OK: Detected blue base at minimap ({blue_center_x}, {blue_center_y})")

        if not red_pos or not blue_pos:
            print("Error: Could not detect both bases")
            return None

        return {
            'minimap': minimap,
            'red_pos': red_pos,
            'blue_pos': blue_pos,
        }

    except Exception as e:
        print(f"Error detecting bases: {e}")
        import traceback
        traceback.print_exc()
        return None

def click_at_minimap_coordinates(world_x, world_z, red_world_x=None, red_world_z=None, blue_world_x=None, blue_world_z=None):
    """Click at specific world coordinates on the minimap

    Args:
        world_x: World X coordinate (0-350 for standard map)
        world_z: World Z coordinate (0-350 for standard map)
        red_world_x: Red base world X coordinate (optional, uses default if None)
        red_world_z: Red base world Z coordinate (optional, uses default if None)
        blue_world_x: Blue base world X coordinate (optional, uses default if None)
        blue_world_z: Blue base world Z coordinate (optional, uses default if None)
    """
    try:
        import win32gui

        # Detect minimap
        minimap = detect_minimap()
        if not minimap:
            print("Error: Could not detect minimap")
            sys.exit(1)

        # Detect bases to calibrate
        bases = detect_bases_on_minimap()
        if not bases:
            print("Error: Could not detect bases for calibration")
            sys.exit(1)

        red_pos = bases['red_pos']  # minimap pixel (512, 175)
        blue_pos = bases['blue_pos']  # minimap pixel (418, 208)

        # Use provided calibration coordinates or fall back to defaults
        # Default: Acropolis Bay 2P calibration (measured from actual base positions)
        if red_world_x is None:
            red_world_x = 220
            print("⚠️  WARNING: Using default red base calibration (220, 230) - consider passing actual coordinates")
        if red_world_z is None:
            red_world_z = 230
        if blue_world_x is None:
            blue_world_x = 90
            print("⚠️  WARNING: Using default blue base calibration (90, 90) - consider passing actual coordinates")
        if blue_world_z is None:
            blue_world_z = 90

        # Calculate scale from the two reference points
        delta_pixel_x = red_pos[0] - blue_pos[0]  # 512 - 418 = 94
        delta_pixel_z = red_pos[1] - blue_pos[1]  # 175 - 208 = -33
        delta_world_x = red_world_x - blue_world_x  # 220 - 90 = 130
        delta_world_z = red_world_z - blue_world_z  # 230 - 90 = 140

        scale_x = delta_pixel_x / delta_world_x  # 94 / 130 ≈ 0.723
        scale_z = delta_pixel_z / delta_world_z  # -33 / 140 ≈ -0.236

        # Calculate offset using red base as reference
        # minimap_x = blue_pixel_x + (world_x - blue_world_x) * scale_x
        offset_x = red_pos[0] - (red_world_x * scale_x)
        offset_z = red_pos[1] - (red_world_z * scale_z)

        # Convert world to minimap coordinates
        minimap_x = int(world_x * scale_x + offset_x)
        minimap_z = int(world_z * scale_z + offset_z)

        # Convert to screen coordinates
        screen_x = minimap['left'] + minimap_x
        screen_y = minimap['top'] + minimap_z

        print(f"OK: Clicking world coordinates ({world_x}, {world_z})")
        print(f"OK: Minimap coordinates: ({minimap_x}, {minimap_z})")
        print(f"OK: Screen coordinates: ({screen_x}, {screen_y})")

        # Focus game and click
        focus_game_window()
        time.sleep(0.1)
        mouse.position = (screen_x, screen_y)
        time.sleep(0.05)
        mouse.click(Button.left, 1)

        print(f"OK: Clicked at screen ({screen_x}, {screen_y})")

    except Exception as e:
        print(f"Error clicking coordinates: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

def click_base_on_minimap(base_type):
    """Click a base on minimap

    base_type: 'red' for Player 1 or 'blue' for Player 2
    """
    try:
        import win32gui

        # Detect bases
        bases = detect_bases_on_minimap()
        if not bases:
            print("Error: Could not detect bases")
            sys.exit(1)

        minimap = bases['minimap']

        if base_type.lower() == 'red':
            screen_x = minimap['left'] + bases['red_pos'][0]
            screen_y = minimap['top'] + bases['red_pos'][1]
            base_name = "red base (Player 1)"
        elif base_type.lower() == 'blue':
            screen_x = minimap['left'] + bases['blue_pos'][0]
            screen_y = minimap['top'] + bases['blue_pos'][1]
            base_name = "blue base (Player 2)"
        else:
            print(f"Error: Unknown base type '{base_type}'")
            sys.exit(1)

        print(f"OK: Clicking {base_name}")
        print(f"OK: Screen coordinates: ({screen_x}, {screen_y})")

        # Focus game and click
        focus_game_window()
        time.sleep(0.1)
        mouse.position = (screen_x, screen_y)
        time.sleep(0.05)
        mouse.click(Button.left, 1)

        print(f"OK: Clicked {base_name} at screen ({screen_x}, {screen_y})")

    except Exception as e:
        print(f"Error clicking base: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

def detect_and_click_red_base():
    """Wrapper for clicking red base"""
    click_base_on_minimap('red')

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python camera-controller.py <key> <duration_ms>")
        print("  python camera-controller.py click <x> <y>")
        print("  python camera-controller.py screenshot <output_path>")
        print("  python camera-controller.py click-world <worldX> <worldZ>")
        print("  python camera-controller.py click-world-calibrated <worldX> <worldZ> <redX> <redZ> <blueX> <blueZ>")
        print("  python camera-controller.py click-red-base")
        print("  python camera-controller.py click-blue-base")
        print()
        print("Examples:")
        print("  python camera-controller.py w 2000")
        print("  python camera-controller.py click 500 300")
        print("  python camera-controller.py screenshot game.png")
        print("  python camera-controller.py click-world 175 175")
        print("  python camera-controller.py click-world-calibrated 175 175 220 230 90 90")
        print("  python camera-controller.py click-red-base")
        sys.exit(1)

    command = sys.argv[1].lower()

    if command == 'click':
        if len(sys.argv) < 4:
            print("Error: click requires <x> <y> coordinates")
            sys.exit(1)
        try:
            x = int(sys.argv[2])
            y = int(sys.argv[3])
            click_at(x, y)
        except ValueError:
            print(f"Error: Invalid coordinates '{sys.argv[2]}' '{sys.argv[3]}'")
            sys.exit(1)

    elif command == 'screenshot':
        if len(sys.argv) < 3:
            print("Error: screenshot requires output path")
            sys.exit(1)
        output_path = sys.argv[2]
        take_screenshot(output_path)

    elif command == 'calibrate-minimap':
        calibrate_minimap()

    elif command == 'click-red-base':
        detect_and_click_red_base()

    elif command == 'click-blue-base':
        click_base_on_minimap('blue')

    elif command == 'click-base':
        if len(sys.argv) < 3:
            print("Error: click-base requires base type (red or blue)")
            sys.exit(1)
        click_base_on_minimap(sys.argv[2])

    elif command == 'click-world':
        if len(sys.argv) < 4:
            print("Error: click-world requires world X and Z coordinates")
            sys.exit(1)
        try:
            world_x = int(sys.argv[2])
            world_z = int(sys.argv[3])
            click_at_minimap_coordinates(world_x, world_z)
        except ValueError:
            print("Error: Invalid world coordinates (must be integers)")
            sys.exit(1)

    elif command == 'click-world-calibrated':
        if len(sys.argv) < 8:
            print("Error: click-world-calibrated requires <worldX> <worldZ> <redWorldX> <redWorldZ> <blueWorldX> <blueWorldZ>")
            sys.exit(1)
        try:
            world_x = int(sys.argv[2])
            world_z = int(sys.argv[3])
            red_world_x = int(sys.argv[4])
            red_world_z = int(sys.argv[5])
            blue_world_x = int(sys.argv[6])
            blue_world_z = int(sys.argv[7])
            print(f"OK: Using calibration - Red base: ({red_world_x}, {red_world_z}), Blue base: ({blue_world_x}, {blue_world_z})")
            click_at_minimap_coordinates(world_x, world_z, red_world_x, red_world_z, blue_world_x, blue_world_z)
        except ValueError:
            print("Error: Invalid coordinates (must be integers)")
            sys.exit(1)

    else:
        # Assume it's a key press
        if len(sys.argv) < 3:
            print("Error: key press requires duration_ms")
            sys.exit(1)
        try:
            duration = int(sys.argv[2])
        except ValueError:
            print(f"Error: Invalid duration '{sys.argv[2]}'")
            sys.exit(1)
        send_key(command, duration)
