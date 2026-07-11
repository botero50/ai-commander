#!/usr/bin/env python3
"""
Find the base address of pyrogenesis.exe
This helps us locate where camera data might be stored
"""

import pymem
import sys
import io

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

class BaseAddressFinder:
    def __init__(self):
        self.pm = None

    def find_process(self):
        print("Looking for pyrogenesis.exe...")
        try:
            self.pm = pymem.Pymem("pyrogenesis.exe")
            print(f"✓ Attached (PID: {self.pm.process_id})\n")
            return True
        except Exception as e:
            print(f"✗ Error: {e}")
            return False

    def get_base_address(self):
        """Get the base address of the main module"""
        try:
            # Get main module
            main_module = None
            for module in self.pm.list_modules():
                if 'pyrogenesis' in module.name.lower():
                    main_module = module
                    break

            if main_module:
                print(f"Main Module: {main_module.name}")
                print(f"Base Address: {hex(main_module.lpBaseOfDll)}")
                print(f"Size: {hex(main_module.SizeOfImage)} bytes\n")
                return main_module.lpBaseOfDll
            else:
                print("Could not find main module")
                return None

        except Exception as e:
            print(f"Error: {e}")
            return False

    def scan_for_patterns(self, base_addr):
        """Scan for camera-like data patterns"""
        print("Scanning for camera-like patterns...")
        print("Looking for 4 consecutive floats (X, Y, Z, Distance/Zoom)\n")

        # This is a simplified scan
        # In reality, we need to look for float patterns that make sense for camera

        try:
            # Try reading from different offsets within the module
            for offset in [0x100000, 0x200000, 0x300000, 0x400000, 0x500000]:
                addr = base_addr + offset
                try:
                    data = self.pm.read_bytes(addr, 16)  # Read 4 floats
                    import struct
                    floats = struct.unpack('<4f', data)
                    # Check if these look like camera coordinates
                    # Camera is usually in range 0-1000 for both X and Z
                    if all(0 < f < 1000 for f in floats[:3]):
                        print(f"Potential camera data at {hex(addr)}:")
                        print(f"  Values: {[f'{f:.2f}' for f in floats]}")
                except:
                    pass

        except Exception as e:
            print(f"Scan error: {e}")

    def run(self):
        print("=" * 60)
        print("  Find pyrogenesis.exe Base Address")
        print("=" * 60)
        print()

        if not self.find_process():
            return

        base = self.get_base_address()

        if base:
            print("Information for manual CheatEngine search:")
            print(f"- Attach to pyrogenesis.exe")
            print(f"- Manually move camera to specific position (e.g., 100,100)")
            print(f"- In CheatEngine: Value Type = Float")
            print(f"- Search for that value")
            print(f"- Move camera again, refine results")
            print(f"\nNote: 0 A.D. uses dynamic addresses, so addresses change")
            print(f"between game restarts. You may need to use pointer chains")
            print(f"or AOB (Array of Bytes) scanning in CheatEngine.")

if __name__ == '__main__':
    finder = BaseAddressFinder()
    finder.run()
