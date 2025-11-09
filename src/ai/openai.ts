import OpenAI from "openai";
import type { AiChatMessage } from "./chat-types";

export type OpenAiModel = {
  name: string;
  displayName: string;
};

export interface OpenAiConfig {
  pollIntervalMs?: number;
  maxPollMs?: number;
}

const DEFAULT_OPENAI_ROOT = "https://api.openai.com";
const OPENAI_PATH_SUFFIX = "/v1";

function normalizeBaseUrl(baseUrl?: string) {
  const normalized = (baseUrl ?? DEFAULT_OPENAI_ROOT).replace(/\/$/, "");
  return normalized.endsWith(OPENAI_PATH_SUFFIX)
    ? normalized
    : `${normalized}${OPENAI_PATH_SUFFIX}`;
}

type ResponseOutputContent = {
  text?: string;
};

type ResponseOutput = {
  content?: ResponseOutputContent[];
};

type FinalResponse = {
  output_text?: string;
  output?: ResponseOutput[];
};

function collectOutputText(output?: ResponseOutput[]): string {
  if (!output) return "";
  return output
    .flatMap((item) => item.content ?? [])
    .map((contentPart) => contentPart.text ?? "")
    .join("")
    .trim();
}

function extractTextFromResponse(response: FinalResponse): string {
  if (response.output_text && response.output_text.length > 0) {
    return response.output_text.trim();
  }
  return collectOutputText(response.output);
}

export class OpenAiClient {
  private client: OpenAI;
  private systemPrompt?: string;
  private config: Required<OpenAiConfig>;

  constructor(apiKey: string, baseUrl?: string, config?: OpenAiConfig) {
    this.client = new OpenAI({
      apiKey,
      baseURL: normalizeBaseUrl(baseUrl),
      dangerouslyAllowBrowser: true,
    });
    this.config = {
      pollIntervalMs: config?.pollIntervalMs ?? 1_000,
      maxPollMs: config?.maxPollMs ?? 30_000,
    };
  }

  setSystemPrompt(prompt: string) {
    this.systemPrompt = prompt;
  }

  async sendMedia(
    media: string,
    mimeType: string,
    prompt?: string,
    model = "gpt-4.1-mini",
    callback?: (text: string) => void,
  ) {
    const input = [];

    if (this.systemPrompt) {
      input.push({
        role: "system" as const,
        content: [
          {
            type: "input_text" as const,
            text: this.systemPrompt,
          },
        ],
      });
    }

    const userContent: Array<
      | {
          type: "input_text";
          text: string;
        }
      | {
          type: "input_image";
          image_url: string;
          detail: "auto" | "low" | "high";
        }
    > = [];
    if (prompt) {
      userContent.push({
        type: "input_text",
        text: prompt,
      });
    }
    userContent.push({
      type: "input_image",
      image_url: `data:${mimeType};base64,${media}`,
      detail: "auto",
    });

    input.push({
      role: "user" as const,
      content: userContent,
    });

    const controller = new AbortController();

    const stream = this.client.responses.stream(
      {
        model,
        input,
      },
      {
        signal: controller.signal,
      },
    );

    let aggregated = "";
    const startTime = Date.now();

    for await (const event of stream) {
      const eventType = (event as { type?: string }).type;

      if (
        eventType === "response.output_text.delta" &&
        typeof (event as { delta?: unknown }).delta === "string"
      ) {
        const delta = (event as { delta: string }).delta;
        aggregated += delta;
        callback?.(delta);
      } else if (eventType === "response.error") {
        const message =
          (event as { error?: { message?: string } }).error?.message ??
          "OpenAI streaming error";
        throw new Error(message);
      }

      if (Date.now() - startTime > this.config.maxPollMs) {
        controller.abort();
        throw new Error("OpenAI response polling timed out");
      }
    }

    const finalResponse =
      (await stream.finalResponse()) as unknown as FinalResponse;
    if (!aggregated) {
      aggregated = extractTextFromResponse(finalResponse);
    }

    return aggregated.trim();
  }

  async sendChat(
    messages: AiChatMessage[],
    model = "gpt-4.1-mini",
    callback?: (text: string) => void,
  ) {
    const input = [];

    if (this.systemPrompt) {
      input.push({
        role: "system" as const,
        content: [
          {
            type: "input_text" as const,
            text: this.systemPrompt,
          },
        ],
      });
    }

    for (const message of messages) {
      const trimmed = message.content?.trim();
      if (!trimmed) continue;

      const role =
        message.role === "assistant"
          ? ("assistant" as const)
          : message.role === "system"
            ? ("system" as const)
            : ("user" as const);

      input.push({
        role,
        content: [
          {
            type: "input_text" as const,
            text: trimmed,
          },
        ],
      });
    }

    const controller = new AbortController();

    const stream = this.client.responses.stream(
      {
        model,
        input,
      },
      {
        signal: controller.signal,
      },
    );

    let aggregated = "";
    const startTime = Date.now();

    for await (const event of stream) {
      const eventType = (event as { type?: string }).type;

      if (
        eventType === "response.output_text.delta" &&
        typeof (event as { delta?: unknown }).delta === "string"
      ) {
        const delta = (event as { delta: string }).delta;
        aggregated += delta;
        callback?.(delta);
      } else if (eventType === "response.error") {
        const message =
          (event as { error?: { message?: string } }).error?.message ??
          "OpenAI streaming error";
        throw new Error(message);
      }

      if (Date.now() - startTime > this.config.maxPollMs) {
        controller.abort();
        throw new Error("OpenAI response polling timed out");
      }
    }

    const finalResponse =
      (await stream.finalResponse()) as unknown as FinalResponse;
    if (!aggregated) {
      aggregated = extractTextFromResponse(finalResponse);
    }

    return aggregated.trim();
  }

  async getAvailableModels(): Promise<OpenAiModel[]> {
    const response = await this.client.models.list();

    return response.data.map((model) => ({
      name: model.id,
      displayName: model.id,
    }));
  }
}
