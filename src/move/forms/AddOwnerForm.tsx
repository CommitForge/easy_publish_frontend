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
  t, // <- import translation function
} from '../../Config.ts';

export function AddOwnerForm({ address }: { address: string }) {
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const [digest, setDigest] = useState('');

  const [form, setForm] = useState({
    containerId: '',
    owner: '',
    role: '',
  });

  const submit = () => {
    if (!form.containerId.trim() || !form.owner.trim()) {
      alert(t('messages.containerAndTypeRequired'));
      return;
    }

    const tx = new Transaction();
    tx.moveCall({
      target: moveTarget('add_owner'),
      arguments: [
        tx.object(UPDATE_CHAIN_ID),
        tx.object(form.containerId.trim()), // &mut Container, optional
        tx.pure.address(form.owner.trim()), // new owner, required
        tx.pure.string(form.role.trim()),   // role, optional
        tx.object(CLOCK_ID),                // &Clock
      ],
    });

    submitTx(signAndExecuteTransaction, tx, address, setDigest);
  };

  return (
    <div className="form-page">
      <div className="form-wrapper">
        <h5>{t('actions.addOwner')}</h5>

        {/* Container */}
        <FormSectionRow
          title={t('container.singular')}
          description={`${t('container.singular')} ${t('actions.addOwner')}`}
        >
          <FormRow label={`${t('container.singular')} ID *`}>
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
          title={t('actions.addOwner')}
          description={t('fields.owner')}
        >
          <FormRow label={`${t('fields.owner')} *`}>
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

        {/* Role */}
        <FormSectionRow
          title={t('fields.role')}
          description="Optional role assigned to the owner."
          defaultCollapsed={true}
        >
          <FormRow label={t('fields.role')}>
            <input
              type="text"
              className="form-control form-control-sm w-100"
              placeholder="creator | owner | admin | editor | ..."
              value={form.role}
              onChange={(e) =>
                setForm({ ...form, role: e.target.value })
              }
            />
          </FormRow>
        </FormSectionRow>

        {/* Final row */}
        <div className="form-section-row">
          <div className="form-section-left">{t('actions.submit')}</div>

          <div className="form-section-middle text-center">
            <button
              className="btn btn-outline-primary btn-sm w-100"
              onClick={submit}
            >
              {t('actions.addOwner')}
            </button>

            <TxDigestResult digest={digest} label={`${t('actions.update')}:`} />
          </div>

          <div className="form-section-right">
            {t('actions.addOwner')} ({t('fields.role')} optional)
          </div>
        </div>
      </div>
    </div>
  );
}
