import { Subtitle } from "./types";

// Convert seconds to SRT format (00:00:00,000)
export const formatTime = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds < 0) return "00:00:00,000";
  const pad = (num: number, size: number) => ('000' + num).slice(size * -1);
  const time = parseFloat(seconds.toFixed(3));
  const hours = Math.floor(time / 3600);
  const minutes = Math.floor(time / 60) % 60;
  const secs = Math.floor(time % 60);
  const ms = Math.round((time % 1) * 1000);

  return `${pad(hours, 2)}:${pad(minutes, 2)}:${pad(secs, 2)},${pad(ms, 3)}`;
};

// Convert SRT timestamp string to seconds
export const parseTime = (timeString: string): number => {
  if (!timeString) return 0;
  
  // Normalize delimiters and cleanup
  const cleanStr = timeString.replace(',', '.').trim();
  const parts = cleanStr.split(':');
  
  let seconds = 0;
  
  if (parts.length === 3) {
    seconds += parseInt(parts[0], 10) * 3600;
    seconds += parseInt(parts[1], 10) * 60;
    seconds += parseFloat(parts[2]);
  } else if (parts.length === 2) {
    seconds += parseInt(parts[0], 10) * 60;
    seconds += parseFloat(parts[1]);
  } else if (parts.length === 1) {
    seconds += parseFloat(parts[0]);
  }

  return isNaN(seconds) ? 0 : seconds;
};

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove Data-URL declaration (e.g. data:audio/mp3;base64,)
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

export const generateSRT = (subtitles: Subtitle[]): string => {
  // Sort subtitles by start time before exporting to ensure valid SRT
  const sorted = [...subtitles].sort((a, b) => a.startTime - b.startTime);
  return sorted
    .map((sub, index) => {
      return `${index + 1}\n${formatTime(sub.startTime)} --> ${formatTime(sub.endTime)}\n${sub.text}\n`;
    })
    .join('\n');
};

export const downloadFile = (content: string, filename: string, type: string) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Extracts audio from video, downsamples to 16kHz mono WAV.
 * drastic speed improvement for uploads.
 */
export const processMediaForGemini = async (file: File): Promise<{data: string, mimeType: string}> => {
  // Use Web Audio API to decode and process
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
    sampleRate: 16000 // Gemini works best with 16kHz speech
  });

  const arrayBuffer = await file.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  
  // Mix down to mono (channel 0)
  const pcmData = audioBuffer.getChannelData(0);
  
  // Encode to WAV
  const wavBuffer = encodeWAV(pcmData, 16000);
  const blob = new Blob([wavBuffer], { type: 'audio/wav' });
  
  // Convert blob to base64 for API
  const base64 = await fileToBase64(new File([blob], 'audio.wav'));
  
  return {
    data: base64,
    mimeType: 'audio/wav'
  };
};

// Minimal WAV encoder
const encodeWAV = (samples: Float32Array, sampleRate: number) => {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);
    const writeString = (view: DataView, offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i));
    };
    
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, 'data');
    view.setUint32(40, samples.length * 2, true);

    for (let i = 0; i < samples.length; i++) {
        const s = Math.max(-1, Math.min(1, samples[i]));
        // Convert float to 16-bit PCM
        view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    return buffer;
};