import React, { useState } from 'react';
import { TextField, Button, Box, Select, MenuItem, FormControl, InputLabel } from '@mui/material';

const ChatInterface = ({ onSendMessage, models }) => {
  const [message, setMessage] = useState('');
  const [selectedModel, setSelectedModel] = useState(models[0]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(message, selectedModel);
      setMessage('');
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} display="flex" alignItems="center" gap={2} p={2}>
      <TextField
        label="Type a message"
        variant="outlined"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        fullWidth
      />
      <FormControl variant="outlined" sx={{ minWidth: 150 }}>
        <InputLabel>Model</InputLabel>
        <Select
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          label="Model"
        >
          {models.map((model) => (
            <MenuItem key={model} value={model}>{model}</MenuItem>
          ))}
        </Select>
      </FormControl>
      <Button variant="contained" color="primary" type="submit">
        Send
      </Button>
    </Box>
  );
};

export default ChatInterface;
