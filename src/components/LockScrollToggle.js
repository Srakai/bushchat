/**
 * Toggle icon for lock scroll on node focus
 */
import React from "react";
import { IconButton } from "@mui/material";
import ExpandIcon from "@mui/icons-material/Expand";
import WebAssetOffIcon from "@mui/icons-material/WebAssetOff";
import { colors } from "../styles/theme";

const LockScrollToggle = ({
  locked,
  onToggle,
  size = "medium",
  asIcon = false,
}) => {
  const iconSize = size === "small" ? 16 : 20;

  const icon = locked ? (
    <ExpandIcon sx={{ fontSize: iconSize, color: colors.text.muted }} />
  ) : (
    <WebAssetOffIcon sx={{ fontSize: iconSize, color: colors.text.muted }} />
  );

  // When used inside ControlButton, just return the icon
  if (asIcon) {
    return icon;
  }

  return (
    <IconButton
      onClick={onToggle}
      size={size}
      title={locked ? "(click to unlock)" : "(click to lock on node hover)"}
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

export default LockScrollToggle;
