"use client";
import React, { memo, useState } from "react";
import { Handle, Position } from "reactflow";
import {
  Box,
  Typography,
  IconButton,
  CircularProgress,
  Collapse,
  TextField,
  Tooltip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import MergeIcon from "@mui/icons-material/CallMerge";
import RefreshIcon from "@mui/icons-material/Refresh";

const COLLAPSE_THRESHOLD = 500; // Characters before showing collapse option

const CollapsibleText = ({ text, label, color }) => {
  const [collapsed, setCollapsed] = useState(text?.length > COLLAPSE_THRESHOLD);
  const shouldShowCollapse = text?.length > COLLAPSE_THRESHOLD;

  const displayText = collapsed
    ? text?.slice(0, COLLAPSE_THRESHOLD) + "..."
    : text;

  return (
    <>
      <Typography
        variant="body2"
        sx={{
          color: "#e0e0e0",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {displayText}
      </Typography>
      {shouldShowCollapse && (
        <Box
          onClick={(e) => {
            e.stopPropagation();
            setCollapsed(!collapsed);
          }}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            mt: 0.5,
            cursor: "pointer",
            color: "#4a9eff",
            "&:hover": { color: "#6ab4ff" },
          }}
        >
          {collapsed ? (
            <>
              <ExpandMoreIcon sx={{ fontSize: 16 }} />
              <Typography variant="caption">
                Show more ({text.length} chars)
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
    </>
  );
};

const ChatNode = ({ id, data, selected }) => {
  const [hovered, setHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editUserMessage, setEditUserMessage] = useState("");

  const isLoading = data.status === "loading";
  const isRoot = data.isRoot;
  const isMergeSource = data.isMergeSource;
  const isMergedNode = data.isMergedNode;

  const handleStartEdit = (e) => {
    e.stopPropagation();
    setEditUserMessage(data.userMessage || "");
    setIsEditing(true);
  };

  const handleSaveEdit = (e) => {
    e.stopPropagation();
    data.onEditNode?.(id, editUserMessage);
    setIsEditing(false);
  };

  const handleCancelEdit = (e) => {
    e.stopPropagation();
    setIsEditing(false);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    data.onDeleteNode?.(id);
  };

  const handleMerge = (e) => {
    e.stopPropagation();
    data.onMergeNode?.(id);
  };

  const handleRegenerateMerge = (e) => {
    e.stopPropagation();
    data.onRegenerateMerge?.(id);
  };

  return (
    <Box
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      sx={{
        minWidth: 350,
        maxWidth: 500,
        backgroundColor: selected ? "#1e1e1e" : "#2a2a2a",
        border: isMergeSource
          ? "2px solid #ff9800"
          : selected
          ? "2px solid #4a9eff"
          : "1px solid #444",
        borderRadius: 2,
        overflow: "hidden",
        cursor: "pointer",
        transition: "all 0.2s ease",
        "&:hover": {
          borderColor: isMergeSource ? "#ffb74d" : "#666",
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

      {/* Action buttons on hover */}
      {(hovered || selected) && !isRoot && !isLoading && !isEditing && (
        <Box
          sx={{
            position: "absolute",
            top: 4,
            right: 4,
            display: "flex",
            gap: 0.5,
            zIndex: 10,
          }}
        >
          {!isMergedNode && (
            <Tooltip title="Edit message">
              <IconButton
                size="small"
                onClick={handleStartEdit}
                sx={{
                  backgroundColor: "#444",
                  color: "#fff",
                  width: 24,
                  height: 24,
                  "&:hover": { backgroundColor: "#555" },
                }}
              >
                <EditIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Tooltip>
          )}
          {isMergedNode && (
            <Tooltip title="Regenerate merge (respects edge context settings)">
              <IconButton
                size="small"
                onClick={handleRegenerateMerge}
                sx={{
                  backgroundColor: "#ff9800",
                  color: "#fff",
                  width: 24,
                  height: 24,
                  "&:hover": { backgroundColor: "#ffb74d" },
                }}
              >
                <RefreshIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Merge branches here">
            <IconButton
              size="small"
              onClick={handleMerge}
              sx={{
                backgroundColor: "#444",
                color: "#fff",
                width: 24,
                height: 24,
                "&:hover": { backgroundColor: "#555" },
              }}
            >
              <MergeIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete node">
            <IconButton
              size="small"
              onClick={handleDelete}
              sx={{
                backgroundColor: "#662222",
                color: "#fff",
                width: 24,
                height: 24,
                "&:hover": { backgroundColor: "#882222" },
              }}
            >
              <DeleteIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
        </Box>
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
          {isEditing ? (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <TextField
                value={editUserMessage}
                onChange={(e) => setEditUserMessage(e.target.value)}
                multiline
                minRows={2}
                maxRows={6}
                size="small"
                autoFocus
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.metaKey) {
                    handleSaveEdit(e);
                  } else if (e.key === "Escape") {
                    handleCancelEdit(e);
                  }
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    backgroundColor: "#1a1a1a",
                    color: "#fff",
                    fontSize: "0.875rem",
                    "& fieldset": { borderColor: "#444" },
                    "&:hover fieldset": { borderColor: "#666" },
                    "&.Mui-focused fieldset": { borderColor: "#4a9eff" },
                  },
                }}
              />
              <Box
                sx={{ display: "flex", gap: 0.5, justifyContent: "flex-end" }}
              >
                <IconButton
                  size="small"
                  onClick={handleCancelEdit}
                  sx={{
                    backgroundColor: "#444",
                    color: "#fff",
                    width: 24,
                    height: 24,
                    "&:hover": { backgroundColor: "#555" },
                  }}
                >
                  <CloseIcon sx={{ fontSize: 14 }} />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={handleSaveEdit}
                  sx={{
                    backgroundColor: "#4a9eff",
                    color: "#fff",
                    width: 24,
                    height: 24,
                    "&:hover": { backgroundColor: "#3a8eef" },
                  }}
                >
                  <CheckIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Box>
            </Box>
          ) : (
            <CollapsibleText
              text={data.userMessage}
              label="You"
              color="#8ab4f8"
            />
          )}
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
            <CollapsibleText
              text={data.assistantMessage}
              label="Assistant"
              color="#81c784"
            />
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
