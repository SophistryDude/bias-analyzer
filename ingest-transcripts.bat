@echo off
echo ============================================
echo  MediaSentinel — YouTube Transcript Ingestion
echo ============================================
echo.
echo Ingesting transcripts from 18 YouTube channels.
echo Progress is saved — safe to interrupt and resume.
echo.
npx tsm scripts/ingest-youtube-transcripts.ts %*
pause
