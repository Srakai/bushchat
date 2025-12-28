"use client";
import React, {
  useState,
  useCallback,
  useRef,
  useMemo,
  useEffect,
} from "react";
import ReactFlow, {
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  useReactFlow,
  Panel,
} from "reactflow";
import "reactflow/dist/style.css";
import { Box } from "@mui/material";

// Components
import ChatNode from "./ChatNode";
import MergeEdge, { CONTEXT_MODE } from "./MergeEdge";
import SettingsModal from "./SettingsModal";
import WaitlistModal from "./WaitlistModal";
import InfoPanel from "./InfoPanel";
import InputPanel from "./InputPanel";

// Utilities
import { colors } from "../styles/theme";
import { defaultModels, initialNodes, initialEdges } from "../utils/constants";
import {
  getPathToNode,
  buildConversationFromPath,
  findLowestCommonAncestor,
  getDescendants,
} from "../utils/treeUtils";
import {
  loadChatsList,
  saveChatsList,
  loadChatState,
  saveChatState,
  deleteChatState,
  getActiveChatId,
  setActiveChatId,
  loadSettings,
  saveSettings,
  generateChatId,
} from "../utils/storage";
import { useChatApi } from "../hooks/useChatApi";
import {
  generateShareUrl,
  getSharedChatFromUrl,
  clearShareHash,
} from "../utils/sharing";

const nodeTypes = {
  chatNode: ChatNode,
};

const edgeTypes = {
  mergeEdge: MergeEdge,
};

