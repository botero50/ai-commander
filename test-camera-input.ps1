# PowerShell script to send camera movement input to 0 A.D.
# This moves the camera by simulating keyboard input

Add-Type @"
using System;
using System.Runtime.InteropServices;

public class Input {
    [DllImport("user32.dll")]
    public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, int dwExtraInfo);
    
    public const int KEYEVENTF_KEYDOWN = 0x0000;
    public const int KEYEVENTF_KEYUP = 0x0002;
    
    public static void PressKey(byte key) {
        keybd_event(key, 0, KEYEVENTF_KEYDOWN, 0);
        System.Threading.Thread.Sleep(50);
        keybd_event(key, 0, KEYEVENTF_KEYUP, 0);
    }
    
    public static void HoldKey(byte key, int duration) {
        keybd_event(key, 0, KEYEVENTF_KEYDOWN, 0);
        System.Threading.Thread.Sleep(duration);
        keybd_event(key, 0, KEYEVENTF_KEYUP, 0);
    }
}
"@

# Focus 0 A.D. window
$process = Get-Process pyrogenesis -ErrorAction SilentlyContinue
if ($process) {
    $hwnd = $process.MainWindowHandle
    [System.Windows.Forms.SendKeys]::SendWait("^%d")  # Alt+Tab to focus
    
    # Test: move camera right by holding W key
    Write-Host "Moving camera up..."
    [Input]::HoldKey([byte][char]'W', 2000)
    
    Write-Host "Done!"
} else {
    Write-Host "0 A.D. not running"
}
