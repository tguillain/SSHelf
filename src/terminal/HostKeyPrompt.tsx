import type { Connection } from '../connections/types';
import { useI18n } from '../i18n/useI18n';
import { Icon } from '../ui/Icon';

type HostKeyPromptProps = {
  connection: Connection;
  algorithm: string;
  fingerprint: string;
  onAnswer: (accept: boolean) => void;
};

export const HostKeyPrompt = ({ connection, algorithm, fingerprint, onAnswer }: HostKeyPromptProps) => {
  const { messages } = useI18n();

  return (
  <div className="prompt" role="alertdialog" aria-labelledby="host-key-title" aria-describedby="host-key-text">
    <div className="prompt__icon prompt__icon--warning">
      <Icon name="warning" size={18} />
    </div>
    <h3 id="host-key-title" className="prompt__title">
      {messages.hostKey.title(connection.host)}
    </h3>
    <p id="host-key-text" className="prompt__text">
      {messages.hostKey.text}
    </p>
    <dl className="prompt__facts">
      <dt>{messages.hostKey.algorithm}</dt>
      <dd className="mono">{algorithm}</dd>
      <dt>{messages.hostKey.fingerprint}</dt>
      <dd className="mono prompt__fingerprint">{fingerprint}</dd>
    </dl>
    <div className="prompt__actions">
      <button type="button" className="button button--ghost" onClick={() => onAnswer(false)}>
        {messages.hostKey.refuse}
      </button>
      <button type="button" className="button button--primary" autoFocus onClick={() => onAnswer(true)}>
        {messages.hostKey.trust}
      </button>
    </div>
  </div>
  );
};
