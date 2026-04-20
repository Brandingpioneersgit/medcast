interface Props {
  lat: number | string | null;
  lng: number | string | null;
  name: string;
  zoom?: number;
  height?: number;
}

export function HospitalMap({ lat, lng, name, zoom = 13, height = 300 }: Props) {
  const latitude = Number(lat);
  const longitude = Number(lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  const mbToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const gmapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;

  if (mbToken) {
    const url = `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-l-hospital+0d9488(${longitude},${latitude})/${longitude},${latitude},${zoom},0/1200x${height * 2}@2x?access_token=${mbToken}`;
    return (
      <a href={`https://www.google.com/maps?q=${latitude},${longitude}`} target="_blank" rel="noopener noreferrer" className="block rounded-2xl overflow-hidden border border-gray-200">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={`Map of ${name}`} className="w-full" style={{ height }} />
      </a>
    );
  }

  if (gmapsKey) {
    return (
      <iframe
        src={`https://www.google.com/maps/embed/v1/place?key=${gmapsKey}&q=${latitude},${longitude}&zoom=${zoom}`}
        width="100%" height={height} style={{ border: 0 }} loading="lazy" allowFullScreen
        referrerPolicy="no-referrer-when-downgrade"
        title={`Map of ${name}`}
        className="rounded-2xl"
      />
    );
  }

  return (
    <a href={`https://www.google.com/maps?q=${latitude},${longitude}`} target="_blank" rel="noopener noreferrer"
      className="block rounded-2xl border border-gray-200 bg-gradient-to-br from-teal-50 to-emerald-50 p-6 text-center hover:shadow-md transition-shadow"
      style={{ height }}>
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-2xl font-bold text-teal-700 mb-1">{name}</p>
        <p className="text-sm text-gray-600 mb-3">{latitude.toFixed(4)}, {longitude.toFixed(4)}</p>
        <span className="text-xs bg-white px-3 py-1.5 rounded-full text-teal-700 font-medium">Open in Google Maps →</span>
      </div>
    </a>
  );
}
