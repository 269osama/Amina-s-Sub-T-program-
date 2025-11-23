import { GoogleGenAI, Type } from "@google/genai";
import { Subtitle } from "../types";
import { parseTime, processMediaForGemini } from "../utils";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Using Flash for faster turnaround on media processing.
const MODEL_NAME = 'gemini-2.5-flash'; 

// Helper to clean JSON output (remove markdown blocks if present)
const cleanJson = (text: string): string => {
  let clean = text.replace(/```json/g, '').replace(/```/g, '');
  return clean.trim();
};

// We now accept the file object directly to handle optimization internally if needed,
// or base64 if pre-processed. For simplicity in the calling code, let's keep the signature flexible
// but we will use the optimization logic.
export const generateSubtitlesFromMedia = async (
  mediaFile: File,
  onProgress: (status: string) => void
): Promise<Subtitle[]> => {
  try {
    onProgress("Extracting & compressing audio...");
    
    // Optimize media: Extract audio -> Downsample to 16kHz -> Mono -> WAV
    // This drastically reduces upload size and improves Gemini accuracy.
    const { data: base64Data, mimeType } = await processMediaForGemini(mediaFile);

    onProgress("Gemini is analyzing speech patterns...");

    // Strictly enforced prompt for subtitle standards
    const prompt = `
      Analyze the audio and generate professional subtitles (SRT style).
      
      STRICT GUIDELINES:
      1. LANGUAGE: Detect the spoken language automatically. Transcribe EXACTLY what is said in that language.
      2. LENGTH: 
         - Maximum 2 lines per subtitle event.
         - Maximum 42 characters per line.
         - ABSOLUTELY NO PARAGRAPHS.
      3. SPLITTING:
         - If a sentence is long (>80 chars), SPLIT it into multiple sequential subtitle events.
         - Do not cram text into one block. Better to have 3 short subtitles than 1 long one.
      4. TIMING:
         - Use standard SRT format timestamps (00:00:00,000).
         - Duration should be between 1 and 6 seconds per event.
      
      Return ONLY a JSON array:
      [{
        "startTime": "00:00:00,000",
        "endTime": "00:00:00,000",
        "speaker": "Speaker Name",
        "text": "Line 1 text\\nLine 2 text" 
      }]
    `;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data
            }
          },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              startTime: { type: Type.STRING },
              endTime: { type: Type.STRING },
              speaker: { type: Type.STRING },
              text: { type: Type.STRING },
            },
            required: ["startTime", "endTime", "text"]
          }
        }
      }
    });

    const text = response.text || "[]";
    const rawData = JSON.parse(cleanJson(text));

    // Transform to our internal format
    return rawData.map((item: any, index: number) => ({
      id: `auto-${index}-${Date.now()}`,
      startTime: parseTime(item.startTime),
      endTime: parseTime(item.endTime),
      text: item.text,
      speaker: item.speaker || 'Unknown',
      confidence: 0.95 
    }));

  } catch (error) {
    console.error("Gemini Transcription Error:", error);
    throw new Error("Failed to generate subtitles. Please check if the file is valid.");
  }
};

export const translateSubtitlesWithGemini = async (
  subtitles: Subtitle[],
  targetLanguage: string
): Promise<Subtitle[]> => {
  try {
    // Send relevant data only to save tokens
    const subtitlesToTranslate = subtitles.map(s => ({ id: s.id, text: s.text }));
    
    const prompt = `
      Translate the following subtitle text to ${targetLanguage}.
      Rules:
      1. Keep the same meaning and tone.
      2. Keep the translation concise (max 2 lines, max 42 chars/line if possible).
      3. Return a JSON array of objects with 'id' and 'translatedText'.
      
      Input:
      ${JSON.stringify(subtitlesToTranslate)}
    `;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              translatedText: { type: Type.STRING }
            }
          }
        }
      }
    });

    const text = response.text || "[]";
    const translations = JSON.parse(cleanJson(text));
    
    // Explicitly type the Map to avoid implicit 'any' errors
    const translationMap = new Map<string, string>(translations.map((t: any) => [t.id, t.translatedText]));

    return subtitles.map(sub => ({
      ...sub,
      originalText: sub.originalText || sub.text, // Preserve the very first original text
      text: translationMap.get(sub.id) || sub.text // Apply translation if found
    }));

  } catch (error) {
    console.error("Gemini Translation Error:", error);
    throw new Error("Translation failed. Please try again.");
  }
};