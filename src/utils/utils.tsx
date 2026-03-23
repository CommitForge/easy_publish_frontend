export function shortenAddressWithCopy(address: string, start: number = 6, end: number = 4) {
  if (!address) return '';

  const short =
    address.length <= start + end ? address : `${address.slice(0, start)}…${address.slice(-end)}`;

  return (
    <span className="addr-wrap" title={address}>
      <span className="addr-short">{short}</span>
      <span
        className="addr-copy"
        onClick={() => navigator.clipboard.writeText(address)}
        title="Copy address"
      >
        📋
      </span>
    </span>
  );
}

export  const copyToClipboard = (e: React.MouseEvent, text: string) => {
    navigator.clipboard.writeText(text).catch(() => alert('Copy failed!'));

    const target = e.currentTarget as HTMLElement;
    target.classList.remove('ripple');
    void target.offsetWidth;
    target.classList.add('ripple');
  };
