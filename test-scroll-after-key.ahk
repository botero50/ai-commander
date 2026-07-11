#Requires AutoHotkey v2.0

; Test: Send a key, then scroll

gameWindow := WinExist("0 A.D")
if (gameWindow = 0) {
    gameWindow := WinExist("pyrogenesis")
}

if (gameWindow != 0) {
    prevWindow := WinGetID("A")

    ; Focus game
    WinActivate("ahk_id " . gameWindow)
    Sleep(150)

    ; Send 'A' key (move left)
    ControlSend("{a down}", , "ahk_id " . gameWindow)
    Sleep(500)
    ControlSend("{a up}", , "ahk_id " . gameWindow)

    Sleep(100)

    ; Re-focus game and scroll down IMMEDIATELY
    WinActivate("ahk_id " . gameWindow)
    Sleep(50)

    loop 5 {
        WinActivate("ahk_id " . gameWindow)
        Sleep(10)
        Send("{WheelDown}")
        Sleep(150)
    }

    Sleep(200)

    ; Restore focus
    if (WinExist("ahk_id " . prevWindow)) {
        WinActivate("ahk_id " . prevWindow)
    }
} else {
    ; Game not found
}
