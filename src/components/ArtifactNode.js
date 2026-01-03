"use client";
import React, { memo, useState } from "react";
import { Handle, Position } from "reactflow";
import { Box, Typography, IconButton, TextField, Tooltip } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import ImageIcon from "@mui/icons-material/Image";
import TextFieldsIcon from "@mui/icons-material/TextFields";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import MergeIcon from "@mui/icons-material/CallMerge";
import CollapsibleText from "./CollapsibleText";
import { colors, components } from "../styles/theme";

const ArtifactNode = ({ id, data, selected }) => {
  const [hovered, setHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editContent, setEditContent] = useState("");

  const isImage = data.artifactType === "image";
  const isMergeSource = data.isMergeSource;
  const mergeSelectionCount = data.mergeSelectionCount || 0;

  const handleStartEdit = (e) => {
    e.stopPropagation();
    setEditName(data.name || "");
    setEditContent(data.content || "");
    setIsEditing(true);
  };

  const handleSaveEdit = (e) => {
    e.stopPropagation();
    data.onEditArtifact?.(id, { name: editName, content: editContent });
    setIsEditing(false);
  };

  const handleCancelEdit = (e) => {
    e.stopPropagation();
    setIsEditing(false);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    data.onDeleteArtifact?.(id);
  };

  const handleCopy = (e) => {
    e.stopPropagation();
    if (data.content && !isImage) {
      navigator.clipboard.writeText(data.content);
    }
  };

  const handleMerge = (e) => {
    e.stopPropagation();
    data.onMergeNode?.(id, false);
  };

  const handleMergeDoubleClick = (e) => {
    e.stopPropagation();
    data.onMergeNode?.(id, true);
  };

  const handleToggleCollapse = (collapsed) => {
    data.onToggleCollapse?.(id, "content", collapsed);
  };

  return (
    <Box
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      sx={{
        minWidth: 200,
        maxWidth: 400,
        backgroundColor: selected ? colors.bg.tertiary : colors.bg.secondary,
        border: isMergeSource
          ? `2px solid ${colors.accent.orange}`
          : selected
          ? `2px solid ${colors.accent.orange}`
          : `1px solid ${colors.border.primary}`,
        borderRadius: 2,
        overflow: "hidden",
        cursor: "pointer",
        transition: "all 0.2s ease",
        "&:hover": {
          borderColor: colors.accent.orangeHover,
        },
      }}
    >
      {/* Action buttons on hover */}
      {(hovered || selected) && !isEditing && (
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
          {!isImage && (
            <Tooltip title="Edit artifact">
              <IconButton
                size="small"
                onClick={handleStartEdit}
                sx={components.iconButton}
              >
                <EditIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Tooltip>
          )}
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
          <Tooltip title="Delete artifact">
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

      {/* Header */}
      <Box
        sx={{
          p: 1,
          backgroundColor: "rgba(255, 152, 0, 0.15)",
          borderBottom: `1px solid ${colors.border.secondary}`,
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        {isImage ? (
          <ImageIcon sx={{ fontSize: 16, color: colors.accent.orange }} />
        ) : (
          <TextFieldsIcon sx={{ fontSize: 16, color: colors.accent.orange }} />
        )}
        {isEditing ? (
          <TextField
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            size="small"
            autoFocus
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Escape") handleCancelEdit(e);
            }}
            sx={{
              ...components.textField,
              flex: 1,
              "& .MuiOutlinedInput-root": {
                ...components.textField["& .MuiOutlinedInput-root"],
                fontSize: "0.75rem",
              },
              "& .MuiOutlinedInput-input": {
                py: 0.5,
                px: 1,
              },
            }}
          />
        ) : (
          <Typography
            variant="caption"
            sx={{
              color: colors.accent.orange,
              fontWeight: 600,
              flex: 1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {data.name || "Artifact"}
          </Typography>
        )}
        {!isImage && data.content && !isEditing && (
          <Tooltip title="Copy content">
            <IconButton
              size="small"
              onClick={handleCopy}
              sx={{
                opacity: hovered ? 0.6 : 0,
                "&:hover": { opacity: 1 },
                color: colors.text.muted,
                width: 20,
                height: 20,
                p: 0,
              }}
            >
              <ContentCopyIcon sx={{ fontSize: 12 }} />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* Content */}
      <Box sx={{ p: 1.5, minHeight: 40 }}>
        {isEditing && !isImage ? (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <TextField
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              multiline
              minRows={2}
              maxRows={6}
              size="small"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === "Escape") handleCancelEdit(e);
              }}
              sx={{
                ...components.textField,
                "& .MuiOutlinedInput-root": {
                  ...components.textField["& .MuiOutlinedInput-root"],
                  fontSize: "0.75rem",
                },
              }}
            />
            <Box sx={{ display: "flex", gap: 0.5, justifyContent: "flex-end" }}>
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
        ) : isImage ? (
          <Box
            component="img"
            src={data.content}
            alt={data.name}
            sx={{
              maxWidth: "100%",
              maxHeight: 200,
              borderRadius: 1,
              display: "block",
            }}
          />
        ) : (
          <CollapsibleText
            text={data.content}
            collapsed={data.contentCollapsed}
            onToggleCollapse={handleToggleCollapse}
            lockScrollOnNodeFocus={data.lockScrollOnNodeFocus}
            useMarkdown={false}
          />
        )}
      </Box>

      {/* Output handle (bottom) - for connecting to merged nodes */}
      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          background: colors.accent.orange,
          width: 8,
          height: 8,
          border: "none",
        }}
      />
    </Box>
  );
};

export default memo(ArtifactNode);
