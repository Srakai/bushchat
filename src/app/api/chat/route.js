import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const {
      messages,
      model,
      apiKey: clientApiKey,
      apiUrl: clientApiUrl,
    } = await request.json();

    // Use client-provided settings or fall back to env
    const apiKey = clientApiKey || process.env.OPENAI_API_KEY;
    const apiUrl = clientApiUrl || "https://api.openai.com/v1";

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "OpenAI API key not configured. Set it in settings or server .env",
        },
        { status: 500 }
      );
    }

    // Check if model supports streaming (o1 models don't support streaming)
    const supportsStreaming = !model.startsWith("o1");

    const response = await fetch(`${apiUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        max_tokens: 4000,
        stream: supportsStreaming,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { error: error.error?.message || "OpenAI API error" },
        { status: response.status }
      );
    }

    // If streaming, return a streaming response
    if (supportsStreaming) {
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();

      const stream = new ReadableStream({
        async start(controller) {
          const reader = response.body.getReader();

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value);
              const lines = chunk
                .split("\n")
                .filter((line) => line.trim() !== "");

              for (const line of lines) {
                if (line.startsWith("data: ")) {
                  const data = line.slice(6);
                  if (data === "[DONE]") {
                    controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                    continue;
                  }
                  try {
                    const parsed = JSON.parse(data);
                    const content = parsed.choices[0]?.delta?.content || "";
                    if (content) {
                      controller.enqueue(
                        encoder.encode(
                          `data: ${JSON.stringify({ content })}\n\n`
                        )
                      );
                    }
                  } catch (e) {
                    // Skip malformed JSON
                  }
                }
              }
            }
          } finally {
            reader.releaseLock();
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // Non-streaming response (for o1 models)
    const data = await response.json();
    const responseText = data.choices[0]?.message?.content || "";

    return NextResponse.json({ response: responseText });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
