#!/usr/bin/env python3
"""
Test common camera addresses automatically
Tries each known address and sees which one makes the camera move
"""

import pymem
import struct
import time
import sys
import io

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

class CameraAddressTester:
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

    def float_to_bytes(self, value):
        return struct.pack('<f', value)

    def bytes_to_float(self, data):
        return struct.unpack('<f', data)[0]

    def test_address(self, x_addr, z_addr, test_value=500.0):
        """Test if an address is the camera by injecting a value"""
        print(f"Testing: X={hex(x_addr)}, Z={hex(z_addr)}")

        try:
            # Read initial values
            initial_x = self.bytes_to_float(self.pm.read_bytes(x_addr, 4))
            initial_z = self.bytes_to_float(self.pm.read_bytes(z_addr, 4))
            print(f"  Initial: X={initial_x:.2f}, Z={initial_z:.2f}")

            # Inject test value
            self.pm.write_bytes(x_addr, self.float_to_bytes(test_value), length=4)
            time.sleep(0.5)

            # Read back
            new_x = self.bytes_to_float(self.pm.read_bytes(x_addr, 4))
            print(f"  After inject: X={new_x:.2f}")

            if abs(new_x - test_value) < 0.1:
                print(f"  ✓ Value written successfully!")
                print(f"  📸 If camera moved to {test_value}, this is the correct address!")
                return True
            else:
                print(f"  ✗ Value didn't stick (got {new_x:.2f}, expected {test_value:.2f})")
                return False

        except Exception as e:
            print(f"  ✗ Error: {e}")
            return False

    def run(self):
        print("=" * 60)
        print("  Camera Address Tester")
        print("=" * 60)
        print()

        if not self.find_process():
            return

        # Common addresses to try
        addresses = [
            (0x04A5C8B0, 0x04A5C8B8, "Common #1"),
            (0x04A5D0A0, 0x04A5D0A8, "Common #2"),
            (0x04A68B80, 0x04A68B88, "Common #3"),
            (0x04A5C8C0, 0x04A5C8C8, "Variant #1"),
            (0x04A5C8A8, 0x04A5C8B0, "Offset -8"),
            (0x04A5C8B8, 0x04A5C8C0, "Offset +8"),
        ]

        print("Testing addresses...\n")
        print("Watch your game camera!")
        print("If you see the camera jump to X=500, that's the correct address!\n")

        found = False
        for x_addr, z_addr, label in addresses:
            print(f"{label}:")
            if self.test_address(x_addr, z_addr):
                print()
                print("=" * 60)
                print("✓ FOUND! Update camera-injector.py with:")
                print(f"  CAMERA_X_ADDRESS = {hex(x_addr)}")
                print(f"  CAMERA_Z_ADDRESS = {hex(z_addr)}")
                print("=" * 60)
                found = True
                break
            print()

        if not found:
            print("None of the common addresses worked.")
            print("The camera address might be at a different location.")
            print("\nTry manual CheatEngine search with these steps:")
            print("1. In CheatEngine, attach to pyrogenesis.exe")
            print("2. Manually move camera to a known position (e.g., corner)")
            print("3. Value Type: Float")
            print("4. Scan for that position value")
            print("5. Move camera again, refine")
            print("6. Report the address you find")

if __name__ == '__main__':
    tester = CameraAddressTester()
    tester.run()
