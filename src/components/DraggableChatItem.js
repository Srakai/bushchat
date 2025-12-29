"use client";
import React, { useState, useRef, useEffect } from "react";
import { useDrag, useDrop } from "react-dnd";
import {
  ListItem,
  ListItemButton,
  ListItemText,
  IconButton,
  Box,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import MergeIcon from "@mui/icons-material/Merge";
import { colors, components } from "../styles/theme";

const ITEM_TYPE = "CHAT_ITEM";
const MERGE_HOVER_DELAY = 1500; // 1.5 seconds

/**
 * DraggableChatItem component for drag-and-drop reordering and merging of chats.
 * 
 * Each item is divided into zones:
 * - For ungrouped items: 30% (reorder) | 40% (merge) | 30% (reorder)
 * - For grouped items: 50% (reorder) | 50% (reorder) - no merge zone
 */
const DraggableChatItem = ({
  chat,
  index,
  isActive,
  isGrouped,
  canDelete,
  onSwitchChat,
  onDeleteChat,
  onMoveChat,
  onMergeChats,
}) => {
  const [mergeHoverStart, setMergeHoverStart] = useState(null);
  const [isMergeProposed, setIsMergeProposed] = useState(false);
  const [currentZone, setCurrentZone] = useState(null);
  const mergeTimerRef = useRef(null);
  const itemRef = useRef(null);

  // Drag source
  const [{ isDragging }, drag] = useDrag({
    type: ITEM_TYPE,
    item: () => ({
      id: chat.id,
      index,
      groupId: chat.groupId,
    }),
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  // Drop target
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: ITEM_TYPE,
    canDrop: (item) => item.id !== chat.id,
    hover: (item, monitor) => {
      if (!itemRef.current || item.id === chat.id) return;

      const clientOffset = monitor.getClientOffset();
      if (!clientOffset) return;

      const hoverBoundingRect = itemRef.current.getBoundingClientRect();
      const hoverWidth = hoverBoundingRect.right - hoverBoundingRect.left;
      const hoverClientX = clientOffset.x - hoverBoundingRect.left;
      const relativeX = hoverClientX / hoverWidth;

      // Determine which zone we're in
      let zone;
      if (isGrouped) {
        // 50% | 50% - no merge zone for grouped items
        zone = relativeX < 0.5 ? "reorder-left" : "reorder-right";
      } else {
        // 30% | 40% | 30%
        if (relativeX < 0.3) {
          zone = "reorder-left";
        } else if (relativeX < 0.7) {
          zone = "merge";
        } else {
          zone = "reorder-right";
        }
      }

      setCurrentZone(zone);

      // Handle merge zone hovering
      if (zone === "merge" && !isGrouped) {
        if (!mergeHoverStart) {
          setMergeHoverStart(Date.now());
        }
      } else {
        setMergeHoverStart(null);
        setIsMergeProposed(false);
        if (mergeTimerRef.current) {
          clearTimeout(mergeTimerRef.current);
          mergeTimerRef.current = null;
        }
      }
    },
    drop: (item, monitor) => {
      if (!itemRef.current || item.id === chat.id) return;

      // If merge is proposed and we're in merge zone, do merge
      if (isMergeProposed && currentZone === "merge" && !isGrouped) {
        onMergeChats(item.id, chat.id);
        setIsMergeProposed(false);
        setMergeHoverStart(null);
        return;
      }

      // Otherwise, handle reorder
      const clientOffset = monitor.getClientOffset();
      if (!clientOffset) return;

      const hoverBoundingRect = itemRef.current.getBoundingClientRect();
      const hoverWidth = hoverBoundingRect.right - hoverBoundingRect.left;
      const hoverClientX = clientOffset.x - hoverBoundingRect.left;
      const relativeX = hoverClientX / hoverWidth;

      // Determine drop position
      const insertBefore = relativeX < 0.5;
      const dragIndex = item.index;
      const hoverIndex = index;

      if (dragIndex === hoverIndex) return;

      onMoveChat(item.id, chat.id, insertBefore);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  // Effect to handle merge timer
  useEffect(() => {
    if (mergeHoverStart && !isMergeProposed) {
      mergeTimerRef.current = setTimeout(() => {
        setIsMergeProposed(true);
      }, MERGE_HOVER_DELAY);
    }

    return () => {
      if (mergeTimerRef.current) {
        clearTimeout(mergeTimerRef.current);
        mergeTimerRef.current = null;
      }
    };
  }, [mergeHoverStart, isMergeProposed]);

  // Reset states when not hovering
  useEffect(() => {
    if (!isOver) {
      setMergeHoverStart(null);
      setIsMergeProposed(false);
      setCurrentZone(null);
      if (mergeTimerRef.current) {
        clearTimeout(mergeTimerRef.current);
        mergeTimerRef.current = null;
      }
    }
  }, [isOver]);

  // Combine drag and drop refs
  const combinedRef = (node) => {
    itemRef.current = node;
    drag(drop(node));
  };

  // Calculate merge progress for visual feedback
  const mergeProgress = mergeHoverStart
    ? Math.min((Date.now() - mergeHoverStart) / MERGE_HOVER_DELAY, 1)
    : 0;

  // Determine background based on state
  let backgroundColor = "transparent";
  if (isOver && canDrop) {
    if (isMergeProposed) {
      backgroundColor = "rgba(255, 152, 0, 0.3)"; // Orange for merge
    } else if (currentZone === "merge") {
      backgroundColor = `rgba(255, 152, 0, ${0.1 + mergeProgress * 0.2})`; // Fading in orange
    } else {
      backgroundColor = "rgba(74, 158, 255, 0.2)"; // Blue for reorder
    }
  }

  return (
    <ListItem
      ref={combinedRef}
      disablePadding
      sx={{
        opacity: isDragging ? 0.5 : 1,
        pl: isGrouped ? 2 : 0, // Indentation for grouped items
        position: "relative",
      }}
      secondaryAction={
        canDelete && (
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
      {/* Visual indicator for merge proposal */}
      {isMergeProposed && isOver && (
        <Box
          sx={{
            position: "absolute",
            left: 4,
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 1,
          }}
        >
          <MergeIcon sx={{ fontSize: 16, color: colors.accent.orange }} />
        </Box>
      )}

      {/* Zone indicators when dragging over */}
      {isOver && canDrop && !isGrouped && (
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            pointerEvents: "none",
            display: "flex",
          }}
        >
          <Box
            sx={{
              width: "30%",
              borderRight: currentZone === "reorder-left" ? `2px solid ${colors.accent.blue}` : "none",
            }}
          />
          <Box
            sx={{
              width: "40%",
              borderLeft: currentZone === "merge" ? `1px dashed ${colors.accent.orange}` : "none",
              borderRight: currentZone === "merge" ? `1px dashed ${colors.accent.orange}` : "none",
            }}
          />
          <Box
            sx={{
              width: "30%",
              borderLeft: currentZone === "reorder-right" ? `2px solid ${colors.accent.blue}` : "none",
            }}
          />
        </Box>
      )}

      <ListItemButton
        selected={isActive}
        onClick={() => onSwitchChat(chat.id)}
        sx={{
          ...components.listItemButton,
          backgroundColor,
          transition: "background-color 0.2s ease",
          pl: isMergeProposed && isOver ? 3 : 1,
        }}
      >
        <ListItemText
          primary={chat.name}
          className="ph-no-capture"
          primaryTypographyProps={{
            variant: "caption",
            sx: {
              color: isActive ? colors.text.primary : colors.text.secondary,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            },
          }}
        />
      </ListItemButton>
    </ListItem>
  );
};

export default DraggableChatItem;
