import { useSignAndExecuteTransaction } from '@iota/dapp-kit';
import { useState, useEffect } from 'react';
import { Transaction } from '@iota/iota-sdk/transactions';
import { FormRow } from './FormUi.tsx';
import { FormSectionRow } from './CollapsibleFormSectionRow.tsx';
import { TxDigestResult } from './TxDigestResult.tsx';
import { moveTarget, submitTx } from './TransactionUtils.tsx';
import {
  defaultContent,
  getCarsContentJson,
  isCarsInstance,
  parseAddressList,
} from './FormUtils.tsx';
import {
  CLOCK_ID,
  DATA_ITEM_CHAIN,
  API_BASE,
} from '../../Config.ts';
import { useSelection } from '../../context/SelectionContext';
import { t } from '../../Config.ts';
import CarMaintenanceEditor from './editor/CarMaintenanceEditor.tsx';

export function PublishDataItemForm({ address }: { address: string }) {
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const [digest, setDigest] = useState('');
  const [loadingDataItem, setLoadingDataItem] = useState(false);
  const { selectedDataItemId, selectedContainerId, selectedDataTypeId } = useSelection();

  const carsMode = isCarsInstance();
  const carsContentJson = getCarsContentJson();

  const [form, setForm] = useState({
    container: '',
    dataType: '',
    externalId: '',
    recipients: '',
    name: '',
    description: '',
    content: '',
    externalIndex: 0,
    reference: '',
  });

  useEffect(() => {
    if (carsMode) {
      setForm((f) => ({
        ...f,
        content: carsContentJson,
      }));
    }
  }, [carsMode, carsContentJson]);

  const clearForm = () => {
    setForm({
      container: '',
      dataType: '',
      externalId: '',
      recipients: '',
      name: '',
      description: '',
      content: defaultContent(carsMode),
      externalIndex: 0,
      reference: '',
    });
    setDigest('');
  };

  const loadSelectedDataItem = async (dataItemId: string) => {
    if (!dataItemId) {
      return alert(t('messages.noDataItemId'));
    }

    try {
      setLoadingDataItem(true);
      const res = await fetch(`${API_BASE}api/data-items/${dataItemId}`);
      if (!res.ok) throw new Error(t('messages.failedLoadDataItem'));
      const data = await res.json();

      setForm({
        container: data.containerId ?? '',
        dataType: data.dataTypeId ?? '',
        externalId: data.externalId ?? '',
        recipients: '',
        name: data.name ?? '',
        description: data.description ?? '',
        content: data.content ?? '',
        externalIndex: data.externalIndex ?? 0,
        reference: data.reference ?? '',
      });
    } catch (err) {
      console.error(err);
      alert(t('messages.failedLoadDataItem'));
    } finally {
      setLoadingDataItem(false);
    }
  };

  const loadContainerAndType = () => {
    if (!selectedContainerId || !selectedDataTypeId) {
      return alert(t('messages.noContainerOrType'));
    }

    setForm({
      container: selectedContainerId,
      dataType: selectedDataTypeId,
      externalId: '',
      recipients: '',
      name: '',
      description: '',
      content: defaultContent(carsMode),
      externalIndex: 0,
      reference: '',
    });
  };

  const submit = () => {
    if (!form.container.trim() || !form.dataType.trim() || !form.name.trim()) {
      return alert(t('messages.containerTypeNameRequired'));
    }

    const tx = new Transaction();
    const recipientAddrs = parseAddressList(form.recipients);
    const reference = parseAddressList(form.reference);

    tx.moveCall({
      target: moveTarget('publish_data_item'),
      arguments: [
        tx.object(DATA_ITEM_CHAIN),
        tx.object(form.container.trim()),
        tx.object(form.dataType.trim()),
        tx.pure.string(form.externalId.trim()),
        tx.pure.option('vector<address>', recipientAddrs.length > 0 ? recipientAddrs : null),
        tx.pure.string(form.name.trim()),
        tx.pure.string(form.description.trim()),
        tx.pure.string(form.content.trim()),
        tx.pure.u128(BigInt(form.externalIndex)),
        tx.pure.option('vector<address>', reference.length > 0 ? reference : null),
        tx.object(CLOCK_ID),
      ],
    });

    submitTx(signAndExecuteTransaction, tx, address, setDigest);
  };

  return (
    <div className="form-page">
      <div className="form-wrapper">
        <h5>{t('actions.publish')} {t('item.singular')}</h5>

        <div className="mb-3 d-flex gap-2 justify-content-center">
          <button
            className="btn btn-outline-secondary btn-sm w-50"
            onClick={() => selectedDataItemId && loadSelectedDataItem(selectedDataItemId)}
            disabled={!selectedDataItemId}
          >
            {loadingDataItem ? t('messages.loading') : t('actions.selected') + ' ' + t('item.singular')}
          </button>

          <button
            className="btn btn-outline-info btn-sm w-50"
            onClick={loadContainerAndType}
            disabled={!selectedContainerId || !selectedDataTypeId}
          >
            {t('container.singular')} & {t('type.singular')}
          </button>

          <button className="btn btn-outline-danger btn-sm w-50" onClick={clearForm}>
            {t('actions.clearAll')}
          </button>
        </div>

        <FormSectionRow title={t('labels.parentObjects')} description={t('messages.containerAndType')}>
          <FormRow label={t('container.singular') + ' ID *'}>
            <input
              type="text"
              className="form-control form-control-sm w-100"
              placeholder="0x..."
              value={form.container}
              onChange={(e) => setForm({ ...form, container: e.target.value })}
            />
          </FormRow>

          <FormRow label={t('type.singular') + ' ID *'}>
            <input
              type="text"
              className="form-control form-control-sm w-100"
              placeholder="0x..."
              value={form.dataType}
              onChange={(e) => setForm({ ...form, dataType: e.target.value })}
            />
          </FormRow>
        </FormSectionRow>

        <FormSectionRow title={t('labels.basicData')} description={t('messages.humanReadableMetadata')}>
          <FormRow label={t('fields.name') + ' *'}>
            <input
              type="text"
              className="form-control form-control-sm w-100"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </FormRow>

          <FormRow label={t('fields.description') + ' (' + t('optional') + ')'}>
            <textarea
              className="form-control form-control-sm w-100"
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </FormRow>
{!carsMode ? (
  <FormRow label={t('fields.content') + ' (' + t('optional') + ')'}>
    <textarea
      className="form-control form-control-sm w-100"
      rows={3}
      value={form.content}
      onChange={(e) => setForm({ ...form, content: e.target.value })}
    />
  </FormRow>
) : (
  <FormRow label="Car Maintenance Entry">
<CarMaintenanceEditor
  value={form.content}
  onChange={(json) =>
    setForm((f) => ({
      ...f,
      content: json,
    }))
  }
/>
  </FormRow>
)}
        </FormSectionRow>

        {!carsMode && (
          <>
            <FormSectionRow title={t('labels.external')} description={t('messages.externalIDForIndexing')}>
              <FormRow label={t('fields.externalId') + ' (' + t('optional') + ')'}>
                <input
                  type="text"
                  className="form-control form-control-sm w-100"
                  value={form.externalId}
                  onChange={(e) => setForm({ ...form, externalId: e.target.value })}
                />
              </FormRow>

              <FormRow label={t('fields.externalIndex') + ' (' + t('optional') + ')'}>
                <input
                  type="number"
                  className="form-control form-control-sm w-100"
                  value={form.externalIndex}
                  onChange={(e) => setForm({ ...form, externalIndex: Number(e.target.value) })}
                />
              </FormRow>
            </FormSectionRow>

          </>
        )}

            <FormSectionRow title={t('labels.recipientsAndReferences')} description={t('messages.optionalRecipientsReference')}>
              <FormRow label={t('fields.recipients')}>
                <input
                  className="form-control form-control-sm w-100"
                  placeholder="0x...,0x..."
                  value={form.recipients}
                  onChange={(e) => setForm({ ...form, recipients: e.target.value })}
                />
              </FormRow>

              <FormRow label={t('fields.references')}>
                <input
                  className="form-control form-control-sm w-100"
                  placeholder="0x...,0x..."
                  value={form.reference}
                  onChange={(e) => setForm({ ...form, reference: e.target.value })}
                />
              </FormRow>

            </FormSectionRow>
            
        <div className="form-section-row">
          <div className="form-section-left">{t('actions.finalize')}</div>

          <div className="form-section-middle text-center">
            <button className="btn btn-outline-primary btn-sm w-100" onClick={submit}>
              {t('actions.publish')} {t('item.singular')}
            </button>

            <TxDigestResult digest={digest} />
          </div>

          <div className="form-section-right">{t('messages.submitAndInspect')}</div>
        </div>
      </div>
    </div>
  );
}
