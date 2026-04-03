import { useSignAndExecuteTransaction } from '@iota/dapp-kit';
import { useState } from 'react';
import { Transaction } from '@iota/iota-sdk/transactions';
import { FormInlineNotice, FormRow, useTimedFormNotice } from './FormUi.tsx';
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
  const { notice, showNotice } = useTimedFormNotice(15000);
  const [invalidFields, setInvalidFields] = useState({
    containerId: false,
    owner: false,
  });

  const [form, setForm] = useState({
    containerId: '',
    owner: '',
  });

  const submit = () => {
    const missingContainerId = !form.containerId.trim();
    const missingOwner = !form.owner.trim();
    if (missingContainerId || missingOwner) {
      setInvalidFields({
        containerId: missingContainerId,
        owner: missingOwner,
      });
      showNotice(t('messages.containerAndOwnerRequired'));
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
              className={`form-control form-control-sm w-100 ${
                invalidFields.containerId ? 'is-invalid' : ''
              }`}
              placeholder="0x..."
              value={form.containerId}
              onChange={(e) => {
                setForm({ ...form, containerId: e.target.value });
                if (invalidFields.containerId) {
                  setInvalidFields((prev) => ({ ...prev, containerId: false }));
                }
              }}
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
              className={`form-control form-control-sm w-100 ${
                invalidFields.owner ? 'is-invalid' : ''
              }`}
              placeholder="0x..."
              value={form.owner}
              onChange={(e) => {
                setForm({ ...form, owner: e.target.value });
                if (invalidFields.owner) {
                  setInvalidFields((prev) => ({ ...prev, owner: false }));
                }
              }}
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

            <FormInlineNotice notice={notice} />

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
