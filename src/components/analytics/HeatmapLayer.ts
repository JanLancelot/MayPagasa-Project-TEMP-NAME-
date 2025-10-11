import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import 'leaflet.heat';

declare module 'leaflet' {
    interface HeatLayerOptions {
        minOpacity?: number;
        maxZoom?: number;
        max?: number;
        radius?: number;
        blur?: number;
        gradient?: { [key: number]: string };
    }

    interface HeatLayer extends Layer {
        setLatLngs(latlngs: Array<[number, number, number?]>): this;
        addLatLng(latlng: [number, number, number?]): this;
        setOptions(options: HeatLayerOptions): this;
        redraw(): this;
    }

    function heatLayer(
        latlngs: Array<[number, number, number?]>,
        options?: HeatLayerOptions
    ): HeatLayer;
}

interface HeatmapLayerProps {
    points: [number, number, number?][];
    gradient?: { [key: number]: string };
}

const HeatmapLayer = ({ points, gradient }: HeatmapLayerProps) => {
    const map = useMap();
    const heatLayerRef = useRef<L.HeatLayer | null>(null);

    useEffect(() => {
        if (!map || !points || points.length === 0) {
            if (heatLayerRef.current) {
                map.removeLayer(heatLayerRef.current);
                heatLayerRef.current = null;
            }
            return;
        }

        if (heatLayerRef.current) {
            map.removeLayer(heatLayerRef.current);
            heatLayerRef.current = null;
        }

        try {
            const heatLayer = L.heatLayer(points, {
                radius: 25,
                blur: 15,
                maxZoom: 17,
                gradient,
            });

            heatLayer.addTo(map);
            heatLayerRef.current = heatLayer;

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