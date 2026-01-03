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
  ControlButton,
  Background,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  useReactFlow,
  Panel,
} from "reactflow";
import "reactflow/dist/style.css";
import { Box, Snackbar, Alert } from "@mui/material";

// Components
import ChatNode from "./ChatNode";
import ArtifactNode from "./ArtifactNode";
import MergeEdge from "./MergeEdge";
import SettingsModal from "./SettingsModal";
import WaitlistModal from "./WaitlistModal";
import InfoPanel from "./InfoPanel";
import InputPanel from "./InputPanel";
import FocusModeOverlay from "./FocusModeOverlay";
import PanScrollToggle from "./PanScrollToggle";
import LockScrollToggle from "./LockScrollToggle";
import ArtifactModal from "./ArtifactModal";

// Hooks
import { useChatApi } from "../hooks/useChatApi";
import {
  useChatManagement,
  TREE_HORIZONTAL_OFFSET,
} from "../hooks/useChatManagement";
import { useNodeOperations } from "../hooks/useNodeOperations";
import { useFocusMode } from "../hooks/useFocusMode";
import { useGroupedChats } from "../hooks/useGroupedChats";
import { useModels } from "../hooks/useModels";

// Utilities
import { colors } from "../styles/theme";
import { initialNodes, initialEdges } from "../utils/constants";
import { getPathToNode, buildConversationFromPath } from "../utils/treeUtils";
import {
  loadChatState,
  saveChatState,
  loadSettings,
  saveSettings,
  loadChatsList,
  saveChatsList,
  generateChatId,
  setActiveChatId,
} from "../utils/storage";
import {
  generateShareUrl,
  getSharedChatFromUrl,
  clearShareHash,
} from "../utils/sharing";

const nodeTypes = {
  chatNode: ChatNode,
  artifactNode: ArtifactNode,
};

const edgeTypes = {
  mergeEdge: MergeEdge,
};

