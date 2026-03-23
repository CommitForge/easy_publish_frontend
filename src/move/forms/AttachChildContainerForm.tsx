import { useSignAndExecuteTransaction } from '@iota/dapp-kit';
import { useState } from 'react';
import { Transaction } from '@iota/iota-sdk/transactions';
import { FormRow } from './FormUi.tsx';
import { FormSectionRow } from './CollapsibleFormSectionRow.tsx';
import { TxDigestResult } from './TxDigestResult.tsx';
import { moveTarget, submitTx } from './TransactionUtils.tsx';
import { CLOCK_ID, UPDATE_CHAIN_ID } from '../../Config.ts';
import { t } from '../../Config.ts'; // i18n helper

interface AttachChildFormState {
  parent: string;
  child: string;
  externalId: string;
  name: string;
  description: string;
  content: string;
  externalIndex: number;
}

export function AttachChildForm({ address }: { address: string }) {
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const [digest, setDigest] = useState('');

  const [form, setForm] = useState<AttachChildFormState>({
    parent: '',
    child: '',
    externalId: '',
    name: '',
    description: '',
    content: '',
    externalIndex: 0,
  });

  const submit = () => {
    if (!form.parent.trim() || !form.child.trim() || !form.name.trim()) {
      alert(t('messages.containerIdAndNameRequired'));
      return;
    }

    const tx = new Transaction();
    tx.moveCall({
      target: moveTarget('attach_container_child'),
      arguments: [
        tx.object(UPDATE_CHAIN_ID),
        tx.object(form.parent.trim()),
        tx.object(form.child.trim()),
        tx.pure.string(form.externalId.trim()),
        tx.pure.string(form.name.trim()),
        tx.pure.string(form.description.trim()),
        tx.pure.string(form.content.trim()),
        tx.pure.u128(BigInt(form.externalIndex)),
        tx.object(CLOCK_ID),
      ],
    });

    submitTx(signAndExecuteTransaction, tx, address, setDigest);
  };

  return (
    <div className="form-page">
      <div className="form-wrapper">
        <h5 className="text-center mb-4">{t('actions.attach')} {t('container.child')}</h5>

        <FormSectionRow
          title={t('labels.containers')}
          description={t('messages.selectParentChildContainers')}
        >
          <FormRow label={t('fields.parentContainerId') + ' *'}>
            <input
              className="form-control form-control-sm w-100"
              placeholder="0x..."
              value={form.parent}
              onChange={(e) => setForm({ ...form, parent: e.target.value })}
            />
          </FormRow>

          <FormRow label={t('fields.childContainerId') + ' *'}>
            <input
              className="form-control form-control-sm w-100"
              placeholder="0x..."
              value={form.child}
              onChange={(e) => setForm({ ...form, child: e.target.value })}
            />
          </FormRow>
        </FormSectionRow>

        <FormSectionRow
          title={t('labels.basicInfo')}
          description={t('messages.externalNameDescriptionContent')}
        >
          <FormRow label={t('fields.name') + ' *'}>
            <input
              className="form-control form-control-sm w-100"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </FormRow>

          <FormRow label={t('fields.description')}>
            <input
              className="form-control form-control-sm w-100"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </FormRow>

          <FormRow label={t('fields.content')}>
            <textarea
              className="form-control form-control-sm w-100"
              rows={3}
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
            />
          </FormRow>
        </FormSectionRow>

        <FormSectionRow
          title={t('labels.external')}
          description={t('messages.externalIdAndIndex')}
        >
          <FormRow label={t('fields.externalId')}>
            <input
              className="form-control form-control-sm w-100"
              value={form.externalId}
              onChange={(e) => setForm({ ...form, externalId: e.target.value })}
            />
          </FormRow>

          <FormRow label={t('fields.externalIndex')}>
            <input
              type="number"
              className="form-control form-control-sm w-100"
              value={form.externalIndex}
              onChange={(e) =>
                setForm({ ...form, externalIndex: Number(e.target.value) })
              }
            />
          </FormRow>
        </FormSectionRow>

        <div className="form-section-row mt-3">
          <div className="form-section-left">{t('actions.finalize')}</div>

          <div className="form-section-middle text-center">
            <button
              className="btn btn-outline-primary btn-sm w-100"
              onClick={submit}
            >
              {t('actions.attach')} {t('container.child')}
            </button>

            <TxDigestResult digest={digest} />
          </div>

          <div className="form-section-right mt-2">
            {t('messages.submitAndInspect')}
          </div>
        </div>
      </div>
    </div>
  );
}
