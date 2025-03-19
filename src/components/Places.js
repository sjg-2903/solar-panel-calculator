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
          placeholder="Adresse eingeben"
          style={{
            display: "flex",
            alignItems: "center",
            background: "linear-gradient(135deg, #0D5E6B 10%, #0A3A45 100%)",
            padding: "10px 14px",
            borderRadius: "8px",
            color: "#E2CAA2",
            border: "1.5px solid #E2CAA2",
            width: "100%",
            transition: "border-color 0.3s ease-in-out",
            outline: "none",
          }}
        />
        <style>
          {`
            .combobox-input {
              background: linear-gradient(135deg, #0D5E6B 10%, #0A3A45 100%) !important;
            }
            .combobox-input::placeholder {
              color: #B8A48A;
              opacity: 0.8;
            }
            .combobox-input:focus {
              background: linear-gradient(135deg, #0D5E6B 10%, #0A3A45 100%) !important;
              border-color: #E2CAA2 !important;
              outline: none;
            }
          `}
        </style>
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
