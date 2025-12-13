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
import { applyBenjaminTheme, getBenjaminMapStyle, BENJAMIN_COLORS } from '@/lib/mapboxTheme';

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

export function RunnerDirectionsMap({
  origin,
  destination,
  title,
  className,
  height = '400px',
  bottomPadding = 50,
  interactive = true,
}: RunnerDirectionsMapProps) {
  console.log('[RunnerDirectionsMap] Component rendered with props:', { origin, destination, title, height });
  
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [routeData, setRouteData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);
  const initializationAttemptedRef = useRef(false);
  
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

  // Function to initialize the map (extracted so it can be called from ref callback)
  const initializeMap = useCallback(() => {
    // Check if map already exists and is valid
    if (mapRef.current) {
      // Check if map container is still attached to the map instance
      if (mapRef.current.getContainer() && mapRef.current.getContainer().parentNode) {
        console.log('[RunnerDirectionsMap] Map already exists and is valid, skipping initialization');
        return;
      } else {
        // Map instance exists but container is detached - clean up and recreate
        console.warn('[RunnerDirectionsMap] Map exists but container is detached, cleaning up...');
        try {
          mapRef.current.remove();
        } catch (e) {
          console.error('[RunnerDirectionsMap] Error removing detached map:', e);
        }
        mapRef.current = null;
        initializationAttemptedRef.current = false;
      }
    }
    
    // Prevent multiple simultaneous initialization attempts
    if (initializationAttemptedRef.current) {
      console.log('[RunnerDirectionsMap] Initialization already in progress, skipping');
      return;
    }
    
    console.log('[RunnerDirectionsMap] ===== initializeMap called =====');
    console.log('[RunnerDirectionsMap] mapContainerRef.current:', mapContainerRef.current);
    console.log('[RunnerDirectionsMap] mapRef.current:', mapRef.current);
    
    if (!mapContainerRef.current) {
      console.warn('[RunnerDirectionsMap] Container ref is null, cannot initialize');
      return;
    }
    
    // Verify container is in DOM
    if (!mapContainerRef.current.parentNode) {
      console.warn('[RunnerDirectionsMap] Container not in DOM, cannot initialize');
      return;
    }
    
    initializationAttemptedRef.current = true;
    
    const { MAPBOX_ACCESS_TOKEN } = getEnv();
    if (!MAPBOX_ACCESS_TOKEN) {
      console.error('[RunnerDirectionsMap] Missing MAPBOX_ACCESS_TOKEN - map cannot render');
      setLoading(false);
      return;
    }

    // Verify container has dimensions
    const container = mapContainerRef.current;
    const containerWidth = container.offsetWidth || container.clientWidth;
    const containerHeight = container.offsetHeight || container.clientHeight;
    
    console.log('[RunnerDirectionsMap] Container dimensions check:', {
      offsetWidth: container.offsetWidth,
      offsetHeight: container.offsetHeight,
      clientWidth: container.clientWidth,
      clientHeight: container.clientHeight,
      computedHeight: window.getComputedStyle(container).height,
      computedWidth: window.getComputedStyle(container).width,
    });
    
    if (containerWidth === 0 || containerHeight === 0) {
      console.warn('[RunnerDirectionsMap] Container has no dimensions, using ResizeObserver');
      
      // Use ResizeObserver to wait for container to get dimensions
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
            console.log('[RunnerDirectionsMap] Container now has dimensions:', {
              width: entry.contentRect.width,
              height: entry.contentRect.height,
            });
            resizeObserver.disconnect();
            // Retry initialization now that we have dimensions
            initializeMap();
            break;
          }
        }
      });
      
      resizeObserver.observe(container);
      
      // Cleanup on unmount
      return () => {
        resizeObserver.disconnect();
      };
    }
    
    console.log('[RunnerDirectionsMap] Container has dimensions, proceeding with map initialization:', {
      width: containerWidth,
      height: containerHeight,
    });

    console.log('[RunnerDirectionsMap] Initializing map with token:', MAPBOX_ACCESS_TOKEN.substring(0, 10) + '...');
    console.log('[RunnerDirectionsMap] Origin:', origin);
    console.log('[RunnerDirectionsMap] Destination:', destination);

    try {
      // Center map on destination (where runner needs to go) rather than origin
      // This ensures the ATM location is visible when heading to ATM
      const centerLng = destination.lng;
      const centerLat = destination.lat;
      
      console.log('[RunnerDirectionsMap] Initializing map with center:', {
        centerLat,
        centerLng,
        destinationAddress: destination.address,
        originAddress: origin.address,
      });
      
      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: getBenjaminMapStyle(), // Navigation-optimized dark theme
        center: [centerLng, centerLat],
        zoom: 13,
        antialias: true,
        // Enable 3D view for better navigation - slight pitch for runner, flat for customer
        pitch: interactive ? 45 : 0, // 45 degree pitch for runner (co-pilot view), flat for customer
        bearing: 0,
      });

      console.log('[RunnerDirectionsMap] Map instance created, waiting for load event...');

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

      // Add error handler
      map.on('error', (e) => {
        console.error('[RunnerDirectionsMap] Map error:', e);
        if (e.error?.message) {
          console.error('[RunnerDirectionsMap] Error message:', e.error.message);
        }
        // Don't hide the map on error - keep showing what we have
        setMapLoaded(true);
        setLoading(false);
      });

      // Add navigation controls only if interactive
      if (interactive) {
        map.addControl(new mapboxgl.NavigationControl(), 'top-right');
      }

      // Function to mark map as loaded
      const markMapLoaded = () => {
        console.log('[RunnerDirectionsMap] Marking map as loaded');
        setMapLoaded(true);
        setLoading(false);
      };

      // Add timeout fallback - if map doesn't load in 5 seconds, show it anyway
      const loadTimeout = setTimeout(() => {
        console.warn('[RunnerDirectionsMap] Map load timeout after 5s - showing map anyway');
        markMapLoaded();
      }, 5000);

      // Primary load event
      map.on('load', () => {
        console.log('[RunnerDirectionsMap] Map "load" event fired');
        clearTimeout(loadTimeout);
        markMapLoaded();
        // Apply Benjamin theme after map loads - enable 3D buildings and pass runner flag
        applyBenjaminTheme(map, { enable3DBuildings: true, isRunner: interactive });
      });

      // Alternative: 'idle' event fires when map is fully rendered
      map.on('idle', () => {
        console.log('[RunnerDirectionsMap] Map "idle" event fired (fully rendered)');
        clearTimeout(loadTimeout);
        markMapLoaded();
      });

      // Style loaded event - handle separately from load event
      const handleStyleLoad = () => {
        console.log('[RunnerDirectionsMap] Map style loaded successfully');
        // Apply Benjamin theme when style loads - enable 3D buildings and pass runner flag
        applyBenjaminTheme(map, { enable3DBuildings: true, isRunner: interactive });
        // Ensure map is marked as loaded
        if (!mapLoaded) {
          setMapLoaded(true);
          setLoading(false);
        }
      };
      
      map.on('style.load', handleStyleLoad);

      // Style error - try fallback
      map.on('style.error', (e) => {
        console.error('[RunnerDirectionsMap] Style error:', e);
        try {
          console.log('[RunnerDirectionsMap] Trying fallback style (streets-v12)...');
          map.setStyle('mapbox://styles/mapbox/streets-v12');
        } catch (styleErr) {
          console.error('[RunnerDirectionsMap] Failed to set fallback style:', styleErr);
        }
      });
      
      // Style loaded successfully
      map.on('style.load', () => {
        console.log('[RunnerDirectionsMap] Map style loaded successfully');
        // Apply Benjamin theme when style loads - enable 3D buildings and pass runner flag
        applyBenjaminTheme(map, { enable3DBuildings: true, isRunner: interactive });
        // Ensure map is marked as loaded
        if (!mapLoaded) {
          setMapLoaded(true);
          setLoading(false);
        }
        // Re-add markers after style loads (markers are removed when style changes)
        setTimeout(() => {
          if (mapRef.current === map && origin && destination) {
            // Clear existing markers
            markersRef.current.forEach(m => {
              try {
                m.remove();
              } catch (e) {
                // Ignore errors
              }
            });
            markersRef.current = [];
            
            // Add markers again
            try {
              const originMarker = new mapboxgl.Marker({ color: BENJAMIN_COLORS.emeraldGreen })
                .setLngLat([origin.lng, origin.lat])
                .setPopup(new mapboxgl.Popup().setText(origin.address || 'Origin'))
                .addTo(map);
              markersRef.current.push(originMarker);
            } catch (e) {
              console.error('[RunnerDirectionsMap] Error recreating origin marker:', e);
            }
            
            try {
              const destMarker = new mapboxgl.Marker({ color: BENJAMIN_COLORS.charcoal })
                .setLngLat([destination.lng, destination.lat])
                .setPopup(new mapboxgl.Popup().setText(destination.address || 'Destination'))
                .addTo(map);
              markersRef.current.push(destMarker);
            } catch (e) {
              console.error('[RunnerDirectionsMap] Error recreating destination marker:', e);
            }
            
            console.log('[RunnerDirectionsMap] Markers re-added after style load:', markersRef.current.length);
          }
        }, 100);
      });

      // Data event - fires when map data is loaded
      map.on('data', () => {
        console.log('[RunnerDirectionsMap] Map data event fired');
      });

      // Render event - fires when map renders
      map.on('render', () => {
        if (map.loaded()) {
          console.log('[RunnerDirectionsMap] Map render event - map is loaded');
          clearTimeout(loadTimeout);
          markMapLoaded();
        }
      });

      // Check if map is already loaded
      if (map.loaded()) {
        console.log('[RunnerDirectionsMap] Map already loaded when checked');
        clearTimeout(loadTimeout);
        markMapLoaded();
      } else {
        // Also check after a short delay
        setTimeout(() => {
          if (map.loaded()) {
            console.log('[RunnerDirectionsMap] Map loaded after short delay');
            clearTimeout(loadTimeout);
            markMapLoaded();
          }
        }, 500);
      }
    } catch (err) {
      console.error('[RunnerDirectionsMap] Failed to create map:', err);
      if (err instanceof Error) {
        console.error('[RunnerDirectionsMap] Error details:', err.message, err.stack);
      }
      setLoading(false);
    }
  }, [origin.lat, origin.lng, origin.address, destination.lat, destination.lng, destination.address, interactive]);

  // Initialize map - retry until ref is available
  useEffect(() => {
    console.log('[RunnerDirectionsMap] Initialize map effect running');
    console.log('[RunnerDirectionsMap] Effect - mapContainerRef.current:', mapContainerRef.current);
    console.log('[RunnerDirectionsMap] Effect - mapRef.current:', mapRef.current);
    console.log('[RunnerDirectionsMap] Effect - initializationAttemptedRef.current:', initializationAttemptedRef.current);
    
    // Check if map already exists and is valid
    if (mapRef.current) {
      try {
        const container = mapRef.current.getContainer();
        if (container && container.parentNode) {
          console.log('[RunnerDirectionsMap] Effect - Map already exists and is valid, skipping');
          return;
        }
      } catch (e) {
        // Map is invalid, clean up
        console.warn('[RunnerDirectionsMap] Effect - Map exists but is invalid, will reinitialize');
        mapRef.current = null;
        initializationAttemptedRef.current = false;
      }
    }
    
    // If ref is ready, initialize immediately
    if (mapContainerRef.current && mapContainerRef.current.parentNode) {
      console.log('[RunnerDirectionsMap] Effect - ref is ready, calling initializeMap');
      initializeMap();
      return;
    }
    
    // Ref not ready - retry with backoff
    console.log('[RunnerDirectionsMap] Effect - ref not ready, starting retry loop...');
    let retryCount = 0;
    const maxRetries = 30; // Increased retries
    const retryInterval = 100;
    
    const retryTimer = setInterval(() => {
      retryCount++;
      
      // Check if map was created in the meantime
      if (mapRef.current) {
        try {
          const container = mapRef.current.getContainer();
          if (container && container.parentNode) {
            console.log('[RunnerDirectionsMap] Effect - Map now exists, stopping retry');
            clearInterval(retryTimer);
            return;
          }
        } catch (e) {
          // Map is invalid, continue retrying
        }
      }
      
      // Check if container is now available and in DOM
      if (mapContainerRef.current && mapContainerRef.current.parentNode) {
        console.log('[RunnerDirectionsMap] Effect - ✓ Ref is now ready, calling initializeMap');
        clearInterval(retryTimer);
        initializationAttemptedRef.current = false; // Reset flag
        initializeMap();
      } else if (retryCount >= maxRetries) {
        console.error('[RunnerDirectionsMap] Effect - ✗ Max retries reached, giving up');
        clearInterval(retryTimer);
        setLoading(false);
        initializationAttemptedRef.current = false; // Reset so it can retry later
      }
    }, retryInterval);
    
    return () => {
      clearInterval(retryTimer);
    };
  }, [initializeMap]); // Only depend on initializeMap to avoid unnecessary re-runs

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
        console.log('[RunnerDirectionsMap] 🗺️ Fetching route:', {
          origin: { lat: origin.lat, lng: origin.lng, address: origin.address },
          destination: { lat: destination.lat, lng: destination.lng, address: destination.address },
        });
        
        const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?geometries=geojson&access_token=${MAPBOX_ACCESS_TOKEN}`;
        
        console.log('[RunnerDirectionsMap] 📍 Route URL (coordinates only):', `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`);
        
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

          // Fit map to route bounds
          const coordinates = routeGeometry.coordinates;
          const bounds = coordinates.reduce(
            (bounds: any, coord: [number, number]) => {
              return bounds.extend(coord);
            },
            new mapboxgl.LngLatBounds(coordinates[0], coordinates[0])
          );

          map.fitBounds(bounds, {
            padding: {
              top: 80,
              left: 24,
              right: 24,
              bottom: bottomPadding + 12, // 12px breathing room above sheet
            },
            duration: 1000,
          });

          setRouteData(route);
        } else {
          console.warn('[RunnerDirectionsMap] No valid route found:', data);
        }
      } catch (err) {
        console.error('[RunnerDirectionsMap] Failed to fetch route:', err);
        // Fallback: just show markers without route
      }
    };

    // If map is loaded, fetch immediately; otherwise wait for load event
    if (mapLoaded) {
      fetchRoute();
    } else {
      map.once('load', () => {
        fetchRoute();
      });
    }
  }, [origin.lat, origin.lng, destination.lat, destination.lng, mapLoaded, bottomPadding]);

  // Add markers - always show markers regardless of route status
  useEffect(() => {
    const map = mapRef.current;
    // Only check if map exists and is ready - Mapbox will queue work if not ready
    if (!map) return;
    
    // Helper function to add markers
    const addMarkers = () => {
      // Clear existing markers first
      markersRef.current.forEach(m => {
        try {
          m.remove();
        } catch (e) {
          // Marker might already be removed, ignore
          console.debug('[RunnerDirectionsMap] Error removing marker:', e);
        }
      });
      markersRef.current = [];

      // Validate coordinates before creating markers
      if (isNaN(origin.lat) || isNaN(origin.lng)) {
        console.warn('[RunnerDirectionsMap] Invalid origin coordinates:', origin);
      }
      if (isNaN(destination.lat) || isNaN(destination.lng)) {
        console.warn('[RunnerDirectionsMap] Invalid destination coordinates:', destination);
      }

      // Origin marker - Emerald green (user/runner location)
      try {
        if (!isNaN(origin.lat) && !isNaN(origin.lng)) {
          const originMarker = new mapboxgl.Marker({ color: BENJAMIN_COLORS.emeraldGreen })
            .setLngLat([origin.lng, origin.lat])
            .setPopup(new mapboxgl.Popup().setText(origin.address || 'Origin'))
            .addTo(map);
          markersRef.current.push(originMarker);
          console.log('[RunnerDirectionsMap] Origin marker added at:', origin.lat, origin.lng);
        }
      } catch (e) {
        console.error('[RunnerDirectionsMap] Error creating origin marker:', e);
      }

      // Destination marker - Charcoal (destination)
      try {
        if (!isNaN(destination.lat) && !isNaN(destination.lng)) {
          const destMarker = new mapboxgl.Marker({ color: BENJAMIN_COLORS.charcoal })
            .setLngLat([destination.lng, destination.lat])
            .setPopup(new mapboxgl.Popup().setText(destination.address || 'Destination'))
            .addTo(map);
          markersRef.current.push(destMarker);
          console.log('[RunnerDirectionsMap] Destination marker added at:', destination.lat, destination.lng);
        }
      } catch (e) {
        console.error('[RunnerDirectionsMap] Error creating destination marker:', e);
      }
      
      console.log('[RunnerDirectionsMap] Total markers added:', markersRef.current.length);
      if (markersRef.current.length !== 2) {
        console.warn('[RunnerDirectionsMap] Expected 2 markers but got', markersRef.current.length);
      }
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
  }, [origin.lat, origin.lng, origin.address, destination.lat, destination.lng, destination.address, mapLoaded]);

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

  if (loading) {
    return (
      <div className={cn('relative bg-slate-900 overflow-hidden', className)} style={{ height }}>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-slate-400">Loading map...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('relative bg-slate-900 overflow-hidden', className)} style={{ height }}>
      <div
        ref={(el) => {
          console.log('[RunnerDirectionsMap] ===== REF CALLBACK FIRED =====');
          console.log('[RunnerDirectionsMap] Element:', el);
          console.log('[RunnerDirectionsMap] Current mapRef:', mapRef.current);
          console.log('[RunnerDirectionsMap] Initialization attempted:', initializationAttemptedRef.current);
          
          mapContainerRef.current = el;
          
          // Initialize map immediately when element is available
          if (el && !mapRef.current && !initializationAttemptedRef.current) {
            console.log('[RunnerDirectionsMap] ✓ Conditions met - scheduling map initialization...');
            // Use requestAnimationFrame to ensure DOM is fully ready
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                console.log('[RunnerDirectionsMap] Double RAF fired, checking conditions...');
                console.log('[RunnerDirectionsMap] mapContainerRef.current:', mapContainerRef.current);
                console.log('[RunnerDirectionsMap] mapRef.current:', mapRef.current);
                console.log('[RunnerDirectionsMap] initializationAttemptedRef.current:', initializationAttemptedRef.current);
                
                if (mapContainerRef.current && !mapRef.current && !initializationAttemptedRef.current) {
                  console.log('[RunnerDirectionsMap] ✓✓✓ Calling initializeMap from ref callback ✓✓✓');
                  initializeMap();
                } else {
                  console.warn('[RunnerDirectionsMap] ✗ Conditions not met for initialization:', {
                    hasContainer: !!mapContainerRef.current,
                    hasMap: !!mapRef.current,
                    alreadyAttempted: initializationAttemptedRef.current,
                  });
                }
              });
            });
          } else {
            console.log('[RunnerDirectionsMap] ✗ Ref callback - skipping initialization:', {
              hasElement: !!el,
              hasMap: !!mapRef.current,
              alreadyAttempted: initializationAttemptedRef.current,
            });
          }
        }}
        className="w-full h-full"
        style={{ minHeight: height, height: '100%' }}
      />
      {routeData && (
        <div className="absolute bottom-4 left-4 right-4 z-10 bg-[#020817]/90 backdrop-blur-sm px-3 py-2 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-300">
              <div className="font-medium text-white">
                {routeData.duration ? `${Math.round(routeData.duration / 60)} min` : 'Route calculated'}
              </div>
              <div className="text-slate-400">
                {routeData.distance ? `${(routeData.distance / 1609.34).toFixed(1)} mi` : ''}
              </div>
            </div>
            <button
              onClick={handleOpenInMaps}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition-colors"
            >
              Open in Maps
            </button>
          </div>
        </div>
      )}
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

