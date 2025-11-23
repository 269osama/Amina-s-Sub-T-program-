import React, { useRef, useEffect } from 'react';

interface VideoPlayerProps {
  mediaUrl: string | null;
  currentTime: number;
  onTimeUpdate: (time: number) => void;
  onDurationChange: (duration: number) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  volume: number; // 0 to 1
  isMuted: boolean;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  mediaUrl,
  currentTime,
  onTimeUpdate,
  onDurationChange,
  isPlaying,
  setIsPlaying,
  volume,
  isMuted
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const isSeekingRef = useRef(false);

  // Sync Play/Pause
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying && video.paused) {
      video.play().catch(e => console.error("Play error", e));
    } else if (!isPlaying && !video.paused) {
      video.pause();
    }
  }, [isPlaying]);

  // Sync Volume & Mute
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = volume;
    video.muted = isMuted;
  }, [volume, isMuted]);

  // Sync external time changes to video (seeking)
  useEffect(() => {
    const video = videoRef.current;
    if (!video || isSeekingRef.current) return;

    // Only seek if the difference is significant to avoid fighting the update loop
    if (Math.abs(video.currentTime - currentTime) > 0.2) {
      video.currentTime = currentTime;
    }
  }, [currentTime]);

  if (!mediaUrl) {
    return (
      <div className="w-full h-full bg-zinc-950 flex flex-col items-center justify-center text-zinc-500 border-b border-zinc-800">
        <div className="w-24 h-24 rounded-full bg-zinc-900 flex items-center justify-center mb-4 shadow-inner">
          <svg className="w-10 h-10 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="font-medium">No Media Loaded</p>
        <p className="text-sm opacity-50 mt-1">Import a video or audio file to begin</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-black relative group flex items-center justify-center overflow-hidden">
      <video
        ref={videoRef}
        src={mediaUrl}
        className="max-w-full max-h-full shadow-2xl"
        onTimeUpdate={(e) => {
           if (!isSeekingRef.current) {
             onTimeUpdate(e.currentTarget.currentTime);
           }
        }}
        onDurationChange={(e) => onDurationChange(e.currentTarget.duration)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onSeeking={() => { isSeekingRef.current = true; }}
        onSeeked={() => { isSeekingRef.current = false; }}
        playsInline
      />
    </div>
  );
};

export default VideoPlayer;