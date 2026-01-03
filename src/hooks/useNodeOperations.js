/**
 * Hook for node and edge operations - send messages, edit, delete, merge
 */
import { useCallback, useRef, useEffect } from "react";
import { useReactFlow } from "reactflow";
import { CONTEXT_MODE } from "../components/MergeEdge";
import { modelSupportsVision } from "../utils/visionModels";
import {
  getPathToNode,
  buildConversationFromPath,
  findLowestCommonAncestor,
  findLowestCommonAncestorMultiple,
  getDescendants,
} from "../utils/treeUtils";

// Helper to get immediate children of a node
const getImmediateChildren = (nodeId, edges) => {
  return edges.filter((e) => e.source === nodeId).map((e) => e.target);
};

// Default vertical gap between nodes
const NODE_VERTICAL_GAP = 50;

// Get node height from measured dimensions or use default
const getNodeHeight = (node) => {
  return node?.measured?.height || node?.height || 200;
};

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
  modelsData,
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

  // Keep refs to latest nodes/edges for use in async callbacks
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);

  // Update refs when nodes/edges change
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  // Track if cascade is active to prevent duplicate triggers
  const cascadeActiveRef = useRef(false);

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
      const parentHeight = getNodeHeight(parentNode);

      const newNode = {
        id: newNodeId,
        type: "chatNode",
        position: {
          x:
            parentNode.position.x +
            xOffset -
            (existingChildren.length > 0 ? 160 : 0),
          y: parentNode.position.y + parentHeight + NODE_VERTICAL_GAP,
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

  // Internal function to regenerate a single node and return a promise
  const regenerateNodeAsync = useCallback(
    (nodeId) => {
      return new Promise((resolve) => {
        const currentNodes = nodesRef.current;
        const currentEdges = edgesRef.current;

        const node = currentNodes.find((n) => n.id === nodeId);
        if (!node || node.data?.isRoot) {
          resolve();
          return;
        }

        const userMessage = node.data.userMessage;
        if (!userMessage) {
          resolve();
          return;
        }

        // Check if this is a merged node
        if (node.data?.isMergedNode && node.data.mergeParents) {
          const mergeParents = node.data.mergeParents;
          const lcaId = node.data.lcaId;

          // Build branches for all parent nodes with their context modes
          const branches = mergeParents.map((parentId) => {
            const edge = currentEdges.find(
              (e) => e.source === parentId && e.target === nodeId
            );
            const contextMode = edge?.data?.contextMode || CONTEXT_MODE.SINGLE;

            const path = getPathToNode(parentId, currentNodes, currentEdges);
            const lcaIndex = path.findIndex((n) => n.id === lcaId);

            let branch;
            if (contextMode === CONTEXT_MODE.FULL) {
              branch = path.slice(lcaIndex + 1);
            } else {
              const lastNode = path[path.length - 1];
              branch = lastNode ? [lastNode] : [];
            }

            return {
              nodeId: parentId,
              messages: buildConversationFromPath(branch),
              contextMode,
            };
          });

          // Get base context from LCA
          const path1 = getPathToNode(
            mergeParents[0],
            currentNodes,
            currentEdges
          );
          const lcaIndex1 = path1.findIndex((n) => n.id === lcaId);
          const lcaPath = path1.slice(0, lcaIndex1 + 1);
          const baseContext = buildConversationFromPath(lcaPath);

          // Build merged context with all branches
          const branchCount = branches.length;
          let mergedContext = `You are continuing a conversation that has branched into ${branchCount} paths. Here are all branches:\n\n`;

          branches.forEach((branch, index) => {
            const branchLabel = String.fromCharCode(65 + index); // A, B, C, D, ...
            const modeLabel =
              branch.contextMode === CONTEXT_MODE.FULL
                ? "full context"
                : "single message";
            mergedContext += `=== BRANCH ${branchLabel} (${modeLabel}) ===\n`;
            for (const msg of branch.messages) {
              mergedContext += `${msg.role.toUpperCase()}: ${msg.content}\n\n`;
            }
          });

          mergedContext += "=== END BRANCHES ===\n\n";
          mergedContext += userMessage;

          updateNodeData(nodeId, {
            assistantMessage: "",
            status: "loading",
            error: null,
          });

          const conversationMessages = [
            ...baseContext,
            { role: "user", content: mergedContext },
          ];

          sendChatRequest(
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
              resolve();
            },
            (error) => {
              console.error(error);
              updateNodeData(nodeId, {
                error: error.message,
                status: "error",
              });
              resolve();
            }
          );
          return;
        }

        // Regular node regeneration
        updateNodeData(nodeId, {
          assistantMessage: "",
          status: "loading",
          error: null,
        });

        const parentEdge = currentEdges.find((e) => e.target === nodeId);
        const parentNodeId = parentEdge?.source || "root";

        const path = getPathToNode(parentNodeId, currentNodes, currentEdges);
        const conversationMessages = buildConversationFromPath(path);
        conversationMessages.push({ role: "user", content: userMessage });

        sendChatRequest(
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
            resolve();
          },
          (error) => {
            console.error(error);
            updateNodeData(nodeId, {
              error: error.message,
              status: "error",
            });
            resolve();
          }
        );
      });
    },
    [selectedModel, updateNodeData, sendChatRequest]
  );

  // Cascade regeneration to all descendants after a node is edited
  const cascadeRegenerateDescendants = useCallback(
    async (startNodeId) => {
      if (cascadeActiveRef.current) return;
      cascadeActiveRef.current = true;

      try {
        // Track all nodes that have been regenerated in this cascade
        const processedNodes = new Set([startNodeId]);

        // Track nodes that are part of the regeneration chain (affected by the edit)
        const affectedNodes = new Set([startNodeId]);

        // Queue for BFS traversal - process level by level
        let currentLevel = [startNodeId];

        while (currentLevel.length > 0) {
          const nextLevel = [];

          // Collect all children of current level nodes
          for (const nodeId of currentLevel) {
            const children = getImmediateChildren(nodeId, edgesRef.current);
            for (const childId of children) {
              if (processedNodes.has(childId)) continue;

              const childNode = nodesRef.current.find((n) => n.id === childId);
              if (!childNode) continue;

              // For merged nodes, we regenerate if ANY parent was affected
              // (not waiting for all parents - the other parent wasn't changed)
              if (childNode.data?.isMergedNode && childNode.data.mergeParents) {
                const anyParentAffected = childNode.data.mergeParents.some(
                  (pid) => affectedNodes.has(pid)
                );
                if (anyParentAffected) {
                  nextLevel.push(childId);
                }
              } else {
                // Regular node - add to next level
                nextLevel.push(childId);
              }
            }
          }

          if (nextLevel.length === 0) break;

          // Regenerate all nodes in this level sequentially
          for (const childId of nextLevel) {
            processedNodes.add(childId);
            affectedNodes.add(childId);
            await regenerateNodeAsync(childId);
          }

          currentLevel = nextLevel;
        }
      } finally {
        cascadeActiveRef.current = false;
      }
    },
    [regenerateNodeAsync]
  );

  // Handle editing a node's user message (regenerates response and cascades to children)
  const handleEditNode = useCallback(
    async (nodeId, newUserMessage) => {
      if (!newUserMessage.trim()) return;

      if (isSharedView) commitSharedChat();

      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return;

      // Check if this is a merged node
      if (node?.data?.isMergedNode && node.data.mergeParents) {
        const mergeParents = node.data.mergeParents;
        const lcaId = node.data.lcaId;

        // Build branches for all parent nodes with their context modes
        const branches = mergeParents.map((parentId) => {
          const edge = edges.find(
            (e) => e.source === parentId && e.target === nodeId
          );
          const contextMode = edge?.data?.contextMode || CONTEXT_MODE.SINGLE;

          const path = getPathToNode(parentId, nodes, edges);
          const lcaIndex = path.findIndex((n) => n.id === lcaId);

          let branch;
          if (contextMode === CONTEXT_MODE.FULL) {
            branch = path.slice(lcaIndex + 1);
          } else {
            const lastNode = path[path.length - 1];
            branch = lastNode ? [lastNode] : [];
          }

          return {
            nodeId: parentId,
            messages: buildConversationFromPath(branch),
            contextMode,
          };
        });

        // Get base context from LCA
        const path1 = getPathToNode(mergeParents[0], nodes, edges);
        const lcaIndex1 = path1.findIndex((n) => n.id === lcaId);
        const lcaPath = path1.slice(0, lcaIndex1 + 1);
        const baseContext = buildConversationFromPath(lcaPath);

        // Build merged context with all branches
        const branchCount = branches.length;
        let mergedContext = `You are continuing a conversation that has branched into ${branchCount} paths. Here are all branches:\n\n`;

        branches.forEach((branch, index) => {
          const branchLabel = String.fromCharCode(65 + index); // A, B, C, D, ...
          const modeLabel =
            branch.contextMode === CONTEXT_MODE.FULL
              ? "full context"
              : "single message";
          mergedContext += `=== BRANCH ${branchLabel} (${modeLabel}) ===\n`;
          for (const msg of branch.messages) {
            mergedContext += `${msg.role.toUpperCase()}: ${msg.content}\n\n`;
          }
        });

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
          async (fullResponse) => {
            updateNodeData(nodeId, {
              assistantMessage: fullResponse,
              status: "complete",
              model: selectedModel,
            });
            // Cascade to children after this node completes
            cascadeRegenerateDescendants(nodeId);
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
        async (fullResponse) => {
          updateNodeData(nodeId, {
            assistantMessage: fullResponse,
            status: "complete",
            model: selectedModel,
          });
          // Cascade to children after this node completes
          cascadeRegenerateDescendants(nodeId);
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
      cascadeRegenerateDescendants,
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
            const collapsedKey =
              messageType === "user"
                ? "userMessageCollapsed"
                : messageType === "assistant"
                ? "assistantMessageCollapsed"
                : "contentCollapsed";
            return {
              ...node,
              data: {
                ...node.data,
                [collapsedKey]: collapsed,
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

      const mergeParents = node.data.mergeParents;
      const lcaId = node.data.lcaId;

      // Build branches for all parent nodes with their context modes
      const branches = mergeParents.map((parentId, index) => {
        const edge = edges.find(
          (e) => e.source === parentId && e.target === nodeId
        );
        const contextMode = edge?.data?.contextMode || CONTEXT_MODE.FULL;

        const path = getPathToNode(parentId, nodes, edges);
        const lcaIndex = path.findIndex((n) => n.id === lcaId);

        let branch;
        if (contextMode === CONTEXT_MODE.FULL) {
          branch = path.slice(lcaIndex + 1);
        } else {
          const lastNode = path[path.length - 1];
          branch = lastNode ? [lastNode] : [];
        }

        return {
          nodeId: parentId,
          messages: buildConversationFromPath(branch),
          contextMode,
        };
      });

      // Get base context from LCA
      const path1 = getPathToNode(mergeParents[0], nodes, edges);
      const lcaIndex1 = path1.findIndex((n) => n.id === lcaId);
      const lcaPath = path1.slice(0, lcaIndex1 + 1);
      const baseContext = buildConversationFromPath(lcaPath);

      // Build merged prompt with all branches
      const branchCount = branches.length;
      let mergedPrompt = `You are continuing a conversation that has branched into ${branchCount} paths. Here are all branches:\n\n`;

      branches.forEach((branch, index) => {
        const branchLabel = String.fromCharCode(65 + index); // A, B, C, D, ...
        const modeLabel =
          branch.contextMode === CONTEXT_MODE.FULL
            ? "full context"
            : "single message";
        mergedPrompt += `=== BRANCH ${branchLabel} (${modeLabel}) ===\n`;
        for (const msg of branch.messages) {
          mergedPrompt += `${msg.role.toUpperCase()}: ${msg.content}\n\n`;
        }
      });

      mergedPrompt += "=== END BRANCHES ===\n\n";
      mergedPrompt +=
        "Please synthesize insights from all branches and continue the conversation, acknowledging key points from each path.";

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

  // Handle merge - clicks add/remove nodes from selection, double-click or confirm triggers merge
  const handleMergeNode = useCallback(
    (nodeId, isDoubleClick = false) => {
      if (nodeId === "root" || nodeId.endsWith(":root")) return;

      // If no merge mode, start it with this node
      if (!mergeMode) {
        setMergeMode({ selectedNodeIds: [nodeId] });
        return;
      }

      const selectedNodeIds = mergeMode.selectedNodeIds || [];
      const isSelected = selectedNodeIds.includes(nodeId);

      // If double-clicking or we have 2+ nodes and clicking a selected one, trigger merge
      if (isDoubleClick && selectedNodeIds.length >= 2) {
        // Proceed to pending merge
        if (isSharedView) commitSharedChat();

        // Separate artifact nodes from chat nodes
        const artifactNodeIds = selectedNodeIds.filter((id) => {
          const node = nodes.find((n) => n.id === id);
          return node?.type === "artifactNode";
        });
        const chatNodeIds = selectedNodeIds.filter((id) => {
          const node = nodes.find((n) => n.id === id);
          return node?.type !== "artifactNode";
        });

        // Find LCA only among chat nodes (artifacts don't have paths)
        const lcaId =
          chatNodeIds.length > 0
            ? findLowestCommonAncestorMultiple(chatNodeIds, nodes, edges)
            : "root";

        // Build branches for chat nodes
        const branches = chatNodeIds.map((id) => {
          const path = getPathToNode(id, nodes, edges);
          const lcaIndex = path.findIndex((n) => n.id === lcaId);
          const branch = path.slice(lcaIndex + 1);
          return {
            nodeId: id,
            messages: buildConversationFromPath(branch),
            isArtifact: false,
          };
        });

        // Add artifact nodes as special branches
        artifactNodeIds.forEach((id) => {
          const node = nodes.find((n) => n.id === id);
          if (node) {
            const isImage = node.data.artifactType === "image";
            branches.push({
              nodeId: id,
              messages: [],
              isArtifact: true,
              artifactName: node.data.name,
              artifactType: node.data.artifactType,
              // Store full content for images (base64 data URL)
              artifactContent: node.data.content,
            });
          }
        });

        setPendingMerge({
          selectedNodeIds,
          lcaId,
          branches,
        });

        setInputMessage(DEFAULT_MERGE_PROMPT);
        setMergeMode(null);

        setTimeout(() => {
          document.getElementById("message-input")?.focus();
        }, 100);
        return;
      }

      // Toggle node selection
      if (isSelected) {
        // Remove from selection
        const newSelection = selectedNodeIds.filter((id) => id !== nodeId);
        if (newSelection.length === 0) {
          // Cancel merge mode if no nodes left
          setMergeMode(null);
        } else {
          setMergeMode({ selectedNodeIds: newSelection });
        }
      } else {
        // Add to selection
        setMergeMode({ selectedNodeIds: [...selectedNodeIds, nodeId] });
      }
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

      const { selectedNodeIds, lcaId, branches } = pendingMerge;

      // Check if model supports vision
      const supportsVision = modelSupportsVision(selectedModel, modelsData);

      // Get the base context from LCA path (only if we have chat nodes)
      const chatNodeIds = selectedNodeIds.filter((id) => {
        const node = nodes.find((n) => n.id === id);
        return node?.type !== "artifactNode";
      });

      let baseContext = [];
      if (chatNodeIds.length > 0) {
        const path1 = getPathToNode(chatNodeIds[0], nodes, edges);
        const lcaIndex1 = path1.findIndex((n) => n.id === lcaId);
        const lcaPath = path1.slice(0, lcaIndex1 + 1);
        baseContext = buildConversationFromPath(lcaPath);
      }

      // Separate text and image artifacts
      const textArtifacts = branches.filter(
        (b) => b.isArtifact && b.artifactType === "text"
      );
      const imageArtifacts = branches.filter(
        (b) => b.isArtifact && b.artifactType === "image"
      );
      const chatBranches = branches.filter((b) => !b.isArtifact);

      // Build merged prompt with text content
      const branchCount = chatBranches.length + textArtifacts.length;
      let mergedPrompt = "";

      if (branchCount > 0) {
        mergedPrompt = `You are continuing a conversation that includes ${
          branchCount +
          (supportsVision && imageArtifacts.length > 0
            ? imageArtifacts.length
            : 0)
        } sources. Here are the sources:\n\n`;

        chatBranches.forEach((branch, index) => {
          const branchLabel = String.fromCharCode(65 + index);
          mergedPrompt += `=== BRANCH ${branchLabel} ===\n`;
          for (const msg of branch.messages) {
            mergedPrompt += `${msg.role.toUpperCase()}: ${msg.content}\n\n`;
          }
        });

        textArtifacts.forEach((branch) => {
          mergedPrompt += `=== ARTIFACT: ${branch.artifactName} ===\n`;
          mergedPrompt += `${branch.artifactContent}\n\n`;
        });

        if (supportsVision && imageArtifacts.length > 0) {
          mergedPrompt += `=== IMAGES ===\n`;
          mergedPrompt += `${imageArtifacts.length} image(s) attached below.\n\n`;
        }

        mergedPrompt += "=== END SOURCES ===\n\n";
      }

      mergedPrompt += userPrompt;

      const newNodeId = `node-${nodeIdCounterRef.current++}`;

      // Calculate position - average x, max (y + height) + gap
      const parentNodes = selectedNodeIds.map((id) =>
        nodes.find((n) => n.id === id)
      );
      const avgX =
        parentNodes.reduce((sum, n) => sum + n.position.x, 0) /
        parentNodes.length;
      const maxYWithHeight = Math.max(
        ...parentNodes.map((n) => n.position.y + getNodeHeight(n))
      );

      const newNode = {
        id: newNodeId,
        type: "chatNode",
        position: {
          x: avgX,
          y: maxYWithHeight + NODE_VERTICAL_GAP,
        },
        data: {
          userMessage: userPrompt,
          assistantMessage: "",
          status: "loading",
          isRoot: false,
          isMergedNode: true,
          mergeParents: chatNodeIds, // Only chat nodes as parents for tree structure
          mergedArtifacts: selectedNodeIds.filter((id) => {
            const node = nodes.find((n) => n.id === id);
            return node?.type === "artifactNode";
          }),
          lcaId: lcaId,
        },
      };

      // Create edges only from chat nodes (artifacts are standalone)
      const chatEdges = chatNodeIds.map((parentId) => ({
        id: `edge-${parentId}-${newNodeId}`,
        source: parentId,
        target: newNodeId,
        type: "mergeEdge",
        style: { stroke: "#ff9800", strokeWidth: 2 },
        data: {
          isMergeEdge: true,
          contextMode: CONTEXT_MODE.SINGLE,
        },
      }));

      // Create edges from artifacts (different style)
      const artifactNodeIds = selectedNodeIds.filter((id) => {
        const node = nodes.find((n) => n.id === id);
        return node?.type === "artifactNode";
      });
      const artifactEdges = artifactNodeIds.map((parentId) => ({
        id: `edge-${parentId}-${newNodeId}`,
        source: parentId,
        target: newNodeId,
        type: "smoothstep",
        style: { stroke: "#ff9800", strokeWidth: 2, strokeDasharray: "5,5" },
        data: {
          isArtifactEdge: true,
        },
      }));

      const newEdges = [...chatEdges, ...artifactEdges];

      setNodes((nds) => [...nds, newNode]);
      setEdges((eds) => [...eds, ...newEdges]);

      setSelectedNodeId(newNodeId);
      setPendingMerge(null);

      // Build the user message content - can be multimodal for vision models
      let userMessageContent;

      if (supportsVision && imageArtifacts.length > 0) {
        // Build multimodal content array for vision models
        const contentParts = [{ type: "text", text: mergedPrompt }];

        // Add images
        for (const imgArtifact of imageArtifacts) {
          const imageUrl = imgArtifact.artifactContent;
          // Check if it's a data URL
          if (imageUrl.startsWith("data:")) {
            contentParts.push({
              type: "image_url",
              image_url: { url: imageUrl },
            });
          } else {
            // Regular URL
            contentParts.push({
              type: "image_url",
              image_url: { url: imageUrl },
            });
          }
        }

        userMessageContent = contentParts;
      } else {
        // Text-only content
        userMessageContent = mergedPrompt;
      }

      const conversationMessages = [
        ...baseContext,
        { role: "user", content: userMessageContent },
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
