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
import { Box, Snackbar, Alert, Typography, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";

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
  generateGroupId,
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

// Default prompt for merge operations - can be customized by the user before submitting
const DEFAULT_MERGE_PROMPT =
  "Please synthesize insights from both branches and continue the conversation, acknowledging key points from each path.";

// Horizontal offset between trees in grouped view
const TREE_HORIZONTAL_OFFSET = 600;

const TreeChatInner = () => {
  // Chat management state
  const [activeChatId, setActiveChatIdState] = useState(() =>
    getActiveChatId()
  );
  const [chatsList, setChatsList] = useState(() => loadChatsList());

  // Track if current chat is a shared chat that hasn't been saved yet
  const [isSharedView, setIsSharedView] = useState(false);

  // Settings state
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState(() => loadSettings());

  // Waitlist modal state
  const [waitlistOpen, setWaitlistOpen] = useState(false);

  // Snackbar state for share feedback
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  // Get the active chat's group info
  const activeGroupInfo = useMemo(() => {
    const activeChat = chatsList.find((c) => c.id === activeChatId);
    if (!activeChat?.groupId) return null;

    const groupMembers = chatsList
      .filter((c) => c.groupId === activeChat.groupId)
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    // A group with <2 members is not a group.
    if (groupMembers.length < 2) return null;

    return {
      groupId: activeChat.groupId,
      members: groupMembers,
      focusedChatId: activeChatId,
    };
  }, [chatsList, activeChatId]);

  // Normalize orphaned groups (size < 2) back to ungrouped.
  // This can happen after deleting a chat from a group.
  useEffect(() => {
    const counts = {};
    chatsList.forEach((chat) => {
      if (!chat.groupId) return;
      counts[chat.groupId] = (counts[chat.groupId] || 0) + 1;
    });

    const orphanGroupIds = Object.entries(counts)
      .filter(([, count]) => count < 2)
      .map(([groupId]) => groupId);

    if (orphanGroupIds.length === 0) return;

    const orphanSet = new Set(orphanGroupIds);
    const normalized = chatsList.map((chat) =>
      orphanSet.has(chat.groupId) ? { ...chat, groupId: null } : chat
    );

    saveChatsList(normalized);
    setChatsList(normalized);
  }, [chatsList]);

  // Load initial state from localStorage or use defaults
  const savedState = useMemo(() => loadChatState(activeChatId), [activeChatId]);

  // Load all grouped states when in a group
  const groupedStates = useMemo(() => {
    if (!activeGroupInfo) return null;

    const states = {};
    activeGroupInfo.members.forEach((member, index) => {
      const state = loadChatState(member.id);
      states[member.id] = {
        chatId: member.id,
        nodes: state?.nodes || initialNodes,
        edges: state?.edges || initialEdges,
        selectedNodeId: state?.selectedNodeId || "root",
        nodeIdCounter: state?.nodeIdCounter || 1,
        offset: { x: index * TREE_HORIZONTAL_OFFSET, y: 0 }, // Offset each tree horizontally
      };
    });
    return states;
  }, [activeGroupInfo]);

  // Combine all group trees into a single node/edge array with prefixed IDs
  const combinedGroupState = useMemo(() => {
    if (!groupedStates) return null;

    const allNodes = [];
    const allEdges = [];

    Object.values(groupedStates).forEach(
      ({ chatId, nodes: treeNodes, edges: treeEdges, offset }) => {
        // Add prefixed and offset nodes
        treeNodes.forEach((node) => {
          allNodes.push({
            ...node,
            id: `${chatId}:${node.id}`,
            position: {
              x: node.position.x + offset.x,
              y: node.position.y + offset.y,
            },
            data: {
              ...node.data,
              chatId, // Track which chat this node belongs to
            },
          });
        });

        // Add prefixed edges
        treeEdges.forEach((edge) => {
          allEdges.push({
            ...edge,
            id: `${chatId}:${edge.id}`,
            source: `${chatId}:${edge.source}`,
            target: `${chatId}:${edge.target}`,
          });
        });
      }
    );

    return { nodes: allNodes, edges: allEdges };
  }, [groupedStates]);

  const [nodes, setNodes, onNodesChange] = useNodesState(
    combinedGroupState?.nodes || savedState?.nodes || initialNodes
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    combinedGroupState?.edges || savedState?.edges || initialEdges
  );

  // Track the focused chat ID within a group (which tree receives input)
  const [focusedChatId, setFocusedChatId] = useState(activeChatId);

  const [selectedNodeId, setSelectedNodeId] = useState(
    activeGroupInfo
      ? `${activeChatId}:${savedState?.selectedNodeId || "root"}`
      : savedState?.selectedNodeId || "root"
  );
  const [inputMessage, setInputMessage] = useState("");
  const [selectedModel, setSelectedModel] = useState(defaultModels[0]);
  const [modelsList, setModelsList] = useState(defaultModels);
  const [mergeMode, setMergeMode] = useState(null);
  const [pendingMerge, setPendingMerge] = useState(null);
  const nodeIdCounter = useRef(savedState?.nodeIdCounter || 1);
  const { fitView, getNodes } = useReactFlow();

  // Chat API hook
  const { sendChatRequest } = useChatApi(settings);

  // Auto-save to localStorage whenever nodes or edges change (but not for shared view)
  useEffect(() => {
    if (isSharedView) return; // Don't auto-save shared chats until user takes action
    const timeoutId = setTimeout(() => {
      if (activeGroupInfo) {
        // For grouped chats, split the combined state back to individual chats
        activeGroupInfo.members.forEach((member) => {
          const chatPrefix = `${member.id}:`;

          // Extract nodes for this chat (remove prefix and offset)
          // Guardrail: only save grouped state if we actually have prefixed nodes.
          // Otherwise we'd overwrite existing chats with the empty/initial template.
          const prefixedNodes = nodes.filter((n) =>
            n.id.startsWith(chatPrefix)
          );
          if (prefixedNodes.length === 0) {
            return;
          }

          const chatNodes = prefixedNodes.map((n) => {
            const originalId = n.id.replace(chatPrefix, "");
            const state = groupedStates?.[member.id];
            const offset = state?.offset || { x: 0, y: 0 };
            return {
              ...n,
              id: originalId,
              position: {
                x: n.position.x - offset.x,
                y: n.position.y - offset.y,
              },
              data: {
                ...n.data,
                chatId: undefined, // Remove chatId marker
              },
            };
          });

          // Extract edges for this chat (remove prefix)
          const chatEdges = edges
            .filter((e) => e.id.startsWith(chatPrefix))
            .map((e) => ({
              ...e,
              id: e.id.replace(chatPrefix, ""),
              source: e.source.replace(chatPrefix, ""),
              target: e.target.replace(chatPrefix, ""),
            }));

          // Get selected node for this chat
          const selectedForChat = selectedNodeId.startsWith(chatPrefix)
            ? selectedNodeId.replace(chatPrefix, "")
            : "root";

          saveChatState(
            member.id,
            chatNodes.length > 0 ? chatNodes : initialNodes,
            chatEdges,
            selectedForChat,
            nodeIdCounter.current
          );
        });
      } else {
        // Single chat save
        saveChatState(
          activeChatId,
          nodes,
          edges,
          selectedNodeId,
          nodeIdCounter.current
        );
      }
      setChatsList(loadChatsList()); // Refresh list to get updated names
    }, 500); // Debounce saves
    return () => clearTimeout(timeoutId);
  }, [
    nodes,
    edges,
    selectedNodeId,
    activeChatId,
    isSharedView,
    activeGroupInfo,
    groupedStates,
  ]);

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
      setFocusedChatId(chatId);
      setIsSharedView(false); // Clear shared view when switching to saved chat

      // Check if this chat is part of a group
      const targetChat = chatsList.find((c) => c.id === chatId);
      const isGrouped = targetChat?.groupId;

      if (isGrouped) {
        // Load all chats in the group
        const groupMembers = chatsList
          .filter((c) => c.groupId === targetChat.groupId)
          .sort((a, b) => (a.order || 0) - (b.order || 0));

        // If the group has only one member, dissolve it.
        if (groupMembers.length < 2) {
          const updatedList = chatsList.map((c) =>
            c.groupId === targetChat.groupId ? { ...c, groupId: null } : c
          );
          saveChatsList(updatedList);
          setChatsList(updatedList);

          // Continue as a single chat
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
          return;
        }

        const allNodes = [];
        const allEdges = [];
        let maxNodeIdCounter = 1;

        groupMembers.forEach((member, index) => {
          const state = loadChatState(member.id);
          const offset = { x: index * TREE_HORIZONTAL_OFFSET, y: 0 };

          // Add prefixed and offset nodes
          const memberNodes = state?.nodes || initialNodes;
          memberNodes.forEach((node) => {
            allNodes.push({
              ...node,
              id: `${member.id}:${node.id}`,
              position: {
                x: node.position.x + offset.x,
                y: node.position.y + offset.y,
              },
              data: {
                ...node.data,
                chatId: member.id,
              },
            });
          });

          // Add prefixed edges
          const memberEdges = state?.edges || initialEdges;
          memberEdges.forEach((edge) => {
            allEdges.push({
              ...edge,
              id: `${member.id}:${edge.id}`,
              source: `${member.id}:${edge.source}`,
              target: `${member.id}:${edge.target}`,
            });
          });

          if (state?.nodeIdCounter > maxNodeIdCounter) {
            maxNodeIdCounter = state.nodeIdCounter;
          }
        });

        setNodes(allNodes);
        setEdges(allEdges);

        // Set selected node to the root of the clicked chat
        const chatState = loadChatState(chatId);
        setSelectedNodeId(`${chatId}:${chatState?.selectedNodeId || "root"}`);
        nodeIdCounter.current = maxNodeIdCounter;
      } else {
        // Single chat - load normally
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
      }

      setMergeMode(null);
      setTimeout(() => fitView({ padding: 0.2 }), 100);
    },
    [setNodes, setEdges, fitView, chatsList]
  );

  // In grouped view, selecting a member from the list should focus that tree
  // without reloading/switching chats (prevents losing unsaved in-memory edits).
  const focusChatInGroup = useCallback(
    (chatId) => {
      const activeChat = chatsList.find((c) => c.id === activeChatId);
      const targetChat = chatsList.find((c) => c.id === chatId);

      if (!activeChat?.groupId || !targetChat?.groupId) {
        switchToChat(chatId);
        return;
      }

      if (activeChat.groupId !== targetChat.groupId) {
        switchToChat(chatId);
        return;
      }

      setFocusedChatId(chatId);
      const chatState = loadChatState(chatId);
      setSelectedNodeId(`${chatId}:${chatState?.selectedNodeId || "root"}`);

      // Fit view to nodes belonging to this chat's tree.
      setTimeout(() => {
        const prefix = `${chatId}:`;
        const nodesToFit = (getNodes() || []).filter(
          (n) => typeof n.id === "string" && n.id.startsWith(prefix)
        );
        if (nodesToFit.length > 0) {
          fitView({ padding: 0.2, duration: 300, nodes: nodesToFit });
        } else {
          fitView({ padding: 0.2, duration: 300 });
        }
      }, 50);
    },
    [activeChatId, chatsList, fitView, getNodes, switchToChat]
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

      const deletedChat = chatsList.find((c) => c.id === chatId);
      const deletedGroupId = deletedChat?.groupId;

      let updatedList = chatsList.filter((c) => c.id !== chatId);

      // If deletion leaves a group with <2 members, dissolve it.
      if (deletedGroupId) {
        const remaining = updatedList.filter(
          (c) => c.groupId === deletedGroupId
        );
        if (remaining.length < 2) {
          updatedList = updatedList.map((c) =>
            c.groupId === deletedGroupId ? { ...c, groupId: null } : c
          );
        }
      }

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

  // Move a chat (reorder)
  const moveChat = useCallback(
    (draggedChatId, targetChatId, insertBefore) => {
      const updatedList = [...chatsList];

      // Find the dragged and target chats
      const draggedIndex = updatedList.findIndex((c) => c.id === draggedChatId);
      const targetIndex = updatedList.findIndex((c) => c.id === targetChatId);

      if (draggedIndex === -1 || targetIndex === -1) return;

      const draggedChat = updatedList[draggedIndex];
      const targetChat = updatedList[targetIndex];

      // If dragged chat is in a group, keep it in that group
      // If target chat is in a different group, move dragged to that group
      if (targetChat.groupId && draggedChat.groupId !== targetChat.groupId) {
        // Can't move between groups if it would nest (groups are flat)
        // But we can move into a group
        draggedChat.groupId = targetChat.groupId;
      } else if (!targetChat.groupId && draggedChat.groupId) {
        // Moving out of a group to ungrouped
        // Check if this would leave the group with < 2 members
        const groupMembers = updatedList.filter(
          (c) => c.groupId === draggedChat.groupId && c.id !== draggedChat.id
        );
        if (groupMembers.length < 2) {
          // Ungroup all remaining members
          groupMembers.forEach((member) => {
            member.groupId = null;
          });
        }
        draggedChat.groupId = null;
      }

      // Remove dragged chat from list
      updatedList.splice(draggedIndex, 1);

      // Find new target index (it may have shifted)
      const newTargetIndex = updatedList.findIndex(
        (c) => c.id === targetChatId
      );

      // Insert at the right position
      const insertIndex = insertBefore ? newTargetIndex : newTargetIndex + 1;
      updatedList.splice(insertIndex, 0, draggedChat);

      // Update order values for all items
      updatedList.forEach((chat, index) => {
        chat.order = index;
      });

      saveChatsList(updatedList);
      setChatsList(updatedList);
    },
    [chatsList]
  );

  // Merge two chats into a group
  const mergeChats = useCallback(
    (draggedChatId, targetChatId) => {
      if (draggedChatId === targetChatId) return;

      const updatedList = [...chatsList];
      const draggedChat = updatedList.find((c) => c.id === draggedChatId);
      const targetChat = updatedList.find((c) => c.id === targetChatId);

      if (!draggedChat || !targetChat) return;

      // Prevent nesting - if either chat is already in a group, we can't create new groups
      // This ensures flat group structure (no nested groups)
      if (draggedChat.groupId || targetChat.groupId) {
        setSnackbar({
          open: true,
          message: "Cannot group chats that are already in a group",
          severity: "warning",
        });
        return;
      }

      // Create a new group
      const newGroupId = generateGroupId();

      // Add both chats to the group
      draggedChat.groupId = newGroupId;
      targetChat.groupId = newGroupId;

      saveChatsList(updatedList);
      setChatsList(updatedList);

      // If the active chat is now grouped, immediately switch the canvas into grouped mode.
      // This prevents the debounced grouped autosave from treating unprefixed nodes as "empty"
      // and overwriting existing chat history with the initial template.
      if (activeChatId === draggedChatId || activeChatId === targetChatId) {
        const groupMembers = updatedList
          .filter((c) => c.groupId === newGroupId)
          .sort((a, b) => (a.order || 0) - (b.order || 0));

        const allNodes = [];
        const allEdges = [];
        let maxNodeIdCounter = 1;

        groupMembers.forEach((member, index) => {
          const state = loadChatState(member.id);
          const offset = { x: index * TREE_HORIZONTAL_OFFSET, y: 0 };

          const memberNodes = state?.nodes || initialNodes;
          memberNodes.forEach((node) => {
            allNodes.push({
              ...node,
              id: `${member.id}:${node.id}`,
              position: {
                x: node.position.x + offset.x,
                y: node.position.y + offset.y,
              },
              data: {
                ...node.data,
                chatId: member.id,
              },
            });
          });

          const memberEdges = state?.edges || initialEdges;
          memberEdges.forEach((edge) => {
            allEdges.push({
              ...edge,
              id: `${member.id}:${edge.id}`,
              source: `${member.id}:${edge.source}`,
              target: `${member.id}:${edge.target}`,
            });
          });

          if ((state?.nodeIdCounter || 1) > maxNodeIdCounter) {
            maxNodeIdCounter = state.nodeIdCounter;
          }
        });

        setNodes(allNodes);
        setEdges(allEdges);

        const activeState = loadChatState(activeChatId);
        setSelectedNodeId(
          `${activeChatId}:${activeState?.selectedNodeId || "root"}`
        );
        setFocusedChatId(activeChatId);
        nodeIdCounter.current = maxNodeIdCounter;
        setTimeout(() => fitView({ padding: 0.2 }), 100);
      }

      // Show confirmation
      setSnackbar({
        open: true,
        message: "Chats grouped together",
        severity: "success",
      });
    },
    [chatsList, activeChatId, fitView, setEdges, setNodes]
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
        onToggleCollapse: undefined,
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
          setSnackbar({
            open: true,
            message: "Share link copied to clipboard!",
            severity: "success",
          });
        },
        (err) => {
          console.error("Failed to copy share URL:", err);
          // Fallback: show the URL in a prompt
          window.prompt("Copy this share URL:", shareUrl);
        }
      );
    } else {
      setSnackbar({
        open: true,
        message: "Failed to generate share link",
        severity: "error",
      });
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

      // Check if we're in grouped mode by looking for a prefix
      const colonIndex = parentNodeId.indexOf(":");
      const chatPrefix =
        colonIndex !== -1 ? parentNodeId.substring(0, colonIndex + 1) : "";

      const newNodeId = `${chatPrefix}node-${nodeIdCounter.current++}`;

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
          chatId: chatPrefix ? chatPrefix.slice(0, -1) : undefined,
        },
      };

      // Add node and edge
      setNodes((nds) => [...nds, newNode]);
      setEdges((eds) => [
        ...eds,
        {
          id: `${chatPrefix}edge-${parentNodeId.replace(
            chatPrefix,
            ""
          )}-${newNodeId.replace(chatPrefix, "")}`,
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
            model: selectedModel,
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
    [
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
          contextMode1 === CONTEXT_MODE.FULL
            ? "full context"
            : "single message";
        const mode2Label =
          contextMode2 === CONTEXT_MODE.FULL
            ? "full context"
            : "single message";

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
              model: selectedModel,
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
    [
      nodes,
      edges,
      selectedModel,
      updateNodeData,
      sendChatRequest,
      isSharedView,
      commitSharedChat,
    ]
  );

  // Handle deleting a node and its descendants
  const handleDeleteNode = useCallback(
    (nodeId) => {
      // Check for root node (with or without prefix)
      if (nodeId === "root" || nodeId.endsWith(":root")) return;

      // Commit shared chat to storage when user takes action
      if (isSharedView) commitSharedChat();

      const descendants = getDescendants(nodeId, nodes, edges);
      const nodesToRemove = new Set([nodeId, ...descendants]);

      const parentEdge = edges.find((e) => e.target === nodeId);

      // Handle prefixed parent ID for grouped mode
      const colonIndex = nodeId.indexOf(":");
      const chatPrefix =
        colonIndex !== -1 ? nodeId.substring(0, colonIndex + 1) : "";
      const parentId = parentEdge?.source || `${chatPrefix}root`;

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

  // Handle toggling collapsed state on a node message
  const handleToggleCollapse = useCallback(
    (nodeId, messageType, collapsed) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === nodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                [messageType === "user"
                  ? "userMessageCollapsed"
                  : "assistantMessageCollapsed"]: collapsed,
              },
            };
          }
          return node;
        })
      );
    },
    [setNodes]
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
            model: selectedModel,
            model: selectedModel,
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

  // Handle merge - first click selects first node, second click prepares merge
  const handleMergeNode = useCallback(
    (nodeId) => {
      // Check for root node (with or without prefix)
      if (nodeId === "root" || nodeId.endsWith(":root")) return;

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

      const branch1Messages = buildConversationFromPath(branch1);
      const branch2Messages = buildConversationFromPath(branch2);

      // Store pending merge info for when user submits
      setPendingMerge({
        firstNodeId,
        secondNodeId,
        lcaId,
        branch1Messages,
        branch2Messages,
      });

      // Load the default prompt into the input field for customization
      setInputMessage(DEFAULT_MERGE_PROMPT);
      setMergeMode(null);

      // Focus the input field
      setTimeout(() => {
        document.getElementById("message-input")?.focus();
      }, 100);
    },
    [mergeMode, nodes, edges, isSharedView, commitSharedChat]
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
        onToggleCollapse: handleToggleCollapse,
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
    handleToggleCollapse,
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

  // Execute pending merge with user-provided prompt
  const executePendingMerge = useCallback(
    async (userPrompt) => {
      if (!pendingMerge) return;

      const {
        firstNodeId,
        secondNodeId,
        lcaId,
        branch1Messages,
        branch2Messages,
      } = pendingMerge;

      // Get the path to LCA for base context
      const path1 = getPathToNode(firstNodeId, nodes, edges);
      const lcaIndex1 = path1.findIndex((n) => n.id === lcaId);
      const lcaPath = path1.slice(0, lcaIndex1 + 1);
      const baseContext = buildConversationFromPath(lcaPath);

      // Build the merged prompt with user's custom message
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
      mergedPrompt += userPrompt;

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
          userMessage: userPrompt,
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
      setPendingMerge(null);

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
            model: selectedModel,
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
      pendingMerge,
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

  // Handle form submit
  const handleSubmit = (message) => {
    if (pendingMerge) {
      executePendingMerge(message);
    } else {
      sendMessage(selectedNodeId, message);
    }
    setInputMessage("");
  };

  // Handle node selection
  const onNodeClick = useCallback((_, node) => {
    setSelectedNodeId(node.id);

    // If in a grouped view, update the focused chat based on which tree was clicked
    if (node.data?.chatId) {
      setFocusedChatId(node.data.chatId);
    }
  }, []);

  // Focus mode state - shows node content in an overlay with menus still visible
  const [focusModeNodeId, setFocusModeNodeId] = useState(null);
  const focusModeScrollRef = useRef(null);
  const scrollAccumulatorRef = useRef(0);
  const scrollDirectionRef = useRef(null); // 'up' or 'down'
  const scrollTimeoutRef = useRef(null);
  const [scrollForceIndicator, setScrollForceIndicator] = useState({
    force: 0,
    direction: null,
  }); // visual indicator state

  // Track node count changes to detect new nodes for focus mode navigation
  const prevNodeCountRef = useRef(nodes.length);
  useEffect(() => {
    if (focusModeNodeId && nodes.length > prevNodeCountRef.current) {
      // A new node was added - find children of the focused node
      const childEdges = edges.filter((e) => e.source === focusModeNodeId);
      if (childEdges.length > 0) {
        // Jump to the most recent child (last in list)
        const lastChild = childEdges[childEdges.length - 1];
        const childNode = nodes.find((n) => n.id === lastChild.target);
        if (childNode && !childNode.data?.isRoot) {
          setFocusModeNodeId(childNode.id);
          setSelectedNodeId(childNode.id);
        }
      }
    }
    prevNodeCountRef.current = nodes.length;
  }, [nodes.length, focusModeNodeId, edges, nodes]);

  const focusModeNode = useMemo(() => {
    if (!focusModeNodeId) return null;
    return nodes.find((n) => n.id === focusModeNodeId);
  }, [focusModeNodeId, nodes]);

  // Get parent and child nodes for focus mode navigation
  const focusModeNavigation = useMemo(() => {
    if (!focusModeNodeId) return { parent: null, children: [] };

    // Find parent (source of edge targeting this node)
    const parentEdge = edges.find((e) => e.target === focusModeNodeId);
    const parentId = parentEdge?.source;
    const parent = parentId ? nodes.find((n) => n.id === parentId) : null;

    // Find children (targets of edges from this node)
    const childEdges = edges.filter((e) => e.source === focusModeNodeId);
    const children = childEdges
      .map((e) => nodes.find((n) => n.id === e.target))
      .filter(Boolean);

    return { parent, children };
  }, [focusModeNodeId, nodes, edges]);

  // Navigate to adjacent node in focus mode
  const navigateFocusMode = useCallback(
    (direction) => {
      if (!focusModeNodeId) return;

      if (
        direction === "up" &&
        focusModeNavigation.parent &&
        !focusModeNavigation.parent.data?.isRoot
      ) {
        setFocusModeNodeId(focusModeNavigation.parent.id);
        setSelectedNodeId(focusModeNavigation.parent.id);
      } else if (
        direction === "down" &&
        focusModeNavigation.children.length > 0
      ) {
        // Navigate to first child
        const firstChild = focusModeNavigation.children[0];
        setFocusModeNodeId(firstChild.id);
        setSelectedNodeId(firstChild.id);
      }
    },
    [focusModeNodeId, focusModeNavigation]
  );

  // Handle scroll force detection for focus mode navigation
  const handleFocusModeScroll = useCallback(
    (e) => {
      if (!focusModeScrollRef.current) return;

      const el = focusModeScrollRef.current;
      const isAtTop = el.scrollTop <= 0;
      const isAtBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 2;

      // Determine current scroll direction
      const currentDirection = e.deltaY < 0 ? "up" : "down";

      // Only accumulate scroll force when at boundaries and scrolling in correct direction
      if (isAtTop && currentDirection === "up") {
        // Reset if direction changed
        if (scrollDirectionRef.current !== "up") {
          scrollAccumulatorRef.current = 0;
          scrollDirectionRef.current = "up";
        }
        scrollAccumulatorRef.current += Math.abs(e.deltaY);
        e.preventDefault(); // Prevent page scroll
      } else if (isAtBottom && currentDirection === "down") {
        // Reset if direction changed
        if (scrollDirectionRef.current !== "down") {
          scrollAccumulatorRef.current = 0;
          scrollDirectionRef.current = "down";
        }
        scrollAccumulatorRef.current += Math.abs(e.deltaY);
        e.preventDefault(); // Prevent page scroll
      } else {
        scrollAccumulatorRef.current = 0;
        scrollDirectionRef.current = null;
        setScrollForceIndicator({ force: 0, direction: null });
      }

      // Clear accumulator after a pause
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => {
        scrollAccumulatorRef.current = 0;
        scrollDirectionRef.current = null;
        setScrollForceIndicator({ force: 0, direction: null });
      }, 300);

      // Threshold for navigation (lower = more sensitive)
      const SCROLL_FORCE_THRESHOLD = 1500;

      // Update visual indicator (0 to 1)
      const forceRatio = Math.min(
        scrollAccumulatorRef.current / SCROLL_FORCE_THRESHOLD,
        1
      );
      setScrollForceIndicator({
        force: forceRatio,
        direction: scrollDirectionRef.current,
      });

      if (scrollAccumulatorRef.current >= SCROLL_FORCE_THRESHOLD) {
        scrollAccumulatorRef.current = 0;
        setScrollForceIndicator({ force: 0, direction: null });
        if (scrollDirectionRef.current === "up") {
          navigateFocusMode("up");
        } else if (scrollDirectionRef.current === "down") {
          navigateFocusMode("down");
        }
        scrollDirectionRef.current = null;
      }
    },
    [navigateFocusMode]
  );

  // Handle double-click to toggle focus mode
  const onNodeDoubleClick = useCallback(
    (_, node) => {
      if (node.data?.isRoot) return; // Don't focus on root

      if (focusModeNodeId === node.id) {
        // Exit focus mode
        setFocusModeNodeId(null);
      } else {
        // Enter focus mode
        setFocusModeNodeId(node.id);
        setSelectedNodeId(node.id);
      }
    },
    [focusModeNodeId]
  );

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
        onNodeDoubleClick={onNodeDoubleClick}
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
            isPendingMerge={!!pendingMerge}
            onCancelPendingMerge={() => {
              setPendingMerge(null);
              setInputMessage("");
            }}
          />
        </Panel>

        {/* Info Panel */}
        <Panel position="top-left">
          <InfoPanel
            chatsList={chatsList}
            activeChatId={activeChatId}
            focusedChatId={focusedChatId}
            activeGroupId={activeGroupInfo?.groupId || null}
            onCreateNewChat={createNewChat}
            onSwitchChat={switchToChat}
            onFocusChatInGroup={focusChatInGroup}
            onDeleteChat={deleteChat}
            onMoveChat={moveChat}
            onMergeChats={mergeChats}
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

        {/* Share Snackbar */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={3000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            severity={snackbar.severity}
            icon={false}
            sx={{
              backgroundColor: colors.bg.secondary,
              color: colors.text.primary,
              border: `1px solid ${colors.border.primary}`,
              borderRadius: 2,
              "& .MuiAlert-action": {
                color: colors.text.muted,
              },
            }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </ReactFlow>

      {/* Focus Mode Overlay - non-blocking, keeps menus visible */}
      {focusModeNodeId && focusModeNode && !focusModeNode.data?.isRoot && (
        <Box
          sx={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            zIndex: 1000,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            overflow: "auto",
            pt: 8,
            pb: 16,
          }}
          onClick={() => setFocusModeNodeId(null)}
        >
          <Box
            ref={focusModeScrollRef}
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={() => setFocusModeNodeId(null)}
            onWheel={handleFocusModeScroll}
            sx={{
              width: "min(900px, 85vw)",
              maxHeight: "calc(100vh - 200px)",
              overflowY: "auto",
              backgroundColor: colors.bg.secondary,
              border: `1px solid ${colors.border.primary}`,
              borderRadius: 2,
              outline: "none",
              position: "relative",
              "&::-webkit-scrollbar": {
                width: 8,
              },
              "&::-webkit-scrollbar-track": {
                background: colors.bg.tertiary,
                borderRadius: 4,
              },
              "&::-webkit-scrollbar-thumb": {
                background: colors.border.primary,
                borderRadius: 4,
                "&:hover": {
                  background: colors.text.dim,
                },
              },
            }}
          >
            {/* Navigation and close buttons */}
            <Box
              sx={{
                position: "sticky",
                top: 0,
                right: 0,
                display: "flex",
                justifyContent: "flex-end",
                gap: 0.5,
                p: 1,
                backgroundColor: colors.bg.secondary,
                borderBottom: `1px solid ${colors.border.secondary}`,
                zIndex: 10,
              }}
            >
              {/* Navigation hint */}
              <Typography
                variant="caption"
                sx={{ color: colors.text.dim, mr: "auto", alignSelf: "center" }}
              >
                Scroll hard at edges to navigate • Double-click to close
              </Typography>

              {/* Up navigation */}
              <IconButton
                size="small"
                onClick={() => navigateFocusMode("up")}
                disabled={
                  !focusModeNavigation.parent ||
                  focusModeNavigation.parent.data?.isRoot
                }
                sx={{
                  color: colors.text.muted,
                  "&:hover": { color: colors.text.primary },
                  "&.Mui-disabled": { color: colors.text.dim },
                }}
              >
                <KeyboardArrowUpIcon />
              </IconButton>

              {/* Down navigation */}
              <IconButton
                size="small"
                onClick={() => navigateFocusMode("down")}
                disabled={focusModeNavigation.children.length === 0}
                sx={{
                  color: colors.text.muted,
                  "&:hover": { color: colors.text.primary },
                  "&.Mui-disabled": { color: colors.text.dim },
                }}
              >
                <KeyboardArrowDownIcon />
              </IconButton>

              {/* Close button */}
              <IconButton
                size="small"
                onClick={() => setFocusModeNodeId(null)}
                sx={{
                  color: colors.text.muted,
                  "&:hover": { color: colors.text.primary },
                }}
              >
                <CloseIcon />
              </IconButton>
            </Box>

            {/* Scroll force indicator - top (for scrolling up) */}
            {scrollForceIndicator.force > 0 &&
              scrollForceIndicator.direction === "up" && (
                <Box
                  sx={{
                    position: "absolute",
                    top: 0,
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: `${20 + scrollForceIndicator.force * 80}%`,
                    height: 4,
                    background: `linear-gradient(90deg, transparent, ${colors.accent.green}, transparent)`,
                    opacity: 0.3 + scrollForceIndicator.force * 0.7,
                    borderRadius: "0 0 4px 4px",
                    zIndex: 20,
                    transition: "width 0.1s ease-out, opacity 0.1s ease-out",
                    pointerEvents: "none",
                  }}
                />
              )}

            {/* Scroll force indicator - bottom (for scrolling down) */}
            {scrollForceIndicator.force > 0 &&
              scrollForceIndicator.direction === "down" && (
                <Box
                  sx={{
                    position: "absolute",
                    bottom: 0,
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: `${20 + scrollForceIndicator.force * 80}%`,
                    height: 4,
                    background: `linear-gradient(90deg, transparent, ${colors.accent.green}, transparent)`,
                    opacity: 0.3 + scrollForceIndicator.force * 0.7,
                    borderRadius: "4px 4px 0 0",
                    zIndex: 20,
                    transition: "width 0.1s ease-out, opacity 0.1s ease-out",
                    pointerEvents: "none",
                  }}
                />
              )}

            {/* User message */}
            <Box
              sx={{
                p: 3,
                backgroundColor: colors.bg.userMessage,
                borderBottom: `1px solid ${colors.border.secondary}`,
              }}
            >
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}
              >
                <Typography
                  variant="caption"
                  sx={{ color: colors.accent.userLabel, fontWeight: 500 }}
                >
                  You
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => {
                    if (focusModeNode.data?.userMessage)
                      navigator.clipboard.writeText(
                        focusModeNode.data.userMessage
                      );
                  }}
                  sx={{
                    opacity: 0.4,
                    "&:hover": { opacity: 1 },
                    color: colors.text.muted,
                    width: 20,
                    height: 20,
                  }}
                >
                  <ContentCopyIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Box>
              <Typography
                variant="body1"
                className="ph-no-capture"
                sx={{
                  color: colors.text.primary,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  fontSize: "1rem",
                  lineHeight: 1.7,
                }}
              >
                {focusModeNode.data?.userMessage}
              </Typography>
            </Box>

            {/* Assistant response */}
            <Box sx={{ p: 3 }}>
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}
              >
                <Typography
                  variant="caption"
                  sx={{ color: colors.accent.green, fontWeight: 500 }}
                >
                  {focusModeNode.data?.model || "Assistant"}
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => {
                    if (focusModeNode.data?.assistantMessage)
                      navigator.clipboard.writeText(
                        focusModeNode.data.assistantMessage
                      );
                  }}
                  sx={{
                    opacity: 0.4,
                    "&:hover": { opacity: 1 },
                    color: colors.text.muted,
                    width: 20,
                    height: 20,
                  }}
                >
                  <ContentCopyIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Box>
              <Typography
                variant="body1"
                className="ph-no-capture"
                sx={{
                  color: colors.text.primary,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  fontSize: "1rem",
                  lineHeight: 1.7,
                }}
              >
                {focusModeNode.data?.assistantMessage}
              </Typography>
            </Box>
          </Box>
        </Box>
      )}
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
