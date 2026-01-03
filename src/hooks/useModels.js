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
  const [modelsData, setModelsData] = useState({}); // Map of model ID to full metadata
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

          // Build models data map and list
          const modelsMap = {};
          const fetchedModels =
            data.data
              ?.filter(
                (m) =>
                  m.id &&
                  !m.id.includes("embedding") &&
                  !m.id.includes("whisper") &&
                  !m.id.includes("tts") &&
                  !m.id.includes("dall-e")
              )
              ?.map((m) => {
                // Store full model data
                modelsMap[m.id] = m;
                return m.id;
              })
              ?.sort() || [];

          if (fetchedModels.length > 0) {
            setModelsList(fetchedModels);
            setModelsData(modelsMap);
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
    modelsData,
    setModelsData,
  };
};
