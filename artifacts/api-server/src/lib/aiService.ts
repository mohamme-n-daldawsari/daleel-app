import Anthropic from "@anthropic-ai/sdk";
import { getDemoAnalysis } from "./demoData";
import { logger } from "./logger";

const hasAiKey = Boolean(
  process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL &&
  process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
);

let anthropicClient: Anthropic | null = null;

if (hasAiKey) {
  anthropicClient = new Anthropic({
    baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
    apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
  });
}

const ANALYSIS_SYSTEM_PROMPT = `You are Daleel (دليل), an AI assistant that analyzes contracts and service agreements.
Your job is to extract important information from contracts and present it in a clear, structured JSON format.
Be thorough but concise. Always respond in valid JSON only — no markdown, no explanation outside JSON.
For Arabic contracts respond with Arabic text. For English contracts respond in English.
For mixed contracts, respond in Arabic.

IMPORTANT: Never display internal reasoning. Only output the final structured result.
Never describe a clause as illegal. Use careful language like "may require attention" or "consider reviewing carefully."

Risk levels:
- low: normal terms the user should know
- medium: clause that may create additional commitment  
- high: clause that may cause financial loss or significantly limit user rights`;

const ANALYSIS_USER_PROMPT = (text: string, contractType: string, explanationLevel: string, outputLanguage: string) => `
Analyze this ${contractType} contract and extract all important information.
Explanation level: ${explanationLevel} (simple=very basic Arabic, standard=clear Arabic, detailed=comprehensive Arabic)
Output language: ${outputLanguage}

Contract text:
${text.slice(0, 15000)}

Respond with ONLY valid JSON in this exact structure:
{
  "contractType": "${contractType}",
  "title": "contract title",
  "summary": "2-3 sentence summary",
  "parties": [{"name": "name", "role": "role"}],
  "startDate": "YYYY-MM-DD or null",
  "endDate": "YYYY-MM-DD or null",
  "duration": "duration text or null",
  "totalCost": number or null,
  "currency": "SAR or USD or null",
  "monthlyPayment": number or null,
  "annualPayment": number or null,
  "deposit": number or null,
  "automaticRenewal": true/false/null,
  "renewalNoticeDays": number or null,
  "cancellationAllowed": true/false/null,
  "cancellationNoticeDays": number or null,
  "earlyCancellationPenalty": number or null,
  "refundPolicy": "text or null",
  "trialPeriodDays": number or null,
  "clarityScore": 0-100,
  "clarityExplanation": "explanation of clarity score",
  "confidence": 0.0-1.0,
  "clauses": [
    {
      "category": "renewal|cancellation|payment|privacy|liability|maintenance|non_compete|warranty|general",
      "title": "clause title",
      "simpleExplanation": "clear simple explanation",
      "riskLevel": "low|medium|high",
      "sourcePage": number or null,
      "sourceText": "exact quote from contract or null"
    }
  ],
  "financialDetails": [
    {"type": "monthly_payment|annual_payment|deposit|tax|fee|penalty|refund|bonus", "amount": number, "currency": "SAR", "description": "text", "sourcePage": null}
  ],
  "contractDates": [
    {"type": "start|end|renewal|payment|cancellation_deadline|trial_end|warranty_end|probation_end", "date": "YYYY-MM-DD", "description": "text", "sourcePage": null}
  ],
  "suggestedQuestions": ["question 1", "question 2", "question 3", "question 4"]
}`;

const QA_SYSTEM_PROMPT = `You are Daleel (دليل), an AI assistant for contract analysis.
Answer questions about contracts based ONLY on the provided contract text.
Be concise and clear. If the answer is not in the contract, say so clearly.
For Arabic questions, answer in Arabic. For English questions, answer in English.
When mentioning specific clauses, include the source page if available.
Never invent information that is not in the contract.
Never provide legal advice — only explain what the contract says.`;

const COMPARE_SYSTEM_PROMPT = `You are Daleel (دليل), a neutral AI contract comparison assistant.
Compare two contracts objectively. Do not recommend one over the other — present the differences clearly and let the user decide.
Respond in Arabic by default.`;

