import React from "react";
import {
  Card,
  CardContent,
  Typography,
} from "@mui/material";

function StatCard({ title, value, description }) {
  return (
    <Card
      sx={{
        borderRadius: 3,
        boxShadow: "0 4px 15px rgba(0, 0, 0, 0.08)",
        height: "100%",
      }}
    >
      <CardContent sx={{ p: 3 }}>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            fontWeight: 600,
          }}
        >
          {title}
        </Typography>

        <Typography
          variant="h4"
          sx={{
            mt: 1,
            fontWeight: 700,
            color: "#0f172a",
          }}
        >
          {value}
        </Typography>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mt: 1,
          }}
        >
          {description}
        </Typography>

      </CardContent>
    </Card>
  );
}

export default StatCard;