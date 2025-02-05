// import { useState, useMemo, useCallback, useRef, useEffect } from "react";
// import {
//     GoogleMap,
//     Marker,
//     DirectionsRenderer,
//     Circle,
//     MarkerClusterer,
//     Polyline,
//     Polygon,
//     DrawingManager,
//     useGoogleMap,
//     useLoadScript
// } from "@react-google-maps/api";
// import Places from "./Places";
// import { unmountComponentAtNode } from "react-dom";
// import React from "react";
// import "./styles.css"; 
// // import Distance from "./distance";

// // The following type aliases from TypeScript have been removed in JavaScript translation:
// const latLngLiteral = {
//     lat: 37.7749, // Latitude
//     lng: -122.4194 // Longitude
//   };

//   const mapOptions = {
//     center: latLngLiteral, // Use the LatLngLiteral object
//     zoom: 8,

//   };


// export default function Map() {
//     const [energyConsumption, setEnergyConsumption] = useState(900);
//     const [selectedLocation, setSelectedLocation] = useState(null); //in kWh
//     const solarPanelWidth = 3.5; //in ft
//     const solarPanelHeight = 5; //in ft
//     const solarPanelArea = solarPanelWidth * solarPanelHeight; //in sq ft
//     const solarPanelEnergyOutput = 48; //in kWh

//     const [zoom, setZoom] = useState(12);
//     const [panelHovering, setPanelHovering] = useState();

//     const [home, setHome] = useState();
//     useEffect(() => {
//         if (home) {
//             setZoom(100);
//         }
//     }, [home]);

//     const mapRef = useRef();
//     const center = useMemo(() => ({ lat: 29.425319, lng: -98.492733 }), []);

//     const options = useMemo(() => ({
//         mapId: "793ef8405dde11b1",
//         disableDefaultUI: true,
//         clickableIcons: false,
//         rotateControl: false,
//         tilt: 0,
//         mapTypeId: 'hybrid',
//         draggableCursor: 'crosshair',
//     }), []);
//     const onLoad = useCallback((map) => {
//         mapRef.current = map;
//     }, []);

//     const dotIcon = {
//         url: "https://www.wsfcu.com/wp-content/uploads/Decorative-Orange-Box-Slider.jpg", // Image URL
//         scaledSize: new window.google.maps.Size(10, 10), // Scaled size of the icon
//         origin: new window.google.maps.Point(0, 0), // The origin point on the image (top-left)
//         anchor: new window.google.maps.Point(5, 5), // The anchor point (center of the icon)
//       };

//     //Handle creating and drawing the current Polyline

//     const [boxPoints, setBoxPoints] = useState([]);
//     const currPolyline = useRef();

//     let addBoxPoint = (coordinates) => {
//         setBoxPoints([...boxPoints, coordinates]);
//     };

//     useEffect(() => {
//         if (boxPoints.length >= 2) {
//             if (currPolyline.current !== undefined) {
//                 currPolyline.current.setMap(null);
//             }
//             const newPolyline = new window.google.maps.Polyline({
//                 path: boxPoints,
//                 geodesic: false,
//                 strokeColor: "#FF0000",
//             });
//             newPolyline.setMap(mapRef.current);
//             // newPolyline.addListener('click', () => {newPolyline.setMap(null);})
//             currPolyline.current = newPolyline;
//         } else {
//             if (currPolyline.current !== undefined) {
//                 currPolyline.current.setMap(null);
//             }
//         }
//     });

//     // Handle creating and drawing the panel Polygons

//     const [roofPanels, setRoofPanels] = useState([]);
//     const [deletedPanels, setDeletedPanels] = useState([]);

//     const CardinalDirection = {
//         north: 0,
//         south: 1,
//         east: 2,
//         west: 3
//     };

//     function drawPoint(points) {
//         const point = new window.google.maps.Marker({
//             position: points,
//             icon: dotIcon
//         });
//         point.setMap(mapRef.current);
//     }

//     class roofPanel {
//         constructor(points, index) {
//             this.isDeleted = false;
//             this.points = points;
//             const panel = new window.google.maps.Polygon({
//                 paths: points,
//                 strokeColor: "#FF0000",
//                 strokeOpacity: 0.8,
//                 strokeWeight: 2,
//                 fillColor: "#FF0000",
//                 fillOpacity: 0.35,
//             });
//             panel.setMap(mapRef.current);
//             panel.addListener('click', () => {
//                 this.delete();
//             });
//             panel.addListener('mouseover', () => { setPanelHovering(index); });
//             panel.addListener('mouseout', () => { setPanelHovering(undefined); });

