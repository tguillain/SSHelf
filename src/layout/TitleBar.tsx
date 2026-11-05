import { getCurrentWindow } from '@tauri-apps/api/window';
import { Icon } from '../ui/Icon';

type TitleBarProps = {
  subtitle: string;
};

export const TitleBar = ({ subtitle }: TitleBarProps) => {
  const appWindow = {
    minimize: () => getCurrentWindow().minimize(),
    toggleMaximize: () => getCurrentWindow().toggleMaximize(),
    close: () => getCurrentWindow().close(),
  };

  return (
    <header className="titlebar" data-tauri-drag-region>
      <div className="titlebar__brand" data-tauri-drag-region>
        <span className="logo">
          <Icon name="terminal" size={14} strokeWidth={2.8} />
        </span>
        <span className="titlebar__name" data-tauri-drag-region>
          SSHelf
        </span>
      </div>
      <span className="titlebar__subtitle" data-tauri-drag-region>
        {subtitle}
      </span>
      <div className="titlebar__drag" data-tauri-drag-region />
      <div className="titlebar__controls">
        <button type="button" className="titlebar__control" aria-label="Réduire" onClick={() => appWindow.minimize()}>
          <Icon name="minimize" size={14} strokeWidth={1.5} />
        </button>
        <button
          type="button"
          className="titlebar__control"
          aria-label="Agrandir"
          onClick={() => appWindow.toggleMaximize()}
        >
          <Icon name="maximize" size={13} strokeWidth={1.5} />
        </button>
        <button
          type="button"
          className="titlebar__control titlebar__control--close"
          aria-label="Fermer"
          onClick={() => appWindow.close()}
        >
          <Icon name="close" size={14} strokeWidth={1.5} />
        </button>
      </div>
    </header>
  );
};
