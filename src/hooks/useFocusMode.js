/**
 * Hook for focus mode state and scroll-based navigation
 */
import { useState, useCallback, useRef, useMemo, useEffect } from "react";

export const useFocusMode = ({ nodes, edges, setSelectedNodeId }) => {
  const [focusModeNodeId, setFocusModeNodeId] = useState(null);
  const focusModeScrollRef = useRef(null);
  const scrollAccumulatorRef = useRef(0);
  const scrollDirectionRef = useRef(null);
  const scrollTimeoutRef = useRef(null);
  const navigationCooldownRef = useRef(false);
  const lastIndicatorRef = useRef({ force: 0, direction: null });
  const [scrollForceIndicator, setScrollForceIndicator] = useState({
    force: 0,
    direction: null,
  });

  // Track node count changes to detect new nodes for focus mode navigation
  const prevNodeCountRef = useRef(nodes.length);
  useEffect(() => {
    if (focusModeNodeId && nodes.length > prevNodeCountRef.current) {
      const childEdges = edges.filter((e) => e.source === focusModeNodeId);
      if (childEdges.length > 0) {
        const lastChild = childEdges[childEdges.length - 1];
        const childNode = nodes.find((n) => n.id === lastChild.target);
        if (childNode && !childNode.data?.isRoot) {
          setFocusModeNodeId(childNode.id);
          setSelectedNodeId(childNode.id);
        }
      }
    }
    prevNodeCountRef.current = nodes.length;
  }, [nodes.length, focusModeNodeId, edges, nodes, setSelectedNodeId]);

  const focusModeNode = useMemo(() => {
    if (!focusModeNodeId) return null;
    return nodes.find((n) => n.id === focusModeNodeId);
  }, [focusModeNodeId, nodes]);

  // Get parent and child nodes for focus mode navigation
  const focusModeNavigation = useMemo(() => {
    if (!focusModeNodeId) return { parent: null, children: [] };

    const parentEdge = edges.find((e) => e.target === focusModeNodeId);
    const parentId = parentEdge?.source;
    const parent = parentId ? nodes.find((n) => n.id === parentId) : null;

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

      // Reset scroll force indicator on any navigation
      scrollAccumulatorRef.current = 0;
      scrollDirectionRef.current = null;
      lastIndicatorRef.current = { force: 0, direction: null };
      setScrollForceIndicator({ force: 0, direction: null });

      // Set cooldown to ignore momentum scroll events
      navigationCooldownRef.current = true;
      setTimeout(() => {
        navigationCooldownRef.current = false;
      }, 500);

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
        const firstChild = focusModeNavigation.children[0];
        setFocusModeNodeId(firstChild.id);
        setSelectedNodeId(firstChild.id);
      }
    },
    [focusModeNodeId, focusModeNavigation, setSelectedNodeId]
  );

  // Handle scroll force detection for focus mode navigation
  const handleFocusModeScroll = useCallback(
    (e) => {
      if (!focusModeScrollRef.current) return;

      if (navigationCooldownRef.current) {
        e.preventDefault();
        return;
      }

      const el = focusModeScrollRef.current;
      const isAtTop = el.scrollTop <= 0;
      const isAtBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 2;

      const updateIndicator = (force, direction) => {
        const roundedForce = Math.round(force * 100) / 100;
        if (
          lastIndicatorRef.current.force !== roundedForce ||
          lastIndicatorRef.current.direction !== direction
        ) {
          lastIndicatorRef.current = { force: roundedForce, direction };
          setScrollForceIndicator({ force: roundedForce, direction });
        }
      };

      const currentDirection = e.deltaY < 0 ? "up" : "down";

      if (isAtTop && currentDirection === "up") {
        if (scrollDirectionRef.current !== "up") {
          scrollAccumulatorRef.current = 0;
          scrollDirectionRef.current = "up";
        }
        scrollAccumulatorRef.current += Math.abs(e.deltaY);
        e.preventDefault();

        const SCROLL_FORCE_THRESHOLD = 1500;
        const forceRatio = Math.min(
          scrollAccumulatorRef.current / SCROLL_FORCE_THRESHOLD,
          1
        );
        updateIndicator(forceRatio, "up");
      } else if (isAtBottom && currentDirection === "down") {
        if (scrollDirectionRef.current !== "down") {
          scrollAccumulatorRef.current = 0;
          scrollDirectionRef.current = "down";
        }
        scrollAccumulatorRef.current += Math.abs(e.deltaY);
        e.preventDefault();

        const SCROLL_FORCE_THRESHOLD = 1500;
        const forceRatio = Math.min(
          scrollAccumulatorRef.current / SCROLL_FORCE_THRESHOLD,
          1
        );
        updateIndicator(forceRatio, "down");
      } else {
        if (scrollAccumulatorRef.current > 0) {
          scrollAccumulatorRef.current = 0;
          scrollDirectionRef.current = null;
          updateIndicator(0, null);
        }
        return;
      }

      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => {
        scrollAccumulatorRef.current = 0;
        scrollDirectionRef.current = null;
        lastIndicatorRef.current = { force: 0, direction: null };
        setScrollForceIndicator({ force: 0, direction: null });
      }, 300);

      const SCROLL_FORCE_THRESHOLD = 1500;

      if (scrollAccumulatorRef.current >= SCROLL_FORCE_THRESHOLD) {
        const navDirection = scrollDirectionRef.current;
        scrollAccumulatorRef.current = 0;
        scrollDirectionRef.current = null;
        lastIndicatorRef.current = { force: 0, direction: null };
        setScrollForceIndicator({ force: 0, direction: null });
        if (navDirection === "up") {
          navigateFocusMode("up");
        } else if (navDirection === "down") {
          navigateFocusMode("down");
        }
      }
    },
    [navigateFocusMode]
  );

  // Handle double-click to toggle focus mode
  const onNodeDoubleClick = useCallback(
    (_, node) => {
      if (node.data?.isRoot) return;

      if (focusModeNodeId === node.id) {
        setFocusModeNodeId(null);
      } else {
        setFocusModeNodeId(node.id);
        setSelectedNodeId(node.id);
      }
    },
    [focusModeNodeId, setSelectedNodeId]
  );

  const closeFocusMode = useCallback(() => {
    setFocusModeNodeId(null);
  }, []);

  return {
    focusModeNodeId,
    setFocusModeNodeId,
    focusModeNode,
    focusModeNavigation,
    focusModeScrollRef,
    scrollForceIndicator,
    navigateFocusMode,
    handleFocusModeScroll,
    onNodeDoubleClick,
    closeFocusMode,
  };
};