const TreeChatInner = () => {
  // Chat management state
  const [activeChatId, setActiveChatIdState] = useState(() => getActiveChatId());
  const [chatsList, setChatsList] = useState(() => loadChatsList());

  // Track if current chat is a shared chat that hasn't been saved yet
  const [isSharedView, setIsSharedView] = useState(false);

  // Settings state
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState(() => loadSettings());

  // Waitlist modal state
  const [waitlistOpen, setWaitlistOpen] = useState(false);

  // Load initial state from localStorage or use defaults
  const savedState = useMemo(() => loadChatState(activeChatId), [activeChatId]);

  const [nodes, setNodes, onNodesChange] = useNodesState(
    savedState?.nodes || initialNodes
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    savedState?.edges || initialEdges
  );
  const [selectedNodeId, setSelectedNodeId] = useState(
    savedState?.selectedNodeId || "root"
  );
  const [inputMessage, setInputMessage] = useState("");
  const [selectedModel, setSelectedModel] = useState(defaultModels[0]);
  const [modelsList, setModelsList] = useState(defaultModels);
  const [mergeMode, setMergeMode] = useState(null);
  const nodeIdCounter = useRef(savedState?.nodeIdCounter || 1);
  const { fitView } = useReactFlow();

  // Chat API hook
  const { sendChatRequest } = useChatApi(settings);

  // Auto-save to localStorage whenever nodes or edges change (but not for shared view)
  useEffect(() => {
    if (isSharedView) return; // Don't auto-save shared chats until user takes action
    const timeoutId = setTimeout(() => {
      saveChatState(
        activeChatId,
        nodes,
        edges,
        selectedNodeId,
        nodeIdCounter.current
      );
      setChatsList(loadChatsList()); // Refresh list to get updated names
    }, 500); // Debounce saves
    return () => clearTimeout(timeoutId);
  }, [nodes, edges, selectedNodeId, activeChatId, isSharedView]);

  // Load shared chat from URL hash on mount
  const sharedChatLoadedRef = useRef(false);
  useEffect(() => {
    if (sharedChatLoadedRef.current) return;
    sharedChatLoadedRef.current = true;

    const sharedState = getSharedChatFromUrl();
    if (sharedState && sharedState.nodes) {
      // Load the shared chat state
      setNodes(sharedState.nodes || initialNodes);
      setEdges(sharedState.edges || initialEdges);
      setSelectedNodeId(sharedState.selectedNodeId || "root");
      nodeIdCounter.current = sharedState.nodeIdCounter || 1;
      setIsSharedView(true);

      // Clear the hash from URL
      clearShareHash();

      // Fit view after loading
      setTimeout(() => fitView({ padding: 0.2 }), 100);
    }
  }, [setNodes, setEdges, fitView]);

  // Function to convert shared view to saved chat (called when user takes action)
  const commitSharedChat = useCallback(() => {
    if (!isSharedView) return;

    // Create a new chat entry for the shared chat
    const newChatId = generateChatId();
    const newChat = {
      id: newChatId,
      name: "Shared Chat",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const updatedList = [newChat, ...chatsList];
    saveChatsList(updatedList);
    setChatsList(updatedList);
    setActiveChatId(newChatId);
    setActiveChatIdState(newChatId);
    setIsSharedView(false);

    // Save current state to the new chat
    saveChatState(
      newChatId,
      nodes,
      edges,
      selectedNodeId,
      nodeIdCounter.current
    );
    setChatsList(loadChatsList()); // Refresh to get chat name from first message
  }, [isSharedView, chatsList, nodes, edges, selectedNodeId]);

  // Switch to a different chat
  const switchToChat = useCallback(
    (chatId) => {
      setActiveChatId(chatId);
      setActiveChatIdState(chatId);
      setIsSharedView(false); // Clear shared view when switching to saved chat
      const chatState = loadChatState(chatId);
      if (chatState) {
        setNodes(chatState.nodes || initialNodes);
        setEdges(chatState.edges || initialEdges);
        setSelectedNodeId(chatState.selectedNodeId || "root");
        nodeIdCounter.current = chatState.nodeIdCounter || 1;
      } else {
        setNodes(initialNodes);
        setEdges(initialEdges);
        setSelectedNodeId("root");
        nodeIdCounter.current = 1;
      }
      setMergeMode(null);
      setTimeout(() => fitView({ padding: 0.2 }), 100);
    },
    [setNodes, setEdges, fitView]
  );

  // Create a new chat
  const createNewChat = useCallback(() => {
    const newChatId = generateChatId();
    const newChat = {
      id: newChatId,
      name: "New Chat",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const updatedList = [newChat, ...chatsList];
    saveChatsList(updatedList);
    setChatsList(updatedList);
    switchToChat(newChatId);
  }, [chatsList, switchToChat]);

  // Delete a chat
  const deleteChat = useCallback(
    (chatId, e) => {
      e.stopPropagation();
      if (chatsList.length <= 1) return; // Don't delete last chat

      const updatedList = chatsList.filter((c) => c.id !== chatId);
      saveChatsList(updatedList);
      setChatsList(updatedList);

      // Remove chat data
      deleteChatState(chatId);

      // If deleting active chat, switch to first available
      if (chatId === activeChatId && updatedList.length > 0) {
        switchToChat(updatedList[0].id);
      }
    },
    [chatsList, activeChatId, switchToChat]
  );

  // Save settings handler
  const handleSaveSettings = useCallback((newSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings, newSettings.saveApiKey);
  }, []);

  // Share current chat
  const handleShareChat = useCallback(() => {
    // Prepare chat state for sharing (strip callbacks)
    const nodesToShare = nodes.map((node) => ({
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

    const chatState = {
      nodes: nodesToShare,
      edges,
      selectedNodeId,
      nodeIdCounter: nodeIdCounter.current,
    };

    const shareUrl = generateShareUrl(chatState);
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl).then(
        () => {
          // Could add a toast notification here
          console.log("Share URL copied to clipboard!");
        },
        (err) => {
          console.error("Failed to copy share URL:", err);
          // Fallback: show the URL in a prompt
          window.prompt("Copy this share URL:", shareUrl);
        }
      );
    }
  }, [nodes, edges, selectedNodeId]);

  // Auto-fetch models on startup if API key is configured
  const initialFetchDone = useRef(false);
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

  // Get the selected node
  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId),
    [nodes, selectedNodeId]
  );

  // Get conversation history for selected node
  const conversationHistory = useMemo(() => {
    const path = getPathToNode(selectedNodeId, nodes, edges);
    return buildConversationFromPath(path);
  }, [selectedNodeId, nodes, edges]);

  // Update node data
  const updateNodeData = useCallback(
    (nodeId, dataUpdate) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === nodeId) {
            return {
              ...node,
              data: { ...node.data, ...dataUpdate },
            };
          }
          return node;
        })
      );
    },
    [setNodes]
  );

  // Send message and create new node
  const sendMessage = useCallback(
    async (parentNodeId, userMessage) => {
      // Commit shared chat to storage when user takes action
      if (isSharedView) commitSharedChat();

      const newNodeId = `node-${nodeIdCounter.current++}`;

      // Get parent node position
      const parentNode = nodes.find((n) => n.id === parentNodeId);
      const existingChildren = edges.filter((e) => e.source === parentNodeId);
      const xOffset = existingChildren.length * 320;

      // Create new node immediately with loading state
      const newNode = {
        id: newNodeId,
        type: "chatNode",
        position: {
          x:
            parentNode.position.x +
            xOffset -
            (existingChildren.length > 0 ? 160 : 0),
          y: parentNode.position.y + 200,
        },
        data: {
          userMessage,
          assistantMessage: "",
          status: "loading",
          isRoot: false,
        },
      };

      // Add node and edge
      setNodes((nds) => [...nds, newNode]);
      setEdges((eds) => [
        ...eds,
        {
          id: `edge-${parentNodeId}-${newNodeId}`,
          source: parentNodeId,
          target: newNodeId,
          type: "smoothstep",
          style: { stroke: "#4a9eff", strokeWidth: 2 },
        },
      ]);

      // Select the new node
      setSelectedNodeId(newNodeId);

      // Build conversation context
      const path = getPathToNode(parentNodeId, nodes, edges);
      const conversationMessages = buildConversationFromPath(path);
      conversationMessages.push({ role: "user", content: userMessage });

      // Send request
      await sendChatRequest(
        conversationMessages,
        selectedModel,
        (partialResponse) => {
          updateNodeData(newNodeId, {
            assistantMessage: partialResponse,
            status: "loading",
          });
        },
        (fullResponse) => {
          updateNodeData(newNodeId, {
            assistantMessage: fullResponse,
            status: "complete",
          });
        },
        (error) => {
          console.error(error);
          updateNodeData(newNodeId, {
            error: error.message,
            status: "error",
          });
        }
      );

      // Fit view after adding node
      setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 100);
    },
    [nodes, edges, selectedModel, setNodes, setEdges, updateNodeData, fitView, sendChatRequest, isSharedView, commitSharedChat]
  );

  // Handle adding a branch from a node
  const handleAddBranch = useCallback((nodeId) => {
    setSelectedNodeId(nodeId);
    document.getElementById("message-input")?.focus();
  }, []);

  // Handle editing a node's user message (regenerates response)
  const handleEditNode = useCallback(
    async (nodeId, newUserMessage) => {
      if (!newUserMessage.trim()) return;

      // Commit shared chat to storage when user takes action
      if (isSharedView) commitSharedChat();

      const node = nodes.find((n) => n.id === nodeId);

      // Check if this is a merged node
      if (node?.data?.isMergedNode && node.data.mergeParents) {
        const [firstNodeId, secondNodeId] = node.data.mergeParents;
        const lcaId = node.data.lcaId;

        const edge1 = edges.find(
          (e) => e.source === firstNodeId && e.target === nodeId
        );
        const edge2 = edges.find(
          (e) => e.source === secondNodeId && e.target === nodeId
        );

        const contextMode1 = edge1?.data?.contextMode || CONTEXT_MODE.SINGLE;
        const contextMode2 = edge2?.data?.contextMode || CONTEXT_MODE.SINGLE;

        const path1 = getPathToNode(firstNodeId, nodes, edges);
        const path2 = getPathToNode(secondNodeId, nodes, edges);

        const lcaIndex1 = path1.findIndex((n) => n.id === lcaId);
        const lcaIndex2 = path2.findIndex((n) => n.id === lcaId);

        let branch1, branch2;
        if (contextMode1 === CONTEXT_MODE.FULL) {
          branch1 = path1.slice(lcaIndex1 + 1);
        } else {
          const lastNode = path1[path1.length - 1];
          branch1 = lastNode ? [lastNode] : [];
        }

        if (contextMode2 === CONTEXT_MODE.FULL) {
          branch2 = path2.slice(lcaIndex2 + 1);
        } else {
          const lastNode = path2[path2.length - 1];
          branch2 = lastNode ? [lastNode] : [];
        }

        const lcaPath = path1.slice(0, lcaIndex1 + 1);
        const baseContext = buildConversationFromPath(lcaPath);

        const branch1Messages = buildConversationFromPath(branch1);
        const branch2Messages = buildConversationFromPath(branch2);

        const mode1Label =
          contextMode1 === CONTEXT_MODE.FULL ? "full context" : "single message";
        const mode2Label =
          contextMode2 === CONTEXT_MODE.FULL ? "full context" : "single message";

        let mergedContext =
          "You are continuing a conversation that has branched into two paths. Here are both branches:\n\n";
        mergedContext += `=== BRANCH A (${mode1Label}) ===\n`;
        for (const msg of branch1Messages) {
          mergedContext += `${msg.role.toUpperCase()}: ${msg.content}\n\n`;
        }
        mergedContext += `=== BRANCH B (${mode2Label}) ===\n`;
        for (const msg of branch2Messages) {
          mergedContext += `${msg.role.toUpperCase()}: ${msg.content}\n\n`;
        }
        mergedContext += "=== END BRANCHES ===\n\n";
        mergedContext += newUserMessage;

        updateNodeData(nodeId, {
          userMessage: newUserMessage,
          assistantMessage: "",
          status: "loading",
          error: null,
        });

        const conversationMessages = [
          ...baseContext,
          { role: "user", content: mergedContext },
        ];

        await sendChatRequest(
          conversationMessages,
          selectedModel,
          (partialResponse) => {
            updateNodeData(nodeId, {
              assistantMessage: partialResponse,
              status: "loading",
            });
          },
          (fullResponse) => {
            updateNodeData(nodeId, {
              assistantMessage: fullResponse,
              status: "complete",
            });
          },
          (error) => {
            console.error(error);
            updateNodeData(nodeId, {
              error: error.message,
              status: "error",
            });
          }
        );
        return;
      }

      // Regular node edit
      updateNodeData(nodeId, {
        userMessage: newUserMessage,
        assistantMessage: "",
        status: "loading",
        error: null,
      });

      const parentEdge = edges.find((e) => e.target === nodeId);
      const parentNodeId = parentEdge?.source || "root";

      const path = getPathToNode(parentNodeId, nodes, edges);
      const conversationMessages = buildConversationFromPath(path);
      conversationMessages.push({ role: "user", content: newUserMessage });

      await sendChatRequest(
        conversationMessages,
        selectedModel,
        (partialResponse) => {
          updateNodeData(nodeId, {
            assistantMessage: partialResponse,
            status: "loading",
          });
        },
        (fullResponse) => {
          updateNodeData(nodeId, {
            assistantMessage: fullResponse,
            status: "complete",
          });
        },
        (error) => {
          console.error(error);
          updateNodeData(nodeId, {
            error: error.message,
            status: "error",
          });
        }
      );
    },
    [nodes, edges, selectedModel, updateNodeData, sendChatRequest, isSharedView, commitSharedChat]
  );

  // Handle deleting a node and its descendants
  const handleDeleteNode = useCallback(
    (nodeId) => {
      if (nodeId === "root") return;

      // Commit shared chat to storage when user takes action
      if (isSharedView) commitSharedChat();

      const descendants = getDescendants(nodeId, nodes, edges);
      const nodesToRemove = new Set([nodeId, ...descendants]);

      const parentEdge = edges.find((e) => e.target === nodeId);
      const parentId = parentEdge?.source || "root";

      setNodes((nds) => nds.filter((n) => !nodesToRemove.has(n.id)));
      setEdges((eds) =>
        eds.filter(
          (e) => !nodesToRemove.has(e.source) && !nodesToRemove.has(e.target)
        )
      );

      setSelectedNodeId(parentId);
    },
    [nodes, edges, setNodes, setEdges, isSharedView, commitSharedChat]
  );

  // Toggle context mode on an edge
  const handleToggleContextMode = useCallback(
    (edgeId) => {
      setEdges((eds) =>
        eds.map((edge) => {
          if (edge.id === edgeId) {
            const currentMode = edge.data?.contextMode || CONTEXT_MODE.FULL;
            const newMode =
              currentMode === CONTEXT_MODE.FULL
                ? CONTEXT_MODE.SINGLE
                : CONTEXT_MODE.FULL;
            return {
              ...edge,
              data: {
                ...edge.data,
                contextMode: newMode,
              },
            };
          }
          return edge;
        })
      );
    },
    [setEdges]
  );

  // Regenerate a merged node with current edge context settings
  const handleRegenerateMerge = useCallback(
    async (nodeId) => {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node?.data?.isMergedNode || !node.data.mergeParents) return;

      const [firstNodeId, secondNodeId] = node.data.mergeParents;
      const lcaId = node.data.lcaId;

      const edge1 = edges.find(
        (e) => e.source === firstNodeId && e.target === nodeId
      );
      const edge2 = edges.find(
        (e) => e.source === secondNodeId && e.target === nodeId
      );

      const contextMode1 = edge1?.data?.contextMode || CONTEXT_MODE.FULL;
      const contextMode2 = edge2?.data?.contextMode || CONTEXT_MODE.FULL;

      const path1 = getPathToNode(firstNodeId, nodes, edges);
      const path2 = getPathToNode(secondNodeId, nodes, edges);

      const lcaIndex1 = path1.findIndex((n) => n.id === lcaId);
      const lcaIndex2 = path2.findIndex((n) => n.id === lcaId);

      let branch1, branch2;
      if (contextMode1 === CONTEXT_MODE.FULL) {
        branch1 = path1.slice(lcaIndex1 + 1);
      } else {
        const lastNode = path1[path1.length - 1];
        branch1 = lastNode ? [lastNode] : [];
      }

      if (contextMode2 === CONTEXT_MODE.FULL) {
        branch2 = path2.slice(lcaIndex2 + 1);
      } else {
        const lastNode = path2[path2.length - 1];
        branch2 = lastNode ? [lastNode] : [];
      }

      const lcaPath = path1.slice(0, lcaIndex1 + 1);
      const baseContext = buildConversationFromPath(lcaPath);

      const branch1Messages = buildConversationFromPath(branch1);
      const branch2Messages = buildConversationFromPath(branch2);

      const mode1Label =
        contextMode1 === CONTEXT_MODE.FULL ? "full context" : "single message";
      const mode2Label =
        contextMode2 === CONTEXT_MODE.FULL ? "full context" : "single message";

      let mergedPrompt =
        "You are continuing a conversation that has branched into two paths. Here are both branches:\n\n";
      mergedPrompt += `=== BRANCH A (${mode1Label}) ===\n`;
      for (const msg of branch1Messages) {
        mergedPrompt += `${msg.role.toUpperCase()}: ${msg.content}\n\n`;
      }
      mergedPrompt += `=== BRANCH B (${mode2Label}) ===\n`;
      for (const msg of branch2Messages) {
        mergedPrompt += `${msg.role.toUpperCase()}: ${msg.content}\n\n`;
      }
      mergedPrompt += "=== END BRANCHES ===\n\n";
      mergedPrompt +=
        "Please synthesize insights from both branches and continue the conversation, acknowledging key points from each path.";

      updateNodeData(nodeId, {
        assistantMessage: "",
        status: "loading",
        error: null,
      });

      const conversationMessages = [
        ...baseContext,
        { role: "user", content: mergedPrompt },
      ];

      await sendChatRequest(
        conversationMessages,
        selectedModel,
        (partialResponse) => {
          updateNodeData(nodeId, {
            assistantMessage: partialResponse,
            status: "loading",
          });
        },
        (fullResponse) => {
          updateNodeData(nodeId, {
            assistantMessage: fullResponse,
            status: "complete",
          });
        },
        (error) => {
          console.error(error);
          updateNodeData(nodeId, {
            error: error.message,
            status: "error",
          });
        }
      );
    },
    [nodes, edges, selectedModel, updateNodeData, sendChatRequest]
  );

  // Handle merge - first click selects first node, second click performs merge
  const handleMergeNode = useCallback(
    async (nodeId) => {
      if (nodeId === "root") return;

      if (!mergeMode) {
        setMergeMode({ firstNodeId: nodeId });
        return;
      }

      if (mergeMode.firstNodeId === nodeId) {
        setMergeMode(null);
        return;
      }

      // Commit shared chat to storage when user takes action
      if (isSharedView) commitSharedChat();

      const firstNodeId = mergeMode.firstNodeId;
      const secondNodeId = nodeId;

      const lcaId = findLowestCommonAncestor(
        firstNodeId,
        secondNodeId,
        nodes,
        edges
      );

      const path1 = getPathToNode(firstNodeId, nodes, edges);
      const path2 = getPathToNode(secondNodeId, nodes, edges);

      const lcaIndex1 = path1.findIndex((n) => n.id === lcaId);
      const lcaIndex2 = path2.findIndex((n) => n.id === lcaId);

      const branch1 = path1.slice(lcaIndex1 + 1);
      const branch2 = path2.slice(lcaIndex2 + 1);

      const lcaPath = path1.slice(0, lcaIndex1 + 1);
      const baseContext = buildConversationFromPath(lcaPath);

      const branch1Messages = buildConversationFromPath(branch1);
      const branch2Messages = buildConversationFromPath(branch2);

      let mergedPrompt =
        "You are continuing a conversation that has branched into two paths. Here are both branches:\n\n";
      mergedPrompt += "=== BRANCH A ===\n";
      for (const msg of branch1Messages) {
        mergedPrompt += `${msg.role.toUpperCase()}: ${msg.content}\n\n`;
      }
      mergedPrompt += "=== BRANCH B ===\n";
      for (const msg of branch2Messages) {
        mergedPrompt += `${msg.role.toUpperCase()}: ${msg.content}\n\n`;
      }
      mergedPrompt += "=== END BRANCHES ===\n\n";
      mergedPrompt +=
        "Please synthesize insights from both branches and continue the conversation, acknowledging key points from each path.";

      const newNodeId = `node-${nodeIdCounter.current++}`;
      const node1 = nodes.find((n) => n.id === firstNodeId);
      const node2 = nodes.find((n) => n.id === secondNodeId);

      const newNode = {
        id: newNodeId,
        type: "chatNode",
        position: {
          x: (node1.position.x + node2.position.x) / 2,
          y: Math.max(node1.position.y, node2.position.y) + 200,
        },
        data: {
          userMessage: "[Merged from two branches]",
          assistantMessage: "",
          status: "loading",
          isRoot: false,
          isMergedNode: true,
          mergeParents: [firstNodeId, secondNodeId],
          lcaId: lcaId,
        },
      };

      const edge1Id = `edge-${firstNodeId}-${newNodeId}`;
      const edge2Id = `edge-${secondNodeId}-${newNodeId}`;

      setNodes((nds) => [...nds, newNode]);
      setEdges((eds) => [
        ...eds,
        {
          id: edge1Id,
          source: firstNodeId,
          target: newNodeId,
          type: "mergeEdge",
          style: { stroke: "#ff9800", strokeWidth: 2 },
          data: {
            isMergeEdge: true,
            contextMode: CONTEXT_MODE.SINGLE,
          },
        },
        {
          id: edge2Id,
          source: secondNodeId,
          target: newNodeId,
          type: "mergeEdge",
          style: { stroke: "#ff9800", strokeWidth: 2 },
          data: {
            isMergeEdge: true,
            contextMode: CONTEXT_MODE.SINGLE,
          },
        },
      ]);

      setSelectedNodeId(newNodeId);
      setMergeMode(null);

      const conversationMessages = [
        ...baseContext,
        { role: "user", content: mergedPrompt },
      ];

      await sendChatRequest(
        conversationMessages,
        selectedModel,
        (partialResponse) => {
          updateNodeData(newNodeId, {
            assistantMessage: partialResponse,
            status: "loading",
          });
        },
        (fullResponse) => {
          updateNodeData(newNodeId, {
            assistantMessage: fullResponse,
            status: "complete",
          });
        },
        (error) => {
          console.error(error);
          updateNodeData(newNodeId, {
            error: error.message,
            status: "error",
          });
        }
      );

      setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 100);
    },
    [
      mergeMode,
      nodes,
      edges,
      selectedModel,
      setNodes,
      setEdges,
      updateNodeData,
      fitView,
      sendChatRequest,
      isSharedView,
      commitSharedChat,
    ]
  );

  // Inject callbacks into all nodes
  const nodesWithCallbacks = useMemo(() => {
    return nodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        onAddBranch: handleAddBranch,
        onEditNode: handleEditNode,
        onDeleteNode: handleDeleteNode,
        onMergeNode: handleMergeNode,
        onRegenerateMerge: handleRegenerateMerge,
        isMergeSource: mergeMode?.firstNodeId === node.id,
      },
    }));
  }, [
    nodes,
    handleAddBranch,
    handleEditNode,
    handleDeleteNode,
    handleMergeNode,
    handleRegenerateMerge,
    mergeMode,
  ]);

  // Inject callbacks into all edges
  const edgesWithCallbacks = useMemo(() => {
    return edges.map((edge) => ({
      ...edge,
      data: {
        ...edge.data,
        onToggleContextMode: handleToggleContextMode,
      },
    }));
  }, [edges, handleToggleContextMode]);

  // Handle form submit
  const handleSubmit = (message) => {
    sendMessage(selectedNodeId, message);
    setInputMessage("");
  };

  // Handle node selection
  const onNodeClick = useCallback((_, node) => {
    setSelectedNodeId(node.id);
  }, []);

  return (
    <Box
      sx={{
        width: "100vw",
        height: "100vh",
        backgroundColor: "#252627",
      }}
    >
      <ReactFlow
        nodes={nodesWithCallbacks}
        edges={edgesWithCallbacks}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        minZoom={0.1}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
        proOptions={{ hideAttribution: true }}
        deleteKeyCode={null}
        selectionKeyCode={null}
      >
        <Background color="#888888" gap={20} />
        <Controls
          style={{
            backgroundColor: colors.bg.secondary,
            borderRadius: 8,
            border: `1px solid ${colors.border.primary}`,
          }}
        />

        {/* Input Panel */}
        <Panel position="bottom-center">
          <InputPanel
            inputMessage={inputMessage}
            onInputChange={setInputMessage}
            onSubmit={handleSubmit}
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
            modelsList={modelsList}
            isRootSelected={selectedNode?.data?.isRoot}
          />
        </Panel>

        {/* Info Panel */}
        <Panel position="top-left">
          <InfoPanel
            chatsList={chatsList}
            activeChatId={activeChatId}
            onCreateNewChat={createNewChat}
            onSwitchChat={switchToChat}
            onDeleteChat={deleteChat}
            onOpenSettings={() => setSettingsOpen(true)}
            onOpenWaitlist={() => setWaitlistOpen(true)}
            onShareChat={handleShareChat}
            mergeMode={mergeMode}
            onCancelMerge={() => setMergeMode(null)}
            conversationHistoryLength={conversationHistory.length}
          />
        </Panel>

        {/* Settings Modal */}
        <SettingsModal
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          settings={settings}
          onSave={handleSaveSettings}
          modelsList={modelsList}
          setModelsList={setModelsList}
          setSelectedModel={setSelectedModel}
        />

        {/* Waitlist Modal */}
        <WaitlistModal
          open={waitlistOpen}
          onClose={() => setWaitlistOpen(false)}
        />
      </ReactFlow>
    </Box>
  );
};

const TreeChat = () => {
  return (
    <ReactFlowProvider>
      <TreeChatInner />
    </ReactFlowProvider>
  );
};

export default TreeChat;
