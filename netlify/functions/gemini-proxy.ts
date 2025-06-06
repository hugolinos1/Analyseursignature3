import { GoogleGenAI, Part } from '@google/genai';
import type { Handler, HandlerEvent, HandlerResponse } from "@netlify/functions";

interface RequestBody {
  imageBase64Data: string;
  mimeType: string;
  modelName: string;
  promptText: string;
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const handler: Handler = async (event: HandlerEvent): Promise<HandlerResponse> => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: "OPTIONS request successful" }),
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY is not set in server-side environment variables.");
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "API key not configured on the server." }),
    };
  }

  let requestBody: RequestBody;
  let rawBodyForErrorLog = ""; // For logging in case of parsing error

  try {
    if (!event.body) {
      throw new Error("Request body is missing.");
    }
    rawBodyForErrorLog = event.body; // Store raw body before parsing
    requestBody = JSON.parse(event.body);
  } catch (error) {
    console.error("Error parsing request body:", error, "Raw body:", rawBodyForErrorLog);
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Invalid request body: " + (error as Error).message }),
    };
  }

  const { imageBase64Data, mimeType, modelName, promptText } = requestBody;

  if (!imageBase64Data || !mimeType || !modelName || !promptText) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Missing required fields: imageBase64Data, mimeType, modelName, promptText." }),
    };
  }

  let jsonTextFroGemini = ""; // To store raw text from Gemini for error logging

  try {
    const genAI = new GoogleGenAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });

    const imagePart: Part = {
      inlineData: {
        mimeType: mimeType,
        data: imageBase64Data,
      },
    };

    const textPart: Part = {
      text: promptText,
    };

    const result = await model.generateContent({
        contents: [{ parts: [imagePart, textPart] }],
        generationConfig: { responseMimeType: "application/json" }
    });

    const geminiResponse = result.response;
    jsonTextFroGemini = geminiResponse.text().trim();

    const fenceRegex = /^```(?:json)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonTextFroGemini.match(fenceRegex);
    if (match && match[1]) {
      jsonTextFroGemini = match[1].trim();
    }

    // Validate that jsonTextFroGemini is valid JSON before sending
    JSON.parse(jsonTextFroGemini); // This will throw an error if jsonTextFroGemini is not valid JSON

    return {
      statusCode: 200,
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "application/json",
      },
      body: jsonTextFroGemini, // Forward the cleaned JSON string from Gemini
    };

  } catch (error: any) {
    console.error("Error calling Gemini API or processing its response:", error);
    let errorMessage = error.message || "An unknown error occurred with the Gemini API call.";
    if (error.response?.promptFeedback) {
        console.error("Gemini API Prompt Feedback:", error.response.promptFeedback);
        errorMessage += ` (Gemini feedback: ${JSON.stringify(error.response.promptFeedback)})`;
    } else if (error instanceof SyntaxError) { // Specifically catch JSON parsing errors for Gemini's response
        errorMessage = `Failed to parse Gemini's response as JSON. Raw response excerpt: ${jsonTextFroGemini.substring(0, 200)}...`;
    }
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Failed to analyze image with Gemini API.", details: errorMessage }),
    };
  }
};

export { handler };
