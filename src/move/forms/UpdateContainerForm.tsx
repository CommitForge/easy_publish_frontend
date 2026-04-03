import { useSignAndExecuteTransaction, useCurrentAccount } from '@iota/dapp-kit';
import { useState, useEffect, useCallback } from 'react';
import { Transaction } from '@iota/iota-sdk/transactions';
import { FormInlineNotice, FormRow, useTimedFormNotice } from './FormUi.tsx';
import { FormSectionRow } from './CollapsibleFormSectionRow.tsx';
import { TxDigestResult } from './TxDigestResult.tsx';
import { moveTarget, submitTx } from './TransactionUtils.tsx';
import {
  isCarsInstance,
  UPDATE_CONTAINER_LOAD_SELECTED_INTENT_STORAGE_KEY,
} from './FormUtils.tsx';
import { UPDATE_CHAIN_ID, CLOCK_ID, API_BASE, t } from '../../Config.ts';
import { useSelection } from '../../context/SelectionContext';

interface UpdateFormState {
  container: string;
  name: string;
  description: string;
  content: string;
  externalId: string;
  version: string;
  schemas: string;
  apis: string;
  resources: string;
  externalIndex: number;
}

export function UpdateContainerForm() {
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const account = useCurrentAccount();
  const { selectedContainerId } = useSelection();

  const carsMode = isCarsInstance();

  const [digest, setDigest] = useState('');
  const [loadingContainer, setLoadingContainer] = useState(false);
  const { notice, showNotice, clearNotice } = useTimedFormNotice(15000);
  const [invalidFields, setInvalidFields] = useState({
    container: false,
    name: false,
  });
  const [form, setForm] = useState<UpdateFormState>({
    container: '',
    name: '',
    description: '',
    content: '',
    externalId: '',
    version: '',
    schemas: '',
    apis: '',
    resources: '',
    externalIndex: 0,
  });

  const clearForm = () => {
    setForm({
      container: '',
      name: '',
      description: '',
      content: '',
      externalId: '',
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
      name: false,
    });
  };

  const loadSelectedContainer = useCallback(async () => {
    if (!selectedContainerId) {
      showNotice(t('messages.selectContainerOrType'));
      return;
    }

    try {
      setLoadingContainer(true);
      const res = await fetch(`${API_BASE}api/containers/${selectedContainerId}`);
      if (!res.ok) throw new Error(t('messages.failedToLoad'));
      const raw = await res.json();
      const data = raw.container ?? raw.data ?? raw;

      setForm(prev => ({
        ...prev,
        container: data.id ?? selectedContainerId ?? '',
        externalId: data.externalId ?? '',
        name: data.name ?? '',
        description: data.description ?? '',
        content: data.content ?? '',
        version: data.specification?.version ?? '',
        schemas: data.specification?.schemas ?? '',
        apis: data.specification?.apis ?? '',
        resources: data.specification?.resources ?? '',
        externalIndex: data.externalIndex ?? 0,
      }));
    } catch (err) {
      console.error(err);
      showNotice(t('messages.failedToLoad'));
    } finally {
      setLoadingContainer(false);
    }
  }, [selectedContainerId, showNotice]);

  useEffect(() => {
    const shouldAutoLoad =
      localStorage.getItem(UPDATE_CONTAINER_LOAD_SELECTED_INTENT_STORAGE_KEY) ===
      '1';
    if (!shouldAutoLoad) return;

    localStorage.removeItem(UPDATE_CONTAINER_LOAD_SELECTED_INTENT_STORAGE_KEY);
    if (selectedContainerId) {
      void loadSelectedContainer();
    }
  }, [selectedContainerId, loadSelectedContainer]);

  const valid = account && form.container.trim() && form.name.trim();

  const submit = () => {
    if (!account) {
      showNotice(t('messages.connectWalletToAdd'));
      return;
    }
    if (!valid) {
      setInvalidFields({
        container: !form.container.trim(),
        name: !form.name.trim(),
      });
      showNotice(t('messages.containerIdAndNameRequired'));
      return;
    }

    const tx = new Transaction();
    tx.moveCall({
      target: moveTarget('update_container'),
      arguments: [
        tx.object(UPDATE_CHAIN_ID),
        tx.object(form.container.trim()),
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

    submitTx(signAndExecuteTransaction, tx, account.address, setDigest);
  };

  return (
    <div className="form-page">
      <div className="form-wrapper">
        <h5 className="text-center mb-4">{t('container.singular')} {t('actions.edit')}</h5>

        <div className="mb-3 d-flex gap-2">
          <button
            className="btn btn-outline-secondary btn-sm w-100"
            onClick={loadSelectedContainer}
            disabled={!selectedContainerId || loadingContainer}
          >
            {loadingContainer
              ? t('messages.loading')
              : selectedContainerId
                ? t('actions.edit') + ' ' + t('container.singular')
                : t('messages.selectContainerOrType')}
          </button>

          <button className="btn btn-outline-danger btn-sm w-100" onClick={clearForm}>
            {t('actions.clearAll')}
          </button>
        </div>

        {/* Container Object */}
        <FormSectionRow title={t('container.singular')} description={t('messages.selectContainerOrType')}>
          <FormRow label={t('container.singular') + ' ID *'}>
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
        </FormSectionRow>

        {/* Basic Info + Content (always visible) */}
        <FormSectionRow title={t('sections.basicInfo')} description={t('fields.description')}>
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
   {!carsMode && (
     <>
          <FormRow label={t('fields.content')}>
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

        {/* Specification + External only if NOT cars instance */}
        {!carsMode && (
          <>
            <FormSectionRow title={t('sections.specification')} description={t('fields.schemas')} defaultCollapsed={true}>
              <FormRow label={t('fields.version')}>
                <input
                  className="form-control form-control-sm w-100"
                  value={form.version}
                  onChange={(e) => setForm({ ...form, version: e.target.value })}
                />
              </FormRow>

              <FormRow label={t('fields.schemas')}>
                <textarea
                  className="form-control form-control-sm w-100"
                  rows={2}
                  value={form.schemas}
                  onChange={(e) => setForm({ ...form, schemas: e.target.value })}
                />
              </FormRow>

              <FormRow label={t('fields.apis')}>
                <textarea
                  className="form-control form-control-sm w-100"
                  rows={2}
                  value={form.apis}
                  onChange={(e) => setForm({ ...form, apis: e.target.value })}
                />
              </FormRow>

              <FormRow label={t('fields.resources')}>
                <textarea
                  className="form-control form-control-sm w-100"
                  rows={2}
                  value={form.resources}
                  onChange={(e) => setForm({ ...form, resources: e.target.value })}
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

            <FormSectionRow title={t('sections.external')} description={t('messages.selectActionSidebar')}>
              <FormRow label={t('fields.externalId')}>
                <input
                  className="form-control form-control-sm w-100"
                  value={form.externalId}
                  onChange={(e) => setForm({ ...form, externalId: e.target.value })}
                />
              </FormRow>
            </FormSectionRow>
          </>
        )}

        {/* Finalize */}
        <div className="form-section-row mt-3">
          <div className="form-section-left">{t('actions.submit')}</div>
          <div className="form-section-middle text-center">
            <button
              className="btn btn-outline-primary btn-sm w-100"
              onClick={submit}
            >
              {account ? t('actions.update') + ' ' + t('container.singular') : t('messages.connectWalletToAdd')}
            </button>

            <FormInlineNotice notice={notice} />

            <TxDigestResult digest={digest} />
          </div>
          <div className="form-section-right mt-2">{t('messages.submit')}</div>
        </div>
      </div>
    </div>
  );
}
