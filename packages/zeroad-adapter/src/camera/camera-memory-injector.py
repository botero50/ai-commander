#!/usr/bin/env python3
"""
Camera Memory Injector for 0 A.D.

Injects camera position (X, Y, Z) and zoom directly into 0 A.D.'s memory.
Works similarly to Cheat Engine by finding and writing to memory addresses.

Requires: pymem (pip install pymem)
"""

import sys
import time
import struct
import logging
from typing import Optional, Tuple
from ctypes import c_float

try:
    import pymem
except ImportError:
    print("ERROR: pymem not installed. Install with: pip install pymem")
    sys.exit(1)

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('CameraInjector')


class CameraMemoryInjector:
    """Injects camera position and zoom into 0 A.D. memory"""

    # Known camera position addresses (from Cheat Engine)
    # ⚠️ WARNING: These addresses are specific to current game session
    # They may change each time you start 0 A.D.
    # Use pointer-based addressing for permanent solution
    CAMERA_ADDRESSES = {
        'x_position': 0x21FEB86F73C,   # X position address (FOUND)
        'y_position': 0x1BFE8EAD6CC,   # Y position address (FOUND)
        'z_position': None,             # TODO: Find Z position address
        'zoom': None,                   # TODO: Find zoom address
    }

    def __init__(self, process_name: str = 'pyrogenesis.exe'):
        """Initialize the memory injector"""
        self.process_name = process_name
        self.pm: Optional[pymem.Pymem] = None
        self.base_address = None

    def connect(self) -> bool:
        """Connect to the 0 A.D. process"""
        try:
            logger.info(f"Connecting to {self.process_name}...")
            self.pm = pymem.Pymem(self.process_name)
            logger.info(f"Successfully connected to {self.process_name}")
            logger.info(f"Process ID: {self.pm.process_handle}")
            return True
        except pymem.exception.ProcessNotFound:
            logger.error(f"Process '{self.process_name}' not found. Is 0 A.D. running?")
            return False
        except Exception as e:
            logger.error(f"Failed to connect: {e}")
            return False

    def disconnect(self):
        """Disconnect from the process"""
        if self.pm:
            try:
                self.pm.close()
                logger.info("Disconnected from process")
            except Exception as e:
                logger.warning(f"Error disconnecting: {e}")

    def read_float(self, address: int) -> Optional[float]:
        """Read a float value from memory"""
        try:
            data = self.pm.read_bytes(address, 4)
            return struct.unpack('f', data)[0]
        except Exception as e:
            logger.error(f"Error reading float from {hex(address)}: {e}")
            return None

    def write_float(self, address: int, value: float) -> bool:
        """Write a float value to memory"""
        try:
            data = struct.pack('f', value)
            self.pm.write_bytes(address, data, len(data))
            logger.info(f"Wrote {value} to {hex(address)}")
            return True
        except Exception as e:
            logger.error(f"Error writing to {hex(address)}: {e}")
            return False

    def set_camera_position(self, x: float, y: float, z: float = None, zoom: float = None) -> bool:
        """
        Set camera position

        Args:
            x: X position
            y: Y position (or could be Z in some versions)
            z: Z position (optional)
            zoom: Camera zoom level (optional)

        Returns:
            True if successful, False otherwise
        """
        if not self.pm:
            logger.error("Not connected to process. Call connect() first.")
            return False

        success = True

        # Write X position
        if self.CAMERA_ADDRESSES['x_position']:
            logger.info(f"Setting X position to {x}")
            if not self.write_float(self.CAMERA_ADDRESSES['x_position'], x):
                success = False

        # Write Y position
        if self.CAMERA_ADDRESSES['y_position']:
            logger.info(f"Setting Y position to {y}")
            if not self.write_float(self.CAMERA_ADDRESSES['y_position'], y):
                success = False

        # Write Z position
        if z is not None and self.CAMERA_ADDRESSES['z_position']:
            logger.info(f"Setting Z position to {z}")
            if not self.write_float(self.CAMERA_ADDRESSES['z_position'], z):
                success = False

        # Write zoom
        if zoom is not None and self.CAMERA_ADDRESSES['zoom']:
            logger.info(f"Setting zoom to {zoom}")
            if not self.write_float(self.CAMERA_ADDRESSES['zoom'], zoom):
                success = False

        return success

    def get_camera_position(self) -> Optional[Tuple[float, float, float, float]]:
        """
        Read current camera position from memory

        Returns:
            Tuple of (x, y, z, zoom) or None if error
        """
        if not self.pm:
            logger.error("Not connected to process. Call connect() first.")
            return None

        x = y = z = zoom = None

        if self.CAMERA_ADDRESSES['x_position']:
            x = self.read_float(self.CAMERA_ADDRESSES['x_position'])
            if x is not None:
                logger.info(f"Current X: {x}")

        if self.CAMERA_ADDRESSES['y_position']:
            y = self.read_float(self.CAMERA_ADDRESSES['y_position'])
            if y is not None:
                logger.info(f"Current Y: {y}")

        if self.CAMERA_ADDRESSES['z_position']:
            z = self.read_float(self.CAMERA_ADDRESSES['z_position'])
            if z is not None:
                logger.info(f"Current Z: {z}")

        if self.CAMERA_ADDRESSES['zoom']:
            zoom = self.read_float(self.CAMERA_ADDRESSES['zoom'])
            if zoom is not None:
                logger.info(f"Current Zoom: {zoom}")

        return (x, y, z, zoom)

    def find_address_pattern(self, pattern: bytes, mask: str) -> Optional[int]:
        """
        Find an address by pattern matching in memory

        Args:
            pattern: Bytes to search for
            mask: Mask for pattern (e.g., 'xx?x' where ? is wildcard)

        Returns:
            Address if found, None otherwise
        """
        if not self.pm:
            logger.error("Not connected to process")
            return None

        try:
            logger.info(f"Searching for pattern: {pattern.hex()}")
            # This is a simplified version - full implementation would scan all memory
            # For now, we'll need to manually find addresses with Cheat Engine
            logger.warning("Pattern matching not fully implemented. Use Cheat Engine to find addresses.")
            return None
        except Exception as e:
            logger.error(f"Error in pattern search: {e}")
            return None

    def scan_for_camera_addresses(self, initial_x: float = 100.0) -> dict:
        """
        Scan memory for camera address patterns

        This is a helper to find addresses by scanning for specific float values.
        Start with a known camera position, then search memory for that float.

        Args:
            initial_x: Expected X position to search for

        Returns:
            Dictionary of found addresses
        """
        if not self.pm:
            logger.error("Not connected to process")
            return {}

        logger.info("Camera address scanning requires Cheat Engine for now.")
        logger.info("Steps to find addresses:")
        logger.info("1. Open Cheat Engine")
        logger.info("2. Attach to pyrogenesis.exe")
        logger.info("3. Note the camera X position in-game")
        logger.info("4. Search for that value (as float) in Cheat Engine")
        logger.info("5. Record the address")
        logger.info("6. Update CAMERA_ADDRESSES in this script")

        return {}


