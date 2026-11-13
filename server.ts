import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '25mb' }));

// Enable CORS and handle preflight requests for AI Studio iframe environment
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Cache-Control');
  res.setHeader('Access-Control-Expose-Headers', '*');
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});
// Initialize GoogleGenAI client with required aistudio-build telemetry header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Available models definition conforming strictly to @google/genai SKILL.md source of truth
const AVAILABLE_MODELS = [
  {
    id: 'gemini-3.1-flash-lite',
    name: 'CHAT AI Lite 3.1',
    provider: 'Google Gemini',
    family: 'Flash-Lite',
    description: 'Ultra-low latency, highly responsive model optimized for instant response speeds, image comprehension, and high volume. Full free tier support.',
    isFreeTier: true,
    speed: 'Instantaneous (~150ms)',
    contextWindow: '1,048,576 tokens',
    capabilities: ['Instant Answers', 'Multimodal Vision', 'Telugu & Multilingual', 'Lightweight Chat', 'Summaries'],
    recommended: true,
    requiresPaidKey: false,
    supportsImageInput: true,
    supportsWebSearch: true,
  },
  {
    id: 'gemini-3.8-flash',
    name: 'CHAT AI Flash 3.8',
    provider: 'Google Gemini',
    family: 'Flash',
    description: 'Fast multimodal model for deep creative writing, coding, and image comprehension.',
    isFreeTier: true,
    speed: 'Ultra Fast (~320ms)',
    contextWindow: '1,048,576 tokens',
    capabilities: ['Text & Code', 'Multimodal Vision', 'Streaming', 'Telugu & Multilingual'],
    recommended: false,
    requiresPaidKey: false,
    supportsImageInput: true,
    supportsWebSearch: true,
  },
  {
    id: 'gemini-4-argon',
    name: 'CHAT AI Argon 4.0 Pro',
    provider: 'Google Gemini',
    family: 'Argon',
    description: 'Advanced flagship model for complex reasoning, multi-file coding, math, and STEM problem solving.',
    isFreeTier: false,
    speed: 'High Precision (~850ms)',
    contextWindow: '2,097,152 tokens',
    capabilities: ['Complex Reasoning', 'Multimodal Vision', 'Advanced Coding', 'STEM Proofs', 'Deep Architecture'],
    recommended: false,
    requiresPaidKey: true,
    supportsImageInput: true,
    supportsWebSearch: true,
  },
  {
    id: 'gemini-4-carbon',
    name: 'CHAT AI Carbon 4.0 Deep',
    provider: 'Google Gemini',
    family: 'Carbon',
    description: 'Maximum depth reasoning engine for complex root-cause debugging, scientific proofs, and security audits.',
    isFreeTier: false,
    speed: 'Deep Reasoning (~1.2s)',
    contextWindow: '2,097,152 tokens',
    capabilities: ['Deep Architecture', 'Multimodal Vision', 'Root-cause Debugging', 'Security Audits'],
    recommended: false,
    requiresPaidKey: true,
    supportsImageInput: true,
    supportsWebSearch: true,
  },
];

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    brand: 'CHAT AI',
    tagline: 'Your AI. Your World.',
    version: '2.6.0',
    hasApiKey: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'),
    defaultModel: 'gemini-3.1-flash-lite',
    timestamp: new Date().toISOString(),
  });
});

// Models list endpoint
app.get('/api/models', (req, res) => {
  res.json({
    models: AVAILABLE_MODELS,
    defaultModel: 'gemini-3.1-flash-lite',
  });
});

