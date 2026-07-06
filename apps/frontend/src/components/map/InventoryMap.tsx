import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet';
import type { MapListing } from '@union-rental/shared';
import { useI18n } from '@/app/providers/I18nProvider';
import { useContactModal } from '@/app/providers/ContactModalProvider';
import { fmtPriceMonth } from '@/lib/format';
import { resolveMarkerCoords } from '@/lib/mapUtils';

type Props = {
  listings: MapListing[];
};

export function InventoryMap({ listings }: Props) {
  const { t, lang } = useI18n();
  const { openContact } = useContactModal();

  return (
    <div id="map-view" className="active">
      <MapContainer center={[45.52, -73.6]} zoom={11} style={{ height: 540, width: '100%' }}>
        <TileLayer
          attribution="© OSM"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {listings.map((d) => {
          const coords = resolveMarkerCoords(d.latitude, d.longitude, d.quartier, d.id);
          if (!coords) return null;
          return (
            <CircleMarker
              key={d.id}
              center={[coords.lat, coords.lng]}
              radius={8}
              pathOptions={{
                fillColor: '#a8865c',
                color: '#fff',
                weight: 2,
                fillOpacity: coords.approximate ? 0.35 : 0.9,
              }}
            >
              <Popup maxWidth={220}>
                <b style={{ fontSize: 13 }}>{d.adresse}</b>
                <br />
                <small style={{ color: '#666' }}>{d.quartier ?? ''}</small>
                {coords.approximate && (
                  <>
                    <br />
                    <small>{t('map.approx')}</small>
                  </>
                )}
                <br />
                <b style={{ color: '#a8865c' }}>{fmtPriceMonth(d.prix, lang, t)}</b>
                <br />
                <button
                  type="button"
                  style={{
                    marginTop: 6,
                    padding: '5px 12px',
                    background: '#a8865c',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                  onClick={() => openContact({ id: d.id, adresse: d.adresse, prix: d.prix })}
                >
                  {t('mapPopup.interested')}
                </button>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
