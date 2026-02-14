const axios = require('axios');
const { AppError } = require('../utils/response');

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_AI_MODEL = 'mistralai/mistral-small-3.1-24b-instruct:free';
const MAX_TIMEOUT_MS = 60_000;
const MAX_PROMPT_CHARS = 12_000;

const getAiModel = () => String(process.env.AI_MODEL || DEFAULT_AI_MODEL).trim();

const assertApiKey = () => {
    if (!process.env.OPENROUTER_API_KEY) {
        throw new AppError('OpenRouter API key is not configured.', 500);
    }
};

const normalizeMessages = (messages = []) => {
    if (!Array.isArray(messages) || messages.length === 0) {
        throw new AppError('AI request messages are required.', 400);
    }

    const normalized = messages
        .map((item) => ({
            role: String(item?.role || 'user').trim(),
            content: String(item?.content || '').trim().slice(0, MAX_PROMPT_CHARS),
        }))
        .filter((item) => item.role && item.content);

    if (!normalized.length) {
        throw new AppError('AI request messages are required.', 400);
    }

    return normalized;
};

const requestChatCompletion = async ({
    messages,
    temperature = 0.4,
    maxTokens = 1500,
    jsonMode = false,
    expectJson = false,
    timeoutMs = MAX_TIMEOUT_MS,
}) => {
    assertApiKey();

    const safeMessages = normalizeMessages(messages);
    const safeTimeout = Math.min(Math.max(Number(timeoutMs) || MAX_TIMEOUT_MS, 1_000), MAX_TIMEOUT_MS);
    const safeTemperature = Math.min(Math.max(Number(temperature) || 0.4, 0.3), 0.5);
    const safeMaxTokens = Math.min(Math.max(Number(maxTokens) || 1500, 100), 2000);

    const payload = {
        model: getAiModel(),
        messages: safeMessages,
        temperature: safeTemperature,
        max_tokens: safeMaxTokens,
    };

    if (jsonMode) {
        payload.response_format = { type: 'json_object' };
    }

    try {
        const response = await axios.post(OPENROUTER_URL, payload, {
            timeout: safeTimeout,
            headers: {
                Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': process.env.OPENROUTER_SITE_URL || process.env.CLIENT_ORIGIN || 'https://resumeiq.onrender.com',
                'X-Title': process.env.OPENROUTER_APP_NAME || 'ResumeIQ',
            },
        });

        const content = response.data?.choices?.[0]?.message?.content;
        if (!content || typeof content !== 'string') {
            throw new AppError('AI response was empty.', 502);
        }

        if (expectJson) {
            const cleaned = content
                .replace(/```json/gi, '')
                .replace(/```/g, '')
                .trim();

            try {
                JSON.parse(cleaned);
            } catch (_error) {
                throw new AppError('AI returned non-JSON response.', 502);
            }
        }

        return content;
    } catch (error) {
        if (error instanceof AppError) {
            throw error;
        }

        const remoteMessage = error?.response?.data?.error?.message || error?.response?.data?.message;
        const message = remoteMessage || error.message || 'AI request failed.';
        throw new AppError(message, 502);
    }
};

module.exports = {
    requestChatCompletion,
    DEFAULT_AI_MODEL,
};
