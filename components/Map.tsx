'use client';
import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon in react-leaflet
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41]
});

const UserIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface MapProps {
  officeCoords: { lat: number; lng: number };
  userCoords: { lat: number; lng: number } | null;
  radius: number;
}

export default function Map({ officeCoords, userCoords, radius }: MapProps) {
  return (
    <div className="h-48 w-full rounded-xl overflow-hidden border border-slate-200 shadow-inner z-0 relative">
      <MapContainer 
        center={[officeCoords.lat, officeCoords.lng]} 
        zoom={16} 
        scrollWheelZoom={false}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Office Marker & Geofence Circle */}
        <Marker position={[officeCoords.lat, officeCoords.lng]} icon={DefaultIcon}>
          <Popup>Office Location</Popup>
        </Marker>
        <Circle 
          center={[officeCoords.lat, officeCoords.lng]} 
          radius={radius} 
          pathOptions={{ color: 'indigo', fillColor: 'indigo', fillOpacity: 0.1 }}
        />

        {/* User Marker */}
        {userCoords && (
          <Marker position={[userCoords.lat, userCoords.lng]} icon={UserIcon}>
            <Popup>Your Location</Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
