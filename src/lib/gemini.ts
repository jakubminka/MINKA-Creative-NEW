import { GoogleGenAI } from "@google/genai";

export const analyzeStyle = async (title: string, description: string) => {
  const rawKey = import.meta.env.VITE_GEMINI_API_KEY;

  // Kontrola klíče až při volání funkce
  const isValidKey = rawKey && 
                     rawKey !== "undefined" && 
                     rawKey.trim().length > 0;

  if (!isValidKey) {
    return "AI analýza není nakonfigurována (chybí API klíč v .env).";
  }

  try {
    const genAI = new GoogleGenAI(rawKey as string);
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
