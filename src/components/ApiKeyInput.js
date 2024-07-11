import React, { useState } from 'react';
import { TextField, Button, Box } from '@mui/material';

const ApiKeyInput = ({ onSave }) => {
  const [apiKey, setApiKey] = useState('');

  const handleSave = () => {
    localStorage.setItem('openaiApiKey', apiKey);
    onSave(apiKey);
  };

  return (
    <Box display="flex" flexDirection="column" alignItems="center" p={2}>
      <TextField
        label="Enter OpenAI API Key"
        variant="outlined"
        value={apiKey}
        type='password'
        onChange={(e) => setApiKey(e.target.value)}
        fullWidth
      />
      <Button variant="contained" color="primary" onClick={handleSave} sx={{ mt: 2 }}>
        Save API Key
      </Button>
    </Box>
  );
};

export default ApiKeyInput;
