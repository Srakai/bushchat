/**
 * Hook for fetching and managing model selection
 */
import { useState, useEffect, useRef } from "react";
import { defaultModels } from "../utils/constants";

export const useModels = (settings) => {
  const [selectedModel, setSelectedModel] = useState(defaultModels[0]);
  const [modelsList, setModelsList] = useState(defaultModels);
  const initialFetchDone = useRef(false);

  // Auto-fetch models on startup if API key is configured
  useEffect(() => {
    if (!initialFetchDone.current && (settings.apiKey || settings.apiUrl)) {
      initialFetchDone.current = true;
      const fetchModels = async () => {
        try {
          const url = settings.apiUrl || "https://api.openai.com/v1";
          const response = await fetch(`${url}/models`, {
            headers: settings.apiKey
              ? { Authorization: `Bearer ${settings.apiKey}` }
              : {},
          });

          if (!response.ok) return;

          const data = await response.json();
          const fetchedModels =
            data.data
              ?.map((m) => m.id)
              ?.filter(
                (id) =>
                  id &&
                  !id.includes("embedding") &&
                  !id.includes("whisper") &&
                  !id.includes("tts") &&
                  !id.includes("dall-e")
              )
              ?.sort() || [];

          if (fetchedModels.length > 0) {
            setModelsList(fetchedModels);
            setSelectedModel((current) =>
              fetchedModels.includes(current) ? current : fetchedModels[0]
            );
          }
        } catch (error) {
          console.error("Failed to fetch models:", error);
        }
      };
      fetchModels();
    }
  }, [settings.apiKey, settings.apiUrl]);

  return {
    selectedModel,
    setSelectedModel,
    modelsList,
    setModelsList,
  };
};
