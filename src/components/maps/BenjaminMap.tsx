/// <reference path="../../global.d.ts" />

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useGoogleMaps } from "@/components/maps/GoogleMapsProvider";

export type LatLngLiteral = { lat: number; lng: number };

export interface BenjaminMapProps {
  center: LatLngLiteral;
  zoom?: number;
  className?: string;
  marker?: LatLngLiteral | null; // Optional marker position
  minimal?: boolean; // If true, hide POI labels and reduce map features
  draggable?: boolean; // If true, marker can be dragged
  onMarkerDrag?: (position: LatLngLiteral) => void; // Callback when marker is dragged
  showGoogleLogo?: boolean; // If true, show Google logo on bottom left
  gestureHandling?: "auto" | "cooperative" | "greedy" | "none"; // Gesture handling mode. "cooperative" requires 2 fingers to pan
}

export function BenjaminMap({
  center,
  zoom = 15,
  className,
  marker,
  minimal = false,
  draggable = false,
  onMarkerDrag,
  showGoogleLogo = false,
  gestureHandling,
}: BenjaminMapProps) {
  const { isReady, isError } = useGoogleMaps();
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const dragListenerRef = useRef<any>(null);
  // For small embedded/preview maps inside scrollable lists, default to cooperative (2-finger pan)
  // so a single-finger gesture scrolls the page instead of moving the map.
  const effectiveGestureHandling: BenjaminMapProps["gestureHandling"] =
    gestureHandling ?? (minimal ? "cooperative" : "auto");

  const gestureHandlingRef = useRef<string | undefined>(effectiveGestureHandling);

  useEffect(() => {
    const g = (window as any).google as any;

    console.log("[BenjaminMap DEBUG]", {
      isReady,
      isError,
      hasWindowGoogle: !!g,
      hasMapsNamespace: !!g?.maps,
      mapCtorType: typeof g?.maps?.Map,
    });

    if (!isReady || !g?.maps || !mapDivRef.current) return;

    const MapCtor = g.maps.Map as any;
    if (typeof MapCtor !== "function") {
      console.error("[BenjaminMap DEBUG] google.maps.Map is NOT a constructor");
      return;
    }

    // Minimal map styles - hide POI labels, reduce features
    const minimalStyles = minimal ? [
      {
        featureType: "poi",
        elementType: "labels",
        stylers: [{ visibility: "off" }],
      },
      {
        featureType: "poi.business",
        stylers: [{ visibility: "off" }],
      },
      {
        featureType: "poi.attraction",
        stylers: [{ visibility: "off" }],
      },
      {
        featureType: "poi.place_of_worship",
        stylers: [{ visibility: "off" }],
      },
      {
        featureType: "poi.school",
        stylers: [{ visibility: "off" }],
      },
      {
        featureType: "poi.sports_complex",
        stylers: [{ visibility: "off" }],
      },
      {
        featureType: "transit",
        elementType: "labels",
        stylers: [{ visibility: "off" }],
      },
      {
        featureType: "landscape",
        elementType: "geometry.fill",
        stylers: [{ color: "#f5f5f5" }],
      },
    ] : [];

    // Track gestureHandling to detect changes - Google Maps requires gestureHandling at creation time
    const shouldRecreateMap = gestureHandlingRef.current !== effectiveGestureHandling && mapInstanceRef.current;

    // Recreate map if gestureHandling changed (Google Maps requires it at creation time)
    if (shouldRecreateMap) {
      console.log("[BenjaminMap] gestureHandling changed, recreating map:", gestureHandlingRef.current, "->", effectiveGestureHandling);
      if (markerRef.current) {
        markerRef.current.setMap(null);
        markerRef.current = null;
      }
      mapInstanceRef.current = null;
      gestureHandlingRef.current = effectiveGestureHandling;
    }

    // Just create once – no fancy ref tracking
    if (!mapInstanceRef.current) {
      console.log("[BenjaminMap DEBUG] creating map instance", {
        center,
        zoom,
        minimal,
        gestureHandling: effectiveGestureHandling,
      });

      const mapOptions: any = {
        center,
        zoom,
        disableDefaultUI: true,
        keyboardShortcuts: false,
        fullscreenControl: false,
        mapTypeControl: false,
        streetViewControl: false,
        zoomControl: true, // Enable zoom controls
        zoomControlOptions: {
          position: g.maps.ControlPosition.RIGHT_CENTER,
        },
        gestureHandling: effectiveGestureHandling, // Configure gesture handling (cooperative = 2-finger pan) - MUST be set at creation
      };

      console.log("[BenjaminMap] Creating map with gestureHandling:", effectiveGestureHandling);

      if (minimal && minimalStyles.length > 0) {
        mapOptions.styles = minimalStyles;
      }

      mapInstanceRef.current = new MapCtor(mapDivRef.current, mapOptions);
      gestureHandlingRef.current = effectiveGestureHandling;
    } else {
      // Update existing map
      mapInstanceRef.current.setCenter(center);
      mapInstanceRef.current.setZoom(zoom ?? 15);
      
      // Update zoom controls and gesture handling
      console.log("[BenjaminMap] Updating map options with gestureHandling:", effectiveGestureHandling);
      mapInstanceRef.current.setOptions({
        zoomControl: true,
        zoomControlOptions: {
          position: g.maps.ControlPosition.RIGHT_CENTER,
        },
        gestureHandling: effectiveGestureHandling, // Update gesture handling if prop changed
      });
      
      // Update styles if minimal prop changed
      if (minimal && minimalStyles.length > 0) {
        mapInstanceRef.current.setOptions({ styles: minimalStyles });
      } else if (!minimal) {
        mapInstanceRef.current.setOptions({ styles: [] });
      }
    }

    // Handle marker
    if (marker && marker.lat && marker.lng) {
      const MarkerCtor = g.maps.Marker as any;
      if (typeof MarkerCtor === "function") {
        if (markerRef.current) {
          // Update existing marker position only if it changed externally
          const currentPos = markerRef.current.getPosition();
          if (!currentPos || 
              Math.abs(currentPos.lat() - marker.lat) > 0.0001 || 
              Math.abs(currentPos.lng() - marker.lng) > 0.0001) {
            markerRef.current.setPosition({ lat: marker.lat, lng: marker.lng });
          }
          // Update draggable state
          markerRef.current.setDraggable(draggable);
          
          // Remove old drag listener if it exists
          if (dragListenerRef.current) {
            g.maps.event.removeListener(dragListenerRef.current);
            dragListenerRef.current = null;
          }
          
          // Add dragend listener if draggable and callback provided
          if (draggable && onMarkerDrag) {
            dragListenerRef.current = markerRef.current.addListener('dragend', () => {
              const position = markerRef.current.getPosition();
              if (position && onMarkerDrag) {
                onMarkerDrag({
                  lat: position.lat(),
                  lng: position.lng(),
                });
              }
            });
          }
          
          // Ensure map centers on marker
          if (mapInstanceRef.current) {
            mapInstanceRef.current.setCenter({ lat: marker.lat, lng: marker.lng });
          }
        } else {
          // Create new marker using MapPin SVG
          // Using the MapPin SVG from assets/icons/MapPin.svg
          // Original viewBox: 0 0 170 253, scaling to appropriate marker size
          const mapPinSvg = `
            <svg width="34" height="50" viewBox="0 0 170 253" fill="none" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
              <g clip-path="url(#clip0_4001_60103)">
                <path d="M83.6843 252.598C83.276 252.434 82.5625 251.685 82.101 250.936C80.1983 247.848 78.1855 244.5 77.2554 242.885C76.7122 241.937 75.4378 239.91 74.4296 238.377C73.4215 236.843 72.0086 234.582 71.2915 233.354C69.3142 229.956 67.8126 227.496 65.7998 224.369C63.8651 221.358 61.8346 218.029 60.2122 215.196C59.6691 214.248 58.3982 212.221 57.3901 210.687C56.3819 209.154 54.969 206.893 54.2519 205.664C52.2746 202.267 50.773 199.807 48.7602 196.679C47.7556 195.118 46.3463 192.853 45.6256 191.642C44.905 190.435 43.1158 187.51 41.6533 185.142C40.1907 182.775 38.2738 179.661 37.3934 178.22C36.513 176.779 34.596 173.665 33.1335 171.298C31.6709 168.93 29.754 165.817 28.8736 164.375C27.9932 162.934 26.0763 159.821 24.6137 157.453C20.7478 151.205 18.0889 146.828 12.97 138.284C12.5617 137.602 11.5429 135.681 10.7087 134.024C9.87444 132.366 8.81301 130.417 8.34797 129.696C7.88648 128.979 7.37885 127.861 7.2191 127.211C6.79311 125.504 6.18253 123.807 5.22405 121.681C4.75901 120.651 4.37917 119.565 4.37917 119.27C4.37917 118.972 4.06677 118.117 3.68338 117.367C3.30354 116.618 3.06215 115.933 3.15089 115.845C3.23964 115.759 2.99825 114.489 2.61486 113.022C2.23147 111.556 1.84453 109.788 1.75933 109.093C1.67058 108.393 1.43274 107.509 1.22684 107.126C1.02095 106.743 0.918001 106.363 0.999649 106.281C1.0813 106.203 0.999647 105.504 0.825701 104.726C0.321613 102.493 -0.0653262 93.6541 0.00922201 85.9224C0.0837702 77.8997 0.222217 75.6206 0.847002 72.0778C1.08485 70.7111 1.26589 69.1953 1.24459 68.7054C1.22684 68.2155 1.35464 67.4984 1.53214 67.1079C1.91908 66.2595 3.31064 61.3713 3.45619 60.3631C3.50944 59.9726 3.81473 59.1526 4.13067 58.5456C4.44662 57.935 4.62056 57.3528 4.51761 57.2463C4.41467 57.1434 4.65251 56.4263 5.0501 55.6488C5.44414 54.875 5.68909 54.1614 5.59324 54.062C5.44769 53.92 9.097 46.2025 10.5028 43.6786C10.7229 43.2881 11.1418 42.4893 11.4364 41.9036C11.731 41.3179 12.3416 40.441 12.7925 39.9547C13.2398 39.4684 13.6089 38.8897 13.6089 38.6732C13.6089 38.4531 14.0846 37.7325 14.6668 37.0722C15.2526 36.4084 15.7318 35.6948 15.7318 35.4854C15.7353 35.2759 16.3779 34.3956 17.1553 33.5329C17.9327 32.6703 18.9906 31.3071 19.5054 30.5013C20.3218 29.2162 26.5129 22.9258 29.4274 20.416C31.7348 18.4245 38.7317 13.3659 40.1872 12.6311C41.0427 12.198 42.3349 11.4206 43.059 10.9023C44.2376 10.0539 49.2146 7.59022 51.0606 6.93704C51.451 6.79859 52.5338 6.3442 53.4674 5.92531C54.3975 5.50643 55.4057 5.16209 55.7038 5.16209C55.9985 5.16209 56.7546 4.89584 57.3794 4.5728C58.0042 4.24976 58.9946 3.86282 59.5804 3.71372C60.1661 3.56463 62.4948 2.96114 64.7561 2.37541C67.0174 1.78613 70.294 1.14714 72.0335 0.948347C73.7765 0.749553 75.6792 0.46911 76.265 0.320014C77.5003 0.00762245 91.913 -0.0101271 94.0145 0.298715C94.7955 0.412312 96.4711 0.675005 97.7419 0.877349C99.0128 1.07969 100.529 1.32109 101.114 1.40983C101.7 1.49858 103.695 1.98492 105.552 2.48901C107.408 2.99309 109.244 3.45458 109.634 3.51848C110.025 3.57883 110.845 3.88767 111.452 4.20361C112.062 4.51955 112.644 4.6935 112.751 4.59055C112.854 4.4876 113.571 4.72545 114.348 5.12304C115.122 5.51708 115.836 5.76202 115.932 5.66617C116.201 5.39993 129.045 11.9531 130.043 12.8689C130.529 13.3162 131.108 13.6819 131.324 13.6819C131.544 13.6819 132.265 14.1575 132.925 14.7397C133.589 15.3255 134.313 15.8047 134.54 15.8047C134.768 15.8083 135.648 16.4472 136.493 17.2211C137.341 17.9985 138.701 19.06 139.514 19.5854C140.795 20.4054 146.851 26.3763 149.581 29.5109C151.502 31.7154 156.624 38.7868 157.366 40.26C157.799 41.1155 158.577 42.4077 159.095 43.1319C159.944 44.3104 162.407 49.2874 163.06 51.1334C163.199 51.5239 163.653 52.6066 164.072 53.5402C164.491 54.4703 164.835 55.4784 164.835 55.7766C164.835 56.0713 165.102 56.8274 165.425 57.4522C165.748 58.077 166.135 59.0674 166.287 59.6531C166.436 60.2389 166.983 62.3156 167.494 64.268C168.605 68.4818 169.642 75.1556 169.841 79.3551C170.373 90.6722 169.496 107.119 168.293 108.322C168.147 108.464 168.03 108.968 168.03 109.441C168.03 111.049 165.705 119.686 165.183 120.005C165.038 120.097 164.814 120.712 164.69 121.368C164.569 122.025 164.164 123.186 163.795 123.945C163.426 124.702 163.192 125.429 163.273 125.561C163.483 125.898 157.143 138.404 155.527 140.839C154.789 141.954 154.186 143.005 154.186 143.182C154.186 143.356 153.781 143.963 153.287 144.528C152.798 145.096 151.981 146.423 151.477 147.478C150.976 148.536 150.181 149.81 149.713 150.314C149.244 150.822 148.861 151.376 148.861 151.553C148.861 151.727 148.14 152.962 147.263 154.294C146.386 155.628 145.666 156.86 145.666 157.031C145.666 157.201 145.261 157.808 144.768 158.372C144.278 158.94 143.461 160.268 142.957 161.322C142.457 162.38 141.662 163.655 141.193 164.159C140.724 164.666 140.341 165.22 140.341 165.398C140.341 165.572 139.62 166.807 138.743 168.138C137.863 169.473 137.146 170.705 137.146 170.875C137.146 171.046 136.741 171.653 136.248 172.217C135.758 172.785 134.942 174.113 134.437 175.167C133.937 176.225 133.142 177.499 132.673 178.003C132.205 178.511 131.821 179.065 131.821 179.242C131.821 179.416 131.104 180.652 130.224 181.983C129.343 183.318 128.626 184.549 128.626 184.72C128.626 184.89 128.222 185.497 127.728 186.062C127.238 186.63 126.422 187.957 125.918 189.012C125.417 190.066 124.686 191.262 124.292 191.674C123.901 192.082 123.422 192.86 123.227 193.396C123.035 193.932 122.737 194.372 122.566 194.372C122.393 194.372 121.949 194.972 121.58 195.703C120.025 198.788 119.577 199.555 118.96 200.219C118.601 200.606 117.898 201.788 117.398 202.846C116.897 203.907 116.166 205.107 115.772 205.519C115.381 205.927 114.902 206.704 114.707 207.24C114.515 207.776 114.217 208.217 114.047 208.217C113.873 208.217 113.429 208.817 113.06 209.548C111.505 212.633 111.058 213.4 110.44 214.063C110.081 214.45 109.379 215.632 108.878 216.69C108.377 217.752 107.646 218.952 107.252 219.363C106.862 219.772 106.382 220.549 106.187 221.085C105.995 221.621 105.697 222.061 105.527 222.061C105.353 222.061 104.909 222.661 104.54 223.393C102.985 226.477 102.538 227.244 101.92 227.908C101.562 228.295 100.859 229.477 100.358 230.535C99.8577 231.596 99.1264 232.796 98.7324 233.208C98.3419 233.616 97.8626 234.394 97.6674 234.93C97.4757 235.466 97.1775 235.906 97.0071 235.906C96.8332 235.906 96.3894 236.506 96.0202 237.237C94.4654 240.322 94.0181 241.089 93.4004 241.753C93.0419 242.14 92.339 243.322 91.8349 244.383C91.3343 245.441 90.5427 246.723 90.0741 247.227C89.6055 247.734 89.2222 248.324 89.2222 248.54C89.2222 248.76 88.8246 249.367 88.3347 249.896C87.8448 250.421 87.4472 251.075 87.4472 251.344C87.4472 251.998 86.0592 252.953 85.1504 252.924C84.7528 252.91 84.0961 252.764 83.6843 252.598ZM74.4829 149.562C74.6143 149.909 76.9181 149.988 85.0404 149.917L95.4345 149.821L95.7895 138.461L102.712 138.28C108.956 138.12 109.808 138.024 111.409 137.29C114.569 135.838 117.266 132.554 117.266 130.154C117.266 129.572 117.426 128.997 117.621 128.876C118.126 128.564 118.097 97.8821 117.59 95.1344C117.377 93.9807 116.958 92.5537 116.663 91.9644C116.06 90.7681 113.745 88.2299 113.255 88.2299C113.081 88.2299 112.513 87.9246 111.991 87.5554C111.469 87.1827 110.486 86.7531 109.805 86.6005C109.127 86.4478 100.664 86.2313 90.9971 86.1212L73.425 85.9224V76.6927L115.669 76.3377V55.3932L95.7895 55.0383L95.4345 43.6786H74.49L74.135 55.0383L67.5677 55.2655C61.1104 55.4855 59.3638 55.7234 57.6208 56.6215C56.5097 57.1931 54.0815 59.4969 54.0709 59.9904C54.0673 60.1963 53.7514 60.7607 53.368 61.2506C52.9846 61.7405 52.6687 62.6493 52.6651 63.2705C52.6616 63.8953 52.4983 64.5023 52.303 64.623C52.0758 64.765 51.948 70.6862 51.9516 81.2401C51.9551 98.2406 52.0226 99.1565 53.4887 101.95C54.1561 103.218 56.3038 105.252 58.1604 106.366L59.5804 107.222L96.4995 107.577V116.807L54.2555 117.162V138.106L74.135 138.461L74.2273 143.786C74.277 146.715 74.3942 149.313 74.4829 149.562Z" fill="black"/>
                <path d="M74.483 149.562C74.3943 149.313 74.2771 146.715 74.2274 143.786L74.1351 138.461L64.1954 138.284L54.2556 138.106V127.634V117.162L75.3776 116.984L96.4996 116.807V112.192V107.577L78.0401 107.4L59.5805 107.222L58.1605 106.366C56.3039 105.252 54.1562 103.218 53.4888 101.95C52.0227 99.1566 51.9553 98.2408 51.9517 81.2403C51.9482 70.6864 52.076 64.7651 52.3032 64.6232C52.4984 64.5025 52.6617 63.8954 52.6653 63.2706C52.6688 62.6494 52.9848 61.7406 53.3681 61.2507C53.7515 60.7609 54.0675 60.1964 54.071 59.9905C54.0817 59.4971 56.5098 57.1932 57.6209 56.6217C59.364 55.7235 61.1105 55.4857 67.5678 55.2656L74.1351 55.0384L74.3126 49.3586L74.4901 43.6787H84.9624H95.4346L95.6121 49.3586L95.7896 55.0384L105.729 55.2159L115.669 55.3934V65.8656V76.3378L94.5472 76.5153L73.4252 76.6928V81.3077V85.9226L90.9972 86.1214C100.664 86.2314 109.127 86.448 109.805 86.6006C110.486 86.7533 111.47 87.1828 111.991 87.5555C112.513 87.9247 113.081 88.23 113.255 88.23C113.745 88.23 116.06 90.7682 116.663 91.9645C116.958 92.5538 117.377 93.9809 117.59 95.1346C118.097 97.8822 118.126 128.564 117.622 128.876C117.426 128.997 117.267 129.572 117.267 130.154C117.267 132.554 114.569 135.838 111.409 137.29C109.808 138.025 108.956 138.12 102.712 138.28L95.7896 138.461L95.6121 144.141L95.4346 149.821L85.0405 149.917C76.9183 149.988 74.6144 149.91 74.483 149.562Z" fill="black"/>
                <g clip-path="url(#clip1_4001_60103)">
                  <path d="M92.1357 130.146C93.6307 129.658 95.023 128.925 96.2785 127.972C99.3123 125.691 101.257 122.3 101.599 118.671C101.643 118.25 101.667 117.83 101.667 117.43C101.667 113.619 99.9376 109.965 96.9234 107.4C95.5115 106.203 93.9042 105.304 92.1357 104.708V85.3037C109.454 87.4728 122.405 101.147 122.405 117.43C122.405 121.485 121.614 125.422 120.051 129.14L120.002 129.262C118.409 132.789 116.289 136.004 113.69 138.837C108.897 143.889 102.649 147.392 95.6288 148.955C94.4123 149.224 93.2594 149.424 92.1309 149.566V130.146H92.1357Z" fill="#13F287"/>
                  <mask id="mask0_4001_60103" style="mask-type:luminance" maskUnits="userSpaceOnUse" x="75" y="104" width="4" height="2">
                    <path d="M75.9502 105.017V104.943C76.6537 104.992 77.3572 105.017 78.0656 105.017H75.9502Z" fill="white"/>
                  </mask>
                  <g mask="url(#mask0_4001_60103)">
                    <mask id="mask1_4001_60103" style="mask-type:luminance" maskUnits="userSpaceOnUse" x="73" y="102" width="8" height="6">
                      <path d="M80.5085 102.501H73.5078V107.46H80.5085V102.501Z" fill="white"/>
                    </mask>
                    <g mask="url(#mask1_4001_60103)">
                      <rect x="73.4199" y="102.3" width="7.2694" height="5.15893" fill="url(#pattern0_4001_60103)"/>
                    </g>
                  </g>
                  <path d="M77.2696 103.667C59.9511 101.508 47 87.8337 47 71.5411C47 67.496 47.7914 63.5535 49.3547 59.8309C49.3792 59.7674 49.4085 59.7039 49.4378 59.6257C51.0011 56.1816 53.1213 52.9719 55.7155 50.1335C60.4982 45.0918 66.7466 41.589 73.7717 40.0208C74.9247 39.7619 76.0971 39.5567 77.2696 39.4102V58.8196C75.7747 59.3082 74.3824 60.041 73.1268 60.9936C70.093 63.2751 68.1536 66.6655 67.8067 70.2904C67.7627 70.7204 67.7432 71.1307 67.7432 71.5411C67.7432 75.3517 69.4726 79.0059 72.4869 81.5707C73.8987 82.7676 75.5109 83.6714 77.2745 84.2577V103.667H77.2696Z" fill="#13F287"/>
                  <g opacity="0.85">
                    <mask id="mask2_4001_60103" style="mask-type:luminance" maskUnits="userSpaceOnUse" x="47" y="117" width="44" height="33">
                      <path d="M84.7347 149.999C82.5363 149.999 80.4405 149.892 78.4961 149.672C62.3207 148.016 49.3208 135.959 47.5719 120.99C47.4791 120.253 47.4204 119.539 47.3862 118.802C47.3862 118.714 47.3911 118.596 47.4009 118.474C47.4009 118.474 47.4107 118.25 47.4155 118.186L67.9975 117.111C68.0024 117.16 68.0219 117.233 68.0366 117.307C68.0659 117.468 68.0952 117.649 68.1099 117.834C68.1196 118.225 68.1441 118.606 68.1929 118.963C68.5691 122.217 70.2203 125.245 72.8438 127.478C74.4022 128.797 76.2 129.764 78.1932 130.346C78.3447 130.385 81.2222 131.083 85.0865 131.083C87.0211 131.083 88.858 130.908 90.5678 130.556V149.741C89.5224 149.838 87.3728 149.995 84.7347 149.995V149.999Z" fill="white"/>
                    </mask>
                    <g mask="url(#mask2_4001_60103)">
                      <mask id="mask3_4001_60103" style="mask-type:luminance" maskUnits="userSpaceOnUse" x="46" y="115" width="46" height="37">
                        <path d="M91.7888 115.891H46.1646V151.221H91.7888V115.891Z" fill="white"/>
                      </mask>
                      <g mask="url(#mask3_4001_60103)">
                        <path d="M45.9839 115.666H91.9452V151.31H45.9839V115.666Z" fill="url(#paint0_linear_4001_60103)"/>
                      </g>
                    </g>
                  </g>
                  <path d="M57.7774 129.447C52.9409 129.447 48.676 126.032 47.6403 121.328L47.6256 121.259C47.6061 121.172 47.5865 121.074 47.5719 120.981C47.4449 120.341 47.3813 119.711 47.3813 119.051C47.3813 119.007 47.3813 118.958 47.3813 118.915V118.831C47.3813 118.714 47.3911 118.597 47.396 118.47V118.377C47.4058 118.26 47.4107 118.143 47.4253 118.03L47.4546 117.776L47.5084 117.385C47.6061 116.76 47.7673 116.13 47.9871 115.529C48.0262 115.417 48.163 115.06 48.163 115.06C48.29 114.747 48.4512 114.41 48.6369 114.078C48.7688 113.848 48.9056 113.624 49.0473 113.399L49.1694 113.204C49.2427 113.096 49.3208 112.989 49.399 112.886C49.526 112.715 49.6433 112.559 49.7752 112.417C51.6951 110.082 54.5188 108.714 57.5478 108.646H57.7725C61.6954 108.646 65.2422 110.815 67.0302 114.303C67.0742 114.381 67.0937 114.415 67.1084 114.449L67.1719 114.576C67.4552 115.167 67.68 115.793 67.8265 116.384V116.614L67.9047 116.701C67.934 116.824 67.9633 116.951 67.9877 117.073C67.9877 117.107 68.0073 117.21 68.0268 117.302C68.0561 117.464 68.0855 117.644 68.1001 117.83C68.1441 118.182 68.1685 118.504 68.1783 118.871V119.051C68.1783 124.782 63.5079 129.447 57.7676 129.447H57.7774Z" fill="#13F287"/>
                  <g opacity="0.85">
                    <mask id="mask4_4001_60103" style="mask-type:luminance" maskUnits="userSpaceOnUse" x="78" y="39" width="45" height="33">
                      <path d="M101.403 71.8882C101.398 71.8393 101.379 71.7563 101.364 71.683C101.335 71.5315 101.31 71.3459 101.296 71.1602C101.291 70.7792 101.262 70.3981 101.213 70.0317C100.837 66.7781 99.1854 63.7492 96.5668 61.5166C95.0084 60.1975 93.2106 59.2302 91.2174 58.6489C91.0659 58.6098 88.1884 57.9112 84.3241 57.9112C82.3895 57.9112 80.5526 58.0871 78.8379 58.4339V39.254C79.8834 39.1563 82.0329 39 84.671 39C86.8694 39 88.9652 39.1075 90.9096 39.3273C107.08 40.9835 120.085 53.0405 121.834 68.0092C121.927 68.7469 121.985 69.4601 122.019 70.2027C122.019 70.2858 122.015 70.4079 122.005 70.53C122.005 70.53 121.995 70.7596 121.99 70.8183L101.408 71.893L101.403 71.8882Z" fill="white"/>
                    </mask>
                    <g mask="url(#mask4_4001_60103)">
                      <mask id="mask5_4001_60103" style="mask-type:luminance" maskUnits="userSpaceOnUse" x="76" y="36" width="49" height="39">
                        <path d="M124.458 36.5576H76.3906V74.3311H124.458V36.5576Z" fill="white"/>
                      </mask>
                      <g mask="url(#mask5_4001_60103)">
                        <rect x="76.2339" y="36.4062" width="48.3063" height="37.9885" fill="url(#paint1_linear_4001_60103)"/>
                      </g>
                    </g>
                  </g>
                  <path d="M111.628 80.3448C107.706 80.3448 104.159 78.1757 102.371 74.6875L102.229 74.4189C101.946 73.8228 101.721 73.2024 101.574 72.6113V72.3572L101.486 72.2742C101.457 72.1569 101.433 72.0397 101.408 71.9224C101.408 71.8882 101.389 71.7808 101.364 71.6831C101.335 71.5316 101.311 71.346 101.296 71.1603C101.252 70.8135 101.228 70.4861 101.218 70.1197V69.9439C101.218 64.2134 105.888 59.5479 111.628 59.5479C116.465 59.5479 120.725 62.9627 121.766 67.6673L121.79 67.7699C121.805 67.8481 121.824 67.936 121.834 68.019C121.961 68.6541 122.024 69.2843 122.024 69.9439C122.024 69.9878 122.024 70.0367 122.024 70.0807V70.1637C122.024 70.281 122.015 70.3982 122.01 70.5203V70.6181C121.995 70.7597 121.99 70.8672 121.98 70.9649L121.956 71.1994L121.897 71.6049C121.8 72.2351 121.634 72.8604 121.419 73.4613C121.38 73.5737 121.341 73.6714 121.301 73.774L121.243 73.9303C121.116 74.2479 120.955 74.5801 120.769 74.9123C120.637 75.137 120.5 75.3666 120.359 75.5913L120.236 75.7867C120.163 75.8942 120.085 76.0017 120.007 76.1043C119.88 76.2753 119.763 76.4267 119.631 76.5733C117.711 78.9085 114.892 80.2715 111.868 80.3448H111.633H111.628Z" fill="#13F287"/>
                </g>
              </g>
              <defs>
                <pattern id="pattern0_4001_60103" patternContentUnits="objectBoundingBox" width="1" height="1">
                  <use xlink:href="#image0_4001_60103" transform="scale(0.0322581 0.0454545)"/>
                </pattern>
                <linearGradient id="paint0_linear_4001_60103" x1="51.8115" y1="125.659" x2="77.8829" y2="149.538" gradientUnits="userSpaceOnUse">
                  <stop stop-color="#13F287"/>
                  <stop offset="1" stop-color="#060606"/>
                </linearGradient>
                <linearGradient id="paint1_linear_4001_60103" x1="82.3588" y1="47.0564" x2="110.109" y2="72.1209" gradientUnits="userSpaceOnUse">
                  <stop offset="0.0144231" stop-color="#060606"/>
                  <stop offset="1" stop-color="#13F287"/>
                </linearGradient>
                <clipPath id="clip0_4001_60103">
                  <rect width="170" height="253" fill="white"/>
                </clipPath>
                <clipPath id="clip1_4001_60103">
                  <rect width="75.4053" height="111" fill="white" transform="translate(47 39)"/>
                </clipPath>
                <image id="image0_4001_60103" width="31" height="22" preserveAspectRatio="none" xlink:href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB8AAAAWCAYAAAA4oUfxAAAACXBIWXMAABcRAAAXEQHKJvM/AAADO0lEQVRIib2W3W7bRhCFv9ldLmnKlhU7LloYuWoeo6/QN+4T9AHayyBAULeBHVvRL8ndmdyQsiVZ/klRdACCXHBxzpzD4cyKmRlDzHXJLC83S5IpjbUs8pqVrlnomqWuaLQjmwJQuECUgpGrOHIllYscuYrKRUau4m2YcChERNxmcZOmO8QADkEQwFCMbJlsSrLcX+T7JAZIgni8OBxCa4mr7prWuoMJuA3xUxs8Di8eMyNZphuI19bSaaKzRDbFAC99ug4Znh+EHcJ3c10+nZkIbgAUERRlpQ0LXQ/3FckyskVcSiRKMTj2EDdp+hh/3+pHysX16nEoRqMt0zznNs1orCNbRlEEIUroLRc5iLWfgDu4a2eDUPsKL55syl2e8yV9ZZYX3KUZC10DUEigdJFCwiPVm2it23E5vETeA3uiBLJlVtpw1d0wz0suwoTKlRTyEyNXUbsSL8/raa0jSvE65QCGMQknVC7yJX3ln/aGT+1nrtOUQgJnYUztSoL4F7Ea/U7lgvTf3IzbPOPP9UcWeYUg/Fr8wg/FGbUrXwP1/bZDX/mNdfw2/Z2/2msAqjbyY3H+auL9eDX5PK/4Y/WBY3dE6SKVi1zGC6K8GuLfka+15XN3S8DzvnpHIQWlK/i5vERRGu0oXfHfk2dTltpwm2eM/BFnYYyaMgnHvK/ecZfmTMOct26Ce+IX245Npb9IbhhrbVnpmkZbPI7LeMGbMCaIp3YlrXU02tFqR+Xii+TbDj1L3lmmtY6lNhgQXWDsRxQSKCTwJow5chWKkk1R7EX1x65+ID/x9aNpZgaK0mmitUSyhGEE8Zz4uu9k+PsqVzMUxczgidYKcB5Od9bh2NW9bXvDJQ2qW+tndxBPlEgSpZTY93zxBPGI9P9vScQ/0beiFDvfG4YOdx5Od14k0kCcSJYBEPo2W7lIOQAVEu6bj1o/7x+OJrvE+6rvybcTSKbke7DeShvonTjCoLaQ8HBwGKze2L8dJ74+SAx7BXceThlpy1LXXOmKvt57ai8OMcHhMOkLa1Nc22oNwwzGod4prkMh22e4Q/Gx+ZtkiYQOs9sGy/rTSj9YTpn442eJHhHLM5X5f8Q3qAe2aSu/0P4AAAAASUVORK5CYII="/>
              </defs>
            </svg>
          `;
          
          markerRef.current = new MarkerCtor({
            position: { lat: marker.lat, lng: marker.lng },
            map: mapInstanceRef.current,
            draggable: draggable,
            icon: {
              url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(mapPinSvg),
              scaledSize: new g.maps.Size(34, 50),
              anchor: new g.maps.Point(17, 50),
            },
          });
          
          // Add dragend listener if draggable and callback provided
          if (draggable && onMarkerDrag) {
            dragListenerRef.current = markerRef.current.addListener('dragend', () => {
              const position = markerRef.current.getPosition();
              if (position && onMarkerDrag) {
                onMarkerDrag({
                  lat: position.lat(),
                  lng: position.lng(),
                });
              }
            });
          }
          
          // Ensure map centers on marker when it's first created
          if (mapInstanceRef.current) {
            mapInstanceRef.current.setCenter({ lat: marker.lat, lng: marker.lng });
          }
        }
      }
    } else {
      // Remove marker if marker prop is null/undefined
      if (markerRef.current) {
        // Remove drag listener
        if (dragListenerRef.current && g?.maps?.event) {
          g.maps.event.removeListener(dragListenerRef.current);
          dragListenerRef.current = null;
        }
        markerRef.current.setMap(null);
        markerRef.current = null;
      }
    }

    // Handle Google Maps attribution visibility
    let hideAttributionTimeout: ReturnType<typeof setTimeout> | null = null;
    let observer: MutationObserver | null = null;
    
    if (mapInstanceRef.current && mapDivRef.current) {
      const adjustAttribution = () => {
        const mapContainer = mapDivRef.current;
        if (mapContainer) {
          // Always hide keyboard shortcuts and terms links
          const attributionLinks = mapContainer.querySelectorAll('a[href*="keyboard_shortcuts"], a[href*="terms"]');
          attributionLinks.forEach((link: any) => {
            if (link.parentElement) {
              link.parentElement.style.display = 'none';
            }
          });
          
          // Hide copyright container but keep the Google logo if showGoogleLogo is true
          const copyrightContainers = mapContainer.querySelectorAll('.gm-style-cc, .gm-bundled-control');
          copyrightContainers.forEach((container: any) => {
            container.style.display = 'none';
          });

          // Handle Google logo visibility
          if (showGoogleLogo) {
            // Find and style the Google logo to show it in bottom left
            const googleLogos = mapContainer.querySelectorAll('img[src*="google"], img[alt="Google"]');
            googleLogos.forEach((img: any) => {
              const parent = img.closest('div');
              if (parent && parent.classList.contains('gmnoprint')) {
                // Show the logo container
                parent.style.display = 'block';
                parent.style.position = 'absolute';
                parent.style.left = '10px';
                parent.style.bottom = '10px';
                parent.style.zIndex = '1';
                img.style.display = 'block';
              }
            });
          } else {
            // Hide everything including the logo
            const gmnoprints = mapContainer.querySelectorAll('.gmnoprint');
            gmnoprints.forEach((container: any) => {
              container.style.display = 'none';
            });
          }
        }
      };

      // Initial adjustment after map renders
      hideAttributionTimeout = setTimeout(adjustAttribution, 500);

      // Use MutationObserver to adjust attribution as it appears
      observer = new MutationObserver(() => {
        adjustAttribution();
      });

      observer.observe(mapDivRef.current, {
        childList: true,
        subtree: true,
      });
    }

    return () => {
      // Clear attribution hiding timeout
      if (hideAttributionTimeout) {
        clearTimeout(hideAttributionTimeout);
      }
      // Disconnect observer
      if (observer) {
        observer.disconnect();
      }
      // Cleanup marker on unmount
      if (dragListenerRef.current && g?.maps?.event) {
        g.maps.event.removeListener(dragListenerRef.current);
        dragListenerRef.current = null;
      }
      if (markerRef.current) {
        markerRef.current.setMap(null);
        markerRef.current = null;
      }
    };
  }, [isReady, center.lat, center.lng, zoom, isError, marker?.lat, marker?.lng, minimal, draggable, onMarkerDrag, showGoogleLogo, effectiveGestureHandling]);

  const showSkeleton =
    !isReady ||
    isError ||
    !(window as any).google?.maps;

  return (
    <div
      className={cn("w-full h-full", className)}
      style={{ width: "100%", height: "100%" }}
    >
      <div
        ref={mapDivRef}
        className="w-full h-full"
        style={{
          width: "100%",
          height: "100%",
          background: "#e5e7eb",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Hide unnecessary Google Maps controls */}
          <style>{`
            .gm-style-cc,
            .gm-style-cc div,
            .gm-bundled-control,
            .gm-fullscreen-control,
            a[href*="keyboard_shortcuts"],
            a[href*="terms_maps"] {
              display: none !important;
            }
            ${!showGoogleLogo ? `
              .gmnoprint,
              img[src*="google"][alt="Google"],
              a[href*="google.com/maps"],
              .gm-style > div:last-child {
                display: none !important;
              }
            ` : ''}
          `}</style>

        {showSkeleton && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(209,213,219,0.85)",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            Loading map…
          </div>
        )}
      </div>
    </div>
  );
}

BenjaminMap.displayName = "BenjaminMap";

export default BenjaminMap;
