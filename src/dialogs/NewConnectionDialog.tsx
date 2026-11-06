import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { AUTH_METHOD_ORDER, ENVIRONMENT_COLORS, ENVIRONMENT_ORDER } from '../connections/environments';
import type { AuthMethod, Connection, Environment } from '../connections/types';
import { useI18n } from '../i18n/useI18n';
import { Icon } from '../ui/Icon';

type NewConnectionDialogProps = {
  privateKeys: string[];
  onCancel: () => void;
  onSave: (connection: Connection) => void;
};

type Draft = {
  name: string;
  host: string;
  port: string;
  user: string;
  environment: Environment;
  auth: AuthMethod;
  keyName: string;
};

const DEFAULT_KEY = 'id_ed25519';
const MAX_PORT = 65535;

export const NewConnectionDialog = ({ privateKeys, onCancel, onSave }: NewConnectionDialogProps) => {
  const { messages } = useI18n();
  const keyChoices = privateKeys.length > 0 ? privateKeys : [DEFAULT_KEY];
  const [draft, setDraft] = useState<Draft>({
    name: '',
    host: '',
    port: '22',
    user: '',
    environment: 'perso',
    auth: 'key',
    keyName: keyChoices[0],
  });

  const update = <Field extends keyof Draft>(field: Field, value: Draft[Field]) =>
    setDraft((current) => ({ ...current, [field]: value }));

  const port = Number.parseInt(draft.port, 10);
  const isPortValid = port >= 1 && port <= MAX_PORT;
  const canSave = draft.name.trim() !== '' && draft.host.trim() !== '' && isPortValid;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!canSave) {
      return;
    }
    onSave({
      id: crypto.randomUUID(),
      name: draft.name.trim(),
      host: draft.host.trim(),
      port,
      user: draft.user.trim() || 'root',
      environment: draft.environment,
      auth: draft.auth,
      keyName: draft.keyName,
    });
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div className="overlay">
      <form
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-connection-title"
        onSubmit={handleSubmit}
        onKeyDown={handleKeyDown}
      >
        <div className="dialog__header">
          <h2 id="new-connection-title" className="dialog__title">
            {messages.dialog.title}
          </h2>
          <button type="button" className="button button--ghost button--icon" aria-label={messages.dialog.close} onClick={onCancel}>
            <Icon name="close" size={14} strokeWidth={2.4} />
          </button>
        </div>

        <div className="dialog__body">
          <div className="field">
            <label htmlFor="connection-name" className="field__label">
              {messages.dialog.name}
            </label>
            <input
              id="connection-name"
              className="input"
              placeholder={messages.dialog.namePlaceholder}
              autoFocus
              value={draft.name}
              onChange={(event) => update('name', event.target.value)}
            />
          </div>
          <div className="field-row">
            <div className="field field--grow">
              <label htmlFor="connection-host" className="field__label">
                {messages.dialog.host}
              </label>
              <input
                id="connection-host"
                className="input mono"
                placeholder={messages.dialog.hostPlaceholder}
                value={draft.host}
                onChange={(event) => update('host', event.target.value)}
              />
            </div>
            <div className="field field--port">
              <label htmlFor="connection-port" className="field__label">
                {messages.dialog.port}
              </label>
              <input
                id="connection-port"
                className="input mono"
                inputMode="numeric"
                aria-invalid={!isPortValid}
                value={draft.port}
                onChange={(event) => update('port', event.target.value.replace(/\D/g, '').slice(0, 5))}
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="connection-user" className="field__label">
              {messages.dialog.user}
            </label>
            <input
              id="connection-user"
              className="input mono"
              placeholder="root"
              value={draft.user}
              onChange={(event) => update('user', event.target.value)}
            />
          </div>
          <fieldset className="field">
            <legend className="field__label">{messages.dialog.group}</legend>
            <div className="segmented">
              {ENVIRONMENT_ORDER.map((environment) => (
                <button
                  key={environment}
                  type="button"
                  className={`segmented__option${draft.environment === environment ? ' segmented__option--selected' : ''}`}
                  aria-pressed={draft.environment === environment}
                  onClick={() => update('environment', environment)}
                >
                  <span className="tab__dot" style={{ background: ENVIRONMENT_COLORS[environment] }} />
                  {messages.environments[environment].name}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset className="field">
            <legend className="field__label">{messages.dialog.authentication}</legend>
            <div className="segmented">
              {AUTH_METHOD_ORDER.map((method) => (
                <button
                  key={method}
                  type="button"
                  className={`segmented__option${draft.auth === method ? ' segmented__option--selected' : ''}`}
                  aria-pressed={draft.auth === method}
                  onClick={() => update('auth', method)}
                >
                  {messages.auth.methods[method]}
                </button>
              ))}
            </div>
            {draft.auth === 'key' && (
              <>
                <label htmlFor="connection-key" className="visually-hidden">
                  {messages.dialog.privateKey}
                </label>
                <select
                  id="connection-key"
                  className="input mono"
                  value={draft.keyName}
                  onChange={(event) => update('keyName', event.target.value)}
                >
                  {keyChoices.map((key) => (
                    <option key={key} value={key}>
                      ~/.ssh/{key}
                    </option>
                  ))}
                </select>
              </>
            )}
            {draft.auth === 'password' && (
              <p className="field__help">{messages.dialog.passwordHelp}</p>
            )}
            {draft.auth === 'agent' && (
              <p className="field__help">{messages.dialog.agentHelp}</p>
            )}
          </fieldset>
        </div>

        <div className="dialog__footer">
          <button type="button" className="button button--ghost" onClick={onCancel}>
            {messages.dialog.cancel}
          </button>
          <button type="submit" className="button button--primary" disabled={!canSave}>
            {messages.dialog.save}
          </button>
        </div>
      </form>
    </div>
  );
};
