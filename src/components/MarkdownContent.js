"use client";
import React from "react";
import { Box, Typography } from "@mui/material";
import Markdown from "markdown-to-jsx";
import Link from "@mui/material/Link";
import { colors } from "../styles/theme";

const markdownOptions = {
  overrides: {
    h1: {
      component: Typography,
      props: { gutterBottom: true, variant: "h5", sx: { fontWeight: 600 } },
    },
    h2: {
      component: Typography,
      props: { gutterBottom: true, variant: "h6", sx: { fontWeight: 600 } },
    },
    h3: {
      component: Typography,
      props: {
        gutterBottom: true,
        variant: "subtitle1",
        sx: { fontWeight: 600 },
      },
    },
    h4: {
      component: Typography,
      props: {
        gutterBottom: true,
        variant: "subtitle2",
        sx: { fontWeight: 600 },
      },
    },
    p: {
      component: Typography,
      props: { paragraph: true, variant: "body2" },
    },
    a: {
      component: Link,
      props: { sx: { color: colors.accent.blue } },
    },
    li: {
      component: ({ children, ...props }) => (
        <Box component="li" sx={{ mt: 0.5 }}>
          <Typography component="span" variant="body2" {...props}>
            {children}
          </Typography>
        </Box>
      ),
    },
    pre: {
      component: ({ children, ...props }) => (
        <Box
          component="pre"
          sx={{
            backgroundColor: colors.bg.tertiary,
            p: 1.5,
            borderRadius: 1,
            overflowX: "auto",
            my: 1,
            "& code": {
              backgroundColor: "transparent",
              p: 0,
            },
          }}
          {...props}
        >
          {children}
        </Box>
      ),
    },
    code: {
      component: ({ children, ...props }) => (
        <Box
          component="code"
          sx={{
            backgroundColor: colors.bg.tertiary,
            px: 0.5,
            py: 0.25,
            borderRadius: 0.5,
            fontSize: "0.85em",
            fontFamily: "monospace",
          }}
          {...props}
        >
          {children}
        </Box>
      ),
    },
    blockquote: {
      component: ({ children, ...props }) => (
        <Box
          component="blockquote"
          sx={{
            borderLeft: `3px solid ${colors.border.primary}`,
            ml: 0,
            pl: 2,
            color: colors.text.muted,
            my: 1,
          }}
          {...props}
        >
          {children}
        </Box>
      ),
    },
    table: {
      component: ({ children, ...props }) => (
        <Box
          component="table"
          sx={{
            borderCollapse: "collapse",
            my: 1,
            width: "100%",
            "& th, & td": {
              border: `1px solid ${colors.border.primary}`,
              p: 1,
              textAlign: "left",
            },
            "& th": {
              backgroundColor: colors.bg.tertiary,
            },
          }}
          {...props}
        >
          {children}
        </Box>
      ),
    },
    hr: {
      component: () => (
        <Box
          component="hr"
          sx={{
            border: "none",
            borderTop: `1px solid ${colors.border.primary}`,
            my: 2,
          }}
        />
      ),
    },
  },
};

const MarkdownContent = ({ children, className, sx = {} }) => {
  return (
    <Box
      className={className}
      sx={{
        color: colors.text.primary,
        wordBreak: "break-word",
        "& > p:first-of-type": { mt: 0 },
        "& > p:last-of-type": { mb: 0 },
        ...sx,
      }}
    >
      <Markdown options={markdownOptions}>{children || ""}</Markdown>
    </Box>
  );
};

export default MarkdownContent;
