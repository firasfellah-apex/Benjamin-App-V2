/**
 * Runner Directions Map Component
 * 
 * Shows Mapbox map with directions for runners:
 * - Before Cash Withdrawn: Directions to ATM
 * - After Cash Withdrawn: Directions to Customer
 * 
 * Uses Mapbox Directions API for route visualization
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { getEnv } from '@/lib/env';
import { cn } from '@/lib/utils';
import { BENJAMIN_COLORS } from '@/lib/mapboxTheme';
import { Layers, X, Focus, Pyramid, Diamond } from 'lucide-react';
import { IconButton } from '@/components/ui/icon-button';
import { motion, AnimatePresence } from 'framer-motion';

// Layer preview images
import map3dPreview from '@/assets/illustrations/3d-map-layer.png';
import mapStandardPreview from '@/assets/illustrations/standard-map-layer.png';
import mapSatellitePreview from '@/assets/illustrations/satellite-map-layer.png';

// Map style options for layer switcher
export type MapStyleType = '3d' | 'standard' | 'satellite';

const MAP_STYLES: Record<MapStyleType, { url: string; label: string; is3D: boolean; zoom: number }> = {
  '3d': {
    url: 'mapbox://styles/mapbox/dark-v11',
    label: '3D',
    is3D: true,
    zoom: 15, // Higher zoom to see 3D buildings
  },
  'standard': {
    url: 'mapbox://styles/mapbox/streets-v12',
    label: 'Standard',
    is3D: false,
    zoom: 13,
  },
  'satellite': {
    url: 'mapbox://styles/mapbox/satellite-streets-v12',
    label: 'Satellite',
    is3D: false,
    zoom: 13,
  },
};

// 3D Buildings layer configuration
const add3DBuildingsLayer = (map: mapboxgl.Map) => {
  // Check if layer already exists
  if (map.getLayer('3d-buildings')) return;
  
  // Find the first symbol layer to insert buildings below labels
  const layers = map.getStyle()?.layers;
  let labelLayerId: string | undefined;
  if (layers) {
    for (const layer of layers) {
      if (layer.type === 'symbol' && layer.layout?.['text-field']) {
        labelLayerId = layer.id;
        break;
      }
    }
  }
  
  // Add 3D buildings layer
  map.addLayer(
    {
      id: '3d-buildings',
      source: 'composite',
      'source-layer': 'building',
      filter: ['==', 'extrude', 'true'],
      type: 'fill-extrusion',
      minzoom: 14,
      paint: {
        'fill-extrusion-color': [
          'interpolate',
          ['linear'],
          ['get', 'height'],
          0, '#1A1A1A',
          50, '#252525',
          100, '#2A2A2A',
          200, '#1A1A1A',
        ],
        'fill-extrusion-height': ['get', 'height'],
        'fill-extrusion-base': ['get', 'min_height'],
        'fill-extrusion-opacity': 0.9,
      },
    },
    labelLayerId
  );
};

export interface Location {
  lat: number;
  lng: number;
  address?: string;
}

interface RunnerDirectionsMapProps {
  /** Starting location (runner's current position or ATM) */
  origin: Location;
  /** Destination location (ATM or Customer) */
  destination: Location;
  /** Map title/heading */
  title?: string;
  /** Custom className */
  className?: string;
  /** Map height */
  height?: string;
  /** Bottom padding for map fitting (to account for bottom sheet) */
  bottomPadding?: number;
  /** Whether the map is interactive (default: true for runner, false for customer) */
  interactive?: boolean;
  /** Whether to hide the "Open in Maps" button (default: false) */
  hideOpenInMaps?: boolean;
  /** Avatar URL for the origin marker */
  originAvatarUrl?: string | null;
  /** Avatar URL for the destination marker */
  destinationAvatarUrl?: string | null;
  /** Whether to show recenter button when user pans away (default: false) */
  showRecenterButton?: boolean;
  /** Whether to show the layer switcher button (default: false) */
  showLayerSwitcher?: boolean;
}

// Dummy locations for testing (Miami area)
const DUMMY_ORIGIN: Location = {
  lat: 25.7617,
  lng: -80.1918,
  address: 'Current Location, Miami, FL'
};

