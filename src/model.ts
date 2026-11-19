// A model string like this goes through the Vercel AI Gateway (AI_GATEWAY_API_KEY).
// Switching models is this one line, or the MODEL environment variable.
export const model = process.env.MODEL ?? 'anthropic/claude-sonnet-5.5';