//             this.area =window.google.maps.geometry.spherical.computeArea(points) * 10.7639; //convert square meters to sqaure feet
//             this.index = index;
//             this.panel = panel;
//             this.solarPanels = [];

//             //Draw solar panels
//             switch (points.length) {
//                 case 3: //If triangle
//                     this.drawSolarPanelsInTriangle(points);
//                 default:
//                     break;
//             }
//         }

//         drawSolarPanelsInTriangle(points) {
//             let yComponentLengths = [];

//             points.forEach((point, index) => {
//                 yComponentLengths.push([]);
//                 points.map((otherPoint) => {
//                     yComponentLengths[index].push(Math.abs(point.lat - otherPoint.lat));
//                 });
//             });

//             let maxVal = 0;
//             let maxLine = [{ lat: 0, lng: 0 }, { lat: 0, lng: 0 }];

//             for (let r = 0; r < yComponentLengths.length; r++) {
//                 for (let c = 0; c < yComponentLengths.length; c++) {
//                     if (yComponentLengths[r][c] > maxVal) {
//                         maxVal = yComponentLengths[r][c];
//                         maxLine[0] = points[r];
//                         maxLine[1] = points[c];
//                     }
//                 }
//             }
//             let northMost;
//             let southMost;
//             if (maxLine[0].lat > maxLine[1].lat) {
//                 northMost = maxLine[0];
//                 southMost = maxLine[1];
//             } else {
//                 northMost = maxLine[1];
//                 southMost = maxLine[0];
//             }

//             let maxLineHeading = window.google.maps.geometry.spherical.computeHeading(northMost, southMost);
//             let solarPanelDistanceOnLine = Math.abs((solarPanelHeight * 0.3048) / (Math.cos(((180 - Math.abs(maxLineHeading)) * (Math.PI / 180))))); //in meters
//             let currPointOnMaxLine = window.google.maps.geometry.spherical.computeOffset(northMost, solarPanelDistanceOnLine, maxLineHeading);

//             let westOfCurrPointOnMaxLine = window.google.maps.geometry.spherical.computeOffset(currPointOnMaxLine, (solarPanelWidth * 0.3048), 270);
//             let eastOfCurrPointOnMaxLine = window.google.maps.geometry.spherical.computeOffset(currPointOnMaxLine, (solarPanelWidth * 0.3048), 90);

//             let canDrawPanels = true;
//             if (window.google.maps.geometry.poly.containsLocation(westOfCurrPointOnMaxLine, this.panel)) {
//                 while (canDrawPanels) {
//                     this.drawRowOfPanels(currPointOnMaxLine, CardinalDirection.west);
//                     let southPointOfNextPanel = window.google.maps.geometry.spherical.computeOffset(currPointOnMaxLine, (2 * solarPanelHeight * 0.3048), 180);
//                     if (southPointOfNextPanel.lat() - southMost.lat < 0) {
//                         canDrawPanels = false;
//                     }
//                     currPointOnMaxLine = window.google.maps.geometry.spherical.computeOffset(currPointOnMaxLine, solarPanelDistanceOnLine, maxLineHeading);
//                 }
//             } else if (window.google.maps.geometry.poly.containsLocation(eastOfCurrPointOnMaxLine, this.panel)) {
//                 while (canDrawPanels) {
//                     this.drawRowOfPanels(currPointOnMaxLine, CardinalDirection.east);
//                     let southPointOfNextPanel = window.google.maps.geometry.spherical.computeOffset(currPointOnMaxLine, (2 * solarPanelHeight * 0.3048), 180);
//                     if (southPointOfNextPanel.lat() - southMost.lat < 0) {
//                         canDrawPanels = false;
//                     }
//                     currPointOnMaxLine = window.google.maps.geometry.spherical.computeOffset(currPointOnMaxLine, solarPanelDistanceOnLine, maxLineHeading);
//                 }
//             }

//             //4. Draw as many solar panels as possible to the left or right----------------------------------

//             //5. Go down 1 row and repeat Step 4 if you are not below the latitude of the southmost point of the longest side, if you can't then terminate----------------------------------

