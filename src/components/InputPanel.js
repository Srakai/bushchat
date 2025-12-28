"use client";
import React from "react";
import {
  Paper,
  TextField,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  Chip,
  Box,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import CloseIcon from "@mui/icons-material/Close";
import MergeIcon from "@mui/icons-material/CallMerge";
import { components, colors } from "../styles/theme";

const MAX_ROWS = 12;

const InputPanel = ({
  inputMessage,
  onInputChange,
  onSubmit,
  selectedModel,
  onModelChange,
  modelsList,
  isRootSelected,
  isPendingMerge,
  onCancelPendingMerge,
}) => {
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
        minWidth: 600,
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
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <Select
            value={selectedModel}
            onChange={(e) => onModelChange(e.target.value)}
            sx={components.select}
          >
            {modelsList.map((model) => (
              <MenuItem key={model} value={model}>
                {model}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <IconButton
          type="submit"
          disabled={!inputMessage.trim()}
          sx={components.buttonPrimary}
        >
          <SendIcon />
        </IconButton>
      </Box>
    </Paper>
  );
};

export default InputPanel;
