import React from "react";
import usePlacesAutocomplete, { getGeocode, getLatLng } from "use-places-autocomplete";
import {
  Combobox,
  ComboboxInput,
  ComboboxPopover,
  ComboboxList,
  ComboboxOption,
} from "@reach/combobox";
import "@reach/combobox/styles.css";
import PropTypes from "prop-types";

const Places = ({ setHome }) => {
  const {
    ready,
    value,
    setValue,
    suggestions: { status, data },
    clearSuggestions,
  } = usePlacesAutocomplete();

  const handleSelect = async (val) => {
    setValue(val, false);
    clearSuggestions();

    const results = await getGeocode({ address: val });
    const { lat, lng } = await getLatLng(results[0]);
    setHome({ lat, lng });
  };

  return (
    <Combobox onSelect={handleSelect}>
      <div
        style={{
          position: "relative",
          zIndex: "1000",
        }}
      >
        <ComboboxInput
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={!ready}
          className="combobox-input"
          placeholder="Search your location..."
          style={{
            display: "flex",
            alignItems: "center",
            background: "rgba(255, 255, 255, 0.9)",
            padding: "10px 14px",
            borderRadius: "8px",
            border: "1.5px solid black",
            width: "100%",
          }}
        />
      </div>
      <ComboboxPopover>
        <ComboboxList
          style={{
            maxHeight: "400px",
            overflowY: "auto",
            zIndex: "2000",
            position: "absolute",
            top: "100%",
            width: "100%",
            backgroundColor: "#fff",
          }}
        >
          {status === "OK" &&
            data.map(({ place_id, description }) => (
              <ComboboxOption key={place_id} value={description} />
            ))}
        </ComboboxList>
      </ComboboxPopover>
    </Combobox>
  );
};


Places.propTypes = {
  setHome: PropTypes.func.isRequired,
};

export default Places;
