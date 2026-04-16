import { GoogleGenAI } from "@google/genai";

export const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY as string 
});

export const analyzeStyle = async (title: string, description: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are an expert art curator for MINKA creative. 
      Analyze the photographic/cinematic style of a work titled "${title}" described as "${description}".
      Provide a sophisticated, short critique (max 3 sentences) in Czech that explains the mood, lighting, and "creative pulse" of the work. 
      Make it sound professional, artistic, and modern.`,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Nepodařilo se vygenerovat analýzu. Zkuste to prosím později.";
  }
};
