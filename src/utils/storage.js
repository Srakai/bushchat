/**
 * LocalStorage utilities for chat persistence and settings
 */

import { getChatName } from "./treeUtils";
import {
  CHATS_KEY,
  ACTIVE_CHAT_KEY,
  SETTINGS_KEY,
  API_KEY_STORAGE_KEY,
  RECENT_MODELS_KEY,
  ARTIFACTS_KEY,
  MAX_RECENT_MODELS,
  initialNodes,
  initialEdges,
} from "./constants";

// Generate unique chat ID
export const generateChatId = () =>
  `chat-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

// Generate unique group ID
export const generateGroupId = () =>
  `group-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

// Load all chats list from localStorage
export const loadChatsList = () => {
  if (typeof window === "undefined") return [];
  try {
    const saved = localStorage.getItem(CHATS_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error("Failed to load chats list:", e);
  }
  return [];
};

// Save chats list to localStorage
export const saveChatsList = (chatsList) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CHATS_KEY, JSON.stringify(chatsList));
  } catch (e) {
    console.error("Failed to save chats list:", e);
  }
};

// Load a specific chat's state
export const loadChatState = (chatId) => {
  if (typeof window === "undefined") return null;
  try {
    const saved = localStorage.getItem(`bushchat-${chatId}`);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error("Failed to load chat state:", e);
  }
  return null;
};

// Save a specific chat's state
export const saveChatState = (
  chatId,
  nodes,
  edges,
  selectedNodeId,
  nodeIdCounter
) => {
  if (typeof window === "undefined") return;
  try {
    // Strip callbacks from nodes before saving
    const nodesToSave = nodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        onAddBranch: undefined,
        onEditNode: undefined,
        onDeleteNode: undefined,
        onMergeNode: undefined,
        onRegenerateMerge: undefined,
        isMergeSource: undefined,
      },
    }));
    localStorage.setItem(
      `bushchat-${chatId}`,
      JSON.stringify({
        nodes: nodesToSave,
        edges,
        selectedNodeId,
        nodeIdCounter,
      })
    );
    // Also update chat name in list
    const chatsList = loadChatsList();
    const chatIndex = chatsList.findIndex((c) => c.id === chatId);
    if (chatIndex >= 0) {
      chatsList[chatIndex].name = getChatName(nodesToSave);
      chatsList[chatIndex].updatedAt = Date.now();
      saveChatsList(chatsList);
    }
  } catch (e) {
    console.error("Failed to save chat state:", e);
  }
};

// Delete a chat's state from localStorage
export const deleteChatState = (chatId) => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(`bushchat-${chatId}`);
};

// Get or create active chat ID
export const getActiveChatId = () => {
  if (typeof window === "undefined") return null;
  try {
    let activeId = localStorage.getItem(ACTIVE_CHAT_KEY);
    if (!activeId) {
      // Create initial chat
      activeId = generateChatId();
      localStorage.setItem(ACTIVE_CHAT_KEY, activeId);
      const chatsList = [
        {
          id: activeId,
          name: "New Chat",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];
      saveChatsList(chatsList);
    }
    return activeId;
  } catch (e) {
    console.error("Failed to get active chat:", e);
  }
  return generateChatId();
};

// Set active chat ID
export const setActiveChatId = (chatId) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACTIVE_CHAT_KEY, chatId);
};

// Load settings from localStorage
export const loadSettings = () => {
  if (typeof window === "undefined")
    return {
      apiKey: "",
      apiUrl: "",
      saveApiKey: false,
      panOnScroll: true,
      lockScrollOnNodeFocus: false,
    };
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    const savedApiKey = localStorage.getItem(API_KEY_STORAGE_KEY);
    const settings = saved
      ? JSON.parse(saved)
      : {
          apiUrl: "",
          saveApiKey: false,
          panOnScroll: true,
          lockScrollOnNodeFocus: false,
        };
    // Load API key separately if it was saved
    if (savedApiKey && settings.saveApiKey) {
      settings.apiKey = savedApiKey;
    } else {
      settings.apiKey = "";
    }
    // Default panOnScroll to true if not set
    if (settings.panOnScroll === undefined) {
      settings.panOnScroll = true;
    }
    // Default lockScrollOnNodeFocus to false if not set
    if (settings.lockScrollOnNodeFocus === undefined) {
      settings.lockScrollOnNodeFocus = false;
    }
    return settings;
  } catch (e) {
    console.error("Failed to load settings:", e);
  }
  return {
    apiKey: "",
    apiUrl: "",
    saveApiKey: false,
    panOnScroll: true,
    lockScrollOnNodeFocus: false,
  };
};

