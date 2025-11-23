import React, { useState, useEffect, useCallback } from 'react';
import { Subtitle, ProcessingStatus, LANGUAGES } from './types';
import { generateSRT, downloadFile, fileToBase64 } from './utils';
import { generateSubtitlesFromMedia, translateSubtitlesWithGemini } from './services/geminiService';
import VideoPlayer from './components/VideoPlayer';
import SubtitleEditor from './components/SubtitleEditor';
import Timeline from './components/Timeline';
import { 
  Sparkles, 
  Upload, 
  Download, 
  Play, 
  Pause, 
  Globe, 
  Settings, 
  Film,
  Volume2,
  VolumeX,
  Trash2,
  Undo,
  Redo,
  ZoomIn,
  ZoomOut,
  X
} from 'lucide-react';

const App: React.FC = () => {
  // --- State ---
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  
  // History for Undo/Redo
  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
  const [history, setHistory] = useState<Subtitle[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const [status, setStatus] = useState<ProcessingStatus>(ProcessingStatus.IDLE);
  const [statusMessage, setStatusMessage] = useState("");
  const [selectedLang, setSelectedLang] = useState('es');
  const [zoomLevel, setZoomLevel] = useState(50); // Pixels per second

  // --- History Management ---
  const pushToHistory = useCallback((newSubtitles: Subtitle[]) => {
    // Prevent pushing duplicate states
    if (historyIndex >= 0 && JSON.stringify(history[historyIndex]) === JSON.stringify(newSubtitles)) {
      return;
    }

    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newSubtitles);
    
    // Limit history size
    if (newHistory.length > 50) newHistory.shift();
    
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    // Note: We don't setSubtitles here because this is usually called *after* local state update
    // But to be safe if called externally:
    setSubtitles(newSubtitles);
  }, [history, historyIndex]);

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setSubtitles(history[newIndex]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setSubtitles(history[newIndex]);
    }
  };

  // Called when user pauses editing (blur) or makes a discrete change (delete/generate)
  const commitChanges = () => {
    pushToHistory([...subtitles]);
  };

  // --- Actions ---

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setMediaFile(file);
      setMediaUrl(URL.createObjectURL(file));
      
      // Reset everything for new file
      const initialSubs: Subtitle[] = [];
      setSubtitles(initialSubs);
      setHistory([initialSubs]);
      setHistoryIndex(0);
      setStatus(ProcessingStatus.READY);
      setCurrentTime(0);
      setIsPlaying(false);
    }
  };

  const handleResetProject = () => {
    if (confirm("Are you sure you want to close this project? Unsaved changes will be lost.")) {
      setMediaFile(null);
      setMediaUrl(null);
      setSubtitles([]);
      setHistory([]);
      setHistoryIndex(-1);
      setStatus(ProcessingStatus.IDLE);
      setIsPlaying(false);
    }
  };

  const handleGenerate = async () => {
    if (!mediaFile) return;
    setIsPlaying(false);
    setStatus(ProcessingStatus.UPLOADING);
    setStatusMessage("Uploading media for analysis...");

    try {
      const base64 = await fileToBase64(mediaFile);
      
      setStatus(ProcessingStatus.ANALYZING);
      setStatusMessage("Gemini is analyzing audio patterns & transcribing...");
      
      const generatedSubs = await generateSubtitlesFromMedia(base64, mediaFile.type, setStatusMessage);
      
      pushToHistory(generatedSubs);
      setStatus(ProcessingStatus.IDLE);
    } catch (error: any) {
      console.error(error);
      setStatus(ProcessingStatus.ERROR);
      setStatusMessage(error.message || "An error occurred");
    }
  };

  const handleTranslate = async () => {
    if (subtitles.length === 0) return;
    setStatus(ProcessingStatus.TRANSLATING);
    setStatusMessage(`Translating subtitles to ${LANGUAGES.find(l => l.code === selectedLang)?.name}...`);

    try {
      const translatedSubs = await translateSubtitlesWithGemini(subtitles, selectedLang);
      pushToHistory(translatedSubs);
      setStatus(ProcessingStatus.IDLE);
    } catch (error: any) {
      setStatus(ProcessingStatus.ERROR);
      setStatusMessage(error.message || "Translation failed");
    }
  };

  const handleExport = (format: 'srt' | 'json') => {
    if (format === 'srt') {
      const content = generateSRT(subtitles);
      downloadFile(content, 'subtitles.srt', 'text/plain');
    } else {
      const content = JSON.stringify(subtitles, null, 2);
      downloadFile(content, 'subtitles.json', 'application/json');
    }
  };

  const activeSubtitleId = subtitles.find(
    s => currentTime >= s.startTime && currentTime <= s.endTime
  )?.id || null;

  // --- Keyboard Shortcuts ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying(prev => !prev);
      }
      if (e.code === 'ArrowLeft') {
        setCurrentTime(prev => Math.max(0, prev - 2));
      }
      if (e.code === 'ArrowRight') {
        setCurrentTime(prev => Math.min(duration, prev + 2));
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        handleUndo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [duration, historyIndex, history]); 

  return (
    <div className="h-screen w-screen flex flex-col bg-zinc-950 text-zinc-100 font-sans overflow-hidden selection:bg-indigo-500/30 selection:text-white">
      
      {/* --- Top Bar --- */}
      <header className="h-16 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between px-4 shrink-0 z-50 shadow-lg">
        
        {/* Left: Branding & File Ops */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 mr-4">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-900/20">
               <Film size={16} className="text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight hidden md:inline text-zinc-100">PerfectSync</span>
          </div>

          <div className="h-6 w-px bg-zinc-800 mx-1"></div>

          {!mediaUrl ? (
             <label className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md text-xs font-semibold transition-all hover:shadow-indigo-500/25 hover:shadow-lg">
               <Upload size={14} />
               Open Media
               <input type="file" className="hidden" accept="video/*,audio/*" onChange={handleFileUpload} />
             </label>
          ) : (
             <div className="flex items-center gap-2 bg-zinc-900/50 pr-1 rounded-md border border-zinc-800">
                <span className="text-xs text-zinc-300 px-3 py-1.5 max-w-[150px] truncate border-r border-zinc-800">
                  {mediaFile?.name}
                </span>
                <button 
                  onClick={handleResetProject}
                  className="p-1.5 m-0.5 hover:bg-red-500/10 text-zinc-500 hover:text-red-400 rounded transition-colors"
                  title="Close Project"
                >
                  <X size={14} />
                </button>
             </div>
          )}
        </div>

        {/* Center: Playback Controls */}
        <div className="flex items-center gap-4 absolute left-1/2 -translate-x-1/2">
          <button 
            onClick={() => setIsPlaying(!isPlaying)}
            disabled={!mediaUrl}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-zinc-100 text-black hover:bg-white hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100 shadow-lg shadow-white/5"
          >
            {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
          </button>
          
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 w-32 justify-center">
            <span>{new Date(currentTime * 1000).toISOString().substr(14, 5)}</span>
            <span className="opacity-30">/</span>
            <span>{new Date(duration * 1000).toISOString().substr(14, 5)}</span>
          </div>
        </div>

        {/* Right: Tools & Export */}
        <div className="flex items-center gap-3">
           {status !== ProcessingStatus.IDLE && status !== ProcessingStatus.READY && status !== ProcessingStatus.ERROR && (
             <div className="hidden md:flex items-center gap-2 text-xs text-indigo-400 animate-pulse mr-2 bg-indigo-500/5 px-2 py-1 rounded border border-indigo-500/10">
                <Sparkles size={12} />
                <span>{statusMessage}</span>
             </div>
           )}
           
           {mediaUrl && subtitles.length === 0 && status !== ProcessingStatus.ANALYZING && status !== ProcessingStatus.UPLOADING && (
              <button
                onClick={handleGenerate}
                className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md text-xs font-semibold transition-all shadow-lg shadow-indigo-500/20 hover:-translate-y-0.5"
              >
                <Sparkles size={14} />
                Auto-Generate
              </button>
           )}

           {subtitles.length > 0 && (
             <>
                <div className="flex items-center bg-zinc-900 rounded-md border border-zinc-800 overflow-hidden">
                  <div className="relative">
                    <select 
                      className="bg-transparent text-xs text-zinc-300 outline-none pl-2 pr-6 py-1.5 cursor-pointer hover:bg-zinc-800 appearance-none z-10 relative"
                      value={selectedLang}
                      onChange={(e) => setSelectedLang(e.target.value)}
                    >
                      {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
                    </select>
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                      <Globe size={10} />
                    </div>
                  </div>
                  <button 
                    onClick={handleTranslate}
                    className="px-2 py-1.5 border-l border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-indigo-400 transition-colors"
                    title="Translate Subtitles"
                  >
                    <Globe size={14} />
                  </button>
                </div>

                <div className="h-4 w-px bg-zinc-800"></div>
                
                <button 
                  onClick={() => handleExport('srt')}
                  className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-md text-xs font-medium transition-colors border border-zinc-800 hover:border-zinc-700"
                >
                  <Download size={14} />
                  Export
                </button>
             </>
           )}
        </div>
      </header>

      {/* --- Main Workspace --- */}
      <main className="flex-1 flex overflow-hidden">
        
        {/* Left: Player & Timeline */}
        <div className="flex-1 flex flex-col min-w-0 bg-zinc-950 relative">
          
          {/* Video Viewport */}
          <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
            <VideoPlayer 
              mediaUrl={mediaUrl}
              currentTime={currentTime}
              onTimeUpdate={setCurrentTime}
              onDurationChange={setDuration}
              isPlaying={isPlaying}
              setIsPlaying={setIsPlaying}
              volume={volume}
              isMuted={isMuted}
            />
            
            {/* Subtitle Overlay Preview */}
            {activeSubtitleId && mediaUrl && (
              <div className="absolute bottom-[10%] left-0 right-0 text-center pointer-events-none px-8 z-20">
                <span className="bg-black/80 text-white px-4 py-2 text-xl rounded shadow-xl inline-block backdrop-blur-md">
                  {subtitles.find(s => s.id === activeSubtitleId)?.text}
                </span>
              </div>
            )}
          </div>

          {/* Mini Toolbar: Volume, Zoom, Undo/Redo */}
          <div className="h-12 bg-zinc-950 border-t border-zinc-800 flex items-center justify-between px-4 shrink-0 select-none shadow-[0_-1px_10px_rgba(0,0,0,0.3)] z-10">
             <div className="flex items-center gap-6">
                {/* Volume */}
                <div className="flex items-center gap-2 group">
                   <button onClick={() => setIsMuted(!isMuted)} className="text-zinc-400 hover:text-white transition-colors">
                      {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                   </button>
                   <div className="w-24 h-6 flex items-center">
                    <input 
                        type="range" 
                        min="0" 
                        max="1" 
                        step="0.05" 
                        value={isMuted ? 0 : volume}
                        onChange={(e) => {
                          setVolume(parseFloat(e.target.value));
                          if (parseFloat(e.target.value) > 0) setIsMuted(false);
                        }}
                        className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400"
                    />
                   </div>
                </div>

                <div className="h-4 w-px bg-zinc-800"></div>

                {/* Undo/Redo */}
                <div className="flex items-center gap-1">
                   <button 
                     onClick={handleUndo} 
                     disabled={historyIndex <= 0}
                     className="p-1.5 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-400 transition-colors"
                     title="Undo (Ctrl+Z)"
                   >
                     <Undo size={16} />
                   </button>
                   <button 
                     onClick={handleRedo} 
                     disabled={historyIndex >= history.length - 1}
                     className="p-1.5 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-400 transition-colors"
                     title="Redo (Ctrl+Y)"
                   >
                     <Redo size={16} />
                   </button>
                </div>
             </div>

             {/* Zoom Controls */}
             <div className="flex items-center gap-3">
                <ZoomOut size={14} className="text-zinc-600" />
                <input 
                   type="range" 
                   min="10" 
                   max="200" 
                   value={zoomLevel} 
                   onChange={(e) => setZoomLevel(parseInt(e.target.value))}
                   className="w-32 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-zinc-500 hover:accent-zinc-400" 
                />
                <ZoomIn size={14} className="text-zinc-600" />
             </div>
          </div>

          {/* Timeline */}
          <Timeline 
            duration={duration} 
            currentTime={currentTime} 
            subtitles={subtitles} 
            onSeek={setCurrentTime}
            zoomLevel={zoomLevel}
          />
        </div>

        {/* Right: Subtitle Editor Sidebar */}
        <div className="w-[400px] shrink-0 border-l border-zinc-800 flex flex-col bg-zinc-900 shadow-xl z-10">
           <SubtitleEditor 
             subtitles={subtitles}
             currentTime={currentTime}
             activeSubtitleId={activeSubtitleId}
             onSeek={(t) => setCurrentTime(t)}
             onUpdateSubtitle={(id, updates) => {
               // Optimistic UI update
               setSubtitles(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
             }}
             onCommitChanges={commitChanges}
             onDeleteSubtitle={(id) => {
               const newSubs = subtitles.filter(s => s.id !== id);
               setSubtitles(newSubs); // Update State
               // Force commit for deletion
               // We need to access the *new* state, but since setSubtitles is async, we use a temp var for history push
               pushToHistory(newSubs); 
             }}
           />
        </div>

      </main>
    </div>
  );
};

export default App;