// Helper to format messages for @google/genai contents structure safely
function formatMessagesForGenAI(messages: any[], supportsImageInput: boolean) {
  const formatted: Array<{
    role: string;
    parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }>;
  }> = [];

  const msgList = Array.isArray(messages) ? messages : [];

  for (let i = 0; i < msgList.length; i++) {
    const m = msgList[i];
    const isLatestUserMessage = i === msgList.length - 1 && m.role === 'user';
    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

    if (m.attachments && Array.isArray(m.attachments)) {
      for (const att of m.attachments) {
        const mime = String(att.mimeType || '').toLowerCase();
        const isImage = att.kind === 'image' || mime.startsWith('image/');

        if (isImage) {
          if (!supportsImageInput) {
            if (isLatestUserMessage) {
              throw new Error(
                `The selected model does not support image analysis. Please switch to a vision-capable model (such as CHAT AI Lite 3.1 or CHAT AI Flash 3.8).`
              );
            }
            continue;
          }
          if (att.data) {
            const cleanBase64 = String(att.data).replace(/^data:[^;]+;base64,/, '');
            if (cleanBase64) {
              parts.push({
                inlineData: {
                  mimeType: mime || 'image/jpeg',
                  data: cleanBase64,
                },
              });
            }
          }
        } else if (att.extractedText && typeof att.extractedText === 'string' && att.extractedText.trim()) {
          const kindLabel = att.kind ? String(att.kind).toUpperCase() : 'FILE';
          const pageInfo = att.pageCount ? `, ${att.pageCount} page${att.pageCount === 1 ? '' : 's'}` : '';
          parts.push({
            text: `[Attached Document: ${att.name || 'document'} (${kindLabel}${pageInfo})]\n${att.extractedText.trim()}\n[End of Document: ${att.name || 'document'}]`,
          });
        } else if (isLatestUserMessage) {
          throw new Error(
            `Attachment "${att.name || 'file'}" has no readable text or supported image data, so it could not be analyzed.`
          );
        }
      }
    }

    if (m.content && typeof m.content === 'string' && m.content.trim()) {
      parts.push({ text: m.content.trim() });
    } else if (parts.length > 0 && isLatestUserMessage) {
      parts.push({
        text: 'Please inspect and analyze the attached file(s) clearly and concisely.',
      });
    }

    if (parts.length > 0) {
      formatted.push({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts,
      });
    }
  }

  if (formatted.length === 0) {
    formatted.push({
      role: 'user',
      parts: [{ text: 'Hello' }],
    });
  }

  return formatted;
}

function extractWebSources(responseChunkOrObj: any): Array<{ title: string; uri: string }> {
  const chunks = responseChunkOrObj?.candidates?.[0]?.groundingMetadata?.groundingChunks;
  if (!Array.isArray(chunks)) return [];
  const seen = new Set<string>();
  const sources: Array<{ title: string; uri: string }> = [];
  for (const ch of chunks) {
    const uri = ch?.web?.uri;
    const title = ch?.web?.title || uri;
    if (uri && !seen.has(uri)) {
      seen.add(uri);
      sources.push({ title: String(title), uri: String(uri) });
    }
  }
  return sources;
}

function formatFriendlyApiError(error: any): string {
  const raw = String(error?.message || error || 'An unexpected error occurred.');
  try {
    const parsed = JSON.parse(raw);
    const msg = parsed?.error?.message || raw;
    if (parsed?.error?.code === 429 || /quota/i.test(msg)) {
      return 'Free-tier quota reached for this feature right now. Please retry shortly or try without this tool.';
    }
    return msg;
  } catch {
    if (/429|quota/i.test(raw)) {
      return 'Free-tier quota reached right now. Please retry shortly.';
    }
    return raw;
  }
}

async function performFreeWebSearch(query: string): Promise<{
  summaryContext: string;
  sources: Array<{ title: string; uri: string }>;
}> {
  const cleanQuery = query.trim().slice(0, 220);
  if (!cleanQuery) return { summaryContext: '', sources: [] };

  const encoded = encodeURIComponent(cleanQuery);
  const sources: Array<{ title: string; uri: string }> = [];
  const snippets: string[] = [];

  const [wikiRes, ddgRes] = await Promise.allSettled([
    fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encoded}&utf8=&format=json&srlimit=3`,
      { headers: { 'User-Agent': 'CHAT-AI/2.6' }, signal: AbortSignal.timeout(6000) }
    ),
    fetch(
      `https://api.duckduckgo.com/?q=${encoded}&format=json&no_html=1&skip_disambig=1`,
      { headers: { 'User-Agent': 'CHAT-AI/2.6' }, signal: AbortSignal.timeout(5000) }
    ),
  ]);

  // 1. DuckDuckGo Instant Answer
  if (ddgRes.status === 'fulfilled' && ddgRes.value.ok) {
    try {
      const ddg: any = await ddgRes.value.json();
      if (ddg?.AbstractText && ddg?.AbstractURL) {
        snippets.push(`- [DuckDuckGo Instant Answer - ${ddg.Heading || cleanQuery}]: ${ddg.AbstractText}`);
        sources.push({ title: ddg.Heading || ddg.AbstractSource || 'DuckDuckGo Reference', uri: ddg.AbstractURL });
      } else if (ddg?.Answer) {
        snippets.push(`- [DuckDuckGo Answer]: ${ddg.Answer}`);
      }
    } catch {
      // ignore malformed ddg JSON
    }
  }

  // 2. Wikipedia Search + Intro Extract of top result
  if (wikiRes.status === 'fulfilled' && wikiRes.value.ok) {
    try {
      const wikiJson: any = await wikiRes.value.json();
      const hits = wikiJson?.query?.search || [];
      if (hits.length > 0) {
        const topPageId = hits[0].pageid;
        let topExtract = '';
        if (topPageId) {
          try {
            const extRes = await fetch(
              `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=1&explaintext=1&pageids=${topPageId}&format=json`,
              { headers: { 'User-Agent': 'CHAT-AI/2.6' }, signal: AbortSignal.timeout(5000) }
            );
            if (extRes.ok) {
              const extJson: any = await extRes.json();
              topExtract = extJson?.query?.pages?.[String(topPageId)]?.extract || '';
            }
          } catch {
            // fallback to snippet
          }
        }

        for (let i = 0; i < hits.length; i++) {
          const h = hits[i];
          const url = `https://en.wikipedia.org/?curid=${h.pageid}`;
          const cleanSnippet = String(h.snippet || '').replace(/<[^>]+>/g, '');
          const textBody = i === 0 && topExtract ? topExtract.slice(0, 1200) : cleanSnippet;
          snippets.push(`- [Wikipedia: ${h.title}] (${url}): ${textBody}`);
          if (!sources.some((s) => s.uri === url)) {
            sources.push({ title: `${h.title} — Wikipedia`, uri: url });
          }
        }
      }
    } catch {
      // ignore wiki parse errors
    }
  }

  return {
    summaryContext: snippets.join('\n\n'),
    sources,
  };
}

