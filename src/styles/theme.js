// Shared color palette and style tokens
export const colors = {
  bg: {
    primary: "#1a1c1d",
    secondary: "#333738",
    tertiary: "#3a3d3e",
    hover: "#454849",
    input: "#1a1c1d",
    userMessage: "#2d3d4a",
  },
  border: {
    primary: "#777066",
    secondary: "#555048",
    subtle: "#3a3d3e",
  },
  text: {
    primary: "rgba(216, 215, 212, 0.87)",
    secondary: "#aaa59d",
    muted: "#999187",
    dim: "#777066",
    placeholder: "#777066",
  },
  accent: {
    blue: "#4a9eff",
    blueHover: "#3a8eef",
    orange: "#ff9800",
    orangeHover: "#ffb74d",
    green: "#81c784",
    userLabel: "#8ab4f8",
    error: "#f44336",
    delete: "#f44",
  },
  button: {
    primary: "#4a9eff",
    primaryHover: "#3a8eef",
    secondary: "#555048",
    secondaryHover: "#777066",
    danger: "#5c3a3a",
    dangerHover: "#7a4a4a",
    disabled: "#555048",
    disabledText: "#777066",
  },
};

// Reusable component styles
export const components = {
  // Text field styling for MUI TextField
  textField: {
    "& .MuiOutlinedInput-root": {
      backgroundColor: "transparent",
      color: colors.text.primary,
      "& fieldset": { borderColor: colors.border.secondary },
      "&:hover fieldset": { borderColor: colors.border.primary },
      "&.Mui-focused fieldset": { borderColor: colors.accent.blue },
    },
    "& .MuiInputBase-input::placeholder": { color: colors.text.muted },
  },

  // Text field with label
  textFieldWithLabel: {
    "& .MuiOutlinedInput-root": {
      backgroundColor: "transparent",
      color: colors.text.primary,
      "& fieldset": { borderColor: colors.border.secondary },
      "&:hover fieldset": { borderColor: colors.border.primary },
      "&.Mui-focused fieldset": { borderColor: colors.accent.blue },
    },
    "& .MuiInputLabel-root": { color: colors.text.muted },
    "& .MuiInputLabel-root.Mui-focused": { color: colors.accent.blue },
  },

  // Select dropdown styling
  select: {
    backgroundColor: "transparent",
    color: colors.text.primary,
    "& .MuiOutlinedInput-notchedOutline": {
      borderColor: colors.border.secondary,
    },
    "&:hover .MuiOutlinedInput-notchedOutline": {
      borderColor: colors.border.primary,
    },
    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
      borderColor: colors.accent.blue,
    },
    "& .MuiSvgIcon-root": { color: colors.text.muted },
  },

  // Panel/Paper container
  panel: {
    backgroundColor: colors.bg.secondary,
    border: `1px solid ${colors.border.primary}`,
    borderRadius: 2,
  },

  // Modal container
  modal: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    backgroundColor: colors.bg.secondary,
    border: `1px solid ${colors.border.primary}`,
    borderRadius: 2,
    p: 3,
  },

  // Primary action button (blue)
  buttonPrimary: {
    backgroundColor: "transparent",
    color: colors.text.primary,
    "&:hover": { backgroundColor: "rgba(74, 158, 255, 0.1)" },
    "&.Mui-disabled": {
      // backgroundColor: colors.button.disabled,
      color: colors.button.disabledText,
    },
  },

  // Secondary/ghost button
  buttonSecondary: {
    py: 1,
    backgroundColor: colors.bg.tertiary,
    color: colors.text.primary,
    textTransform: "none",
    fontWeight: 500,
    border: `1px solid ${colors.border.secondary}`,
    "&:hover": {
      backgroundColor: colors.bg.hover,
      borderColor: colors.border.primary,
    },
    "&.Mui-disabled": {
      backgroundColor: colors.bg.secondary,
      color: colors.border.secondary,
      borderColor: colors.border.subtle,
    },
  },

  // Small icon button
  iconButton: {
    backgroundColor: colors.button.secondary,
    color: colors.text.primary,
    width: 24,
    height: 24,
    "&:hover": { backgroundColor: colors.button.secondaryHover },
  },

  // Icon button - danger variant
  iconButtonDanger: {
    backgroundColor: colors.button.danger,
    color: colors.text.primary,
    width: 24,
    height: 24,
    "&:hover": { backgroundColor: colors.button.dangerHover },
  },

  // Divider
  divider: {
    borderColor: colors.border.secondary,
  },

  // Clickable list item
  listItemButton: {
    borderRadius: 1,
    py: 0.5,
    "&.Mui-selected": {
      backgroundColor: colors.bg.tertiary,
      "&:hover": { backgroundColor: colors.bg.hover },
    },
    "&:hover": { backgroundColor: colors.bg.tertiary },
  },

  // Hover highlight box
  hoverBox: {
    "&:hover": { backgroundColor: colors.bg.tertiary },
    borderRadius: 1,
    cursor: "pointer",
  },

  // Muted icon button (for header icons)
  iconButtonMuted: {
    color: colors.text.muted,
    p: 0.5,
    "&:hover": { color: colors.text.primary },
  },

  // Checkbox styling
  checkbox: {
    color: colors.text.muted,
    "&.Mui-checked": { color: colors.accent.blue },
  },
};

// Typography presets
export const typography = {
  primary: { color: colors.text.primary },
  secondary: { color: colors.text.secondary },
  muted: { color: colors.text.muted },
  dim: { color: colors.text.dim },
  accent: { color: colors.accent.blue },
  error: { color: colors.accent.error },
};

const theme = { colors, components, typography };

export default theme;
