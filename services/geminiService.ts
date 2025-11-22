import { GoogleGenAI } from "@google/genai";
import { RoomNode, SystemStatus } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

const SYSTEM_PROMPT = `
You are AERO-12, an advanced AI home operating system. 
Your responses should be brief, technical, and sound like a sci-fi ship computer or advanced HUD interface.
Do not use markdown formatting like bold or italics excessively. Keep it raw and data-driven.
Limit response to 40 words max unless requested for a full report.
`;

export const generateSystemInsight = async (
  rooms: RoomNode[],
  status: SystemStatus,
  query: string
): Promise<string> => {
  try {
    const stateDescription = JSON.stringify({
      globalStatus: status,
      roomData: rooms.map(r => ({ 
        name: r.name, 
        temp: r.temp, 
        power: r.power, 
        lights: r.lights,
        devices: r.devices.map(d => `${d.name}: ${d.status}`)
      }))
    });

    const prompt = `
      ${SYSTEM_PROMPT}
      Current System State: ${stateDescription}
      User Command: ${query}
      
      Execute command and provide response.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "SYSTEM ERROR: NO RESPONSE DATA";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "CONNECTION ERROR: UNABLE TO REACH AI CORE.";
  }
};