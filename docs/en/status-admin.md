# Admins: Configure the app

Opening the admin URL brings up the admin screen. The tabs on the right of the header switch between ステータス (Status) and 設定 (Settings).

::: tip The app is in Japanese
There is no English UI. Japanese labels are quoted below exactly as they appear on screen, with a translation next to them.
:::

| Menu                | What it does                                                      |
| ------------------- | ----------------------------------------------------------------- |
| ステータス (Status) | Pick a stall: update on its behalf and see its history            |
| 設定 (Settings)     | Signage content, video, viewing URL, the hours, and the rehearsal |

- The Status tab has the status form on the left and the history on the right. On a narrow screen they stack in one column.
- The Settings tab has サイネージ (Signage) at the top and ステータス (Status: hours and rehearsal) below it.
- Pick the stall with the select above the status form. Only the food-selling and cooking groups are listed.
- The current tab and stall are saved to the device and restored next time.
- The colours follow the device's light / dark setting, on the stall-facing screen too. Only the signage stays dark.
- The admin URL is saved to the device the first time you open it, and `?t=…` disappears from the address bar. Bookmark it.
- Changes in each window **do not take effect until you press that window's save button** (`更新する` for Status).
- A lost admin URL has to be reissued — ask the developer; the steps are in the [repository README](https://github.com/sakana-digital/lpf-2026/blob/main/apps/status/README.md#トークン運用).

## ステータス (Status)

Send the sales and queue status of the stall picked in the select. The options mean the same as in the [stall guide](/en/status-org#_2-pick-a-status-and-send-it).

- Admins are **not restricted by the festival hours**. You can update on a stall's behalf outside them.
- 全て完売 (sold out) asks for confirmation when you press `更新する`.

## 更新履歴 (History)

The selected stall's sales and queue status over time, as two lines against a time axis (newest first, up to 200 entries).

- Sales status is the upper line, queue status the lower one, in different colours. Each update is a point, joined by straight lines. The queue line breaks while the stall is paused or sold out.
- Drag to move through time, scroll to zoom, and double-click or press `全期間` (all) to see everything. `Day 1` and `Day 2` show that day's opening hours (10:00 to 15:30).
- Hover over the chart for the values at that moment and who sent them — 団体 (the stall) or 管理者 (an admin). the list below the chart shows the same data.
- Recording starts from the updates made after this feature shipped; earlier values were never kept.
- Nothing is ever removed from the history. It is admin-only: neither the public site nor the signage shows it.

## Accepted stalls

Not a setting: the list is fixed.

- Only the **food-selling and cooking groups** can send a status. Any other group's URL shows 受付対象外です。 (Not accepting.) and cannot send, and it never appears on the public site or the signage. The grouping comes from `category` in [shared/organizations.ts](https://github.com/sakana-digital/lpf-2026/blob/main/shared/organizations.ts).
- The signage shows the food-selling and cooking groups in the standard order. Past 12 stalls it paginates, switching every 10 seconds.

## 受付時間 (Hours)

When stalls can send, under ステータス on the Settings tab.

- The defaults are the festival dates and opening hours from [shared/timetable.ts](https://github.com/sakana-digital/lpf-2026/blob/main/shared/timetable.ts): 10:00 to 15:30 on both days.
- Change the start and end of Day 1 / Day 2 and press `時間を保存` (save hours) to accept only within them. `開場時間に戻す` (back to opening hours) restores the defaults.
- Admins can update on a stall's behalf at any time.

## テスト受付 (Rehearsal)

Lets the stalls try sending on the setup day. Press `テスト受付` (rehearsal) under ステータス on the Settings tab: an explanation appears, and `開始する` (start) begins it.

- While it runs, stalls can send outside the hours. The signage shows the rehearsal values too; the public site does not fetch statuses outside the festival days, so a setup-day rehearsal never shows there.
- Rehearsal sends are stored apart from the real data. The real statuses and history are out of view for its duration, and every stall starts from a blank slate.
- A stall's screen says テスト受付中です。送信内容はテスト終了時に削除します。 (Rehearsal in progress; what you send is discarded when it ends.)
- While it runs the same button reads `テスト受付中` (rehearsal running). Press it and choose `終了して削除` (end and discard) to discard only the rehearsal's statuses and history. The real data is never touched, so starting or ending one by mistake during the festival loses nothing.
- End it before the festival opens: while it runs the real values stay hidden.

Outside the hours:

- A stall's send is rejected with 文化祭時間外です。 (Outside festival hours.)
- Statuses disappear from the public site.
- The signage keeps showing the last values it received.

## サイネージ (Signage)

The upper part of the Settings tab. Press `サイネージ設定を保存` (save signage settings) and the displays pick the settings up in about a minute.

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
- Playback is automatic and loops, and the sound starts off. To hear it, tap once on the display itself — see [Show the signage](/en/status-signage)
- The video currently on screen cannot be deleted. Switch to another one first.

### Viewing URL

Issues the URL you hand to a signage device.

- The URL you issue is kept only on this screen, in this device's browser. Click it to copy.
- **Reissuing invalidates the previous URL and every display currently using it.** Those displays stop, so avoid it while they are up.
- For the device side, see [Show the signage](/en/status-signage).

## A rough plan for the day

1. The day before, check the signage and the hours under 設定 and load the viewing URL onto each display. If you ran a rehearsal on the setup day, end it.
2. On the day, leave it to the stalls, and use ステータス for any stall that has not sent anything.
3. If you need to announce something, turn on 速報 under 設定, and turn it back off afterwards.
