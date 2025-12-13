/**
 * Benjamin Brand Mapbox Theme
 * 
 * Dark, ultra-minimal theme for customer maps:
 * - Dark charcoal base (no pastel background)
 * - Very minimal geometry: almost no minor roads, no POIs, no icons, no transit, no borders noise
 * - Primary focus: clean road network + emerald route line
 */

import mapboxgl from 'mapbox-gl';
import { getEnv } from './env';

export const BENJAMIN_COLORS = {
  // Base / Land - Very dark almost-black blue
  canvas: '#05060A',  // very dark background
  land: '#0C1016',    // slightly lighter than canvas
  water: '#050A12',   // very dark blue-green

  // Surfaces / Buildings
  buildingFill: '#151923',    // building fill
  buildingOutline: '#1F2430', // building outline at low opacity

  // Roads
  roadPrimary: '#1F2430',     // main/primary roads (darker)
  roadSecondary: '#262C3A',   // secondary roads
  roadTertiary: 'rgba(31, 36, 48, 0.7)', // minor/local roads (darker with opacity)

  // Labels / POIs - Very subtle, light gray
  roadLabel: '#9CA3AF',       // text at low opacity
  placeLabel: '#9CA3AF',     // reduced font size and opacity
  poiLabel: '#9CA3AF',        // very subtle

  // Accents - Benjamin greens
  emeraldGreen: '#02C97A',    // Primary green (route line)
  emeraldSoft: '#4BF5A7',     // Highlight green (outline/glow)
  emeraldDeep: '#007A4B',      // Deep glow base
  emeraldAmbient: '#10231A',   // Ambient dark green

  // Misc
  boundary: '#262B37',
  transitLine: '#2B3140',
  midGrey: '#6A6A6F',
  white: '#FFFFFF',
  black: '#000000',
} as const;

/**
 * Applies Benjamin brand theme to a Mapbox map instance
 * Darkens the background/land/water, simplifies roads, enhances 3D buildings for navigation
 */
