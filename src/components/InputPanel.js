"use client";
import React from "react";
import {
  Paper,
  TextField,
  IconButton,
  Select,
  MenuItem,
  FormControl,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import { components } from "../styles/theme";

const InputPanel = ({
  inputMessage,
  onInputChange,
  onSubmit,
  selectedModel,
  onModelChange,
  modelsList,
  isRootSelected,
}) => {
  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputMessage.trim()) {
      onSubmit(inputMessage.trim());
    }
  };

  return (
    <Paper
      component="form"
      onSubmit={handleSubmit}
      sx={{
        ...components.panel,
        display: "flex",
        alignItems: "center",
        gap: 1,
        p: 1.5,
        minWidth: 600,
        mb: 2,
      }}
    >
      <TextField
        id="message-input"
        className="ph-no-capture"
        placeholder={
          isRootSelected
            ? "Start a new conversation..."
            : "Continue or branch from selected node..."
        }
        variant="outlined"
        size="small"
        value={inputMessage}
        onChange={(e) => onInputChange(e.target.value)}
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
    </Paper>
  );
};

export default InputPanel;
