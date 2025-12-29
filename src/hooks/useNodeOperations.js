/**
 * Hook for node and edge operations - send messages, edit, delete, merge
 */
import { useCallback, useRef } from "react";
import { useReactFlow } from "reactflow";
import { CONTEXT_MODE } from "../components/MergeEdge";
import {
  getPathToNode,
  buildConversationFromPath,
  findLowestCommonAncestor,
  getDescendants,
} from "../utils/treeUtils";

// Default prompt for merge operations
export const DEFAULT_MERGE_PROMPT =
  "Please synthesize insights from both branches and continue the conversation, acknowledging key points from each path.";

export const useNodeOperations = ({
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
}) => {
  const { fitView } = useReactFlow();

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
      if (isSharedView) commitSharedChat();

      const colonIndex = parentNodeId.indexOf(":");
      const chatPrefix =
        colonIndex !== -1 ? parentNodeId.substring(0, colonIndex + 1) : "";

      const newNodeId = `${chatPrefix}node-${nodeIdCounterRef.current++}`;

      const parentNode = nodes.find((n) => n.id === parentNodeId);
      const existingChildren = edges.filter((e) => e.source === parentNodeId);
      const xOffset = existingChildren.length * 320;

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

      setSelectedNodeId(newNodeId);

      const path = getPathToNode(parentNodeId, nodes, edges);
      const conversationMessages = buildConversationFromPath(path);
      conversationMessages.push({ role: "user", content: userMessage });

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
      setSelectedNodeId,
      nodeIdCounterRef,
    ]
  );

  // Handle adding a branch from a node
  const handleAddBranch = useCallback(
    (nodeId) => {
      setSelectedNodeId(nodeId);
      document.getElementById("message-input")?.focus();
    },
    [setSelectedNodeId]
  );

  // Handle editing a node's user message (regenerates response)
  const handleEditNode = useCallback(
    async (nodeId, newUserMessage) => {
      if (!newUserMessage.trim()) return;

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
      if (nodeId === "root" || nodeId.endsWith(":root")) return;

      if (isSharedView) commitSharedChat();

      const descendants = getDescendants(nodeId, nodes, edges);
      const nodesToRemove = new Set([nodeId, ...descendants]);

      const parentEdge = edges.find((e) => e.target === nodeId);
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
    [
      nodes,
      edges,
      setNodes,
      setEdges,
      isSharedView,
      commitSharedChat,
      setSelectedNodeId,
    ]
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
      if (nodeId === "root" || nodeId.endsWith(":root")) return;

      if (!mergeMode) {
        setMergeMode({ firstNodeId: nodeId });
        return;
      }

      if (mergeMode.firstNodeId === nodeId) {
        setMergeMode(null);
        return;
      }

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

      setPendingMerge({
        firstNodeId,
        secondNodeId,
        lcaId,
        branch1Messages,
        branch2Messages,
      });

      setInputMessage(DEFAULT_MERGE_PROMPT);
      setMergeMode(null);

      setTimeout(() => {
        document.getElementById("message-input")?.focus();
      }, 100);
    },
    [
      mergeMode,
      nodes,
      edges,
      isSharedView,
      commitSharedChat,
      setMergeMode,
      setPendingMerge,
      setInputMessage,
    ]
  );

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

      const path1 = getPathToNode(firstNodeId, nodes, edges);
      const lcaIndex1 = path1.findIndex((n) => n.id === lcaId);
      const lcaPath = path1.slice(0, lcaIndex1 + 1);
      const baseContext = buildConversationFromPath(lcaPath);

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

      const newNodeId = `node-${nodeIdCounterRef.current++}`;
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
      setSelectedNodeId,
      setPendingMerge,
      nodeIdCounterRef,
    ]
  );

  return {
    sendMessage,
    handleAddBranch,
    handleEditNode,
    handleDeleteNode,
    handleToggleCollapse,
    handleToggleContextMode,
    handleRegenerateMerge,
    handleMergeNode,
    executePendingMerge,
  };
};
