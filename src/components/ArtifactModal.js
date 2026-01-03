"use client";
import React, { useState, useCallback, useRef } from "react";
import {
  Modal,
  Box,
  Typography,
  TextField,
  IconButton,
  Button,
  Tabs,
  Tab,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";
import ImageIcon from "@mui/icons-material/Image";
import TextFieldsIcon from "@mui/icons-material/TextFields";
import { components, colors } from "../styles/theme";

const ArtifactModal = ({ open, onClose, onCreateArtifact }) => {
  const [activeTab, setActiveTab] = useState(0); // 0 = text, 1 = image
  const [newArtifactName, setNewArtifactName] = useState("");
  const [newArtifactContent, setNewArtifactContent] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);

  const handleCreateTextArtifact = useCallback(() => {
    if (!newArtifactName.trim() || !newArtifactContent.trim()) return;
    onCreateArtifact?.({
      name: newArtifactName.trim(),
      type: "text",
      content: newArtifactContent.trim(),
    });
    setNewArtifactName("");
    setNewArtifactContent("");
    onClose();
  }, [newArtifactName, newArtifactContent, onCreateArtifact, onClose]);

  const handleImageSelect = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setImagePreview(event.target.result);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleCreateImageArtifact = useCallback(() => {
    if (!newArtifactName.trim() || !imagePreview) return;
    onCreateArtifact?.({
      name: newArtifactName.trim(),
      type: "image",
      content: imagePreview,
    });
    setNewArtifactName("");
    setImagePreview(null);
    onClose();
  }, [newArtifactName, imagePreview, onCreateArtifact, onClose]);

  const handleClose = useCallback(() => {
    setActiveTab(0);
    setNewArtifactName("");
    setNewArtifactContent("");
    setImagePreview(null);
    onClose();
  }, [onClose]);

  return (
    <Modal open={open} onClose={handleClose}>
      <Box
        sx={{
          ...components.modal,
          width: 450,
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <Typography variant="h6" sx={{ color: colors.text.primary }}>
            New Artifact
          </Typography>
          <IconButton
            onClick={handleClose}
            size="small"
            sx={{ color: colors.text.muted }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          sx={{
            mb: 2,
            minHeight: 36,
            "& .MuiTab-root": {
              color: colors.text.muted,
              minHeight: 36,
              py: 0,
              textTransform: "none",
              "&.Mui-selected": { color: colors.accent.orange },
            },
            "& .MuiTabs-indicator": { backgroundColor: colors.accent.orange },
          }}
        >
          <Tab
            icon={<TextFieldsIcon fontSize="small" />}
            iconPosition="start"
            label="Text"
          />
          <Tab
            icon={<ImageIcon fontSize="small" />}
            iconPosition="start"
            label="Image"
          />
        </Tabs>

        {/* Content */}
        <Box sx={{ flex: 1, overflow: "auto" }}>
          {/* Create Text Tab */}
          {activeTab === 0 && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <TextField
                label="Name"
                value={newArtifactName}
                onChange={(e) => setNewArtifactName(e.target.value)}
                size="small"
                fullWidth
                sx={components.textFieldWithLabel}
              />
              <TextField
                label="Content"
                value={newArtifactContent}
                onChange={(e) => setNewArtifactContent(e.target.value)}
                size="small"
                fullWidth
                multiline
                rows={6}
                sx={components.textFieldWithLabel}
              />
              <Button
                onClick={handleCreateTextArtifact}
                disabled={!newArtifactName.trim() || !newArtifactContent.trim()}
                startIcon={<AddIcon />}
                sx={components.buttonSecondary}
              >
                Add to Canvas
              </Button>
            </Box>
          )}

          {/* Create Image Tab */}
          {activeTab === 1 && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <TextField
                label="Name"
                value={newArtifactName}
                onChange={(e) => setNewArtifactName(e.target.value)}
                size="small"
                fullWidth
                sx={components.textFieldWithLabel}
              />
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleImageSelect}
                style={{ display: "none" }}
              />
              {imagePreview ? (
                <Box sx={{ position: "relative" }}>
                  <Box
                    component="img"
                    src={imagePreview}
                    alt="Preview"
                    sx={{
                      maxWidth: "100%",
                      maxHeight: 200,
                      borderRadius: 1,
                      border: `1px solid ${colors.border.secondary}`,
                    }}
                  />
                  <IconButton
                    size="small"
                    onClick={() => setImagePreview(null)}
                    sx={{
                      position: "absolute",
                      top: 4,
                      right: 4,
                      backgroundColor: colors.bg.secondary,
                      "&:hover": { backgroundColor: colors.bg.hover },
                    }}
                  >
                    <CloseIcon
                      fontSize="small"
                      sx={{ color: colors.text.muted }}
                    />
                  </IconButton>
                </Box>
              ) : (
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  startIcon={<ImageIcon />}
                  sx={{
                    ...components.buttonSecondary,
                    py: 4,
                    border: `2px dashed ${colors.border.secondary}`,
                    backgroundColor: "transparent",
                  }}
                >
                  Select Image
                </Button>
              )}
              <Button
                onClick={handleCreateImageArtifact}
                disabled={!newArtifactName.trim() || !imagePreview}
                startIcon={<AddIcon />}
                sx={components.buttonSecondary}
              >
                Add to Canvas
              </Button>
            </Box>
          )}
        </Box>
      </Box>
    </Modal>
  );
};

export default ArtifactModal;
