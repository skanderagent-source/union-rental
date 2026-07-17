import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams } from 'react-router-dom';
import { isValidListingId } from '@union-rental/shared';
import { useI18n } from '@/app/providers/I18nProvider';
import { useContactModal } from '@/app/providers/ContactModalProvider';
import { useToast } from '@/app/providers/ToastProvider';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { getActiveReferral } from '@/lib/referral';
import { publicApi, validateLeadPayload } from '@/lib/publicApi';
import { prepareLeadBody } from '@/lib/sanitizeLeadInput';
import { safePlainMerge } from '@/lib/safeMerge';
import { fmtPriceMonth } from '@/lib/format';
import { SafeHtml } from '@/components/common/SafeHtml';
import { RappelForm } from './RappelForm';
import { PrequalForm } from './PrequalForm';

export function ContactModal() {
  const { t, lang } = useI18n();
  const { id: listingIdFromRoute } = useParams();
  const { isOpen, closeContact, contactListing } = useContactModal();
  const { showToast } = useToast();
  const online = useOnlineStatus();
  const modalRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<'rappel' | 'prequal'>('rappel');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useFocusTrap(modalRef, isOpen);
  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) {
      setSuccess(false);
      setTab('rappel');
    }
  }, [isOpen]);

  const resetAndClose = () => {
    setSuccess(false);
    setTab('rappel');
    closeContact();
  };

  const submitLead = async (payload: Record<string, unknown>) => {
    if (submitting) return;
    if (!online) {
      showToast(t('toast.offline'));
      return;
    }

    const merged = safePlainMerge(payload, {
      listingId:
        contactListing?.id ??
        (listingIdFromRoute && isValidListingId(listingIdFromRoute) ? listingIdFromRoute : null),
      refAgentId: getActiveReferral(),
      lang,
    });

    const body = prepareLeadBody(merged);

    // Client validation is usability only — backend createLeadSchema is the security boundary.
    const parsed = validateLeadPayload(body);
    if (!parsed.success) {
      showToast(t('toast.error'));
      return;
    }

    setSubmitting(true);
    try {
      await publicApi.postLead(parsed.data);
      setSuccess(true);
    } catch {
      showToast(t('toast.error'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="modal-overlay open"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) resetAndClose();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && !submitting) resetAndClose();
      }}
      role="presentation"
    >
      <div
        ref={modalRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="contact-modal-title"
      >
        <div className="modal-header">
          <div className="modal-title" id="contact-modal-title">
            {t('modal.title')}
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={resetAndClose}
            disabled={submitting}
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>
        <div className="modal-body">
          {!online && !success && (
            <p className="field-error" role="status">
              {t('toast.offline')}
            </p>
          )}
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
                  disabled={submitting || !online}
                  onClick={() => setTab('rappel')}
                >
                  📞 {t('tab.rappel')}
                </button>
                <button
                  type="button"
                  className={`form-tab${tab === 'prequal' ? ' active' : ''}`}
                  disabled={submitting || !online}
                  onClick={() => setTab('prequal')}
                >
                  📋 {t('tab.prequal')}
                </button>
              </div>
              {tab === 'rappel' ? (
                <RappelForm submitting={submitting || !online} onSubmit={submitLead} />
              ) : (
                <PrequalForm submitting={submitting || !online} onSubmit={submitLead} />
              )}
            </div>
          ) : (
            <div id="contact-success">
              <div className="success-wrap">
                <div className="success-icon">✅</div>
                <div className="success-title">{t('success.title')}</div>
                <SafeHtml className="success-msg" html={t('success.msg')} />
                <button type="button" className="btn-success-close" onClick={resetAndClose}>
                  {t('btn.close')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