export function applyBenjaminTheme(map: mapboxgl.Map, options?: { enable3DBuildings?: boolean; isRunner?: boolean }) {
  const { enable3DBuildings = true, isRunner = false } = options || {};
  
  const applyTheme = () => {
    if (!map || !map.isStyleLoaded()) return;

    const style = map.getStyle();
    if (!style?.layers) return;

    style.layers.forEach((layer: any) => {
      const id = layer.id as string;
      const type = layer.type as string;

      try {
        // Base / land
        if ((id === 'background' || id.includes('land')) && type === 'background') {
          map.setPaintProperty(id, 'background-color', BENJAMIN_COLORS.canvas);
        }
        if (id.includes('land') && type === 'fill') {
          map.setPaintProperty(id, 'fill-color', BENJAMIN_COLORS.land);
        }

        // Water
        if ((id.includes('water') || id.includes('ocean')) && type === 'fill') {
          map.setPaintProperty(id, 'fill-color', BENJAMIN_COLORS.water);
        }

        // Buildings - Enhanced for navigation with 3D extrusion
        if (id.includes('building')) {
          if (type === 'fill' || type === 'fill-extrusion') {
            // For fill-extrusion layers (3D buildings in navigation styles)
            if (type === 'fill-extrusion' && enable3DBuildings) {
              try {
                // Enhance 3D building visibility for navigation
                map.setPaintProperty(id, 'fill-extrusion-color', '#1A1F2E');
                map.setPaintProperty(id, 'fill-extrusion-opacity', 0.75);
                // Make buildings slightly more visible
                map.setPaintProperty(id, 'fill-extrusion-height', [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  15,
                  ['get', 'height'],
                  20,
                  ['*', ['get', 'height'], 1.2]
                ]);
              } catch (e) {
                console.log('[mapboxTheme] Could not enhance 3D building layer:', id, e);
              }
            } else if (type === 'fill') {
              // For regular fill layers, try to convert to 3D if possible
              map.setPaintProperty(id, 'fill-color', BENJAMIN_COLORS.buildingFill);
              map.setPaintProperty(id, 'fill-outline-color', BENJAMIN_COLORS.buildingOutline);
              
              // Try to enable 3D extrusion if the layer supports it
              if (enable3DBuildings) {
                try {
                  // Check if we can add extrusion properties
                  const source = style.sources[layer.source as string];
                  if (source && (source.type === 'vector' || source.type === 'geojson')) {
                    // Try to enable extrusion - navigation styles often have height data
                    map.setPaintProperty(id, 'fill-extrusion-height', [
                      'coalesce',
                      ['get', 'height'],
                      ['get', 'render_height'],
                      10 // Default height if not available
                    ]);
                    map.setPaintProperty(id, 'fill-extrusion-base', 0);
                    map.setPaintProperty(id, 'fill-extrusion-color', '#1A1F2E');
                    map.setPaintProperty(id, 'fill-extrusion-opacity', 0.7);
                  }
                } catch (e) {
                  // Layer might not support extrusion, that's okay
                  console.log('[mapboxTheme] Building fill layer does not support 3D extrusion:', id);
                }
              }
            }
          }
        }
        
        // Building outlines - make them more visible for navigation
        if (id.includes('building') && type === 'line') {
          map.setPaintProperty(id, 'line-color', BENJAMIN_COLORS.buildingOutline);
          map.setPaintProperty(id, 'line-opacity', isRunner ? 0.7 : 0.6);
          map.setPaintProperty(id, 'line-width', isRunner ? 1.0 : 0.8);
        }

        // Roads – strong hierarchy, enhanced for navigation
        if (id.includes('road') && type === 'line') {
          const isMotorway =
            id.includes('motorway') || id.includes('trunk') || id.includes('primary');
          const isSecondary =
            id.includes('secondary') || id.includes('tertiary');

          if (id.includes('service') || id.includes('path') || id.includes('track')) {
            // For runner: show service roads for better navigation context
            // For customer: hide noisy micro-roads
            if (isRunner) {
              map.setPaintProperty(id, 'line-color', BENJAMIN_COLORS.roadTertiary);
              map.setPaintProperty(id, 'line-width', 0.6);
              map.setPaintProperty(id, 'line-opacity', 0.25);
            } else {
              map.setLayoutProperty(id, 'visibility', 'none');
            }
          } else if (isMotorway) {
            map.setPaintProperty(id, 'line-color', BENJAMIN_COLORS.roadPrimary);
            // Slightly thicker for better navigation visibility
            map.setPaintProperty(id, 'line-width', isRunner ? 2.0 : 1.6);
          } else if (isSecondary) {
            map.setPaintProperty(id, 'line-color', BENJAMIN_COLORS.roadSecondary);
            map.setPaintProperty(id, 'line-width', isRunner ? 1.4 : 1.1);
          } else {
            // local roads - more visible for navigation
            map.setPaintProperty(id, 'line-color', BENJAMIN_COLORS.roadTertiary);
            map.setPaintProperty(id, 'line-width', isRunner ? 1.0 : 0.8);
            map.setPaintProperty(id, 'line-opacity', isRunner ? 0.5 : 0.35);
          }
        }

        // Road labels - Enhanced for navigation
        if (id.includes('road') && type === 'symbol' && id.includes('label')) {
          map.setPaintProperty(id, 'text-color', BENJAMIN_COLORS.roadLabel);
          map.setPaintProperty(id, 'text-halo-color', BENJAMIN_COLORS.canvas);
          // Thicker halo for better readability during navigation
          map.setPaintProperty(id, 'text-halo-width', isRunner ? 1.5 : 1);
          // Slightly larger text for runner navigation
          if (isRunner) {
            map.setLayoutProperty(id, 'text-size', ['interpolate', ['linear'], ['zoom'], 10, 11, 16, 13]);
          }
        }

        // Place labels (city / neighborhood)
        if (type === 'symbol' && id.includes('place')) {
          if (id.includes('place-neighbourhood') || id.includes('place-suburb')) {
            // hide tiny neighbourhood noise
            map.setLayoutProperty(id, 'visibility', 'none');
          } else {
            map.setPaintProperty(id, 'text-color', BENJAMIN_COLORS.placeLabel);
            map.setPaintProperty(id, 'text-halo-color', BENJAMIN_COLORS.canvas);
            map.setPaintProperty(id, 'text-halo-width', 1);
          }
        }

        // POIs – hide icons, very subtle or no labels
        if (id.includes('poi')) {
          if (type === 'symbol') {
            map.setLayoutProperty(id, 'visibility', 'none');
          }
        }

        // Transit – almost completely hidden
        if (id.includes('transit') || id.includes('rail')) {
          if (type === 'line') {
            map.setPaintProperty(id, 'line-color', BENJAMIN_COLORS.transitLine);
            map.setPaintProperty(id, 'line-opacity', 0.2);
          } else if (type === 'symbol') {
            map.setLayoutProperty(id, 'visibility', 'none');
          }
        }

        // Boundaries – just a hint
        if ((id.includes('boundary') || id.includes('admin')) && type === 'line') {
          map.setPaintProperty(id, 'line-color', BENJAMIN_COLORS.boundary);
          map.setPaintProperty(id, 'line-opacity', 0.3);
        }
      } catch {
        // some layers won't support some props – ignore
      }
    });
  };

  if (map.isStyleLoaded()) {
    applyTheme();
  } else {
    map.once('style.load', applyTheme);
  }
}

