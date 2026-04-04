import { useSignAndExecuteTransaction } from '@iota/dapp-kit';
import { useState, useCallback } from 'react';
import { Transaction } from '@iota/iota-sdk/transactions';
import {
  ContentCheckInline,
  ContentPublishOptionsInline,
  ContentZipSavingsNotice,
  FormInlineNotice,
  FormRow,
  useSessionContentPublishOptions,
  useTimedFormNotice,
} from './FormUi.tsx';
import { FormSectionRow } from './CollapsibleFormSectionRow.tsx';
import { TxDigestResult } from './TxDigestResult.tsx';
import { moveTarget, submitTx } from './TransactionUtils.tsx';
import { prepareContentForPublish } from './ContentCompaction.ts';
import { useAutoUnzippedContent } from './useAutoUnzippedContent.ts';
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
  const { notice, showNotice } = useTimedFormNotice(15000);
  const [invalidFields, setInvalidFields] = useState({
    parent: false,
    child: false,
    name: false,
  });

  const [form, setForm] = useState<AttachChildFormState>({
    parent: '',
    child: '',
    externalId: '',
    name: '',
    description: '',
    content: '',
    externalIndex: 0,
  });
  const [contentCheckSignal, setContentCheckSignal] = useState(0);
  const {
    autoCompressContent,
    setAutoCompressContent,
    autoZipContent,
    setAutoZipContent,
  } = useSessionContentPublishOptions();
  const setContent = useCallback((nextContent: string) => {
    setForm((prev) => ({ ...prev, content: nextContent }));
  }, []);
  const { setEditedContent } = useAutoUnzippedContent({
    content: form.content,
    setContent,
  });

  const triggerContentCheck = () => {
    setContentCheckSignal((signal) => signal + 1);
  };

  const renderContentPublishOptions = () => (
    <ContentPublishOptionsInline
      content={form.content}
      autoCompressEnabled={autoCompressContent}
      onAutoCompressChange={setAutoCompressContent}
      autoZipEnabled={autoZipContent}
      onAutoZipChange={setAutoZipContent}
    />
  );

  const zipSavingsNotice = (
    <ContentZipSavingsNotice
      content={form.content}
      autoCompressEnabled={autoCompressContent}
      autoZipEnabled={autoZipContent}
    />
  );

  const submit = async () => {
    const missingParent = !form.parent.trim();
    const missingChild = !form.child.trim();
    const missingName = !form.name.trim();
    if (missingParent || missingChild || missingName) {
      setInvalidFields({
        parent: missingParent,
        child: missingChild,
        name: missingName,
      });
      showNotice(t('messages.parentChildNameRequired'));
      return;
    }

    let preparedContent;
    try {
      preparedContent = await prepareContentForPublish(form.content, {
        autoCompressEnabled: autoCompressContent,
        autoZipEnabled: autoZipContent,
      });
    } catch (error) {
      console.error(error);
      showNotice(t('messages.autoZipEncodeFailed'));
      return;
    }
    if (autoZipContent && !preparedContent.zipSupported) {
      showNotice(t('messages.autoZipUnsupported'));
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
        tx.pure.string(preparedContent.content),
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
              className={`form-control form-control-sm w-100 ${
                invalidFields.parent ? 'is-invalid' : ''
              }`}
              placeholder="0x..."
              value={form.parent}
              onChange={(e) => {
                setForm({ ...form, parent: e.target.value });
                if (invalidFields.parent) {
                  setInvalidFields((prev) => ({ ...prev, parent: false }));
                }
              }}
            />
          </FormRow>

          <FormRow label={t('fields.childContainerId') + ' *'}>
            <input
              className={`form-control form-control-sm w-100 ${
                invalidFields.child ? 'is-invalid' : ''
              }`}
              placeholder="0x..."
              value={form.child}
              onChange={(e) => {
                setForm({ ...form, child: e.target.value });
                if (invalidFields.child) {
                  setInvalidFields((prev) => ({ ...prev, child: false }));
                }
              }}
            />
          </FormRow>
        </FormSectionRow>

        <FormSectionRow
          title={t('labels.basicInfo')}
          description={t('messages.externalNameDescriptionContent')}
        >
          <FormRow label={t('fields.name') + ' *'}>
            <input
              className={`form-control form-control-sm w-100 ${
                invalidFields.name ? 'is-invalid' : ''
              }`}
              value={form.name}
              onChange={(e) => {
                setForm({ ...form, name: e.target.value });
                if (invalidFields.name) {
                  setInvalidFields((prev) => ({ ...prev, name: false }));
                }
              }}
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
            <>
              <textarea
                className="form-control form-control-sm w-100"
                rows={3}
                value={form.content}
                onChange={(e) => setEditedContent(e.target.value)}
                onBlur={triggerContentCheck}
              />
              <ContentCheckInline
                content={form.content}
                autoCheckSignal={contentCheckSignal}
                rightControl={renderContentPublishOptions()}
                extraNotice={zipSavingsNotice}
              />
            </>
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
              onClick={() => {
                void submit();
              }}
            >
              {t('actions.attach')} {t('container.child')}
            </button>

            <FormInlineNotice notice={notice} />

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
