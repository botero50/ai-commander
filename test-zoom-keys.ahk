#Requires AutoHotkey v2.0

; Test different zoom keys

gameWindow := WinExist("0 A.D")
if (gameWindow = 0) {
    gameWindow := WinExist("pyrogenesis")
}

if (gameWindow != 0) {
    prevWindow := WinGetID("A")

    ; Focus game
    WinActivate("ahk_id " . gameWindow)
    Sleep(200)

    ; Test 1: Try minus key
    ToolTip("Testing MINUS key...")
    loop 3 {
        ControlSend("{-}", , "ahk_id " . gameWindow)
        Sleep(300)
    }

    Sleep(500)
    ToolTip("")

    ; Restore focus
    if (WinExist("ahk_id " . prevWindow)) {
        WinActivate("ahk_id " . prevWindow)
    }
}
