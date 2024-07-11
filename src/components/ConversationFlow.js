import React, { useState, useCallback } from 'react';
import ReactFlow, {
  addEdge,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  useReactFlow,
} from 'reactflow';
import 'reactflow/dist/style.css';
import axios from 'axios';
import { Box } from '@mui/material';

const initialNodes = [
  { id: '1', data: { label: 'Root Node', text: '' }, position: { x: 250, y: 5 } },
];

const initialEdges = [];

const ConversationFlow = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const reactFlowInstance = useReactFlow();

  const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  const onDrop = useCallback((event) => {
    const reactFlowBounds = event.currentTarget.getBoundingClientRect();
    const type = event.dataTransfer.getData('application/reactflow');
    const position = reactFlowInstance.project({
      x: event.clientX - reactFlowBounds.left,
      y: event.clientY - reactFlowBounds.top,
    });
    const newNode = {
      id: String(new Date().getTime()),
      type,
      position,
      data: { label: `${type} node`, text: '' },
    };
    setNodes((nds) => nds.concat(newNode));
  }, [reactFlowInstance]);

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

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
    <Box sx={{ height: '500px', p: 2 }} onDrop={onDrop} onDragOver={onDragOver}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
      >
        <MiniMap />
        <Controls />
        <Background />
      </ReactFlow>
    </Box>
  );
};

export default ConversationFlow;
