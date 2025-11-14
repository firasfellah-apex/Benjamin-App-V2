// src/pages/debug/DebugMapPage.tsx
import React from "react";
import { BenjaminMap } from "@/components/maps/BenjaminMap";

export default function DebugMapPage() {
  const center = { lat: 25.7617, lng: -80.1918 };

  return (
    <div
      style={{
        width: "100%",
        height: "100vh",               // FULL REAL HEIGHT
        background: "orange",
        display: "block",              // NOT FLEX
        overflow: "visible",           // NOT HIDDEN
      }}
    >
      <div
        style={{
          width: "100%",
          height: "300px",             // FIXED PIXEL HEIGHT
          border: "4px solid red",
          marginTop: "40px",
        }}
      >
        <BenjaminMap center={center} zoom={14} height="300px" />
      </div>
    </div>
  );
}
