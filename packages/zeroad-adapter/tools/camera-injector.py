#!/usr/bin/env python3
"""
Camera Memory Injector for 0 A.D.

Directly modifies camera position in pyrogenesis.exe memory.
Works like CheatEngine but automated.

Requirements:
    pip install pymem

Usage:
    python camera-injector.py --x 400 --z 800 [--zoom 150] [--pid <pid>] [--verbose]

Example:
    python camera-injector.py --x 500 --z 600 --verbose
"""

import sys
import argparse
import struct
from typing import Optional, Tuple

try:
    import pymem
    import pymem.process
except ImportError:
    print("Error: pymem not installed")
    print("Install with: pip install pymem")
    sys.exit(1)


class CameraInjector:
    """Injects camera position into 0 A.D. process memory"""

    def __init__(self, verbose: bool = False):
        self.verbose = verbose
        self.pm: Optional[pymem.Pymem] = None
        self.camera_address: Optional[int] = None

    def log(self, message: str):
        """Print log message"""
        if self.verbose or True:  # Always log for now
            print(f"[Camera] {message}")

    def find_process(self) -> Optional[int]:
        """Find pyrogenesis.exe process ID"""
        try:
            import psutil

            for proc in psutil.process_iter(['pid', 'name']):
                try:
                    if 'pyrogenesis' in proc.info['name'].lower():
                        pid = proc.info['pid']
                        self.log(f"Found pyrogenesis.exe (PID: {pid})")
                        return pid
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    pass

            self.log("ERROR: pyrogenesis.exe not found")
            return None
        except ImportError:
            self.log("psutil not installed, cannot auto-find process")
            self.log("Usage: python camera-injector.py --pid <pid> --x <x> --z <z>")
            return None

    def attach(self, pid: Optional[int] = None) -> bool:
        """Attach to pyrogenesis process"""
        try:
            if pid is None:
                pid = self.find_process()
                if pid is None:
                    return False

            self.pm = pymem.Pymem(int(pid))
            self.log(f"Attached to process {pid}")
            return True
        except Exception as e:
            self.log(f"ERROR: Failed to attach: {e}")
            return False

    def find_camera_address(self) -> bool:
        """
        Find camera address in memory.

        This is the tricky part - we need to scan for a known pattern.
        For now, returns False to indicate manual setup needed.

        In practice:
        1. Use CheatEngine to find the address
        2. Set CAMERA_ADDRESS constant below
        3. Or pass as command-line argument
        """
        if self.pm is None:
            self.log("Process not attached")
            return False

        # Known offsets (these need to be found using CheatEngine)
        # Example: camera at base + 0xA5C8B0
        CAMERA_ADDRESS = 0x0  # Set this using CheatEngine results

        if CAMERA_ADDRESS == 0:
            self.log("ERROR: Camera address not configured")
            self.log("")
            self.log("To find camera address:")
            self.log("1. Open CheatEngine")
            self.log("2. Attach to pyrogenesis.exe")
            self.log("3. Scan for current camera X coordinate (as Float)")
            self.log("4. Filter by changing value in game")
            self.log("5. Note the address (e.g., 0x123ABC00)")
            self.log("6. Edit this file and set CAMERA_ADDRESS")
            self.log("")
            return False

        self.camera_address = CAMERA_ADDRESS
        self.log(f"Camera address: 0x{CAMERA_ADDRESS:X}")
        return True

    def set_position(self, x: float, z: float, zoom: Optional[float] = None) -> bool:
        """
        Write camera position to memory

        Camera struct layout (typical):
        - Offset +0: float X
        - Offset +4: float Y (usually skipped)
        - Offset +8: float Z
        - Offset +12: float zoom (optional)
        """
        if self.pm is None:
            self.log("Process not attached")
            return False

        if self.camera_address is None:
            self.log("Camera address not found")
            return False

        try:
            # Write X coordinate
            self.pm.write_float(self.camera_address + 0, x)
            self.log(f"Wrote X: {x}")

            # Write Z coordinate
            self.pm.write_float(self.camera_address + 8, z)
            self.log(f"Wrote Z: {z}")

            # Write zoom if specified
            if zoom is not None and zoom > 0:
                self.pm.write_float(self.camera_address + 12, zoom)
                self.log(f"Wrote Zoom: {zoom}")

            self.log(f"✓ Camera position updated: ({x}, {z})")
            return True
        except Exception as e:
            self.log(f"ERROR: Failed to write position: {e}")
            return False

    def close(self):
        """Close process handle"""
        if self.pm:
            self.pm.close()


def main():
    parser = argparse.ArgumentParser(
        description="0 A.D. Camera Memory Injector"
    )
    parser.add_argument('--x', type=float, required=True, help='Camera X coordinate')
    parser.add_argument('--z', type=float, required=True, help='Camera Z coordinate')
    parser.add_argument('--zoom', type=float, help='Camera zoom distance (optional)')
    parser.add_argument('--pid', type=int, help='Process ID (auto-find if not specified)')
    parser.add_argument('--verbose', action='store_true', help='Verbose output')

    args = parser.parse_args()

    injector = CameraInjector(verbose=args.verbose)

    # Attach to process
    if not injector.attach(args.pid):
        sys.exit(1)

    # Find camera address
    if not injector.find_camera_address():
        sys.exit(1)

    # Inject position
    if not injector.set_position(args.x, args.z, args.zoom):
        sys.exit(1)

    injector.close()
    print("\n✓ Camera injection complete")


if __name__ == '__main__':
    main()
