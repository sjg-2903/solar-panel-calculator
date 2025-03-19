import { Box, Typography } from "@mui/material";
import Places from "./Places";

export default function SearchPage({ setHome, reset }) {
  const handlePlaceSelected = (position) => {
    reset(); 
    setHome(position);
  };

  return (
    <Box sx={{ padding: 3, color: "#E2CAA2" }}>
      <Typography variant="h6" fontWeight="bold" sx={{ mb: 1 }}>
        SOLAR-KONFIGURATOR
      </Typography>
      <Typography variant="h3" fontWeight="bold" sx={{ mb: 1 }}>
        Wo findet Ihre
        <br />
        Energiewende statt?
      </Typography>
      <Typography variant="body2" sx={{ mb: 2 }}>
        Geben Sie die Adresse der gewünschten Solaranlage ein.
      </Typography>
      <Places setHome={handlePlaceSelected} />
    </Box>
  );
}