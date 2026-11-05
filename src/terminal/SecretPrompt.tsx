import { useState, type FormEvent } from 'react';
import { Icon } from '../ui/Icon';
import type { SecretKind } from './sshSession';

type SecretPromptProps = {
  secretKind: SecretKind;
  message: string;
  onSubmit: (secret: string, remember: boolean) => void;
  onCancel: () => void;
};

export const SecretPrompt = ({ secretKind, message, onSubmit, onCancel }: SecretPromptProps) => {
  const [secret, setSecret] = useState('');
  const [remember, setRemember] = useState(true);
  const label = secretKind === 'password' ? 'Mot de passe' : 'Phrase de passe';

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (secret) {
      onSubmit(secret, remember);
    }
  };

  return (
    <form
      className="prompt"
      aria-labelledby="secret-title"
      onSubmit={handleSubmit}
      onKeyDown={(event) => event.key === 'Escape' && onCancel()}
    >
      <div className="prompt__icon">
        <Icon name="key" size={18} />
      </div>
      <h3 id="secret-title" className="prompt__title">
        {message}
      </h3>
      <div className="field">
        <label htmlFor="session-secret" className="field__label">
          {label}
        </label>
        <input
          id="session-secret"
          className="input"
          type="password"
          autoComplete="off"
          autoFocus
          value={secret}
          onChange={(event) => setSecret(event.target.value)}
        />
      </div>
      <label className="checkbox">
        <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} />
        Mémoriser dans le coffre sécurisé du système
      </label>
      <div className="prompt__actions">
        <button type="button" className="button button--ghost" onClick={onCancel}>
          Annuler
        </button>
        <button type="submit" className="button button--primary" disabled={!secret}>
          Se connecter
        </button>
      </div>
    </form>
  );
};
