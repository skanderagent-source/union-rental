import { useState } from 'react';
import { useI18n } from '@/app/providers/I18nProvider';
import { useToast } from '@/app/providers/ToastProvider';

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

  const handleSubmit = async () => {
    const next: Record<string, string> = {};
    if (!nom.trim() || !tel.trim() || !email.trim() || !revenu || !cote.trim()) {
      showToast(t('toast.missingFields'));
      next.form = t('toast.missingFields');
    }
    if (tel.replace(/\D/g, '').length < 7) {
      showToast(t('toast.badPhone'));
      next.tel = t('toast.badPhone');
    }
    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      showToast(t('toast.badEmail'));
      next.email = t('toast.badEmail');
    }
    const scoreCredit = parseInt(cote, 10);
    if (!cote.trim() || !/^\d+$/.test(cote) || scoreCredit < 300 || scoreCredit > 900) {
      showToast(t('toast.badCreditScore'));
      next.cote = t('toast.badCreditScore');
    }
    setErrors(next);
    if (Object.keys(next).length) return;

    await onSubmit({
      typeDemande: 'prequal',
      nom: nom.trim(),
      telephone: tel.trim(),
      email: email.trim(),
      revenuMensuel: parseInt(revenu, 10) || null,
      scoreCredit,
      dossierTal: tal === 'true',
      dateDemenagement: date.trim() || null,
      message: msg.trim() || null,
      hp,
    });
  };

  return (
    <div className="form-section active" id="form-prequal">
      <div className="field" style={{ position: 'absolute', left: -9999, opacity: 0 }} aria-hidden="true">
        <label htmlFor="p-hp">{t('field.hp')}</label>
        <input id="p-hp" tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="p-nom">{t('field.nom')}</label>
        <input
          id="p-nom"
          maxLength={120}
          placeholder={t('field.nomPh')}
          value={nom}
          onChange={(e) => setNom(e.target.value)}
        />
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor="p-tel">{t('field.tel')}</label>
          <input id="p-tel" maxLength={30} value={tel} onChange={(e) => setTel(e.target.value)} />
          {errors.tel && <div className="field-error">{errors.tel}</div>}
        </div>
        <div className="field">
          <label htmlFor="p-email">{t('field.emailReq')}</label>
          <input
            id="p-email"
            type="email"
            maxLength={120}
            placeholder={t('field.emailPh')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
            value={revenu}
            onChange={(e) => setRevenu(e.target.value)}
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
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="p-msg">{t('field.msgOpt')}</label>
        <textarea
          id="p-msg"
          maxLength={2000}
          placeholder={t('field.msgPhPrequal')}
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
        />
      </div>
      {errors.form && <div className="field-error">{errors.form}</div>}
      <button type="button" className="btn-submit" disabled={submitting} onClick={handleSubmit}>
        {submitting ? t('btn.sending') : t('btn.prequalSubmit')}
      </button>
    </div>
  );
}
