import { GoogleGenAI, Type } from "@google/genai";
import { Subtitle } from "../types";
import { parseTime } from "../utils";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Using Flash for faster turnaround on media processing.
const MODEL_NAME = 'gemini-2.5-flash'; 

// Helper to clean JSON output (remove markdown blocks if present)
const cleanJson = (text: string): string => {
  let clean = text.replace(/```json/g, '').replace(/```/g, '');
  return clean.trim();
};

export const generateSubtitlesFromMedia = async (
  base64Data: string,
  mimeType: string,
  onProgress: (status: string) => void
): Promise<Subtitle[]> => {
  try {
    onProgress("Uploading and analyzing audio structure...");

    // We use a carefully crafted prompt to force JSON output with specific structure
    const prompt = `
      Analyze the provided audio/video track.
      Generate a JSON array of subtitles for the dialogue.
      
      Rules:
      1. Accurately transcribe spoken text.
      2. Identify speaker changes.
      3. Create precise timestamps in standard SRT format (00:00:00,000).
      4. Keep subtitles between 1 and 7 seconds long.
      5. Split lines if they exceed 42 characters.
      6. Return ONLY the JSON.

      Response Schema:
      Array of objects:
      {
        "startTime": "00:00:00,000",
        "endTime": "00:00:00,000",
        "speaker": "Speaker Name",
        "text": "Subtitle text content"
      }
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
    throw new Error("Failed to generate subtitles. Please check if the file size is under limits or try a shorter clip.");
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
      Maintain the tone and context of a film.
      Return a JSON array of objects with 'id' and 'translatedText'.
      
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