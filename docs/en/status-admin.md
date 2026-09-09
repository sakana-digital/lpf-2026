# Admins: Configure the app

Opening the admin URL puts the same app the stalls use into admin mode, with four tabs across the top.

::: tip The app is in Japanese
There is no English UI. Japanese labels are quoted below exactly as they appear on screen, with a translation next to them.
:::

| Tab                         | What it does                                            |
| --------------------------- | ------------------------------------------------------- |
| ステータス (Status)         | Update any stall's status on their behalf               |
| 受付時間 (Hours)            | Set when stalls may send, per Day 1 / Day 2             |
| 表示団体 (Published stalls) | Choose which stalls appear on the public site           |
| サイネージ (Signage)        | Set what the signage shows: content, video, viewing URL |

- The admin URL is saved to the device the first time you open it, and `?t=…` disappears from the address bar. Bookmark it.
- Changes on each tab **do not take effect until you press that tab's save button** (`更新する` on the Status tab).
- A lost admin URL has to be reissued — ask the developer; the steps are in the [repository README](https://github.com/sakana-digital/lpf-2026/blob/main/apps/status/README.md#トークン運用).

## ステータス (Status)

Pick a stall and send its sales and queue status. The options mean the same as in the [stall guide](/en/status-org#_2-pick-a-status-and-send-it).

- Admins are **not restricted by the hours**. You can update on a stall's behalf outside them.
- On a wide screen, pick the stall from the list on the left; on a narrow one, from the select at the top.

### 更新履歴 (History)

Below the form, the selected stall's updates are listed newest first (up to 200).

- Each row is the time, the sales status, the queue status, and who sent it — 団体 (the stall) or 管理者 (an admin).
- Recording starts from the updates made after this feature shipped; earlier values were never kept.
- Nothing is ever removed from the history. It is admin-only: neither the public site nor the signage shows it.

## 受付時間 (Hours)

The window in which stalls can send their status.

- Set a start and an end for Day 1 and for Day 2. Setting only one of them is fine.
- A day you leave unset is unrestricted. **If neither day is set, stalls can send at any time.**
- To lift the restriction, press `クリア` (clear) to empty the fields, then `時間を保存` (save hours).

Outside the hours:

- A stall's send is rejected with 文化祭時間外です。 (Outside festival hours.)
- Statuses disappear from the public site.
- The signage keeps showing the last values it received.

## 表示団体 (Published stalls)

Unchecking a stall removes its status from the public site — the `n / 31団体` count shows how many are checked.

- It takes up to a minute to apply.
- This affects **the public site only**. Stalls shown on the signage are chosen separately, on the Signage tab.
- It is meant for stalls with no status to report, such as stage-only groups.

## サイネージ (Signage)

The preview on the right shows the real screen as you configure it. Press `サイネージ設定を保存` (save signage settings) and the displays pick the settings up in about a minute.

### Stalls to show

- Toggle each stall on or off with its button, then order them with `↑` `↓` in the list below
- At least one stall is required
- Past 12 stalls the display paginates automatically, switching every 10 seconds

### Footer

The text in the band along the bottom of the screen. Priority is **breaking news → timetable → standing notice**.

- **固定案内 (standing notice)**, up to 120 characters — shown when nothing is scheduled nearby. For example, 落とし物は本部まで (lost property to the head office)
- **速報 (breaking news)**, up to 200 characters — turn on `速報を配信する` (publish breaking news) and enter text, and this is the only thing shown, always. It is for urgent announcements, so turn it back off when it is over
- The timetable is shown automatically. Events run as まもなく / 開催中 / 次は (soon / on now / up next), from 10 minutes before the start until the end

### Video

- MP4 only, up to 1 GiB per file. Progress is shown while uploading, and `中止` (cancel) stops it.
- The radio buttons choose which video plays. `動画を表示しない` (show no video) leaves the 映像準備中 (video standby) screen.
- Set `再生を始める時刻` (start time) and every display waits on 映像準備中 until then, starts playing at that time, and loops from there. Press `すぐ再生` (play now) and save to lift it; with no time set, playback starts as soon as you save
  - The time is read from the display's own clock, so it can start up to about 10 seconds late
  - The preview on the right plays regardless of the time
- Playback is automatic and loops, and the sound starts off. To hear it, tap once on the display itself — see [Show the signage](/en/status-signage)
- The video currently on screen cannot be deleted. Switch to another one first.

### Viewing URL

Issues the URL you hand to a signage device.

- The URL you issue is kept only on this screen, in this device's browser. Click it to copy.
- **Reissuing invalidates the previous URL and every display currently using it.** Those displays stop, so avoid it while they are up.
- For the device side, see [Show the signage](/en/status-signage).

## A rough plan for the day

1. Set 表示団体 and サイネージ the day before, and load the viewing URL onto each display.
2. Set 受付時間 for Day 1 and Day 2 before the start.
3. On the day, leave it to the stalls, and use the ステータス tab for any stall that has not sent anything.
4. If you need to announce something, turn on 速報 on the サイネージ tab, and turn it back off afterwards.