const DUMMY_ATM: Location = {
  lat: 25.7683,
  lng: -80.1937,
  address: 'ATM Location, Brickell, Miami, FL'
};

const DUMMY_CUSTOMER: Location = {
  lat: 25.7750,
  lng: -80.1950,
  address: 'Customer Address, Downtown Miami, FL'
};

// Helper function to create avatar marker element
function createAvatarMarkerElement(avatarUrl: string | null | undefined, fallbackColor: string, size: number = 40): HTMLElement {
  const el = document.createElement('div');
  el.style.width = `${size}px`;
  el.style.height = `${size}px`;
  el.style.borderRadius = '50%';
  el.style.border = '3px solid white';
  el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
  el.style.overflow = 'hidden';
  el.style.backgroundColor = fallbackColor;
  
  if (avatarUrl) {
    const img = document.createElement('img');
    img.src = avatarUrl;
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'cover';
    img.onerror = () => {
      el.innerHTML = `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:${size * 0.4}px;">👤</div>`;
    };
    el.appendChild(img);
  } else {
    el.innerHTML = `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:${size * 0.4}px;">👤</div>`;
  }
  
  return el;
}

export function RunnerDirectionsMap({
  origin,
  destination,
  title: _title,
  className,
  height = '400px',
  bottomPadding = 50,
  interactive = true,
  hideOpenInMaps = false,
  originAvatarUrl,
  destinationAvatarUrl,
  showRecenterButton = false,
  showLayerSwitcher = false,
}: RunnerDirectionsMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [routeData, setRouteData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  // const [mapLoaded, setMapLoaded] = useState(false);
  const initializationAttemptedRef = useRef(false);
  
  // Layer switcher state
  const [showLayerModal, setShowLayerModal] = useState(false);
  const [currentMapStyle, setCurrentMapStyle] = useState<MapStyleType>('3d');
  const currentMapStyleRef = useRef<MapStyleType>('3d');
  
  // Recenter button state
  const [showRecenter, setShowRecenter] = useState(false);
  const userInteractedRef = useRef(false);
  const isProgrammaticMoveRef = useRef(false); // Flag to ignore programmatic movements
  const routeBoundsRef = useRef<mapboxgl.LngLatBounds | null>(null);
  const routeGeometryRef = useRef<any>(null);
  
  // Pitch toggle state (for 3D mode only) - default is flat (0°)
  const [isTilted, setIsTilted] = useState(false);
  
  // Static route layer ID to avoid collisions
  const ROUTE_SOURCE_ID = 'runner-route-source';
  const ROUTE_LAYER_ID = 'runner-route-layer';

  // Initialize Mapbox access token
  useEffect(() => {
    const { MAPBOX_ACCESS_TOKEN } = getEnv();
    if (!MAPBOX_ACCESS_TOKEN) {
      console.warn('[RunnerDirectionsMap] Missing MAPBOX_ACCESS_TOKEN');
      setLoading(false);
      return;
    }
    mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;
  }, []);

  // Function to initialize the map
  const initializeMap = useCallback(() => {
    // Check if map already exists and is valid
    if (mapRef.current) {
      if (mapRef.current.getContainer() && mapRef.current.getContainer().parentNode) {
        return;
      } else {
        try { mapRef.current.remove(); } catch { /* ignore */ }
        mapRef.current = null;
        initializationAttemptedRef.current = false;
      }
    }

      if (initializationAttemptedRef.current) return;
      if (!mapContainerRef.current) return;
      if (!mapContainerRef.current.parentNode) return;
      initializationAttemptedRef.current = true;

    const { MAPBOX_ACCESS_TOKEN } = getEnv();
    if (!MAPBOX_ACCESS_TOKEN) {
      console.error('[RunnerDirectionsMap] Missing MAPBOX_ACCESS_TOKEN');
      setLoading(false);
      return;
    }

    const container = mapContainerRef.current;
    
    // Ensure container has dimensions
    const containerWidth = container.offsetWidth || container.clientWidth;
    const containerHeight = container.offsetHeight || container.clientHeight;
    if (containerWidth === 0 || containerHeight === 0) {
      // Container has no dimensions - retry after a short delay
      initializationAttemptedRef.current = false;
      setTimeout(() => initializeMap(), 100);
      return;
    }
    
    try {
      const centerLng = destination.lng;
      const centerLat = destination.lat;

      const currentStyle = MAP_STYLES[currentMapStyleRef.current];
      const map = new mapboxgl.Map({
        container,
        style: currentStyle.url,
        center: [centerLng, centerLat],
        zoom: currentStyle.zoom,
        antialias: true,
        pitch: 0, // Start flat, user can toggle to 45° in 3D mode
        bearing: 0,
        attributionControl: false,
      });

      mapRef.current = map;

      // Disable interactions for non-interactive maps (customer view)
      if (!interactive) {
        map.scrollZoom.disable();
        map.boxZoom.disable();
        map.dragRotate.disable();
        map.dragPan.disable();
        map.keyboard.disable();
        map.doubleClickZoom.disable();
        map.touchZoomRotate.disable();
        map.touchPitch.disable();
      }

      // Track any user interaction for recenter button
      if (showRecenterButton) {
        // Show recenter on any map movement (pan, zoom, rotate, pitch)
        // But ignore programmatic movements (fitBounds, easeTo, etc.)
        const handleInteraction = () => {
          if (isProgrammaticMoveRef.current) return; // Ignore programmatic moves
          if (!userInteractedRef.current) {
            userInteractedRef.current = true;
            setShowRecenter(true);
          }
        };
        
        // Listen to user-initiated events
        map.on('dragstart', handleInteraction);
        map.on('zoomstart', handleInteraction);
        map.on('rotatestart', handleInteraction);
        map.on('pitchstart', handleInteraction);
        map.on('wheel', handleInteraction);
        map.on('touchstart', handleInteraction);
      }

      // On error, still show the map
      map.on('error', () => {
        setLoading(false);
      });


      // Track if we've already marked the map as loaded to avoid duplicate calls
      let hasMarkedLoaded = false;
      const markMapLoaded = () => {
        if (hasMarkedLoaded) return;
        hasMarkedLoaded = true;
        setLoading(false);
      };

      // Fallback timeout
      const loadTimeout = setTimeout(markMapLoaded, 5000);

      // Primary load event - fires once when map is ready
      map.once('load', () => {
        clearTimeout(loadTimeout);
        markMapLoaded();
      });

      // Style load event - fires on initial load and when style changes
      map.on('style.load', () => {
        // Mark as loaded
        clearTimeout(loadTimeout);
        markMapLoaded();
        
        // Add 3D buildings layer for 3D mode
        if (MAP_STYLES[currentMapStyleRef.current].is3D) {
          try {
            add3DBuildingsLayer(map);
          } catch { /* ignore */ }
        }

        // Re-add route after style loads
        setTimeout(() => {
          const currentMap = mapRef.current;
          const geometry = routeGeometryRef.current;
          if (!currentMap || !geometry) return;
          
          try {
            // Remove existing route if present
            try {
              if (currentMap.getLayer(ROUTE_LAYER_ID)) currentMap.removeLayer(ROUTE_LAYER_ID);
            } catch { /* layer might not exist */ }
            try {
              if (currentMap.getSource(ROUTE_SOURCE_ID)) currentMap.removeSource(ROUTE_SOURCE_ID);
            } catch { /* source might not exist */ }
            
            // Add route source and layer
            currentMap.addSource(ROUTE_SOURCE_ID, {
              type: 'geojson',
              data: { type: 'Feature', geometry: geometry, properties: {} },
            });
            currentMap.addLayer({
              id: ROUTE_LAYER_ID,
              type: 'line',
              source: ROUTE_SOURCE_ID,
              layout: { 'line-join': 'round', 'line-cap': 'round' },
              paint: { 'line-color': BENJAMIN_COLORS.emeraldGreen, 'line-width': 5, 'line-opacity': 0.85 },
            });
          } catch (e) {
            console.error('[RunnerDirectionsMap] Failed to re-add route:', e);
          }
        }, 100);

        // Re-add markers after style loads
        setTimeout(() => {
          const currentMap = mapRef.current;
          if (!currentMap || !origin || !destination) return;
          
          // Clear existing markers
          markersRef.current.forEach(m => { try { m.remove(); } catch { /* ignore */ } });
          markersRef.current = [];

          try {
            const originEl = createAvatarMarkerElement(originAvatarUrl, BENJAMIN_COLORS.emeraldGreen);
            const originMarker = new mapboxgl.Marker({ element: originEl })
              .setLngLat([origin.lng, origin.lat])
              .setPopup(new mapboxgl.Popup().setText(origin.address || 'Origin'))
              .addTo(currentMap);
            markersRef.current.push(originMarker);
          } catch { /* ignore */ }

          try {
            const destEl = createAvatarMarkerElement(destinationAvatarUrl, BENJAMIN_COLORS.charcoal);
            const destMarker = new mapboxgl.Marker({ element: destEl })
              .setLngLat([destination.lng, destination.lat])
              .setPopup(new mapboxgl.Popup().setText(destination.address || 'Destination'))
              .addTo(currentMap);
            markersRef.current.push(destMarker);
          } catch { /* ignore */ }
        }, 150);
      });

      // Style error - try fallback
      map.on('style.error', () => {
        try {
          map.setStyle('mapbox://styles/mapbox/streets-v12');
        } catch { /* ignore */ }
      });
    } catch (err) {
      console.error('[RunnerDirectionsMap] Failed to create map:', err);
      setLoading(false);
    }
  }, [origin.lat, origin.lng, origin.address, destination.lat, destination.lng, destination.address, interactive]);

  // Initialize map once the container is mounted
  useEffect(() => {
    if (mapRef.current) return;
    
    // Try immediately if container is ready
    if (mapContainerRef.current && mapContainerRef.current.parentNode) {
      initializationAttemptedRef.current = false;
      initializeMap();
      return;
    }
    
    // Otherwise wait a tick for container to mount
    const timer = setTimeout(() => {
      if (!mapRef.current && mapContainerRef.current) {
        initializationAttemptedRef.current = false;
        initializeMap();
      }
    }, 50);
    
    return () => clearTimeout(timer);
  }, [initializeMap]);

  // Fetch and display route
  useEffect(() => {
    const map = mapRef.current;
    // Only check if map exists - Mapbox will queue work if not ready
    if (!map) return;

    const { MAPBOX_ACCESS_TOKEN } = getEnv();
    if (!MAPBOX_ACCESS_TOKEN) return;

    // Fetch route from Mapbox Directions API
    const fetchRoute = async () => {
      try {
        const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?geometries=geojson&access_token=${MAPBOX_ACCESS_TOKEN}`;
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Directions API error: ${response.status}`);
        }

        const data = await response.json();

        if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          const routeGeometry = route.geometry;

          // Remove existing route layer and source if they exist
          if (map.getLayer(ROUTE_LAYER_ID)) {
            map.removeLayer(ROUTE_LAYER_ID);
          }
          if (map.getSource(ROUTE_SOURCE_ID)) {
            map.removeSource(ROUTE_SOURCE_ID);
          }

          // Add route source
          map.addSource(ROUTE_SOURCE_ID, {
            type: 'geojson',
            data: {
              type: 'Feature',
              geometry: routeGeometry,
              properties: {},
            } as GeoJSON.Feature,
          });

          // Add route layer with Benjamin emerald green
          map.addLayer({
            id: ROUTE_LAYER_ID,
            type: 'line',
            source: ROUTE_SOURCE_ID,
            layout: {
              'line-join': 'round',
              'line-cap': 'round',
            },
            paint: {
              'line-color': BENJAMIN_COLORS.emeraldGreen, // Benjamin emerald green
              'line-width': 5,
              'line-opacity': 0.75,
            },
          });

          // Store geometry for re-adding after style changes
          routeGeometryRef.current = routeGeometry;

          // Fit map to route bounds
          const coordinates = routeGeometry.coordinates;
          const bounds = coordinates.reduce(
            (bounds: any, coord: [number, number]) => {
              return bounds.extend(coord);
            },
            new mapboxgl.LngLatBounds(coordinates[0], coordinates[0])
          );

          // Store bounds for recenter functionality
          routeBoundsRef.current = bounds;

          // Fit map to show the entire route (tight padding for closer zoom)
          // Mark as programmatic to avoid triggering recenter button
          isProgrammaticMoveRef.current = true;
          map.fitBounds(bounds, {
            padding: { top: 40, bottom: 80, left: 40, right: 40 },
            maxZoom: 16,
            duration: 500,
          });
          setTimeout(() => { isProgrammaticMoveRef.current = false; }, 600);

          setRouteData(route);
        }
      } catch {
        // Fallback: just show markers without route
      }
    };

    // Wait for map to be ready before fetching route
    const tryFetchRoute = () => {
      if (map.isStyleLoaded()) {
        fetchRoute();
      } else {
        // If style not loaded, wait for it
        map.once('style.load', fetchRoute);
      }
    };

    // Also re-fetch if style changes (style.load is called each time)
    if (map.loaded()) {
      tryFetchRoute();
    } else {
      map.once('load', tryFetchRoute);
    }
  }, [origin.lat, origin.lng, destination.lat, destination.lng, bottomPadding]);

  // Add markers - always show markers regardless of route status
  useEffect(() => {
    const map = mapRef.current;
    // Only check if map exists and is ready - Mapbox will queue work if not ready
    if (!map) return;

    const addMarkers = () => {
      // Clear existing markers
      markersRef.current.forEach(m => { try { m.remove(); } catch { /* ignore */ } });
      markersRef.current = [];

      // Origin marker with avatar
      try {
        if (!isNaN(origin.lat) && !isNaN(origin.lng)) {
          const originEl = createAvatarMarkerElement(originAvatarUrl, BENJAMIN_COLORS.emeraldGreen);
          const originMarker = new mapboxgl.Marker({ element: originEl })
            .setLngLat([origin.lng, origin.lat])
            .setPopup(new mapboxgl.Popup().setText(origin.address || 'Origin'))
            .addTo(map);
          markersRef.current.push(originMarker);
        }
      } catch { /* ignore */ }

      // Destination marker with avatar
      try {
        if (!isNaN(destination.lat) && !isNaN(destination.lng)) {
          const destEl = createAvatarMarkerElement(destinationAvatarUrl, BENJAMIN_COLORS.charcoal);
          const destMarker = new mapboxgl.Marker({ element: destEl })
            .setLngLat([destination.lng, destination.lat])
            .setPopup(new mapboxgl.Popup().setText(destination.address || 'Destination'))
            .addTo(map);
          markersRef.current.push(destMarker);
        }
      } catch { /* ignore */ }
    };

    // Wait for map to be fully loaded before adding markers
    if (!map.loaded()) {
      const loadHandler = () => {
        addMarkers();
        map.off('load', loadHandler); // Remove handler after use
      };
      map.on('load', loadHandler);
      return;
    }

    // Map is loaded, add markers immediately
    addMarkers();

    // Also listen for style.load to re-add markers if style changes
    const styleLoadHandler = () => {
      // Wait a bit for style to fully render
      setTimeout(addMarkers, 100);
    };
    map.on('style.load', styleLoadHandler);

    return () => {
      map.off('style.load', styleLoadHandler);
    };
  }, [origin.lat, origin.lng, origin.address, destination.lat, destination.lng, destination.address]);

  // Cleanup
  useEffect(() => {
    return () => {
      // Remove markers
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
      
      // Remove map
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  const handleOpenInMaps = () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const url = isIOS
      ? `maps://maps.apple.com/?daddr=${destination.lat},${destination.lng}`
      : `https://www.google.com/maps/dir/?api=1&destination=${destination.lat},${destination.lng}`;
    window.open(url, '_blank');
  };

  // Shared padding for fitBounds - used by recenter and style changes
  // Tighter padding = more zoomed in while still showing full route
  const routePadding = { top: 40, bottom: 80, left: 40, right: 40 };
  
  const fitToRoute = (map: mapboxgl.Map, animate = true) => {
    if (!routeBoundsRef.current) return;
    
    // Mark as programmatic move to avoid triggering recenter button
    isProgrammaticMoveRef.current = true;
    
    // Determine pitch and bearing based on current mode and tilt state
    const is3D = MAP_STYLES[currentMapStyleRef.current].is3D;
    const targetPitch = is3D && isTilted ? 45 : 0;
    const targetBearing = is3D && isTilted ? -17.6 : 0;
    
    map.fitBounds(routeBoundsRef.current, { 
      padding: routePadding, 
      maxZoom: 16,
      duration: animate ? 500 : 0,
      pitch: targetPitch,
      bearing: targetBearing,
    });
    // Clear flag after animation completes
    setTimeout(() => {
      isProgrammaticMoveRef.current = false;
    }, animate ? 600 : 100);
  };
  
  const handleRecenter = () => {
    const map = mapRef.current;
    if (!map || !routeBoundsRef.current) return;
    fitToRoute(map);
    setShowRecenter(false);
    userInteractedRef.current = false; // Reset so next interaction shows button again
  };

  const handleStyleChange = (styleKey: MapStyleType) => {
    if (styleKey === currentMapStyle) {
      setShowLayerModal(false);
      return;
    }

    currentMapStyleRef.current = styleKey;
    setCurrentMapStyle(styleKey);

    if (mapRef.current) {
      const map = mapRef.current;
      const nextStyle = MAP_STYLES[styleKey];
      
      // Reset tilt when switching away from 3D, keep current tilt when switching to 3D
      const nextPitch = nextStyle.is3D ? (isTilted ? 45 : 0) : 0;
      const nextBearing = nextStyle.is3D && isTilted ? -17.6 : 0;
      
      try {
        map.setStyle(nextStyle.url);
        
        // After style loads, fit to route bounds and set pitch/bearing
        map.once('style.load', () => {
          // Mark as programmatic to avoid triggering recenter button
          isProgrammaticMoveRef.current = true;
          
          // Fit to route first
          if (routeBoundsRef.current) {
            map.fitBounds(routeBoundsRef.current, {
              padding: routePadding,
              maxZoom: 16,
              duration: 0, // Instant fit, then animate pitch/bearing
            });
          }
          // Then animate pitch/bearing
          map.easeTo({ 
            pitch: nextPitch,
            bearing: nextBearing,
            duration: 500 
          });
          
          // Clear flag after animations complete
          setTimeout(() => { isProgrammaticMoveRef.current = false; }, 600);
        });
      } catch {
        try {
          map.setStyle(nextStyle.url);
        } catch {}
      }
    }
    
    // Reset tilt state when switching away from 3D
    if (!MAP_STYLES[styleKey].is3D) {
      setIsTilted(false);
    }
    
    // Reset recenter state for new layer
    setShowRecenter(false);
    userInteractedRef.current = false;

    setShowLayerModal(false);
  };
  
  // Toggle pitch for 3D mode
  const handlePitchToggle = () => {
    if (!mapRef.current || !MAP_STYLES[currentMapStyle].is3D) return;
    
    // Mark as programmatic to avoid triggering recenter button
    isProgrammaticMoveRef.current = true;
    
    const newTilted = !isTilted;
    setIsTilted(newTilted);
    
    mapRef.current.easeTo({
      pitch: newTilted ? 45 : 0,
      bearing: newTilted ? -17.6 : 0,
      duration: 500,
    });
    
    // Clear flag after animation
    setTimeout(() => { isProgrammaticMoveRef.current = false; }, 600);
  };

  // Check for missing token
  const { MAPBOX_ACCESS_TOKEN } = getEnv();
  const hasToken = !!MAPBOX_ACCESS_TOKEN;

  if (!hasToken) {
    return (
      <div className={cn('relative bg-slate-900 overflow-hidden', className)} style={{ height }}>
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <div className="text-center">
            <div className="text-red-400 text-sm font-medium mb-2">Mapbox Token Missing</div>
            <div className="text-slate-400 text-xs">
              Please set VITE_MAPBOX_ACCESS_TOKEN in your .env file
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('relative bg-slate-900 overflow-hidden', className)} style={{ height }}>
      {/* Hide Mapbox controls */}
      <style>{`
        .mapboxgl-ctrl-logo,
        .mapboxgl-ctrl-attrib,
        .mapboxgl-ctrl-attrib-button,
        .mapboxgl-ctrl-attrib-inner {
          display: none !important;
        }
      `}</style>
      
      {/* Map container - always rendered */}
      <div
        ref={(el) => {
          mapContainerRef.current = el;
        }}
        className="w-full h-full"
        style={{ minHeight: height, height: '100%' }}
      />
      
      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 z-20">
          <div className="text-slate-400">Loading map...</div>
        </div>
      )}
      
      {/* Route info panel */}
      {routeData && (
        <div className={cn(
          "absolute bottom-6 z-10 bg-[#020817]/90 backdrop-blur-sm px-3 py-2 rounded-lg",
          hideOpenInMaps ? "left-6" : "left-6 right-6"
        )}>
          <div className={cn("flex items-center gap-3", hideOpenInMaps ? "justify-start" : "justify-between")}>
            <div className="text-xs text-slate-300">
              <div className="font-medium text-white">
                {routeData.duration ? `${Math.round(routeData.duration / 60)} min` : 'Route calculated'}
              </div>
              <div className="text-slate-400">
                {routeData.distance ? `${(routeData.distance / 1609.34).toFixed(1)} mi` : ''}
              </div>
            </div>
            {!hideOpenInMaps && (
              <button
                onClick={handleOpenInMaps}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition-colors"
              >
                Open in Maps
              </button>
            )}
          </div>
        </div>
      )}
      
      {/* Recenter button */}
      {showRecenter && showRecenterButton && (
        <div className="absolute top-6 right-6 z-10">
          <IconButton
            onClick={handleRecenter}
            size="lg"
            className="bg-white/95 backdrop-blur shadow-lg"
            aria-label="Re-center map"
          >
            <Focus className="h-5 w-5 text-gray-600" />
          </IconButton>
        </div>
      )}

      {/* Map control buttons (bottom right) */}
      {showLayerSwitcher && (
        <div className="absolute bottom-6 right-6 z-10 flex flex-col gap-2">
          {/* Pitch toggle button - only in 3D mode */}
          {MAP_STYLES[currentMapStyle].is3D && (
            <IconButton
              onClick={handlePitchToggle}
              size="lg"
              className="bg-white/95 backdrop-blur shadow-lg"
              aria-label={isTilted ? "Flatten view" : "Tilt view"}
            >
              {isTilted ? (
                <Diamond className="h-5 w-5 text-gray-600" />
              ) : (
                <Pyramid className="h-5 w-5 text-gray-600" />
              )}
            </IconButton>
          )}
          
          {/* Layer switcher button */}
          <IconButton
            onClick={() => setShowLayerModal(true)}
            size="lg"
            className="bg-white/95 backdrop-blur shadow-lg"
            aria-label="Map layers"
          >
            <Layers className="h-5 w-5 text-gray-600" />
          </IconButton>
        </div>
      )}

      {/* Layer selector modal */}
      <AnimatePresence>
        {showLayerModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 z-20"
              onClick={() => setShowLayerModal(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="absolute bottom-0 left-0 right-0 bg-[#1A1A1A] rounded-t-[24px] z-30 p-5 pb-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-white">Map layer</h3>
                <IconButton
                  onClick={() => setShowLayerModal(false)}
                  size="lg"
                  className="bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </IconButton>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {(Object.keys(MAP_STYLES) as MapStyleType[]).map((styleKey) => {
                  const style = MAP_STYLES[styleKey];
                  const isSelected = currentMapStyle === styleKey;
                  
                  return (
                    <button
                      key={styleKey}
                      onClick={() => handleStyleChange(styleKey)}
                      className={cn(
                        "flex flex-col items-center rounded-xl p-2 transition-all border-2",
                        isSelected
                          ? "border-[#13F287] bg-[#13F287]/10"
                          : "border-transparent bg-white/5 hover:bg-white/10"
                      )}
                    >
                      <div className="w-full aspect-square rounded-lg mb-2 overflow-hidden relative bg-slate-800">
                        <img 
                          src={
                            styleKey === '3d' 
                              ? map3dPreview
                              : styleKey === 'standard'
                              ? mapStandardPreview
                              : mapSatellitePreview
                          }
                          alt={`${style.label} map preview`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className={cn(
                        "text-xs font-medium",
                        isSelected ? "text-white" : "text-slate-400"
                      )}>
                        {style.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Helper function to get dummy locations for testing
 */
export function getDummyLocations() {
  return {
    origin: DUMMY_ORIGIN,
    atm: DUMMY_ATM,
    customer: DUMMY_CUSTOMER,
  };
}

