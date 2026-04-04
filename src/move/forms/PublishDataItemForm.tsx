import { useSignAndExecuteTransaction } from '@iota/dapp-kit';
import { useState, useEffect, useCallback } from 'react';
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
  extractFollowContainersFromContent,
  extractRevisionChangeFromContent,
  extractRevisionIdsFromContent,
  ADD_DATA_ITEM_LOAD_SELECTED_INTENT_STORAGE_KEY,
  FOLLOW_CONTAINERS_CLEARED_EVENT,
  FOLLOW_CONTAINERS_DRAFT_STORAGE_KEY,
  FOLLOW_CONTAINERS_PUBLISH_INTENT_STORAGE_KEY,
  getFollowStorageItem,
  getCarsContentJson,
  formatAddressList,
  isCarsInstance,
  mergeContentWithFollowContainers,
  mergeContentWithRevisions,
  parseAddressList,
  removeFollowStorageItem,
  type FollowContainerUpdateEntry,
} from './FormUtils.tsx';
import { prepareContentForPublish } from './ContentCompaction.ts';
import {
  CLOCK_ID,
  DATA_ITEM_CHAIN,
  API_BASE,
} from '../../Config.ts';
import { useSelection } from '../../context/SelectionContext';
import { t } from '../../Config.ts';
import CarMaintenanceEditor from './editor/CarMaintenanceEditor.tsx';
import FollowContainerEditor from './editor/FollowContainerEditor.tsx';
import ObjectIdListTextarea from './editor/ObjectIdListTextarea.tsx';
import { RecipientsReferencesSection } from './RecipientsReferencesSection.tsx';