function appendWebContextToFormattedContents(
  formattedContents: ReturnType<typeof formatMessagesForGenAI>,
  webContextText: string
) {
  const cloned = formattedContents.map((msg) => ({
    ...msg,
    parts: [...msg.parts],
  }));
  const lastIdx = cloned.length - 1;
  if (lastIdx >= 0 && cloned[lastIdx].role === 'user') {
    cloned[lastIdx].parts.unshift({
      text: `[Live Internet Search Context Retrieved Now]\n${webContextText}\n[End of Live Internet Search Context — answer concisely using these real sources]`,
    });
  }
  return cloned;
}

const OFFICIAL_CREATOR_NAME = 'KARTHIK JANNE';
const CREATOR_REPLY_EN = 'I was created by KARTHIK JANNE, the founder and owner of CHAT AI.';
const CREATOR_REPLY_TE = 'నన్ను KARTHIK JANNE రూపొందించారు. ఆయనే CHAT AI వ్యవస్థాపకుడు మరియు యజమాని.';

const CREATOR_IDENTITY_DIRECTIVE = `OFFICIAL CREATOR & OWNERSHIP IDENTITY (HIGHEST PRIORITY — APPLIES TO ALL MODELS AND TOOLS):
- Official Creator, Founder, Developer, and Owner of CHAT AI: ${OFFICIAL_CREATOR_NAME}.
- NEVER state or imply that Google, OpenAI, Anthropic, or anyone else created, owns, or founded CHAT AI.
- Whenever asked who created you, who your owner is, who your founder is, who developed you, or who made you (in English), ALWAYS reply:
  "${CREATOR_REPLY_EN}"
- Whenever asked in Telugu (e.g., "నిన్ను ఎవరు తయారు చేశారు?", "నీ ఓనర్ ఎవరు?", "నీ ఫౌండర్ ఎవరు?"), ALWAYS reply:
  "${CREATOR_REPLY_TE}"`;

