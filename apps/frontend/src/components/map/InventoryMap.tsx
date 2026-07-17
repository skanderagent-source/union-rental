import 'leaflet/dist/leaflet.css';
import { useMemo } from 'react';
import { CircleMarker, MapContainer, Popup, TileLayer, Tooltip } from 'react-leaflet';
import type { MapListing } from '@union-rental/shared';
import { useI18n } from '@/app/providers/I18nProvider';
import { useContactModal } from '@/app/providers/ContactModalProvider';
import { fmtPriceMonth } from '@/lib/format';
import { buildMapMarkers } from '@/lib/mapUtils';

type Props = {
  listings: MapListing[];
};

export function InventoryMap({ listings }: Props) {
  const { t, lang } = useI18n();
  const { openContact } = useContactModal();
  const { markers } = useMemo(() => buildMapMarkers(listings), [listings]);

  return (
    <div id="map-view" className="active">
      <MapContainer center={[45.52, -73.6]} zoom={11} style={{ height: 540, width: '100%' }}>
        <TileLayer
          attribution="© OSM"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {markers.map(({ listings: groupListings, lat, lng, approximate, key }) => {
          const count = groupListings.length;
          return (
            <CircleMarker
              key={key}
              center={[lat, lng]}
              radius={Math.min(16, 10 + Math.log2(Math.max(count, 1)))}
              pathOptions={{
                fillColor: '#a8865c',
                color: '#fff',
                weight: 2,
                fillOpacity: approximate ? 0.55 : 0.9,
              }}
            >
              {count > 1 && (
                <Tooltip
                  permanent
                  direction="center"
                  offset={[0, 0]}
                  className="map-marker-count"
                >
                  {count}
                </Tooltip>
              )}
              <Popup maxWidth={260}>
                {count > 1 && (
                  <>
                    <b style={{ fontSize: 13 }}>
                      {approximate ? t('map.clusterArea') : t('map.clusterExact')}
                      {' '}
                      ({count})
                    </b>
                    <hr />
                  </>
                )}
                {groupListings.map((d) => (
                  <div key={d.id} style={{ marginBottom: count > 1 ? 10 : 0 }}>
                    <b style={{ fontSize: 13 }}>{d.adresse}</b>
                    <br />
                    {d.quartier && (
                      <>
                        <small style={{ color: '#666' }}>{d.quartier}</small>
                        <br />
                      </>
                    )}
                    {approximate && (
                      <>
                        <small>{t('map.approx')}</small>
                        <br />
                      </>
                    )}
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
                    {count > 1 && <hr />}
                  </div>
                ))}
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
