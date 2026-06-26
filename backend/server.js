import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { GoogleGenAI } from '@google/generative-ai';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
app.use(cors());
app.use(express.json());

// Initialize Gemini SDK
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Seed Models into Database if empty
async function seedModels() {
    const count = await prisma.modelRegistry.count();
    if (count === 0) {
        await prisma.modelRegistry.createMany({
            data: [
                { model_name: "gemini-2.5-flash-lite", provider: "Google", tier: "simple", in_cost_per_m: 0.075, out_cost_per_m: 0.30, latency_avg: 400 },
                { model_name: "gemini-2.5-flash", provider: "Google", tier: "moderate", in_cost_per_m: 0.15, out_cost_per_m: 0.60, latency_avg: 600 },
                { model_name: "gemini-2.5-pro", provider: "Google", tier: "complex", in_cost_per_m: 1.25, out_cost_per_m: 5.00, latency_avg: 1200, role: "baseline verifier" }
            ]
        });
        console.log("🌱 Database seeded with model pricing configurations.");
    }
}
seedModels();

// CORE ROUTER ENDPOINT
app.post('/api/v1/completions', async (req, res) => {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: "Prompt is required" });

    const startTime = Date.now();

    try {
        // 1. Ask Python microservice to classify prompt complexity
        const mlResponse = await fetch(process.env.ML_SERVICE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt })
        });
        const { tier } = await mlResponse.json();

        // 2. Look up which model handles this tier from our registry
        const targetModel = await prisma.modelRegistry.findFirst({
            where: { tier: tier }
        }) || await prisma.modelRegistry.findFirst({ where: { tier: 'simple' } });

        // 3. Dispatch execution to the chosen LLM via its provider adapter
        console.log(`🔀 Routing prompt to [${targetModel.model_name}] due to [${tier}] classification.`);
        const modelInstance = ai.getGenerativeModel({ model: targetModel.model_name });

        // Simple rough token estimation logic (1 word ≈ 1.3 tokens)
        const estimatedInputTokens = prompt.split(/\s+/).length * 1.3;

        const result = await modelInstance.generateContent(prompt);
        const responseText = result.response.text();

        const estimatedOutputTokens = responseText.split(/\s+/).length * 1.3;
        const latency = Date.now() - startTime;

        // 4. Financial Calculations (Cost per 1M tokens)
        const actualCost = ((estimatedInputTokens * targetModel.in_cost_per_m) + (estimatedOutputTokens * targetModel.out_cost_per_m)) / 1000000;

        // Baseline Cost = What it would have cost if we sent everything to the premium model (gemini-2.5-pro)
        const premiumModel = await prisma.modelRegistry.findFirst({ where: { role: "baseline verifier" } });
        const baselineCost = ((estimatedInputTokens * premiumModel.in_cost_per_m) + (estimatedOutputTokens * premiumModel.out_cost_per_m)) / 1000000;

        const savedPct = baselineCost > 0 ? ((baselineCost - actualCost) / baselineCost) * 100 : 0;

        // 5. Log transaction audit trail to Database
        const log = await prisma.requestLog.create({
            data: {
                prompt_snippet: prompt.substring(0, 60) + "...",
                tier: tier,
                model_used: targetModel.model_name,
                cost_actual: actualCost,
                cost_baseline: baselineCost,
                saved_pct: savedPct,
                latency_ms: latency,
                status: "pending" // Will be evaluated async in Phase 5
            }
        });

        // 6. Return response directly to user
        return res.json({
            id: log.id,
            response: responseText,
            routing: {
                tier_assigned: tier,
                model_executed: targetModel.model_name,
                latency_ms: latency,
                cost_calculated: actualCost,
                savings_percentage: savedPct.toFixed(2) + "%"
            }
        });

    } catch (error) {
        console.error("Routing Error:", error);
        return res.status(500).json({ error: "Routing layer failure", details: error.message });
    }
});

// STATS ENDPOINT FOR FRONTEND DASHBOARD
app.get('/api/v1/stats', async (req, res) => {
    try {
        const logs = await prisma.requestLog.findMany();
        return res.json(logs);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 Autopilot router core operational on port ${PORT}`));