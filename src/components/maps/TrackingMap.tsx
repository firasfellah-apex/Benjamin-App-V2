// src/components/maps/TrackingMap.tsx

import React, { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import { cn } from "@/lib/utils";
import { getEnv } from "@/lib/env";

export type TrackingLatLng = { lat: number; lng: number };

interface TrackingMapProps {
  center: TrackingLatLng;
  runnerPosition?: TrackingLatLng;
  customerPosition?: TrackingLatLng;
  zoom?: number;
  height?: string;
  className?: string;
}

const DEFAULT_ZOOM = 14;
const DEFAULT_STYLE = "mapbox://styles/mapbox/navigation-night-v1";

export const TrackingMap: React.FC<TrackingMapProps> = ({
  center,
  runnerPosition,
  customerPosition,
  zoom = DEFAULT_ZOOM,
  height = "220px",
  className,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const runnerMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const customerMarkerRef = useRef<mapboxgl.Marker | null>(null);

  // Initialize access token once
  useEffect(() => {
    const { MAPBOX_ACCESS_TOKEN } = getEnv();
    if (!MAPBOX_ACCESS_TOKEN) {
      console.warn("[TrackingMap] Missing MAPBOX_ACCESS_TOKEN – map will not render.");
      return;
    }
    mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;
  }, []);

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current) return;
    if (mapRef.current) return;

    const { MAPBOX_ACCESS_TOKEN } = getEnv();
    if (!MAPBOX_ACCESS_TOKEN) {
      // No token: leave empty container; parent can decide what to show.
      return;
    }

    try {
      const map = new mapboxgl.Map({
        container: containerRef.current,
        style: DEFAULT_STYLE,
        center: [center.lng, center.lat],
        zoom,
      });

      mapRef.current = map;
    } catch (err) {
      console.error("[TrackingMap] Failed to create Mapbox map", err);
    }
  }, [center.lat, center.lng, zoom]);

  // Update center when props change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    map.setCenter([center.lng, center.lat]);
  }, [center.lat, center.lng]);

  // Helper to create/update a marker
  const upsertMarker = (
    markerRef: React.MutableRefObject<mapboxgl.Marker | null>,
    position: TrackingLatLng | undefined,
    color: string
  ) => {
    const map = mapRef.current;
    if (!map) return;

    if (!position) {
      // Remove if exists
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
      return;
    }

    const lngLat: [number, number] = [position.lng, position.lat];

    if (!markerRef.current) {
      markerRef.current = new mapboxgl.Marker({
        color,
      })
        .setLngLat(lngLat)
        .addTo(map);
    } else {
      markerRef.current.setLngLat(lngLat);
    }
  };

  // Update markers for runner & customer
  useEffect(() => {
    upsertMarker(runnerMarkerRef, runnerPosition, "#22C55E"); // green
  }, [runnerPosition?.lat, runnerPosition?.lng]);

  useEffect(() => {
    upsertMarker(customerMarkerRef, customerPosition, "#3B82F6"); // blue
  }, [customerPosition?.lat, customerPosition?.lng]);

  // Cleanup on unmount
  useEffect(
    () => () => {
      if (runnerMarkerRef.current) {
        runnerMarkerRef.current.remove();
        runnerMarkerRef.current = null;
      }
      if (customerMarkerRef.current) {
        customerMarkerRef.current.remove();
        customerMarkerRef.current = null;
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    },
    []
  );

  return (
    <div
      ref={containerRef}
      className={cn("w-full bg-slate-900", className)}
      style={{ height }}
    />
  );
};

export default TrackingMap;

