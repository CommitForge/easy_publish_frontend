import { t } from '../../Config.ts';
import { FormSectionRow } from './CollapsibleFormSectionRow.tsx';
import { FormRow } from './FormUi.tsx';
import { LinkGraphLaunchButton } from './LinkGraphVisualization.tsx';
import ObjectIdListTextarea from './editor/ObjectIdListTextarea.tsx';

type LinkSourceType = 'data_item' | 'data_item_verification';

type RecipientsReferencesSectionProps = {
  recipientsValue: string;
  referencesValue: string;
  onRecipientsChange: (value: string) => void;
  onReferencesChange: (value: string) => void;
  sourceType: LinkSourceType;
  sourceContainerId?: string;
  sourceDataItemId?: string;
};

export function RecipientsReferencesSection({
  recipientsValue,
  referencesValue,
  onRecipientsChange,
  onReferencesChange,
  sourceType,
  sourceContainerId,
  sourceDataItemId,
}: RecipientsReferencesSectionProps) {
  return (
    <FormSectionRow
      title={t('labels.recipientsAndReferences')}
      description={t('messages.optionalRecipientsReference')}
    >
      <FormRow label={t('fields.recipients')}>
        <>
          <ObjectIdListTextarea
            value={recipientsValue}
            onChange={onRecipientsChange}
            placeholder={t('messages.objectIdListPlaceholder')}
            rows={4}
            helperText={t('messages.idListDelimiterHint')}
          />
          <div className="bp-link-graph-launch-row">
            <LinkGraphLaunchButton
              mode="recipients"
              rawValue={recipientsValue}
              sourceType={sourceType}
              sourceContainerId={sourceContainerId}
              sourceDataItemId={sourceDataItemId}
            />
          </div>
        </>
      </FormRow>

      <FormRow label={t('fields.references')}>
        <>
          <ObjectIdListTextarea
            value={referencesValue}
            onChange={onReferencesChange}
            placeholder={t('messages.objectIdListPlaceholder')}
            rows={4}
            helperText={t('messages.idListDelimiterHint')}
          />
          <div className="bp-link-graph-launch-row">
            <LinkGraphLaunchButton
              mode="references"
              rawValue={referencesValue}
              sourceType={sourceType}
              sourceContainerId={sourceContainerId}
              sourceDataItemId={sourceDataItemId}
            />
          </div>
        </>
      </FormRow>
    </FormSectionRow>
  );
}
