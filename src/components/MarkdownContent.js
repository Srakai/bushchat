"use client";
import React from "react";
import dynamic from "next/dynamic";
import { Box } from "@mui/material";
import { colors } from "../styles/theme";

const Markdown = dynamic(() => import("markdown-to-jsx"), {
  ssr: false,
  loading: () => null,
});

const MarkdownContent = ({ children, className, sx = {} }) => {
  return (
    <Box
      className={className}
      sx={{
        color: colors.text.primary,
        wordBreak: "break-word",
        fontSize: "0.875rem",
        lineHeight: 1.6,
        "& p": {
          my: 1,
          "&:first-of-type": { mt: 0 },
          "&:last-of-type": { mb: 0 },
        },
        "& h1, & h2, & h3, & h4, & h5, & h6": {
          fontWeight: 600,
          mt: 2,
          mb: 1,
          "&:first-of-type": { mt: 0 },
        },
        "& h1": { fontSize: "1.4em" },
        "& h2": { fontSize: "1.25em" },
        "& h3": { fontSize: "1.1em" },
        "& h4": { fontSize: "1em" },
        "& a": {
          color: colors.accent.blue,
          textDecoration: "none",
          "&:hover": { textDecoration: "underline" },
        },
        "& ul, & ol": {
          pl: 3,
          my: 1,
        },
        "& li": {
          my: 0.5,
        },
        "& pre": {
          backgroundColor: colors.bg.tertiary,
          p: 1.5,
          borderRadius: 1,
          overflowX: "auto",
          my: 1,
          "& code": {
            backgroundColor: "transparent",
            p: 0,
          },
        },
        "& code": {
          backgroundColor: colors.bg.tertiary,
          px: 0.5,
          py: 0.25,
          borderRadius: 0.5,
          fontSize: "0.85em",
          fontFamily: "monospace",
        },
        "& blockquote": {
          borderLeft: `3px solid ${colors.border.primary}`,
          ml: 0,
          pl: 2,
          color: colors.text.muted,
          my: 1,
        },
        "& table": {
          borderCollapse: "collapse",
          my: 1,
          width: "100%",
        },
        "& th, & td": {
          border: `1px solid ${colors.border.primary}`,
          p: 1,
          textAlign: "left",
        },
        "& th": {
          backgroundColor: colors.bg.tertiary,
        },
        "& hr": {
          border: "none",
          borderTop: `1px solid ${colors.border.primary}`,
          my: 2,
        },
        ...sx,
      }}
    >
      <Markdown>{children || ""}</Markdown>
    </Box>
  );
};

export default MarkdownContent;