/**
 * Gets the base style URL for Benjamin theme
 * Uses custom style from env if available, otherwise falls back to dark-v11
 * We'll override colors with applyBenjaminTheme if using fallback
 */
export function getBenjaminMapStyle(): string {
  // Try to get custom style URL from env
  try {
    const env = getEnv();
    if (env.MAPBOX_STYLE_URL) {
      return env.MAPBOX_STYLE_URL;
    }
  } catch (error) {
    // If env module not available, fall back to default
    console.log('[mapboxTheme] Could not read MAPBOX_STYLE_URL from env, using fallback');
  }
  
  // Fallback to navigation-night for better navigation features (3D buildings, better road hierarchy)
  // This style is optimized for turn-by-turn navigation
  return 'mapbox://styles/mapbox/navigation-night-v1';
}

/**
 * Creates a custom route layer with Benjamin emerald green
 * Primary green stroke with highlight green outline/glow
 */
export function createBenjaminRouteLayer(
  sourceId: string,
  routeData: GeoJSON.Feature<GeoJSON.LineString>
): mapboxgl.LayerSpecification {
  return {
    id: `benjamin-route-${sourceId}`,
    type: 'line',
    source: sourceId,
    layout: {
      'line-join': 'round',
      'line-cap': 'round',
    },
    paint: {
      'line-color': BENJAMIN_COLORS.emeraldGreen, // #02C97A
      'line-width': 4,
      'line-opacity': 0.9,
      'line-blur': 0.5,
    },
  };
}

/**
 * Creates a route layer with outline/glow effect
 * Uses highlight green (#4BF5A7) at low opacity for glow
 */
export function createBenjaminRouteLayerWithGlow(
  sourceId: string,
  routeData: GeoJSON.Feature<GeoJSON.LineString>
): mapboxgl.LayerSpecification[] {
  // Glow layer (wider, lower opacity)
  const glowLayer: mapboxgl.LayerSpecification = {
    id: `benjamin-route-glow-${sourceId}`,
    type: 'line',
    source: sourceId,
    layout: {
      'line-join': 'round',
      'line-cap': 'round',
    },
    paint: {
      'line-color': BENJAMIN_COLORS.emeraldSoft, // #4BF5A7
      'line-width': 6,
      'line-opacity': 0.3,
      'line-blur': 1,
    },
  };
  
  // Main route layer
  const mainLayer = createBenjaminRouteLayer(sourceId, routeData);
  
  return [glowLayer, mainLayer];
}

