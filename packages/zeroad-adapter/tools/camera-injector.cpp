// Camera Memory Injector for 0 A.D.
// Directly modifies camera position in memory during gameplay
// Usage: camera-injector.exe --pid <process_id> --x <x_coord> --z <z_coord> [--zoom <distance>]

#include <windows.h>
#include <iostream>
#include <string>
#include <cstring>
#include <cstdlib>

// Known 0 A.D. camera struct patterns (may need updating for different versions)
// Camera is typically stored as a C++ class with float members
struct CameraData {
    float x;
    float y;
    float z;
    float zoom;
    // ... other fields
};

// Global variables for parsed arguments
DWORD target_pid = 0;
float target_x = 0.0f;
float target_z = 0.0f;
float target_zoom = -1.0f;  // -1 = don't change
bool verbose = false;

void PrintUsage() {
    std::cout << "Camera Memory Injector for 0 A.D.\n";
    std::cout << "Usage: camera-injector.exe --pid <pid> --x <x> --z <z> [--zoom <zoom>] [--verbose]\n";
    std::cout << "Example: camera-injector.exe --pid 5432 --x 500 --z 800 --zoom 150\n";
}

bool ParseArguments(int argc, char* argv[]) {
    for (int i = 1; i < argc; i++) {
        std::string arg = argv[i];

        if (arg == "--pid" && i + 1 < argc) {
            target_pid = std::stoul(argv[++i]);
        }
        else if (arg == "--x" && i + 1 < argc) {
            target_x = std::stof(argv[++i]);
        }
        else if (arg == "--z" && i + 1 < argc) {
            target_z = std::stof(argv[++i]);
        }
        else if (arg == "--zoom" && i + 1 < argc) {
            target_zoom = std::stof(argv[++i]);
        }
        else if (arg == "--verbose") {
            verbose = true;
        }
        else if (arg == "--help" || arg == "-h") {
            PrintUsage();
            return false;
        }
    }

    if (target_pid == 0) {
        std::cerr << "Error: --pid is required\n";
        PrintUsage();
        return false;
    }

    return true;
}

// Scan memory for camera position signature
// This is a pattern scan approach similar to CheatEngine
DWORD_PTR FindCameraAddress(HANDLE process_handle) {
    // This is a simplified approach - in practice you'd need to:
    // 1. Scan for known signatures in pyrogenesis.exe
    // 2. Or use ASLR-safe relative offsets
    // 3. Or hook into known function pointers

    std::cout << "[Camera Injector] Scanning for camera data structure...\n";

    // NOTE: Real implementation would:
    // 1. Enumerate loaded modules
    // 2. Scan executable sections for patterns
    // 3. Use symbol information if available
    // 4. Try multiple offset strategies for different 0 A.D. versions

    // For now, return 0 and show error message
    std::cerr << "[ERROR] Camera address scanning not implemented.\n";
    std::cerr << "[INFO] To find camera address:\n";
    std::cerr << "  1. Use CheatEngine to find camera X coordinate\n";
    std::cerr << "  2. Note the address offset\n";
    std::cerr << "  3. Hardcode or pass as argument to this injector\n";

    return 0;
}

// Alternative: Use known offset (if camera structure is consistent)
bool InjectCameraPositionByOffset(HANDLE process_handle, DWORD_PTR base_address, float x, float z, float zoom = -1.0f) {
    if (base_address == 0) {
        std::cerr << "Invalid base address\n";
        return false;
    }

    if (verbose) {
        std::cout << "[*] Injecting camera position\n";
        std::cout << "    Base address: 0x" << std::hex << base_address << std::dec << "\n";
        std::cout << "    X: " << x << "\n";
        std::cout << "    Z: " << z << "\n";
        if (zoom >= 0) std::cout << "    Zoom: " << zoom << "\n";
    }

    // Write X coordinate (offset 0)
    if (!WriteProcessMemory(process_handle, (LPVOID)(base_address + 0), &x, sizeof(float), NULL)) {
        std::cerr << "Failed to write X coordinate\n";
        return false;
    }

    // Skip Y coordinate (offset 4) - usually not needed for camera

    // Write Z coordinate (offset 8)
    if (!WriteProcessMemory(process_handle, (LPVOID)(base_address + 8), &z, sizeof(float), NULL)) {
        std::cerr << "Failed to write Z coordinate\n";
        return false;
    }

    // Write zoom if specified (offset 12)
    if (zoom >= 0) {
        if (!WriteProcessMemory(process_handle, (LPVOID)(base_address + 12), &zoom, sizeof(float), NULL)) {
            std::cerr << "Failed to write zoom value\n";
            return false;
        }
    }

    if (verbose) {
        std::cout << "[*] Camera position injected successfully\n";
    }

    return true;
}

int main(int argc, char* argv[]) {
    std::cout << "0 A.D. Camera Memory Injector v1.0\n";
    std::cout << "==================================\n\n";

    if (!ParseArguments(argc, argv)) {
        return 1;
    }

    // Open target process
    HANDLE process_handle = OpenProcess(
        PROCESS_VM_READ | PROCESS_VM_WRITE,
        FALSE,
        target_pid
    );

    if (process_handle == NULL) {
        std::cerr << "Error: Could not open process " << target_pid << "\n";
        std::cerr << "  Make sure:\n";
        std::cerr << "  1. Process ID is correct\n";
        std::cerr << "  2. You have administrator privileges\n";
        std::cerr << "  3. The process is still running\n";
        return 1;
    }

    if (verbose) {
        std::cout << "[*] Successfully opened process " << target_pid << "\n";
    }

    // Find camera address in memory
    DWORD_PTR camera_address = FindCameraAddress(process_handle);

    if (camera_address == 0) {
        std::cerr << "\nCannot find camera address in process memory.\n";
        std::cerr << "\nOptions:\n";
        std::cerr << "1. Use CheatEngine to find the address:\n";
        std::cerr << "   - Run 0 A.D.\n";
        std::cerr << "   - Open CheatEngine\n";
        std::cerr << "   - Attach to pyrogenesis.exe\n";
        std::cerr << "   - Scan for current camera X position\n";
        std::cerr << "   - Note the address offset\n";
        std::cerr << "   - Update the offset in this tool\n\n";

        std::cerr << "2. Or provide offset as command-line argument (future enhancement)\n";

        CloseHandle(process_handle);
        return 1;
    }

    // Inject camera position
    bool success = InjectCameraPositionByOffset(process_handle, camera_address, target_x, target_z, target_zoom);

    CloseHandle(process_handle);

    return success ? 0 : 1;
}
