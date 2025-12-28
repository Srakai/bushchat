"use client";
import React, { useState, useCallback } from "react";
import {
  Modal,
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  IconButton,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import SyncIcon from "@mui/icons-material/Sync";
import { colors, components, typography } from "../styles/theme";
import { defaultModels } from "../utils/constants";

const SettingsModal = ({
  open,
  onClose,
  settings,
  onSave,
  modelsList,
  setModelsList,
  setSelectedModel,
}) => {
  const [tempSettings, setTempSettings] = useState({ ...settings });
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  // Reset temp settings when modal opens
  React.useEffect(() => {
    if (open) {
      setTempSettings({ ...settings });
    }
  }, [open, settings]);

  // Fetch models from API
  const fetchModels = useCallback(async () => {
    setIsLoadingModels(true);
    try {
      const url = tempSettings.apiUrl || "https://api.openai.com/v1";

      const response = await fetch(`${url}/models`, {
        headers: tempSettings.apiKey
          ? { Authorization: `Bearer ${tempSettings.apiKey}` }
          : {},
      });

      if (!response.ok) {
        throw new Error("Failed to fetch models");
      }

      const data = await response.json();
      const fetchedModels =
        data.data
          ?.map((m) => m.id)
          ?.filter(
            (id) =>
              id &&
              !id.includes("embedding") &&
              !id.includes("whisper") &&
              !id.includes("tts") &&
              !id.includes("dall-e")
          )
          ?.sort() || [];

      if (fetchedModels.length > 0) {
        setModelsList(fetchedModels);
        // If current model not in list, select first one
        setSelectedModel((current) =>
          fetchedModels.includes(current) ? current : fetchedModels[0]
        );
      }
    } catch (error) {
      console.error("Failed to fetch models:", error);
      // Keep existing models list on error
    } finally {
      setIsLoadingModels(false);
    }
  }, [tempSettings, setModelsList, setSelectedModel]);

  const handleSave = () => {
    onSave(tempSettings);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Paper
        sx={{
          ...components.modal,
          minWidth: 400,
          maxWidth: 500,
        }}
      >
        <Typography variant="h6" sx={{ color: colors.text.primary, mb: 2 }}>
          Settings
        </Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField
            label="API Key"
            type="password"
            value={tempSettings.apiKey}
            onChange={(e) =>
              setTempSettings({ ...tempSettings, apiKey: e.target.value })
            }
            placeholder="sk-... (leave empty to use server .env)"
            fullWidth
            size="small"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            sx={components.textFieldWithLabel}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={tempSettings.saveApiKey}
                onChange={(e) =>
                  setTempSettings({
                    ...tempSettings,
                    saveApiKey: e.target.checked,
                  })
                }
                sx={components.checkbox}
              />
            }
            label={
              <Typography variant="body2" sx={typography.secondary}>
                🙈 Save API key in browser storage
              </Typography>
            }
          />
          <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
            <TextField
              label="OpenAI Compatible URL"
              value={tempSettings.apiUrl}
              onChange={(e) =>
                setTempSettings({ ...tempSettings, apiUrl: e.target.value })
              }
              placeholder="https://api.openai.com/v1 (leave empty for default)"
              fullWidth
              size="small"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              sx={components.textFieldWithLabel}
            />
            <IconButton
              onClick={fetchModels}
              disabled={isLoadingModels}
              sx={{
                mt: 0.5,
                color: colors.accent.blue,
                "&:hover": { backgroundColor: "rgba(74, 158, 255, 0.1)" },
                "&.Mui-disabled": { color: colors.text.dim },
                animation: isLoadingModels ? "spin 1s linear infinite" : "none",
                "@keyframes spin": {
                  "0%": { transform: "rotate(0deg)" },
                  "100%": { transform: "rotate(360deg)" },
                },
              }}
              title="Fetch models from API"
            >
              <SyncIcon />
            </IconButton>
          </Box>
          {modelsList.length > 0 && modelsList !== defaultModels && (
            <Typography variant="caption" sx={typography.accent}>
              ✓ Loaded {modelsList.length} models from provider
            </Typography>
          )}
          <Typography variant="caption" sx={typography.dim}>
            These settings override the server .env configuration. Leave empty
            to use server defaults.
          </Typography>
          <Box
            sx={{
              display: "flex",
              gap: 1,
              justifyContent: "flex-end",
              mt: 1,
            }}
          >
            <Button onClick={onClose} sx={typography.muted}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              variant="contained"
              sx={components.buttonPrimary}
            >
              Save
            </Button>
          </Box>
        </Box>
      </Paper>
    </Modal>
  );
};

export default SettingsModal;
