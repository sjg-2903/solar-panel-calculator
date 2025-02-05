
import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { GoogleMap, Marker } from "@react-google-maps/api";
import Places from "./Places";
import React from "react";
import "./styles.css";
import { MY_GOOGLE_API_KEY } from "./GoogleAPIKey";

const latLngLiteral = {
    lat: 51.1657,
    lng: 10.4515
};

const mapOptions = {
    center: latLngLiteral,
    zoom: 6,
};

export default function Map() {
    const [energyConsumption, setEnergyConsumption] = useState(900); // in kWh
    const solarPanelWidth = 3.5; // in ft
    const solarPanelHeight = 5; // in ft
    const solarPanelArea = solarPanelWidth * solarPanelHeight; // in sq ft
    const solarPanelEnergyOutput = 48; // in kWh

    const [zoom, setZoom] = useState(12);
    const [panelHovering, setPanelHovering] = useState();
    const [solarData, setSolarData] = useState(null); //

    const getSelectedAreaCenter = () => {
        if (boxPoints.length === 0) return null;
        let latSum = 0, lngSum = 0;
        boxPoints.forEach(point => {
            latSum += point.lat;
            lngSum += point.lng;
        });
        return {
            lat: latSum / boxPoints.length,
            lng: lngSum / boxPoints.length
        };
    };
    const fetchSolarApiData = async () => {
        const center = getSelectedAreaCenter();
        if (!center) return;
        const url = `https://solar.googleapis.com/v1/buildingInsights:findClosest?location.latitude=${center.lat}&location.longitude=${center.lng}&key=${MY_GOOGLE_API_KEY}`;
        try {
            const response = await fetch(url);
            const data = await response.json();
            console.log("Solar API Data", data);
            if (data.solarPotential) {
                setSolarData(data);
            } else {
                console.error("Solar potential data not found");
            }
        } catch (error) {
            console.error("Error fetching solar data:", error);
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

    const options = useMemo(() => ({
        mapId: "793ef8405dde11b1",
        disableDefaultUI: true,
        clickableIcons: false,
        rotateControl: false,
        tilt: 0,
        mapTypeId: 'hybrid',
        draggableCursor: 'crosshair',
    }), []);

    const onLoad = useCallback((map) => (mapRef.current = map), []);

    const dotIcon = {
        url: "https://www.wsfcu.com/wp-content/uploads/Decorative-Orange-Box-Slider.jpg",
        scaledSize: new window.google.maps.Size(10, 10), // scaled size
        origin: new window.google.maps.Point(0, 0), // origin
        anchor: new window.google.maps.Point(5, 5) // anchor
    };

    // Handle creating and drawing the current Polyline
    const [boxPoints, setBoxPoints] = useState([]);
    const currPolyline = useRef();

    let addBoxPoint = (coordinates) => {
        setBoxPoints([...boxPoints, coordinates]);
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
            });
            newPolyline.setMap(mapRef.current);
            // newPolyline.addListener('click', () => {newPolyline.setMap(null);})
            currPolyline.current = newPolyline;
            fetchSolarApiData();
        } else {
            if (currPolyline.current !== undefined) {
                currPolyline.current.setMap(null);
            }
        }
    });

    // Handle creating and drawing the panel Polygons
    const [roofPanels, setRoofPanels] = useState([]);
    const [deletedPanels, setDeletedPanels] = useState([]);

    const CardinalDirection = {
        north: 0,
        south: 1,
        east: 2,
        west: 3
    };

    function drawPoint(points) {
        const point = new window.google.maps.Marker({
            position: points,
            icon: dotIcon
        });
        point.setMap(mapRef.current);
    }

    class roofPanel {
        isDeleted = false;
        points;
        panel;
        area;
        index;
        solarPanels = [];

        constructor(points, index) {
            const panel = new window.google.maps.Polygon({
                paths: points,
                strokeColor: "#FF0000",
                strokeOpacity: 0.8,
                strokeWeight: 2,
                fillColor: "#FF0000",
                fillOpacity: 0.35,
            });
            panel.setMap(mapRef.current);
            panel.addListener('click', () => {
                this.delete();
            });
            panel.addListener('mouseover', () => { setPanelHovering(index); });
            panel.addListener('mouseout', () => { setPanelHovering(undefined); });

            this.area = window.google.maps.geometry.spherical.computeArea(points) * 10.7639; // convert square meters to square feet
            this.index = index;
            this.points = points;
            this.panel = panel;

            // Draw solar panels
            switch (points.length) {
                case 3: // If triangle
                    this.drawSolarPanelsInTriangle(points);
                default:
                    break;
            }
        }

        drawSolarPanelsInTriangle(points) {
            // 1. Identify side with largest vertical component
            let yComponentLengths = [];

            points.forEach((point, index) => {
                yComponentLengths.push([]);
                points.map((otherPoint) => {
                    yComponentLengths[index].push(Math.abs(point.lat - otherPoint.lat));
                });
            });

            let maxVal = 0;
            let maxLine = [{ lat: 0, lng: 0 }, { lat: 0, lng: 0 }];

            for (let r = 0; r < yComponentLengths.length; r++) {
                for (let c = 0; c < yComponentLengths.length; c++) {
                    if (yComponentLengths[r][c] > maxVal) {
                        maxVal = yComponentLengths[r][c];
                        maxLine[0] = points[r];
                        maxLine[1] = points[c];
                    }
                }
            }

            // 2. Identify northernmost point on line
            let northMost, southMost;
            if (maxLine[0].lat > maxLine[1].lat) {
                northMost = maxLine[0];
                southMost = maxLine[1];
            } else {
                northMost = maxLine[1];
                southMost = maxLine[0];
            }

            let maxLineHeading = window.google.maps.geometry.spherical.computeHeading(northMost, southMost);
            let solarPanelDistanceOnLine = Math.abs((solarPanelHeight * 0.3048) / (Math.cos(((180 - Math.abs(maxLineHeading)) * (Math.PI / 180)))));
            let currPointOnMaxLine = window.google.maps.geometry.spherical.computeOffset(northMost, solarPanelDistanceOnLine, maxLineHeading);

            let westOfCurrPointOnMaxLine = window.google.maps.geometry.spherical.computeOffset(currPointOnMaxLine, (solarPanelWidth * 0.3048), 270);
            let eastOfCurrPointOnMaxLine = window.google.maps.geometry.spherical.computeOffset(currPointOnMaxLine, (solarPanelWidth * 0.3048), 90);

            let canDrawPanels = true;
            if (window.google.maps.geometry.poly.containsLocation(westOfCurrPointOnMaxLine, this.panel)) {
                while (canDrawPanels) {
                    this.drawRowOfPanels(currPointOnMaxLine, CardinalDirection.west);
                    let southPointOfNextPanel = window.google.maps.geometry.spherical.computeOffset(currPointOnMaxLine, (2 * solarPanelHeight * 0.3048), 180);
                    if (southPointOfNextPanel.lat() - southMost.lat < 0) {
                        canDrawPanels = false;
                    }
                    currPointOnMaxLine = window.google.maps.geometry.spherical.computeOffset(currPointOnMaxLine, solarPanelDistanceOnLine, maxLineHeading);
                }
            } else if (window.google.maps.geometry.poly.containsLocation(eastOfCurrPointOnMaxLine, this.panel)) {
                while (canDrawPanels) {
                    this.drawRowOfPanels(currPointOnMaxLine, CardinalDirection.east);
                    let southPointOfNextPanel = window.google.maps.geometry.spherical.computeOffset(currPointOnMaxLine, (2 * solarPanelHeight * 0.3048), 180);
                    if (southPointOfNextPanel.lat() - southMost.lat < 0) {
                        canDrawPanels = false;
                    }
                    currPointOnMaxLine = window.google.maps.geometry.spherical.computeOffset(currPointOnMaxLine, solarPanelDistanceOnLine, maxLineHeading);
                }
            }

            return true;
        }

        getLngOnLine(startPoint, endPoint, targetLat) {
            return (targetLat - startPoint.lat) * ((endPoint.lng - startPoint.lng) / (endPoint.lat - startPoint.lat)) + startPoint.lng;
        }

        drawRowOfPanels(origin, direction) {
            switch (direction) {
                case CardinalDirection.west:
                    let topLeftPointWest = window.google.maps.geometry.spherical.computeOffset(origin, (solarPanelWidth * 0.3048), 270);
                    let bottomRightPointWest = window.google.maps.geometry.spherical.computeOffset(origin, (solarPanelHeight * 0.3048), 180);
                    let bottomLeftPointWest = window.google.maps.geometry.spherical.computeOffset(bottomRightPointWest, (solarPanelWidth * 0.3048), 270);
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
                        newSolarPanel.addListener('click', () => {
                            this.delete();
                        });
                        newSolarPanel.addListener('mouseover', () => { setPanelHovering(this.index); });
                        newSolarPanel.addListener('mouseout', () => { setPanelHovering(undefined); });
                        this.solarPanels.push(newSolarPanel);
                        this.solarPanels[this.solarPanels.length - 1].setMap(mapRef.current);
                    }

                    if (anyPointWithinRoofPanelWest) {
                        this.drawRowOfPanels(topLeftPointWest, CardinalDirection.west);
                    }
                    break;
                case CardinalDirection.east:
                    let topRightPointEast = window.google.maps.geometry.spherical.computeOffset(origin, (solarPanelWidth * 0.3048), 90);
                    let bottomRightPointEast = window.google.maps.geometry.spherical.computeOffset(origin, (solarPanelHeight * 0.3048), 180);
                    let bottomLeftPointEast = window.google.maps.geometry.spherical.computeOffset(bottomRightPointEast, (solarPanelWidth * 0.3048), 90);
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
                        newSolarPanel.addListener('click', () => {
                            this.delete();
                        });
                        newSolarPanel.addListener('mouseover', () => { setPanelHovering(this.index); });
                        newSolarPanel.addListener('mouseout', () => { setPanelHovering(undefined); });
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

        delete() {
            this.isDeleted = true;
            this.panel.setMap(null);
            this.solarPanels.map((panel) => {
                panel.setMap(null);
            });
            setDeletedPanels(deletedPanels => [...deletedPanels, this.index]);
        }

        addBack() {
            this.isDeleted = false;
            this.panel.setMap(mapRef.current);
            this.solarPanels.map((panel) => {
                panel.setMap(mapRef.current);
            });
            setDeletedPanels(deletedPanels => deletedPanels.filter(item => item !== this.index));
        }
    }

    let addRoofSegmment = (points) => {
        let index = roofPanels.length;
        setRoofPanels([...roofPanels, new roofPanel(points, index)]);
    };

    let getRoofArea = () => {
        let area = 0;
        roofPanels.forEach((panel) => {
            if (!panel.isDeleted) {
                area += panel.area;
            }
        });

        return area;
    }



    return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
            {/* Map Container - Takes up 75% of Screen Height */}
            <div style={{ width: "100%", height: "105vh", position: "relative" }}>
                <div style={{
                    position: "absolute",
                    top:  "60px",
                    right: "10px",
                    background: "linear-gradient(to right, #E0F2FE, #C7D2FE)",
                    padding: "18px 22px",
                    borderRadius: "14px",
                    boxShadow: "0 6px 15px rgba(0, 0, 0, 0.2)",
                    textAlign: "center",
                    zIndex: 1000,
                    maxWidth: "320px",
                    border: "2px solid rgba(255, 255, 255, 0.3)",
                    backdropFilter: "blur(8px)"
                }}>
                    {/* Heading with Sun Icon */}
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        transform: "scale(1)",
                        marginBottom: "20px"
                    }}>
                        {/* Large Sun Icon */}
                        <span style={{
                            fontSize: "40px", // Bigger size for prominence
                            color: "#F59E0B", // Warm solar color
                            lineHeight: "45px", // Aligns well with text
                        }}>
                            🔆
                        </span>

                        {/* Text Wrapper */}
                        <div style={{ textAlign: "left" }}> {/* Move "Solar Roof" to left side */}
                            <h1 style={{
                                fontSize: "20px",
                                fontWeight: "700",
                                color: "#1E3A8A",
                                margin: "0",
                                lineHeight: "24px"
                            }}>
                                Solar Roof
                            </h1>
                            <h1 style={{
                                fontSize: "20px",
                                fontWeight: "700",
                                color: "#1E3A8A",
                                margin: "0",
                                lineHeight: "20px"
                            }}>
                                Panel Calculator
                            </h1>
                        </div>
                    </div>


                    <Places
                        setHome={(position) => {
                            setHome(position);
                            mapRef.current?.panTo(position);
                            mapRef.current?.setZoom(15);
                            console.log('Selected Place:', position);
                        }}
                    />
                </div>

                {/* Google Map */}
                <GoogleMap
                    zoom={zoom}
                    center={center}
                    mapContainerStyle={{ width: "100%", height: "100%" }}
                    options={mapOptions}
                    onLoad={onLoad}
                    onClick={(e) => addBoxPoint(e.latLng?.toJSON())}
                >
                    {boxPoints.length > 0 &&
                        boxPoints.map((coordinates, index) => (
                            <Marker
                                key={index}
                                position={coordinates}
                                icon={dotIcon}
                                onClick={() => {
                                    if (index === 0 && boxPoints.length >= 3) {
                                        addRoofSegmment(boxPoints);
                                        setBoxPoints([]);
                                    }
                                }}
                            />
                        ))}
                    {home && <Marker position={home} />}
                </GoogleMap>
            </div>

            {/* Bottom Section - Panels & Summary (No Overlapping!) */}
            <div style={{
                width: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "20px",
                background: "white"
            }}>
                {/* Panels Section */}
                <div style={{
                    width: "100%",
                    marginBottom: "20px",
                    padding: "15px",
                    background: "#f9f9f9",
                    borderRadius: "8px",
                    boxShadow: "0 2px 6px rgba(0, 0, 0, 0.1)"
                }}>
                    <h2>Drawn Panels</h2>
                    <p style={{ fontSize: "14px", color: "#666" }}>
                        Draw polygons over all south, east, and west-facing sections of your roof.
                    </p>
                    {roofPanels.map((panel, index) =>
                        !panel.isDeleted ? (
                            <div key={index} style={{
                                background: "white",
                                padding: "10px",
                                borderRadius: "5px",
                                marginTop: "5px",
                                boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                            }}>
                                <h3>Panel {index + 1}</h3>
                                <table style={{
                                    width: "100%",
                                    borderCollapse: "collapse",
                                    marginTop: "10px",
                                    marginBottom: "10px",
                                    textAlign: "left"
                                }}>
                                    <thead>
                                        <tr style={{ background: "#f1f1f1" }}>
                                            <th style={{ border: "1px solid #ddd", padding: "8px" }}>Metric</th>
                                            <th style={{ border: "1px solid #ddd", padding: "8px" }}>Value</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td style={{ border: "1px solid #ddd", padding: "8px" }}>Roof Area</td>
                                            <td style={{ border: "1px solid #ddd", padding: "8px" }}>{(panel.area * 0.092903).toFixed(2)} m²</td>
                                        </tr>
                                        <tr>
                                            <td style={{ border: "1px solid #ddd", padding: "8px" }}>Solar Panels Required</td>
                                            <td style={{ border: "1px solid #ddd", padding: "8px" }}>{(panel.area / solarPanelArea).toFixed(0)}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ border: "1px solid #ddd", padding: "8px" }}>Annual Power Generation</td>
                                            <td style={{ border: "1px solid #ddd", padding: "8px" }}>{((panel.area / solarPanelArea * solarPanelEnergyOutput * 12) / energyConsumption * 100).toFixed(2)} kWh/year</td>
                                        </tr>
                                    </tbody>
                                </table>

                                {panel.points.length === 3 && (
                                    <p>Panels: {panel.solarPanels.length} solar panels</p>
                                )}
                                <button onClick={() => panel.delete()} style={{
                                    padding: "5px 10px",
                                    background: "#dc3545",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "4px",
                                    cursor: "pointer"
                                }}>
                                    Delete
                                </button>
                            </div>
                        ) : null
                    )}
                </div>

                {/* Summary Section */}
                <div style={{
                    width: "100%",
                    padding: "15px",
                    background: "#f9f9f9",
                    borderRadius: "8px",
                    boxShadow: "0 2px 6px rgba(0, 0, 0, 0.1)"
                }}>
                    <h2>Summary</h2>

                    {/* Summary Metrics Table */}
                    <table style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        marginBottom: "10px",
                        textAlign: "left"
                    }}>
                        <thead>
                            <tr style={{ background: "#f1f1f1" }}>
                                <th style={{ border: "1px solid #ddd", padding: "8px" }}>Metric</th>
                                <th style={{ border: "1px solid #ddd", padding: "8px" }}>Value</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style={{ border: "1px solid #ddd", padding: "8px" }}>Total Area</td>
                                <td style={{ border: "1px solid #ddd", padding: "8px" }}>{(getRoofArea() * 0.092903).toFixed(2)} m²</td>
                            </tr>
                            <tr>
                                <td style={{ border: "1px solid #ddd", padding: "8px" }}>Total Panels to be Used</td>
                                <td style={{ border: "1px solid #ddd", padding: "8px" }}>{(getRoofArea() / solarPanelArea).toFixed(0)}</td>
                            </tr>
                            <tr>
                                <td style={{ border: "1px solid #ddd", padding: "8px" }}>Annual Power Generation</td>
                                <td style={{ border: "1px solid #ddd", padding: "8px" }}>{((getRoofArea() / solarPanelArea * solarPanelEnergyOutput * 12)).toFixed(2)} kWh/year</td>
                            </tr>
                            {solarData && (
                                <><tr>
                                    <td style={{ border: "1px solid #ddd", padding: "8px" }}>Annual Sunshine Hours </td>
                                    <td style={{ border: "1px solid #ddd", padding: "8px" }}>{solarData.solarPotential.maxSunshineHoursPerYear.toFixed(2)} hours </td>
                                </tr><tr>
                                        <td style={{ border: "1px solid #ddd", padding: "8px" }}>CO2 Savings</td>
                                        <td style={{ border: "1px solid #ddd", padding: "8px" }}>{solarData.solarPotential.carbonOffsetFactorKgPerMwh.toFixed(2)} Kg CO₂/year</td>
                                    </tr></>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}



