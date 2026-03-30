import { useSignAndExecuteTransaction } from '@iota/dapp-kit';
import { useState, useEffect } from 'react';
import { Transaction } from '@iota/iota-sdk/transactions';
import { FormRow } from './FormUi.tsx';
import { FormSectionRow } from './CollapsibleFormSectionRow.tsx';
import { TxDigestResult } from './TxDigestResult.tsx';
import { moveTarget, submitTx } from './TransactionUtils.tsx';
import {
  defaultContent,
  extractFollowContainersFromContent,
  extractRevisionChangeFromContent,
  extractRevisionIdsFromContent,
  FOLLOW_CONTAINERS_DRAFT_STORAGE_KEY,
  FOLLOW_CONTAINERS_PUBLISH_INTENT_STORAGE_KEY,
  getCarsContentJson,
  isCarsInstance,
  mergeContentWithFollowContainers,
  mergeContentWithRevisions,
  parseAddressList,
  type FollowContainerUpdateEntry,
} from './FormUtils.tsx';
import {
  CLOCK_ID,
  DATA_ITEM_CHAIN,
  API_BASE,
} from '../../Config.ts';
import { useSelection } from '../../context/SelectionContext';
import { t } from '../../Config.ts';
import CarMaintenanceEditor from './editor/CarMaintenanceEditor.tsx';
import FollowContainerEditor from './editor/FollowContainerEditor.tsx';

