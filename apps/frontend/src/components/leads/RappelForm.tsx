import { useState } from 'react';
import { useI18n } from '@/app/providers/I18nProvider';
import { useToast } from '@/app/providers/ToastProvider';
import { useUnsavedFormWarning } from '@/hooks/useUnsavedFormWarning';
import { formatPhoneInput, phoneDigitCount } from '@/lib/phoneFormat';
import {
  sanitizeEmail,
  sanitizeMessage,
  sanitizeMessageInput,
  sanitizePersonName,
  sanitizePhoneForSubmit,
} from '@/lib/sanitizeLeadInput';

type Props = {
  submitting: boolean;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
};

export function RappelForm({ submitting, onSubmit }: Props) {
  const { t } = useI18n();
  const { showToast } = useToast();
  const [nom, setNom] = useState('');
  const [tel, setTel] = useState('');
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');
  const [hp, setHp] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const dirty = !!(nom.trim() || tel.trim() || email.trim() || msg.trim());
  useUnsavedFormWarning(dirty && !submitting);

  const handleSubmit = async () => {
    if (submitting) return;

    const next: Record<string, string> = {};
    if (!nom.trim() || !tel.trim()) {
      showToast(t('toast.missingNomTel'));
      if (!nom.trim()) next.nom = t('toast.missingNomTel');
      if (!tel.trim()) next.tel = t('toast.missingNomTel');
    }
    if (phoneDigitCount(tel) < 7) {
      showToast(t('toast.badPhone'));
      next.tel = t('toast.badPhone');
    }
    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      showToast(t('toast.badEmail'));
      next.email = t('toast.badEmail');
    }
    setErrors(next);
    if (Object.keys(next).length) return;

    await onSubmit({
      typeDemande: 'rappel',
      nom: sanitizePersonName(nom),
      telephone: sanitizePhoneForSubmit(tel),
      email: email.trim() ? sanitizeEmail(email) : null,
      message: msg.trim() ? sanitizeMessage(msg) : null,
      hp: hp.slice(0, 200),
    });
  };

  return (
    <div className="form-section active" id="form-rappel">
      <div className="field" style={{ position: 'absolute', left: -9999, opacity: 0 }} aria-hidden="true">
        <label htmlFor="r-hp">{t('field.hp')}</label>
        <input
          id="r-hp"
          tabIndex={-1}
          autoComplete="off"
          data-1p-ignore="true"
          data-lpignore="true"
          value={hp}
          onChange={(e) => setHp(e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="r-nom">{t('field.nom')}</label>
        <input
          id="r-nom"
          maxLength={120}
          autoComplete="name"
          placeholder={t('field.nomPh')}
          value={nom}
          onChange={(e) => setNom(sanitizePersonName(e.target.value))}
        />
        {errors.nom && <div className="field-error">{errors.nom}</div>}
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor="r-tel">{t('field.tel')}</label>
          <input
            id="r-tel"
            maxLength={30}
            autoComplete="tel"
            inputMode="tel"
            value={tel}
            onChange={(e) => setTel(formatPhoneInput(e.target.value))}
          />
          {errors.tel && <div className="field-error">{errors.tel}</div>}
        </div>
        <div className="field">
          <label htmlFor="r-email">{t('field.email')}</label>
          <input
            id="r-email"
            type="email"
            maxLength={120}
            autoComplete="email"
            placeholder={t('field.emailPh')}
            value={email}
            onChange={(e) => setEmail(sanitizeEmail(e.target.value))}
          />
          {errors.email && <div className="field-error">{errors.email}</div>}
        </div>
      </div>
      <div className="field">
        <label htmlFor="r-msg">{t('field.msgOpt')}</label>
        <textarea
          id="r-msg"
          maxLength={2000}
          autoComplete="off"
          placeholder={t('field.msgPhRappel')}
          value={msg}
          onChange={(e) => setMsg(sanitizeMessageInput(e.target.value))}
        />
      </div>
      <button type="button" className="btn-submit" disabled={submitting} onClick={() => void handleSubmit()}>
        {submitting ? t('btn.sending') : t('btn.rappelSubmit')}
      </button>
    </div>
  );
}
