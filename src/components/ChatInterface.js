import React, { useState } from "react";
import {
  TextField,
  Button,
  Box,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  Typography,
  CircularProgress,
} from "@mui/material";

const ChatInterface = ({
  onSendMessage,
  models,
  messages = [],
  isLoading = false,
}) => {
  const [message, setMessage] = useState("");
  const [selectedModel, setSelectedModel] = useState(models[0]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      onSendMessage(message, selectedModel);
      setMessage("");
    }
  };

  return (
    <Box>
      {/* Messages display */}
      <Box sx={{ maxHeight: "300px", overflowY: "auto", mb: 2 }}>
        {messages.map((msg, index) => (
          <Paper
            key={index}
            sx={{
              p: 2,
              mb: 1,
              backgroundColor: msg.role === "user" ? "#e3f2fd" : "#f5f5f5",
              ml: msg.role === "user" ? 4 : 0,
              mr: msg.role === "assistant" ? 4 : 0,
            }}
          >
            <Typography variant="caption" color="textSecondary">
              {msg.role === "user" ? "You" : "Assistant"}
            </Typography>
            <Typography variant="body1" sx={{ whiteSpace: "pre-wrap" }}>
              {msg.content}
            </Typography>
          </Paper>
        ))}
        {isLoading && (
          <Box display="flex" justifyContent="center" p={2}>
            <CircularProgress size={24} />
          </Box>
        )}
      </Box>

      {/* Input form */}
      <Box
        component="form"
        onSubmit={handleSubmit}
        display="flex"
        alignItems="center"
        gap={2}
        p={2}
      >
        <TextField
          label="Type a message"
          variant="outlined"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          fullWidth
          disabled={isLoading}
        />
        <FormControl variant="outlined" sx={{ minWidth: 180 }}>
          <InputLabel>Model</InputLabel>
          <Select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            label="Model"
            disabled={isLoading}
          >
            {models.map((model) => (
              <MenuItem key={model} value={model}>
                {model}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button
          variant="contained"
          color="primary"
          type="submit"
          disabled={isLoading}
        >
          {isLoading ? "Sending..." : "Send"}
        </Button>
      </Box>
    </Box>
  );
};

export default ChatInterface;
