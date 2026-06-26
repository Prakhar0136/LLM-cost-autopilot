import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import Groq from "groq-sdk";
dotenv.config();

const app = express();
const prisma = new PrismaClient();
app.use(cors());
app.use(express.json());

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

// Seed Models into Database if empty
async function seedModels() {
    const count = await prisma.modelRegistry.count();

    if (count === 0) {
        await prisma.modelRegistry.createMany({
            data: [
                {
                    model_name: "llama-3.1-8b-instant",
                    provider: "Groq",
                    tier: "simple",
                    in_cost_per_m: 0,
                    out_cost_per_m: 0,
                    latency_avg: 80
                },
                {
                    model_name: "llama-3.3-70b-versatile",
                    provider: "Groq",
                    tier: "moderate",
                    in_cost_per_m: 0,
                    out_cost_per_m: 0,
                    latency_avg: 250
                },
                {
                    model_name: "deepseek-r1-distill-llama-70b",
                    provider: "Groq",
                    tier: "complex",
                    in_cost_per_m: 0,
                    out_cost_per_m: 0,
                    latency_avg: 500,
                    role: "baseline verifier"
                }
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

        // Estimate input tokens (roughly 1 word ≈ 1.3 tokens)
        const estimatedInputTokens = prompt.split(/\s+/).length * 1.3;

        const completion = await groq.chat.completions.create({
            model: targetModel.model_name,
            messages: [
                {
                    role: "user",
                    content: prompt
                }
            ],
            temperature: 0.7
        });

        const responseText = completion.choices[0].message.content ?? "";

        // Estimate output tokens
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