import { useState } from 'react';
import { useI18n } from '@/app/providers/I18nProvider';
import { useToast } from '@/app/providers/ToastProvider';
import { useUnsavedFormWarning } from '@/hooks/useUnsavedFormWarning';
import { formatPhoneInput, phoneDigitCount } from '@/lib/phoneFormat';
import {
  sanitizeDateField,
  sanitizeDigits,
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

export function PrequalForm({ submitting, onSubmit }: Props) {
  const { t } = useI18n();
  const { showToast } = useToast();
  const [nom, setNom] = useState('');
  const [tel, setTel] = useState('');
  const [email, setEmail] = useState('');
  const [revenu, setRevenu] = useState('');
  const [cote, setCote] = useState('');
  const [tal, setTal] = useState('false');
  const [date, setDate] = useState('');
  const [msg, setMsg] = useState('');
  const [hp, setHp] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const dirty = !!(nom.trim() || tel.trim() || email.trim() || revenu || cote.trim() || date || msg.trim());
  useUnsavedFormWarning(dirty && !submitting);

  const handleSubmit = async () => {
    if (submitting) return;

    const next: Record<string, string> = {};
    if (!nom.trim() || !tel.trim() || !email.trim() || !revenu || !cote.trim()) {
      showToast(t('toast.missingFields'));
      next.form = t('toast.missingFields');
    }
    if (phoneDigitCount(tel) < 7) {
      showToast(t('toast.badPhone'));
      next.tel = t('toast.badPhone');
    }
    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      showToast(t('toast.badEmail'));
      next.email = t('toast.badEmail');
    }
    const scoreCredit = Number.parseInt(cote, 10);
    if (!cote.trim() || !/^\d+$/.test(cote) || scoreCredit < 300 || scoreCredit > 900) {
      showToast(t('toast.badCreditScore'));
      next.cote = t('toast.badCreditScore');
    }
    const revenuMensuel = Number.parseInt(revenu, 10);
    if (!revenu || !Number.isFinite(revenuMensuel) || revenuMensuel < 0 || revenuMensuel > 1_000_000) {
      showToast(t('toast.missingFields'));
      next.form = t('toast.missingFields');
    }
    setErrors(next);
    if (Object.keys(next).length) return;

    await onSubmit({
      typeDemande: 'prequal',
      nom: sanitizePersonName(nom),
      telephone: sanitizePhoneForSubmit(tel),
      email: sanitizeEmail(email),
      revenuMensuel: revenuMensuel,
      scoreCredit,
      dossierTal: tal === 'true',
      dateDemenagement: sanitizeDateField(date),
      message: msg.trim() ? sanitizeMessage(msg) : null,
      hp: hp.slice(0, 200),
    });
  };

  return (
    <div className="form-section active" id="form-prequal">
      <div className="field" style={{ position: 'absolute', left: -9999, opacity: 0 }} aria-hidden="true">
        <label htmlFor="p-hp">{t('field.hp')}</label>
        <input
          id="p-hp"
          tabIndex={-1}
          autoComplete="off"
          data-1p-ignore="true"
          data-lpignore="true"
          value={hp}
          onChange={(e) => setHp(e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="p-nom">{t('field.nom')}</label>
        <input
          id="p-nom"
          maxLength={120}
          autoComplete="name"
          placeholder={t('field.nomPh')}
          value={nom}
          onChange={(e) => setNom(sanitizePersonName(e.target.value))}
        />
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor="p-tel">{t('field.tel')}</label>
          <input
            id="p-tel"
            maxLength={30}
            autoComplete="tel"
            inputMode="tel"
            value={tel}
            onChange={(e) => setTel(formatPhoneInput(e.target.value))}
          />
          {errors.tel && <div className="field-error">{errors.tel}</div>}
        </div>
        <div className="field">
          <label htmlFor="p-email">{t('field.emailReq')}</label>
          <input
            id="p-email"
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
      <div className="field-row">
        <div className="field">
          <label htmlFor="p-revenu">{t('field.revenu')}</label>
          <input
            id="p-revenu"
            type="number"
            min={0}
            max={1000000}
            autoComplete="off"
            inputMode="numeric"
            value={revenu}
            onChange={(e) => setRevenu(sanitizeDigits(e.target.value, 7))}
          />
        </div>
        <div className="field">
          <label htmlFor="p-tal">{t('field.tal')}</label>
          <select id="p-tal" value={tal} onChange={(e) => setTal(e.target.value)}>
            <option value="false">{t('opt.non')}</option>
            <option value="true">{t('opt.oui')}</option>
          </select>
        </div>
      </div>
      <div className="field">
        <label htmlFor="p-cote">{t('field.coteCredit')}</label>
        <input
          id="p-cote"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          minLength={3}
          maxLength={3}
          placeholder={t('field.coteCreditPh')}
          value={cote}
          onChange={(e) => setCote(e.target.value.replace(/\D/g, '').slice(0, 3))}
        />
        {errors.cote && <div className="field-error">{errors.cote}</div>}
      </div>
      <div className="field">
        <label htmlFor="p-date">{t('field.dateDem')}</label>
        <input
          id="p-date"
          type="date"
          autoComplete="off"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="p-msg">{t('field.msgOpt')}</label>
        <textarea
          id="p-msg"
          maxLength={2000}
          autoComplete="off"
          placeholder={t('field.msgPhPrequal')}
          value={msg}
          onChange={(e) => setMsg(sanitizeMessageInput(e.target.value))}
        />
      </div>
      {errors.form && <div className="field-error">{errors.form}</div>}
      <button type="button" className="btn-submit" disabled={submitting} onClick={() => void handleSubmit()}>
        {submitting ? t('btn.sending') : t('btn.prequalSubmit')}
      </button>
    </div>
  );
}
