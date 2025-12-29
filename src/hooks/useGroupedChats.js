/**
 * Hook for computing grouped chat states
 */
import { useMemo } from "react";
import { loadChatState } from "../utils/storage";
import { initialNodes, initialEdges } from "../utils/constants";

// Horizontal offset between trees in grouped view
export const TREE_HORIZONTAL_OFFSET = 600;

export const useGroupedChats = ({ activeGroupInfo }) => {
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
        offset: { x: index * TREE_HORIZONTAL_OFFSET, y: 0 },
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
              chatId,
            },
          });
        });

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

  return {
    groupedStates,
    combinedGroupState,
  };
};
