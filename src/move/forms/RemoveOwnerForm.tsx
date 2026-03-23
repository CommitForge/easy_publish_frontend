import { useSignAndExecuteTransaction } from '@iota/dapp-kit';
import { useState } from 'react';
import { Transaction } from '@iota/iota-sdk/transactions';
import { FormRow } from './FormUi.tsx';
import { FormSectionRow } from './CollapsibleFormSectionRow.tsx';
import { TxDigestResult } from './TxDigestResult.tsx';
import { moveTarget, submitTx } from './TransactionUtils.tsx';
import {
  CLOCK_ID,
  UPDATE_CHAIN_ID,
} from '../../Config.ts';
import { t } from '../../Config.ts';

export function RemoveOwnerForm({ address }: { address: string }) {
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const [digest, setDigest] = useState('');

  const [form, setForm] = useState({
    containerId: '',
    owner: '',
  });

  const submit = () => {
    if (!form.containerId.trim() || !form.owner.trim()) {
      alert(t('messages.containerAndTypeRequired'));
      return;
    }

    const tx = new Transaction();

    tx.moveCall({
      target: moveTarget('remove_owner'),
      arguments: [
        tx.object(UPDATE_CHAIN_ID),
        tx.object(form.containerId.trim()), // &mut Container
        tx.pure.address(form.owner.trim()),  // Owner to remove
        tx.object(CLOCK_ID),                // &Clock
      ],
    });

    submitTx(signAndExecuteTransaction, tx, address, setDigest);
  };

  return (
    <div className="form-page">
      <div className="form-wrapper">
        <h5>{t('actions.removeOwner')}</h5>

        {/* Container */}
        <FormSectionRow
          title={t('container.singular')}
          description={t('messages.selectContainerOrType')}
        >
          <FormRow label={t('container.singular') + ' ID *'}>
            <input
              type="text"
              className="form-control form-control-sm w-100"
              placeholder="0x..."
              value={form.containerId}
              onChange={(e) =>
                setForm({ ...form, containerId: e.target.value })
              }
            />
          </FormRow>
        </FormSectionRow>

        {/* Owner */}
        <FormSectionRow
          title={t('actions.removeOwner')}
          description={t('messages.removeOwnerFromContainer')}
        >
          <FormRow label={t('actions.removeOwner') + ' ' + t('container.singular') + ' Address *'}>
            <input
              type="text"
              className="form-control form-control-sm w-100"
              placeholder="0x..."
              value={form.owner}
              onChange={(e) =>
                setForm({ ...form, owner: e.target.value })
              }
            />
          </FormRow>
        </FormSectionRow>

        {/* Final row */}
        <div className="form-section-row">
          <div className="form-section-left">{t('actions.finalize')}</div>

          <div className="form-section-middle text-center">
            <button
              className="btn btn-outline-danger btn-sm w-100"
              onClick={submit}
            >
              {t('actions.removeOwner')}
            </button>

            <TxDigestResult digest={digest} />
          </div>

          <div className="form-section-right">
            {t('messages.removeOwnerFromContainer')}
          </div>
        </div>
      </div>
    </div>
  );
}
