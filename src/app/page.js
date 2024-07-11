"use client";
import React, { useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import ApiKeyInput from '../components/ApiKeyInput';
import ChatInterface from '../components/ChatInterface';
import ConversationFlow from '../components/ConversationFlow';
import DraggableNode from '../components/DraggableNode';
import { Box, Container } from '@mui/material';

const models = ['text-davinci-003', 'text-curie-001', 'text-babbage-001', 'text-ada-001'];

const Home = () => {
  const [apiKey, setApiKey] = useState(localStorage.getItem('openaiApiKey') || '');

  const handleSaveApiKey = (key) => {
    setApiKey(key);
  };

  const handleSendMessage = async (message, model) => {
    const apiKey = localStorage.getItem('openaiApiKey');
    if (!apiKey) {
      alert('Please enter your OpenAI API key.');
      return;
    }

    const newNode = {
      id: String(new Date().getTime()),
      position: { x: 100, y: 100 },
      data: { label: 'New Node', text: message },
    };
    setNodes((nds) => nds.concat(newNode));

    try {
      const response = await axios.post(
        `https://api.openai.com/v1/engines/${model}/completions`,
        {
          prompt: message,
          max_tokens: 50,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        }
      );

      const responseText = response.data.choices[0].text;
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === newNode.id) {
            return {
              ...node,
              data: { ...node.data, text: responseText },
            };
          }
          return node;
        })
      );
    } catch (error) {
      console.error(error);
      alert('Failed to fetch data from OpenAI API.');
    }
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <Container>
        {!apiKey && <ApiKeyInput onSave={handleSaveApiKey} />}
        {apiKey && (
          <Box display="flex" flexDirection="row">
            <Box sx={{ width: '200px', p: 2, borderRight: 1, borderColor: 'grey.300' }}>
              <DraggableNode id="node-1" data={{ label: 'Node 1' }} />
              <DraggableNode id="node-2" data={{ label: 'Node 2' }} />
            </Box>
            <Box sx={{ flexGrow: 1, p: 2 }}>
              <ChatInterface onSendMessage={handleSendMessage} models={models} />
              <ConversationFlow />
            </Box>
          </Box>
        )}
      </Container>
    </DndProvider>
  );
};

export default Home;
