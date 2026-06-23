import React from "react";
import { ToggleButton, ToggleButtonGroup, Box, Typography } from "@mui/material";

const TYPES = ["All", "Placement", "Result", "Event"];

const NotificationFilter = ({ value, onChange }) => {
  return (
    <Box mb={2}>
      <Typography variant="body2" color="text.secondary" mb={0.5}>
        Filter by type
      </Typography>
      <ToggleButtonGroup
        value={value}
        exclusive
        onChange={(_, newVal) => newVal !== null && onChange(newVal)}
        size="small"
        sx={{ flexWrap: "wrap", gap: 0.5 }}
      >
        {TYPES.map((t) => (
          <ToggleButton
            key={t}
            value={t}
            sx={{
              borderRadius: "20px !important",
              px: 2,
              border: "1px solid !important",
              "&.Mui-selected": {
                bgcolor: "primary.main",
                color: "white",
                "&:hover": { bgcolor: "primary.dark" },
              },
            }}
          >
            {t}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Box>
  );
};

export default NotificationFilter;