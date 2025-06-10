import { GoogleGenAI, Part, HarmCategory, HarmBlockThreshold } from '@google/genai';
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

// Basic safety settings - adjust as needed
const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

const handler: Handler = async (event: HandlerEvent): Promise<HandlerResponse> => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ message: "OPTIONS request successful" }) };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: CORS_HEADERS, body: JSON.stringify({ error: "Method Not Allowed" }) };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY is not set in server-side environment variables.");
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: "API key not configured on the server." }) };
  }

  let requestBody: RequestBody;
  let rawBodyForErrorLog = event.body || "";
  try {
    if (!event.body) throw new Error("Request body is missing.");
    requestBody = JSON.parse(event.body);
  } catch (parseError: any) {
    console.error("Error parsing request body:", parseError.message, "Raw body:", rawBodyForErrorLog.substring(0, 500));
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: "Invalid request body: " + parseError.message }) };
  }

  const { imageBase64Data, mimeType, modelName, promptText } = requestBody;
  if (!imageBase64Data || !mimeType || !modelName || !promptText) {
    const missingFields = ["imageBase64Data", "mimeType", "modelName", "promptText"].filter(field => !requestBody[field as keyof RequestBody]);
    console.error("Missing required fields:", missingFields.join(', '));
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: `Missing required fields: ${missingFields.join(', ')}.` }) };
  }

  let geminiResponseText = ""; // For logging raw response text from Gemini in case of parsing error

  try {
    const genAI = new GoogleGenAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName, safetySettings });

    const imagePart: Part = { inlineData: { mimeType, data: imageBase64Data } };
    const textPart: Part = { text: promptText };

    console.log(`Calling Gemini API with model: ${modelName}. Prompt length: ${promptText.length}, Image mime-type: ${mimeType}, Image data length: ${imageBase64Data.length}`);

    const result = await model.generateContent({
        contents: [{ parts: [imagePart, textPart] }],
        generationConfig: { responseMimeType: "application/json" }
    });

    const responseFromGemini = result.response;
    geminiResponseText = responseFromGemini.text().trim();

    // Log feedback if present, even on success, for diagnostics
    if (responseFromGemini.promptFeedback) {
        console.log("Gemini API Prompt Feedback:", JSON.stringify(responseFromGemini.promptFeedback, null, 2));
        if (responseFromGemini.promptFeedback.blockReason) {
            // If blocked, this is a critical issue to report
            throw new Error(`Content blocked by Gemini due to: ${responseFromGemini.promptFeedback.blockReason}. Details: ${JSON.stringify(responseFromGemini.promptFeedback.safetyRatings)}`);
        }
    }

    const fenceRegex = /^```(?:json)?\s*\n?(.*?)\n?\s*```$/s;
    const match = geminiResponseText.match(fenceRegex);
    if (match && match[1]) {
      geminiResponseText = match[1].trim();
    }

    JSON.parse(geminiResponseText); // Validate JSON structure before sending

    return { statusCode: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" }, body: geminiResponseText };

  } catch (error: any) {
    console.error("Error during Gemini API call or processing its response:", error);

    let errorDetails: any = {
        message: error.message,
        stack: error.stack?.substring(0, 500) // Limit stack trace length
    };

    if (error.response && error.response.promptFeedback) {
        console.error("Gemini API Prompt Feedback (on error):", JSON.stringify(error.response.promptFeedback, null, 2));
        errorDetails.promptFeedback = error.response.promptFeedback;
    }

    // If the error is from parsing Gemini's response
    if (error instanceof SyntaxError && geminiResponseText) {
        errorDetails.message = "Failed to parse Gemini's response as JSON.";
        errorDetails.rawResponseExcerpt = geminiResponseText.substring(0, 200) + "...";
    }

    // If the error object has a 'details' property (common in Google API errors)
    if (error.details) {
        errorDetails.googleApiDetails = error.details;
    }

    // For network or other unexpected errors, the basic message and stack are primary.
    // The `error.toString()` can sometimes provide a concise summary.
    errorDetails.errorString = error.toString();

    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        error: "Failed to analyze image with Gemini API.",
        details: errorDetails
      }),
    };
  }
};

export { handler };
