/**
 * Custom hook for handling chat API calls with streaming support
 */

import { useCallback } from "react";

/**
 * Parse and process streaming response from the chat API
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
      const lines = chunk
        .split("\n")
        .filter((line) => line.startsWith("data: "));

      for (const line of lines) {
        const data = line.slice(6);
        if (data === "[DONE]") continue;

        try {
          const parsed = JSON.parse(data);
          if (parsed.content) {
            fullResponse += parsed.content;
            onChunk(fullResponse);
          }
        } catch (e) {
          // Skip malformed JSON
        }
      }
    }

    onComplete(fullResponse);
  } catch (error) {
    onError(error);
  }
};

/**
 * Hook for making chat API requests with streaming support
 */
export const useChatApi = (settings) => {
  const sendChatRequest = useCallback(
    async (messages, model, onChunk, onComplete, onError) => {
      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages,
            model,
            apiKey: settings.apiKey || undefined,
            apiUrl: settings.apiUrl || undefined,
          }),
        });

        const contentType = response.headers.get("content-type");
        const isStreaming = contentType?.includes("text/event-stream");

        if (isStreaming) {
          await processStreamingResponse(
            response,
            onChunk,
            onComplete,
            onError
          );
        } else {
          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.error || "Failed to get response");
          }
          onComplete(data.response);
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
