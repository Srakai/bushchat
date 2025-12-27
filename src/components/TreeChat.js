"use client";
import React, { useState, useCallback, useRef, useMemo } from "react";
import ReactFlow, {
  addEdge,
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
  InputLabel,
  Paper,
  Typography,
  IconButton,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import ChatNode from "./ChatNode";

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

const TreeChatInner = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNodeId, setSelectedNodeId] = useState("root");
  const [inputMessage, setInputMessage] = useState("");
  const [selectedModel, setSelectedModel] = useState(models[0]);
  const nodeIdCounter = useRef(1);
  const { fitView } = useReactFlow();

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

  // Inject onAddBranch callback into all nodes
  const nodesWithCallbacks = useMemo(() => {
    return nodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        onAddBranch: handleAddBranch,
      },
    }));
  }, [nodes, handleAddBranch]);

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
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.1}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
        proOptions={{ hideAttribution: true }}
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
              p: 1.5,
              backgroundColor: "#2a2a2a",
              border: "1px solid #444",
              borderRadius: 2,
              maxWidth: 250,
            }}
          >
            <Typography variant="subtitle2" sx={{ color: "#4a9eff", mb: 0.5 }}>
              bushchat
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: "#888", display: "block" }}
            >
              Click (+) on any node to branch • Select node to continue
              conversation
            </Typography>
            {conversationHistory.length > 0 && (
              <Typography
                variant="caption"
                sx={{ color: "#666", display: "block", mt: 1 }}
              >
                Context: {conversationHistory.length} messages
              </Typography>
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