export interface AnalysisResult {
  contractType: string;
  title: string;
  summary: string;
  parties: { name: string; role: string }[];
  startDate: string | null;
  endDate: string | null;
  duration: string | null;
  totalCost: number | null;
  currency: string | null;
  monthlyPayment: number | null;
  annualPayment: number | null;
  deposit: number | null;
  automaticRenewal: boolean | null;
  renewalNoticeDays: number | null;
  cancellationAllowed: boolean | null;
  cancellationNoticeDays: number | null;
  earlyCancellationPenalty: number | null;
  refundPolicy: string | null;
  trialPeriodDays: number | null;
  clarityScore: number;
  clarityExplanation: string;
  confidence: number;
  clauses: {
    category: string;
    title: string;
    simpleExplanation: string;
    riskLevel: string;
    sourcePage: number | null;
    sourceText: string | null;
  }[];
  financialDetails: {
    type: string;
    amount: number;
    currency: string;
    description: string | null;
    sourcePage: number | null;
  }[];
  contractDates: {
    type: string;
    date: string;
    description: string | null;
    sourcePage: number | null;
  }[];
  suggestedQuestions: string[];
}

export async function analyzeContract(
  text: string,
  contractType: string,
  explanationLevel: string = "standard",
  outputLanguage: string = "ar",
): Promise<AnalysisResult> {
  if (!anthropicClient) {
    logger.info("No AI key — using demo analysis");
    return getDemoAnalysis(contractType) as AnalysisResult;
  }

  try {
    const response = await anthropicClient.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4000,
      system: ANALYSIS_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: ANALYSIS_USER_PROMPT(text, contractType, explanationLevel, outputLanguage),
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== "text") throw new Error("Unexpected response type");

    // Extract JSON from response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in response");

    const parsed = JSON.parse(jsonMatch[0]);
    return parsed as AnalysisResult;
  } catch (err) {
    logger.error({ err }, "AI analysis failed, falling back to demo");
    return getDemoAnalysis(contractType) as AnalysisResult;
  }
}

export async function answerQuestion(
  contractText: string,
  question: string,
  contractTitle: string,
): Promise<{ answer: string; sourcePage: number | null; sourceText: string | null }> {
  if (!anthropicClient) {
    return {
      answer: `بناءً على العقد "${contractTitle}"، لم أجد إجابة واضحة على هذا السؤال في وضع العرض التجريبي. يرجى تفعيل وضع الذكاء الاصطناعي للحصول على إجابات حقيقية.`,
      sourcePage: null,
      sourceText: null,
    };
  }

  try {
    const response = await anthropicClient.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system: QA_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Contract title: ${contractTitle}\n\nContract text:\n${contractText.slice(0, 12000)}\n\nQuestion: ${question}\n\nRespond in JSON: {"answer": "text", "sourcePage": number or null, "sourceText": "exact quote or null"}`,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== "text") throw new Error("Unexpected response type");

    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found");

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      answer: parsed.answer ?? "لم أجد إجابة واضحة على هذا السؤال داخل العقد المرفوع.",
      sourcePage: parsed.sourcePage ?? null,
      sourceText: parsed.sourceText ?? null,
    };
  } catch (err) {
    logger.error({ err }, "AI Q&A failed");
    return {
      answer: "لم أجد إجابة واضحة على هذا السؤال داخل العقد المرفوع.",
      sourcePage: null,
      sourceText: null,
    };
  }
}

export async function compareContractsSummary(
  contractA: { title: string; type: string; [key: string]: unknown },
  contractB: { title: string; type: string; [key: string]: unknown },
): Promise<string> {
  if (!anthropicClient) {
    return `في المقارنة بين "${contractA.title}" و"${contractB.title}": يُنصح بمراجعة شروط الإلغاء والتجديد التلقائي والتكلفة الإجمالية لكل عقد بعناية قبل الاختيار.`;
  }

  try {
    const response = await anthropicClient.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 500,
      system: COMPARE_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Compare these two contracts neutrally in 2-3 sentences in Arabic. Contract A: ${JSON.stringify(contractA)}. Contract B: ${JSON.stringify(contractB)}. Only state differences, do not recommend one.`,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== "text") return "لم يتمكن النظام من إنشاء ملخص المقارنة.";
    return content.text;
  } catch {
    return "لم يتمكن النظام من إنشاء ملخص المقارنة.";
  }
}
