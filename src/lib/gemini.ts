import { GoogleGenAI } from "@google/genai";

const rawKey = import.meta.env.VITE_GEMINI_API_KEY;

// Zabrání pádu pokud je klíč prázdný nebo řetězec "undefined"
const isValidKey = rawKey && 
                   rawKey !== "undefined" && 
                   rawKey.trim().length > 0;

const genAI = isValidKey ? new GoogleGenAI(rawKey as string) : null;

export const analyzeStyle = async (title: string, description: string) => {
  if (!genAI) return "AI analýza není nakonfigurována (chybí API klíč).";

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const result = await model.generateContent([
      `You are an expert art curator for MINKA creative. 
      Analyze the photographic/cinematic style of a work titled "${title}" described as "${description}".
      Provide a sophisticated, short critique (max 3 sentences) in Czech that explains the mood, lighting, and "creative pulse" of the work. 
      Make it sound professional, artistic, and modern.`
    ]);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Nepodařilo se vygenerovat analýzu. Zkuste to prosím později.";
  }
};
