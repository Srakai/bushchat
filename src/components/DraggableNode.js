import React, { useState } from 'react';
import { useDrag } from 'react-dnd';
import { Paper, Box, Typography } from '@mui/material';

const DraggableNode = ({ id, data }) => {
  const [hovered, setHovered] = useState(false);
  const [, drag] = useDrag({
    type: 'node',
    item: { id, data },
  });

  return (
    <Paper
      ref={drag}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      sx={{ p: 2, position: 'relative', cursor: 'move' }}
    >
      <Typography>{data.label}</Typography>
      {hovered && (
        <Box
          sx={{
            position: 'absolute',
            bottom: -30,
            left: '50%',
            transform: 'translateX(-50%)',
            p: 1,
            bgcolor: 'background.paper',
            boxShadow: 1,
          }}
        >
          <Typography variant="body2">{data.text}</Typography>
        </Box>
      )}
    </Paper>
  );
};

export default DraggableNode;
