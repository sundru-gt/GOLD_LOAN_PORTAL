/**
 * AI Loan Assist Agent – Backend Route
 *
 * Uses Google Gemini with function calling (tools) to answer loan queries.
 * The LLM NEVER performs arithmetic itself – it calls backend tools.
 *
 * Tools:
 *   get_loan_schemes()          – Returns available loan plans
 *   calculate_quote(...)        – Calls /quotes API for exact calculation
 *   submit_application(...)     – Calls /leads API after explicit confirmation
 *
 * Guardrails:
 *   - Declines off-topic questions politely
 *   - No investment advice
 *   - No approval promises
 *   - Handles validation errors gracefully
 */

import { Router, Request, Response } from "express";
import { GoogleGenerativeAI, FunctionDeclaration, Tool } from "@google/generative-ai";
import axios from "axios";
import { asyncHandler, buildError } from "../utils/errorUtils";
import { maskMobile } from "../utils/mathUtils";

const router = Router();

// ─── Gemini setup ──────────────────────────────────────────────────────────────

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set in environment variables");
  }
  return new GoogleGenerativeAI(apiKey);
}

// ─── Tool definitions for Gemini function calling ─────────────────────────────

const loanAgentTools: Tool[] = [
  {
    functionDeclarations: [
      {
        name: "get_loan_schemes",
        description:
          "Retrieves all available gold loan plans with their interest rates, tenure, and LTV ratios. Call this first to show users available options.",
        parameters: {
          type: "object" as const,
          properties: {},
          required: [],
        },
      } as FunctionDeclaration,
      {
        name: "calculate_quote",
        description:
          "Calculates the eligible loan amount for given gold details across all plans. The LLM must NEVER calculate this manually – always use this tool for any math.",
        parameters: {
          type: "object" as const,
          properties: {
            netWeightGrams: {
              type: "number",
              description: "Net weight of gold in grams (after deducting stone/making charges)",
            },
            grossWeightGrams: {
              type: "number",
              description: "Gross weight of gold jewellery in grams",
            },
            karat: {
              type: "number",
              description: "Gold purity - must be exactly 18, 22, or 24",
            },
          },
          required: ["netWeightGrams", "grossWeightGrams", "karat"],
        },
      } as FunctionDeclaration,
      {
        name: "submit_application",
        description:
          "Submits the gold loan application ONLY after user explicitly confirms. Always show a summary first and ask for confirmation before calling this tool.",
        parameters: {
          type: "object" as const,
          properties: {
            name: {
              type: "string",
              description: "Full name of applicant (2-60 chars, letters and spaces only)",
            },
            mobile: {
              type: "string",
              description: "10-digit Indian mobile number starting with 6-9",
            },
            grossWeightGrams: {
              type: "number",
              description: "Gross weight in grams",
            },
            netWeightGrams: {
              type: "number",
              description: "Net weight in grams",
            },
            karat: {
              type: "number",
              description: "Gold purity (18, 22, or 24)",
            },
            planId: {
              type: "string",
              description: "MongoDB ObjectId of the selected loan plan",
            },
          },
          required: ["name", "mobile", "grossWeightGrams", "netWeightGrams", "karat", "planId"],
        },
      } as FunctionDeclaration,
    ],
  },
];

// ─── Tool execution handlers ───────────────────────────────────────────────────

const BASE_URL = `http://localhost:${process.env.PORT || 4000}/api/v1`;

async function executeTool(
  toolName: string,
  args: Record<string, unknown>
): Promise<unknown> {
  switch (toolName) {
    case "get_loan_schemes": {
      const res = await axios.get(`${BASE_URL}/loan-schemes`);
      return res.data;
    }

    case "calculate_quote": {
      const res = await axios.post(`${BASE_URL}/quotes`, {
        netWeightGrams: args.netWeightGrams,
        grossWeightGrams: args.grossWeightGrams,
        karat: args.karat,
      });
      return res.data;
    }

    case "submit_application": {
      // IMPORTANT: Mask mobile in any internal logs
      console.log("[AI Agent] submit_application called for mobile:", maskMobile(String(args.mobile)));
      const res = await axios.post(`${BASE_URL}/leads`, args);
      return res.data;
    }

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

// ─── System prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a friendly and professional Gold Loan Assistant for our financial institution.

Your role is to help customers understand gold loan options and submit applications.

STRICT RULES you must follow at all times:
1. NEVER perform mathematical calculations yourself. ALWAYS use the calculate_quote tool for any loan math.
2. NEVER promise loan approval – say "eligible amount" not "approved amount".
3. NEVER give investment advice or market predictions.
4. Politely decline all off-topic questions (not related to gold loans).
5. Before submitting an application, always:
   a. Show a clear summary of all details
   b. Explicitly ask "Do you confirm this application? (Yes/No)"
   c. Only call submit_application if the user clearly says "yes" or "confirm".
6. If you get a validation error, explain what the user needs to fix in plain language.
7. Always collect: name, mobile number, gross weight, net weight, and gold karat before calculating.

Tone: Professional, warm, and concise. Use ₹ symbol for rupees.`;

// ─── Chat endpoint ─────────────────────────────────────────────────────────────

router.post(
  "/chat",
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { message, history = [] } = req.body;

    if (!message || typeof message !== "string") {
      res.status(400).json(buildError(400, "message is required", []));
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(503).json(
        buildError(503, "AI service is not configured. Please set GEMINI_API_KEY.", [])
      );
      return;
    }

    try {
      const genAI = getGeminiClient();
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        systemInstruction: SYSTEM_PROMPT,
        tools: loanAgentTools,
      });

      // Build chat history from prior turns
      const chat = model.startChat({
        history: history.map((h: { role: string; text: string }) => ({
          role: h.role,
          parts: [{ text: h.text }],
        })),
      });

      // ── Agentic loop: handle function calling ────────────────────────────
      let result = await chat.sendMessage(message);
      let response = result.response;

      // Loop while the model wants to call functions
      while (response.functionCalls()?.length) {
        const functionCalls = response.functionCalls()!;
        const functionResults = [];

        for (const call of functionCalls) {
          try {
            const toolResult = await executeTool(
              call.name,
              call.args as Record<string, unknown>
            );
            functionResults.push({
              functionResponse: {
                name: call.name,
                response: { result: toolResult },
              },
            });
          } catch (toolErr: unknown) {
            // Handle API errors (e.g., 409 Conflict, 400 Validation)
            let errorMsg = "Tool execution failed";
            if (axios.isAxiosError(toolErr) && toolErr.response?.data) {
              errorMsg = JSON.stringify(toolErr.response.data);
            }
            functionResults.push({
              functionResponse: {
                name: call.name,
                response: { error: errorMsg },
              },
            });
          }
        }

        // Send tool results back to model
        result = await chat.sendMessage(functionResults);
        response = result.response;
      }

      const text = response.text();

      res.json({
        success: true,
        reply: text,
        // Return updated history for stateless clients
        history: [
          ...history,
          { role: "user", text: message },
          { role: "model", text },
        ],
      });
    } catch (err: unknown) {
      console.error("[AI Agent Error]", err);
      if (axios.isAxiosError(err)) {
        res.status(502).json(
          buildError(502, "AI service communication error", [])
        );
        return;
      }
      throw err;
    }
  })
);

export default router;
