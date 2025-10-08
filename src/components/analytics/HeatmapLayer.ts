import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import 'leaflet.heat';

const HeatmapLayer = ({ points, gradient }) => {
    const map = useMap();
    const heatLayerRef = useRef(null);

    useEffect(() => {
        if (!map || !points || points.length === 0) {
            if (heatLayerRef.current) {
                map.removeLayer(heatLayerRef.current);
                heatLayerRef.current = null;
            }
            return;
        }

        // Remove existing heat layer
        if (heatLayerRef.current) {
            map.removeLayer(heatLayerRef.current);
            heatLayerRef.current = null;
        }

        // Create new heat layer
        try {
            const heatLayer = L.heatLayer(points, {
                radius: 25,
                blur: 15,
                maxZoom: 17,
                gradient,
            });

            heatLayer.addTo(map);
            heatLayerRef.current = heatLayer;

            // Fit bounds to show all points
            const bounds = L.latLngBounds(points.map(([lat, lng]) => [lat, lng]));
            map.fitBounds(bounds, { padding: [50, 50] });
        } catch (err) {
            console.error('Heatmap layer error:', err);
        }

        return () => {
            if (heatLayerRef.current) {
                map.removeLayer(heatLayerRef.current);
                heatLayerRef.current = null;
            }
        };
    }, [map, points, gradient]);

    return null;
};

export default HeatmapLayer;