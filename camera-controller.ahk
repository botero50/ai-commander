#Requires AutoHotkey v2.0

; AutoHotkey v2 Camera Controller for 0 A.D.
; Sends keyboard input WITHOUT stealing focus (uses PostMessage)
; Usage: AutoHotkey.exe camera-controller.ahk <key> <duration_ms>
; Examples:
;   AutoHotkey.exe camera-controller.ahk w 2000
;   AutoHotkey.exe camera-controller.ahk a 1500

; Get command line parameters
if (A_Args.Length < 2) {
    MsgBox("Usage:`nAutoHotkey.exe camera-controller.ahk <key> <duration_ms>`n`nExample:`nAutoHotkey.exe camera-controller.ahk w 2000")
    ExitApp()
}

key := StrLower(A_Args[1])
duration := Integer(A_Args[2])

; Validate key
validKeys := ["w", "a", "s", "d", "q", "e", "up", "down", "left", "right", "minus", "plus"]
if (!InArray(validKeys, key)) {
    MsgBox("Invalid key: " . key . "`n`nValid keys: w, a, s, d, q, e, up, down, left, right, minus, plus")
    ExitApp()
}

; Validate duration
if (duration < 100) {
    duration := 100
}

; Key codes for Windows virtual keys (only for regular keys, not zoom)
keyMap := Map(
    "w", 0x57,
    "a", 0x41,
    "s", 0x53,
    "d", 0x44,
    "q", 0x51,
    "e", 0x45,
    "up", 0x26,
    "down", 0x28,
    "left", 0x25,
    "right", 0x27
)

; Only get vkCode if not zoom or wheel
vkCode := (key != "minus" && key != "plus" && key != "wheelup" && key != "wheeldown") ? keyMap[key] : 0

; Find 0 A.D. window
gameWindow := WinExist("0 A.D")
if (gameWindow = 0) {
    gameWindow := WinExist("pyrogenesis")
}

if (gameWindow != 0) {
    ; Store current active window to restore later
    prevWindow := WinGetID("A")

    ; Focus game window
    WinActivate("ahk_id " . gameWindow)
    Sleep(50)

    ; Handle minus/plus (zoom) separately - use keyboard instead of wheel
    if (key = "minus" || key = "plus") {
        ; Send zoom key multiple times
        if (key = "minus") {
            ; Zoom out - send underscore (shift+minus)
            loop 5 {
                ControlSend("{+{minus}}", , "ahk_id " . gameWindow)
                Sleep(150)
            }
        } else if (key = "plus") {
            ; Zoom in - send plus (shift+equals)
            loop 5 {
                ControlSend("{+{=}}", , "ahk_id " . gameWindow)
                Sleep(150)
            }
        }
    } else {
        ; Send regular key using ControlSend
        ControlSend("{" . key . " down}", , "ahk_id " . gameWindow)
        Sleep(duration)
        ControlSend("{" . key . " up}", , "ahk_id " . gameWindow)
    }

    Sleep(10)

    ; Restore previous window focus
    if (WinExist("ahk_id " . prevWindow)) {
        WinActivate("ahk_id " . prevWindow)
    }
} else {
    ; Game window not found
    if (key = "minus" || key = "plus") {
        if (key = "minus") {
            loop 5 {
                Send("{+{minus}}")
                Sleep(150)
            }
        } else {
            loop 5 {
                Send("{+{=}}")
                Sleep(150)
            }
        }
    } else {
        Send("{" . key . " down}")
        Sleep(duration)
        Send("{" . key . " up}")
    }
}

ExitApp()

InArray(arr, val) {
    for item in arr {
        if (item = val)
            return true
    }
    return false
}
