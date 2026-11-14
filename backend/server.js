
import express from "express";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
const PORT = 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "../frontend")));

if (!process.env.GEMINI_API_KEY) {
    console.error("ERROR: GEMINI_API_KEY is missing from backend/.env");
    process.exit(1);
}

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

const MODEL = "gemini-3.6-flash";

// Helper: ask Gemini for structured JSON

async function generateContentWithRetry(request, maxAttempts = 3) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await ai.models.generateContent(request);
        } catch (error) {
            const status = Number(error?.status);
            const message = error?.message || "";

            const temporaryError =
                [429, 500, 502, 503, 504].includes(status) ||
                /UNAVAILABLE|RESOURCE_EXHAUSTED|high demand/i.test(message);

            if (!temporaryError || attempt === maxAttempts) {
                throw error;
            }

            console.log(
                `Gemini temporarily unavailable. Retrying (${attempt}/${maxAttempts})...`
            );

            await new Promise(resolve =>
                setTimeout(resolve, 1500 * attempt)
            );
        }
    }
}

async function generateJSON(prompt) {
    const response = await generateContentWithRetry({
        model: MODEL,
        contents: prompt
    });

    let answer = response.text;

    if (!answer) {
        throw new Error("Gemini returned an empty response.");
    }

    answer = answer
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/, "")
        .trim();

    return JSON.parse(answer);
}

// Backend status
app.get("/api/status", (req, res) => {
    res.json({
        message: "KODZIVA backend is running!",
        aiProvider: "Google Gemini"
    });
});

// Existing AI features
app.post("/api/generate", async (req, res) => {
    try {
        const { prompt, language, feature } = req.body;

        if (
            typeof prompt !== "string" ||
            !prompt.trim() ||
            typeof language !== "string" ||
            !language.trim()
        ) {
            return res.status(400).json({
                error: "Please provide a valid prompt and language."
            });
        }

        const featureInstructions = {
            generate: `
                Generate a complete working program.
                Explain the logic and important lines.
                Include sample input and output.
            `,
            debug: `
                Identify syntax, logical and runtime errors.
                Explain why they happen.
                Provide corrected complete code.
                Explain every correction.
                Do not invent errors.
            `,
            dissect: `
                Explain the supplied program line by line.
                Describe variables, functions, loops and conditions.
                Use simple language.
            `,
            trace: `
                Trace execution step by step.
                Show variable values as they change.
                Explain loops and conditions.
                Do not claim to have executed the code.
            `,
            viva: `
                Generate 10 viva questions with answers.
                Include beginner, intermediate and challenging questions.
            `
        };

        const task = featureInstructions[feature] ||
            featureInstructions.generate;

        const response = await generateContentWithRetry({
            model: MODEL,
            contents: `
You are KODZIVA, a friendly AI coding tutor.

Programming language: ${language}

Task:
${task}

User's request or code:
${prompt}

Use simple language.
Format code clearly.
Do not invent compiler results or claim code was executed.
`
        });

        if (!response.text) {
            throw new Error("Gemini returned an empty response.");
        }

        res.json({
            result: response.text,
            provider: "Google Gemini"
        });

    } catch (error) {
        console.error("KODZIVA generation error:", error);

        res.status(500).json({
            error: "Gemini AI request failed.",
            details: error.message
        });
    }
});

// NEW FEATURE 1: Generate interactive viva questions
app.post("/api/viva/start", async (req, res) => {
    try {
        const { code, language } = req.body;

        if (
            typeof code !== "string" ||
            !code.trim() ||
            typeof language !== "string" ||
            !language.trim()
        ) {
            return res.status(400).json({
                error: "Please provide code and programming language."
            });
        }

        const questions = await generateJSON(`
You are KODZIVA, an expert programming viva examiner.

Programming language: ${language}

Student's code:
${code}

Create exactly 10 viva questions based on this code.

Include:
- 4 beginner questions
- 4 intermediate questions
- 2 challenging questions

Questions must be relevant to the supplied code.

Return ONLY valid JSON in this exact format:
{
  "questions": [
    {
      "question": "Question text",
      "difficulty": "Beginner"
    }
  ]
}

Do not include answers.
Do not include Markdown or code fences.
`);

        if (
            !Array.isArray(questions.questions) ||
            questions.questions.length !== 10 ||
            !questions.questions.every(q =>
                typeof q.question === "string" &&
                typeof q.difficulty === "string"
            )
        ) {
            throw new Error("Gemini returned an invalid question set.");
        }

        res.json({
            questions: questions.questions
        });

    } catch (error) {
        console.error("Viva start error:", error);

        res.status(500).json({
            error: "Could not generate viva questions.",
            details: error.message
        });
    }
});

// NEW FEATURE 2: Evaluate student's viva answer
app.post("/api/viva/evaluate", async (req, res) => {
    try {
        const { code, language, question, userAnswer } = req.body;

        if (
            typeof code !== "string" ||
            !code.trim() ||
            typeof language !== "string" ||
            !language.trim() ||
            typeof question !== "string" ||
            !question.trim() ||
            typeof userAnswer !== "string" ||
            !userAnswer.trim()
        ) {
            return res.status(400).json({
                error: "Please provide all viva answer details."
            });
        }

        const evaluation = await generateJSON(`
You are KODZIVA, a fair and encouraging programming viva examiner.

Programming language: ${language}

Student's code:
${code}

Viva question:
${question}

Student's answer:
${userAnswer}

Evaluate the answer fairly.
Accept different correct ways of explaining a concept.
Do not give full marks to an incorrect answer.

Return ONLY valid JSON in this exact format:
{
  "score": 8,
  "correct": true,
  "feedback": "Your explanation is correct.",
  "idealAnswer": "A clear and complete answer."
}

Rules:
- score must be an integer from 0 to 10.
- correct must be true or false.
- feedback must be short and encouraging.
- idealAnswer must explain the correct concept simply.
- Do not include Markdown or code fences.
`);

        if (
            !Number.isInteger(evaluation.score) ||
            evaluation.score < 0 ||
            evaluation.score > 10 ||
            typeof evaluation.correct !== "boolean" ||
            typeof evaluation.feedback !== "string" ||
            typeof evaluation.idealAnswer !== "string"
        ) {
            throw new Error("Gemini returned an invalid evaluation.");
        }

        res.json(evaluation);

    } catch (error) {
        console.error("Viva evaluation error:", error);

        res.status(500).json({
            error: "Could not evaluate your answer.",
            details: error.message
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`KODZIVA is running at http://localhost:${PORT}`);
    console.log("AI Provider: Google Gemini");
    console.log("Interactive Viva API: Ready");
});
