/**
 * Toggle button for lock scroll on node focus
 */
import React from "react";
import { IconButton } from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import { colors } from "../styles/theme";

const LockScrollToggle = ({ locked, onToggle, size = "medium" }) => {
  const iconSize = size === "small" ? 16 : 20;

  return (
    <IconButton
      onClick={onToggle}
      size={size}
      title={
        locked
          ? "Canvas scroll locked on node hover (click to unlock)"
          : "Canvas scroll unlocked (click to lock on node hover)"
      }
      sx={{
        color: colors.text.primary,
        "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.1)" },
      }}
    >
      {locked ? (
        <LockIcon sx={{ fontSize: iconSize }} />
      ) : (
        <LockOpenIcon sx={{ fontSize: iconSize }} />
      )}
    </IconButton>
  );
};

export default LockScrollToggle;
