"use client";
import React, { memo, useState } from "react";
import { Handle, Position } from "reactflow";
import { Box, Typography, IconButton, CircularProgress } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";

const ChatNode = ({ id, data, selected }) => {
  const [hovered, setHovered] = useState(false);

  const isLoading = data.status === "loading";
  const isRoot = data.isRoot;

  return (
    <Box
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      sx={{
        minWidth: 280,
        maxWidth: 400,
        backgroundColor: selected ? "#1e1e1e" : "#2a2a2a",
        border: selected ? "2px solid #4a9eff" : "1px solid #444",
        borderRadius: 2,
        overflow: "hidden",
        cursor: "pointer",
        transition: "all 0.2s ease",
        "&:hover": {
          borderColor: "#666",
        },
      }}
    >
      {/* Input handle (top) - not for root */}
      {!isRoot && (
        <Handle
          type="target"
          position={Position.Top}
          style={{
            background: "#4a9eff",
            width: 8,
            height: 8,
            border: "none",
          }}
        />
      )}

      {/* User message */}
      {!isRoot && (
        <Box
          sx={{
            p: 1.5,
            backgroundColor: "#1a3a5c",
            borderBottom: "1px solid #444",
          }}
        >
          <Typography
            variant="caption"
            sx={{
              color: "#8ab4f8",
              fontWeight: 500,
              mb: 0.5,
              display: "block",
            }}
          >
            You
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: "#e0e0e0",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {data.userMessage}
          </Typography>
        </Box>
      )}

      {/* Assistant response */}
      <Box sx={{ p: 1.5, minHeight: 40 }}>
        {isRoot ? (
          <Typography
            variant="body2"
            sx={{ color: "#888", fontStyle: "italic" }}
          >
            Start a conversation...
          </Typography>
        ) : isLoading ? (
          <Box display="flex" alignItems="center" gap={1}>
            <CircularProgress size={16} sx={{ color: "#4a9eff" }} />
            <Typography variant="body2" sx={{ color: "#888" }}>
              Generating...
            </Typography>
          </Box>
        ) : data.assistantMessage ? (
          <>
            <Typography
              variant="caption"
              sx={{
                color: "#81c784",
                fontWeight: 500,
                mb: 0.5,
                display: "block",
              }}
            >
              Assistant
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: "#e0e0e0",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {data.assistantMessage}
            </Typography>
          </>
        ) : data.error ? (
          <Typography variant="body2" sx={{ color: "#f44336" }}>
            Error: {data.error}
          </Typography>
        ) : null}
      </Box>

      {/* Add branch button */}
      {(hovered || selected) && !isLoading && (
        <Box
          sx={{
            position: "absolute",
            bottom: -20,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 10,
          }}
        >
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              data.onAddBranch?.(id);
            }}
            sx={{
              backgroundColor: "#4a9eff",
              color: "#fff",
              width: 24,
              height: 24,
              "&:hover": {
                backgroundColor: "#3a8eef",
              },
            }}
          >
            <AddIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
      )}

      {/* Output handle (bottom) */}
      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          background: "#4a9eff",
          width: 8,
          height: 8,
          border: "none",
        }}
      />
    </Box>
  );
};

export default memo(ChatNode);
