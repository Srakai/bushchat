"use client";
import React, { useState } from "react";
import {
  Paper,
  Typography,
  Box,
  Button,
  IconButton,
  Collapse,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import SettingsIcon from "@mui/icons-material/Settings";
import CloudIcon from "@mui/icons-material/Cloud";
import { colors, components, typography } from "../styles/theme";

const InfoPanel = ({
  chatsList,
  activeChatId,
  onCreateNewChat,
  onSwitchChat,
  onDeleteChat,
  onOpenSettings,
  onOpenWaitlist,
  mergeMode,
  onCancelMerge,
  conversationHistoryLength,
}) => {
  const [chatsExpanded, setChatsExpanded] = useState(false);

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
        <Typography variant="subtitle2" sx={{ color: colors.accent.blue }}>
          bushchat
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
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
          <List dense sx={{ py: 0.5, maxHeight: 200, overflow: "auto" }}>
            {chatsList.map((chat) => (
              <ListItem
                key={chat.id}
                disablePadding
                secondaryAction={
                  chatsList.length > 1 && (
                    <IconButton
                      edge="end"
                      size="small"
                      onClick={(e) => onDeleteChat(chat.id, e)}
                      sx={{
                        color: colors.text.dim,
                        "&:hover": { color: colors.accent.delete },
                        p: 0.5,
                      }}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  )
                }
              >
                <ListItemButton
                  selected={chat.id === activeChatId}
                  onClick={() => onSwitchChat(chat.id)}
                  sx={components.listItemButton}
                >
                  <ListItemText
                    primary={chat.name}
                    className="ph-no-capture"
                    primaryTypographyProps={{
                      variant: "caption",
                      sx: {
                        color:
                          chat.id === activeChatId
                            ? colors.text.primary
                            : colors.text.secondary,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      },
                    }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
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
