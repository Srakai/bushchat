"use client";
import React, { memo, useState, useRef, useCallback, useEffect } from "react";
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
import MarkdownContent from "./MarkdownContent";
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
const MAX_COLLAPSED_HEIGHT = 500; // Approximate height for 16 lines

const countLines = (text) => {
  if (!text) return 0;
  return text.split("\n").length;
};

const CollapsibleText = ({
  text,
  collapsed,
  onToggleCollapse,
  lockScrollOnNodeFocus,
}) => {
  const scrollRef = useRef(null);
  const lineCount = countLines(text);
  const shouldShowCollapse = lineCount > COLLAPSE_LINE_THRESHOLD;
  // Use prop if provided, otherwise default based on line count
  const isCollapsed =
    collapsed !== undefined ? collapsed : lineCount > COLLAPSE_LINE_THRESHOLD;

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
  }, [lockScrollOnNodeFocus, isCollapsed]);

  return (
    <Box sx={{ position: "relative" }}>
      <Box
        ref={scrollRef}
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
        <MarkdownContent className="ph-no-capture">{text}</MarkdownContent>
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
    data.onMergeNode?.(id, false);
  };

  const handleMergeDoubleClick = (e) => {
    e.stopPropagation();
    data.onMergeNode?.(id, true);
  };

  const handleRegenerateMerge = (e) => {
    e.stopPropagation();
    data.onRegenerateMerge?.(id);
  };

  // Get merge selection count for tooltip
  const mergeSelectionCount = data.mergeSelectionCount || 0;

  return (
    <Box
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      sx={{
        minWidth: 350,
        maxWidth: 700,
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
      {(hovered || selected) && !isRoot && !isEditing && (
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
          <Tooltip
            title={
              isMergedNode ? "Edit merge prompt" : "Edit message (regenerate)"
            }
          >
            <IconButton
              size="small"
              onClick={handleStartEdit}
              sx={components.iconButton}
            >
              <EditIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
          {isMergedNode && !isLoading && (
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
          {!isLoading && (
            <Tooltip
              title={
                isMergeSource && mergeSelectionCount >= 2
                  ? `${mergeSelectionCount} nodes selected - Double-click to merge`
                  : isMergeSource
                  ? "Click to deselect, or select more nodes"
                  : mergeSelectionCount > 0
                  ? "Click to add to merge selection"
                  : "Click to start merge selection"
              }
            >
              <IconButton
                size="small"
                onClick={handleMerge}
                onDoubleClick={handleMergeDoubleClick}
                sx={{
                  ...components.iconButton,
                  ...(isMergeSource && {
                    backgroundColor: colors.accent.orange,
                    "&:hover": { backgroundColor: colors.accent.orangeHover },
                  }),
                }}
              >
                <MergeIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Tooltip>
          )}
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
              lockScrollOnNodeFocus={data.lockScrollOnNodeFocus}
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
              lockScrollOnNodeFocus={data.lockScrollOnNodeFocus}
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
