# Committee: Show the signage

The screen that puts each stall's sales and queue status, plus a video, on the displays around school. You show it by opening a URL in a browser.

::: tip The app is in Japanese
There is no English UI. Japanese labels are quoted below exactly as they appear on screen, with a translation next to them.
:::

## Getting ready

1. Ask an admin to issue a **viewing URL**, from the サイネージ (Signage) tab of the admin screen.
2. Open that URL in the display device's browser.
   - Opening it saves the sign-in to the device.
   - It lasts about 30 days, so you can set the displays up the day before
   - Guest mode does not display properly.
   - A private window does not save it, and neither does clearing browser data — you have to start over
3. Put the browser into full screen. On a Google Chromebook there is a key for it in the top row.

### When you set the display up

- Disable sleep, screen off, and the screensaver
- Keep the device plugged in
- Turn off notifications and pop-ups
- On a device meant to play sound, tap `音声を有効にする` (enable sound) once, at the bottom right of the video.

Reloading the page turns the video sound **back off.**

## Reading the screen

- **Left** — each stall's sales and queue status. A stall that has not sent anything shows 未報告 (not reported)
- With 13 or more stalls configured, the page switches every 10 seconds, and a page number like `1/3` appears in the top right
- **Right** — the video the admin chose. With none set, or before the start time the admin picked, it shows 映像準備中 (video standby)
- **Bottom** — the `INFORMATION` band. Breaking news, timetable notices and the standing notice run through it

The screen refreshes itself about once a minute.

## If something goes wrong

| On screen                             | What it means, and what to do                                                                |
| ------------------------------------- | -------------------------------------------------------------------------------------------- |
| SIGNAGE INITIALIZING / 接続しています | Loading. If it does not change after a few seconds, check the network                        |
| 閲覧URLが無効です                     | The URL was reissued, or the sign-in was lost. Ask an admin for a new URL.                   |
| 通信を確認しています                  | Temporarily disconnected. The screen keeps its last state, and this clears once it recovers. |
| 映像準備中 / VIDEO STANDBY            | No video is set, it is before the start time, or it cannot play. Check with an admin.        |
