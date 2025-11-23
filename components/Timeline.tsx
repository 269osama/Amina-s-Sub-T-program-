import React, { useRef, useState, useEffect } from 'react';
import { Subtitle } from '../types';

interface TimelineProps {
  duration: number;
  currentTime: number;
  subtitles: Subtitle[];
  onSeek: (time: number) => void;
  zoomLevel: number; // pixels per second
}

const Timeline: React.FC<TimelineProps> = ({ duration, currentTime, subtitles, onSeek, zoomLevel }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const totalWidth = Math.max(duration * zoomLevel, 0);

  // Handle scrubbing
  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !containerRef.current || duration === 0) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const newTime = (x / rect.width) * duration;
    onSeek(Math.max(0, Math.min(newTime, duration)));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, duration]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (duration === 0) return;
    setIsDragging(true);
    // Instant seek on click
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = (x / rect.width) * duration;
    onSeek(Math.max(0, Math.min(time, duration)));
  };

  return (
    <div className="h-36 bg-zinc-950 border-t border-zinc-800 flex flex-col select-none relative group z-0">
      {/* Time Scale / Ruler */}
      <div className="h-6 w-full bg-zinc-900 border-b border-zinc-800 flex items-center px-2 overflow-hidden z-10">
         <div className="text-[10px] text-zinc-500 font-mono flex justify-between w-full pointer-events-none">
            <span>00:00</span>
            {duration > 0 && <span>{new Date(duration * 1000).toISOString().substr(14, 5)}</span>}
         </div>
      </div>

      {/* Scrollable Area */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar relative">
        <div 
          ref={containerRef}
          className="h-full relative cursor-crosshair"
          style={{ width: totalWidth > 0 ? `${totalWidth}px` : '100%', minWidth: '100%' }}
          onMouseDown={handleMouseDown}
        >
            {/* Background Grid/Ticks */}
            <div className="absolute inset-0 opacity-20 pointer-events-none" 
                 style={{ 
                   backgroundImage: 'repeating-linear-gradient(90deg, #52525b 0, #52525b 1px, transparent 1px, transparent 100px)',
                   backgroundSize: `${zoomLevel * 10}px 100%` 
                 }} 
            >
              {/* Secondary finer ticks */}
              <div className="absolute inset-0 opacity-30"
                style={{ 
                   backgroundImage: 'repeating-linear-gradient(90deg, #52525b 0, #52525b 1px, transparent 1px, transparent 20px)',
                }} 
              />
            </div>

            {/* Fake Waveform Visual */}
            <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none overflow-hidden">
               <div className="w-full h-1/2 bg-repeat-x" 
                    style={{
                      backgroundImage: 'linear-gradient(to bottom, transparent, #a1a1aa, transparent)',
                      maskImage: 'linear-gradient(90deg, transparent, black 50%, transparent)'
                    }}
               ></div>
            </div>

            {/* Subtitle Blocks */}
            {subtitles.map((sub) => {
              const left = (sub.startTime / duration) * 100;
              const width = ((sub.endTime - sub.startTime) / duration) * 100;
              
              return (
                <div
                  key={sub.id}
                  className="absolute top-4 h-12 bg-indigo-500/20 border border-indigo-500/50 rounded-sm hover:bg-indigo-500/40 transition-colors overflow-hidden whitespace-nowrap text-[10px] text-indigo-200 px-1 pt-0.5 shadow-sm"
                  style={{
                    left: `${left}%`,
                    width: `${width}%`,
                    minWidth: '4px'
                  }}
                  title={`${sub.text} (${sub.startTime.toFixed(2)} - ${sub.endTime.toFixed(2)})`}
                >
                  <span className="pointer-events-none opacity-90 drop-shadow-md">{sub.text}</span>
                </div>
              );
            })}

            {/* Playhead */}
            <div
              className="absolute top-0 bottom-0 w-px bg-red-500 z-30 pointer-events-none shadow-[0_0_10px_rgba(239,68,68,0.5)]"
              style={{ left: `${(currentTime / duration) * 100}%` }}
            >
               <div className="absolute -top-1.5 -translate-x-1/2 w-3 h-3 bg-red-500 rotate-45 transform origin-center shadow-sm" />
            </div>
        </div>
      </div>
    </div>
  );
};

export default Timeline;