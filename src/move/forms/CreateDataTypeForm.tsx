// File: CreateDataTypeForm.tsx
import { useSignAndExecuteTransaction } from '@iota/dapp-kit';
import { useState, useEffect } from 'react';
import { Transaction } from '@iota/iota-sdk/transactions';
import { FormInlineNotice, FormRow, useTimedFormNotice } from './FormUi.tsx';
import { FormSectionRow } from './CollapsibleFormSectionRow.tsx';
import { TxDigestResult } from './TxDigestResult.tsx';
import { moveTarget, submitTx } from './TransactionUtils.tsx';
import { defaultContent, getCarsContentJson, isCarsInstance } from './FormUtils.tsx';
import {
  CLOCK_ID,
  UPDATE_CHAIN_ID,
  API_BASE,
} from '../../Config.ts';
import { useSelection } from '../../context/SelectionContext';
import { t } from '../../Config.ts';

export function CreateDataTypeForm({ address }: { address: string }) {
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const { selectedContainerId, selectedDataTypeId } = useSelection();
  const { notice, showNotice, clearNotice } = useTimedFormNotice(15000);
  const [invalidFields, setInvalidFields] = useState({
    containerId: false,
    name: false,
  });

  const [digest, setDigest] = useState('');
  const [loadingDataType, setLoadingDataType] = useState(false);

  // Detect cars instance (same logic as container form)
  const carsMode = isCarsInstance();
  const carsContentJson = getCarsContentJson();

  const [form, setForm] = useState({
    containerId: '',
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

  /** -------------------------
   * Effects
   * ------------------------- */

  // Prefill JSON if this is a cars instance
  useEffect(() => {
    if (carsMode) {
      setForm((f) => ({
        ...f,
        content: carsContentJson,
      }));
    }
  }, [carsMode, carsContentJson]);

  /** -------------------------
   * Helpers
   * ------------------------- */

  const clearForm = () => {
    setForm({
      containerId: '',
      externalId: '',
      name: '',
      description: '',
      content: defaultContent(carsMode),
      version: '',
      schemas: '',
      apis: '',
      resources: '',
      externalIndex: 0,
    });
    setDigest('');
    clearNotice();
    setInvalidFields({
      containerId: false,
      name: false,
    });
  };

  const useSelectedContainer = () => {
    if (!selectedContainerId) {
      showNotice(t('messages.noSelectedContainer'));
      return;
    }
    setForm((f) => ({
      ...f,
      containerId: selectedContainerId
    }));
  };

  const loadSelectedDataType = async () => {
    if (!selectedContainerId || !selectedDataTypeId) {
      showNotice(t('messages.selectContainerOrType'));
      return;
    }

    try {
      setLoadingDataType(true);
      const res = await fetch(`${API_BASE}api/data-types/${selectedDataTypeId}`);
      if (!res.ok) throw new Error(t('messages.failedLoadDataType'));
      const data = await res.json();

      setForm({
        containerId: selectedContainerId,
        externalId: data.externalId ?? '',
        name: data.name ?? '',
        description: data.description ?? '',
        content: carsMode ? carsContentJson : data.content ?? '',
        version: data.specification?.version ?? '',
        schemas: data.specification?.schemas ?? '',
        apis: data.specification?.apis ?? '',
        resources: data.specification?.resources ?? '',
        externalIndex: data.externalIndex ?? 0,
      });
    } catch (err) {
      console.error(err);
      showNotice(t('messages.failedLoadDataType'));
    } finally {
      setLoadingDataType(false);
    }
  };

  /** -------------------------
   * Submit
   * ------------------------- */

  const submit = () => {
    const missingContainerId = !form.containerId.trim();
    const missingName = !form.name.trim();
    if (missingContainerId || missingName) {
      setInvalidFields({
        containerId: missingContainerId,
        name: missingName,
      });
      showNotice(t('messages.containerIdAndNameRequired'));
      return;
    }

    const tx = new Transaction();
    tx.moveCall({
      target: moveTarget('create_data_type'),
      arguments: [
        tx.object(UPDATE_CHAIN_ID),
        tx.object(form.containerId.trim()),
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

  /** -------------------------
   * JSX
   * ------------------------- */

  return (
    <div className="form-page">
      <div className="form-wrapper">

        <h5>{t('actions.new')} {t('type.singular')}</h5>

        {/* Buttons */}
        <div className="mb-3 d-flex gap-2 justify-content-center">
          <button
            className="btn btn-outline-secondary btn-sm w-50"
            onClick={loadSelectedDataType}
            disabled={!selectedDataTypeId || loadingDataType}
          >
            {loadingDataType
              ? t('messages.loading')
              : t('actions.selected') + ' ' + t('type.singular')}
          </button>

          <button
            className="btn btn-outline-info btn-sm w-50"
            onClick={useSelectedContainer}
            disabled={!selectedContainerId}
          >
            {t('actions.selected')} {t('container.singular')}
          </button>

          <button
            className="btn btn-outline-danger btn-sm w-50"
            onClick={clearForm}
          >
            {t('actions.clearAll')}
          </button>
        </div>

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

        {/* Basic Metadata */}
        <FormSectionRow
          title={t('labels.basicData')}
          description={t('messages.selectWhatToCreate')}
        >
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

          <FormRow label={t('fields.description') + ' (' + t('optional') + ')'}>
            <textarea
              className="form-control form-control-sm w-100"
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </FormRow>

          {/* Prefilled JSON for cars */}
          {!carsMode && (
            <FormRow label={t('fields.content') + ' (' + t('optional') + ')'}>
              <textarea
                className="form-control form-control-sm w-100"
                rows={3}
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
              />
            </FormRow>
          )}
        </FormSectionRow>

        {/* Advanced fields hidden in cars instance */}
        {!carsMode && (
          <>
            <FormSectionRow
              title={t('labels.specification')}
              description={t('messages.schemasApisResources')}
            >
              <FormRow label="Version">
                <input
                  type="text"
                  className="form-control form-control-sm w-100"
                  value={form.version}
                  onChange={(e) => setForm({ ...form, version: e.target.value })}
                />
              </FormRow>

              <FormRow label="Schemas">
                <textarea
                  className="form-control form-control-sm w-100"
                  rows={2}
                  value={form.schemas}
                  onChange={(e) => setForm({ ...form, schemas: e.target.value })}
                />
              </FormRow>

              <FormRow label="APIs">
                <textarea
                  className="form-control form-control-sm w-100"
                  rows={2}
                  value={form.apis}
                  onChange={(e) => setForm({ ...form, apis: e.target.value })}
                />
              </FormRow>

              <FormRow label="Resources">
                <textarea
                  className="form-control form-control-sm w-100"
                  rows={2}
                  value={form.resources}
                  onChange={(e) => setForm({ ...form, resources: e.target.value })}
                />
              </FormRow>
            </FormSectionRow>
          </>
        )}

        {/* Submit */}
        <div className="form-section-row">
          <div className="form-section-left">{t('actions.finalize')}</div>
          <div className="form-section-middle text-center">
            <button
              className="btn btn-outline-primary btn-sm w-100"
              onClick={submit}
            >
              {t('actions.new')} {t('type.singular')}
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
