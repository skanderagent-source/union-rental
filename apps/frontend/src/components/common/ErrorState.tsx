import { useI18n } from '@/app/providers/I18nProvider';

type ErrorStateProps = {
  message?: string;
  onRetry?: () => void;
  className?: string;
};

export function ErrorState({ message, onRetry, className = 'empty-state' }: ErrorStateProps) {
  const { t } = useI18n();
  return (
    <div className={className}>
      <p>{message ?? t('error.loadFailed')}</p>
      {onRetry && (
        <button type="button" className="btn-hero-s" style={{ marginTop: 12 }} onClick={onRetry}>
          {t('error.retry')}
        </button>
      )}
    </div>
  );
}
