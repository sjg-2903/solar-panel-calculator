import { useState, useEffect } from "react";
import { Box, Modal, Fade, Typography, Button } from "@mui/material";
import SearchPage from "./SearchPage";
import ConfigPage from "./ConfigPage";

export default function Sidebar({
  roofPanels,
  solarPanelArea,
  solarPanelEnergyOutput,
  energyConsumption,
  getRoofArea,
  downloadPDF,
  setHome,
  mapRef,
  homePosition,
  setCanDrawPanels,
  resetDrawingState,
  setAreaType,
  resetMapState,
}) {
  const [isDrawingEnabled, setIsDrawingEnabled] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const [selectedPanelIndex, setSelectedPanelIndex] = useState(null);
  const [currentPage, setCurrentPage] = useState("search");

  
  const resetSidebarState = () => {
    setIsDrawingEnabled(true);
    setOpenModal(false);
    setSelectedPanelIndex(null);
    setCurrentPage("search");
  };

  // Combined reset function
  const handleReset = () => {
    resetSidebarState();
    resetMapState();
  };

  const handleToggleDrawing = () => {
    setIsDrawingEnabled((prev) => !prev);
    setCanDrawPanels(!isDrawingEnabled);
  };

  const handleOpenModal = (index) => {
    setSelectedPanelIndex(index);
    setOpenModal(true);
  };

  const handleCloseModal = () => {
    setOpenModal(false);
    setSelectedPanelIndex(null);
  };

  const handleConfirmDelete = () => {
    if (selectedPanelIndex !== null) {
      roofPanels[selectedPanelIndex].delete();
    }
    handleCloseModal();
  };

  const handleSetHome = (position) => {
    handleReset(); // Reset everything
    setHome(position);
    mapRef.current?.panTo(position);
    mapRef.current?.setZoom(15);
    setCurrentPage("config");
    setIsDrawingEnabled(true); // Enable drawing only after new search
    setCanDrawPanels(true); // Sync with Map
  };

  useEffect(() => {
    if (resetDrawingState) {
      setIsDrawingEnabled(false);
    }
  }, [resetDrawingState]);



  return (
    <Box
      sx={{
        width: "35%",
        height: "100vh",
        overflowY: "auto",
        background: "linear-gradient(135deg, #06242E 10%, #073845 100%)",
        boxShadow: 4,
      }}
    >
      {currentPage === "search" ? (
        <SearchPage setHome={handleSetHome} reset={handleReset} />
      ) : (
        <ConfigPage
          roofPanels={roofPanels}
          solarPanelArea={solarPanelArea}
          solarPanelEnergyOutput={solarPanelEnergyOutput}
          energyConsumption={energyConsumption}
          getRoofArea={getRoofArea}
          downloadPDF={downloadPDF}
          setAreaType={setAreaType}
          isDrawingEnabled={isDrawingEnabled}
          handleToggleDrawing={handleToggleDrawing}
          handleOpenModal={handleOpenModal}
          setCurrentPage={(page) => {
            setCurrentPage(page);
            if (page === "search") {
              setIsDrawingEnabled(false);
              setCanDrawPanels(false);
            }
          }}
        />
      )}
      <Modal
        open={openModal}
        onClose={handleCloseModal}
        closeAfterTransition
        sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <Fade in={openModal}>
          <Box
            sx={{
              backgroundColor: "#073845",
              borderRadius: 1,
              padding: 3,
              boxShadow: 24,
              minWidth: 300,
              color: "#E2CAA2",
            }}
          >
            <Typography variant="h6" gutterBottom>
              Löschung bestätigen
            </Typography>
            <Typography variant="body1" gutterBottom>
              Sind Sie sicher, dass Sie Panel {selectedPanelIndex !== null ? selectedPanelIndex + 1 : ""} löschen möchten?
            </Typography>
            <Box sx={{ mt: 2, display: "flex", justifyContent: "flex-end" }}>
              <Button
                variant="outlined"
                color="inherit"
                onClick={handleCloseModal}
                sx={{ mr: 1 }}
              >
                Abbrechen
              </Button>
              <Button
                variant="contained"
                color="error"
                onClick={handleConfirmDelete}
              >
                Löschen
              </Button>
            </Box>
          </Box>
        </Fade>
      </Modal>
    </Box>
  );
}