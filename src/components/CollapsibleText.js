"use client";
import React, { useRef, useEffect } from "react";
import { Box, Typography } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import MarkdownContent from "./MarkdownContent";
import { colors } from "../styles/theme";

const COLLAPSE_LINE_THRESHOLD = 16;
const COLLAPSE_CHAR_THRESHOLD = 800; // Also collapse if text is long without many newlines
const MAX_COLLAPSED_HEIGHT = 500; // Approximate height for 16 lines

const countLines = (text) => {
  if (!text) return 0;
  return text.split("\n").length;
};

const shouldCollapse = (text, lineThreshold, charThreshold = COLLAPSE_CHAR_THRESHOLD) => {
  if (!text) return false;
  const lineCount = countLines(text);
  return lineCount > lineThreshold || text.length > charThreshold;
};

const CollapsibleText = ({
  text,
  collapsed,
  onToggleCollapse,
  lockScrollOnNodeFocus,
  useMarkdown = true,
  maxHeight = MAX_COLLAPSED_HEIGHT,
  lineThreshold = COLLAPSE_LINE_THRESHOLD,
  alwaysScrollable = false,
}) => {
  const scrollRef = useRef(null);
  const lineCount = countLines(text);
  const exceedsThreshold = shouldCollapse(text, lineThreshold);
  const shouldShowCollapse = !alwaysScrollable && exceedsThreshold;
  // Use prop if provided, otherwise default based on threshold
  const isCollapsed = collapsed !== undefined ? collapsed : exceedsThreshold;

  // For alwaysScrollable mode, we always apply scroll styles
  const applyScrollStyles =
    alwaysScrollable || (isCollapsed && shouldShowCollapse);

  // Use effect to add wheel event listener with passive: false to allow preventDefault
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !lockScrollOnNodeFocus) return;

    const handleWheel = (e) => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      const isScrollable = scrollHeight > clientHeight;

      if (!isScrollable) return;

      const atTop = scrollTop <= 0;
      const atBottom = scrollTop + clientHeight >= scrollHeight - 1;

      // Check if we can scroll in the wheel direction
      const canScrollUp = e.deltaY < 0 && !atTop;
      const canScrollDown = e.deltaY > 0 && !atBottom;

      if (canScrollUp || canScrollDown) {
        // Stop the event from reaching ReactFlow
        e.stopPropagation();
        e.preventDefault();
        // Manually scroll the element
        el.scrollTop += e.deltaY;
      }
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [lockScrollOnNodeFocus, isCollapsed, alwaysScrollable]);

  return (
    <Box sx={{ position: "relative" }}>
      <Box
        ref={scrollRef}
        sx={{
          ...(applyScrollStyles
            ? {
                maxHeight: maxHeight,
                overflowY: "auto",
                "&::-webkit-scrollbar": {
                  width: 6,
                },
                "&::-webkit-scrollbar-track": {
                  background: colors.bg.tertiary,
                  borderRadius: 3,
                },
                "&::-webkit-scrollbar-thumb": {
                  background: colors.border.primary,
                  borderRadius: 3,
                  "&:hover": {
                    background: colors.text.dim,
                  },
                },
              }
            : {}),
        }}
      >
        {useMarkdown ? (
          <MarkdownContent className="ph-no-capture">{text}</MarkdownContent>
        ) : (
          <Typography
            variant="body2"
            sx={{
              color: colors.text.secondary,
              fontSize: "0.8rem",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
            className="ph-no-capture"
          >
            {text}
          </Typography>
        )}
      </Box>
      {shouldShowCollapse && (
        <Box
          onClick={(e) => {
            e.stopPropagation();
            if (onToggleCollapse) onToggleCollapse(!isCollapsed);
          }}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            mt: 0.5,
            cursor: "pointer",
            color: colors.accent.blue,
            "&:hover": { color: colors.accent.blueHover },
          }}
        >
          {isCollapsed ? (
            <>
              <ExpandMoreIcon sx={{ fontSize: 16 }} />
              <Typography variant="caption">
                Show more ({lineCount} lines)
              </Typography>
            </>
          ) : (
            <>
              <ExpandLessIcon sx={{ fontSize: 16 }} />
              <Typography variant="caption">Show less</Typography>
            </>
          )}
        </Box>
      )}
    </Box>
  );
};

export default CollapsibleText;
