import { FaExternalLinkAlt, FaRegClipboard } from 'react-icons/fa';
import { t } from '../../Config.ts';
import { copyToClipboard } from '../../utils/clipboard';
import { buildTxExplorerUrl } from '../../utils/explorer';

type TxDigestResultProps = {
  digest: string;
  label?: string;
};

export function TxDigestResult({ digest, label }: TxDigestResultProps) {
  if (!digest) return null;

  const explorerUrl = buildTxExplorerUrl(digest);

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
