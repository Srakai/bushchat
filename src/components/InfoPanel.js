"use client";
import React, { useState, useMemo } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import {
  Paper,
  Typography,
  Box,
  Button,
  IconButton,
  Collapse,
  List,
  Divider,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import AddIcon from "@mui/icons-material/Add";
import SettingsIcon from "@mui/icons-material/Settings";
import CloudIcon from "@mui/icons-material/Cloud";
import ShareIcon from "@mui/icons-material/Share";
import GitHubIcon from "@mui/icons-material/GitHub";
import DraggableChatItem from "./DraggableChatItem";
import { colors, components, typography } from "../styles/theme";

const InfoPanel = ({
  chatsList,
  activeChatId,
  onCreateNewChat,
  onSwitchChat,
  onDeleteChat,
  onOpenSettings,
  onOpenWaitlist,
  onShareChat,
  onMoveChat,
  onMergeChats,
  mergeMode,
  onCancelMerge,
  conversationHistoryLength,
}) => {
  const [chatsExpanded, setChatsExpanded] = useState(false);

  // Organize chats into groups and ungrouped items
  // Groups are displayed with their members indented
  const organizedChats = useMemo(() => {
    const groups = {};
    const ungrouped = [];
    
    chatsList.forEach((chat) => {
      if (chat.groupId) {
        if (!groups[chat.groupId]) {
          groups[chat.groupId] = [];
        }
        groups[chat.groupId].push(chat);
      } else {
        ungrouped.push(chat);
      }
    });

    // Sort each group by order
    Object.values(groups).forEach((group) => {
      group.sort((a, b) => (a.order || 0) - (b.order || 0));
    });

    // Sort ungrouped by order
    ungrouped.sort((a, b) => (a.order || 0) - (b.order || 0));

    // Build final list - groups first, then ungrouped
    const result = [];
    let flatIndex = 0;

    // Add group items
    Object.entries(groups).forEach(([groupId, members]) => {
      members.forEach((chat) => {
        result.push({
          ...chat,
          isGrouped: true,
          groupId,
          flatIndex: flatIndex++,
        });
      });
    });

    // Add ungrouped items
    ungrouped.forEach((chat) => {
      result.push({
        ...chat,
        isGrouped: false,
        flatIndex: flatIndex++,
      });
    });

    return result;
  }, [chatsList]);

  return (
    <Paper
      sx={{
        ...components.panel,
        border: mergeMode
          ? `1px solid ${colors.accent.orange}`
          : `1px solid ${colors.border.primary}`,
        minWidth: 220,
        maxWidth: 280,
        overflow: "hidden",
      }}
    >
      {/* Header with settings */}
      <Box
        sx={{
          p: 1.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Typography variant="subtitle2" sx={{ color: colors.accent.blue }}>
            bushchat
          </Typography>
          <IconButton
            size="small"
            component="a"
            href="https://github.com/Srakai/bushchat"
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              ...components.iconButtonMuted,
              p: 0.25,
            }}
            title="View on GitHub"
          >
            <GitHubIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <IconButton
            size="small"
            onClick={onShareChat}
            sx={components.iconButtonMuted}
            title="Share Chat"
          >
            <ShareIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={onOpenWaitlist}
            sx={components.iconButtonMuted}
            title="Sync to Cloud (Coming Soon)"
          >
            <CloudIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={onOpenSettings}
            sx={components.iconButtonMuted}
          >
            <SettingsIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      <Divider sx={components.divider} />

      {/* Collapsible Chats section */}
      <Box sx={{ p: 1 }}>
        <Box
          onClick={() => setChatsExpanded(!chatsExpanded)}
          sx={{
            ...components.hoverBox,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            py: 0.5,
            px: 0.5,
            mx: -0.5,
          }}
        >
          <Typography variant="caption" sx={typography.muted}>
            Chats
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onCreateNewChat();
              }}
              sx={{ color: colors.accent.blue, p: 0.25 }}
            >
              <AddIcon sx={{ fontSize: 16 }} />
            </IconButton>
            {chatsExpanded ? (
              <ExpandLessIcon sx={{ fontSize: 16, color: colors.text.muted }} />
            ) : (
              <ExpandMoreIcon sx={{ fontSize: 16, color: colors.text.muted }} />
            )}
          </Box>
        </Box>
        <Collapse in={chatsExpanded}>
          <DndProvider backend={HTML5Backend}>
            <List dense sx={{ py: 0.5, maxHeight: 200, overflow: "auto" }}>
              {organizedChats.map((chat) => (
                <DraggableChatItem
                  key={chat.id}
                  chat={chat}
                  index={chat.flatIndex}
                  isActive={chat.id === activeChatId}
                  isGrouped={chat.isGrouped}
                  canDelete={chatsList.length > 1}
                  onSwitchChat={onSwitchChat}
                  onDeleteChat={onDeleteChat}
                  onMoveChat={onMoveChat}
                  onMergeChats={onMergeChats}
                />
              ))}
            </List>
          </DndProvider>
        </Collapse>
      </Box>

      <Divider sx={components.divider} />

      {/* Info section - always visible */}
      <Box sx={{ p: 1.5 }}>
        {mergeMode ? (
          <>
            <Typography
              variant="caption"
              sx={{
                color: colors.accent.orange,
                display: "block",
                fontWeight: 500,
              }}
            >
              🔀 Merge Mode Active
            </Typography>
            <Typography
              variant="caption"
              sx={{ ...typography.muted, display: "block", mt: 0.5 }}
            >
              Click another node to merge, or click the same node to cancel
            </Typography>
            <Button
              size="small"
              onClick={onCancelMerge}
              sx={{
                mt: 1,
                color: colors.accent.orange,
                borderColor: colors.accent.orange,
                "&:hover": {
                  borderColor: colors.accent.orangeHover,
                  backgroundColor: "rgba(255,152,0,0.1)",
                },
              }}
              variant="outlined"
            >
              Cancel Merge
            </Button>
          </>
        ) : (
          <Typography
            variant="caption"
            sx={{ ...typography.muted, display: "block" }}
          >
            (+) branch • Edit/Delete on hover • Merge icon to combine
          </Typography>
        )}
        {conversationHistoryLength > 0 && (
          <Typography
            variant="caption"
            sx={{ ...typography.dim, display: "block", mt: 0.5 }}
          >
            Context: {conversationHistoryLength} messages
          </Typography>
        )}
      </Box>
    </Paper>
  );
};

export default InfoPanel;