//             return true;
//         }

//         getLngOnLine(startPoint, endPoint, targetLat) {
//             return (targetLat - startPoint.lat) * ((endPoint.lng - startPoint.lng) / (endPoint.lat - startPoint.lat)) + startPoint.lng;
//         }

//         drawRowOfPanels(origin, direction) {
//             switch (direction) {
//                 case CardinalDirection.west:
//                     let topLeftPointWest = window.google.maps.geometry.spherical.computeOffset(origin, (solarPanelWidth * 0.3048), 270);
//                     let bottomRightPointWest = window.google.maps.geometry.spherical.computeOffset(origin, (solarPanelHeight * 0.3048), 180);
//                     let bottomLeftPointWest = window.google.maps.geometry.spherical.computeOffset(bottomRightPointWest, (solarPanelWidth * 0.3048), 270);
//                     let solarPanelVerteciesWest = [origin, topLeftPointWest, bottomLeftPointWest, bottomRightPointWest];

//                     let fullyWithinRoofPanelWest = true;
//                     let anyPointWithinRoofPanelWest = false;
//                     solarPanelVerteciesWest.map((vertex) => {
//                         if (!window.google.maps.geometry.poly.containsLocation(vertex, this.panel)) {
//                             fullyWithinRoofPanelWest = false;
//                         } else {
//                             anyPointWithinRoofPanelWest = true;
//                         }
//                     });

//                     if (fullyWithinRoofPanelWest) {
//                         let newSolarPanel = new window.google.maps.Polygon({
//                             paths: solarPanelVerteciesWest,
//                             strokeColor: "#00FF00",
//                             strokeOpacity: 0.8,
//                             strokeWeight: 2,
//                             fillColor: "#00FF00",
//                             fillOpacity: 0.35,
//                         });
//                         newSolarPanel.addListener('click', () => {
//                             this.delete();
//                         });
//                         newSolarPanel.addListener('mouseover', () => { setPanelHovering(this.index); });
//                         newSolarPanel.addListener('mouseout', () => { setPanelHovering(undefined); });
//                         this.solarPanels.push(newSolarPanel);
//                         this.solarPanels[this.solarPanels.length - 1].setMap(mapRef.current);
//                     }

//                     if (anyPointWithinRoofPanelWest) {
//                         this.drawRowOfPanels(topLeftPointWest, CardinalDirection.west);
//                     }
//                     break;
//                 case CardinalDirection.east:
//                     let topRightPointEast = window.google.maps.geometry.spherical.computeOffset(origin, (solarPanelWidth * 0.3048), 90);
//                     let bottomLeftPointEast = window.google.maps.geometry.spherical.computeOffset(origin, (solarPanelHeight * 0.3048), 180);
//                     let bottomRightPointEast = window.google.maps.geometry.spherical.computeOffset(bottomLeftPointEast, (solarPanelWidth * 0.3048), 90);
//                     let solarPanelVerteciesEast = [origin, topRightPointEast, bottomRightPointEast, bottomLeftPointEast];

//                     let fullyWithinRoofPanelEast = true;
//                     let anyPointWithinRoofPanelEast = false;
//                     solarPanelVerteciesEast.map((vertex) => {
//                         if (!window.google.maps.geometry.poly.containsLocation(vertex, this.panel)) {
//                             fullyWithinRoofPanelEast = false;
//                         } else {
//                             anyPointWithinRoofPanelEast = true;
//                         }
//                     });

//                     if (fullyWithinRoofPanelEast) {
//                         let newSolarPanel = new window.google.maps.Polygon({
//                             paths: solarPanelVerteciesEast,
//                             strokeColor: "#00FF00",
//                             strokeOpacity: 0.8,
//                             strokeWeight: 2,
//                             fillColor: "#00FF00",
//                             fillOpacity: 0.35,
//                         });
//                         newSolarPanel.addListener('click', () => {
//                             this.delete();
//                         });
//                         newSolarPanel.addListener('mouseover', () => { setPanelHovering(this.index); });
//                         newSolarPanel.addListener('mouseout', () => { setPanelHovering(undefined); });
//                         this.solarPanels.push(newSolarPanel);
//                         this.solarPanels[this.solarPanels.length - 1].setMap(mapRef.current);
//                     }

