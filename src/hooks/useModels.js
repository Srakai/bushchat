/**
 * Hook for fetching and managing model selection
 */
import { useState, useEffect, useRef } from "react";
import { defaultModels } from "../utils/constants";
import { loadRecentModels } from "../utils/storage";

export const useModels = (settings) => {
  // Try to get the most recent model as initial selection
  const getInitialModel = () => {
    const recentModels = loadRecentModels();
    if (recentModels.length > 0) {
      return recentModels[0].id;
    }
    return defaultModels[0];
  };

  const [selectedModel, setSelectedModel] = useState(getInitialModel);
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
            // Only change selected model if current one isn't in the list
            setSelectedModel((current) => {
              // Check if current model exists in new list
              if (fetchedModels.includes(current)) {
                return current;
              }
              // Try to use most recent model that exists in list
              const recentModels = loadRecentModels();
              for (const recent of recentModels) {
                if (fetchedModels.includes(recent.id)) {
                  return recent.id;
                }
              }
              // Fall back to first model
              return fetchedModels[0];
            });
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
