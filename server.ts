import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

let aiClient: GoogleGenAI | null = null;

function getAi() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is missing");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

const CANDIDATE_MODELS = [
  "gemini-3.8-flash",
  "gemini-flash-latest",
  "gemini-3.1-flash-lite",
];

async function generateWithFallbackAndRetry(
  prompt: string,
  temperature: number = 0.7
): Promise<string> {
  const ai = getAi();
  let lastError: unknown = null;

  for (const model of CANDIDATE_MODELS) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            temperature,
          },
        });

        const text = response.text ? response.text.trim() : "";
        if (text) {
          return text;
        }
      } catch (err: unknown) {
        lastError = err;
        const errObj = err as Record<string, unknown>;
        const code = errObj?.status || errObj?.code || errObj?.statusCode;
        const msg = String(errObj?.message || "");
        console.warn(
          `Gemini attempt ${attempt} for model '${model}' encountered error (code ${code}): ${msg}`
        );

        // Check for 503 (high demand), 429 (rate limit), or network hiccups
        const isTransient =
          code === 503 ||
          code === 429 ||
          msg.includes("503") ||
          msg.includes("UNAVAILABLE") ||
          msg.includes("high demand") ||
          msg.includes("ResourceExhausted") ||
          msg.includes("overloaded");

        if (isTransient && attempt < 2) {
          await new Promise((r) => setTimeout(r, 600));
          continue;
        }

        // Try next candidate model if high demand / unavailable
        break;
      }
    }
  }

  throw lastError || new Error("All AI models failed to respond");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "5mb" }));

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // 1. Polish Professional Summary
  app.post("/api/ai/improve-summary", async (req, res) => {
    try {
      const { text, jobTitle, experienceYears } = req.body;
      if (!text || typeof text !== "string" || !text.trim()) {
        res.status(400).json({ error: "Please provide a rough summary to improve." });
        return;
      }

      const prompt = `You are a world-class professional resume editor and career coach.
The user provided rough summary text: "${text.trim()}".
${jobTitle ? `Target/Current Job Title: "${jobTitle}"` : ""}
${experienceYears ? `Years of Experience: "${experienceYears}"` : ""}

Task: Rewrite this into a polished, high-impact, professional 2-3 sentence executive summary suitable for top employers and ATS scanners.
Highlight core value, strengths, and professional mindset.
Keep it concise, active, and confident.
Do NOT include markdown asterisks, bolding, bullet points, headers, or quotes. Output ONLY the rewritten 2-3 sentence paragraph.`;

      const improved = await generateWithFallbackAndRetry(prompt, 0.7);

      res.json({ result: improved });
    } catch (err: unknown) {
      console.error("Error in /api/ai/improve-summary:", err);
      res.status(500).json({ error: "Could not generate, please try again" });
    }
  });

  // 2. Improve Work Experience Bullet Points
  app.post("/api/ai/improve-job-bullets", async (req, res) => {
    try {
      const { roughNotes, jobTitle, company } = req.body;
      if (!roughNotes || typeof roughNotes !== "string" || !roughNotes.trim()) {
        res.status(400).json({ error: "Please provide notes or responsibilities to improve." });
        return;
      }

      const prompt = `You are an elite executive resume writer.
The user provided rough notes for a job position:
${jobTitle ? `Job Title: "${jobTitle}"` : ""}
${company ? `Company: "${company}"` : ""}
Rough notes: "${roughNotes.trim()}"

Task: Convert these rough notes into 3 to 4 polished, achievement-focused, metrics-oriented resume bullet points.
Guidelines:
- Start every bullet point with a strong, active power verb (e.g. Architected, Accelerated, Spearheaded, Streamlined, Orchestrated).
- Highlight tangible results, efficiencies gained, or business impact.
- Keep each bullet crisp and concise (1-2 lines).
- Format each item on a separate line starting with "• " (bullet symbol followed by space).
- Do NOT wrap in quotes, do not add introductory phrases or markdown headings.`;

      const improved = await generateWithFallbackAndRetry(prompt, 0.7);

      // Parse into array of clean bullet strings
      const lines = improved
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .map((line) => line.replace(/^[-*•\d.)\s]+/, "").trim())
        .filter((line) => line.length > 0);

      res.json({
        raw: improved,
        bullets: lines.length > 0 ? lines : [improved],
      });
    } catch (err: unknown) {
      console.error("Error in /api/ai/improve-job-bullets:", err);
      res.status(500).json({ error: "Could not generate, please try again" });
    }
  });

  // 3. Improve Project Description
  app.post("/api/ai/improve-project", async (req, res) => {
    try {
      const { projectName, roughDescription } = req.body;
      if (!roughDescription || typeof roughDescription !== "string" || !roughDescription.trim()) {
        res.status(400).json({ error: "Please provide a rough project description." });
        return;
      }

      const prompt = `You are an expert technical resume writer.
Project Name: "${projectName || "Featured Project"}"
Rough Description: "${roughDescription.trim()}"

Task: Rewrite this into 1-2 polished, achievement-oriented, concise sentences for a resume project section.
Highlight key technologies, problem solved, and impact.
Return plain text only without markdown formatting, quotes, or preambles.`;

      const improved = await generateWithFallbackAndRetry(prompt, 0.7);

      res.json({ result: improved });
    } catch (err: unknown) {
      console.error("Error in /api/ai/improve-project:", err);
      res.status(500).json({ error: "Could not generate, please try again" });
    }
  });

  // 4. Suggest Skills based on job title / keywords
  app.post("/api/ai/suggest-skills", async (req, res) => {
    try {
      const { jobTitle, existingSkills } = req.body;
      const prompt = `You are a tech recruiter. Based on the target job title "${jobTitle || "Software Engineer"}", provide a comma-separated list of 8-10 high-value, contemporary hard and soft skills.
Exclude any of these already present skills: ${(existingSkills || []).join(", ")}.
Return ONLY the comma-separated skill names, with no extra text.`;

      const text = await generateWithFallbackAndRetry(prompt, 0.7);
      const skills = text
        .split(",")
        .map((s) => s.trim().replace(/^[-*•\s]+/, ""))
        .filter((s) => s.length > 0 && s.length < 40);

      res.json({ skills });
    } catch (err: unknown) {
      console.error("Error in /api/ai/suggest-skills:", err);
      res.status(500).json({ error: "Could not generate, please try again" });
    }
  });

  // Vite middleware in dev or static files in prod
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`ResumeCraft AI server running on http://localhost:${PORT}`);
  });
}

startServer();
