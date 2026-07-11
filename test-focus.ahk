#Requires AutoHotkey v2.0

; Test if game window can be found and focused

gameWindow := WinExist("0 A.D")
if (gameWindow = 0) {
    gameWindow := WinExist("pyrogenesis")
}

if (gameWindow != 0) {
    MsgBox("Game window found: " . gameWindow)
    WinActivate("ahk_id " . gameWindow)
    Sleep(500)
    MsgBox("Game window activated. Check if it's in focus now.")
} else {
    MsgBox("Game window NOT found!`nTried: '0 A.D' and 'pyrogenesis'")
}
