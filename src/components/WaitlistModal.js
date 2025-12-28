"use client";
import React, { useState, useEffect } from "react";
import {
  Modal,
  Paper,
  Typography,
  Box,
  TextField,
  Button,
} from "@mui/material";
import CloudIcon from "@mui/icons-material/Cloud";
import { colors, components, typography } from "../styles/theme";
import { getWaitlistEmail, saveWaitlistEmail } from "../utils/storage";

const WaitlistModal = ({ open, onClose }) => {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  // Check if user already signed up
  useEffect(() => {
    const savedEmail = getWaitlistEmail();
    if (savedEmail) {
      setEmail(savedEmail);
      setSubmitted(true);
    }
  }, []);

  const handleSubmit = () => {
    // In production, this would send to a backend/email service
    console.log("Waitlist signup:", email);
    saveWaitlistEmail(email);
    setSubmitted(true);
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Paper
        sx={{
          ...components.modal,
          minWidth: 360,
          maxWidth: 420,
        }}
      >
        <Box sx={{ textAlign: "center" }}>
          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 48,
              height: 48,
              borderRadius: "12px",
              backgroundColor: colors.bg.tertiary,
              border: `1px solid ${colors.border.secondary}`,
              mb: 2,
            }}
          >
            <CloudIcon sx={{ color: colors.text.muted, fontSize: 24 }} />
          </Box>
          <Typography
            variant="h6"
            sx={{
              background: `linear-gradient(135deg, ${colors.accent.blue} 0%, #82c4ff 100%)`,
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              mb: 1,
              fontWeight: 600,
            }}
          >
            Cloud Sync
          </Typography>
          <Typography
            variant="body2"
            sx={{ ...typography.muted, mb: 3, lineHeight: 1.6 }}
          >
            Sync your conversations across devices, share branches with
            collaborators, and never lose your chat history.
          </Typography>

          {submitted ? (
            <Box
              sx={{
                p: 2,
                borderRadius: 1.5,
                backgroundColor: "rgba(74, 158, 255, 0.08)",
                border: "1px solid rgba(74, 158, 255, 0.2)",
              }}
            >
              <Typography variant="body2" sx={typography.accent}>
                ✓ You&apos;re on the list!
              </Typography>
              <Typography
                variant="caption"
                sx={{ ...typography.dim, display: "block", mt: 0.5 }}
              >
                We&apos;ll notify you when cloud sync is ready.
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              <TextField
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                fullWidth
                size="small"
                autoComplete="email"
                type="email"
                sx={components.textField}
              />
              <Button
                onClick={handleSubmit}
                disabled={!email.trim() || !email.includes("@")}
                fullWidth
                sx={components.buttonSecondary}
              >
                Join Waitlist
              </Button>
            </Box>
          )}

          <Typography
            variant="caption"
            sx={{ ...typography.dim, display: "block", mt: 2 }}
          >
            Coming Soon
          </Typography>
        </Box>
      </Paper>
    </Modal>
  );
};

export default WaitlistModal;