def main():
    """Main function with command-line argument support"""
    import argparse

    parser = argparse.ArgumentParser(
        description='Camera Memory Injector for 0 A.D.'
    )
    parser.add_argument('--x', type=float, help='X position to set')
    parser.add_argument('--y', type=float, help='Y position to set')
    parser.add_argument('--z', type=float, help='Z position to set')
    parser.add_argument('--zoom', type=float, help='Zoom level to set')
    parser.add_argument('--read', action='store_true', help='Read current camera position')
    parser.add_argument('--verify', action='store_true', help='Verify after setting values')
    parser.add_argument('--process', default='pyrogenesis.exe', help='Process name (default: pyrogenesis.exe)')

    args = parser.parse_args()

    injector = CameraMemoryInjector(process_name=args.process)

    try:
        # Connect to process
        if not injector.connect():
            logger.error(f"Failed to connect to {args.process}")
            return False

        # Read current position if requested
        if args.read or (not args.x and not args.y and not args.z and not args.zoom):
            logger.info("\n=== Current Camera Position ===")
            position = injector.get_camera_position()
            if position:
                x, y, z, zoom = position
                logger.info(f"X: {x}, Y: {y}, Z: {z}, Zoom: {zoom}")

        # Set new position if arguments provided
        if args.x is not None or args.y is not None or args.z is not None or args.zoom is not None:
            logger.info("\n=== Setting Camera Position ===")
            success = injector.set_camera_position(
                x=args.x or 0.0,
                y=args.y or 0.0,
                z=args.z,
                zoom=args.zoom
            )

            if not success:
                logger.error("Failed to set camera position")
                return False

            # Verify if requested
            if args.verify:
                time.sleep(0.5)
                logger.info("\n=== Verifying Position ===")
                injector.get_camera_position()

        return True

    except KeyboardInterrupt:
        logger.info("Interrupted by user")
        return True
    except Exception as e:
        logger.error(f"Error: {e}")
        return False
    finally:
        injector.disconnect()


if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
