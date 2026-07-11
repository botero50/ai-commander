# Direct camera test for 0 A.D.
# Run this while the game is playing to test keyboard input

Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Threading;

public class CameraControl {
    [DllImport("user32.dll")]
    public static extern IntPtr FindWindow(string lpClassName, string lpWindowName);

    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, int dwExtraInfo);

    [DllImport("user32.dll")]
    public static extern uint SendInput(uint nInputs, INPUT[] pInputs, int cbSize);

    [StructLayout(LayoutKind.Sequential)]
    public struct INPUT {
        public uint type;
        public INPUTUNION u;
    }

    [StructLayout(LayoutKind.Explicit)]
    public struct INPUTUNION {
        [FieldOffset(0)]
        public MOUSEINPUT mi;
        [FieldOffset(0)]
        public KEYBDINPUT ki;
        [FieldOffset(0)]
        public HARDWAREINPUT hi;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct KEYBDINPUT {
        public ushort wVk;
        public ushort wScan;
        public uint dwFlags;
        public uint time;
        public IntPtr dwExtraInfo;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct MOUSEINPUT {
        public int dx;
        public int dy;
        public uint mouseData;
        public uint dwFlags;
        public uint time;
        public IntPtr dwExtraInfo;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct HARDWAREINPUT {
        public uint uMsg;
        public ushort wParamL;
        public ushort wParamH;
    }

    public const byte VK_W = 0x57;  // Up
    public const byte VK_A = 0x41;  // Left
    public const byte VK_S = 0x53;  // Down
    public const byte VK_D = 0x44;  // Right
    public const byte VK_Q = 0x51;  // Zoom out
    public const byte VK_E = 0x45;  // Zoom in

    const uint INPUT_KEYBOARD = 1;
    const uint KEYEVENTF_KEYDOWN = 0;
    const uint KEYEVENTF_KEYUP = 2;

    public static void SendKey(byte key, int duration) {
        // Try to focus window first
        IntPtr hwnd = FindWindow(null, "0 A.D.");
        if (hwnd != IntPtr.Zero) {
            SetForegroundWindow(hwnd);
            Thread.Sleep(100);
        }

        // Use SendInput instead of keybd_event (more reliable)
        INPUT[] inputs = new INPUT[2];

        // Key down
        inputs[0].type = INPUT_KEYBOARD;
        inputs[0].u.ki.wVk = key;
        inputs[0].u.ki.dwFlags = KEYEVENTF_KEYDOWN;

        // Key up
        inputs[1].type = INPUT_KEYBOARD;
        inputs[1].u.ki.wVk = key;
        inputs[1].u.ki.dwFlags = KEYEVENTF_KEYUP;

        // Send key down
        SendInput(1, new INPUT[] { inputs[0] }, Marshal.SizeOf(typeof(INPUT)));
        Thread.Sleep(duration);
        // Send key up
        SendInput(1, new INPUT[] { inputs[1] }, Marshal.SizeOf(typeof(INPUT)));
    }
}
"@

Write-Host "🎮 Camera Control Test"
Write-Host "Make sure 0 A.D. game window is visible (doesn't need focus)"
Write-Host ""

# Test 1: Move UP (W key)
Write-Host "1. Pressing W (move camera UP) for 2 seconds..."
[CameraControl]::SendKey([CameraControl]::VK_W, 2000)
Write-Host "Released W"
Start-Sleep -Milliseconds 500

# Test 2: Move DOWN (S key)
Write-Host "2. Pressing S (move camera DOWN) for 2 seconds..."
[CameraControl]::SendKey([CameraControl]::VK_S, 2000)
Write-Host "Released S"
Start-Sleep -Milliseconds 500

# Test 3: Move LEFT (A key)
Write-Host "3. Pressing A (move camera LEFT) for 2 seconds..."
[CameraControl]::SendKey([CameraControl]::VK_A, 2000)
Write-Host "Released A"
Start-Sleep -Milliseconds 500

# Test 4: Move RIGHT (D key)
Write-Host "4. Pressing D (move camera RIGHT) for 2 seconds..."
[CameraControl]::SendKey([CameraControl]::VK_D, 2000)
Write-Host "Released D"
Start-Sleep -Milliseconds 500

# Test 5: Zoom OUT (Q key)
Write-Host "5. Pressing Q (zoom OUT) for 1 second..."
[CameraControl]::SendKey([CameraControl]::VK_Q, 1000)
Write-Host "Released Q"
Start-Sleep -Milliseconds 500

# Test 6: Zoom IN (E key)
Write-Host "6. Pressing E (zoom IN) for 1 second..."
[CameraControl]::SendKey([CameraControl]::VK_E, 1000)
Write-Host "Released E"

Write-Host ""
Write-Host "All tests complete!"
Write-Host "Did the camera move? If yes, the keyboard input is working."
