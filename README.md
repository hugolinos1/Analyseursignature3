# PDF Modification Checker (using Gemini AI)

This application allows users to upload a PDF file and uses the Google Gemini AI model to analyze each page for handwritten signatures, electronic signatures, and other annotations. It then provides an overall assessment of the document.

The application utilizes a serverless proxy function deployed on Netlify to handle communication with the Google Gemini API securely, without exposing the API key to the client-side.

## Key Features

*   PDF page-by-page analysis using Gemini AI.
*   Identifies handwritten signatures, electronic signatures, and other annotations.
*   Provides a summary of findings per page and an overall document classification.
*   Secure API key management using a Netlify serverless function.

## Project Structure Overview

*   `src/`: Contains the main React application source code.
    *   `App.tsx`: Main application component orchestrating the UI and logic.
    *   `components/`: Reusable React components for UI elements.
    *   `services/`:
        *   `geminiService.ts`: Client-side service responsible for calling the serverless proxy function.
        *   `pdfService.ts`: Service for processing PDF files (converting pages to images).
    *   `constants.ts`: Application-wide constants (e.g., Gemini model name, analysis prompts, JSON keys).
    *   `types.ts`: TypeScript type definitions.
*   `netlify/`:
    *   `functions/`: Contains the Netlify serverless function(s).
        *   `gemini-proxy.ts`: The serverless function that acts as a proxy to the Google Gemini API. It handles the API key securely and forwards requests from the client.
*   `netlify.toml`: Configuration file for Netlify, specifying the functions directory and other build/deployment settings.
*   `public/`: Static assets that are served directly.
*   `index.html`: The main HTML entry point for the Vite application.
*   `vite.config.ts`: Configuration for the Vite build tool.
*   `package.json`: Project dependencies, scripts, and metadata.
*   `README.md`: This file, providing guidance on setup, deployment, and troubleshooting.

## Environment Setup and Configuration

The Google Gemini API key is managed server-side by the Netlify proxy function. It should **not** be set or exposed in the client-side application.

### Local Development

To run the application locally, including the serverless proxy function:

1.  **Prerequisites:**
    *   Node.js (check `package.json` for recommended version, or use a recent LTS version).
    *   Netlify CLI: Install globally if you haven't already:
        ```bash
        npm install -g netlify-cli
        ```

2.  **Install Project Dependencies:**
    ```bash
    npm install
    ```

3.  **Log in to Netlify (if first time using Netlify CLI):**
    ```bash
    netlify login
    ```
    This will open a browser window to authenticate with Netlify.

4.  **Link to Netlify Site:**
    If this project is already deployed on Netlify, or you want to connect it to a new site:
    ```bash
    netlify link
    ```
    Follow the prompts to link to an existing site or create a new one. This is important for `netlify env:set`.

5.  **Set the Gemini API Key for Local Development:**
    This command stores the API key in Netlify's local environment settings for your linked site.
    ```bash
    netlify env:set GEMINI_API_KEY your_actual_gemini_api_key_here
    ```
    Replace `your_actual_gemini_api_key_here` with your valid Google Gemini API key.

6.  **Run the Development Server with Netlify Dev:**
    ```bash
    netlify dev
    ```
    This command starts the Vite development server (usually on `http://localhost:5173` or the port specified by Vite) AND the Netlify serverless functions locally. The `GEMINI_API_KEY` you set will be available as an environment variable to the `gemini-proxy.ts` function.

### Deployment to Netlify & Production API Key

The application is configured for easy deployment to Netlify.

1.  **Push your code to a Git repository** (GitHub, GitLab, Bitbucket).

2.  **Create a new site on Netlify from your Git repository.**
    *   Netlify should automatically detect the build settings from `vite.config.ts` and `netlify.toml`.
    *   **Build command:** `npm run build` (or `vite build`)
    *   **Publish directory:** `dist`
    *   **Functions directory:** `netlify/functions` (as specified in `netlify.toml`)

3.  **Configure the `GEMINI_API_KEY` in Netlify Site Settings:**
    *   In your Netlify site dashboard, go to **Site configuration** (or **Site settings**).
    *   Navigate to **Build & deploy** > **Environment**.
    *   Under **Environment variables**, click **Edit variables** (or **Add new variable**).
    *   Add the following environment variable:
        *   **Key:** `GEMINI_API_KEY`
        *   **Value:** Paste your **actual Google Gemini API key** here.
    *   Click **Save**.

    This ensures that the deployed `gemini-proxy` serverless function uses your API key when making calls to the Gemini API.

4.  **Trigger a deploy** if one hasn't started automatically after setting the environment variable.

## Troubleshooting

If you encounter issues, particularly error messages in the application UI referring to "Proxy request failed", "500 error", or "Failed to analyze image with Gemini API", it often indicates an issue within the serverless proxy function.

**Checking Netlify Function Logs:**

The most effective way to diagnose these server-side issues is by checking the logs for your Netlify function:

1.  Go to your site's dashboard on Netlify.
2.  Click on the **Functions** tab in the top navigation bar.
3.  You should see a list of your functions. Click on `gemini-proxy` (or `gemini-proxy.ts`).
4.  The logs for recent invocations of the function will be displayed. Look for error messages, stack traces, or any output from `console.error()` statements within the `gemini-proxy.ts` code.

These logs can provide detailed insights into:
*   Whether the `GEMINI_API_KEY` is missing or invalid on the server.
*   Errors returned directly from the Google Gemini API (e.g., authentication issues, quota limits, content blocking due to safety settings).
*   Errors in the proxy function's own logic (e.g., problems parsing the request body or formatting the response).
*   Timeout issues if the Gemini API call takes too long.

By examining these logs, you can pinpoint the cause of the error and take corrective action, whether it's updating the API key, adjusting the request, or modifying the proxy function code.
