import { FaExternalLinkAlt, FaRegClipboard } from 'react-icons/fa';
import { IOTA_EXPLORER_NETWORK, IOTA_EXPLORER_TXBLOCK, t } from '../../Config.ts';
import { copyToClipboard } from '../../utils/utils.tsx';

type TxDigestResultProps = {
  digest: string;
  label?: string;
};

export function TxDigestResult({ digest, label }: TxDigestResultProps) {
  if (!digest) return null;

  const explorerUrl = `${IOTA_EXPLORER_TXBLOCK}/${digest}?network=${IOTA_EXPLORER_NETWORK}`;

  return (
    <div className="mt-2 d-flex justify-content-center gap-2 align-items-center flex-wrap">
      {label ?? `${t('messages.transactionDigest')}:`}
      <FaRegClipboard
        style={{ cursor: 'pointer' }}
        onClick={(e) => copyToClipboard(e, digest)}
      />
      <FaExternalLinkAlt
        style={{ cursor: 'pointer' }}
        onClick={() => window.open(explorerUrl, '_blank')}
      />
      <a
        href={explorerUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        {digest}
      </a>
      <div>
        <p>{t('messages.waitSync')}</p>
        <p>{t('messages.syncProblems')}</p>
      </div>
    </div>
  );
}
