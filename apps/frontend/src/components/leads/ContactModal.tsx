import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useI18n } from '@/app/providers/I18nProvider';
import { useContactModal } from '@/app/providers/ContactModalProvider';
import { useToast } from '@/app/providers/ToastProvider';
import { api } from '@/lib/apiClient';
import { getActiveReferral } from '@/lib/referral';
import { fmtPriceMonth } from '@/lib/format';
import { RappelForm } from './RappelForm';
import { PrequalForm } from './PrequalForm';

export function ContactModal() {
  const { t, lang } = useI18n();
  const { id: listingIdFromRoute } = useParams();
  const { isOpen, closeContact, contactListing } = useContactModal();
  const { showToast } = useToast();
  const [tab, setTab] = useState<'rappel' | 'prequal'>('rappel');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const resetAndClose = () => {
    setSuccess(false);
    setTab('rappel');
    closeContact();
  };

  const submitLead = async (payload: Record<string, unknown>) => {
    setSubmitting(true);
    try {
      await api.post('/api/public/leads', {
        ...payload,
        listingId: contactListing?.id ?? listingIdFromRoute ?? null,
        refAgentId: getActiveReferral(),
        lang,
      });
      setSuccess(true);
    } catch {
      showToast(t('toast.error'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={`modal-overlay open`}
      onClick={(e) => {
        if (e.target === e.currentTarget) resetAndClose();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') resetAndClose();
      }}
      role="presentation"
    >
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">{t('modal.title')}</div>
          <button type="button" className="modal-close" onClick={resetAndClose} aria-label="Fermer">
            ✕
          </button>
        </div>
        <div className="modal-body">
          {!success ? (
            <div id="contact-form-wrap">
              {contactListing && (
                <div className="apt-chip" id="contact-chip">
                  🏠{' '}
                  <span>
                    {contactListing.adresse}
                    {contactListing.prix != null
                      ? ` — ${fmtPriceMonth(contactListing.prix, lang, t)}`
                      : ''}
                  </span>
                </div>
              )}
              <div className="form-tabs">
                <button
                  type="button"
                  className={`form-tab${tab === 'rappel' ? ' active' : ''}`}
                  onClick={() => setTab('rappel')}
                >
                  📞 {t('tab.rappel')}
                </button>
                <button
                  type="button"
                  className={`form-tab${tab === 'prequal' ? ' active' : ''}`}
                  onClick={() => setTab('prequal')}
                >
                  📋 {t('tab.prequal')}
                </button>
              </div>
              {tab === 'rappel' ? (
                <RappelForm submitting={submitting} onSubmit={submitLead} />
              ) : (
                <PrequalForm submitting={submitting} onSubmit={submitLead} />
              )}
            </div>
          ) : (
            <div id="contact-success">
              <div className="success-wrap">
                <div className="success-icon">✅</div>
                <div className="success-title">{t('success.title')}</div>
                <div
                  className="success-msg"
                  dangerouslySetInnerHTML={{ __html: t('success.msg') }}
                />
                <button type="button" className="btn-success-close" onClick={resetAndClose}>
                  {t('btn.close')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
