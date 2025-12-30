/**
 * Focus Mode Overlay component - displays node content in full-screen overlay
 */
import React from "react";
import { Box, Typography, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import MarkdownContent from "./MarkdownContent";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { colors } from "../styles/theme";

const FocusModeOverlay = ({
  focusModeNode,
  focusModeNavigation,
  focusModeScrollRef,
  scrollForceIndicator,
  navigateFocusMode,
  handleFocusModeScroll,
  closeFocusMode,
}) => {
  if (!focusModeNode || focusModeNode.data?.isRoot) {
    return null;
  }

  return (
    <Box
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 120,
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        zIndex: 1000,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        overflow: "auto",
        pt: 8,
        pb: 4,
      }}
      onClick={closeFocusMode}
    >
      {/* Wrapper for scroll container and indicators */}
      <Box
        sx={{
          position: "relative",
          width: "min(900px, 85vw)",
          maxHeight: "calc(100vh - 280px)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Scroll force indicator - top (for scrolling up) */}
        {scrollForceIndicator.force > 0 &&
          scrollForceIndicator.direction === "up" && (
            <Box
              sx={{
                position: "absolute",
                top: 0,
                left: "50%",
                transform: "translateX(-50%)",
                width: `${20 + scrollForceIndicator.force * 80}%`,
                height: 4,
                background: `linear-gradient(90deg, transparent, ${colors.accent.green}, transparent)`,
                opacity: 0.3 + scrollForceIndicator.force * 0.7,
                borderRadius: "0 0 4px 4px",
                zIndex: 30,
                transition: "width 0.1s ease-out, opacity 0.1s ease-out",
                pointerEvents: "none",
              }}
            />
          )}

        {/* Scroll force indicator - bottom (for scrolling down) */}
        {scrollForceIndicator.force > 0 &&
          scrollForceIndicator.direction === "down" && (
            <Box
              sx={{
                position: "absolute",
                bottom: 0,
                left: "50%",
                transform: "translateX(-50%)",
                width: `${20 + scrollForceIndicator.force * 80}%`,
                height: 4,
                background: `linear-gradient(90deg, transparent, ${colors.accent.green}, transparent)`,
                opacity: 0.3 + scrollForceIndicator.force * 0.7,
                borderRadius: "4px 4px 0 0",
                zIndex: 30,
                transition: "width 0.1s ease-out, opacity 0.1s ease-out",
                pointerEvents: "none",
              }}
            />
          )}

        <Box
          ref={focusModeScrollRef}
          onDoubleClick={closeFocusMode}
          onWheel={handleFocusModeScroll}
          sx={{
            width: "100%",
            maxHeight: "calc(100vh - 280px)",
            overflowY: "auto",
            backgroundColor: colors.bg.secondary,
            border: `1px solid ${colors.border.primary}`,
            borderRadius: 2,
            outline: "none",
            "&::-webkit-scrollbar": {
              width: 8,
            },
            "&::-webkit-scrollbar-track": {
              background: colors.bg.tertiary,
              borderRadius: 4,
            },
            "&::-webkit-scrollbar-thumb": {
              background: colors.border.primary,
              borderRadius: 4,
              "&:hover": {
                background: colors.text.dim,
              },
            },
          }}
        >
          {/* Navigation and close buttons */}
          <Box
            sx={{
              position: "sticky",
              top: 0,
              right: 0,
              display: "flex",
              justifyContent: "flex-end",
              gap: 0.5,
              p: 1,
              backgroundColor: colors.bg.secondary,
              borderBottom: `1px solid ${colors.border.secondary}`,
              zIndex: 10,
            }}
          >
            {/* Navigation hint */}
            <Typography
              variant="caption"
              sx={{
                color: colors.text.dim,
                mr: "auto",
                alignSelf: "center",
              }}
            >
              Scroll hard at edges to navigate • Double-click to close
            </Typography>

            {/* Up navigation */}
            <IconButton
              size="small"
              onClick={() => navigateFocusMode("up")}
              disabled={
                !focusModeNavigation.parent ||
                focusModeNavigation.parent.data?.isRoot
              }
              sx={{
                color: colors.text.muted,
                "&:hover": { color: colors.text.primary },
                "&.Mui-disabled": { color: colors.text.dim },
              }}
            >
              <KeyboardArrowUpIcon />
            </IconButton>

            {/* Down navigation */}
            <IconButton
              size="small"
              onClick={() => navigateFocusMode("down")}
              disabled={focusModeNavigation.children.length === 0}
              sx={{
                color: colors.text.muted,
                "&:hover": { color: colors.text.primary },
                "&.Mui-disabled": { color: colors.text.dim },
              }}
            >
              <KeyboardArrowDownIcon />
            </IconButton>

            {/* Close button */}
            <IconButton
              size="small"
              onClick={closeFocusMode}
              sx={{
                color: colors.text.muted,
                "&:hover": { color: colors.text.primary },
              }}
            >
              <CloseIcon />
            </IconButton>
          </Box>

          {/* User message */}
          <Box
            sx={{
              p: 3,
              backgroundColor: colors.bg.userMessage,
              borderBottom: `1px solid ${colors.border.secondary}`,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
              <Typography
                variant="caption"
                sx={{ color: colors.accent.userLabel, fontWeight: 500 }}
              >
                You
              </Typography>
              <IconButton
                size="small"
                onClick={() => {
                  if (focusModeNode.data?.userMessage)
                    navigator.clipboard.writeText(
                      focusModeNode.data.userMessage
                    );
                }}
                sx={{
                  opacity: 0.4,
                  "&:hover": { opacity: 1 },
                  color: colors.text.muted,
                  width: 20,
                  height: 20,
                }}
              >
                <ContentCopyIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Box>
            <MarkdownContent
              className="ph-no-capture"
              sx={{ fontSize: "1rem", lineHeight: 1.7 }}
            >
              {focusModeNode.data?.userMessage}
            </MarkdownContent>
          </Box>

          {/* Assistant response */}
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
              <Typography
                variant="caption"
                sx={{ color: colors.accent.green, fontWeight: 500 }}
              >
                {focusModeNode.data?.model || "Assistant"}
              </Typography>
              <IconButton
                size="small"
                onClick={() => {
                  if (focusModeNode.data?.assistantMessage)
                    navigator.clipboard.writeText(
                      focusModeNode.data.assistantMessage
                    );
                }}
                sx={{
                  opacity: 0.4,
                  "&:hover": { opacity: 1 },
                  color: colors.text.muted,
                  width: 20,
                  height: 20,
                }}
              >
                <ContentCopyIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Box>
            <MarkdownContent
              className="ph-no-capture"
              sx={{ fontSize: "1rem", lineHeight: 1.7 }}
            >
              {focusModeNode.data?.assistantMessage}
            </MarkdownContent>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default FocusModeOverlay;