export function PublishDataItemForm({ address }: { address: string }) {
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const [digest, setDigest] = useState('');
  const [loadingDataItem, setLoadingDataItem] = useState(false);
  const [validatingRevisions, setValidatingRevisions] = useState(false);
  const { selectedDataItemId, selectedContainerId, selectedDataTypeId } = useSelection();

  const carsMode = isCarsInstance();
  const carsContentJson = getCarsContentJson();
  const [followTemplateMode, setFollowTemplateMode] = useState(false);

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
    revisionOf: '',
    revisionChange: '',
  });

  useEffect(() => {
    if (carsMode && !followTemplateMode) {
      setForm((f) => ({
        ...f,
        content: carsContentJson,
      }));
    }
  }, [carsMode, carsContentJson, followTemplateMode]);

  useEffect(() => {
    const publishIntent =
      localStorage.getItem(FOLLOW_CONTAINERS_PUBLISH_INTENT_STORAGE_KEY) === '1';
    if (!publishIntent) return;

    setFollowTemplateMode(true);
    const rawDraft = localStorage.getItem(FOLLOW_CONTAINERS_DRAFT_STORAGE_KEY);
    const applyEntries = (entries: FollowContainerUpdateEntry[]) => {
      setForm((prev) => ({
        ...prev,
        content: mergeContentWithFollowContainers(
          prev.content || defaultContent(carsMode),
          entries
        ),
      }));
    };

    if (!rawDraft) {
      applyEntries([]);
      localStorage.removeItem(FOLLOW_CONTAINERS_PUBLISH_INTENT_STORAGE_KEY);
      return;
    }

    try {
      const parsed = JSON.parse(rawDraft) as {
        entries?: FollowContainerUpdateEntry[];
      };
      const entries = Array.isArray(parsed?.entries) ? parsed.entries : [];
      applyEntries(entries);
    } catch (err) {
      console.warn('Failed to load follow draft payload', err);
    } finally {
      localStorage.removeItem(FOLLOW_CONTAINERS_PUBLISH_INTENT_STORAGE_KEY);
    }
  }, [carsMode]);

  const clearForm = () => {
    setForm({
      container: '',
      dataType: '',
      externalId: '',
      recipients: '',
      name: '',
      description: '',
      content: followTemplateMode
        ? mergeContentWithFollowContainers(defaultContent(carsMode), [])
        : defaultContent(carsMode),
      externalIndex: 0,
      reference: '',
      revisionOf: '',
      revisionChange: '',
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
      const normalizeReferenceField = (value: unknown): string => {
        if (Array.isArray(value)) return value.join(',');
        if (typeof value === 'string') return value;
        return '';
      };
      const revisionIds = extractRevisionIdsFromContent(data.content ?? '');
      const revisionChange = extractRevisionChangeFromContent(data.content ?? '');

      setForm({
        container: data.containerId ?? '',
        dataType: data.dataTypeId ?? '',
        externalId: data.externalId ?? '',
        recipients: '',
        name: data.name ?? '',
        description: data.description ?? '',
        content: data.content ?? '',
        externalIndex: data.externalIndex ?? 0,
        reference: normalizeReferenceField(data.reference ?? data.references),
        revisionOf: revisionIds.join(','),
        revisionChange,
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
      content: followTemplateMode
        ? mergeContentWithFollowContainers(defaultContent(carsMode), [])
        : defaultContent(carsMode),
      externalIndex: 0,
      reference: '',
      revisionOf: '',
      revisionChange: '',
    });
  };

  type RevisionValidationResult = {
    missingIds: string[];
    differentContainerIds: string[];
  };

  const validateRevisionIds = async (
    ids: string[],
    expectedContainerId: string
  ): Promise<RevisionValidationResult> => {
    const uniqueIds = Array.from(new Set(ids));
    if (uniqueIds.length === 0) {
      return { missingIds: [], differentContainerIds: [] };
    }

    const checks = await Promise.all(
      uniqueIds.map(async (id) => {
        try {
          const res = await fetch(`${API_BASE}api/data-items/${id}`);
          if (!res.ok) return { id, missing: true, differentContainer: false };
          const data = await res.json().catch(() => null);
          if (data?.id !== id) {
            return { id, missing: true, differentContainer: false };
          }

          const differentContainer =
            expectedContainerId.trim().length > 0 &&
            data?.containerId !== expectedContainerId;

          return { id, missing: false, differentContainer };
        } catch {
          return { id, missing: true, differentContainer: false };
        }
      })
    );

    return {
      missingIds: checks.filter((entry) => entry.missing).map((entry) => entry.id),
      differentContainerIds: checks
        .filter((entry) => !entry.missing && entry.differentContainer)
        .map((entry) => entry.id),
    };
  };

  const submit = async () => {
    if (!form.container.trim() || !form.dataType.trim() || !form.name.trim()) {
      return alert(t('messages.containerTypeNameRequired'));
    }

    const tx = new Transaction();
    const recipientAddrs = parseAddressList(form.recipients);
    const reference = parseAddressList(form.reference);
    const revisionIdsFromInput = followTemplateMode ? [] : parseAddressList(form.revisionOf);
    const revisionIdsFromContent = followTemplateMode
      ? []
      : extractRevisionIdsFromContent(form.content);
    const revisionIds =
      revisionIdsFromInput.length > 0
        ? revisionIdsFromInput
        : revisionIdsFromContent;

    if (!followTemplateMode && revisionIds.length > 0) {
      setValidatingRevisions(true);
      let validationResult: RevisionValidationResult = {
        missingIds: [],
        differentContainerIds: [],
      };
      try {
        validationResult = await validateRevisionIds(
          revisionIds,
          form.container.trim()
        );
      } finally {
        setValidatingRevisions(false);
      }

      if (validationResult.missingIds.length > 0) {
        return alert(
          [
            'Cannot publish this revision yet.',
            'These replacement Data Item IDs are not indexed in backend DB:',
            validationResult.missingIds.join(', '),
          ].join('\n')
        );
      }

      if (validationResult.differentContainerIds.length > 0) {
        return alert(
          [
            'Cannot publish this revision.',
            'Revision replacements must belong to the same container as the new item.',
            `Selected container: ${form.container.trim() || '-'}`,
            'These IDs belong to a different container:',
            validationResult.differentContainerIds.join(', '),
          ].join('\n')
        );
      }
    }

    const mergedReferences = followTemplateMode
      ? reference
      : Array.from(new Set([...reference, ...revisionIds]));
    const contentWithRevisions = followTemplateMode
      ? mergeContentWithFollowContainers(
          form.content,
          extractFollowContainersFromContent(form.content)
        )
      : revisionIdsFromInput.length > 0 || revisionIdsFromContent.length > 0
      ? mergeContentWithRevisions(form.content, revisionIds, form.revisionChange)
      : form.content;

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
        tx.pure.string(contentWithRevisions.trim()),
        tx.pure.u128(BigInt(form.externalIndex)),
        tx.pure.option(
          'vector<address>',
          mergedReferences.length > 0 ? mergedReferences : null
        ),
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

          {!followTemplateMode &&
            (!carsMode ? (
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
            ))}
        </FormSectionRow>

        {followTemplateMode && (
          <FormSectionRow
            title="Follow & Unfollow"
            description="Queue follow/unfollow updates. They are applied after publishing this item."
          >
            <FormRow label="Follow Container Updates">
              <FollowContainerEditor
                value={form.content}
                onChange={(json) =>
                  setForm((f) => ({
                    ...f,
                    content: json,
                  }))
                }
              />
            </FormRow>
          </FormSectionRow>
        )}

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

              {!followTemplateMode && (
                <>
                  <FormRow label="Revisions (previous Data Item IDs)">
                    <input
                      className="form-control form-control-sm w-100"
                      placeholder="0x...,0x..."
                      value={form.revisionOf}
                      onChange={(e) => setForm({ ...form, revisionOf: e.target.value })}
                    />
                    <small className="muted">
                      IDs entered here are written to <code>easy_publish.revisions</code> and
                      automatically included in references.
                    </small>
                  </FormRow>

                  <FormRow label="Revision change description">
                    <textarea
                      className="form-control form-control-sm w-100"
                      rows={2}
                      placeholder="What changed in this revision?"
                      value={form.revisionChange}
                      onChange={(e) => setForm({ ...form, revisionChange: e.target.value })}
                    />
                    <small className="muted">
                      Stored as <code>easy_publish.revisions.change</code>.
                    </small>
                  </FormRow>
                </>
              )}

            </FormSectionRow>
            
        <div className="form-section-row">
          <div className="form-section-left">{t('actions.finalize')}</div>

          <div className="form-section-middle text-center">
            <button
              className="btn btn-outline-primary btn-sm w-100"
              onClick={() => {
                void submit();
              }}
              disabled={validatingRevisions}
            >
              {validatingRevisions
                ? 'Validating revisions...'
                : `${t('actions.publish')} ${t('item.singular')}`}
            </button>

            <TxDigestResult digest={digest} />
          </div>

          <div className="form-section-right">{t('messages.submitAndInspect')}</div>
        </div>
      </div>
    </div>
  );
}
