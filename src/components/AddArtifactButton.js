"use client";
import React from "react";
import { Paper, IconButton, Tooltip } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { colors } from "../styles/theme";

const AddArtifactButton = ({ onClick }) => {
  return (
    <Tooltip title="Create artifact" placement="top">
      <Paper
        sx={{
          backgroundColor: colors.bg.secondary,
          border: `1px solid ${colors.border.primary}`,
          borderRadius: 2,
          p: 0.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <IconButton
          onClick={onClick}
          sx={{
            color: colors.text.primary,
            "&:hover": {
              backgroundColor: "rgba(74, 158, 255, 0.1)",
            },
          }}
        >
          <AddIcon fontSize="small" />
        </IconButton>
      </Paper>
    </Tooltip>
  );
};

export default AddArtifactButton;
