// File: PublishDataItemVerificationForm.tsx
import { useSignAndExecuteTransaction } from '@iota/dapp-kit';
import { useState, useEffect } from 'react';
import { Transaction } from '@iota/iota-sdk/transactions';
import {
  ContentAutoCompressToggle,
  ContentAutoZipToggle,
  ContentCheckInline,
  FormInlineNotice,
  FormRow,
  useTimedFormNotice,
} from './FormUi.tsx';
import { FormSectionRow } from './CollapsibleFormSectionRow.tsx';
import { TxDigestResult } from './TxDigestResult.tsx';
import { moveTarget, submitTx } from './TransactionUtils.tsx';
import {
  defaultContent,
  formatAddressList,
  getCarsContentJson,
  isCarsInstance,
  parseAddressList,
} from './FormUtils.tsx';
import { prepareContentForPublish } from './ContentCompaction.ts';
import { RecipientsReferencesSection } from './RecipientsReferencesSection.tsx';
import {
  CLOCK_ID,
  DATA_ITEM_VERIFICATION_CHAIN,
  UPDATE_CHAIN_ID,
  API_BASE,
} from '../../Config.ts';
import { useSelection } from '../../context/SelectionContext';
import { t } from '../../Config.ts';

type PublishDataItemVerificationFormProps = {
  address: string;
  initialDataItemId?: string;
  embedded?: boolean;
  onSuccessfulPublish?: () => void;
};

