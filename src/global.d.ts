// global types

// Lordicon custom element type declaration
import React from 'react';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'lord-icon': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          src?: string;
          trigger?: string;
          state?: string;
          colors?: string;
          stroke?: string;
          style?: React.CSSProperties;
        },
        HTMLElement
      >;
    }
  }
}

// Google Maps types - loaded via script tag
declare namespace google {
  namespace maps {
    class Map {
      constructor(mapDiv: HTMLElement | null, opts?: MapOptions);
      setCenter(latlng: LatLng | LatLngLiteral): void;
      setZoom(zoom: number): void;
    }
    
    class Marker {
      constructor(opts?: MarkerOptions);
      setMap(map: Map | null): void;
    }
    
    class Polyline {
      constructor(opts?: PolylineOptions);
      setMap(map: Map | null): void;
    }
    
    class Geocoder {
      geocode(request: GeocoderRequest, callback: (results: GeocoderResult[], status: GeocoderStatus) => void): void;
    }
    
    namespace places {
      class AutocompleteService {
        getPlacePredictions(request: AutocompletionRequest, callback: (predictions: Prediction[], status: PlacesServiceStatus) => void): void;
      }
      
      class PlacesService {
        constructor(attrContainer: HTMLElement);
        getDetails(request: PlaceDetailsRequest, callback: (place: PlaceResult, status: PlacesServiceStatus) => void): void;
      }
      
      class AutocompleteSessionToken {
        constructor();
      }
      
      enum PlacesServiceStatus {
        OK = "OK",
        ZERO_RESULTS = "ZERO_RESULTS",
        OVER_QUERY_LIMIT = "OVER_QUERY_LIMIT",
        REQUEST_DENIED = "REQUEST_DENIED",
        INVALID_REQUEST = "INVALID_REQUEST",
      }
      
      interface AutocompletionRequest {
        input: string;
        sessionToken?: AutocompleteSessionToken;
        types?: string[];
        componentRestrictions?: { country: string[] };
      }
      
      interface Prediction {
        description: string;
        place_id: string;
        structured_formatting: StructuredFormatting;
      }
      
      interface StructuredFormatting {
        main_text: string;
        secondary_text?: string;
        main_text_matched_substrings?: any[];
        secondary_text_matched_substrings?: any[];
      }
      
      interface PlaceDetailsRequest {
        placeId: string;
        fields?: string[];
        sessionToken?: AutocompleteSessionToken;
      }
      
      interface PlaceResult {
        formatted_address?: string;
        address_components?: AddressComponent[];
        geometry?: {
          location: LatLng | LatLngLiteral;
        };
        place_id?: string;
      }
      
      interface AddressComponent {
        long_name: string;
        short_name: string;
        types: string[];
      }
    }
    
    enum SymbolPath {
      CIRCLE = 0,
      FORWARD_CLOSED_ARROW = 1,
      FORWARD_OPEN_ARROW = 2,
      BACKWARD_CLOSED_ARROW = 3,
      BACKWARD_OPEN_ARROW = 4,
    }
    
    enum GeocoderStatus {
      OK = "OK",
      ZERO_RESULTS = "ZERO_RESULTS",
      OVER_QUERY_LIMIT = "OVER_QUERY_LIMIT",
      REQUEST_DENIED = "REQUEST_DENIED",
      INVALID_REQUEST = "INVALID_REQUEST",
    }
    
    interface MapOptions {
      center?: LatLng | LatLngLiteral;
      zoom?: number;
      disableDefaultUI?: boolean;
      zoomControl?: boolean;
      streetViewControl?: boolean;
      fullscreenControl?: boolean;
      mapTypeControl?: boolean;
      gestureHandling?: "cooperative" | "greedy" | "none" | "auto";
      styles?: MapTypeStyle[];
    }
    
    interface MarkerOptions {
      position?: LatLng | LatLngLiteral;
      map?: Map | null;
      icon?: string | Icon | Symbol;
      label?: string | MarkerLabel;
      zIndex?: number;
    }
    
    interface PolylineOptions {
      path?: LatLng[] | LatLngLiteral[] | LatLng[] | LatLngLiteral[];
      map?: Map | null;
      strokeColor?: string;
      strokeOpacity?: number;
      strokeWeight?: number;
      geodesic?: boolean;
    }
    
    interface GeocoderRequest {
      address?: string;
      location?: LatLng | LatLngLiteral;
    }
    
    interface GeocoderResult {
      formatted_address: string;
      geometry: {
        location: LatLng | LatLngLiteral;
      };
      address_components?: any[];
    }
    
    interface LatLng {
      lat(): number;
      lng(): number;
    }
    
    interface LatLngLiteral {
      lat: number;
      lng: number;
    }
    
    interface Icon {
      path?: string | SymbolPath;
      scale?: number;
      fillColor?: string;
      fillOpacity?: number;
      strokeColor?: string;
      strokeWeight?: number;
    }
    
    interface Symbol {
      path?: string | SymbolPath;
      scale?: number;
      fillColor?: string;
      fillOpacity?: number;
      strokeColor?: string;
      strokeWeight?: number;
    }
    
    interface MarkerLabel {
      text?: string;
      color?: string;
      fontSize?: string;
      fontWeight?: string;
    }
    
    interface MapTypeStyle {
      featureType?: string;
      elementType?: string;
      stylers?: Array<{ visibility?: string }>;
    }
  }
}

declare var google: {
  maps: typeof google.maps;
};
