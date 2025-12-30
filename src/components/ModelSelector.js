"use client";
import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Box,
  Paper,
  TextField,
  Typography,
  InputAdornment,
  ClickAwayListener,
  Popper,
  Fade,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import HistoryIcon from "@mui/icons-material/History";
import { colors } from "../styles/theme";
import { loadRecentModels, saveRecentModel } from "../utils/storage";

const ModelSelector = ({ selectedModel, onModelChange, modelsList }) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [recentModels, setRecentModels] = useState([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const anchorRef = useRef(null);
  const searchInputRef = useRef(null);
  const listRef = useRef(null);

  // Load recent models on mount
  useEffect(() => {
    setRecentModels(loadRecentModels());
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (open && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [open]);

  // Get recent model IDs that exist in modelsList
  const recentModelIds = useMemo(() => {
    return recentModels
      .map((m) => m.id)
      .filter((id) => modelsList.includes(id));
  }, [recentModels, modelsList]);

  // Filter models based on search query
  const filteredModels = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return modelsList;
    return modelsList.filter((model) => model.toLowerCase().includes(query));
  }, [modelsList, searchQuery]);

  // Split into recent and other models
  const { recentFiltered, otherFiltered } = useMemo(() => {
    const recentSet = new Set(recentModelIds);
    const recent = filteredModels.filter((m) => recentSet.has(m));
    const other = filteredModels.filter((m) => !recentSet.has(m));
    // Sort recent by their order in recentModelIds (most recent first)
    recent.sort(
      (a, b) => recentModelIds.indexOf(a) - recentModelIds.indexOf(b)
    );
    return { recentFiltered: recent, otherFiltered: other };
  }, [filteredModels, recentModelIds]);

  // Combined list for keyboard navigation
  const allFilteredModels = useMemo(() => {
    return [...recentFiltered, ...otherFiltered];
  }, [recentFiltered, otherFiltered]);

  // Reset highlight when search changes
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [searchQuery]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll("[data-model-item]");
      if (items[highlightedIndex]) {
        items[highlightedIndex].scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex]);

  const handleSelect = (model) => {
    onModelChange(model);
    saveRecentModel(model);
    setRecentModels(loadRecentModels());
    setOpen(false);
    setSearchQuery("");
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e) => {
    if (!open) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < allFilteredModels.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0 && allFilteredModels[highlightedIndex]) {
          handleSelect(allFilteredModels[highlightedIndex]);
        } else if (allFilteredModels.length === 1) {
          handleSelect(allFilteredModels[0]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        setSearchQuery("");
        setHighlightedIndex(-1);
        break;
    }
  };

  const handleClose = () => {
    setOpen(false);
    setSearchQuery("");
    setHighlightedIndex(-1);
  };

  const renderModelItem = (model, index, isRecent = false) => {
    const isSelected = model === selectedModel;
    const isHighlighted = index === highlightedIndex;

    return (
      <Box
        key={model}
        data-model-item
        onClick={() => handleSelect(model)}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          px: 1.5,
          py: 0.75,
          cursor: "pointer",
          borderRadius: 1,
          backgroundColor: isHighlighted
            ? colors.bg.hover
            : isSelected
            ? colors.bg.tertiary
            : "transparent",
          "&:hover": {
            backgroundColor: colors.bg.hover,
          },
          transition: "background-color 0.1s ease",
        }}
      >
        {isRecent && (
          <HistoryIcon
            sx={{
              fontSize: 14,
              color: colors.text.muted,
              flexShrink: 0,
            }}
          />
        )}
        <Typography
          variant="body2"
          sx={{
            color: isSelected ? colors.accent.blue : colors.text.primary,
            fontWeight: isSelected ? 500 : 400,
            fontSize: "0.875rem",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {model}
        </Typography>
      </Box>
    );
  };

  // Calculate index offset for other models (after recent)
  const getGlobalIndex = (localIndex, isRecent) => {
    return isRecent ? localIndex : recentFiltered.length + localIndex;
  };

  return (
    <ClickAwayListener onClickAway={handleClose}>
      <Box sx={{ position: "relative" }}>
        {/* Trigger Button */}
        <Box
          ref={anchorRef}
          onClick={() => setOpen(!open)}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
            px: 1.5,
            py: 1,
            minWidth: 180,
            maxWidth: 220,
            backgroundColor: "transparent",
            border: `1px solid ${colors.border.secondary}`,
            borderRadius: 1,
            cursor: "pointer",
            transition: "all 0.15s ease",
            "&:hover": {
              borderColor: colors.border.primary,
            },
            "&:focus": {
              outline: "none",
              borderColor: colors.accent.blue,
            },
          }}
        >
          <Typography
            variant="body2"
            sx={{
              color: colors.text.primary,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              fontSize: "0.875rem",
            }}
          >
            {selectedModel}
          </Typography>
          <KeyboardArrowDownIcon
            sx={{
              fontSize: 20,
              color: colors.text.muted,
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.2s ease",
              flexShrink: 0,
            }}
          />
        </Box>

        {/* Dropdown */}
        <Popper
          open={open}
          anchorEl={anchorRef.current}
          placement="top-start"
          transition
          style={{ zIndex: 1300 }}
          modifiers={[
            {
              name: "offset",
              options: {
                offset: [0, 4],
              },
            },
          ]}
        >
          {({ TransitionProps }) => (
            <Fade {...TransitionProps} timeout={150}>
              <Paper
                sx={{
                  backgroundColor: colors.bg.secondary,
                  border: `1px solid ${colors.border.primary}`,
                  borderRadius: 1.5,
                  boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
                  overflow: "hidden",
                  minWidth: anchorRef.current?.offsetWidth || 200,
                  maxWidth: 320,
                }}
              >
                {/* Search Input */}
                <Box
                  sx={{
                    p: 1.5,
                    borderBottom: `1px solid ${colors.border.secondary}`,
                  }}
                >
                  <TextField
                    inputRef={searchInputRef}
                    placeholder="Search models..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    size="small"
                    fullWidth
                    autoComplete="off"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon
                            sx={{ fontSize: 18, color: colors.text.muted }}
                          />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        color: colors.text.primary,
                        fontSize: "0.875rem",
                        "& fieldset": {
                          borderColor: colors.border.secondary,
                        },
                        "&:hover fieldset": {
                          borderColor: colors.border.primary,
                        },
                        "&.Mui-focused fieldset": {
                          borderColor: colors.accent.blue,
                          borderWidth: 1,
                        },
                      },
                      "& .MuiInputBase-input::placeholder": {
                        color: colors.text.muted,
                        opacity: 1,
                      },
                    }}
                  />
                </Box>

                {/* Models List */}
                <Box
                  ref={listRef}
                  sx={{
                    maxHeight: 300,
                    overflowY: "auto",
                    py: 0.5,
                    "&::-webkit-scrollbar": {
                      width: 6,
                    },
                    "&::-webkit-scrollbar-track": {
                      backgroundColor: "transparent",
                    },
                    "&::-webkit-scrollbar-thumb": {
                      backgroundColor: colors.border.secondary,
                      borderRadius: 3,
                      "&:hover": {
                        backgroundColor: colors.border.primary,
                      },
                    },
                  }}
                >
                  {/* Recent Models Section */}
                  {recentFiltered.length > 0 && (
                    <>
                      <Typography
                        variant="caption"
                        sx={{
                          display: "block",
                          px: 1.5,
                          py: 0.5,
                          color: colors.text.muted,
                          fontSize: "0.7rem",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                        }}
                      >
                        Recent
                      </Typography>
                      {recentFiltered.map((model, idx) =>
                        renderModelItem(model, getGlobalIndex(idx, true), true)
                      )}
                      {/* Dashed separator */}
                      {otherFiltered.length > 0 && (
                        <Box
                          sx={{
                            mx: 1.5,
                            my: 1,
                            borderBottom: `1px dashed ${colors.border.secondary}`,
                          }}
                        />
                      )}
                    </>
                  )}

                  {/* All/Other Models Section */}
                  {otherFiltered.length > 0 && (
                    <>
                      {recentFiltered.length > 0 && (
                        <Typography
                          variant="caption"
                          sx={{
                            display: "block",
                            px: 1.5,
                            py: 0.5,
                            color: colors.text.muted,
                            fontSize: "0.7rem",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                          }}
                        >
                          All Models
                        </Typography>
                      )}
                      {otherFiltered.map((model, idx) =>
                        renderModelItem(
                          model,
                          getGlobalIndex(idx, false),
                          false
                        )
                      )}
                    </>
                  )}

                  {/* No results */}
                  {allFilteredModels.length === 0 && (
                    <Box sx={{ px: 1.5, py: 2, textAlign: "center" }}>
                      <Typography
                        variant="body2"
                        sx={{ color: colors.text.muted, fontSize: "0.875rem" }}
                      >
                        No models found
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Paper>
            </Fade>
          )}
        </Popper>
      </Box>
    </ClickAwayListener>
  );
};

export default ModelSelector;