export function PublishDataItemVerificationForm({
  address,
  initialDataItemId,
  embedded = false,
  onSuccessfulPublish,
}: PublishDataItemVerificationFormProps) {
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const { selectedDataItemId } = useSelection();

  const [digest, setDigest] = useState('');
  const [loadingDataItem, setLoadingDataItem] = useState(false);
  const { notice, showNotice, clearNotice } = useTimedFormNotice(15000);
  const [invalidFields, setInvalidFields] = useState({
    container: false,
    dataItem: false,
    name: false,
  });

  const carsMode = isCarsInstance();
  const carsContentJson = getCarsContentJson();

  const [form, setForm] = useState({
    container: '',
    dataItem: '',
    externalId: '',
    recipients: '',
    name: '',
    description: '',
    content: '',
    externalIndex: 0,
    reference: '',
    verified: false,
  });
  const [contentCheckSignal, setContentCheckSignal] = useState(0);
  const [autoCompressContent, setAutoCompressContent] = useState(true);
  const [autoZipContent, setAutoZipContent] = useState(false);

  const triggerContentCheck = () => {
    setContentCheckSignal((signal) => signal + 1);
  };

  const renderContentPublishOptions = () => (
    <>
      <ContentAutoCompressToggle
        enabled={autoCompressContent}
        onChange={setAutoCompressContent}
      />
      <ContentAutoZipToggle
        enabled={autoZipContent}
        onChange={setAutoZipContent}
      />
    </>
  );

  useEffect(() => {
    if (carsMode) {
      setForm((f) => ({
        ...f,
        content: carsContentJson,
      }));
    }
  }, [carsMode, carsContentJson]);

  useEffect(() => {
    if (!initialDataItemId) return;
    if (initialDataItemId === form.dataItem) return;
    void loadSelectedDataItem(initialDataItemId);
  }, [form.dataItem, initialDataItemId]);

  useEffect(() => {
    if (!digest) return;
    onSuccessfulPublish?.();
  }, [digest, onSuccessfulPublish]);

  /** --- Helpers --- */

  const clearForm = () => {
    setForm({
      container: '',
      dataItem: '',
      externalId: '',
      recipients: '',
      name: '',
      description: '',
      content: defaultContent(carsMode),
      externalIndex: 0,
      reference: '',
      verified: false,
    });
    setDigest('');
    clearNotice();
    setInvalidFields({
      container: false,
      dataItem: false,
      name: false,
    });
  };

  /** Load selected Data Item and populate full form */
  const loadSelectedDataItem = async (dataItemId: string) => {
    if (!dataItemId) {
      showNotice(t('messages.noSelectedItem'));
      return;
    }
    setLoadingDataItem(true);
    try {
      const res = await fetch(`${API_BASE}api/data-items/${dataItemId}`);
      if (!res.ok) throw new Error(t('messages.failedLoadItem'));
      const data = await res.json();
      const normalizeAddressField = (value: unknown): string => {
        if (Array.isArray(value)) {
          return formatAddressList(
            value.filter((entry): entry is string => typeof entry === 'string')
          );
        }
        if (typeof value === 'string') return formatAddressList([value]);
        return '';
      };

      setForm({
        container: data.containerId ?? '',
        dataItem: data.id ?? '',
        externalId: data.externalId ?? '',
        recipients: '',
        name: data.name ?? '',
        description: data.description ?? '',
        content: data.content ?? defaultContent(carsMode),
        externalIndex: data.externalIndex ?? 0,
        reference: normalizeAddressField(data.reference ?? data.references),
        verified: data.verified ?? false,
      });
    } catch (err) {
      console.error(err);
      showNotice(t('messages.failedLoadItem'));
    } finally {
      setLoadingDataItem(false);
    }
  };

  /** Submit transaction */
  const submit = async () => {
    const missingContainer = !form.container.trim();
    const missingDataItem = !form.dataItem.trim();
    const missingName = !form.name.trim();
    if (missingContainer || missingDataItem || missingName) {
      setInvalidFields({
        container: missingContainer,
        dataItem: missingDataItem,
        name: missingName,
      });
      showNotice(t('messages.containerItemNameRequired'));
      return;
    }

    const tx = new Transaction();
    const recipientAddrs = parseAddressList(form.recipients);
    const referenceAddrs = parseAddressList(form.reference);
    let preparedContent;
    try {
      preparedContent = await prepareContentForPublish(form.content, {
        autoCompressEnabled: autoCompressContent,
        autoZipEnabled: autoZipContent,
      });
    } catch (error) {
      console.error(error);
      showNotice('Failed to encode content for Auto zip.');
      return;
    }
    if (autoZipContent && !preparedContent.zipSupported) {
      showNotice(
        'Auto zip is not supported in this browser/runtime. Disable Auto zip or use a newer browser.'
      );
      return;
    }
    const contentForPublish = preparedContent.content;

    tx.moveCall({
      target: moveTarget('publish_data_item_verification'),
      arguments: [
        tx.object(UPDATE_CHAIN_ID),
        tx.object(DATA_ITEM_VERIFICATION_CHAIN),
        tx.object(form.container.trim()),
        tx.object(form.dataItem.trim()),
        tx.pure.string(form.externalId.trim()),
        tx.pure.option('vector<address>', recipientAddrs.length ? recipientAddrs : null),
        tx.pure.string(form.name.trim()),
        tx.pure.string(form.description.trim()),
        tx.pure.string(contentForPublish),
        tx.pure.u128(BigInt(form.externalIndex)),
        tx.pure.option('vector<address>', referenceAddrs.length ? referenceAddrs : null),
        tx.pure.bool(form.verified),
        tx.object(CLOCK_ID),
      ],
    });

    submitTx(signAndExecuteTransaction, tx, address, setDigest);
  };

  /** --- JSX --- */
  return (
    <div className={embedded ? undefined : 'form-page'}>
      <div className={embedded ? undefined : 'form-wrapper'}>
        <h5>{t('actions.publish')} {t('itemVerification.singular')}</h5>

        {/* Load / Clear buttons */}
        <div className="mb-3 bp-form-top-actions">
          <button
            className="btn btn-outline-secondary btn-sm bp-form-top-action-btn"
            onClick={() => selectedDataItemId && loadSelectedDataItem(selectedDataItemId)}
            disabled={!selectedDataItemId || loadingDataItem}
          >
            {loadingDataItem ? t('messages.loading') : t('actions.selected') + ' ' + t('itemVerification.singular')}
          </button>

          <button
            className="btn btn-outline-info btn-sm bp-form-top-action-btn"
            onClick={async () => {
              if (!selectedDataItemId) {
                showNotice(t('messages.noSelectedItem'));
                return;
              }
              setLoadingDataItem(true);
              try {
                const res = await fetch(`${API_BASE}api/data-items/${selectedDataItemId}`);
                if (!res.ok) throw new Error(t('messages.failedLoadItem'));
                const data = await res.json();
                setForm({
                  container: data.containerId ?? '',
                  dataItem: data.id ?? '',
                  externalId: '',
                  recipients: '',
                  name: '',
                  description: '',
                  content: defaultContent(carsMode),
                  externalIndex: 0,
                  reference: '',
                  verified: false,
                });
              } catch (err) {
                console.error(err);
                showNotice(t('messages.failedLoadItem'));
              } finally {
                setLoadingDataItem(false);
              }
            }}
            disabled={!selectedDataItemId || loadingDataItem}
          >
            {t('item.singular')} & {t('container.singular')}
          </button>

          <button className="btn btn-outline-danger btn-sm bp-form-top-action-btn" onClick={clearForm}>
            {t('actions.clearAll')}
          </button>
        </div>

        {/* Parent & Item IDs */}
        <FormSectionRow title={t('labels.parentAndItem')} description={t('messages.selectItemToVerify')}>
          <FormRow label={t('container.singular') + ' ID *'}>
            <input
              type="text"
              className={`form-control form-control-sm w-100 ${
                invalidFields.container ? 'is-invalid' : ''
              }`}
              value={form.container}
              onChange={(e) => {
                setForm({ ...form, container: e.target.value });
                if (invalidFields.container) {
                  setInvalidFields((prev) => ({ ...prev, container: false }));
                }
              }}
            />
          </FormRow>

          <FormRow label={t('item.singular') + ' ID *'}>
            <input
              type="text"
              className={`form-control form-control-sm w-100 ${
                invalidFields.dataItem ? 'is-invalid' : ''
              }`}
              value={form.dataItem}
              onChange={(e) => {
                setForm({ ...form, dataItem: e.target.value });
                if (invalidFields.dataItem) {
                  setInvalidFields((prev) => ({ ...prev, dataItem: false }));
                }
              }}
            />
          </FormRow>
        </FormSectionRow>

        {/* Metadata */}
        <FormSectionRow title={t('labels.metadata')} description={t('messages.basicVerification')}>
          <FormRow label={t('fields.name') + ' *'}>
            <input
              type="text"
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
            <textarea
              className="form-control form-control-sm w-100"
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </FormRow>
  {!carsMode && (
          <>
          <FormRow label={t('fields.content')}>
            <>
              <textarea
                className="form-control form-control-sm w-100"
                rows={3}
                value={form.content}
                readOnly={carsMode}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                onBlur={triggerContentCheck}
              />
              <ContentCheckInline
                content={form.content}
                autoCheckSignal={contentCheckSignal}
                rightControl={renderContentPublishOptions()}
              />
            </>
          </FormRow>
</>  )}
          <FormRow label={t('fields.verified')}>
            <input
              type="checkbox"
              checked={form.verified}
              onChange={(e) => setForm({ ...form, verified: e.target.checked })}
            />
          </FormRow>
        </FormSectionRow>

         {!carsMode && (
          <>
            {/* External */}
            <FormSectionRow title={t('labels.external')} description={t('messages.externalIDForIndexing')}>
              <FormRow label={t('fields.externalId')}>
                <input
                  type="text"
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
                  onChange={(e) => setForm({ ...form, externalIndex: Number(e.target.value) })}
                />
              </FormRow>
            </FormSectionRow>
</>)}
            <RecipientsReferencesSection
              recipientsValue={form.recipients}
              referencesValue={form.reference}
              onRecipientsChange={(nextValue) =>
                setForm({ ...form, recipients: nextValue })
              }
              onReferencesChange={(nextValue) =>
                setForm({ ...form, reference: nextValue })
              }
              sourceType="data_item_verification"
              sourceContainerId={form.container}
              sourceDataItemId={form.dataItem}
            />
       

        {/* Submit */}
        <div className="form-section-row">
          <div className="form-section-left">{t('actions.finalize')}</div>

          <div className="form-section-middle text-center">
            <button className="btn btn-outline-primary btn-sm w-100" onClick={submit}>
              {t('actions.publish')} {t('itemVerification.singular')}
            </button>

            <FormInlineNotice notice={notice} />

            <TxDigestResult digest={digest} />
          </div>

          <div className="form-section-right">{t('messages.submitAndInspect')}</div>
        </div>
      </div>
    </div>
  );
}
