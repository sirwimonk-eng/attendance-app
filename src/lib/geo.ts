export interface Coords {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export function getDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function watchPosition(
  onUpdate: (c: Coords) => void,
  onError: (msg: string) => void
): () => void {
  if (!navigator.geolocation) {
    onError("อุปกรณ์นี้ไม่รองรับการระบุพิกัด GPS");
    return () => {};
  }
  const id = navigator.geolocation.watchPosition(
    (pos) => {
      onUpdate({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      });
    },
    (err) => {
      onError(err.message || "ไม่สามารถเข้าถึงตำแหน่ง GPS ได้ กรุณาอนุญาตการเข้าถึงตำแหน่ง");
    },
    { enableHighAccuracy: true, maximumAge: 4000, timeout: 12000 }
  );
  return () => navigator.geolocation.clearWatch(id);
}
