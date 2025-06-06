# PDF Modification Checker (using Gemini AI)

This application allows users to upload a PDF file and uses the Gemini AI model to analyze each page for handwritten signatures, electronic signatures, and other annotations. It then provides an overall assessment of the document.

The application utilizes a serverless proxy function deployed on Netlify to handle communication with the Google Gemini API.

## Local Development

**Prerequisites:** Node.js (version specified in `package.json` engines, or latest LTS)

1.  **Install dependencies:**
    ```bash
    npm install
    ```
2.  **Run the development server:**
    ```bash
    npm run dev
    ```
    The application will be accessible at `http://localhost:5173` (or another port if 5173 is busy).

    **Note on Local API Access:** For local development, the application calls a Netlify serverless function endpoint (`/.netlify/functions/gemini-proxy`). To make this work locally and have the function use an API key, you can use the Netlify CLI:
    *   Install Netlify CLI: `npm install -g netlify-cli`
    *   Log in: `netlify login`
    *   Set your Gemini API key locally for the Netlify CLI to use:
        ```bash
        netlify env:set GEMINI_API_KEY your_actual_gemini_api_key
        ```
        (Replace `your_actual_gemini_api_key` with your key). This command might ask you to link the project to a Netlify site or create one.
    *   Run the development environment with Netlify Dev:
        ```bash
        netlify dev
        ```
        Netlify Dev will run your Vite development server and the serverless functions, making the `GEMINI_API_KEY` available to your local proxy function.

## Deployment and API Key Configuration (Netlify)

This project is set up for deployment on Netlify, including a serverless function that proxies requests to the Gemini API.

To deploy and configure the application correctly:

1.  **Connect your Git repository to Netlify:**
    *   Push your project to a GitHub, GitLab, or Bitbucket repository.
    *   In Netlify, create a new site from this Git repository.

2.  **Configure Build Settings (usually auto-detected):**
    *   **Build command:** `npm run build` (or `vite build`)
    *   **Publish directory:** `dist`
    *   **Functions directory:** `netlify/functions` (This should be set in `netlify.toml` and usually detected automatically by Netlify).

3.  **Set the Gemini API Key in Netlify:**
    *   Navigate to your site's dashboard on Netlify.
    *   Go to **Site configuration** (or **Site settings**) > **Build & deploy** > **Environment**.
    *   Under **Environment variables**, click **Edit variables** (or **Add new variable**).
    *   Add a new variable:
        *   **Key:** `GEMINI_API_KEY`
        *   **Value:** Paste your actual Google Gemini API key here.
    *   Click **Save**.

    This `GEMINI_API_KEY` will be securely available to the `gemini-proxy` serverless function during its execution, allowing it to authenticate with the Google Gemini API. The API key is **not** exposed to the client-side application.

4.  **Deploy:**
    *   Trigger a deploy in Netlify (e.g., by pushing to your main branch, or manually via the Netlify UI).

## Project Structure

*   `src/`: Contains the main React application source code.
    *   `components/`: Reusable UI components.
    *   `services/`: Modules for interacting with external services (e.g., `geminiService.ts` which calls the proxy).
    *   `App.tsx`: Main application component.
    *   `constants.ts`: Application-wide constants (e.g., prompts, model names).
*   `netlify/`:
    *   `functions/`: Contains serverless function code.
        *   `gemini-proxy.ts`: The serverless function that securely calls the Gemini API.
*   `netlify.toml`: Netlify configuration file, specifying the functions directory.
*   `public/`: Static assets.
*   `index.html`: Main HTML entry point.
*   `vite.config.ts`: Vite build configuration.
*   `package.json`: Project dependencies and scripts.
---

**Note on API Security:** The Gemini API key is handled server-side by the Netlify function. It is crucial **not** to expose this key in your client-side code or commit it to your repository if you were to ever handle it differently. The current setup using Netlify environment variables is a secure way to manage the API key for the proxy function.
