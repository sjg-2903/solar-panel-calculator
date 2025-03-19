import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { GoogleMap, Marker } from "@react-google-maps/api";
import Sidebar from "./Sidebar";
import React from "react";
import { jsPDF } from "jspdf";
import "./styles.css";
import {
    Box,
    Typography,
    Button,
    Modal,
    Fade,
} from "@mui/material";

export default function Map({ currentPage }) {
    const [energyConsumption, setEnergyConsumption] = useState(900);
    const [canDrawPanels, setCanDrawPanels] = useState(false);
    const [resetDrawingState, setResetDrawingState] = useState(false);
    const [homePosition, setHomePosition] = useState(null);
    const [areaType, setAreaType] = useState("Roof");
    const solarPanelWidth = 3.5;
    const solarPanelHeight = 5;
    const solarPanelArea = solarPanelWidth * solarPanelHeight;
    const solarPanelEnergyOutput = 48;

    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [modalMessage, setModalMessage] = useState("");

    const handleOpenModal = (message) => {
        setModalMessage(message);
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        setModalOpen(false);
        setModalMessage("");
    };



    const [zoom, setZoom] = useState(12);
    const [panelHovering, setPanelHovering] = useState();

    const getSelectedAreaCenter = () => {
        if (boxPoints.length === 0) return null;
        let latSum = 0,
            lngSum = 0;
        boxPoints.forEach((point) => {
            latSum += point.lat;
            lngSum += point.lng;
        });
        return {
            lat: latSum / boxPoints.length,
            lng: lngSum / boxPoints.length,
        };
    };

    const fetchSolarApiData = async (center) => {
        const url = `https://power.larc.nasa.gov/api/temporal/climatology/point?parameters=ALLSKY_SFC_SW_DWN&community=RE&longitude=${center.lng}&latitude=${center.lat}&format=JSON`;
        try {
            const response = await fetch(url);
            const data = await response.json();
            console.log("Panel Data", data);
            if (data?.properties?.parameter?.ALLSKY_SFC_SW_DWN?.ANN) {
                const annualIrradiance = data.properties.parameter.ALLSKY_SFC_SW_DWN.ANN;
                if (typeof annualIrradiance === "number" && !isNaN(annualIrradiance)) {
                    const sunshineHours = (annualIrradiance * 365).toFixed(2);
                    const co2Savings = (annualIrradiance * 365 * 0.4).toFixed(2);
                    return { maxSunshineHoursPerYear: Number(sunshineHours), carbonOffsetFactorKgPerMwh: Number(co2Savings) };
                }
            }
            return null;
        } catch (error) {
            console.error("Error fetching NASA solar data:", error);
            return null;
        }
    };

    const [home, setHome] = useState();
    useEffect(() => {
        if (home) {
            setZoom(100);
        }
    }, [home]);

    const mapRef = useRef();
    const center = useMemo(() => ({ lat: 29.425319, lng: -98.492733 }), []);

    const latLngLiteral = {
        lat: 51.1657,
        lng: 10.4515,
    };

    const options = useMemo(
        () => ({
            center: latLngLiteral,
            mapId: "793ef8405dde11b1",
            zoom: 6,
            disableDefaultUI: false,
            clickableIcons: false,
            mapTypeControl: false,
            mapTypeId: "hybrid",
            tilt: 0,
            draggableCursor:
                'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\'><circle cx=\'12\' cy=\'12\' r=\'4\' fill=\'%2300FFFF\' stroke=\'%23000000\' stroke-width=\'2\'/></svg>") 12 12, auto',
        }),
        []
    );

    const onLoad = useCallback((map) => (mapRef.current = map), []);

    const sniperPointSvg = `
    <svg width="6" height="6" viewBox="0 0 6 6" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="3" cy="3" r="2.5" stroke="#FF0000" stroke-width="1" fill="none" />
        <line x1="3" y1="0" x2="3" y2="6" stroke="#FF0000" stroke-width="1" />
        <line x1="0" y1="3" x2="6" y2="3" stroke="#FF0000" stroke-width="1" />
        <circle cx="3" cy="3" r="0.8" fill="#FF0000"/>
    </svg>`;

    const dotIcon = {
        url: `data:image/svg+xml,${encodeURIComponent(sniperPointSvg)}`,
        scaledSize: new window.google.maps.Size(10, 10),
        origin: new window.google.maps.Point(0, 0),
        anchor: new window.google.maps.Point(5, 5),
    };

    const [boxPoints, setBoxPoints] = useState([]);
    const currPolyline = useRef();

    const getGeocodingTypes = async (latLng) => {
        return new Promise((resolve) => {
            const geocoder = new window.google.maps.Geocoder();
            geocoder.geocode({ location: latLng }, (results, status) => {
                if (status === "OK" && results[0]) {
                    resolve(results[0].types);
                } else {
                    resolve(["Geocoding Failed"]);
                }
            });
        });
    };

    const checkLocationType = async (latLng) => {
        return new Promise((resolve) => {
            const geocoder = new window.google.maps.Geocoder();
            geocoder.geocode({ location: latLng }, (results, status) => {
                if (status === "OK" && results[0]) {
                    const types = results[0].types;
                    const roofTypes = [
                        "premise",
                        "building",
                        "roof",
                        "street_address",
                        "sublocality",
                        "locality",
                        "neighborhood",
                        "postal_code",
                        "store",
                        "car_repair",
                    ];

                    const openAreaTypes = [
                        "park",
                        "natural_feature",
                        "forest",
                        "grassland",
                        "field",
                        "meadow",
                        "tourist_attraction",
                        "route",
                    ];

                    if (
                        types.length === 2 &&
                        types.includes("establishment") &&
                        types.includes("point_of_interest")
                    ) {
                        resolve("Roof");
                    } else if (types.length > 2 && types.includes("establishment") && types.includes("point_of_interest")) {
                        const additionalTypes = types.filter(
                            (type) => type !== "establishment" && type !== "point_of_interest"
                        );
                        if (roofTypes.some((type) => additionalTypes.includes(type))) {
                            resolve("Roof");
                        } else if (openAreaTypes.some((type) => additionalTypes.includes(type))) {
                            resolve("Open Area");
                        } else {
                            resolve("Roof");
                        }
                    } else {
                        if (roofTypes.some((type) => types.includes(type))) {
                            resolve("Roof");
                        } else if (openAreaTypes.some((type) => types.includes(type))) {
                            resolve("Open Area");
                        } else {
                            // Fallback to address components if no direct match
                            const components = results[0].address_components;
                            const hasInfrastructure = components.some((comp) =>
                                ["street_number", "route", "premise", "building"].includes(comp.types[0])
                            );
                            if (hasInfrastructure) {
                                resolve("Roof");
                            } else {
                                resolve("Open Area");
                            }
                        }
                    }
                } else {
                    resolve("Roof");
                }
            });
        });
    };

    let addBoxPoint = async (coordinates) => {
        if (!homePosition) {
            return;
        }
        if (currentPage === "config" && roofPanels.length > 0 && !canDrawPanels) {
            return;
        }
        if (!canDrawPanels) {
            return;
        }

        const locationType = await checkLocationType(coordinates);
        console.log("Geocoding Types for Clicked Location:", await getGeocodingTypes(coordinates)); // Log the raw types
        console.log("Determined Location Type:", locationType);

        if (
            (areaType === "Roof" && locationType !== "Roof") ||
            (areaType === "Open Area" && locationType !== "Open Area") ||
            (areaType !== "Both" && locationType === "Unknown")
        ) {
            let areaTypeGerman = areaType === "Roof" ? "Dachfläche" : areaType === "Open Area" ? "Freifläche" : areaType.toLowerCase();
            let locationTypeGerman = locationType === "Roof" ? "Dachfläche" : locationType === "Open Area" ? "Freifläche" : "Unbekannt";
            handleOpenModal(`Bitte wählen Sie eine ${areaTypeGerman}-Fläche aus. Die aktuelle Auswahl ist ${locationTypeGerman}.`);
            return;
        }

        if (boxPoints.length === 0) {
            setBoxPoints([coordinates]);
        } else {
            setBoxPoints([...boxPoints, coordinates]);
        }
    };

    useEffect(() => {
        if (boxPoints.length >= 2) {
            if (currPolyline.current !== undefined) {
                currPolyline.current.setMap(null);
            }
            const newPolyline = new window.google.maps.Polyline({
                path: boxPoints,
                geodesic: false,
                strokeColor: "#FF0000",
                strokeWeight: 1,
            });
            newPolyline.setMap(mapRef.current);
            currPolyline.current = newPolyline;
        } else {
            if (currPolyline.current !== undefined) {
                currPolyline.current.setMap(null);
            }
        }
    }, [boxPoints]);

    const [roofPanels, setRoofPanels] = useState([]);
    const [deletedPanels, setDeletedPanels] = useState([]);

    const CardinalDirection = {
        north: 0,
        south: 1,
        east: 2,
        west: 3,
    };

    function drawPoint(points) {
        const point = new window.google.maps.Marker({
            position: points,
            icon: dotIcon,
        });
        point.setMap(mapRef.current);
    }

    class roofPanel {
        isDeleted = false;
        points;
        panel;
        polyline;
        area;
        index;
        solarPanels = [];
        sideLabels = [];
        numberLabel;

        constructor(points, index, solarData) {
            const panel = new window.google.maps.Polygon({
                paths: points,
                strokeOpacity: 0.8,
                strokeWeight: 1,
                fillOpacity: 0.35,
            });
            panel.setMap(mapRef.current);
            panel.addListener("mouseover", () => {
                setPanelHovering(index);
            });
            panel.addListener("mouseout", () => {
                setPanelHovering(undefined);
            });

            const polyline = new window.google.maps.Polyline({
                path: [...points, points[0]], // Close the loop
                geodesic: false,
                strokeColor: "#000000",
                strokeWeight: 1,
            });
            polyline.setMap(mapRef.current);

            const center = this.calculateCenter(points);

            this.numberLabel = new window.google.maps.Marker({
                position: center,
                map: mapRef.current,
                label: {
                    text: `${index + 1}`,
                    color: "black",
                    fontSize: "14px",
                    fontWeight: "bold",
                },
                icon: {
                    url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent('<svg width="0" height="0"></svg>'),
                    scaledSize: new window.google.maps.Size(0, 0),
                },
            });

            this.updateColor();
            this.area = window.google.maps.geometry.spherical.computeArea(points) * 10.7639;
            this.index = index;
            this.points = points;
            this.displaySideLengths();
            this.solarData = solarData;
            this.panel = panel;
            this.polyline = polyline;

            switch (points.length) {
                case 3:
                    this.drawSolarPanelsInTriangle(points);
                    break;
                default:
                    break;
            }
        }

        drawSolarPanelsInTriangle(points) {
            let maxVal = 0;
            let maxLine = [{ lat: 0, lng: 0 }, { lat: 0, lng: 0 }];

            for (let i = 0; i < points.length; i++) {
                for (let j = i + 1; j < points.length; j++) {
                    let verticalDiff = Math.abs(points[i].lat - points[j].lat);
                    if (verticalDiff > maxVal) {
                        maxVal = verticalDiff;
                        maxLine = [points[i], points[j]];
                    }
                }
            }

            let [northMost, southMost] = maxLine[0].lat > maxLine[1].lat ? [maxLine[0], maxLine[1]] : [maxLine[1], maxLine[0]];

            let maxLineHeading = window.google.maps.geometry.spherical.computeHeading(northMost, southMost);
            let panelStep = Math.abs((solarPanelHeight * 0.3048) / Math.cos((180 - Math.abs(maxLineHeading)) * (Math.PI / 180)));

            let currPoint = northMost;
            let canDrawPanels = true;

            while (canDrawPanels) {
                let westOfCurrPoint = window.google.maps.geometry.spherical.computeOffset(currPoint, solarPanelWidth * 0.3048, 270);
                let eastOfCurrPoint = window.google.maps.geometry.spherical.computeOffset(currPoint, solarPanelWidth * 0.3048, 90);

                if (window.google.maps.geometry.poly.containsLocation(westOfCurrPoint, this.panel)) {
                    this.drawRowOfPanels(currPoint, CardinalDirection.west);
                } else if (window.google.maps.geometry.poly.containsLocation(eastOfCurrPoint, this.panel)) {
                    this.drawRowOfPanels(currPoint, CardinalDirection.east);
                } else {
                    canDrawPanels = false;
                }

                let nextRowPoint = window.google.maps.geometry.spherical.computeOffset(currPoint, 2 * solarPanelHeight * 0.3048, 180);
                if (nextRowPoint.lat < southMost.lat) {
                    canDrawPanels = false;
                }
                currPoint = nextRowPoint;
            }

            return true;
        }

        getLngOnLine(startPoint, endPoint, targetLat) {
            return (targetLat - startPoint.lat) * ((endPoint.lng - startPoint.lng) / (endPoint.lat - startPoint.lat)) + startPoint.lng;
        }

        drawRowOfPanels(origin, direction) {
            switch (direction) {
                case CardinalDirection.west:
                    let topLeftPointWest = window.google.maps.geometry.spherical.computeOffset(origin, solarPanelWidth * 0.3048, 270);
                    let bottomRightPointWest = window.google.maps.geometry.spherical.computeOffset(origin, solarPanelHeight * 0.3048, 180);
                    let bottomLeftPointWest = window.google.maps.geometry.spherical.computeOffset(bottomRightPointWest, solarPanelWidth * 0.3048, 270);
                    let solarPanelVerteciesWest = [origin, topLeftPointWest, bottomLeftPointWest, bottomRightPointWest];

                    let fullyWithinRoofPanelWest = true;
                    let anyPointWithinRoofPanelWest = false;
                    solarPanelVerteciesWest.map((vertex) => {
                        if (!window.google.maps.geometry.poly.containsLocation(vertex, this.panel)) {
                            fullyWithinRoofPanelWest = false;
                        } else {
                            anyPointWithinRoofPanelWest = true;
                        }
                    });

                    if (fullyWithinRoofPanelWest) {
                        let newSolarPanel = new window.google.maps.Polygon({
                            paths: solarPanelVerteciesWest,
                            strokeColor: "#00FF00",
                            strokeOpacity: 0.8,
                            strokeWeight: 2,
                            fillColor: "#00FF00",
                            fillOpacity: 0.35,
                        });
                        newSolarPanel.addListener("click", () => {
                            this.delete();
                        });
                        newSolarPanel.addListener("mouseover", () => {
                            setPanelHovering(this.index);
                        });
                        newSolarPanel.addListener("mouseout", () => {
                            setPanelHovering(undefined);
                        });
                        this.solarPanels.push(newSolarPanel);
                        this.solarPanels[this.solarPanels.length - 1].setMap(mapRef.current);
                    }

                    if (anyPointWithinRoofPanelWest) {
                        this.drawRowOfPanels(topLeftPointWest, CardinalDirection.west);
                    }
                    break;
                case CardinalDirection.east:
                    let topRightPointEast = window.google.maps.geometry.spherical.computeOffset(origin, solarPanelWidth * 0.3048, 90);
                    let bottomRightPointEast = window.google.maps.geometry.spherical.computeOffset(origin, solarPanelHeight * 0.3048, 180);
                    let bottomLeftPointEast = window.google.maps.geometry.spherical.computeOffset(bottomRightPointEast, solarPanelWidth * 0.3048, 90);
                    let solarPanelVerteciesEast = [origin, topRightPointEast, bottomRightPointEast, bottomLeftPointEast];

                    let fullyWithinRoofPanelEast = true;
                    let anyPointWithinRoofPanelEast = false;
                    solarPanelVerteciesEast.forEach((vertex) => {
                        if (!window.google.maps.geometry.poly.containsLocation(vertex, this.panel)) {
                            fullyWithinRoofPanelEast = false;
                        } else {
                            anyPointWithinRoofPanelEast = true;
                        }
                    });

                    if (fullyWithinRoofPanelEast) {
                        let newSolarPanel = new window.google.maps.Polygon({
                            paths: solarPanelVerteciesEast,
                            strokeColor: "#00FF00",
                            strokeOpacity: 0.8,
                            strokeWeight: 2,
                            fillColor: "#00FF00",
                            fillOpacity: 0.35,
                        });
                        newSolarPanel.addListener("click", () => {
                            this.delete();
                        });
                        newSolarPanel.addListener("mouseover", () => {
                            setPanelHovering(this.index);
                        });
                        newSolarPanel.addListener("mouseout", () => {
                            setPanelHovering(undefined);
                        });
                        this.solarPanels.push(newSolarPanel);
                        this.solarPanels[this.solarPanels.length - 1].setMap(mapRef.current);
                    }

                    if (anyPointWithinRoofPanelEast) {
                        this.drawRowOfPanels(topRightPointEast, CardinalDirection.east);
                    }
                    break;
                default:
                    break;
            }
        }
        getFillColor(sunshineHours) {
            if (sunshineHours < 500) {
                return "#FFFFFF";
            } else if (sunshineHours < 1000) {
                return "#FFD700";
            } else if (sunshineHours < 1500) {
                return "#FFA500";
            } else if (sunshineHours < 2000) {
                return "#FF0000";
            } else {
                return "#8B0000";
            }
        }

        updateColor() {
            if (this.solarData && this.solarData.maxSunshineHoursPerYear !== undefined) {
                const color = this.getFillColor(this.solarData.maxSunshineHoursPerYear);
                this.panel.setOptions({
                    fillColor: color,
                    strokeColor: color,
                });
                this.polyline.setOptions({
                    strokeColor: color,
                });
            }
        }

        calculateSideLengths() {
            const lengths = this.points.map((point, index, array) => {
                const nextIndex = (index + 1) % array.length;
                return window.google.maps.geometry.spherical.computeDistanceBetween(
                    new window.google.maps.LatLng(point),
                    new window.google.maps.LatLng(array[nextIndex])
                );
            });
            return lengths;
        }

        displaySideLengths() {
            if (this.sideLabels) {
                this.sideLabels.forEach((label) => label.setMap(null));
            }
            this.sideLabels = [];

            const lengths = this.calculateSideLengths();
            lengths.forEach((length, index) => {
                const startPoint = this.points[index];
                const endPoint = this.points[(index + 1) % this.points.length];
                const midPoint = {
                    lat: (startPoint.lat + endPoint.lat) / 2,
                    lng: (startPoint.lng + endPoint.lng) / 2,
                };
                const label = new window.google.maps.Marker({
                    position: midPoint,
                    map: mapRef.current,
                    label: {
                        text: `${Math.round(length)} m`,
                        color: "white",
                        fontSize: "12px",
                        fontWeight: "bold",
                        className: "custom-label",
                    },
                    icon: {
                        url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent('<svg width="0" height="0"></svg>'),
                        scaledSize: new window.google.maps.Size(0, 0),
                    },
                });
                this.sideLabels.push(label);
            });
        }

        calculateCenter(points) {
            let latSum = 0,
                lngSum = 0;
            points.forEach((point) => {
                latSum += point.lat;
                lngSum += point.lng;
            });
            return {
                lat: latSum / points.length,
                lng: lngSum / points.length,
            };
        }

        delete() {
            this.isDeleted = true;
            this.panel.setMap(null);
            this.polyline.setMap(null);
            this.solarPanels.forEach((panel) => panel.setMap(null));
            if (this.sideLabels) {
                this.sideLabels.forEach((label) => label.setMap(null));
            }
            this.numberLabel.setMap(null);
            setDeletedPanels((deletedPanels) => [...deletedPanels, this.index]);
        }

        addBack() {
            this.isDeleted = false;
            this.panel.setMap(mapRef.current);
            this.polyline.setMap(mapRef.current);
            this.solarPanels.forEach((panel) => panel.setMap(mapRef.current));
            this.numberLabel.setMap(mapRef.current);
            setDeletedPanels((deletedPanels) => deletedPanels.filter((item) => item !== this.index));
        }

        updatePoints(newPoints, finalize = false) {
            this.points = newPoints;
            this.polyline.setOptions({ path: [...newPoints, newPoints[0]] });
            this.panel.setOptions({ paths: newPoints });
            const newCenter = this.calculateCenter(newPoints);
            this.numberLabel.setPosition(newCenter);
            if (finalize) {
                this.area = window.google.maps.geometry.spherical.computeArea(newPoints) * 10.7639;
                this.solarPanels.forEach((panel) => panel.setMap(null));
                this.solarPanels = [];
                this.drawSolarPanelsInTriangle(newPoints);
                this.displaySideLengths();
            }
        }
    }

    let addRoofSegmment = async (points) => {
        if (!homePosition) {
            handleOpenModal("Bitte suchen Sie im Seitenbereich nach einem Standort, bevor Sie Dachsegmente hinzufügen.");
            return;
        }
        let index = roofPanels.length;
        const center = getSelectedAreaCenter(points);
        if (center) {
            const newPanel = new roofPanel(points, index, null);
            setRoofPanels([...roofPanels, newPanel]);
            setBoxPoints([]);
            setCanDrawPanels(false);
            setResetDrawingState(true);
            setTimeout(() => setResetDrawingState(false), 0);
            const solarData = await fetchSolarApiData(center);
            if (solarData) {
                newPanel.solarData = solarData;
                newPanel.updateColor();
                setRoofPanels((prevPanels) => [...prevPanels]);
            }
        }
    };

    let getRoofArea = () => {
        let area = 0;
        roofPanels.forEach((panel) => {
            if (!panel.isDeleted) {
                area += panel.area;
            }
        });
        return area;
    };

    const downloadPDF = (panelIndex) => {
        const input = document.getElementById("map-container");
        if (input && roofPanels.length > panelIndex) {
            const panel = roofPanels[panelIndex];

            const sketchCanvas = document.createElement("canvas");
            const sketchCtx = sketchCanvas.getContext("2d");

            sketchCanvas.width = input.clientWidth;
            sketchCanvas.height = input.clientHeight;

            let panelCenter = { x: 0, y: 0 };
            const mapBounds = mapRef.current.getBounds();
            const ne = mapBounds.getNorthEast();
            const sw = mapBounds.getSouthWest();
            const mapWidth = ne.lng() - sw.lng();
            const mapHeight = ne.lat() - sw.lat();

            panel.points.forEach((point) => {
                const xRatio = (point.lng - sw.lng()) / mapWidth;
                const yRatio = (ne.lat() - point.lat) / mapHeight;
                panelCenter.x += xRatio * sketchCanvas.width;
                panelCenter.y += yRatio * sketchCanvas.height;
            });
            panelCenter.x /= panel.points.length;
            panelCenter.y /= panel.points.length;

            sketchCtx.translate(sketchCanvas.width / 2 - panelCenter.x, sketchCanvas.height / 2 - panelCenter.y);
            sketchCtx.clearRect(-sketchCanvas.width / 2, -sketchCanvas.height / 2, sketchCanvas.width, sketchCanvas.height);

            sketchCtx.beginPath();
            panel.points.forEach((point, index) => {
                const xRatio = (point.lng - sw.lng()) / mapWidth;
                const yRatio = (ne.lat() - point.lat) / mapHeight;

                const canvasX = xRatio * sketchCanvas.width;
                const canvasY = yRatio * sketchCanvas.height;

                if (index === 0) {
                    sketchCtx.moveTo(canvasX, canvasY);
                } else {
                    sketchCtx.lineTo(canvasX, canvasY);
                }
            });
            sketchCtx.closePath();
            sketchCtx.fillStyle = "rgba(0, 0, 255, 0.4)";
            sketchCtx.strokeStyle = "rgba(0, 0, 255, 1)";
            sketchCtx.lineWidth = 2;
            sketchCtx.fill();
            sketchCtx.stroke();
            const sketchImg = sketchCanvas.toDataURL("image/png");
            const pdf = new jsPDF("l", "pt", [sketchCanvas.width, sketchCanvas.height]);
            pdf.addImage(sketchImg, "PNG", 0, 0, sketchCanvas.width, sketchCanvas.height);
            pdf.text(20, 20, `Roof Area: ${(panel.area * 0.092903).toFixed(2)} m²`);
            const sideLengths = panel.calculateSideLengths();
            sideLengths.forEach((length, index) => {
                let sideName = `Side ${String.fromCharCode(65 + index)}${String.fromCharCode(65 + ((index + 1) % sideLengths.length))}`;
                pdf.text(20, 40 + index * 20, `${sideName}: ${Math.round(length)} m`);
            });
            sideLengths.forEach((_, index) => {
                const point = panel.points[index];
                const xRatio = (point.lng - sw.lng()) / mapWidth;
                const yRatio = (ne.lat() - point.lat) / mapHeight;

                let canvasX = xRatio * sketchCanvas.width - panelCenter.x + sketchCanvas.width / 2;
                let canvasY = yRatio * sketchCanvas.height - panelCenter.y + sketchCanvas.height / 2;

                const pdfX = Math.max(0, Math.min(canvasX, pdf.internal.pageSize.getWidth()));
                const pdfY = Math.max(0, Math.min(canvasY, pdf.internal.pageSize.getHeight()));

                const text = String.fromCharCode(65 + index);

                if (pdfX >= 0 && pdfY >= 0 && pdfX <= pdf.internal.pageSize.getWidth() && pdfY <= pdf.internal.pageSize.getHeight()) {
                    pdf.setFontSize(20);
                    pdf.setTextColor(255, 255, 255);
                    pdf.setDrawColor(0);
                    pdf.setFillColor(0, 0, 0);
                    pdf.rect(pdfX - 10, pdfY - 10, 20, 20, "F");
                    pdf.text(text, pdfX, pdfY, { align: "center", baseline: "middle" });
                }
            });
            pdf.save(`solar_panel_layout_panel_${panelIndex + 1}.pdf`);
        } else {
            console.error("Element with ID 'map-container' not found or invalid panel index");
        }
    };

    const handleMarkerDrag = (index, panelIndex, newPosition, isDragging = false) => {
        const updatedPanels = [...roofPanels];
        const panel = updatedPanels[panelIndex];
        if (!panel.isDeleted) {
            const newPoints = [...panel.points];
            newPoints[index] = newPosition;
            panel.updatePoints(newPoints, !isDragging);
            if (!isDragging) {
                setRoofPanels(updatedPanels);
            }
        }
    };

    const resetMapState = () => {
        // Clear all existing map objects
        roofPanels.forEach((panel) => {
            if (!panel.isDeleted) {
                panel.panel.setMap(null);
                panel.polyline.setMap(null);
                panel.solarPanels.forEach((solarPanel) => solarPanel.setMap(null));
                panel.sideLabels.forEach((label) => label.setMap(null));
                panel.numberLabel.setMap(null);
            }
        });

        if (currPolyline.current) {
            currPolyline.current.setMap(null);
        }

        // Reset all state
        setRoofPanels([]);
        setBoxPoints([]);
        setDeletedPanels([]);
        setCanDrawPanels(false);
        setResetDrawingState(true);
        setHomePosition(null);
        setHome(null);
        setZoom(12);
        setTimeout(() => setResetDrawingState(false), 0);
    };

    return (
        <div style={{ display: "flex", height: "100vh", width: "100%" }}>
            <Sidebar
                roofPanels={roofPanels}
                solarPanelArea={solarPanelArea}
                solarPanelEnergyOutput={solarPanelEnergyOutput}
                energyConsumption={energyConsumption}
                getRoofArea={getRoofArea}
                downloadPDF={downloadPDF}
                setHome={(position) => {
                    setHomePosition(position);
                    setHome(position);
                }}
                homePosition={homePosition}
                mapRef={mapRef}
                setCanDrawPanels={setCanDrawPanels}
                resetDrawingState={resetDrawingState}
                setAreaType={setAreaType}
                resetMapState={resetMapState}
                currentPage={currentPage}
            />
            <div style={{ width: "65%", height: "100vh", position: "relative" }}>
                <GoogleMap
                    id="map-container"
                    zoom={zoom}
                    center={homePosition || center}
                    mapContainerStyle={{ width: "100%", height: "100%" }}
                    options={options}
                    onLoad={onLoad}
                    onClick={(e) => addBoxPoint(e.latLng?.toJSON())}
                >
                    {boxPoints.map((coordinates, index) => (
                        <Marker
                            key={index}
                            position={coordinates}
                            icon={dotIcon}
                            draggable={false}
                            onClick={() => {
                                if (index === 0 && boxPoints.length >= 3) {
                                    addRoofSegmment(boxPoints);
                                }
                            }}
                        />
                    ))}

                    {roofPanels.map(
                        (panel, panelIndex) =>
                            !panel.isDeleted &&
                            panel.points.map((coordinates, index) => (
                                <Marker
                                    key={`${panelIndex}-${index}`}
                                    position={coordinates}
                                    icon={dotIcon}
                                    draggable={true}
                                    onDrag={(e) => {
                                        const newPosition = e.latLng.toJSON();
                                        handleMarkerDrag(index, panelIndex, newPosition, true);
                                    }}
                                    onDragEnd={(e) => {
                                        const newPosition = e.latLng.toJSON();
                                        handleMarkerDrag(index, panelIndex, newPosition, false);
                                    }}
                                    onClick={() => {
                                        handleOpenModal("Dieser Punkt ist verschiebbar. Um einen neuen Punkt hinzuzufügen, klicken Sie an eine andere Stelle auf der Karte.");
                                    }}
                                />
                            ))
                    )}

                    {home && <Marker position={home} />}
                </GoogleMap>
            </div>

            <Modal
                open={modalOpen}
                onClose={handleCloseModal}
                closeAfterTransition
                sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
                <Fade in={modalOpen}>
                    <Box
                        sx={{
                            backgroundColor: '#073845',
                            borderRadius: 1,
                            padding: 3,
                            boxShadow: 24,
                            minWidth: 300,
                            color: "#E2CAA2",
                        }}
                    >
                        <Typography variant="h6" gutterBottom>
                            Warnung
                        </Typography>
                        <Typography variant="body1" gutterBottom>
                            {modalMessage}
                        </Typography>
                        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                            <Button
                                variant="outlined"
                                color="inherit"
                                onClick={handleCloseModal}
                                sx={{ color: "#E2CAA2", borderColor: "#E2CAA2" }}
                            >
                                OK
                            </Button>
                        </Box>
                    </Box>
                </Fade>
            </Modal>
        </div>
    );
}