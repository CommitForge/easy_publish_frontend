import { Transaction } from '@iota/iota-sdk/transactions';
import { PACKAGE_ID, MODULE } from '../../Config.ts';

// ==========================================
// Initialize IOTA Client
// ==========================================


export function moveTarget(fn: string): string {
  return `${PACKAGE_ID}::${MODULE}::${fn}`;
}

export function submitTx(
  signAndExecuteTransaction: any,
  tx: Transaction,
  address: string,
  setDigest: (d: string) => void
) {
  tx.setSender(address);

  signAndExecuteTransaction(
    { transaction: tx },
    {
      onSuccess: (res: any) => {
        console.log('TX success', res);
        setDigest(res.digest);
      },
      onError: (err: any) => {
        console.error('TX failed', err);
      },
    }
  );
}