// Save settings to localStorage
export const saveSettings = (settings, shouldSaveApiKey) => {
  if (typeof window === "undefined") return;
  try {
    // Save non-sensitive settings
    const settingsToSave = {
      apiUrl: settings.apiUrl,
      saveApiKey: shouldSaveApiKey,
      panOnScroll: settings.panOnScroll,
      lockScrollOnNodeFocus: settings.lockScrollOnNodeFocus,
    };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settingsToSave));

    // Handle API key separately
    if (shouldSaveApiKey && settings.apiKey) {
      localStorage.setItem(API_KEY_STORAGE_KEY, settings.apiKey);
    } else {
      // Explicitly remove API key when unchecked
      localStorage.removeItem(API_KEY_STORAGE_KEY);
    }
  } catch (e) {
    console.error("Failed to save settings:", e);
  }
};

// Waitlist utilities
export const getWaitlistEmail = () => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("bushchat-waitlist-email");
};

export const saveWaitlistEmail = (email) => {
  if (typeof window === "undefined") return;
  localStorage.setItem("bushchat-waitlist-email", email);
};

// Load recent models from localStorage (sorted by last used, most recent first)
export const loadRecentModels = () => {
  if (typeof window === "undefined") return [];
  try {
    const saved = localStorage.getItem(RECENT_MODELS_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error("Failed to load recent models:", e);
  }
  return [];
};

// Save a model as recently used (adds to top of stack)
export const saveRecentModel = (modelId) => {
  if (typeof window === "undefined" || !modelId) return;
  try {
    const recentModels = loadRecentModels();
    // Remove if already exists (will be re-added at top)
    const filtered = recentModels.filter((m) => m.id !== modelId);
    // Add to top with current timestamp
    const updated = [{ id: modelId, lastUsed: Date.now() }, ...filtered].slice(
      0,
      MAX_RECENT_MODELS
    );
    localStorage.setItem(RECENT_MODELS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error("Failed to save recent model:", e);
  }
};

// Generate unique artifact ID
export const generateArtifactId = () =>
  `artifact-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

// Load all artifacts from localStorage
export const loadArtifacts = () => {
  if (typeof window === "undefined") return [];
  try {
    const saved = localStorage.getItem(ARTIFACTS_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error("Failed to load artifacts:", e);
  }
  return [];
};

// Save artifacts list to localStorage
export const saveArtifacts = (artifacts) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ARTIFACTS_KEY, JSON.stringify(artifacts));
  } catch (e) {
    console.error("Failed to save artifacts:", e);
  }
};

// Add a new artifact
export const addArtifact = (artifact) => {
  const artifacts = loadArtifacts();
  const newArtifact = {
    id: generateArtifactId(),
    createdAt: Date.now(),
    ...artifact,
  };
  saveArtifacts([newArtifact, ...artifacts]);
  return newArtifact;
};

// Delete an artifact by ID
export const deleteArtifact = (artifactId) => {
  const artifacts = loadArtifacts();
  saveArtifacts(artifacts.filter((a) => a.id !== artifactId));
};

// Update an artifact
export const updateArtifact = (artifactId, updates) => {
  const artifacts = loadArtifacts();
  const index = artifacts.findIndex((a) => a.id === artifactId);
  if (index >= 0) {
    artifacts[index] = {
      ...artifacts[index],
      ...updates,
      updatedAt: Date.now(),
    };
    saveArtifacts(artifacts);
  }
};
