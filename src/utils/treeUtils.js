/**
 * Tree traversal and conversation building utilities for the chat tree
 */

// Helper to get path from root to a specific node
export const getPathToNode = (nodeId, nodes, edges) => {
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
export const buildConversationFromPath = (path) => {
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
export const findLowestCommonAncestor = (nodeId1, nodeId2, nodes, edges) => {
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

// Find the lowest common ancestor of multiple nodes
export const findLowestCommonAncestorMultiple = (nodeIds, nodes, edges) => {
  if (nodeIds.length === 0) return "root";
  if (nodeIds.length === 1) return nodeIds[0];

  // Get all paths
  const paths = nodeIds.map((id) => getPathToNode(id, nodes, edges));
  const pathIdSets = paths.map((path) => new Set(path.map((n) => n.id)));

  // Start from the first path and find ancestors common to all paths
  const firstPath = paths[0];

  // Walk from the deepest node towards root, find first node that's in all paths
  for (let i = firstPath.length - 1; i >= 0; i--) {
    const candidateId = firstPath[i].id;
    const isInAllPaths = pathIdSets.every((set) => set.has(candidateId));
    if (isInAllPaths) {
      return candidateId;
    }
  }

  return "root";
};

// Get all descendants of a node
export const getDescendants = (nodeId, nodes, edges) => {
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

// Get chat name from nodes (first non-root user message or "New Chat")
export const getChatName = (nodes) => {
  const firstUserNode = nodes.find(
    (n) => !n.data?.isRoot && n.data?.userMessage
  );
  if (firstUserNode?.data?.userMessage) {
    const msg = firstUserNode.data.userMessage;
    return msg.length > 30 ? msg.substring(0, 30) + "..." : msg;
  }
  return "New Chat";
};
