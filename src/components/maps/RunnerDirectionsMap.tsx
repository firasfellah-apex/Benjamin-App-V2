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
import { Navigation } from 'lucide-react';

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
    // Prevent multiple initialization attempts
    if (initializationAttemptedRef.current) {
      console.log('[RunnerDirectionsMap] Initialization already attempted, skipping');
      return;
    }
    
    console.log('[RunnerDirectionsMap] ===== initializeMap called =====');
    console.log('[RunnerDirectionsMap] mapContainerRef.current:', mapContainerRef.current);
    console.log('[RunnerDirectionsMap] mapRef.current:', mapRef.current);
    
    if (!mapContainerRef.current) {
      console.warn('[RunnerDirectionsMap] Container ref is null, cannot initialize');
      return;
    }
    
    if (mapRef.current) {
      console.log('[RunnerDirectionsMap] Map already exists, skipping initialization');
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
      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: 'mapbox://styles/mapbox/navigation-night-v1', // Dark theme for runner app
        center: [origin.lng, origin.lat],
        zoom: 13,
        antialias: true,
        pitch: 0,
        bearing: 0,
      });

      console.log('[RunnerDirectionsMap] Map instance created, waiting for load event...');

      mapRef.current = map;

      // Add error handler
      map.on('error', (e) => {
        console.error('[RunnerDirectionsMap] Map error:', e);
        if (e.error?.message) {
          console.error('[RunnerDirectionsMap] Error message:', e.error.message);
        }
        setMapLoaded(true);
        setLoading(false);
      });

      // Add navigation controls
      map.addControl(new mapboxgl.NavigationControl(), 'top-right');

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
      });

      // Alternative: 'idle' event fires when map is fully rendered
      map.on('idle', () => {
        console.log('[RunnerDirectionsMap] Map "idle" event fired (fully rendered)');
        clearTimeout(loadTimeout);
        markMapLoaded();
      });

      // Style loaded event
      map.on('style.load', () => {
        console.log('[RunnerDirectionsMap] Map style loaded');
      });

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
  }, [origin.lat, origin.lng, origin.address, destination.lat, destination.lng, destination.address]);

  // Initialize map - retry until ref is available
  useEffect(() => {
    console.log('[RunnerDirectionsMap] Initialize map effect running');
    console.log('[RunnerDirectionsMap] Effect - mapContainerRef.current:', mapContainerRef.current);
    console.log('[RunnerDirectionsMap] Effect - mapRef.current:', mapRef.current);
    console.log('[RunnerDirectionsMap] Effect - initializationAttemptedRef.current:', initializationAttemptedRef.current);
    
    // If already initialized or map exists, skip
    if (mapRef.current || initializationAttemptedRef.current) {
      console.log('[RunnerDirectionsMap] Effect - already initialized or map exists, skipping');
      return;
    }
    
    // If ref is ready, initialize immediately
    if (mapContainerRef.current) {
      console.log('[RunnerDirectionsMap] Effect - ref is ready, calling initializeMap');
      initializeMap();
      return;
    }
    
    // Ref not ready - retry with exponential backoff
    console.log('[RunnerDirectionsMap] Effect - ref not ready, starting retry loop...');
    let retryCount = 0;
    const maxRetries = 10;
    const retryInterval = 100; // Start with 100ms
    
    const retryTimer = setInterval(() => {
      retryCount++;
      console.log(`[RunnerDirectionsMap] Effect - retry attempt ${retryCount}/${maxRetries}`);
      console.log('[RunnerDirectionsMap] Effect - mapContainerRef.current:', mapContainerRef.current);
      
      if (mapContainerRef.current && !mapRef.current && !initializationAttemptedRef.current) {
        console.log('[RunnerDirectionsMap] Effect - ✓ Ref is now ready, calling initializeMap');
        clearInterval(retryTimer);
        initializeMap();
      } else if (retryCount >= maxRetries) {
        console.error('[RunnerDirectionsMap] Effect - ✗ Max retries reached, giving up');
        clearInterval(retryTimer);
        setLoading(false);
      } else if (mapRef.current || initializationAttemptedRef.current) {
        console.log('[RunnerDirectionsMap] Effect - Map already initialized, stopping retry');
        clearInterval(retryTimer);
      }
    }, retryInterval);
    
    return () => {
      clearInterval(retryTimer);
    };
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

          // Add route layer
          map.addLayer({
            id: ROUTE_LAYER_ID,
            type: 'line',
            source: ROUTE_SOURCE_ID,
            layout: {
              'line-join': 'round',
              'line-cap': 'round',
            },
            paint: {
              'line-color': '#4F46E5', // Indigo color for runner app
              'line-width': 4,
              'line-opacity': 0.8,
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
            padding: 50,
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
  }, [origin.lat, origin.lng, destination.lat, destination.lng, mapLoaded]);

  // Add markers
  useEffect(() => {
    const map = mapRef.current;
    // Only check if map exists - Mapbox will queue work if not ready
    if (!map) return;

    // Clear this map's markers only
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // Origin marker (green)
    const originMarker = new mapboxgl.Marker({ color: '#22C55E' })
      .setLngLat([origin.lng, origin.lat])
      .setPopup(new mapboxgl.Popup().setText(origin.address || 'Origin'))
      .addTo(map);

    // Destination marker (blue)
    const destMarker = new mapboxgl.Marker({ color: '#3B82F6' })
      .setLngLat([destination.lng, destination.lat])
      .setPopup(new mapboxgl.Popup().setText(destination.address || 'Destination'))
      .addTo(map);

    markersRef.current.push(originMarker, destMarker);
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

  // Check for missing token
  const { MAPBOX_ACCESS_TOKEN } = getEnv();
  const hasToken = !!MAPBOX_ACCESS_TOKEN;

  if (!hasToken) {
    return (
      <div className={cn('relative bg-slate-900 rounded-xl overflow-hidden', className)} style={{ height }}>
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
      <div className={cn('relative bg-slate-900 rounded-xl overflow-hidden', className)} style={{ height }}>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-slate-400">Loading map...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('relative bg-slate-900 rounded-xl overflow-hidden', className)} style={{ height }}>
      {title && (
        <div className="absolute top-4 left-4 z-10 bg-[#020817]/90 backdrop-blur-sm px-3 py-2 rounded-lg">
          <h3 className="text-sm font-medium text-white flex items-center gap-2">
            <Navigation className="h-4 w-4" />
            {title}
          </h3>
        </div>
      )}
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

