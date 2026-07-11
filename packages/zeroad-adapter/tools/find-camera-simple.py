#!/usr/bin/env python3
"""
Simple and Fast Camera Address Finder for 0 A.D.

Uses a more efficient scanning approach that's much faster.
"""

import pymem
import struct
import time
import sys
import io

# Fix encoding for Windows console
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

class SimpleCameraFinder:
    def __init__(self):
        self.pm = None
        self.base_address = None

    def find_process(self):
        """Find and attach to pyrogenesis.exe"""
        print("Looking for pyrogenesis.exe...")
        try:
            self.pm = pymem.Pymem("pyrogenesis.exe")
            print(f"✓ Attached (PID: {self.pm.process_id})")
            return True
        except Exception as e:
            print(f"✗ Error: {e}")
            return False

    def float_to_bytes(self, value):
        """Convert float to bytes"""
        return struct.pack('<f', value)

    def bytes_to_float(self, data):
        """Convert bytes to float"""
        return struct.unpack('<f', data)[0]

    def scan_for_float(self, target_float, max_results=100):
        """Scan memory for a specific float value"""
        print(f"\nScanning for float value: {target_float:.2f}")
        print("This may take 15-30 seconds...")

        target_bytes = self.float_to_bytes(target_float)
        results = []

        try:
            # Use pymem's built-in search which is faster
            print("Searching...")

            # Get the process handle
            h_process = self.pm.process_handle

            # Scan common memory regions
            # Start from typical game data addresses
            scan_start = 0x140000000  # Common for 64-bit apps
            scan_end = 0x140FFFFFF  # Scan about 16MB

            current = scan_start
            checked = 0

            while current < scan_end and len(results) < max_results:
                try:
                    # Read 4 bytes (size of float)
                    data = self.pm.read_bytes(current, 4)
                    if len(data) == 4:
                        try:
                            value = self.bytes_to_float(data)
                            # Check if close to target (within 1.0 unit for floating point tolerance)
                            if abs(value - target_float) < 1.0:
                                results.append(current)
                                print(f"  Found at {hex(current)}: {value:.2f}")
                        except:
                            pass
                except:
                    pass

                current += 4
                checked += 1

                if checked % 100000 == 0:
                    print(f"  Checked {checked} addresses, found {len(results)}")
                    if len(results) > 0:
                        print(f"  (continuing...)")

                # Timeout after reasonable time
                if checked > 1000000:
                    print(f"  Checked 1M addresses, stopping")
                    break

            print(f"\nFound {len(results)} matches")
            return results

        except Exception as e:
            print(f"Scan error: {e}")
            import traceback
            traceback.print_exc()
            return []

    def watch_for_changes(self, addresses, duration=5):
        """Watch which addresses change when camera moves"""
        if not addresses:
            print("No addresses to watch")
            return []

        print(f"\nWatching {len(addresses)} addresses for changes...")
        print(f"Move your camera in the game for {duration} seconds!")

        initial_values = {}

        # Record initial values
        for addr in addresses[:50]:  # Watch first 50
            try:
                initial_values[addr] = self.pm.read_bytes(addr, 4)
            except:
                pass

        print(f"Recorded {len(initial_values)} initial values")
        print("Moving camera now...")

        # Wait while user moves camera
        time.sleep(duration)

        # Check which changed
        changed = []
        for addr, initial in initial_values.items():
            try:
                current = self.pm.read_bytes(addr, 4)
                if current != initial:
                    changed.append(addr)
                    try:
                        init_val = self.bytes_to_float(initial)
                        curr_val = self.bytes_to_float(current)
                        print(f"  ✓ Changed at {hex(addr)}: {init_val:.2f} -> {curr_val:.2f}")
                    except:
                        pass
            except:
                pass

        return changed

    def run(self):
        """Main execution"""
        print("=" * 60)
        print("  Simple Camera Address Finder")
        print("=" * 60)

        if not self.find_process():
            print("Could not find pyrogenesis.exe")
            return

        # Get camera position
        print("\nEnter camera position (use 128, 128 if unsure):")
        try:
            x = float(input("X (default 128): ") or "128")
            z = float(input("Z (default 128): ") or "128")
        except:
            x, z = 128.0, 128.0

        # Scan for X coordinate
        x_results = self.scan_for_float(x, max_results=50)

        if not x_results:
            print("No matches found. Try different coordinates.")
            return

        # Watch for changes
        print(f"\nFound {len(x_results)} X coordinate matches")
        changed = self.watch_for_changes(x_results[:20], duration=10)

        if changed:
            camera_addr = changed[0]
            print(f"\n{'=' * 60}")
            print(f"✓ Camera X Address: {hex(camera_addr)}")
            print(f"✓ Camera Z Address: {hex(camera_addr + 8)}")
            print(f"{'=' * 60}")

            print("\nUpdate your camera-injector.py:")
            print(f"  CAMERA_X_ADDRESS = {hex(camera_addr)}")
            print(f"  CAMERA_Z_ADDRESS = {hex(camera_addr + 8)}")
        else:
            print("No changes detected. Camera might be at a different address.")
            print("Try moving the camera more dramatically next time.")

if __name__ == '__main__':
    finder = SimpleCameraFinder()
    finder.run()
