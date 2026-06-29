export type ModelMessage = {
  role: "user" | "assistant";
  content: string;
};

type LiteLlmChoice = {
  message?: {
    content?: string;
  };
};

type LiteLlmResponse = {
  choices?: LiteLlmChoice[];
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  error?: {
    message?: string;
  };
};

export const baseUrl = process.env.LITELLM_BASE_URL ?? "http://localhost:4000";
export const apiKey = process.env.LITELLM_API_KEY;
export const model = process.env.LITELLM_MODEL ?? "qwen2.5-coder-1.5b";

export async function chatWithModel(messages: ModelMessage[]) {
  if (!apiKey) {
    throw new Error("LITELLM_API_KEY is not configured.");
  }

  const response = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            "You are LaunchCodeModel, a concise local coding assistant. Give practical code-focused answers.",
        },
        ...messages,
      ],
      temperature: 0.2,
    }),
  });

  const data = (await response.json()) as LiteLlmResponse;

  if (!response.ok) {
    throw new Error(data.error?.message ?? `LiteLLM request failed with ${response.status}.`);
  }

  return {
    content: data.choices?.[0]?.message?.content?.trim() ?? "",
    usage: {
      promptTokens: data.usage?.prompt_tokens,
      completionTokens: data.usage?.completion_tokens,
      totalTokens: data.usage?.total_tokens,
    },
  };
}