//                     if (anyPointWithinRoofPanelEast) {
//                         this.drawRowOfPanels(topRightPointEast, CardinalDirection.east);
//                     }
//                     break;
//                 default:
//                     break;
//             }
//         }

//         delete() {
//             this.isDeleted = true;
//             this.panel.setMap(null);
//             this.solarPanels.map((panel) => {
//                 panel.setMap(null);
//             });
//             setDeletedPanels(deletedPanels => [...deletedPanels, this.index]);
//         }

//         addBack() {
//             this.isDeleted = false;
//             this.panel.setMap(mapRef.current);
//             this.solarPanels.map((panel) => {
//                 panel.setMap(mapRef.current);
//             });
//             setDeletedPanels(deletedPanels => deletedPanels.filter(item => item !== this.index));
//         }
//     };

//     let addRoofSegmment = (points) => {
//         let index = roofPanels.length;
//         setRoofPanels([...roofPanels, new roofPanel(points, index)]);
//     };

//     let getRoofArea = () => {
//         let area = 0;
//         roofPanels.forEach((panel) => {
//             if (!panel.isDeleted) {
//                 area += panel.area;
//             }
//         });

//         return area;
//     }

//     useEffect(() => {
//         const handleWheel = (e) => {
//           if (e.ctrlKey) {
//             // Prevent zooming on the page but allow zooming in map
//             e.preventDefault();
//           }
//         };

//         // Listen for mouse scroll (wheel) event to prevent page zoom
//         window.addEventListener("wheel", handleWheel, { passive: false });

//         return () => {
//           window.removeEventListener("wheel", handleWheel);
//         };
//     }, []);


//     return( 
//         <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
//         {/* Map Container - Takes up 75% of Screen Height */}
//         <div style={{ width: "100%", height: "105vh", position: "relative" }}>
//             <div style={{
//                 position: "absolute",
//                 top: "20px",
//                 right: "20px",
//                 background: "linear-gradient(to right, #E0F2FE, #C7D2FE)",
//                 padding: "18px 22px",
//                 borderRadius: "14px",
//                 boxShadow: "0 6px 15px rgba(0, 0, 0, 0.2)",
//                 textAlign: "center",
//                 zIndex: 1000,
//                 maxWidth: "320px",
//                 border: "2px solid rgba(255, 255, 255, 0.3)",
//                 backdropFilter: "blur(8px)"
//             }}>
//                 {/* Heading with Sun Icon */}
//                 <div style={{
//                     display: "flex",
//                     alignItems: "center",
//                     gap: "8px",
//                     transform: "scale(1)" ,
//                     marginBottom:"20px"
//                 }}>
//                     {/* Large Sun Icon */}
//                     <span style={{
//                         fontSize: "40px", // Bigger size for prominence
//                         color: "#F59E0B", // Warm solar color
//                         lineHeight: "45px", // Aligns well with text
//                     }}>
//                         🔆
//                     </span>

//                     {/* Text Wrapper */}
//                     <div style={{ textAlign: "left" }}> {/* Move "Solar Roof" to left side */}
//                         <h1 style={{
//                             fontSize: "20px",
//                             fontWeight: "700",
//                             color: "#1E3A8A",
//                             margin: "0",
//                             lineHeight: "24px"
//                         }}>
//                             Solar Roof
//                         </h1>
//                         <h1 style={{
//                             fontSize: "20px",
//                             fontWeight: "700",
//                             color: "#1E3A8A",
//                             margin: "0",
//                             lineHeight: "20px"
//                         }}>
//                             Panel Calculator
//                         </h1>
//                     </div>
//                 </div>


//                 <Places
//                     setHome={(position) => {
//                         setHome(position);
//                         mapRef.current?.panTo(position);
//                         mapRef.current?.setZoom(15);
//                         console.log('Selected Place:', position);
//                     }}
//                 />
//             </div>

//             {/* Google Map */}
//             <GoogleMap
//                 zoom={zoom}
//                 center={center}
//                 mapContainerStyle={{ width: "100%", height: "100%" }}
//                 options={options}
//                 onLoad={onLoad}
//                 onClick={(e) => addBoxPoint(e.latLng?.toJSON())}
//             >
//                 {boxPoints.length > 0 &&
//                     boxPoints.map((coordinates, index) => (
//                         <Marker
//                             key={index}
//                             position={selectedLocation || coordinates}
//                             icon={dotIcon}
//                             onClick={() => {
//                                 if (index === 0 && boxPoints.length >= 3) {
//                                     addRoofSegmment(boxPoints);
//                                     setBoxPoints([]);
//                                 }
//                             }}
//                         />
//                     ))}
//                 {home && <Marker position={home} />}
//             </GoogleMap>
//         </div>

