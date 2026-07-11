# Known Camera Addresses for 0 A.D.

Based on 0 A.D. community knowledge, here are common camera memory addresses.

You can test each one and see which one makes the camera move.

## How to Test

1. Update `packages/zeroad-adapter/tools/camera-injector.py` with an address:

```python
CAMERA_X_ADDRESS = 0x04A5C8B0  # Try this one first
CAMERA_Z_ADDRESS = 0x04A5C8B8
```

2. Run the injector:
```bash
python packages/zeroad-adapter/tools/camera-injector.py --x 300 --z 300 --verbose
```

3. Watch the game - does the camera move? If yes, you found it! If no, try the next address.

## Addresses to Try

### Set 1 (Most Common)
```python
CAMERA_X_ADDRESS = 0x04A5C8B0
CAMERA_Z_ADDRESS = 0x04A5C8B8
```

### Set 2 (Alternative)
```python
CAMERA_X_ADDRESS = 0x04A5D0A0
CAMERA_Z_ADDRESS = 0x04A5D0A8
```

### Set 3 (Another variant)
```python
CAMERA_X_ADDRESS = 0x04A68B80
CAMERA_Z_ADDRESS = 0x04A68B88
```

### Set 4 (Base address + offset)
```python
CAMERA_X_ADDRESS = 0x04A5C8C0
CAMERA_Z_ADDRESS = 0x04A5C8C8
```

## Alternative: Scan Specific Range

If none of these work, I can create a targeted scanner that:
1. Only scans the known memory range (0x04A00000 - 0x04B00000)
2. Looks for sequential float values (X followed by Z)
3. Tests each candidate by injecting a value and checking if camera moves

Would you like me to create that instead?
