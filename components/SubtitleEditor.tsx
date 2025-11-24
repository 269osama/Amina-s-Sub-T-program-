
import React, { useRef, useEffect, useState } from 'react';
import { Subtitle } from '../types';
import { formatTime, parseTime } from '../utils';
import { Clock, Trash2, Globe, AlertCircle, MousePointerClick } from 'lucide-react';

interface SubtitleEditorProps {
  subtitles: Subtitle[];
  currentTime: number;
  onUpdateSubtitle: (id: string, updates: Partial<Subtitle>) => void;
  onCommitChanges: () => void; // Trigger history save
  onDeleteSubtitle: (id: string) => void;
  onSeek: (time: number) => void;
  activeSubtitleId: string | null;
}

// Internal component for editable timestamps to manage local state
const TimeInput: React.FC<{ 
  seconds: number, 
  onChange: (newTime: number) => void,
  onCommit: () => void
}> = ({ seconds, onChange, onCommit }) => {
  const [value, setValue] = useState(formatTime(seconds));

  // Sync with external updates (if not editing)
  useEffect(() => {
    setValue(formatTime(seconds));
  }, [seconds]);

  const handleBlur = () => {
    const newSeconds = parseTime(value);
    if (newSeconds !== seconds) {
      onChange(newSeconds);
      // We commit after a short delay to ensure the update has propagated if needed,
      // or rely on the parent to commit the current state.
      setTimeout(onCommit, 100);
    }
    setValue(formatTime(newSeconds));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <input
      className="bg-transparent w-20 outline-none focus:text-indigo-400 font-mono text-xs text-center border-b border-transparent focus:border-indigo-500 transition-colors"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onClick={(e) => e.stopPropagation()}
    />
  );
};

const SubtitleEditor: React.FC<SubtitleEditorProps> = ({
  subtitles,
  currentTime,
  onUpdateSubtitle,
  onCommitChanges,
  onDeleteSubtitle,
  onSeek,
  activeSubtitleId
}) => {
  const activeRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (autoScroll && activeSubtitleId && activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeSubtitleId, autoScroll]);

  return (
    <div className="h-full bg-zinc-900 flex flex-col overflow-hidden relative">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800 bg-zinc-900 flex justify-between items-center shadow-md shrink-0 z-10">
        <div className="flex flex-col">
           <h2 className="text-sm font-semibold text-zinc-100 uppercase tracking-wider">Subtitle Tracks</h2>
           <span className="text-xs text-zinc-500">{subtitles.length} events</span>
        </div>
        
        <button 
          onClick={() => setAutoScroll(!autoScroll)}
          className={`p-1.5 rounded transition-colors ${autoScroll ? 'bg-indigo-500/20 text-indigo-400' : 'text-zinc-600 hover:bg-zinc-800'}`}
          title={autoScroll ? "Disable Auto-Scroll" : "Enable Auto-Scroll"}
        >
           <MousePointerClick size={16} />
        </button>
      </div>

      {/* Scrollable List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2 relative pb-20">
        {subtitles.length === 0 && (
          <div className="text-center text-zinc-600 mt-10 p-4 flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center mb-3">
              <Clock className="opacity-20" />
            </div>
            <p className="mb-2 font-medium text-zinc-400">No subtitles yet</p>
            <p className="text-xs max-w-[200px] leading-relaxed">
              Upload a video and click <span className="text-indigo-400">Auto-Generate</span> to let Gemini create frame-perfect subtitles.
            </p>
          </div>
        )}

        {subtitles.map((sub) => {
          const isActive = activeSubtitleId === sub.id;
          const isWarning = sub.text.length > 42;

          return (
            <div
              key={sub.id}
              ref={isActive ? activeRef : null}
              className={`
                group relative p-3 rounded-md border transition-all duration-200
                ${isActive ? 'bg-zinc-800 border-indigo-500 ring-1 ring-indigo-500/50' : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'}
              `}
              onClick={() => {
                onSeek(sub.startTime);
              }}
            >
              {/* Timing Controls */}
              <div className="flex items-center space-x-2 mb-2">
                <div className="flex items-center text-xs text-zinc-400 bg-zinc-950 px-2 py-1 rounded border border-zinc-800/50">
                  <Clock size={12} className="mr-2 text-zinc-600" />
                  
                  <TimeInput 
                    seconds={sub.startTime} 
                    onChange={(val) => onUpdateSubtitle(sub.id, { startTime: val })}
                    onCommit={onCommitChanges}
                  />
                  
                  <span className="mx-1 text-zinc-600">→</span>
                  
                  <TimeInput 
                    seconds={sub.endTime} 
                    onChange={(val) => onUpdateSubtitle(sub.id, { endTime: val })} 
                    onCommit={onCommitChanges}
                  />
                </div>
                
                {sub.speaker && (
                  <input
                    className="text-xs text-emerald-500 font-medium px-2 py-0.5 bg-emerald-500/10 rounded-full max-w-[80px] bg-transparent outline-none border border-transparent focus:border-emerald-500/50 transition-colors"
                    value={sub.speaker}
                    onChange={(e) => onUpdateSubtitle(sub.id, { speaker: e.target.value })}
                    onBlur={onCommitChanges}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="Speaker"
                  />
                )}
              </div>

              {/* Text Input */}
              <textarea
                className={`
                  w-full bg-transparent resize-none outline-none text-sm font-medium leading-relaxed p-1 -ml-1 rounded
                  ${isActive ? 'text-white' : 'text-zinc-300'}
                  placeholder-zinc-600
                  focus:bg-zinc-950 focus:ring-1 focus:ring-indigo-500/30
                `}
                rows={Math.max(1, Math.ceil(sub.text.length / 35))}
                value={sub.text}
                onChange={(e) => onUpdateSubtitle(sub.id, { text: e.target.value })}
                onBlur={onCommitChanges}
                onClick={(e) => e.stopPropagation()} 
                placeholder="Type subtitle here..."
              />

              {/* Validation Warning */}
              {isWarning && (
                <div className="absolute top-2 right-2 text-amber-500 animate-pulse" title="Line exceeds 42 characters">
                   <AlertCircle size={14} />
                </div>
              )}

              {/* Translation Display */}
              {sub.originalText && sub.originalText !== sub.text && (
                <div className="mt-2 text-xs text-zinc-500 flex items-start gap-2 pl-1 border-l-2 border-zinc-700">
                  <Globe size={12} className="mt-0.5 shrink-0 opacity-70" />
                  <span className="italic">{sub.originalText}</span>
                </div>
              )}

              {/* Actions */}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1 bg-zinc-900/80 rounded backdrop-blur-sm">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteSubtitle(sub.id);
                  }}
                  className="p-1 hover:bg-red-500/20 hover:text-red-400 text-zinc-500 rounded transition-colors"
                  title="Delete subtitle"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SubtitleEditor;
