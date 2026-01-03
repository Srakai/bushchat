"use client";
import React from "react";
import {
  Paper,
  TextField,
  IconButton,
  Chip,
  Box,
  Tooltip,
} from "@mui/material";
import KeyboardReturnIcon from "@mui/icons-material/KeyboardReturn";
import CloseIcon from "@mui/icons-material/Close";
import MergeIcon from "@mui/icons-material/CallMerge";
import LanguageIcon from "@mui/icons-material/Language";
import PostAddIcon from "@mui/icons-material/PostAdd";
import { components, colors } from "../styles/theme";
import ModelSelector from "./ModelSelector";
import { getVisionSupport, VISION_SUPPORT } from "../utils/visionModels";

const MAX_ROWS = 12;

const InputPanel = ({
  inputMessage,
  onInputChange,
  onSubmit,
  selectedModel,
  onModelChange,
  modelsList,
  modelsData,
  isRootSelected,
  isPendingMerge,
  onCancelPendingMerge,
  webSearchEnabled,
  onWebSearchToggle,
  onOpenArtifacts,
}) => {
  // Get vision support info for tooltip
  const visionSupport = getVisionSupport(selectedModel, modelsData);
  const getVisionTooltip = () => {
    switch (visionSupport) {
      case VISION_SUPPORT.SUPPORTED:
        return "✓ Supports images";
      case VISION_SUPPORT.NOT_SUPPORTED:
        return "✗ Does not support images";
      case VISION_SUPPORT.UNKNOWN:
        return "? Vision support unknown";
      default:
        return "";
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputMessage.trim()) {
      onSubmit(inputMessage.trim());
    }
  };

  const handleKeyDown = (e) => {
    // Enter without Shift submits the form
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (inputMessage.trim()) {
        onSubmit(inputMessage.trim());
      }
    }
    // Escape cancels pending merge
    if (e.key === "Escape" && isPendingMerge) {
      e.preventDefault();
      e.stopPropagation();
      onCancelPendingMerge?.();
    }
    // Shift+Enter allows default behavior (new line)
  };

  const getPlaceholder = () => {
    if (isPendingMerge) {
      return "Enter your merge prompt...";
    }
    if (isRootSelected) {
      return "Start a new conversation...";
    }
    return "Continue or branch from selected node...";
  };

  return (
    <Paper
      component="form"
      onSubmit={handleSubmit}
      sx={{
        ...components.panel,
        display: "flex",
        flexDirection: "column",
        gap: 1,
        p: 1.5,
        minWidth: 960,
        mb: 2,
      }}
    >
      {isPendingMerge && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Chip
            icon={<MergeIcon sx={{ fontSize: 16 }} />}
            label="Merge mode - customize your merge prompt"
            size="small"
            onDelete={onCancelPendingMerge}
            deleteIcon={<CloseIcon sx={{ fontSize: 14 }} />}
            sx={{
              backgroundColor: colors.accent.orange,
              color: colors.text.primary,
              "& .MuiChip-icon": { color: colors.text.primary },
              "& .MuiChip-deleteIcon": {
                color: colors.text.primary,
                "&:hover": { color: colors.text.secondary },
              },
            }}
          />
        </Box>
      )}
      <Box sx={{ display: "flex", alignItems: "flex-end", gap: 1 }}>
        <Tooltip title="Add artifact">
          <IconButton
            onClick={onOpenArtifacts}
            sx={components.iconButtonToggle.base}
          >
            <PostAddIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <TextField
          id="message-input"
          className="ph-no-capture"
          placeholder={getPlaceholder()}
          variant="outlined"
          size="small"
          multiline
          minRows={1}
          maxRows={MAX_ROWS}
          value={inputMessage}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          fullWidth
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          sx={components.textField}
        />
        <Tooltip title={getVisionTooltip()} arrow placement="top">
          <Box>
            <ModelSelector
              selectedModel={selectedModel}
              onModelChange={onModelChange}
              modelsList={modelsList}
            />
          </Box>
        </Tooltip>
        <Tooltip
          title={webSearchEnabled ? "Web search enabled" : "Enable web search"}
        >
          <IconButton
            onClick={onWebSearchToggle}
            sx={
              webSearchEnabled
                ? components.iconButtonToggle.active
                : components.iconButtonToggle.base
            }
          >
            <LanguageIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <IconButton
          type="submit"
          disabled={!inputMessage.trim()}
          sx={components.buttonPrimary}
        >
          <KeyboardReturnIcon fontSize="small" />
        </IconButton>
      </Box>
    </Paper>
  );
};

export default InputPanel;
