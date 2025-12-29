/**
 * Hook for managing chat CRUD operations, switching, and grouping
 */
import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useReactFlow } from "reactflow";
import {
  loadChatsList,
  saveChatsList,
  loadChatState,
  saveChatState,
  deleteChatState,
  getActiveChatId,
  setActiveChatId,
  generateChatId,
  generateGroupId,
} from "../utils/storage";
import { initialNodes, initialEdges } from "../utils/constants";

// Horizontal offset between trees in grouped view
export const TREE_HORIZONTAL_OFFSET = 600;

export const useChatManagement = ({
  setNodes,
  setEdges,
  setSelectedNodeId,
  setMergeMode,
  setSnackbar,
  nodeIdCounterRef,
  isSharedView,
  setIsSharedView,
}) => {
  const [activeChatId, setActiveChatIdState] = useState(() =>
    getActiveChatId()
  );
  const [chatsList, setChatsList] = useState(() => loadChatsList());
  const [focusedChatId, setFocusedChatId] = useState(activeChatId);

  const { fitView, getNodes } = useReactFlow();

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

  // Switch to a different chat
  const switchToChat = useCallback(
    (chatId) => {
      setActiveChatId(chatId);
      setActiveChatIdState(chatId);
      setFocusedChatId(chatId);
      setIsSharedView(false);

      const targetChat = chatsList.find((c) => c.id === chatId);
      const isGrouped = targetChat?.groupId;

      if (isGrouped) {
        const groupMembers = chatsList
          .filter((c) => c.groupId === targetChat.groupId)
          .sort((a, b) => (a.order || 0) - (b.order || 0));

        if (groupMembers.length < 2) {
          const updatedList = chatsList.map((c) =>
            c.groupId === targetChat.groupId ? { ...c, groupId: null } : c
          );
          saveChatsList(updatedList);
          setChatsList(updatedList);

          const chatState = loadChatState(chatId);
          if (chatState) {
            setNodes(chatState.nodes || initialNodes);
            setEdges(chatState.edges || initialEdges);
            setSelectedNodeId(chatState.selectedNodeId || "root");
            nodeIdCounterRef.current = chatState.nodeIdCounter || 1;
          } else {
            setNodes(initialNodes);
            setEdges(initialEdges);
            setSelectedNodeId("root");
            nodeIdCounterRef.current = 1;
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

          if (state?.nodeIdCounter > maxNodeIdCounter) {
            maxNodeIdCounter = state.nodeIdCounter;
          }
        });

        setNodes(allNodes);
        setEdges(allEdges);

        const chatState = loadChatState(chatId);
        setSelectedNodeId(`${chatId}:${chatState?.selectedNodeId || "root"}`);
        nodeIdCounterRef.current = maxNodeIdCounter;
      } else {
        const chatState = loadChatState(chatId);
        if (chatState) {
          setNodes(chatState.nodes || initialNodes);
          setEdges(chatState.edges || initialEdges);
          setSelectedNodeId(chatState.selectedNodeId || "root");
          nodeIdCounterRef.current = chatState.nodeIdCounter || 1;
        } else {
          setNodes(initialNodes);
          setEdges(initialEdges);
          setSelectedNodeId("root");
          nodeIdCounterRef.current = 1;
        }
      }

      setMergeMode(null);
      setTimeout(() => fitView({ padding: 0.2 }), 100);
    },
    [
      setNodes,
      setEdges,
      fitView,
      chatsList,
      setSelectedNodeId,
      setMergeMode,
      setIsSharedView,
      nodeIdCounterRef,
    ]
  );

  // Focus on a chat within a group without reloading
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
    [
      activeChatId,
      chatsList,
      fitView,
      getNodes,
      switchToChat,
      setSelectedNodeId,
    ]
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
      if (chatsList.length <= 1) return;

      const deletedChat = chatsList.find((c) => c.id === chatId);
      const deletedGroupId = deletedChat?.groupId;

      let updatedList = chatsList.filter((c) => c.id !== chatId);

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
      deleteChatState(chatId);

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
      const draggedIndex = updatedList.findIndex((c) => c.id === draggedChatId);
      const targetIndex = updatedList.findIndex((c) => c.id === targetChatId);

      if (draggedIndex === -1 || targetIndex === -1) return;

      const draggedChat = updatedList[draggedIndex];
      const targetChat = updatedList[targetIndex];

      if (targetChat.groupId && draggedChat.groupId !== targetChat.groupId) {
        draggedChat.groupId = targetChat.groupId;
      } else if (!targetChat.groupId && draggedChat.groupId) {
        const groupMembers = updatedList.filter(
          (c) => c.groupId === draggedChat.groupId && c.id !== draggedChat.id
        );
        if (groupMembers.length < 2) {
          groupMembers.forEach((member) => {
            member.groupId = null;
          });
        }
        draggedChat.groupId = null;
      }

      updatedList.splice(draggedIndex, 1);
      const newTargetIndex = updatedList.findIndex(
        (c) => c.id === targetChatId
      );
      const insertIndex = insertBefore ? newTargetIndex : newTargetIndex + 1;
      updatedList.splice(insertIndex, 0, draggedChat);

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

      if (draggedChat.groupId || targetChat.groupId) {
        setSnackbar({
          open: true,
          message: "Cannot group chats that are already in a group",
          severity: "warning",
        });
        return;
      }

      const newGroupId = generateGroupId();
      draggedChat.groupId = newGroupId;
      targetChat.groupId = newGroupId;

      saveChatsList(updatedList);
      setChatsList(updatedList);

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
        nodeIdCounterRef.current = maxNodeIdCounter;
        setTimeout(() => fitView({ padding: 0.2 }), 100);
      }

      setSnackbar({
        open: true,
        message: "Chats grouped together",
        severity: "success",
      });
    },
    [
      chatsList,
      activeChatId,
      fitView,
      setEdges,
      setNodes,
      setSelectedNodeId,
      setSnackbar,
      nodeIdCounterRef,
    ]
  );

  // Refresh chats list from storage
  const refreshChatsList = useCallback(() => {
    setChatsList(loadChatsList());
  }, []);

  return {
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
  };
};
