#Requires AutoHotkey v2.0

; Simple test: send underscore using Send (requires focus)

gameWindow := WinExist("0 A.D")
if (gameWindow = 0) {
    gameWindow := WinExist("pyrogenesis")
}

if (gameWindow != 0) {
    prevWindow := WinGetID("A")

    ; Focus game
    WinActivate("ahk_id " . gameWindow)
    Sleep(200)

    ; Send minus/dash 3 times
    loop 3 {
        WinActivate("ahk_id " . gameWindow)
        Sleep(50)
        ; Try sending as raw text
        ControlSend("{-}", , "ahk_id " . gameWindow)
        Sleep(300)
    }

    Sleep(200)

    ; Restore focus
    if (WinExist("ahk_id " . prevWindow)) {
        WinActivate("ahk_id " . prevWindow)
    }
}
