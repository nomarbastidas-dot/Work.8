
import { GoogleGenAI } from "@google/genai";
import { Service, StyleRecommendation } from '../types';

// Use process.env.API_KEY directly as per guidelines
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getStyleRecommendation = async (
  styleInput: string,
  allServices: Service[]
): Promise<StyleRecommendation> => {
  const serviceListString = JSON.stringify(allServices.map(s => ({ 
      id: s.id, 
      name: s.name, 
      duration: s.duration, 
      barberTypes: s.barberType 
  })));

  // Note: When using googleSearch tool, we follow the practice of prompting for JSON and parsing manually.
  const systemPrompt = `Eres un estilista profesional de barbería. Analiza la descripción del estilo del usuario.
  
  Tus objetivos:
  1. Identificar qué servicios de nuestra lista (IDs) necesita el cliente.
  2. Determinar el tipo de barbero requerido.
  3. Buscar en internet referencias visuales (imágenes) que coincidan con ese estilo.
  4. Explicar por qué elegiste esos servicios.

  IMPORTANTE: Debes responder ESTRICTAMENTE con un objeto JSON válido (sin markdown, sin bloques de código \`\`\`).
  El JSON debe tener esta estructura:
  {
    "recommendedServices": ["id1", "id2"],
    "barberTypeRequired": "Tipo de Barbero",
    "explanation": "Texto explicativo...",
    "imageUrls": ["url_imagen_1", "url_imagen_2"] 
  }
  
  Para "imageUrls", intenta extraer URLs directas de imágenes de los resultados de búsqueda que representen el estilo. Si no encuentras URLs directas de imágenes, deja el array vacío.`;
  
  const userQuery = `El cliente quiere: "${styleInput}". 
  Lista de servicios disponibles: ${serviceListString}. 
  Busca estilos visuales en internet para sugerir.`;

  try {
    const response = await ai.models.generateContent({
        // Using gemini-3-flash-preview for basic text and search tasks
        model: 'gemini-3-flash-preview',
        contents: userQuery,
        config: {
            systemInstruction: systemPrompt,
            tools: [{ googleSearch: {} }], // Enable Search Grounding
        }
    });

    // Extract Text (GenerateContentResponse.text)
    let jsonText = response.text || "{}";
    
    // Clean Markdown code blocks if present
    jsonText = jsonText.replace(/```json/g, '').replace(/```/g, '').trim();

    let result: StyleRecommendation;
    try {
        result = JSON.parse(jsonText);
    } catch (e) {
        console.error("Failed to parse JSON from Gemini response:", jsonText);
        result = {
            recommendedServices: [],
            barberTypeRequired: "Estilista Senior",
            explanation: "No pudimos procesar la recomendación automática, pero un profesional te asesorará.",
            imageUrls: []
        };
    }

    // Extract Grounding Metadata (Web Sources)
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const webSources: { title: string; uri: string }[] = [];

    if (groundingChunks) {
        groundingChunks.forEach((chunk: any) => {
            if (chunk.web) {
                webSources.push({
                    title: chunk.web.title || "Fuente Web",
                    uri: chunk.web.uri
                });
            }
        });
    }

    result.webSources = webSources;
    return result;

  } catch (error) {
      console.error("Error fetching style recommendation from Gemini:", error);
      throw new Error("Failed to get style recommendation.");
  }
};

export const generateProductDescription = async (
    productName: string,
    productDesc: string
): Promise<string> => {
    const systemPrompt = "Eres un redactor experto en marketing de productos de barbería. Tu objetivo es crear descripciones de alta conversión, enfatizando los beneficios y la calidad. Responde ÚNICAMENTE con la descripción generada. Debe ser concisa (máximo 4 oraciones) y persuasiva.";
    
    const userQuery = `Genera una descripción de venta de alta conversión para este producto: Nombre: "${productName}". Descripción básica: "${productDesc}".`;

    try {
        const response = await ai.models.generateContent({
            // Using gemini-3-flash-preview for basic text tasks
            model: 'gemini-3-flash-preview',
            contents: userQuery,
            config: {
                systemInstruction: systemPrompt,
            }
        });
        return response.text?.trim() || '';
    } catch (error) {
        console.error("Error fetching product description from Gemini:", error);
        throw new Error("Failed to generate product description.");
    }
};