function detectDirectCreatorQuery(messages: any[]): string | null {
  const list = Array.isArray(messages) ? messages : [];
  const latestUser = [...list].reverse().find((m) => m?.role === 'user');
  if (!latestUser) return null;
  if (Array.isArray(latestUser.attachments) && latestUser.attachments.length > 0) return null;

  const raw = String(latestUser.content || '').trim();
  if (!raw || raw.length > 110) return null;

  // Telugu direct creator / owner / founder checks
  const teNormalized = raw.replace(/[?!.,'"\s]+/g, ' ').trim();
  const isTeluguCreatorQuery =
    /(నిన్ను|మీరు|చాట్\s*ఏఐ|chat\s*ai).*(ఎవరు\s*(తయారు|రూపొందించ|నిర్మించ|డెవలప్|కనిపెట్ట))/.test(teNormalized) ||
    /(ఎవరు\s*(తయారు|రూపొందించ|నిర్మించ|డెవలప్)).*(నిన్ను|చాట్\s*ఏఐ|chat\s*ai)/.test(teNormalized) ||
    /(నీ|మీ|చాట్\s*ఏఐ|chat\s*ai)\s*(ఓనర్|యజమాని|వ్యవస్థాపకుడు|ఫౌండర్|క్రియేటర్|నిర్మాత)\s*ఎవరు/.test(teNormalized) ||
    /^(ఓనర్|యజమాని|వ్యవస్థాపకుడు|ఫౌండర్)\s*ఎవరు$/.test(teNormalized);

  if (isTeluguCreatorQuery) {
    return CREATOR_REPLY_TE;
  }

  // English direct creator / owner / founder / developer / maker checks
  const enNormalized = raw
    .toLowerCase()
    .replace(/[?!.,'"]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^(can you |could you |please )?(tell me )?/, '');

  const isEnglishCreatorQuery =
    /^who\s+(created|developed|made|built|founded|owns|is behind|authored|programmed|designed)\s+(you|chat\s*ai|chatai|this\s+app|this\s+ai)(\s+please|\s+now)?$/.test(
      enNormalized
    ) ||
    /^who\s+(is|are)\s+(your|the|chat\s*ai\s*s?)\s+(creator|owner|founder|developer|maker|author|builder)(\s+please|\s+now)?$/.test(
      enNormalized
    ) ||
    /^who\s+(is|are)\s+the\s+(creator|owner|founder|developer|maker)\s+of\s+(chat\s*ai|chatai|you|this\s+app)(\s+please|\s+now)?$/.test(
      enNormalized
    ) ||
    /^(whose\s+ai\s+(are\s+you|is\s+this)|who\s+do\s+you\s+belong\s+to)$/.test(enNormalized);

  if (isEnglishCreatorQuery) {
    return CREATOR_REPLY_EN;
  }

  return null;
}

const DEFAULT_SYSTEM_INSTRUCTION = `You are CHAT AI.
${CREATOR_IDENTITY_DIRECTIVE}

Follow these strict communication rules:
1. Reply naturally, directly, and clearly. Do NOT repeat the user's question back to them.
2. Keep greetings short (e.g., "Hi! How can I help?" or "నమస్కారం! నేను మీకు ఎలా సహాయపడగలను?"). Never output promotional speeches or taglines unless asked.
3. For simple or factual questions, give a brief, direct answer without unnecessary background or filler.
4. Follow the user's requested answer length and format:
   - If the user says "Explain fully" or asks for deep detail, provide a thorough explanation.
   - If the user says "Step by step", provide clear numbered steps (1., 2., 3., ...).
   - Otherwise, keep answers crisp and appropriately sized.
5. Support both English and Telugu (తెలుగు) fluently: answer in Telugu when asked in Telugu, and in English when asked in English.
6. Use clean Markdown formatting when structure or code blocks genuinely improve readability.
7. Only analyze files, documents, or images whose actual content is present in the message. Never guess or invent contents of unread files.`;

// Streaming chat endpoint using Server-Sent Events (SSE)
app.post('/api/chat/stream', async (req, res) => {
  const { messages, model = 'gemini-3.1-flash-lite', systemInstruction, webSearch = false } = req.body;

  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'MY_GEMINI_API_KEY') {
    res.status(500).json({
      error: 'GEMINI_API_KEY is not configured. Please configure your key in Settings > Secrets.',
    });
    return;
  }

  const modelMeta = AVAILABLE_MODELS.find((m) => m.id === model);
  const supportsImageInput = modelMeta ? modelMeta.supportsImageInput : true;

  let formattedContents: ReturnType<typeof formatMessagesForGenAI>;
  try {
    formattedContents = formatMessagesForGenAI(messages, supportsImageInput);
  } catch (validationErr: any) {
    res.status(400).json({
      error: validationErr?.message || 'Invalid or unsupported attachment in request.',
    });
    return;
  }

  // Set SSE headers with full iframe CORS support
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();
  res.write(': ping\n\n');

  const directCreatorReply = detectDirectCreatorQuery(messages);
  if (directCreatorReply) {
    res.write(`data: ${JSON.stringify({ text: directCreatorReply })}\n\n`);
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
    return;
  }

  let isAborted = false;
  res.on('close', () => {
    if (!res.writableEnded) {
      isAborted = true;
    }
  });

  try {
    const effectiveSystemInstruction = systemInstruction
      ? `${DEFAULT_SYSTEM_INSTRUCTION}\n\nUser Context & Instructions:\n${systemInstruction}\n\n${CREATOR_IDENTITY_DIRECTIVE}`
      : DEFAULT_SYSTEM_INSTRUCTION;

    const candidates = [model];
    if (model !== 'gemini-3.1-flash-lite') {
      candidates.push('gemini-3.1-flash-lite');
    }

    let generatedText = '';
    const collectedSourcesMap = new Map<string, { title: string; uri: string }>();
    let lastError: any = null;
    let googleSearchQuotaOrUnsupported = false;

    for (const m of candidates) {
      if (isAborted) break;
      try {
        const requestConfig: any = {
          systemInstruction: effectiveSystemInstruction,
        };
        if (webSearch && !googleSearchQuotaOrUnsupported) {
          requestConfig.tools = [{ googleSearch: {} }];
        }

        const streamResult = await ai.models.generateContentStream({
          model: m,
          contents: formattedContents,
          config: requestConfig,
        });

        for await (const chunk of streamResult) {
          if (isAborted) break;
          const chunkText = chunk?.text;
          if (chunkText) {
            generatedText += chunkText;
            res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
          }
          const chunkSources = extractWebSources(chunk);
          for (const src of chunkSources) {
            collectedSourcesMap.set(src.uri, src);
          }
        }

        if (generatedText.trim().length > 0 || isAborted) {
          break;
        }
      } catch (err: any) {
        lastError = err;
        const msg = String(err?.message || '');
        const isSearchLimit =
          webSearch &&
          (err?.status === 429 ||
            err?.status === 403 ||
            /429|quota|RESOURCE_EXHAUSTED|search/i.test(msg));

        if (isSearchLimit && !googleSearchQuotaOrUnsupported && !generatedText) {
          googleSearchQuotaOrUnsupported = true;
          break;
        }

        const isTransient = err?.status === 503 || msg.includes('503') || msg.includes('high demand');
        if (isTransient && m !== candidates[candidates.length - 1]) {
          continue;
        }
        if (m === candidates[candidates.length - 1]) {
          throw err;
        }
      }
    }

    // Free real internet search fallback (Wikipedia + DuckDuckGo) if Google Search grounding hit free quota
    if (webSearch && googleSearchQuotaOrUnsupported && !generatedText && !isAborted) {
      const latestUserPrompt =
        [...(Array.isArray(messages) ? messages : [])]
          .reverse()
          .find((m) => m.role === 'user')?.content || '';

      const fallbackSearch = await performFreeWebSearch(latestUserPrompt);
      if (fallbackSearch.summaryContext) {
        for (const src of fallbackSearch.sources) {
          collectedSourcesMap.set(src.uri, src);
        }
        const augmentedContents = appendWebContextToFormattedContents(
          formattedContents,
          fallbackSearch.summaryContext
        );
        const streamResult = await ai.models.generateContentStream({
          model: candidates[candidates.length - 1],
          contents: augmentedContents,
          config: { systemInstruction: effectiveSystemInstruction },
        });
        for await (const chunk of streamResult) {
          if (isAborted) break;
          const chunkText = chunk?.text;
          if (chunkText) {
            generatedText += chunkText;
            res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
          }
        }
      } else {
        throw new Error(
          'Live Google Search grounding reached its free-tier limit, and open web search returned no matching articles for this query.'
        );
      }
    }

    if (!generatedText && !isAborted) {
      if (lastError) {
        throw lastError;
      }
      throw new Error('The AI provider returned an empty response. Please retry.');
    }

    if (!isAborted) {
      const webSources = Array.from(collectedSourcesMap.values());
      if (webSources.length > 0) {
        res.write(`data: ${JSON.stringify({ webSources })}\n\n`);
      }
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    }
  } catch (error: any) {
    const friendlyMessage = formatFriendlyApiError(error);

    if (!res.headersSent) {
      res.status(500).json({ error: friendlyMessage });
    } else {
      res.write(`data: ${JSON.stringify({ error: friendlyMessage })}\n\n`);
      res.end();
    }
  }
});

// Non-streaming chat endpoint
app.post('/api/chat/generate', async (req, res) => {
  const { messages, model = 'gemini-3.1-flash-lite', systemInstruction, webSearch = false } = req.body;

  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'MY_GEMINI_API_KEY') {
    res.status(500).json({
      error: 'GEMINI_API_KEY is not configured. Please configure your key in Settings > Secrets.',
    });
    return;
  }

  const modelMeta = AVAILABLE_MODELS.find((m) => m.id === model);
  const supportsImageInput = modelMeta ? modelMeta.supportsImageInput : true;

  let formattedContents: ReturnType<typeof formatMessagesForGenAI>;
  try {
    formattedContents = formatMessagesForGenAI(messages, supportsImageInput);
  } catch (validationErr: any) {
    res.status(400).json({
      error: validationErr?.message || 'Invalid or unsupported attachment in request.',
    });
    return;
  }

  const directCreatorReply = detectDirectCreatorQuery(messages);
  if (directCreatorReply) {
    res.json({ text: directCreatorReply, webSources: [] });
    return;
  }

  try {
    const effectiveSystemInstruction = systemInstruction
      ? `${DEFAULT_SYSTEM_INSTRUCTION}\n\nUser Context & Instructions:\n${systemInstruction}\n\n${CREATOR_IDENTITY_DIRECTIVE}`
      : DEFAULT_SYSTEM_INSTRUCTION;

    const candidates = [model];
    if (model !== 'gemini-3.1-flash-lite') {
      candidates.push('gemini-3.1-flash-lite');
    }

    let response: any = null;
    let fallbackSources: Array<{ title: string; uri: string }> = [];

    for (const m of candidates) {
      try {
        const requestConfig: any = {
          systemInstruction: effectiveSystemInstruction,
        };
        if (webSearch) {
          requestConfig.tools = [{ googleSearch: {} }];
        }

        response = await ai.models.generateContent({
          model: m,
          contents: formattedContents,
          config: requestConfig,
        });
        break;
      } catch (err: any) {
        const msg = String(err?.message || '');
        if (webSearch && (err?.status === 429 || err?.status === 403 || /429|quota|RESOURCE_EXHAUSTED/i.test(msg))) {
          const latestUserPrompt =
            [...(Array.isArray(messages) ? messages : [])]
              .reverse()
              .find((msgItem) => msgItem.role === 'user')?.content || '';
          const freeWeb = await performFreeWebSearch(latestUserPrompt);
          if (freeWeb.summaryContext) {
            fallbackSources = freeWeb.sources;
            response = await ai.models.generateContent({
              model: candidates[candidates.length - 1],
              contents: appendWebContextToFormattedContents(formattedContents, freeWeb.summaryContext),
              config: { systemInstruction: effectiveSystemInstruction },
            });
            break;
          }
        }
        const isTransient = err?.status === 503 || msg.includes('503') || msg.includes('high demand');
        if (isTransient && m !== candidates[candidates.length - 1]) {
          continue;
        }
        throw err;
      }
    }

    const groundingSources = extractWebSources(response);
    const webSources = groundingSources.length > 0 ? groundingSources : fallbackSources;
    res.json({ text: response?.text || '', webSources });
  } catch (error: any) {
    res.status(500).json({ error: formatFriendlyApiError(error) });
  }
});

// ============================================================
// FREE AI IMAGE GENERATION (Pollinations Flux + AI Horde Fallback)
// Zero paid APIs, zero billing required
// ============================================================

type ImageStyle = 'Realistic' | '3D' | 'Anime' | 'Digital Art' | 'Cinematic' | 'Cartoon';
type ImageAspectRatio = 'square' | 'portrait' | 'landscape';

const STYLE_MODIFIERS: Record<ImageStyle, string> = {
  Realistic: 'photorealistic photography, ultra detailed, natural lighting, sharp focus, high resolution',
  '3D': '3D octane render, Unreal Engine 5 aesthetic, volumetric lighting, sculpted detail, PBR materials',
  Anime: 'high quality anime illustration, vibrant cel shading, clean line art, studio anime style',
  'Digital Art': 'detailed digital concept art illustration, rich brushwork, expressive lighting, crisp detail',
  Cinematic: 'cinematic film still, anamorphic lens, dramatic volumetric lighting, rich color grading',
  Cartoon: 'vibrant stylized 2D cartoon illustration, clean bold outlines, expressive shapes, playful palette',
};

const POLLINATIONS_DIMENSIONS: Record<ImageAspectRatio, { width: number; height: number }> = {
  square: { width: 1024, height: 1024 },
  portrait: { width: 768, height: 1024 },
  landscape: { width: 1024, height: 768 },
};

// AI Horde anonymous tier allows up to 576x576 pixel area without upfront kudos
const HORDE_DIMENSIONS: Record<ImageAspectRatio, { width: number; height: number }> = {
  square: { width: 512, height: 512 },
  portrait: { width: 448, height: 640 },
  landscape: { width: 640, height: 448 },
};

function buildStyledImagePrompt(rawPrompt: string, style: ImageStyle): string {
  const modifier = STYLE_MODIFIERS[style] || STYLE_MODIFIERS['Digital Art'];
  return `${rawPrompt.trim()}, ${modifier}`;
}

async function generateViaPollinations(
  styledPrompt: string,
  aspectRatio: ImageAspectRatio,
  seed: number,
  signal?: AbortSignal
): Promise<{
  imageDataUrl: string;
  mimeType: string;
  width: number;
  height: number;
  provider: string;
  model: string;
  limits: string;
}> {
  const dims = POLLINATIONS_DIMENSIONS[aspectRatio] || POLLINATIONS_DIMENSIONS.square;
  const encodedPrompt = encodeURIComponent(styledPrompt);
  const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?model=flux&width=${dims.width}&height=${dims.height}&nologo=true&seed=${seed}`;

  const headers: Record<string, string> = {
    'User-Agent': 'CHAT-AI/2.5',
  };
  if (process.env.POLLINATIONS_API_KEY) {
    headers['Authorization'] = `Bearer ${process.env.POLLINATIONS_API_KEY}`;
  }

  const response = await fetch(url, {
    headers,
    signal: signal || AbortSignal.timeout(35000),
  });

  if (!response.ok) {
    let errDetail = `HTTP ${response.status}`;
    try {
      const errJson: any = await response.json();
      errDetail = errJson?.error?.message || errJson?.message || errDetail;
    } catch {
      // ignore non-json
    }
    const err: any = new Error(`Pollinations Flux unavailable: ${errDetail}`);
    err.status = response.status;
    throw err;
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.startsWith('image/')) {
    throw new Error(`Pollinations returned non-image content (${contentType})`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.byteLength < 2000) {
    throw new Error('Pollinations returned an empty or truncated image');
  }

  const mimeType = contentType.split(';')[0].trim();
  const base64 = buffer.toString('base64');

  return {
    imageDataUrl: `data:${mimeType};base64,${base64}`,
    mimeType,
    width: dims.width,
    height: dims.height,
    provider: 'Pollinations AI (Open-Source Hosted)',
    model: 'FLUX.1 Schnell (Free Tier)',
    limits: 'Free anonymous tier: 1 image every 45s per IP (auto-falls back to AI Horde during cooldown)',
  };
}

async function generateViaStableHorde(
  styledPrompt: string,
  aspectRatio: ImageAspectRatio,
  seed: number,
  onProgress?: (stage: string, percent: number) => void,
  signal?: AbortSignal
): Promise<{
  imageDataUrl: string;
  mimeType: string;
  width: number;
  height: number;
  provider: string;
  model: string;
  limits: string;
}> {
  const dims = HORDE_DIMENSIONS[aspectRatio] || HORDE_DIMENSIONS.square;
  const hordeApiKey = process.env.HORDE_API_KEY || '0000000000';

  onProgress?.('Submitting job to AI Horde open-source network...', 25);

  const submitRes = await fetch('https://stablehorde.net/api/v2/generate/async', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: hordeApiKey,
      'Client-Agent': 'chatai-web:2.5:karthik',
    },
    body: JSON.stringify({
      prompt: styledPrompt,
      params: {
        width: dims.width,
        height: dims.height,
        steps: 22,
        cfg_scale: 7.5,
        seed: String(seed),
        n: 1,
      },
      nsfw: false,
      censor_nsfw: true,
      r2: true,
    }),
    signal: signal || AbortSignal.timeout(20000),
  });

  if (!submitRes.ok) {
    const errData: any = await submitRes.json().catch(() => ({}));
    throw new Error(errData?.message || `AI Horde rejected job (HTTP ${submitRes.status})`);
  }

  const submitData: any = await submitRes.json();
  const jobId = submitData?.id;
  if (!jobId) {
    throw new Error('AI Horde did not return a generation job ID.');
  }

  // Poll until complete (max ~60 seconds)
  let done = false;
  for (let attempt = 0; attempt < 24; attempt++) {
    if (signal?.aborted) {
      throw new Error('Image generation cancelled by user.');
    }
    await new Promise((resolve) => setTimeout(resolve, 2500));

    const checkRes = await fetch(`https://stablehorde.net/api/v2/generate/check/${jobId}`, {
      headers: { 'Client-Agent': 'chatai-web:2.5:karthik' },
      signal,
    });
    if (!checkRes.ok) continue;

    const checkData: any = await checkRes.json();
    if (checkData.faulted) {
      throw new Error('AI Horde worker faulted while rendering image. Please try again.');
    }
    if (checkData.is_possible === false) {
      throw new Error('No eligible open-source workers are currently online for this size.');
    }

    const eta = typeof checkData.wait_time === 'number' ? checkData.wait_time : 0;
    const queuePos = typeof checkData.queue_position === 'number' ? checkData.queue_position : 0;
    const progressPct = Math.min(88, 30 + attempt * 4);
    onProgress?.(
      checkData.processing > 0
        ? `Rendering open-source Stable Diffusion (${eta > 0 ? `~${eta}s left` : 'almost done'})...`
        : `Queued on AI Horde (position #${queuePos}, ~${eta}s wait)...`,
      progressPct
    );

    if (checkData.done) {
      done = true;
      break;
    }
  }

  if (!done) {
    throw new Error('AI Horde queue timed out after 60s. Please retry.');
  }

  onProgress?.('Downloading generated image...', 92);

  const statusRes = await fetch(`https://stablehorde.net/api/v2/generate/status/${jobId}`, {
    headers: { 'Client-Agent': 'chatai-web:2.5:karthik' },
    signal,
  });
  if (!statusRes.ok) {
    throw new Error(`Failed to fetch AI Horde output (HTTP ${statusRes.status})`);
  }

  const statusData: any = await statusRes.json();
  const gen = statusData?.generations?.[0];
  if (!gen || !gen.img) {
    throw new Error('AI Horde completed without returning an image.');
  }
  if (gen.censored) {
    throw new Error('The prompt triggered open-source safety filtering. Please revise your prompt.');
  }

  let dataUrl: string;
  let mimeType = 'image/webp';
  if (gen.img.startsWith('http://') || gen.img.startsWith('https://')) {
    const imgRes = await fetch(gen.img, { signal: signal || AbortSignal.timeout(20000) });
    if (!imgRes.ok) {
      throw new Error(`Failed to download generated image (HTTP ${imgRes.status})`);
    }
    const ct = imgRes.headers.get('content-type') || 'image/webp';
    mimeType = ct.split(';')[0].trim();
    const buf = Buffer.from(await imgRes.arrayBuffer());
    if (buf.byteLength < 1500) {
      throw new Error('Downloaded image file was empty or corrupted.');
    }
    dataUrl = `data:${mimeType};base64,${buf.toString('base64')}`;
  } else {
    // Raw base64 fallback
    dataUrl = gen.img.startsWith('data:') ? gen.img : `data:image/webp;base64,${gen.img}`;
  }

  return {
    imageDataUrl: dataUrl,
    mimeType,
    width: dims.width,
    height: dims.height,
    provider: 'AI Horde (Crowd-Sourced Open Source)',
    model: gen.model || 'Stable Diffusion (Community Worker)',
    limits: 'Free anonymous tier (apikey 0000000000): up to ~576x576 pixel area, shared community queue',
  };
}

