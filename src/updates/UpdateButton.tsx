import { useI18n } from '../i18n/useI18n';
import { Icon } from '../ui/Icon';
import type { UpdateState } from './useUpdater';

type UpdateButtonProps = {
  state: UpdateState;
  onInstall: () => void;
};

export const UpdateButton = ({ state, onInstall }: UpdateButtonProps) => {
  const { messages } = useI18n();

  if (state.phase === 'idle') {
    return null;
  }
  if (state.phase === 'installing') {
    const percent = state.progress === null ? null : Math.round(state.progress * 100);
    return (
      <span className="update update--busy">
        <Icon name="spinner" size={12} strokeWidth={3} className="spin" />
        {messages.update.installing(percent)}
      </span>
    );
  }
  if (state.phase === 'failed') {
    return (
      <button type="button" className="update update--failed" title={state.detail} onClick={onInstall}>
        <Icon name="warning" size={12} />
        {messages.update.failed}
      </button>
    );
  }
  return (
    <button type="button" className="update" title={messages.update.installHint} onClick={onInstall}>
      <Icon name="download" size={12} strokeWidth={2.4} />
      {messages.update.available(state.version)}
    </button>
  );
};
