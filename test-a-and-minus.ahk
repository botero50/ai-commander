#Requires AutoHotkey v2.0

; Test: Send A key, then minus key

gameWindow := WinExist("0 A.D")
if (gameWindow = 0) {
    gameWindow := WinExist("pyrogenesis")
}

if (gameWindow != 0) {
    prevWindow := WinGetID("A")

    ; Focus game
    WinActivate("ahk_id " . gameWindow)
    Sleep(100)

    ; Send A (move left)
    ControlSend("{a down}", , "ahk_id " . gameWindow)
    Sleep(500)
    ControlSend("{a up}", , "ahk_id " . gameWindow)

    Sleep(200)

    ; Send minus (zoom out) 3 times
    loop 3 {
        ControlSend("{minus}", , "ahk_id " . gameWindow)
        Sleep(200)
    }

    Sleep(200)

    ; Restore focus
    if (WinExist("ahk_id " . prevWindow)) {
        WinActivate("ahk_id " . prevWindow)
    }
}