//         {/* Bottom Section - Panels & Summary (No Overlapping!) */}
//         <div style={{
//             width: "100%",
//             display: "flex",
//             flexDirection: "column",
//             alignItems: "center",
//             padding: "20px",
//             background: "white"
//         }}>
//             {/* Panels Section */}
//             <div style={{
//                 width: "100%",
//                 marginBottom: "20px",
//                 padding: "15px",
//                 background: "#f9f9f9",
//                 borderRadius: "8px",
//                 boxShadow: "0 2px 6px rgba(0, 0, 0, 0.1)"
//             }}>
//                 <h2>Drawn Panels</h2>
//                 <p style={{ fontSize: "14px", color: "#666" }}>
//                     Draw polygons over all south, east, and west-facing sections of your roof.
//                 </p>
//                 {roofPanels.map((panel, index) =>
//                     !panel.isDeleted ? (
//                         <div key={index} style={{
//                             background: "white",
//                             padding: "10px",
//                             borderRadius: "5px",
//                             marginTop: "5px",
//                             boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
//                         }}>
//                             <h3>Panel {index + 1}</h3>
//                             <p>Area: {panel.area.toFixed(2)} ft²</p>
//                             {panel.points.length === 3 && (
//                                 <p>Panels: {panel.solarPanels.length} solar panels</p>
//                             )}
//                             <button onClick={() => panel.delete()} style={{
//                                 padding: "5px 10px",
//                                 background: "#dc3545",
//                                 color: "white",
//                                 border: "none",
//                                 borderRadius: "4px",
//                                 cursor: "pointer"
//                             }}>
//                                 Delete
//                             </button>
//                         </div>
//                     ) : null
//                 )}
//             </div>

//             {/* Summary Section */}
//             <div style={{
//                 width: "100%",
//                 padding: "15px",
//                 background: "#f9f9f9",
//                 borderRadius: "8px",
//                 boxShadow: "0 2px 6px rgba(0, 0, 0, 0.1)"
//             }}>
//                 <h2>Summary</h2>
//                 <p>Total Area: <strong>{getRoofArea().toFixed(2)} ft²</strong></p>
//                 <p style={{ fontSize: "14px", color: "#666" }}>Enter your home's average monthly energy consumption:</p>
//                 <input
//                     value={energyConsumption}
//                     onChange={(e) => setEnergyConsumption(Number(e.target.value))}
//                     placeholder="Energy consumption (kWh per month)"
//                     style={{
//                         width: "200px",
//                         padding: "5px",
//                         marginTop: "5px",
//                         borderRadius: "4px",
//                         border: "1px solid #ccc",
//                         textAlign: "center"
//                     }}
//                 />
//                 <p style={{ marginTop: "10px" }}>
//                     You can offset <strong>{((getRoofArea() / solarPanelArea * solarPanelEnergyOutput) / energyConsumption * 100).toFixed(0)}%</strong> of
//                     your home's energy using <strong>{(getRoofArea() / solarPanelArea).toFixed(0)}</strong> solar panels, generating <strong>{(getRoofArea() / solarPanelArea * solarPanelEnergyOutput).toFixed(2)} kWh</strong> per month.
//                 </p>
//             </div>
//         </div>
//     </div>

//     );
// }

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { GoogleMap, Marker } from "@react-google-maps/api";
import Places from "./Places";
import React from "react";
import "./styles.css";
import { MY_GOOGLE_API_KEY } from "./GoogleAPIKey";

const latLngLiteral = {
    lat: 37.7749, // Latitude
    lng: -122.4194 // Longitude
};

const mapOptions = {
    center: latLngLiteral,
    zoom: 8,

};


