#!/usr/bin/env python3
"""
Automatic Camera Address Finder for 0 A.D.

This script finds the camera position memory address automatically by:
1. Scanning for the initial camera position
2. Moving the camera in-game
3. Watching which memory locations change
4. Confirming the address is the camera

Usage:
    pip install pymem psutil
    python find-camera-address.py
"""

import pymem
import pymem.process
import struct
import time
import subprocess
import sys
from typing import List, Tuple, Optional

class CameraAddressFinder:
    def __init__(self):
        self.pm: Optional[pymem.Pymem] = None
        self.process_id: Optional[int] = None
        self.initial_scan_results: List[int] = []
        self.refined_results: List[int] = []

    def find_process(self) -> bool:
        """Find pyrogenesis.exe process"""
        print("🔍 Looking for pyrogenesis.exe...")
        try:
            # Try to find the process
            for proc in pymem.process.list_available_processes():
                if 'pyrogenesis' in proc.lower():
                    print(f"✓ Found: {proc}")
                    self.pm = pymem.Pymem(proc)
                    self.process_id = self.pm.process_id
                    print(f"✓ Attached to process (PID: {self.process_id})")
                    return True
        except Exception as e:
            print(f"✗ Error finding process: {e}")

        print("✗ pyrogenesis.exe not found!")
        print("  Make sure 0 A.D. is running and you have a game in progress")
        return False

    def float_to_bytes(self, value: float) -> bytes:
        """Convert float to bytes"""
        return struct.pack('f', value)

    def bytes_to_float(self, data: bytes) -> float:
        """Convert bytes to float"""
        return struct.unpack('f', data)[0]

    def scan_initial_position(self, x: float, z: float) -> bool:
        """
        Scan for initial camera position.
        Looking for two floats that match X and Z coordinates.
        """
        print(f"\n📡 Scanning for initial camera position: X={x:.2f}, Z={z:.2f}")
        print("   (This may take 30-60 seconds)")

        try:
            target_x = self.float_to_bytes(x)
            target_z = self.float_to_bytes(z)

            # Scan all readable memory for the X coordinate
            print(f"   Searching for X={x:.2f}...")
            x_addresses = self.pm.search_by_bytes(target_x)
            print(f"   Found {len(x_addresses)} addresses with X={x:.2f}")

            if len(x_addresses) == 0:
                # Try fuzzy search (within 0.5 units)
                print(f"   Exact match not found. Trying fuzzy search...")
                x_addresses = self._fuzzy_search_float(x, tolerance=0.5)
                print(f"   Found {len(x_addresses)} addresses (fuzzy)")

            if len(x_addresses) > 1000:
                print(f"   Too many results ({len(x_addresses)}). Refining...")
                # Check which ones also have Z nearby
                self.refined_results = self._check_z_coordinates(x_addresses, z)
                print(f"   Refined to {len(self.refined_results)} candidates")
            else:
                self.refined_results = x_addresses

            self.initial_scan_results = self.refined_results.copy()
            return len(self.refined_results) > 0

        except Exception as e:
            print(f"✗ Scan error: {e}")
            return False

    def _fuzzy_search_float(self, target: float, tolerance: float = 0.5) -> List[int]:
        """Search for floats within a tolerance range"""
        print(f"   Scanning all memory (may take 60+ seconds)...")
        results = []
        try:
            # This is a brute-force scan of all memory
            # It's slow but works when exact value doesn't match due to floating point precision
            base = 0x400000
            scan_range = 0x10000000  # Scan 256MB

            for addr in range(base, base + scan_range, 4):  # 4 byte steps for floats
                try:
                    value = self.bytes_to_float(self.pm.read_bytes(addr, 4))
                    if abs(value - target) < tolerance:
                        results.append(addr)
                except:
                    pass

                if len(results) % 1000 == 0 and len(results) > 0:
                    print(f"   ... found {len(results)} so far")

                if len(results) > 10000:  # Stop if too many
                    break

        except Exception as e:
            print(f"   Fuzzy search error: {e}")

        return results

    def _check_z_coordinates(self, x_addresses: List[int], z: float, offset_tolerance: int = 100) -> List[int]:
        """Filter X addresses by checking if Z is nearby"""
        candidates = []
        target_z = self.float_to_bytes(z)

        for x_addr in x_addresses:
            # Camera structure likely has X, Y, Z as consecutive floats
            # Check offsets: +4, +8, +12 bytes
            for offset in [4, 8, 12, 16]:
                try:
                    z_data = self.pm.read_bytes(x_addr + offset, 4)
                    z_value = self.bytes_to_float(z_data)
                    if abs(z_value - z) < offset_tolerance:
                        candidates.append((x_addr, offset, z_value))
                except:
                    pass

        return [addr for addr, _, _ in candidates]

    def watch_for_changes(self, duration: int = 10) -> List[int]:
        """
        Watch memory for changes during manual camera movement.
        User should move camera during this time.
        """
        print(f"\n👀 Watching for memory changes ({duration} seconds)...")
        print("   📍 MOVE YOUR CAMERA NOW in the game!")
        print("   (Pan left/right, up/down)")

        if not self.refined_results:
            print("✗ No addresses to watch")
            return []

        changed_addresses = []
        initial_values = {}

        # Record initial values
        for addr in self.refined_results[:100]:  # Limit to first 100
            try:
                initial_values[addr] = self.pm.read_bytes(addr, 4)
            except:
                pass

        # Wait and watch
        print("   Watching...")
        time.sleep(duration)

        # Check which changed
        for addr, initial in initial_values.items():
            try:
                current = self.pm.read_bytes(addr, 4)
                if current != initial:
                    changed_addresses.append(addr)
                    try:
                        initial_val = self.bytes_to_float(initial)
                        current_val = self.bytes_to_float(current)
                        print(f"   ✓ Address {hex(addr)}: {initial_val:.2f} → {current_val:.2f}")
                    except:
                        pass
            except:
                pass

        return changed_addresses

    def verify_camera_address(self, x_addr: int, z_addr: Optional[int] = None) -> bool:
        """
        Verify that these addresses contain camera data.
        Try moving camera and verify the values change appropriately.
        """
        print(f"\n✅ Verifying addresses...")
        print(f"   X Address: {hex(x_addr)}")
        if z_addr:
            print(f"   Z Address: {hex(z_addr)}")

        try:
            # Read current values
            x_val = self.bytes_to_float(self.pm.read_bytes(x_addr, 4))
            print(f"   Current X: {x_val:.2f}")

            if z_addr:
                z_val = self.bytes_to_float(self.pm.read_bytes(z_addr, 4))
                print(f"   Current Z: {z_val:.2f}")

            print("\n   📍 Move camera again in game...")
            time.sleep(3)

            x_val_new = self.bytes_to_float(self.pm.read_bytes(x_addr, 4))
            if z_addr:
                z_val_new = self.bytes_to_float(self.pm.read_bytes(z_addr, 4))

            if x_val != x_val_new:
                print(f"   ✓ X changed: {x_val:.2f} → {x_val_new:.2f}")
                return True
            elif z_addr and z_val != z_val_new:
                print(f"   ✓ Z changed: {z_val:.2f} → {z_val_new:.2f}")
                return True
            else:
                print(f"   ✗ Values didn't change. Wrong address?")
                return False

        except Exception as e:
            print(f"   ✗ Error: {e}")
            return False

    def run(self):
        """Main execution"""
        print("=" * 60)
        print("  📸 Automatic Camera Address Finder for 0 A.D.")
        print("=" * 60)
        print()

        # Step 1: Find process
        if not self.find_process():
            print("\n❌ Could not find pyrogenesis.exe")
            print("   Make sure 0 A.D. is running!")
            return

        # Step 2: Get initial camera position from user
        print("\n📍 What is your current camera position in the game?")
        print("   (You can see this in the game by checking map coordinates)")
        print("   If unsure, use center coordinates: X=128, Z=128")
        try:
            x_input = input("   Camera X coordinate (default 128): ").strip() or "128"
            z_input = input("   Camera Z coordinate (default 128): ").strip() or "128"
            initial_x = float(x_input)
            initial_z = float(z_input)
        except ValueError:
            print("   Using defaults: X=128, Z=128")
            initial_x, initial_z = 128.0, 128.0

        # Step 3: Initial scan
        if not self.scan_initial_position(initial_x, initial_z):
            print("\n❌ Could not find initial camera position in memory")
            print("   The camera address format might be different than expected")
            return

        print(f"\n✓ Found {len(self.refined_results)} candidate addresses")

        # Step 4: Watch for changes
        changed = self.watch_for_changes(duration=10)

        if changed:
            print(f"\n✓ Found {len(changed)} addresses that changed during camera movement")

            # Step 5: Verify the best candidate
            best_addr = changed[0]
            if self.verify_camera_address(best_addr):
                print("\n" + "=" * 60)
                print("✅ CAMERA ADDRESS FOUND!")
                print("=" * 60)
                print(f"\n📸 Camera X Address: {hex(best_addr)}")

                # Try to find Z address (usually +8 bytes offset)
                try:
                    z_addr = best_addr + 8
                    z_val = self.bytes_to_float(self.pm.read_bytes(z_addr, 4))
                    print(f"📸 Camera Z Address: {hex(z_addr)}")
                    print(f"   (Assuming standard offset, verify if Z is at this address)")
                except:
                    pass

                print("\n📝 Update your Python injector script:")
                print(f"   CAMERA_X_ADDRESS = {hex(best_addr)}")
                print(f"   CAMERA_Z_ADDRESS = {hex(best_addr + 8)}")
                print("\nThen run:")
                print("   python camera-injector.py --x 300 --z 300")

                return True

        print("\n⚠️  Could not automatically verify address")
        print("Try manual CheatEngine approach or try again")


if __name__ == '__main__':
    finder = CameraAddressFinder()
    finder.run()
