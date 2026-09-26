-- After this the signage hides the video again and shows the standby panel.
ALTER TABLE signage_config ADD COLUMN video_stop_at INTEGER;