const TreeChatInner = () => {
  // Settings state
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState(() => loadSettings());

  // Waitlist modal state
  const [waitlistOpen, setWaitlistOpen] = useState(false);

  // Artifact modal state
  const [artifactModalOpen, setArtifactModalOpen] = useState(false);

  // Snackbar state
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  // Pan on scroll state (true = scroll to pan, false = scroll to zoom)
  const [panOnScroll, setPanOnScroll] = useState(
    () => settings.panOnScroll !== false
  );

  // Lock scroll on node focus state
  const [lockScrollOnNodeFocus, setLockScrollOnNodeFocus] = useState(
    () => settings.lockScrollOnNodeFocus || false
  );

  // Web search toggle state
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);

  // Merge state
  const [mergeMode, setMergeMode] = useState(null);
  const [pendingMerge, setPendingMerge] = useState(null);
  const [inputMessage, setInputMessage] = useState("");

  // Shared view state
  const [isSharedView, setIsSharedView] = useState(false);

  // Node ID counter ref
  const nodeIdCounterRef = useRef(1);

  // Models hook
  const { selectedModel, setSelectedModel, modelsList, setModelsList } =
    useModels(settings);

  // Chat API hook
  const { sendChatRequest } = useChatApi(settings, { webSearchEnabled });

  const { fitView } = useReactFlow();

  // Initialize nodes/edges state - we need this before useChatManagement
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNodeId, setSelectedNodeId] = useState("root");

  // Chat management hook
  const {
    activeChatId,
    setActiveChatIdState,
    chatsList,
    setChatsList,
    focusedChatId,
    setFocusedChatId,
    activeGroupInfo,
    switchToChat,
    focusChatInGroup,
    createNewChat,
    deleteChat,
    moveChat,
    mergeChats,
    refreshChatsList,
  } = useChatManagement({
    setNodes,
    setEdges,
    setSelectedNodeId,
    setMergeMode,
    setSnackbar,
    nodeIdCounterRef,
    isSharedView,
    setIsSharedView,
  });

  // Grouped chats computation
  const { groupedStates, combinedGroupState } = useGroupedChats({
    activeGroupInfo,
  });

  // Load initial state on mount/chat switch
  const savedState = useMemo(() => loadChatState(activeChatId), [activeChatId]);

  // Initialize state from saved or combined group state
  useEffect(() => {
    if (combinedGroupState) {
      setNodes(combinedGroupState.nodes);
      setEdges(combinedGroupState.edges);
      const savedNodeId = savedState?.selectedNodeId || "root";
      setSelectedNodeId(`${activeChatId}:${savedNodeId}`);
      nodeIdCounterRef.current = savedState?.nodeIdCounter || 1;
    } else if (savedState) {
      setNodes(savedState.nodes || initialNodes);
      setEdges(savedState.edges || initialEdges);
      setSelectedNodeId(savedState.selectedNodeId || "root");
      nodeIdCounterRef.current = savedState.nodeIdCounter || 1;
    }
  }, [activeChatId, savedState, combinedGroupState, setNodes, setEdges]);

  // Load shared chat from URL hash on mount
  const sharedChatLoadedRef = useRef(false);
  useEffect(() => {
    if (sharedChatLoadedRef.current) return;
    sharedChatLoadedRef.current = true;

    const sharedState = getSharedChatFromUrl();
    if (sharedState && sharedState.nodes) {
      setNodes(sharedState.nodes || initialNodes);
      setEdges(sharedState.edges || initialEdges);
      setSelectedNodeId(sharedState.selectedNodeId || "root");
      nodeIdCounterRef.current = sharedState.nodeIdCounter || 1;
      setIsSharedView(true);
      clearShareHash();
      setTimeout(() => fitView({ padding: 0.2 }), 100);
    }
  }, [setNodes, setEdges, fitView]);

  // Commit shared chat to storage
  const commitSharedChat = useCallback(() => {
    if (!isSharedView) return;

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

    saveChatState(
      newChatId,
      nodes,
      edges,
      selectedNodeId,
      nodeIdCounterRef.current
    );
    setChatsList(loadChatsList());
  }, [
    isSharedView,
    chatsList,
    nodes,
    edges,
    selectedNodeId,
    setChatsList,
    setActiveChatIdState,
  ]);

  // Auto-save to localStorage
  useEffect(() => {
    if (isSharedView) return;
    const timeoutId = setTimeout(() => {
      if (activeGroupInfo) {
        activeGroupInfo.members.forEach((member) => {
          const chatPrefix = `${member.id}:`;
          const prefixedNodes = nodes.filter((n) =>
            n.id.startsWith(chatPrefix)
          );
          if (prefixedNodes.length === 0) return;

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
              data: { ...n.data, chatId: undefined },
            };
          });

          const chatEdges = edges
            .filter((e) => e.id.startsWith(chatPrefix))
            .map((e) => ({
              ...e,
              id: e.id.replace(chatPrefix, ""),
              source: e.source.replace(chatPrefix, ""),
              target: e.target.replace(chatPrefix, ""),
            }));

          const selectedForChat = selectedNodeId.startsWith(chatPrefix)
            ? selectedNodeId.replace(chatPrefix, "")
            : "root";

          saveChatState(
            member.id,
            chatNodes.length > 0 ? chatNodes : initialNodes,
            chatEdges,
            selectedForChat,
            nodeIdCounterRef.current
          );
        });
      } else {
        saveChatState(
          activeChatId,
          nodes,
          edges,
          selectedNodeId,
          nodeIdCounterRef.current
        );
      }
      setChatsList(loadChatsList());
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [
    nodes,
    edges,
    selectedNodeId,
    activeChatId,
    isSharedView,
    activeGroupInfo,
    groupedStates,
    setChatsList,
  ]);

  // Node operations hook
  const {
    sendMessage,
    handleAddBranch,
    handleEditNode,
    handleDeleteNode,
    handleToggleCollapse,
    handleToggleContextMode,
    handleRegenerateMerge,
    handleMergeNode,
    executePendingMerge,
  } = useNodeOperations({
    nodes,
    edges,
    setNodes,
    setEdges,
    selectedNodeId,
    setSelectedNodeId,
    selectedModel,
    nodeIdCounterRef,
    sendChatRequest,
    isSharedView,
    commitSharedChat,
    mergeMode,
    setMergeMode,
    pendingMerge,
    setPendingMerge,
    setInputMessage,
  });

  // Focus mode hook
  const {
    focusModeNodeId,
    focusModeNode,
    focusModeNavigation,
    focusModeScrollRef,
    scrollForceIndicator,
    navigateFocusMode,
    handleFocusModeScroll,
    onNodeDoubleClick,
    closeFocusMode,
  } = useFocusMode({ nodes, edges, setSelectedNodeId });

  // Save settings handler
  const handleSaveSettings = useCallback((newSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings, newSettings.saveApiKey);
    // Sync panOnScroll with settings
    setPanOnScroll(newSettings.panOnScroll !== false);
    // Sync lockScrollOnNodeFocus with settings
    setLockScrollOnNodeFocus(newSettings.lockScrollOnNodeFocus || false);
  }, []);

  // Share current chat
  const handleShareChat = useCallback(() => {
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
      nodeIdCounter: nodeIdCounterRef.current,
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

  // Artifact ID counter ref
  const artifactIdCounterRef = useRef(1);

  // Create artifact node on canvas
  const handleCreateArtifact = useCallback(
    (artifact) => {
      const artifactId = `artifact-${artifactIdCounterRef.current++}`;
      const newNode = {
        id: artifactId,
        type: "artifactNode",
        position: { x: 100, y: 100 },
        data: {
          name: artifact.name,
          artifactType: artifact.type,
          content: artifact.content,
        },
      };
      setNodes((nds) => [...nds, newNode]);
    },
    [setNodes]
  );

  // Edit artifact node
  const handleEditArtifact = useCallback(
    (nodeId, updates) => {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, ...updates } }
            : node
        )
      );
    },
    [setNodes]
  );

  // Delete artifact node
  const handleDeleteArtifact = useCallback(
    (nodeId) => {
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) =>
        eds.filter((e) => e.source !== nodeId && e.target !== nodeId)
      );
    },
    [setNodes, setEdges]
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

  // Inject callbacks into all nodes
  const nodesWithCallbacks = useMemo(() => {
    const selectedNodeIds = mergeMode?.selectedNodeIds || [];
    return nodes.map((node) => {
      if (node.type === "artifactNode") {
        return {
          ...node,
          data: {
            ...node.data,
            onEditArtifact: handleEditArtifact,
            onDeleteArtifact: handleDeleteArtifact,
            onMergeNode: handleMergeNode,
            onToggleCollapse: handleToggleCollapse,
            isMergeSource: selectedNodeIds.includes(node.id),
            mergeSelectionCount: selectedNodeIds.length,
            lockScrollOnNodeFocus,
          },
        };
      }
      return {
        ...node,
        data: {
          ...node.data,
          onAddBranch: handleAddBranch,
          onEditNode: handleEditNode,
          onDeleteNode: handleDeleteNode,
          onMergeNode: handleMergeNode,
          onRegenerateMerge: handleRegenerateMerge,
          onToggleCollapse: handleToggleCollapse,
          isMergeSource: selectedNodeIds.includes(node.id),
          mergeSelectionCount: selectedNodeIds.length,
          lockScrollOnNodeFocus,
        },
      };
    });
  }, [
    nodes,
    handleAddBranch,
    handleEditNode,
    handleDeleteNode,
    handleMergeNode,
    handleRegenerateMerge,
    handleToggleCollapse,
    handleEditArtifact,
    handleDeleteArtifact,
    mergeMode,
    lockScrollOnNodeFocus,
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
  const handleSubmit = useCallback(
    (message) => {
      if (pendingMerge) {
        executePendingMerge(message);
      } else {
        sendMessage(selectedNodeId, message);
      }
      setInputMessage("");
    },
    [pendingMerge, executePendingMerge, sendMessage, selectedNodeId]
  );

  // Handle node selection
  const onNodeClick = useCallback(
    (_, node) => {
      setSelectedNodeId(node.id);
      if (node.data?.chatId) {
        setFocusedChatId(node.data.chatId);
      }
    },
    [setFocusedChatId]
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
        panOnScroll={panOnScroll}
      >
        <Background color="#888888" gap={20} />
        <Controls
          style={{
            backgroundColor: colors.bg.secondary,
            borderRadius: 8,
            border: `1px solid ${colors.border.primary}`,
          }}
          className="custom-controls"
          showInteractive={false}
        >
          <ControlButton
            onClick={() => setPanOnScroll((prev) => !prev)}
            title={
              panOnScroll
                ? "Scroll to pan (click to switch to zoom)"
                : "Scroll to zoom (click to switch to pan)"
            }
          >
            <PanScrollToggle panOnScroll={panOnScroll} size="small" asIcon />
          </ControlButton>
          <ControlButton
            onClick={() => setLockScrollOnNodeFocus((prev) => !prev)}
            title={
              lockScrollOnNodeFocus
                ? "Canvas scroll locked on node hover (click to unlock)"
                : "Canvas scroll unlocked (click to lock on node hover)"
            }
          >
            <LockScrollToggle
              locked={lockScrollOnNodeFocus}
              size="small"
              asIcon
            />
          </ControlButton>
        </Controls>

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
            webSearchEnabled={webSearchEnabled}
            onWebSearchToggle={() => setWebSearchEnabled((prev) => !prev)}
            onOpenArtifacts={() => setArtifactModalOpen(true)}
          />
        </Panel>

        {/* Artifact Modal */}
        <ArtifactModal
          open={artifactModalOpen}
          onClose={() => setArtifactModalOpen(false)}
          onCreateArtifact={handleCreateArtifact}
        />

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

      {/* Focus Mode Overlay */}
      {focusModeNodeId && (
        <FocusModeOverlay
          focusModeNode={focusModeNode}
          focusModeNavigation={focusModeNavigation}
          focusModeScrollRef={focusModeScrollRef}
          scrollForceIndicator={scrollForceIndicator}
          navigateFocusMode={navigateFocusMode}
          handleFocusModeScroll={handleFocusModeScroll}
          closeFocusMode={closeFocusMode}
        />
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