export function PublishDataItemForm({ address }: { address: string }) {
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const [digest, setDigest] = useState('');
  const [loadingDataItem, setLoadingDataItem] = useState(false);
  const [validatingRevisions, setValidatingRevisions] = useState(false);
  const { notice, showNotice, clearNotice } = useTimedFormNotice(15000);
  const [invalidFields, setInvalidFields] = useState({
    container: false,
    dataType: false,
    name: false,
    revisionOf: false,
  });
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
  const [contentCheckSignal, setContentCheckSignal] = useState(0);
  const [autoCompressContent, setAutoCompressContent] = useState(true);
  const [autoZipContent, setAutoZipContent] = useState(false);

  const triggerContentCheck = useCallback(() => {
    setContentCheckSignal((signal) => signal + 1);
  }, []);

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
    if (carsMode && !followTemplateMode) {
      setForm((f) => ({
        ...f,
        content: carsContentJson,
      }));
    }
  }, [carsMode, carsContentJson, followTemplateMode]);

  useEffect(() => {
    const publishIntent =
      getFollowStorageItem(FOLLOW_CONTAINERS_PUBLISH_INTENT_STORAGE_KEY) === '1';
    if (!publishIntent) return;

    setFollowTemplateMode(true);
    const rawDraft = getFollowStorageItem(FOLLOW_CONTAINERS_DRAFT_STORAGE_KEY);
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
      removeFollowStorageItem(FOLLOW_CONTAINERS_PUBLISH_INTENT_STORAGE_KEY);
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
      removeFollowStorageItem(FOLLOW_CONTAINERS_PUBLISH_INTENT_STORAGE_KEY);
    }
  }, [carsMode]);

  useEffect(() => {
    if (!digest || !followTemplateMode) return;

    removeFollowStorageItem(FOLLOW_CONTAINERS_DRAFT_STORAGE_KEY);
    removeFollowStorageItem(FOLLOW_CONTAINERS_PUBLISH_INTENT_STORAGE_KEY);
    window.dispatchEvent(new Event(FOLLOW_CONTAINERS_CLEARED_EVENT));
  }, [digest, followTemplateMode]);

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
    clearNotice();
    setInvalidFields({
      container: false,
      dataType: false,
      name: false,
      revisionOf: false,
    });
  };

  const loadSelectedDataItem = useCallback(async (dataItemId: string) => {
    if (!dataItemId) {
      showNotice(t('messages.noDataItemId'));
      return;
    }

    try {
      setLoadingDataItem(true);
      const res = await fetch(`${API_BASE}api/data-items/${dataItemId}`);
      if (!res.ok) throw new Error(t('messages.failedLoadDataItem'));
      const data = await res.json();
      const normalizeReferenceField = (value: unknown): string => {
        if (Array.isArray(value)) {
          return formatAddressList(value.filter((entry): entry is string => typeof entry === 'string'));
        }
        if (typeof value === 'string') return formatAddressList([value]);
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
        revisionOf: formatAddressList(revisionIds),
        revisionChange,
      });
    } catch (err) {
      console.error(err);
      showNotice(t('messages.failedLoadDataItem'));
    } finally {
      setLoadingDataItem(false);
    }
  }, [showNotice]);

  const loadContainerAndType = useCallback(() => {
    if (!selectedContainerId || !selectedDataTypeId) {
      showNotice(t('messages.noContainerOrType'));
      return;
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
  }, [carsMode, followTemplateMode, selectedContainerId, selectedDataTypeId, showNotice]);

  useEffect(() => {
    const shouldAutoLoadSelected =
      localStorage.getItem(ADD_DATA_ITEM_LOAD_SELECTED_INTENT_STORAGE_KEY) ===
      '1';
    if (!shouldAutoLoadSelected) return;

    localStorage.removeItem(ADD_DATA_ITEM_LOAD_SELECTED_INTENT_STORAGE_KEY);

    if (selectedDataItemId) {
      void loadSelectedDataItem(selectedDataItemId);
      return;
    }

    if (selectedContainerId && selectedDataTypeId) {
      loadContainerAndType();
    }
  }, [
    selectedDataItemId,
    selectedContainerId,
    selectedDataTypeId,
    loadContainerAndType,
    loadSelectedDataItem,
  ]);

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
    const missingContainer = !form.container.trim();
    const missingDataType = !form.dataType.trim();
    const missingName = !form.name.trim();
    if (missingContainer || missingDataType || missingName) {
      setInvalidFields((prev) => ({
        ...prev,
        container: missingContainer,
        dataType: missingDataType,
        name: missingName,
      }));
      showNotice(t('messages.containerTypeNameRequired'));
      return;
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
        setInvalidFields((prev) => ({ ...prev, revisionOf: true }));
        showNotice(
          `Revision IDs are not indexed yet: ${validationResult.missingIds.join(', ')}`
        );
        return;
      }

      if (validationResult.differentContainerIds.length > 0) {
        setInvalidFields((prev) => ({
          ...prev,
          container: true,
          revisionOf: true,
        }));
        showNotice(
          `Revision IDs belong to a different container: ${validationResult.differentContainerIds.join(', ')}`
        );
        return;
      }
    }

    const txReferences = reference;
    const contentWithRevisions = followTemplateMode
      ? mergeContentWithFollowContainers(
          form.content,
          extractFollowContainersFromContent(form.content)
        )
      : revisionIdsFromInput.length > 0 || revisionIdsFromContent.length > 0
      ? mergeContentWithRevisions(form.content, revisionIds, form.revisionChange)
      : form.content;
    let preparedContent;
    try {
      preparedContent = await prepareContentForPublish(contentWithRevisions, {
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
      target: moveTarget('publish_data_item'),
      arguments: [
        tx.object(DATA_ITEM_CHAIN),
        tx.object(form.container.trim()),
        tx.object(form.dataType.trim()),
        tx.pure.string(form.externalId.trim()),
        tx.pure.option('vector<address>', recipientAddrs.length > 0 ? recipientAddrs : null),
        tx.pure.string(form.name.trim()),
        tx.pure.string(form.description.trim()),
        tx.pure.string(contentForPublish),
        tx.pure.u128(BigInt(form.externalIndex)),
        tx.pure.option(
          'vector<address>',
          txReferences.length > 0 ? txReferences : null
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

        <div className="mb-3 bp-form-top-actions">
          <button
            className="btn btn-outline-secondary btn-sm bp-form-top-action-btn"
            onClick={() => selectedDataItemId && loadSelectedDataItem(selectedDataItemId)}
            disabled={!selectedDataItemId}
          >
            {loadingDataItem ? t('messages.loading') : t('actions.selected') + ' ' + t('item.singular')}
          </button>

          <button
            className="btn btn-outline-info btn-sm bp-form-top-action-btn"
            onClick={loadContainerAndType}
            disabled={!selectedContainerId || !selectedDataTypeId}
          >
            {t('container.singular')} & {t('type.singular')}
          </button>

          <button className="btn btn-outline-danger btn-sm bp-form-top-action-btn" onClick={clearForm}>
            {t('actions.clearAll')}
          </button>
        </div>

        <FormSectionRow title={t('labels.parentObjects')} description={t('messages.containerAndType')}>
          <FormRow label={t('container.singular') + ' ID *'}>
            <input
              type="text"
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

          <FormRow label={t('type.singular') + ' ID *'}>
            <input
              type="text"
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

        <FormSectionRow title={t('labels.basicData')} description={t('messages.humanReadableMetadata')}>
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

          {!followTemplateMode &&
            (!carsMode ? (
              <FormRow label={t('fields.content') + ' (' + t('optional') + ')'}>
                <>
                  <textarea
                    className="form-control form-control-sm w-100"
                    rows={3}
                    value={form.content}
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
            ) : (
              <FormRow label="Car Maintenance Entry">
                <>
                  <CarMaintenanceEditor
                    value={form.content}
                    onChange={(json) =>
                      setForm((f) => ({
                        ...f,
                        content: json,
                      }))
                    }
                    onBlur={triggerContentCheck}
                  />
                  <ContentCheckInline
                    content={form.content}
                    autoCheckSignal={contentCheckSignal}
                    rightControl={renderContentPublishOptions()}
                  />
                </>
              </FormRow>
            ))}
        </FormSectionRow>

        {followTemplateMode && (
          <FormSectionRow
            title="Follow & Unfollow"
            description="Queued updates apply on publish."
          >
            <FormRow label="Updates">
              <>
                <FollowContainerEditor
                  value={form.content}
                  onChange={(json) =>
                    setForm((f) => ({
                      ...f,
                      content: json,
                    }))
                  }
                  onBlur={triggerContentCheck}
                />
                <ContentCheckInline
                  content={form.content}
                  autoCheckSignal={contentCheckSignal}
                  rightControl={renderContentPublishOptions()}
                />
              </>
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

            <RecipientsReferencesSection
              recipientsValue={form.recipients}
              referencesValue={form.reference}
              onRecipientsChange={(nextValue) =>
                setForm({ ...form, recipients: nextValue })
              }
              onReferencesChange={(nextValue) =>
                setForm({ ...form, reference: nextValue })
              }
              sourceType="data_item"
              sourceContainerId={form.container}
              sourceDataItemId={selectedDataItemId ?? undefined}
            />

            {!followTemplateMode && (
              <FormSectionRow
                title={t('labels.revisionsAdvanced')}
                description={t('messages.revisionsAdvancedDescription')}
                defaultCollapsed={true}
              >
                <FormRow label={t('labels.revisionsPreviousItems')}>
                  <ObjectIdListTextarea
                    value={form.revisionOf}
                    onChange={(nextValue) => {
                      setForm({ ...form, revisionOf: nextValue });
                      if (invalidFields.revisionOf) {
                        setInvalidFields((prev) => ({ ...prev, revisionOf: false }));
                      }
                    }}
                    placeholder={t('messages.objectIdListPlaceholder')}
                    rows={4}
                    invalid={invalidFields.revisionOf}
                    helperText={t('messages.idListDelimiterHint')}
                  />
                  <small className="muted">
                    IDs entered here are written to <code>easy_publish.revisions</code> only.
                    References are configured separately.
                  </small>
                </FormRow>

                <FormRow label={t('labels.revisionChangeDescription')}>
                  <textarea
                    className="form-control form-control-sm w-100"
                    rows={2}
                    placeholder={t('messages.revisionChangePlaceholder')}
                    value={form.revisionChange}
                    onChange={(e) => setForm({ ...form, revisionChange: e.target.value })}
                  />
                  <small className="muted">
                    Stored as <code>easy_publish.revisions.change</code>.
                  </small>
                </FormRow>
              </FormSectionRow>
            )}
            
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
                ? t('messages.validatingRevisions')
                : `${t('actions.publish')} ${t('item.singular')}`}
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
