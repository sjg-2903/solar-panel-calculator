import { useState } from "react";
import {
    Box,
    Typography,
    Button,
    FormControl,
    Select,
    MenuItem,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Checkbox,
    FormControlLabel,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import DownloadIcon from "@mui/icons-material/Download";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";

export default function ConfigPage({
    roofPanels,
    solarPanelArea,
    solarPanelEnergyOutput,
    energyConsumption,
    getRoofArea,
    downloadPDF,
    setAreaType,
    isDrawingEnabled,
    handleToggleDrawing,
    handleOpenModal,
    setCurrentPage,
}) {
    const [areaType, setLocalAreaType] = useState("Dachfläche");
    const [selectedConcepts, setSelectedConcepts] = useState([]);

    const handleAreaTypeChange = (event) => {
        const newAreaTypeGerman = event.target.value;
        setLocalAreaType(newAreaTypeGerman);

        let newAreaTypeEnglish;
        switch (newAreaTypeGerman) {
            case "Dachfläche":
                newAreaTypeEnglish = "Roof";
                break;
            case "Freifläche":
                newAreaTypeEnglish = "Open Area";
                break;
            case "Beides":
                newAreaTypeEnglish = "Both";
                break;
            default:
                newAreaTypeEnglish = "Roof";
        }
        setAreaType(newAreaTypeEnglish);
    };

    const handleConceptChange = (concept) => {
        setSelectedConcepts((prev) =>
            prev.includes(concept)
                ? prev.filter((item) => item !== concept)
                : [...prev, concept]
        );
    };

    const handleBackToSearch = () => {
        setLocalAreaType("Dachfläche");
        setAreaType("Roof");
        setCurrentPage("search");
    };

    const tableCellStyle = { color: "#E2CAA2" };

    return (
        <Box sx={{ padding: 3, color: "#E2CAA2" }}>
            <Typography variant="h6" fontWeight="bold" sx={{ mb: 1 }}>
                SOLAR-KONFIGURATOR
            </Typography>
            <Typography variant="h3" fontWeight="bold" sx={{ mb: 1 }}>
                Markieren Sie Ihre
                <br />
                Flächen
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
                Klicken Sie mit der Maus auf die Eckpunkte Ihrer Dach- oder Freifläche. Mit einem Klick auf den zuerst gesetzten Punkt, können Sie die Fläche abschließen. Alle Angaben können auch nachträglich verändert werden.
            </Typography>
            <Typography variant="h6" sx={{ color: "#E2CAA2", mt: 3, mb: 1 }}>
                Flächenart :
            </Typography>
            <FormControl sx={{ minWidth: "100%" }}>
                <Select
                    value={areaType}
                    onChange={handleAreaTypeChange}
                    sx={{ color: "#E2CAA2", backgroundColor: "#085B6B" }}
                >
                    <MenuItem value="Dachfläche">Dachfläche</MenuItem>
                    <MenuItem value="Freifläche">Freifläche</MenuItem>
                    <MenuItem value="Beides">Beides</MenuItem>
                </Select>
            </FormControl>
            <Typography variant="h6" sx={{ color: "#E2CAA2", mt: 3, mb: 1 }}>
                An welchen Konzepten sind Sie interessiert?*
            </Typography>
            <Box>
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={selectedConcepts.includes("Schlüsselfertige Eigenanlage (Dach)")}
                            onChange={() => handleConceptChange("Schlüsselfertige Eigenanlage (Dach)")}
                            sx={{ color: "#E2CAA2", '&.Mui-checked': { color: "#E2CAA2" } }}
                        />
                    }
                    label="Schlüsselfertige Eigenanlage (Dach)"
                    sx={{ color: "#E2CAA2" }}
                />
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={selectedConcepts.includes("Dachvermietung")}
                            onChange={() => handleConceptChange("Dachvermietung")}
                            sx={{ color: "#E2CAA2", '&.Mui-checked': { color: "#E2CAA2" } }}
                        />
                    }
                    label="Dachvermietung"
                    sx={{ color: "#E2CAA2" }}
                />
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={selectedConcepts.includes("Solaranlage mieten (Dach)")}
                            onChange={() => handleConceptChange("Solaranlage mieten (Dach)")}
                            sx={{ color: "#E2CAA2", '&.Mui-checked': { color: "#E2CAA2" } }}
                        />
                    }
                    label="Solaranlage mieten (Dach)"
                    sx={{ color: "#E2CAA2" }}
                />
            </Box>
            <Box
                sx={{
                    background: "linear-gradient(135deg, #073845 10%, #085B6B 100%)",
                    padding: 2,
                    borderRadius: 1,
                    boxShadow: 2,
                    mt: 2,
                }}
            >
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                    <Typography variant="h6">Ihre markierte Flächen</Typography>
                    <Button
                        variant="outlined"
                        color="inherit"
                        startIcon={<AddIcon />}
                        onClick={handleToggleDrawing}
                        disabled={isDrawingEnabled}
                        sx={{ color: "#E2CAA2", borderColor: "#E2CAA2" }}
                    >
                        Neue Fläche hinzufügen
                    </Button>
                </Box>
                <Typography variant="body2" sx={{ color: "#E2CAA2", mb: 2 }}>
                    {areaType === "Dachfläche" && "Zeichnen Sie Polygone über die süd-, ost- und westlichen Abschnitte Ihres Daches."}
                    {areaType === "Freifläche" && "Zeichnen Sie Polygone über offene grüne Felder und Flächen."}
                    {areaType === "Beides" && "Zeichnen Sie Polygone über Dachabschnitte und offene Flächen."}
                    {isDrawingEnabled && " Klicken Sie auf die Karte, um ein neues Panel zu zeichnen."}
                </Typography>

                {roofPanels.map(
                    (panel, index) =>
                        !panel.isDeleted && (
                            <Accordion key={index} sx={{ background: "#0D5E6B", color: "#E2CAA2", mb: 1 }}>
                                <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: "#E2CAA2" }} />}>
                                    <Typography fontWeight="bold">Panel {index + 1}</Typography>
                                </AccordionSummary>
                                <AccordionDetails>
                                    <TableContainer component={Paper} sx={{ background: "transparent" }}>
                                        <Table sx={{ minWidth: 250 }}>
                                            <TableHead>
                                                <TableRow sx={{ background: "#085B6B" }}>
                                                    <TableCell sx={tableCellStyle}>Eigenschaft</TableCell>
                                                    <TableCell sx={tableCellStyle}>Wert</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                <TableRow>
                                                    <TableCell sx={tableCellStyle}>Markierte Fläche</TableCell>
                                                    <TableCell sx={tableCellStyle}>{(panel.area * 0.092903).toFixed(2)} m²</TableCell>
                                                </TableRow>
                                                <TableRow>
                                                    <TableCell sx={tableCellStyle}>Solar Panels</TableCell>
                                                    <TableCell sx={tableCellStyle}>{(panel.area / solarPanelArea).toFixed(0)}</TableCell>
                                                </TableRow>
                                                <TableRow>
                                                    <TableCell sx={tableCellStyle}>Stromerzeugung pro Jahr</TableCell>
                                                    <TableCell sx={tableCellStyle}>
                                                        {((panel.area / solarPanelArea) * solarPanelEnergyOutput * 12 / energyConsumption * 100).toFixed(2)} kWh/Jahr
                                                    </TableCell>
                                                </TableRow>
                                                {panel.solarData ? (
                                                    <>
                                                        <TableRow>
                                                            <TableCell sx={tableCellStyle}>Sonnenstunden</TableCell>
                                                            <TableCell sx={tableCellStyle}>{panel.solarData.maxSunshineHoursPerYear.toFixed(2)} Stunden</TableCell>
                                                        </TableRow>
                                                        <TableRow>
                                                            <TableCell sx={tableCellStyle}>Solarstrahlung</TableCell>
                                                            <TableCell sx={tableCellStyle}>{(panel.solarData.maxSunshineHoursPerYear / 365).toFixed(2)} kWh/m²/Tag</TableCell>
                                                        </TableRow>
                                                        <TableRow>
                                                            <TableCell sx={tableCellStyle}>Weniger Emissionen pro Jahr ggü. Strommix</TableCell>
                                                            <TableCell sx={tableCellStyle}>{panel.solarData.carbonOffsetFactorKgPerMwh.toFixed(2)} Kg CO₂/Jahr</TableCell>
                                                        </TableRow>
                                                    </>
                                                ) : (
                                                    <>
                                                        <TableRow>
                                                            <TableCell sx={tableCellStyle}>Sonnenstunden</TableCell>
                                                            <TableCell sx={tableCellStyle}>Wird geladen...</TableCell>
                                                        </TableRow>
                                                        <TableRow>
                                                            <TableCell sx={tableCellStyle}>CO2-Einsparungen</TableCell>
                                                            <TableCell sx={tableCellStyle}>Wird geladen...</TableCell>
                                                        </TableRow>
                                                    </>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                    <Box sx={{ mt: 2 }}>
                                        <Button
                                            variant="contained"
                                            color="error"
                                            startIcon={<DeleteIcon />}
                                            onClick={() => handleOpenModal(index)}
                                            sx={{ mr: 1 }}
                                        >
                                            Löschen
                                        </Button>
                                        <Button
                                            variant="contained"
                                            color="primary"
                                            startIcon={<DownloadIcon />}
                                            onClick={() => downloadPDF(index)}
                                        >
                                            PDF herunterladen
                                        </Button>
                                    </Box>
                                </AccordionDetails>
                            </Accordion>
                        )
                )}
            </Box>

            {/* Summary Section */}
            <Box
                sx={{
                    background: "linear-gradient(135deg, #073845 10%, #085B6B 100%)",
                    padding: 2,
                    borderRadius: 1,
                    boxShadow: 2,
                    mt: 2,
                }}
            >
                <Typography variant="h6">Zusammenfassung</Typography>
                <TableContainer component={Paper} sx={{ background: "transparent" }}>
                    <Table>
                        <TableHead>
                            <TableRow sx={{ background: "#085B6B" }}>
                                <TableCell sx={tableCellStyle}>Eigenschaft</TableCell>
                                <TableCell sx={tableCellStyle}>Wert</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            <TableRow>
                                <TableCell sx={tableCellStyle}>Gesamte markierte Fläche</TableCell>
                                <TableCell sx={tableCellStyle}>{(getRoofArea() * 0.092903).toFixed(2)} m²</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell sx={tableCellStyle}>Gesamte Panels</TableCell>
                                <TableCell sx={tableCellStyle}>{(getRoofArea() / solarPanelArea).toFixed(0)}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell sx={tableCellStyle}>Jährliche Stromerzeugung</TableCell>
                                <TableCell sx={tableCellStyle}>
                                    {roofPanels
                                        .reduce(
                                            (total, panel) =>
                                                !panel.isDeleted ? total + ((panel.area / solarPanelArea) * solarPanelEnergyOutput * 12) / energyConsumption * 100 : total,
                                            0
                                        )
                                        .toFixed(2)}{" "}
                                    kWh/Jahr
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </TableContainer>
            </Box>
            <Box sx={{ mt: 2, display: "flex", justifyContent: "space-between" }}>
                <Button
                    variant="outlined"
                    color="inherit"
                    startIcon={<ArrowBackIcon />}
                    onClick={handleBackToSearch}
                    sx={{ color: "#E2CAA2", borderColor: "#E2CAA2" }}
                >
                    Zurück zur Suche
                </Button>
                <Button
                    variant="outlined"
                    color="inherit"
                    endIcon={<ArrowForwardIcon />}
                    onClick={() => { }}
                    sx={{ color: "#E2CAA2", borderColor: "#E2CAA2", ml: "auto" }}
                >
                    Weiter
                </Button>
            </Box>
        </Box>
    );
}