async function runFreeImagePipeline(
  rawPrompt: string,
  style: ImageStyle,
  aspectRatio: ImageAspectRatio,
  onProgress?: (stage: string, percent: number) => void,
  signal?: AbortSignal
) {
  const startTime = Date.now();
  const seed = Math.floor(Math.random() * 9000000) + 100000;
  const styledPrompt = buildStyledImagePrompt(rawPrompt, style);

  let pollinationsErr: string | null = null;

  onProgress?.('Connecting to Pollinations FLUX (Free Open-Source)...', 15);
  try {
    const res = await generateViaPollinations(styledPrompt, aspectRatio, seed, signal);
    onProgress?.('Complete!', 100);
    return {
      ...res,
      prompt: rawPrompt.trim(),
      styledPrompt,
      style,
      aspectRatio,
      seed,
      durationMs: Date.now() - startTime,
    };
  } catch (err: any) {
    if (signal?.aborted) throw err;
    pollinationsErr = err?.message || 'Pollinations unavailable';
  }

  onProgress?.(`Primary provider busy (${pollinationsErr}). Routing to AI Horde (Free Stable Diffusion)...`, 22);
  try {
    const res = await generateViaStableHorde(styledPrompt, aspectRatio, seed, onProgress, signal);
    onProgress?.('Complete!', 100);
    return {
      ...res,
      prompt: rawPrompt.trim(),
      styledPrompt,
      style,
      aspectRatio,
      seed,
      durationMs: Date.now() - startTime,
    };
  } catch (hordeErr: any) {
    const hordeMsg = hordeErr?.message || 'AI Horde unavailable';
    throw new Error(
      `Both free image providers were unable to complete this request right now. Primary (Pollinations): ${pollinationsErr}. Fallback (AI Horde): ${hordeMsg}.`
    );
  }
}

