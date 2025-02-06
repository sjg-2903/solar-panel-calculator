import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { GoogleMap, Marker } from "@react-google-maps/api";
import Places from "./Places";
import React from "react";
import "./styles.css";

const latLngLiteral = {
    lat: 51.1657,
    lng: 10.4515
};

const mapOptions = {
    center: latLngLiteral,
    zoom: 6,
};



export default function Map() {
    const [energyConsumption, setEnergyConsumption] = useState(900);
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



    const fetchSolarApiData = async (center) => {
        const url = `https://power.larc.nasa.gov/api/temporal/climatology/point?parameters=ALLSKY_SFC_SW_DWN&community=RE&longitude=${center.lng}&latitude=${center.lat}&format=JSON`;
        try {
            const response = await fetch(url);
            const data = await response.json();
            if (data?.properties?.parameter?.ALLSKY_SFC_SW_DWN?.ANN) {
                const annualIrradiance = data.properties.parameter.ALLSKY_SFC_SW_DWN.ANN; // kWh/m²/day
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

        constructor(points, index, solarData) {
            const panel = new window.google.maps.Polygon({
                paths: points,
                strokeOpacity: 0.8,
                strokeWeight: 2,
                fillOpacity: 0.35,
            });
            panel.setMap(mapRef.current);
            panel.addListener('click', () => {
                this.delete();
            });
            panel.addListener('mouseover', () => { setPanelHovering(index); });
            panel.addListener('mouseout', () => { setPanelHovering(undefined); });
            this.updateColor();
            this.area = window.google.maps.geometry.spherical.computeArea(points) * 10.7639; // convert square meters to square feet
            this.index = index;
            this.points = points;
            this.solarData = solarData;
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

            // 2. Identify northernmost and southernmost points
            let [northMost, southMost] = maxLine[0].lat > maxLine[1].lat ? [maxLine[0], maxLine[1]] : [maxLine[1], maxLine[0]];

            // 3. Compute panel placement along the max vertical line
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

                // Move to the next row
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

        getFillColor(sunshineHours) {
            if (sunshineHours < 500) {
                return "#FFFFFF"; // White for less than 500 hours
            } else if (sunshineHours < 1000) {
                return "#FFD700"; // Yellow for 500 to 999 hours
            } else if (sunshineHours < 1500) {
                return "#FFA500"; // Orange for 1000 to 1499 hours
            } else if (sunshineHours < 2000) {
                return "#FF0000"; // Red for 1500 to 1999 hours
            } else {
                return "#8B0000"; // Dark red for 2000 and above
            }
        }
        updateColor() {
            if (this.solarData && this.solarData.maxSunshineHoursPerYear !== undefined) {
                const color = this.getFillColor(this.solarData.maxSunshineHoursPerYear);
                this.panel.setOptions({
                    fillColor: color,
                    strokeColor: color
                });
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

    let addRoofSegmment = async (points) => {
        let index = roofPanels.length;
        const center = getSelectedAreaCenter(points);
        if (center) {
            const newPanel = new roofPanel(points, index, null);
            setRoofPanels([...roofPanels, newPanel]);
            setBoxPoints([]);
            const solarData = await fetchSolarApiData(center);
            if (solarData) {
                newPanel.solarData = solarData;
                newPanel.updateColor();
                setRoofPanels(prevPanels => [...prevPanels]);
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
    }

    const tdStyle = {
        padding: "10px",
        border: "1px solid black",
        background: "#fff"
    };

    return (
        <div style={{ display: "flex", height: "100vh", width: "100%" }}>
            <div style={{
                width: "30%",
                height: "100vh",
                overflowY: "auto",
                background: "linear-gradient(to right, #E0F2FE, #C7D2FE)",
                padding: "20px",
                boxShadow: "4px 0 10px rgba(0, 0, 0, 0.1)"
            }}>
                <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "20px"
                }}>
                    <span style={{ fontSize: "40px", color: "#F59E0B" }}>🔆</span>
                    <div>
                        <h1 style={{ fontSize: "22px", fontWeight: "700", color: "#1E3A8A", margin: "0" }}>Solar Roof</h1>
                        <h2 style={{ fontSize: "18px", fontWeight: "600", color: "#1E3A8A", margin: "0" }}>Panel Calculator</h2>
                    </div>
                </div>
                <Places
                    setHome={(position) => {
                        setHome(position);
                        mapRef.current?.panTo(position);
                        mapRef.current?.setZoom(15);
                    }}
                />
                <div style={{
                    background: "white",
                    padding: "15px",
                    borderRadius: "8px",
                    boxShadow: "0 2px 6px rgba(0, 0, 0, 0.1)",
                    marginTop: "20px"
                }}>
                    <h2>Drawn Panels</h2>
                    <p style={{ fontSize: "14px", color: "#666" }}>
                        Draw polygons over south, east, and west-facing sections of your roof.
                    </p>
                    {roofPanels.map((panel, index) =>
                        !panel.isDeleted ? (
                            <details key={index} style={{
                                background: "white",
                                padding: "10px",
                                borderRadius: "5px",
                                marginTop: "5px",
                                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                                cursor: "pointer"
                            }}>
                                <summary style={{
                                    listStyle: 'none',
                                    fontWeight: 'bold',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <span>Panel {index + 1}</span>
                                    <span style={{ fontSize: '1.2em' }}>▼</span>
                                </summary>
                                <table style={{
                                    width: "100%",
                                    borderCollapse: "collapse",
                                    marginTop: "10px",
                                    marginBottom: "10px",
                                    textAlign: "left",
                                    border: "1px solid black",
                                    background: "#f9f9f9"
                                }}>
                                    <thead>
                                        <tr style={{ background: "#007bff", color: "white" }}>
                                            <th style={{ padding: "10px", border: "1px solid black", background: "grey" }}>Property</th>
                                            <th style={{ padding: "10px", border: "1px solid black", background: "grey" }}>Value</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr><td style={tdStyle}>Roof Area</td><td style={tdStyle}>{(panel.area * 0.092903).toFixed(2)} m²</td></tr>
                                        <tr><td style={tdStyle}>Solar Panels</td><td style={tdStyle}>{(panel.area / solarPanelArea).toFixed(0)}</td></tr>
                                        <tr><td style={tdStyle}>Power Generation</td><td style={tdStyle}>{((panel.area / solarPanelArea * solarPanelEnergyOutput * 12) / energyConsumption * 100).toFixed(2)} kWh/year</td></tr>
                                        {panel.solarData ? (
                                            <>
                                                <tr><td style={tdStyle}>Sunshine Hours</td><td style={tdStyle}>{panel.solarData.maxSunshineHoursPerYear.toFixed(2)} hours</td></tr>
                                                <tr><td style={tdStyle}>CO2 Savings</td><td style={tdStyle}>{panel.solarData.carbonOffsetFactorKgPerMwh.toFixed(2)} Kg CO₂/year</td></tr>
                                            </>
                                        ) : (
                                            <>
                                                <tr><td style={tdStyle}>Sunshine Hours</td><td style={tdStyle}>Fetching...</td></tr>
                                                <tr><td style={tdStyle}>CO2 Savings</td><td style={tdStyle}>Fetching...</td></tr>
                                            </>
                                        )}
                                    </tbody>
                                </table>
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
                            </details>
                        ) : null
                    )}
                </div>


                <div style={{
                    background: "white",
                    padding: "15px",
                    borderRadius: "8px",
                    boxShadow: "0 2px 6px rgba(0, 0, 0, 0.1)",
                    marginTop: "20px"
                }}>
                    <h2>Summary</h2>
                    <table style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        marginBottom: "10px",
                        textAlign: "left"
                    }}>
                        <thead>
                            <tr style={{ background: "#007bff", color: "white" }}>
                                <th style={{ padding: "10px", border: "1px solid black", background: "grey" }}>Property</th>
                                <th style={{ padding: "10px", border: "1px solid black", background: "grey" }}>Value</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr><td style={tdStyle}>Total Area</td><td style={tdStyle}>{(getRoofArea() * 0.092903).toFixed(2)} m²</td></tr>
                            <tr><td style={tdStyle}>Total Panels</td><td style={tdStyle}>{(getRoofArea() / solarPanelArea).toFixed(0)}</td></tr>
                            <tr><td style={tdStyle}>Annual Power Generation</td>
                                <td style={tdStyle}>
                                    {roofPanels.reduce((total, panel) =>
                                        !panel.isDeleted
                                            ? total + (((panel.area / solarPanelArea) * solarPanelEnergyOutput * 12) / energyConsumption * 100)
                                            : total
                                        , 0).toFixed(2)} kWh/year
                                </td>
                            </tr>

                            {roofPanels.filter(panel => !panel.isDeleted && panel.solarData).length > 0 && (
                                <>
                                    <tr>
                                        <td style={tdStyle}>Average Sunshine Hours</td>
                                        <td style={tdStyle}>{(
                                            roofPanels.reduce((sum, panel) =>
                                                !panel.isDeleted && panel.solarData
                                                    ? sum + panel.solarData.maxSunshineHoursPerYear
                                                    : sum, 0) /
                                            roofPanels.filter(panel => !panel.isDeleted && panel.solarData).length
                                        ).toFixed(2)} hours</td>
                                    </tr>
                                    <tr>
                                        <td style={tdStyle}>Average CO2 Savings</td>
                                        <td style={tdStyle}>{(
                                            roofPanels.reduce((sum, panel) =>
                                                !panel.isDeleted && panel.solarData
                                                    ? sum + panel.solarData.carbonOffsetFactorKgPerMwh
                                                    : sum, 0) /
                                            roofPanels.filter(panel => !panel.isDeleted && panel.solarData).length
                                        ).toFixed(2)} Kg CO₂/year</td>
                                    </tr>
                                </>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            <div style={{
                width: "70%",
                height: "100vh",
                position: "relative"
            }}>
                <GoogleMap
                    zoom={zoom}
                    center={center}
                    mapContainerStyle={{ width: "100%", height: "100%" }}
                    options={mapOptions}
                    onLoad={onLoad}
                    onClick={(e) => addBoxPoint(e.latLng?.toJSON())}
                >
                    {boxPoints.map((coordinates, index) => (
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
        </div>

    );
}



