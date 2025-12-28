"use client";
import React, { memo } from "react";
import { getBezierPath, EdgeLabelRenderer } from "reactflow";
import { Box, Tooltip } from "@mui/material";
import { colors } from "../styles/theme";

// Context modes for merge
export const CONTEXT_MODE = {
  FULL: "full", // Include full branch context
  SINGLE: "single", // Include only this node's message
};

const MergeEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data,
  markerEnd,
}) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const contextMode = data?.contextMode || CONTEXT_MODE.FULL;
  const isMergeEdge = data?.isMergeEdge;
  const onToggleContextMode = data?.onToggleContextMode;

  // Only show indicator on merge edges (orange edges going into merged nodes)
  if (!isMergeEdge) {
    return (
      <path
        id={id}
        style={style}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
      />
    );
  }

  return (
    <>
      <path
        id={id}
        style={style}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
      />
      <EdgeLabelRenderer>
        <Tooltip
          title={
            contextMode === CONTEXT_MODE.FULL
              ? "Full branch context - Click to use single message only"
              : "Single message only - Click to use full branch context"
          }
          arrow
        >
          <Box
            onClick={(e) => {
              e.stopPropagation();
              onToggleContextMode?.(id);
            }}
            sx={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: "all",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 24,
              height: 24,
              borderRadius: "50%",
              backgroundColor:
                contextMode === CONTEXT_MODE.FULL
                  ? colors.accent.orange
                  : colors.border.primary,
              border: `2px solid ${colors.bg.primary}`,
              color: colors.text.primary,
              fontSize: 10,
              fontWeight: "bold",
              transition: "all 0.2s ease",
              "&:hover": {
                transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px) scale(1.2)`,
                backgroundColor:
                  contextMode === CONTEXT_MODE.FULL
                    ? colors.accent.orangeHover
                    : colors.text.muted,
              },
            }}
          >
            {contextMode === CONTEXT_MODE.FULL ? "∞" : "1"}
          </Box>
        </Tooltip>
      </EdgeLabelRenderer>
    </>
  );
};

export default memo(MergeEdge);
