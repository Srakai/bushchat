/**
 * Toggle button for pan/scroll mode
 */
import React from "react";
import { IconButton } from "@mui/material";
import PanToolIcon from "@mui/icons-material/PanTool";
import SwapVertIcon from "@mui/icons-material/SwapVert";
import { colors } from "../styles/theme";

const PanScrollToggle = ({ panOnScroll, onToggle, size = "medium" }) => {
  const iconSize = size === "small" ? 16 : 20;

  return (
    <IconButton
      onClick={onToggle}
      size={size}
      title={
        panOnScroll
          ? "Scroll to pan (click to switch to zoom)"
          : "Scroll to zoom (click to switch to pan)"
      }
      sx={{
        color: colors.text.primary,
        "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.1)" },
      }}
    >
      {panOnScroll ? (
        <PanToolIcon sx={{ fontSize: iconSize }} />
      ) : (
        <SwapVertIcon sx={{ fontSize: iconSize }} />
      )}
    </IconButton>
  );
};

export default PanScrollToggle;
