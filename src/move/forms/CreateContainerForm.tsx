import { useSignAndExecuteTransaction } from '@iota/dapp-kit';
import { useState, useEffect } from 'react';
import { Transaction } from '@iota/iota-sdk/transactions';
import { FormRow, CheckboxSection } from './FormUi.tsx';
import { FormSectionRow } from './CollapsibleFormSectionRow.tsx';
import { TxDigestResult } from './TxDigestResult.tsx';
import { moveTarget, submitTx } from './TransactionUtils.tsx';
import { defaultContent, getCarsContentJson, isCarsInstance } from './FormUtils.tsx';
import { useSelection } from '../../context/SelectionContext';
import {
  CLOCK_ID,
  UPDATE_CHAIN_ID,
  CONTAINER_CHAIN_ID,
  API_BASE,
} from '../../Config.ts';
import { t } from '../../Config.ts';

export function CreateContainerForm({ address }: { address: string }) {
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const { selectedContainerId } = useSelection();
  const [loadingContainer, setLoadingContainer] = useState(false);
  const [digest, setDigest] = useState('');

  const carsMode = isCarsInstance();
  const carsContentJson = getCarsContentJson();

  const [form, setForm] = useState({
    externalId: '',
    name: '',
    description: '',
    content: '',
    version: '',
    schemas: '',
    apis: '',
    resources: '',
    externalIndex: 0,

    publicUpdate: false,
    publicAttach: false,
    publicCreateType: false,
    publicPublish: false,

    eventCreate: false,
    eventPublish: false,
    eventAttach: false,
    eventAdd: false,
    eventRemove: false,
    eventUpdate: false,
  });

  useEffect(() => {
    if (carsMode) {
      setForm((f) => ({
        ...f,
        content: carsContentJson,
      }));
    }
  }, [carsMode, carsContentJson]);

  const toggle = (key: keyof typeof form) => setForm((f) => ({ ...f, [key]: !f[key] }));

  const loadSelectedContainer = async () => {
    if (!selectedContainerId) return alert(t('messages.noContainerSelected'));

    try {
      setLoadingContainer(true);
      const res = await fetch(`${API_BASE}api/containers/${selectedContainerId}`);
      if (!res.ok) throw new Error(t('messages.containerNotFound'));

      const data = await res.json();
      setForm({
        externalId: data.externalId || '',
        name: data.name || '',
        description: data.description || '',
        content: carsMode ? carsContentJson : data.content || '',
        version: data.specification?.version || '',
        schemas: data.specification?.schemas || '',
        apis: data.specification?.apis || '',
        resources: data.specification?.resources || '',
        externalIndex: data.externalIndex || 0,

        publicUpdate: data.permission?.publicUpdateContainer ?? false,
        publicAttach: data.permission?.publicAttachContainerChild ?? false,
        publicCreateType: data.permission?.publicCreateDataType ?? false,
        publicPublish: data.permission?.publicPublishDataItem ?? false,

        eventCreate: data.eventConfig?.eventCreate ?? false,
        eventPublish: data.eventConfig?.eventPublish ?? false,
        eventAttach: data.eventConfig?.eventAttach ?? false,
        eventAdd: data.eventConfig?.eventAdd ?? false,
        eventRemove: data.eventConfig?.eventRemove ?? false,
        eventUpdate: data.eventConfig?.eventUpdate ?? false,
      });
    } catch (err) {
      console.error(err);
      alert(t('messages.failedLoadContainer'));
    } finally {
      setLoadingContainer(false);
    }
  };

  const clearForm = () => {
    setForm({
      externalId: '',
      name: '',
      description: '',
      content: defaultContent(carsMode),
      version: '',
      schemas: '',
      apis: '',
      resources: '',
      externalIndex: 0,

      publicUpdate: false,
      publicAttach: false,
      publicCreateType: false,
      publicPublish: false,

      eventCreate: false,
      eventPublish: false,
      eventAttach: false,
      eventAdd: false,
      eventRemove: false,
      eventUpdate: false,
    });
    setDigest('');
  };

  const submit = () => {
    if (!form.name.trim()) return alert(t('messages.nameRequired'));

    const tx = new Transaction();
    tx.moveCall({
      target: moveTarget('create_container'),
      arguments: [
        tx.object(CONTAINER_CHAIN_ID),
        tx.object(UPDATE_CHAIN_ID),
        tx.pure.string(form.externalId),
        tx.pure.string(form.name),
        tx.pure.string(form.description),
        tx.pure.string(form.content),
        tx.pure.string(form.version),
        tx.pure.string(form.schemas),
        tx.pure.string(form.apis),
        tx.pure.string(form.resources),
        tx.pure.bool(form.publicUpdate),
        tx.pure.bool(form.publicAttach),
        tx.pure.bool(form.publicCreateType),
        tx.pure.bool(form.publicPublish),
        tx.pure.bool(form.eventCreate),
        tx.pure.bool(form.eventPublish),
        tx.pure.bool(form.eventAttach),
        tx.pure.bool(form.eventAdd),
        tx.pure.bool(form.eventRemove),
        tx.pure.bool(form.eventUpdate),
        tx.pure.u128(BigInt(form.externalIndex)),
        tx.object(CLOCK_ID),
      ],
    });

    submitTx(signAndExecuteTransaction, tx, address, setDigest);
  };


  return (
    <div className="form-page">
      <div className="form-wrapper">
        <h5>{t('actions.create')} {t('container.singular')}</h5>

        <div className="mb-3 d-flex gap-2">
          <button
            className="btn btn-outline-secondary btn-sm w-100"
            onClick={loadSelectedContainer}
            disabled={!selectedContainerId || loadingContainer}
          >
            {loadingContainer
              ? t('messages.loading')
              : selectedContainerId
                ? t('actions.selected') + ' ' + t('container.singular')
                : t('messages.noContainerSelected')}
          </button>

          <button
            className="btn btn-outline-danger btn-sm w-100"
            onClick={clearForm}
          >
            {t('actions.clearAll')}
          </button>
        </div>

        {/* Always show basic data */}
        <FormSectionRow
          title={t('labels.basicData')}
          description={t('messages.humanReadableMetadata')}
        >
          <FormRow label={t('fields.name') + ' *'}>
            <input
              type="text"
              className="form-control form-control-sm w-100"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
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
            <textarea
              className="form-control form-control-sm w-100"
              rows={3}
              value={form.content}
              readOnly={carsMode} // prevent editing if cars
              onChange={(e) => setForm({ ...form, content: e.target.value })}
            />
          </FormRow>
             </>
        )}
        </FormSectionRow>

        {/* Hide other sections if cars */}
        {!carsMode && (
          <>
                    {/* Specification */}
        <FormSectionRow
          title={t('labels.specification')}
          description={t('messages.schemasApisResources')}
        >
          <FormRow label={t('fields.version')}>
            <input
              type="text"
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
        </FormSectionRow>

        {/* External ID */}
        <FormSectionRow
          title={t('labels.external')}
          description={t('messages.externalIDForIndexing')}
        >
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
              onChange={(e) =>
                setForm({ ...form, externalIndex: Number(e.target.value) })
              }
            />
          </FormRow>
        </FormSectionRow>

        {/* Permissions */}
        <FormSectionRow
          title={t('labels.permissions')}
          description={t('messages.publicAccessRules')}
          defaultCollapsed={true}
        >
          <CheckboxSection
            form={form}
            toggle={toggle}
            items={[
              ['publicUpdate', t('permissions.publicUpdate')],
              ['publicAttach', t('permissions.publicAttach')],
              ['publicCreateType', t('permissions.publicCreateType')],
              ['publicPublish', t('permissions.publicPublish')],
            ]}
          />
        </FormSectionRow>

        {/* Events */}
        <FormSectionRow
          title={t('labels.events')}
          description={t('messages.containerEvents')}
          defaultCollapsed={true}
        >
          <CheckboxSection
            form={form}
            toggle={toggle}
            items={[
              ['eventCreate', t('events.create')],
              ['eventPublish', t('events.publish')],
              ['eventAttach', t('events.attach')],
              ['eventAdd', t('events.addOwner')],
              ['eventRemove', t('events.removeOwner')],
              ['eventUpdate', t('events.update')],
            ]}
          />
        </FormSectionRow>

          </>
        )}

        {/* Submit row */}
        <div className="form-section-row">
          <div className="form-section-left">{t('actions.finalize')}</div>
          <div className="form-section-middle text-center">
            <button
              className="btn btn-outline-primary btn-sm w-100"
              onClick={submit}
            >
              {t('actions.create')} {t('container.singular')}
            </button>

            <TxDigestResult digest={digest} />
          </div>
          <div className="form-section-right">{t('messages.submitAndInspect')}</div>
        </div>
      </div>
    </div>
  );
}
