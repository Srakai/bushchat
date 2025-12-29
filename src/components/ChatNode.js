"use client";
import React, { memo, useState } from "react";
import { Handle, Position } from "reactflow";
import {
  Box,
  Typography,
  IconButton,
  CircularProgress,
  TextField,
  Tooltip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import MergeIcon from "@mui/icons-material/CallMerge";
import RefreshIcon from "@mui/icons-material/Refresh";
import { colors, components } from "../styles/theme";

const COLLAPSE_LINE_THRESHOLD = 16;
const MAX_COLLAPSED_HEIGHT = 280; // Approximate height for 16 lines

const countLines = (text) => {
  if (!text) return 0;
  return text.split("\n").length;
};

const CollapsibleText = ({ text, collapsed, onToggleCollapse }) => {
  const lineCount = countLines(text);
  const shouldShowCollapse = lineCount > COLLAPSE_LINE_THRESHOLD;
  // Use prop if provided, otherwise default based on line count
  const isCollapsed =
    collapsed !== undefined ? collapsed : lineCount > COLLAPSE_LINE_THRESHOLD;

  return (
    <Box sx={{ position: "relative" }}>
      <Box
        sx={{
          ...(isCollapsed && shouldShowCollapse
            ? {
                maxHeight: MAX_COLLAPSED_HEIGHT,
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
        <Typography
          variant="body2"
          className="ph-no-capture"
          sx={{
            color: colors.text.primary,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {text}
        </Typography>
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

  const handleToggleUserCollapse = (collapsed) => {
    data.onToggleCollapse?.(id, "user", collapsed);
  };

  const handleToggleAssistantCollapse = (collapsed) => {
    data.onToggleCollapse?.(id, "assistant", collapsed);
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
        backgroundColor: selected ? colors.bg.tertiary : colors.bg.secondary,
        border: isMergeSource
          ? `2px solid ${colors.accent.orange}`
          : selected
          ? `2px solid ${colors.accent.blue}`
          : `1px solid ${colors.border.primary}`,
        borderRadius: 2,
        overflow: "hidden",
        cursor: "pointer",
        transition: "all 0.2s ease",
        "&:hover": {
          borderColor: isMergeSource
            ? colors.accent.orangeHover
            : colors.text.muted,
        },
      }}
    >
      {/* Input handle (top) - not for root */}
      {!isRoot && (
        <Handle
          type="target"
          position={Position.Top}
          style={{
            background: colors.accent.blue,
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
          <Tooltip title={isMergedNode ? "Edit merge prompt" : "Edit message"}>
            <IconButton
              size="small"
              onClick={handleStartEdit}
              sx={components.iconButton}
            >
              <EditIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
          {isMergedNode && (
            <Tooltip title="Regenerate merge (respects edge context settings)">
              <IconButton
                size="small"
                onClick={handleRegenerateMerge}
                sx={{
                  backgroundColor: colors.accent.orange,
                  color: colors.text.primary,
                  width: 24,
                  height: 24,
                  "&:hover": { backgroundColor: colors.accent.orangeHover },
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
              sx={components.iconButton}
            >
              <MergeIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete node">
            <IconButton
              size="small"
              onClick={handleDelete}
              sx={components.iconButtonDanger}
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
            backgroundColor: colors.bg.userMessage,
            borderBottom: `1px solid ${colors.border.secondary}`,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              mb: 0.5,
            }}
          >
            <Typography
              variant="caption"
              sx={{
                color: colors.accent.userLabel,
                fontWeight: 500,
              }}
            >
              You
            </Typography>
            <Tooltip title="Copy">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  if (data.userMessage)
                    navigator.clipboard.writeText(data.userMessage);
                }}
                sx={{
                  opacity: 0.4,
                  "&:hover": { opacity: 1 },
                  color: colors.text.muted,
                  width: 18,
                  height: 18,
                  p: 0,
                }}
              >
                <ContentCopyIcon sx={{ fontSize: 11 }} />
              </IconButton>
            </Tooltip>
          </Box>
          {isEditing ? (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <TextField
                value={editUserMessage}
                onChange={(e) => setEditUserMessage(e.target.value)}
                className="ph-no-capture"
                multiline
                minRows={2}
                maxRows={6}
                size="small"
                autoFocus
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSaveEdit(e);
                  } else if (e.key === "Escape") {
                    handleCancelEdit(e);
                  }
                  // Shift+Enter allows default behavior (new line)
                }}
                sx={{
                  ...components.textField,
                  "& .MuiOutlinedInput-root": {
                    ...components.textField["& .MuiOutlinedInput-root"],
                    fontSize: "0.875rem",
                  },
                }}
              />
              <Box
                sx={{ display: "flex", gap: 0.5, justifyContent: "flex-end" }}
              >
                <IconButton
                  size="small"
                  onClick={handleCancelEdit}
                  sx={components.iconButton}
                >
                  <CloseIcon sx={{ fontSize: 14 }} />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={handleSaveEdit}
                  sx={{ ...components.buttonPrimary, width: 24, height: 24 }}
                >
                  <CheckIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Box>
            </Box>
          ) : (
            <CollapsibleText
              text={data.userMessage}
              collapsed={data.userMessageCollapsed}
              onToggleCollapse={handleToggleUserCollapse}
            />
          )}
        </Box>
      )}

      {/* Assistant response */}
      <Box sx={{ p: 1.5, minHeight: 40 }}>
        {isRoot ? (
          <Typography
            variant="body2"
            sx={{ color: colors.text.muted, fontStyle: "italic" }}
          >
            Start a conversation...
          </Typography>
        ) : isLoading ? (
          <Box display="flex" alignItems="center" gap={1}>
            <CircularProgress size={16} sx={{ color: colors.accent.blue }} />
            <Typography variant="body2" sx={{ color: colors.text.muted }}>
              Generating...
            </Typography>
          </Box>
        ) : data.assistantMessage ? (
          <>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                mb: 0.5,
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  color: colors.accent.green,
                  fontWeight: 500,
                }}
              >
                {data.model || "Assistant"}
              </Typography>
              <Tooltip title="Copy">
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (data.assistantMessage)
                      navigator.clipboard.writeText(data.assistantMessage);
                  }}
                  sx={{
                    opacity: 0.4,
                    "&:hover": { opacity: 1 },
                    color: colors.text.muted,
                    width: 18,
                    height: 18,
                    p: 0,
                  }}
                >
                  <ContentCopyIcon sx={{ fontSize: 11 }} />
                </IconButton>
              </Tooltip>
            </Box>
            <CollapsibleText
              text={data.assistantMessage}
              collapsed={data.assistantMessageCollapsed}
              onToggleCollapse={handleToggleAssistantCollapse}
            />
          </>
        ) : data.error ? (
          <Typography variant="body2" sx={{ color: colors.accent.error }}>
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
            sx={{ ...components.buttonPrimary, width: 24, height: 24 }}
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
          background: colors.accent.blue,
          width: 8,
          height: 8,
          border: "none",
        }}
      />
    </Box>
  );
};

export default memo(ChatNode);
