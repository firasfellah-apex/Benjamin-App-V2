# Google Maps API Key Setup

## Overview
The delivery map feature requires a Google Maps API key to display interactive maps. Without the key, a fallback UI will be shown.

## Setup Instructions

### 1. Get a Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Maps JavaScript API**:
   - Go to "APIs & Services" > "Library"
   - Search for "Maps JavaScript API"
   - Click "Enable"

4. Create an API Key:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "API Key"
   - Copy the API key

### 2. Add the Key to Your Environment

Add the following line to your `.env` file:

```env
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

### 3. Restart the Dev Server

After adding the key, restart your development server:

```bash
npm run dev
```

## Fallback Behavior

If no API key is provided:
- The map will show a fallback UI with a pin icon
- The address label will still be displayed
- All functionality remains intact

## Address Coordinates

For the map to display a location, addresses need to have `latitude` and `longitude` coordinates:
- If coordinates are missing, the fallback UI will be shown
- Coordinates are optional in the database schema
- Future: Geocoding integration will auto-fill coordinates when addresses are created

## Testing

1. **With API Key**: You'll see an interactive Google Map
2. **Without API Key**: You'll see a styled fallback UI
3. **Without Coordinates**: You'll see a fallback UI with the address label

