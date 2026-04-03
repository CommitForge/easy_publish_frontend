import { useSignAndExecuteTransaction } from '@iota/dapp-kit';
import { useState, useEffect, useCallback } from 'react';
import { Transaction } from '@iota/iota-sdk/transactions';
import { FormInlineNotice, FormRow, useTimedFormNotice } from './FormUi.tsx';
import { FormSectionRow } from './CollapsibleFormSectionRow.tsx';
import { TxDigestResult } from './TxDigestResult.tsx';
import { moveTarget, submitTx } from './TransactionUtils.tsx';
import {
  isCarsInstance,
  UPDATE_DATA_TYPE_LOAD_SELECTED_INTENT_STORAGE_KEY,
} from './FormUtils.tsx';
import { CLOCK_ID, UPDATE_CHAIN_ID, API_BASE, t } from '../../Config.ts';
import { useSelection } from '../../context/SelectionContext';

interface UpdateDataTypeFormState {
  container: string;
  dataType: string;
  externalId: string;
  name: string;
  description: string;
  content: string;
  version: string;
  schemas: string;
  apis: string;
  resources: string;
  externalIndex: number;
}

export function UpdateDataTypeForm({ address }: { address: string }) {

  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const { selectedContainerId, selectedDataTypeId } = useSelection();
  const { notice, showNotice, clearNotice } = useTimedFormNotice(15000);
  const [invalidFields, setInvalidFields] = useState({
    container: false,
    dataType: false,
  });

  const carsMode = isCarsInstance();

  const [digest, setDigest] = useState('');
  const [loadingDataType, setLoadingDataType] = useState(false);

  const [form, setForm] = useState<UpdateDataTypeFormState>({
    container: '',
    dataType: '',
    externalId: '',
    name: '',
    description: '',
    content: '',
    version: '',
    schemas: '',
    apis: '',
    resources: '',
    externalIndex: 0,
  });

  const clearForm = () => {
    setForm({
      container: '',
      dataType: '',
      externalId: '',
      name: '',
      description: '',
      content: '',
      version: '',
      schemas: '',
      apis: '',
      resources: '',
      externalIndex: 0,
    });
    setDigest('');
    clearNotice();
    setInvalidFields({
      container: false,
      dataType: false,
    });
  };

  const valid = form.container.trim() && form.dataType.trim();

  const loadSelectedDataType = useCallback(async () => {

    if (!selectedDataTypeId) {
      showNotice(t('messages.selectContainerOrType'));
      return;
    }

    try {

      setLoadingDataType(true);

      const res = await fetch(`${API_BASE}api/data-types/${selectedDataTypeId}`);

      if (!res.ok) throw new Error(t('messages.failedToLoadDataType'));

      const data = await res.json();

      setForm({
        container: data.containerId ?? selectedContainerId ?? '',
        dataType: selectedDataTypeId,
        externalId: data.externalId || '',
        name: data.name || '',
        description: data.description || '',
        content: data.content || '',
        version: data.specification?.version || '',
        schemas: data.specification?.schemas || '',
        apis: data.specification?.apis || '',
        resources: data.specification?.resources || '',
        externalIndex: data.externalIndex || 0,
      });

    } catch (err) {

      console.error(err);
      showNotice(t('messages.failedToLoadDataType'));

    } finally {

      setLoadingDataType(false);

    }
  }, [selectedContainerId, selectedDataTypeId, showNotice]);

  useEffect(() => {
    const shouldAutoLoad =
      localStorage.getItem(UPDATE_DATA_TYPE_LOAD_SELECTED_INTENT_STORAGE_KEY) ===
      '1';
    if (!shouldAutoLoad) return;

    localStorage.removeItem(UPDATE_DATA_TYPE_LOAD_SELECTED_INTENT_STORAGE_KEY);
    if (selectedDataTypeId) {
      void loadSelectedDataType();
    }
  }, [selectedDataTypeId, loadSelectedDataType]);

  const submit = () => {

    if (!valid) {
      setInvalidFields({
        container: !form.container.trim(),
        dataType: !form.dataType.trim(),
      });
      showNotice(t('messages.containerAndTypeRequired'));
      return;
    }

    const tx = new Transaction();

    tx.moveCall({
      target: moveTarget('update_data_type'),
      arguments: [
        tx.object(UPDATE_CHAIN_ID),
        tx.object(form.container.trim()),
        tx.object(form.dataType.trim()),
        tx.pure.string(form.externalId.trim()),
        tx.pure.string(form.name.trim()),
        tx.pure.string(form.description.trim()),
        tx.pure.string(form.content.trim()),
        tx.pure.string(form.version.trim()),
        tx.pure.string(form.schemas.trim()),
        tx.pure.string(form.apis.trim()),
        tx.pure.string(form.resources.trim()),
        tx.pure.u128(BigInt(form.externalIndex)),
        tx.object(CLOCK_ID),
      ],
    });

    submitTx(signAndExecuteTransaction, tx, address, setDigest);
  };

  return (

    <div className="form-page">

      <div className="form-wrapper">

        <h5 className="text-center mb-3">{t('actions.edit')} {t('type.singular')}</h5>

        {/* Load / Clear buttons */}

        <div className="mb-3 d-flex gap-2 justify-content-center">

          <button
            className="btn btn-outline-secondary btn-sm w-100"
            onClick={loadSelectedDataType}
            disabled={loadingDataType}
          >
            {loadingDataType ? t('actions.loading') : t('messages.selectedDataType')}
          </button>

          <button
            className="btn btn-outline-danger btn-sm w-100"
            onClick={clearForm}
          >
            {t('actions.clearAll')}
          </button>

        </div>

        {/* Container & DataType */}

        <FormSectionRow
          title={t('labels.targetObjects')}
          description={t('labels.selectContainerAndType')}
        >

          <FormRow label={`${t('container.singular')} ID *`}>
            <input
              className={`form-control form-control-sm w-100 ${
                invalidFields.container ? 'is-invalid' : ''
              }`}
              placeholder="0x..."
              value={form.container}
              onChange={(e) => {
                setForm({ ...form, container: e.target.value });
                if (invalidFields.container) {
                  setInvalidFields((prev) => ({ ...prev, container: false }));
                }
              }}
            />
          </FormRow>

          <FormRow label={`${t('type.singular')} ID *`}>
            <input
              className={`form-control form-control-sm w-100 ${
                invalidFields.dataType ? 'is-invalid' : ''
              }`}
              placeholder="0x..."
              value={form.dataType}
              onChange={(e) => {
                setForm({ ...form, dataType: e.target.value });
                if (invalidFields.dataType) {
                  setInvalidFields((prev) => ({ ...prev, dataType: false }));
                }
              }}
            />
          </FormRow>

        </FormSectionRow>

        {/* Basic Info */}

        <FormSectionRow
          title={t('labels.basicInfo')}
          description={t('labels.updateNameDescriptionContent')}
        >

          <FormRow label={t('labels.newName')}>
            <input
              className="form-control form-control-sm w-100"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </FormRow>

          <FormRow label={t('labels.newDescription')}>
            <input
              className="form-control form-control-sm w-100"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </FormRow>
        {!carsMode && (

          <>
          <FormRow label={t('labels.newContent')}>
            <textarea
              className="form-control form-control-sm w-100"
              rows={3}
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
            />
          </FormRow>
</>
        )}
        </FormSectionRow>

        {/* Only show these if NOT cars instance */}

        {!carsMode && (

          <>
            <FormSectionRow
              title={t('labels.specification')}
              description={t('labels.specificationDetails')}
            >

              <FormRow label={t('labels.version')}>
                <input
                  className="form-control form-control-sm w-100"
                  value={form.version}
                  onChange={(e) => setForm({ ...form, version: e.target.value })}
                />
              </FormRow>

              <FormRow label={t('labels.schemas')}>
                <textarea
                  className="form-control form-control-sm w-100"
                  rows={2}
                  value={form.schemas}
                  onChange={(e) => setForm({ ...form, schemas: e.target.value })}
                />
              </FormRow>

              <FormRow label={t('labels.apis')}>
                <textarea
                  className="form-control form-control-sm w-100"
                  rows={2}
                  value={form.apis}
                  onChange={(e) => setForm({ ...form, apis: e.target.value })}
                />
              </FormRow>

              <FormRow label={t('labels.resources')}>
                <textarea
                  className="form-control form-control-sm w-100"
                  rows={2}
                  value={form.resources}
                  onChange={(e) => setForm({ ...form, resources: e.target.value })}
                />
              </FormRow>

            </FormSectionRow>

            <FormSectionRow
              title={t('labels.external')}
              description={t('labels.externalDescription')}
            >

              <FormRow label={t('labels.newExternalId')}>
                <input
                  className="form-control form-control-sm w-100"
                  value={form.externalId}
                  onChange={(e) => setForm({ ...form, externalId: e.target.value })}
                />
              </FormRow>

              <FormRow label={t('labels.externalIndex')}>
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
          </>
        )}

        {/* Finalize */}

        <div className="form-section-row mt-3">

          <div className="form-section-left">
            {t('labels.finalize')}
          </div>

          <div className="form-section-middle text-center">

            <button
              className="btn btn-outline-primary btn-sm w-100"
              onClick={submit}
            >
              {t('actions.updateDataType')}
            </button>

            <FormInlineNotice notice={notice} />

            <TxDigestResult digest={digest} label={`${t('labels.transactionDigest')}:`} />

          </div>

          <div className="form-section-right mt-2">
            {t('labels.submitAndInspect')}
          </div>

        </div>

      </div>

    </div>

  );
}
