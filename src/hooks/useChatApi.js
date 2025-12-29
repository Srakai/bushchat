/**
 * Custom hook for handling chat API calls with streaming support
 * Calls OpenAI-compatible APIs directly from the client (works with static hosting like GitHub Pages)
 */

import { useCallback } from "react";

const DEFAULT_API_URL = "https://api.openai.com/v1";

/**
 * Parse and process streaming response from OpenAI API
 */
const processStreamingResponse = async (
  response,
  onChunk,
  onComplete,
  onError
) => {
  try {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split("\n").filter((line) => line.trim() !== "");

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content || "";
            if (content) {
              fullResponse += content;
              onChunk(fullResponse);
            }
          } catch (e) {
            // Skip malformed JSON
          }
        }
      }
    }

    onComplete(fullResponse);
  } catch (error) {
    onError(error);
  }
};

/**
 * Hook for making chat API requests directly to OpenAI-compatible APIs
 * Works with static hosting (GitHub Pages) - no backend required
 */
export const useChatApi = (settings) => {
  const sendChatRequest = useCallback(
    async (messages, model, onChunk, onComplete, onError) => {
      const apiKey = settings.apiKey;
      const apiUrl = settings.apiUrl || DEFAULT_API_URL;

      if (!apiKey) {
        onError(
          new Error(
            "API key not configured. Please add your OpenAI API key in Settings."
          )
        );
        return;
      }

      // Check if model supports streaming (o1 models don't support streaming)
      const supportsStreaming = !model.startsWith("o1");

      try {
        const response = await fetch(`${apiUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages,
            max_completion_tokens: 4000,
            stream: supportsStreaming,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error?.message || `API error: ${response.status}`
          );
        }

        if (supportsStreaming) {
          await processStreamingResponse(
            response,
            onChunk,
            onComplete,
            onError
          );
        } else {
          // Non-streaming response (for o1 models)
          const data = await response.json();
          const responseText = data.choices?.[0]?.message?.content || "";
          onComplete(responseText);
        }
      } catch (error) {
        onError(error);
      }
    },
    [settings]
  );

  return { sendChatRequest };
};

export default useChatApi;