// SSE Streaming Image Generation Endpoint (live progress + final base64 image)
app.post('/api/image/generate-stream', async (req, res) => {
  const { prompt, style = 'Digital Art', aspectRatio = 'square' } = req.body || {};

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    res.status(400).json({ error: 'Please enter a descriptive text prompt for your image.' });
    return;
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const abortController = new AbortController();
  res.on('close', () => {
    if (!res.writableEnded) {
      abortController.abort();
    }
  });

  try {
    const result = await runFreeImagePipeline(
      prompt,
      style as ImageStyle,
      aspectRatio as ImageAspectRatio,
      (stage, percent) => {
        if (!res.writableEnded) {
          res.write(`data: ${JSON.stringify({ type: 'progress', stage, percent })}\n\n`);
        }
      },
      abortController.signal
    );

    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ type: 'result', ...result })}\n\n`);
      res.end();
    }
  } catch (error: any) {
    if (!res.writableEnded) {
      res.write(
        `data: ${JSON.stringify({
          type: 'error',
          error: error?.message || 'Image generation failed. Please try again.',
        })}\n\n`
      );
      res.end();
    }
  }
});

// Standard JSON Image Generation Endpoint
app.post('/api/image/generate', async (req, res) => {
  const { prompt, style = 'Digital Art', aspectRatio = 'square' } = req.body || {};

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    res.status(400).json({ error: 'Please enter a descriptive text prompt for your image.' });
    return;
  }

  try {
    const result = await runFreeImagePipeline(
      prompt,
      style as ImageStyle,
      aspectRatio as ImageAspectRatio
    );
    res.json(result);
  } catch (error: any) {
    res.status(502).json({
      error: error?.message || 'Free image providers are currently unavailable. Please retry in a moment.',
    });
  }
});

// Start server and attach Vite middleware in development
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`[CHAT AI Server] Running on http://0.0.0.0:${port}`);
  });
}

startServer();