export default function Map() {
    const [energyConsumption, setEnergyConsumption] = useState(900);
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [solarData, setSolarData] = useState(null);
    const solarPanelWidth = 3.5; //in ft
    const solarPanelHeight = 5; //in ft
    const solarPanelArea = solarPanelWidth * solarPanelHeight; //in sq ft
    const solarPanelEnergyOutput = 48; //in kWh

    const [zoom, setZoom] = useState(12);
    const [panelHovering, setPanelHovering] = useState();

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
    const onLoad = useCallback((map) => {
        mapRef.current = map;
    }, []);

    const dotIcon = {
        url: "https://www.wsfcu.com/wp-content/uploads/Decorative-Orange-Box-Slider.jpg",
        scaledSize: new window.google.maps.Size(10, 10),
        origin: new window.google.maps.Point(0, 0),
        anchor: new window.google.maps.Point(5, 5),
    };

    //Handle creating and drawing the current Polyline

    const [boxPoints, setBoxPoints] = useState([]);
    const currPolyline = useRef();

    let addBoxPoint = (coordinates) => {
        if (boxPoints.length < 4) {
            setBoxPoints([...boxPoints, coordinates]);
        } else {
            if (roofPanels.length > 0) {
                let lastPanel = roofPanels[roofPanels.length - 1];
                lastPanel.delete();
                setRoofPanels(roofPanels.slice(0, -1));
            }
            setBoxPoints([coordinates]);
            console.log("Maximum of four points reached. Old panel removed. Starting a new panel.");
        }
    };

    useEffect(() => {
        if (currPolyline.current !== undefined) {
            currPolyline.current.setMap(null);
        }
        if (boxPoints.length >= 2) {
            const newPolyline = new window.google.maps.Polyline({
                path: boxPoints,
                geodesic: false,
                strokeColor: "#FF0000",
            });
            newPolyline.setMap(mapRef.current);
            currPolyline.current = newPolyline;
        }
    }, [boxPoints]);
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
        constructor(points, index) {
            this.isDeleted = false;
            this.points = points;
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

            this.area = window.google.maps.geometry.spherical.computeArea(points) * 10.7639; //convert square meters to sqaure feet
            this.index = index;
            this.panel = panel;
            this.solarPanels = [];

            //Draw solar panels
            switch (points.length) {
                case 3: //If triangle
                    this.drawSolarPanelsInTriangle(points);
                default:
                    break;
            }
        }

        drawSolarPanelsInTriangle(points) {
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
            let northMost;
            let southMost;
            if (maxLine[0].lat > maxLine[1].lat) {
                northMost = maxLine[0];
                southMost = maxLine[1];
            } else {
                northMost = maxLine[1];
                southMost = maxLine[0];
            }

            let maxLineHeading = window.google.maps.geometry.spherical.computeHeading(northMost, southMost);
            let solarPanelDistanceOnLine = Math.abs((solarPanelHeight * 0.3048) / (Math.cos(((180 - Math.abs(maxLineHeading)) * (Math.PI / 180))))); //in meters
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
                    let bottomLeftPointEast = window.google.maps.geometry.spherical.computeOffset(origin, (solarPanelHeight * 0.3048), 180);
                    let bottomRightPointEast = window.google.maps.geometry.spherical.computeOffset(bottomLeftPointEast, (solarPanelWidth * 0.3048), 90);
                    let solarPanelVerteciesEast = [origin, topRightPointEast, bottomRightPointEast, bottomLeftPointEast];

                    let fullyWithinRoofPanelEast = true;
                    let anyPointWithinRoofPanelEast = false;
                    solarPanelVerteciesEast.map((vertex) => {
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
    };

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

    useEffect(() => {
        const handleWheel = (e) => {
            if (e.ctrlKey) { e.preventDefault(); }
        };
        window.addEventListener("wheel", handleWheel, { passive: false });
        return () => {
            window.removeEventListener("wheel", handleWheel);
        };
    }, []);

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
    useEffect(() => {
        if (boxPoints.length === 4) {
            addRoofSegmment(boxPoints);
            fetchSolarApiData();
        }
    }, [boxPoints]);



    return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
            <div style={{ width: "100%", height: "105vh", position: "relative" }}>
                <div style={{
                    position: "absolute",
                    top: "20px",
                    right: "20px",
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
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        transform: "scale(1)",
                        marginBottom: "20px"
                    }}>

                        <span style={{
                            fontSize: "40px",
                            color: "#F59E0B",
                            lineHeight: "45px",
                        }}>
                            🔆
                        </span>
                        <div style={{ textAlign: "left" }}>
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
                <GoogleMap
                    zoom={zoom}
                    center={center}
                    mapContainerStyle={{ width: "100%", height: "100%" }}
                    options={options}
                    onLoad={onLoad}
                    onClick={(e) => addBoxPoint(e.latLng?.toJSON())}
                >
                    {boxPoints.length > 0 &&
                        boxPoints.map((coordinates, index) => (
                            <Marker
                                key={index}
                                position={selectedLocation || coordinates}
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
                padding: "20px",
                background: "white",
                display: "flex",
                flexDirection: "column",
                alignItems: "center"
            }}>
                <div style={{
                    width: "100%",
                    padding: "15px",
                    background: "#f9f9f9",
                    borderRadius: "8px",
                    boxShadow: "0 2px 6px rgba(0, 0, 0, 0.1)"
                }}>
                    <h2 style={{ textAlign: "center", color: "#1E3A8A" }}>Insight Points</h2>

                    <table style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        background: "white",
                        borderRadius: "8px",
                        overflow: "hidden"
                    }}>
                        <thead>
                            <tr style={{ backgroundColor: "#1E3A8A", color: "white", textAlign: "left" }}>
                                <th style={{ padding: "10px" }}>Metric</th>
                                <th style={{ padding: "10px" }}>Value</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr style={{ backgroundColor: "#E0F2FE" }}>
                                <td style={{ padding: "10px", fontWeight: "bold" }}>Annual Sunshine</td>
                                <td style={{ padding: "10px" }}>
                                    {solarData?.solarPotential?.maxSunshineHoursPerYear
                                        ? `${solarData.solarPotential.maxSunshineHoursPerYear} hours`
                                        : "0 hours"}
                                </td>
                            </tr>
                            <tr style={{ backgroundColor: "#C7D2FE" }}>
                              
                                    <td style={{ padding: "10px", fontWeight: "bold" }}>Roof Area</td>
                                    <td style={{ padding: "10px" }}>{getRoofArea() ? (getRoofArea() * 0.092903).toFixed(2) : "0"} m²</td>

                            </tr>
                            <tr style={{ backgroundColor: "#E0F2FE" }}>
                                <td style={{ padding: "10px", fontWeight: "bold" }}>Annual Power Generation</td>
                                <td style={{ padding: "10px" }}>{(getRoofArea() / solarPanelArea * solarPanelEnergyOutput * 12).toFixed(2) } kWh per year.</td>
                            </tr>
                            <tr style={{ backgroundColor: "#C7D2FE" }}>
                                <td style={{ padding: "10px", fontWeight: "bold" }}>Solar Panels Required</td>
                                <td style={{ padding: "10px" }}>{(getRoofArea() / solarPanelArea).toFixed(0)}</td>
                            </tr>
                            <tr style={{ backgroundColor: "#E0F2FE" }}>
                                <td style={{ padding: "10px", fontWeight: "bold" }}>CO₂ Savings</td>
                                <td style={{ padding: "10px" }}>
                                    {solarData?.solarPotential?.carbonOffsetFactorKgPerMwh
                                        ? `${solarData.solarPotential.carbonOffsetFactorKgPerMwh.toFixed(2)} Kg CO₂/year`
                                        : "0 Kg CO₂/year"}
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    <p style={{ fontSize: "14px", color: "#666", marginTop: "15px" }}>
                        Enter your home's average monthly energy consumption:
                    </p>
                    <input
                        value={energyConsumption}
                        onChange={(e) => setEnergyConsumption(Number(e.target.value))}
                        placeholder="Energy consumption (kWh per month)"
                        style={{
                            width: "200px",
                            padding: "5px",
                            marginTop: "5px",
                            borderRadius: "4px",
                            border: "1px solid #ccc",
                            textAlign: "center"
                        }}
                    />
                    <p style={{ marginTop: "10px", fontSize: "14px", color: "#333" }}>
                        You can offset <strong>{((getRoofArea() / solarPanelArea * solarPanelEnergyOutput * 12) / energyConsumption * 100).toFixed(0)}%</strong> of
                        your home's energy using <strong>{(getRoofArea() / solarPanelArea).toFixed(0)}</strong> solar panels, generating <strong>{(getRoofArea() / solarPanelArea * solarPanelEnergyOutput * 12).toFixed(2)} kWh</strong> per year.
                    </p>
                </div>
            </div>

        </div>

    );
}



