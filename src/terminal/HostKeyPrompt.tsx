import type { Connection } from '../connections/types';
import { Icon } from '../ui/Icon';

type HostKeyPromptProps = {
  connection: Connection;
  algorithm: string;
  fingerprint: string;
  onAnswer: (accept: boolean) => void;
};

export const HostKeyPrompt = ({ connection, algorithm, fingerprint, onAnswer }: HostKeyPromptProps) => (
  <div className="prompt" role="alertdialog" aria-labelledby="host-key-title" aria-describedby="host-key-text">
    <div className="prompt__icon prompt__icon--warning">
      <Icon name="warning" size={18} />
    </div>
    <h3 id="host-key-title" className="prompt__title">
      Premier contact avec {connection.host}
    </h3>
    <p id="host-key-text" className="prompt__text">
      Ce serveur n’est pas encore connu. Vérifiez que son empreinte correspond à celle communiquée par
      l’administrateur avant de continuer.
    </p>
    <dl className="prompt__facts">
      <dt>Algorithme</dt>
      <dd className="mono">{algorithm}</dd>
      <dt>Empreinte</dt>
      <dd className="mono prompt__fingerprint">{fingerprint}</dd>
    </dl>
    <div className="prompt__actions">
      <button type="button" className="button button--ghost" onClick={() => onAnswer(false)}>
        Refuser
      </button>
      <button type="button" className="button button--primary" autoFocus onClick={() => onAnswer(true)}>
        Faire confiance et continuer
      </button>
    </div>
  </div>
);
