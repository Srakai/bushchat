/**
 * Toggle icon for pan/scroll mode
 */
import React from "react";
import { IconButton, Box } from "@mui/material";
import PanToolIcon from "@mui/icons-material/PanTool";
import SwapVertIcon from "@mui/icons-material/SwapVert";
import { colors } from "../styles/theme";

const PanScrollToggle = ({
  panOnScroll,
  onToggle,
  size = "medium",
  asIcon = false,
}) => {
  const iconSize = size === "small" ? 16 : 20;

  const icon = panOnScroll ? (
    <PanToolIcon sx={{ fontSize: iconSize, color: colors.text.muted }} />
  ) : (
    <SwapVertIcon sx={{ fontSize: iconSize, color: colors.text.muted }} />
  );

  // When used inside ControlButton, just return the icon
  if (asIcon) {
    return icon;
  }

  return (
    <IconButton
      onClick={onToggle}
      size={size}
      title={
        panOnScroll ? "(click to switch to zoom)" : "(click to switch to pan)"
      }
      sx={{
        color: colors.text.muted,
        "&:hover": {
          backgroundColor: "rgba(255, 255, 255, 0.1)",
          color: colors.text.primary,
        },
      }}
    >
      {icon}
    </IconButton>
  );
};

export default PanScrollToggle;
