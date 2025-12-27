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
import {
  Box,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  Paper,
  Typography,
  IconButton,
  Collapse,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ChatNode from "./ChatNode";
import MergeEdge, { CONTEXT_MODE } from "./MergeEdge";

const models = [
  "chatgpt-4o-latest",
  "gpt-4o",
  "gpt-4o-mini",
  "gpt-4-turbo",
  "gpt-4",
  "gpt-3.5-turbo",
  "o1-preview",
  "o1-mini",
];

const nodeTypes = {
  chatNode: ChatNode,
};

const edgeTypes = {
  mergeEdge: MergeEdge,
};

const initialNodes = [
  {
    id: "root",
    type: "chatNode",
    position: { x: 400, y: 50 },
    data: {
      isRoot: true,
      userMessage: "",
      assistantMessage: "",
      status: "complete",
    },
  },
];

const initialEdges = [];

// Helper to get path from root to a specific node
const getPathToNode = (nodeId, nodes, edges) => {
  const path = [];
  let currentId = nodeId;

  while (currentId) {
    const node = nodes.find((n) => n.id === currentId);
    if (node) {
      path.unshift(node);
    }

    // Find parent edge
    const parentEdge = edges.find((e) => e.target === currentId);
    currentId = parentEdge ? parentEdge.source : null;
  }

  return path;
};

// Build conversation messages from path
const buildConversationFromPath = (path) => {
  const messages = [];

  for (const node of path) {
    if (node.data.isRoot) continue;
    if (node.data.userMessage) {
      messages.push({ role: "user", content: node.data.userMessage });
    }
    if (node.data.assistantMessage) {
      messages.push({ role: "assistant", content: node.data.assistantMessage });
    }
  }

  return messages;
};

// Find the lowest common ancestor of two nodes
const findLowestCommonAncestor = (nodeId1, nodeId2, nodes, edges) => {
  const path1 = getPathToNode(nodeId1, nodes, edges);
  const path2 = getPathToNode(nodeId2, nodes, edges);

  const path1Ids = new Set(path1.map((n) => n.id));

  // Walk path2 from node to root, find first match
  for (let i = path2.length - 1; i >= 0; i--) {
    if (path1Ids.has(path2[i].id)) {
      return path2[i].id;
    }
  }

  return "root";
};

// Get all descendants of a node
const getDescendants = (nodeId, nodes, edges) => {
  const descendants = [];
  const queue = [nodeId];

  while (queue.length > 0) {
    const currentId = queue.shift();
    const childEdges = edges.filter((e) => e.source === currentId);

    for (const edge of childEdges) {
      descendants.push(edge.target);
      queue.push(edge.target);
    }
  }

  return descendants;
};

const CHATS_KEY = "bushchat-chats";
const ACTIVE_CHAT_KEY = "bushchat-active-chat";

// Generate unique chat ID
const generateChatId = () =>
  `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Get chat name from nodes (first non-root user message or "New Chat")
const getChatName = (nodes) => {
  const firstUserNode = nodes.find(
    (n) => !n.data?.isRoot && n.data?.userMessage
  );
  if (firstUserNode?.data?.userMessage) {
    const msg = firstUserNode.data.userMessage;
    return msg.length > 30 ? msg.substring(0, 30) + "..." : msg;
  }
  return "New Chat";
};

// Load all chats list from localStorage
const loadChatsList = () => {
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
const saveChatsList = (chatsList) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CHATS_KEY, JSON.stringify(chatsList));
  } catch (e) {
    console.error("Failed to save chats list:", e);
  }
};

// Load a specific chat's state
const loadChatState = (chatId) => {
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
const saveChatState = (chatId, nodes, edges, selectedNodeId, nodeIdCounter) => {
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

// Get or create active chat ID
const getActiveChatId = () => {
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
const setActiveChatId = (chatId) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACTIVE_CHAT_KEY, chatId);
};

const TreeChatInner = () => {
  // Chat management state
  const [activeChatId, setActiveChatIdState] = useState(() =>
    getActiveChatId()
  );
  const [chatsList, setChatsList] = useState(() => loadChatsList());
  const [chatsExpanded, setChatsExpanded] = useState(false);

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
  const [selectedModel, setSelectedModel] = useState(models[0]);
  const [mergeMode, setMergeMode] = useState(null);
  const nodeIdCounter = useRef(savedState?.nodeIdCounter || 1);
  const { fitView } = useReactFlow();

  // Auto-save to localStorage whenever nodes or edges change
  useEffect(() => {
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
  }, [nodes, edges, selectedNodeId, activeChatId]);

  // Switch to a different chat
  const switchToChat = useCallback(
    (chatId) => {
      setActiveChatId(chatId);
      setActiveChatIdState(chatId);
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
      localStorage.removeItem(`bushchat-${chatId}`);

      // If deleting active chat, switch to first available
      if (chatId === activeChatId && updatedList.length > 0) {
        switchToChat(updatedList[0].id);
      }
    },
    [chatsList, activeChatId, switchToChat]
  );

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

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: conversationMessages,
            model: selectedModel,
          }),
        });

        // Check if streaming response
        const contentType = response.headers.get("content-type");
        const isStreaming = contentType?.includes("text/event-stream");

        if (isStreaming) {
          // Handle streaming response
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
                  updateNodeData(newNodeId, {
                    assistantMessage: fullResponse,
                    status: "loading",
                  });
                }
              } catch (e) {
                // Skip malformed JSON
              }
            }
          }

          updateNodeData(newNodeId, {
            assistantMessage: fullResponse,
            status: "complete",
          });
        } else {
          // Handle non-streaming response
          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || "Failed to get response");
          }

          updateNodeData(newNodeId, {
            assistantMessage: data.response,
            status: "complete",
          });
        }
      } catch (error) {
        console.error(error);
        updateNodeData(newNodeId, {
          error: error.message,
          status: "error",
        });
      }

      // Fit view after adding node
      setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 100);
    },
    [nodes, edges, selectedModel, setNodes, setEdges, updateNodeData, fitView]
  );

  // Handle adding a branch from a node
  const handleAddBranch = useCallback((nodeId) => {
    setSelectedNodeId(nodeId);
    // Focus the input
    document.getElementById("message-input")?.focus();
  }, []);

  // Handle editing a node's user message (regenerates response)
  const handleEditNode = useCallback(
    async (nodeId, newUserMessage) => {
      if (!newUserMessage.trim()) return;

      // Update the user message
      updateNodeData(nodeId, {
        userMessage: newUserMessage,
        assistantMessage: "",
        status: "loading",
        error: null,
      });

      // Get parent of this node
      const parentEdge = edges.find((e) => e.target === nodeId);
      const parentNodeId = parentEdge?.source || "root";

      // Build conversation context from parent
      const path = getPathToNode(parentNodeId, nodes, edges);
      const conversationMessages = buildConversationFromPath(path);
      conversationMessages.push({ role: "user", content: newUserMessage });

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: conversationMessages,
            model: selectedModel,
          }),
        });

        const contentType = response.headers.get("content-type");
        const isStreaming = contentType?.includes("text/event-stream");

        if (isStreaming) {
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
                  updateNodeData(nodeId, {
                    assistantMessage: fullResponse,
                    status: "loading",
                  });
                }
              } catch (e) {
                // Skip malformed JSON
              }
            }
          }

          updateNodeData(nodeId, {
            assistantMessage: fullResponse,
            status: "complete",
          });
        } else {
          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.error || "Failed to get response");
          }
          updateNodeData(nodeId, {
            assistantMessage: data.response,
            status: "complete",
          });
        }
      } catch (error) {
        console.error(error);
        updateNodeData(nodeId, {
          error: error.message,
          status: "error",
        });
      }
    },
    [nodes, edges, selectedModel, updateNodeData]
  );

  // Handle deleting a node and its descendants
  const handleDeleteNode = useCallback(
    (nodeId) => {
      if (nodeId === "root") return;

      const descendants = getDescendants(nodeId, nodes, edges);
      const nodesToRemove = new Set([nodeId, ...descendants]);

      // Find parent to select after deletion
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
    [nodes, edges, setNodes, setEdges]
  );

  // Toggle context mode on an edge (full vs single message)
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

      // Get the merge edges and their context modes
      const edge1 = edges.find(
        (e) => e.source === firstNodeId && e.target === nodeId
      );
      const edge2 = edges.find(
        (e) => e.source === secondNodeId && e.target === nodeId
      );

      const contextMode1 = edge1?.data?.contextMode || CONTEXT_MODE.FULL;
      const contextMode2 = edge2?.data?.contextMode || CONTEXT_MODE.FULL;

      // Get paths from LCA to each node
      const path1 = getPathToNode(firstNodeId, nodes, edges);
      const path2 = getPathToNode(secondNodeId, nodes, edges);

      const lcaIndex1 = path1.findIndex((n) => n.id === lcaId);
      const lcaIndex2 = path2.findIndex((n) => n.id === lcaId);

      // Get branch content based on context mode
      let branch1, branch2;
      if (contextMode1 === CONTEXT_MODE.FULL) {
        branch1 = path1.slice(lcaIndex1 + 1);
      } else {
        // Single message mode - only the last node
        const lastNode = path1[path1.length - 1];
        branch1 = lastNode ? [lastNode] : [];
      }

      if (contextMode2 === CONTEXT_MODE.FULL) {
        branch2 = path2.slice(lcaIndex2 + 1);
      } else {
        // Single message mode - only the last node
        const lastNode = path2[path2.length - 1];
        branch2 = lastNode ? [lastNode] : [];
      }

      // Build merged context message
      const lcaPath = path1.slice(0, lcaIndex1 + 1);
      const baseContext = buildConversationFromPath(lcaPath);

      // Build branch summaries
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

      // Update node to loading state
      updateNodeData(nodeId, {
        assistantMessage: "",
        status: "loading",
        error: null,
      });

      // Send merged context to API
      const conversationMessages = [
        ...baseContext,
        { role: "user", content: mergedPrompt },
      ];

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: conversationMessages,
            model: selectedModel,
          }),
        });

        const contentType = response.headers.get("content-type");
        const isStreaming = contentType?.includes("text/event-stream");

        if (isStreaming) {
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
                  updateNodeData(nodeId, {
                    assistantMessage: fullResponse,
                    status: "loading",
                  });
                }
              } catch (e) {
                // Skip malformed JSON
              }
            }
          }

          updateNodeData(nodeId, {
            assistantMessage: fullResponse,
            status: "complete",
          });
        } else {
          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.error || "Failed to get response");
          }
          updateNodeData(nodeId, {
            assistantMessage: data.response,
            status: "complete",
          });
        }
      } catch (error) {
        console.error(error);
        updateNodeData(nodeId, {
          error: error.message,
          status: "error",
        });
      }
    },
    [nodes, edges, selectedModel, updateNodeData]
  );

  // Handle merge - first click selects first node, second click performs merge
  const handleMergeNode = useCallback(
    async (nodeId) => {
      if (nodeId === "root") return;

      if (!mergeMode) {
        // First node selected - enter merge mode
        setMergeMode({ firstNodeId: nodeId });
        return;
      }

      if (mergeMode.firstNodeId === nodeId) {
        // Same node clicked - cancel merge
        setMergeMode(null);
        return;
      }

      // Second node selected - perform merge
      const firstNodeId = mergeMode.firstNodeId;
      const secondNodeId = nodeId;

      // Find lowest common ancestor
      const lcaId = findLowestCommonAncestor(
        firstNodeId,
        secondNodeId,
        nodes,
        edges
      );

      // Get paths from LCA to each node (excluding LCA)
      const path1 = getPathToNode(firstNodeId, nodes, edges);
      const path2 = getPathToNode(secondNodeId, nodes, edges);

      const lcaIndex1 = path1.findIndex((n) => n.id === lcaId);
      const lcaIndex2 = path2.findIndex((n) => n.id === lcaId);

      const branch1 = path1.slice(lcaIndex1 + 1);
      const branch2 = path2.slice(lcaIndex2 + 1);

      // Build merged context message
      const lcaPath = path1.slice(0, lcaIndex1 + 1);
      const baseContext = buildConversationFromPath(lcaPath);

      // Build branch summaries
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

      // Create a new merged node
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

      // Store edge IDs for context mode lookup
      const edge1Id = `edge-${firstNodeId}-${newNodeId}`;
      const edge2Id = `edge-${secondNodeId}-${newNodeId}`;

      // Add node and edges from both parents
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

      // Send merged context to API
      const conversationMessages = [
        ...baseContext,
        { role: "user", content: mergedPrompt },
      ];

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: conversationMessages,
            model: selectedModel,
          }),
        });

        const contentType = response.headers.get("content-type");
        const isStreaming = contentType?.includes("text/event-stream");

        if (isStreaming) {
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
                  updateNodeData(newNodeId, {
                    assistantMessage: fullResponse,
                    status: "loading",
                  });
                }
              } catch (e) {
                // Skip malformed JSON
              }
            }
          }

          updateNodeData(newNodeId, {
            assistantMessage: fullResponse,
            status: "complete",
          });
        } else {
          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.error || "Failed to get response");
          }
          updateNodeData(newNodeId, {
            assistantMessage: data.response,
            status: "complete",
          });
        }
      } catch (error) {
        console.error(error);
        updateNodeData(newNodeId, {
          error: error.message,
          status: "error",
        });
      }

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
  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputMessage.trim()) {
      sendMessage(selectedNodeId, inputMessage.trim());
      setInputMessage("");
    }
  };

  // Handle node selection
  const onNodeClick = useCallback((_, node) => {
    setSelectedNodeId(node.id);
  }, []);

  return (
    <Box sx={{ width: "100vw", height: "100vh", backgroundColor: "#1a1a1a" }}>
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
        <Background color="#333" gap={20} />
        <Controls
          style={{
            backgroundColor: "#2a2a2a",
            borderRadius: 8,
            border: "1px solid #444",
          }}
        />

        {/* Input Panel */}
        <Panel position="bottom-center">
          <Paper
            component="form"
            onSubmit={handleSubmit}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              p: 1.5,
              backgroundColor: "#2a2a2a",
              border: "1px solid #444",
              borderRadius: 2,
              minWidth: 600,
              mb: 2,
            }}
          >
            <TextField
              id="message-input"
              placeholder={
                selectedNode?.data?.isRoot
                  ? "Start a new conversation..."
                  : "Continue or branch from selected node..."
              }
              variant="outlined"
              size="small"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              fullWidth
              autoComplete="off"
              sx={{
                "& .MuiOutlinedInput-root": {
                  backgroundColor: "#1a1a1a",
                  color: "#fff",
                  "& fieldset": { borderColor: "#444" },
                  "&:hover fieldset": { borderColor: "#666" },
                  "&.Mui-focused fieldset": { borderColor: "#4a9eff" },
                },
                "& .MuiInputBase-input::placeholder": { color: "#888" },
              }}
            />
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <Select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                sx={{
                  backgroundColor: "#1a1a1a",
                  color: "#fff",
                  "& .MuiOutlinedInput-notchedOutline": { borderColor: "#444" },
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#666",
                  },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#4a9eff",
                  },
                  "& .MuiSvgIcon-root": { color: "#888" },
                }}
              >
                {models.map((model) => (
                  <MenuItem key={model} value={model}>
                    {model}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <IconButton
              type="submit"
              disabled={!inputMessage.trim()}
              sx={{
                backgroundColor: "#4a9eff",
                color: "#fff",
                "&:hover": { backgroundColor: "#3a8eef" },
                "&.Mui-disabled": { backgroundColor: "#444", color: "#666" },
              }}
            >
              <SendIcon />
            </IconButton>
          </Paper>
        </Panel>

        {/* Info Panel */}
        <Panel position="top-left">
          <Paper
            sx={{
              backgroundColor: "#2a2a2a",
              border: mergeMode ? "1px solid #ff9800" : "1px solid #444",
              borderRadius: 2,
              minWidth: chatsExpanded ? 220 : "auto",
              maxWidth: 280,
              overflow: "hidden",
            }}
          >
            {/* Header with expand/collapse */}
            <Box
              onClick={() => setChatsExpanded(!chatsExpanded)}
              sx={{
                p: 1.5,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                cursor: "pointer",
                "&:hover": { backgroundColor: "#333" },
              }}
            >
              <Typography variant="subtitle2" sx={{ color: "#4a9eff" }}>
                bushchat
              </Typography>
              <IconButton size="small" sx={{ color: "#888", p: 0 }}>
                {chatsExpanded ? (
                  <ExpandLessIcon fontSize="small" />
                ) : (
                  <ExpandMoreIcon fontSize="small" />
                )}
              </IconButton>
            </Box>

            {/* Collapsible chats list */}
            <Collapse in={chatsExpanded}>
              <Divider sx={{ borderColor: "#444" }} />
              <Box sx={{ p: 1 }}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    mb: 0.5,
                  }}
                >
                  <Typography variant="caption" sx={{ color: "#888" }}>
                    Chats
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={createNewChat}
                    sx={{ color: "#4a9eff", p: 0.5 }}
                  >
                    <AddIcon fontSize="small" />
                  </IconButton>
                </Box>
                <List dense sx={{ py: 0, maxHeight: 200, overflow: "auto" }}>
                  {chatsList.map((chat) => (
                    <ListItem
                      key={chat.id}
                      disablePadding
                      secondaryAction={
                        chatsList.length > 1 && (
                          <IconButton
                            edge="end"
                            size="small"
                            onClick={(e) => deleteChat(chat.id, e)}
                            sx={{
                              color: "#666",
                              "&:hover": { color: "#f44" },
                              p: 0.5,
                            }}
                          >
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        )
                      }
                    >
                      <ListItemButton
                        selected={chat.id === activeChatId}
                        onClick={() => switchToChat(chat.id)}
                        sx={{
                          borderRadius: 1,
                          py: 0.5,
                          "&.Mui-selected": {
                            backgroundColor: "#3a3a3a",
                            "&:hover": { backgroundColor: "#444" },
                          },
                          "&:hover": { backgroundColor: "#333" },
                        }}
                      >
                        <ListItemText
                          primary={chat.name}
                          primaryTypographyProps={{
                            variant: "caption",
                            sx: {
                              color: chat.id === activeChatId ? "#fff" : "#aaa",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            },
                          }}
                        />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              </Box>
              <Divider sx={{ borderColor: "#444" }} />
            </Collapse>

            {/* Info section - only show when expanded or merge mode */}
            {(chatsExpanded || mergeMode) && (
              <Box sx={{ p: 1.5, pt: chatsExpanded ? 1 : 1.5 }}>
                {mergeMode ? (
                  <>
                    <Typography
                      variant="caption"
                      sx={{
                        color: "#ff9800",
                        display: "block",
                        fontWeight: 500,
                      }}
                    >
                      🔀 Merge Mode Active
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ color: "#888", display: "block", mt: 0.5 }}
                    >
                      Click another node to merge, or click the same node to
                      cancel
                    </Typography>
                    <Button
                      size="small"
                      onClick={() => setMergeMode(null)}
                      sx={{
                        mt: 1,
                        color: "#ff9800",
                        borderColor: "#ff9800",
                        "&:hover": {
                          borderColor: "#ffb74d",
                          backgroundColor: "rgba(255,152,0,0.1)",
                        },
                      }}
                      variant="outlined"
                    >
                      Cancel Merge
                    </Button>
                  </>
                ) : (
                  <Typography
                    variant="caption"
                    sx={{ color: "#888", display: "block" }}
                  >
                    Click (+) to branch • Edit/Delete on hover • Merge icon to
                    combine branches
                  </Typography>
                )}
                {conversationHistory.length > 0 && (
                  <Typography
                    variant="caption"
                    sx={{ color: "#666", display: "block", mt: 1 }}
                  >
                    Context: {conversationHistory.length} messages
                  </Typography>
                )}
              </Box>
            )}
          </Paper>
        </Panel>
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
