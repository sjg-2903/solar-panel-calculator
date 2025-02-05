import React from "react";
import { useLoadScript } from "@react-google-maps/api";
import Map from "./components/Map";
import { MY_GOOGLE_API_KEY } from "./components/GoogleAPIKey";

function App() {
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: MY_GOOGLE_API_KEY,
    libraries: ["places", "geometry"],
  });

  if (!isLoaded) return <div>Loading...</div>;
  return <Map />;
}

export default App;
