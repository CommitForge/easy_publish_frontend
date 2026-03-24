import React, { useState } from 'react';
import { useCurrentAccount } from '@iota/dapp-kit';
import { ItemsLoader } from '../move/view/ItemsLoader';
import { CarMaintenanceReportButton } from './CarMaintenanceReportButton.tsx';
import { FollowContainerPanel } from './FollowContainerPanel';
import type { PrimarySelection } from '../menus/PrimarySelection';
import {
  FaChevronDown,
  FaBars,
  FaSyncAlt,
  FaPlus,
  FaList,
  FaEdit,
  FaLink,
  FaUserPlus,
  FaUserMinus,
} from 'react-icons/fa';

import { t } from '../Config.ts'; // <-- import translations
import { useDragResize } from '../hooks/useDragResize';

type PanelMenuSelection = Extract<
  PrimarySelection,
  | 'createContainer'
  | 'addDataType'
  | 'addDataItem'
  | 'publishDataItemVerification'
  | 'items'
  | 'updateContainer'
  | 'attachChild'
  | 'addOwner'
  | 'removeOwner'
  | 'updateDataType'
>;

type SecondaryAction = {
  label: string;
  key: PanelMenuSelection;
  icon: React.ReactNode;
  disabled?: boolean;
};

interface SidebarPanelProps {
  selectedContainerId?: string | null;
  selectedDataTypeId?: string | null;
  setSelectedContainerId: (id: string | null) => void;
  setSelectedDataTypeId: (id: string | null) => void;
  followedContainers: string[];
  setFollowedContainers: React.Dispatch<React.SetStateAction<string[]>>;
  primaryMenuSelection: PanelMenuSelection;
  setPrimaryMenuSelection: (val: PanelMenuSelection) => void;
}

export function SidebarPanel({
  selectedContainerId,
  selectedDataTypeId,
  setSelectedContainerId,
  primaryMenuSelection,
  setPrimaryMenuSelection,
  followedContainers,
  setFollowedContainers,
}: SidebarPanelProps) {
  const account = useCurrentAccount();

  const { width: mainWidth, startDrag: startDragMain } = useDragResize(300, 180, 600);
  const { width: containersWidth, startDrag: startDragContainers } = useDragResize(250, 150, 500, () => mainWidth);
  const dataTypesWidth = 250;
  const [collapsed, setCollapsed] = useState(false);
  const [showContainersPanel, setShowContainersPanel] = useState(false);
  const [showDataTypesPanel, setShowDataTypesPanel] = useState(false);
  const [containerRefreshKey, setContainerRefreshKey] = useState(0);
  const [dataTypeRefreshKey, setDataTypeRefreshKey] = useState(0);
  const [expandedSecondary, setExpandedSecondary] =
    useState<'createContainer' | 'addDataType' | null>(null);

  const toggleCollapse = () => setCollapsed((v) => !v);

  const sectionHeaderStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    fontWeight: 600,
    padding: '6px 4px',
    borderRadius: 4,
  };

  const actionButtonStyle = (
    active: boolean,
    indent = 0,
    disabled = false
  ): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 8px',
    borderRadius: 6,
    cursor: disabled ? 'not-allowed' : 'pointer',
    marginBottom: 6,
    paddingLeft: 8 + indent,
    background: active ? 'rgba(255,255,255,0.12)' : 'transparent',
    fontWeight: active ? 600 : 400,
    opacity: disabled ? 0.4 : 1,
  });

  const panelSpacing = { marginBottom: 20 };

  const containerSecondary: SecondaryAction[] = [
    {
      label: t('container.singular') + ' ' + t('actions.edit'),
      key: 'updateContainer',
      icon: <FaEdit />,
      disabled: !selectedContainerId,
    },
    { label: t('actions.attach'), key: 'attachChild', icon: <FaLink />, disabled: !selectedContainerId },
    { label: t('actions.addOwner'), key: 'addOwner', icon: <FaUserPlus />, disabled: !selectedContainerId },
    { label: t('actions.removeOwner'), key: 'removeOwner', icon: <FaUserMinus />, disabled: !selectedContainerId },
  ];

  const dataTypeSecondary: SecondaryAction[] = [
    { label: t('type.singular') + ' ' + t('actions.edit'), key: 'updateDataType', icon: <FaEdit />, disabled: !selectedDataTypeId },
  ];

  return (
    <div style={{ display: 'flex' }}>
      <aside
        style={{
          width: collapsed ? 50 : mainWidth,
          background: 'var(--bg-alt)',
          padding: '1rem',
          borderRight: '1px solid var(--comment)',
          overflowY: 'auto',
          transition: 'width 0.2s ease',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
      >
        <div
          style={{ ...sectionHeaderStyle, marginBottom: 12 }}
          onClick={toggleCollapse}
        >
          <FaBars />
          {!collapsed && <span style={{ marginLeft: 6 }}>{t('menu')}</span>}
        </div>

        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: 5,
            cursor: 'col-resize',
          }}
          onMouseDown={startDragMain}
        />

        {!collapsed && (
          <>
            <div style={panelSpacing}>
              <div
                style={actionButtonStyle(primaryMenuSelection === 'createContainer')}
                onClick={() => {
                  setPrimaryMenuSelection('createContainer');
                  setExpandedSecondary(
                    expandedSecondary === 'createContainer' ? null : 'createContainer'
                  );
                }}
              >
                <FaPlus /> {t('actions.new')} {t('container.singular')}
              </div>
              {expandedSecondary === 'createContainer' &&
                containerSecondary.map((item) => (
                  <div
                    key={item.key}
                    style={actionButtonStyle(primaryMenuSelection === item.key, 16, !!item.disabled)}
                    onClick={() => {
                      if (item.disabled) return;
                      setPrimaryMenuSelection(item.key);
                    }}
                  >
                    {item.icon} {item.label}
                  </div>
                ))}

              <div
                style={actionButtonStyle(primaryMenuSelection === 'addDataType')}
                onClick={() => {
                  setPrimaryMenuSelection('addDataType');
                  setExpandedSecondary(
                    expandedSecondary === 'addDataType' ? null : 'addDataType'
                  );
                }}
              >
                <FaPlus /> {t('actions.new')} {t('type.singular')}
              </div>
              {expandedSecondary === 'addDataType' &&
                dataTypeSecondary.map((item) => (
                  <div
                    key={item.key}
                    style={actionButtonStyle(primaryMenuSelection === item.key, 16, !!item.disabled)}
                    onClick={() => {
                      if (item.disabled) return;
                      setPrimaryMenuSelection(item.key);
                    }}
                  >
                    {item.icon} {item.label}
                  </div>
                ))}

              <div
                style={actionButtonStyle(primaryMenuSelection === 'addDataItem')}
                onClick={() => setPrimaryMenuSelection('addDataItem')}
              >
                <FaPlus /> {t('actions.new')} {t('item.singular')}
              </div>

              <div
                style={actionButtonStyle(primaryMenuSelection === 'publishDataItemVerification')}
                onClick={() => setPrimaryMenuSelection('publishDataItemVerification')}
              >
                <FaPlus /> {t('actions.new')} {t('itemVerification.singular')}
              </div>
            </div>

            <div style={panelSpacing}>
              <div
                style={actionButtonStyle(showContainersPanel)}
                onClick={() => setShowContainersPanel((p) => !p)}
              >
                <FaList /> {t('browse.containers')}
              </div>
              <div
                style={actionButtonStyle(showDataTypesPanel)}
                onClick={() => setShowDataTypesPanel((p) => !p)}
              >
                <FaList /> {t('browse.types')}
              </div>
              <div
                style={actionButtonStyle(primaryMenuSelection === 'items')}
                onClick={() => setPrimaryMenuSelection('items')}
              >
                <FaList /> {t('browse.items')}
              </div>
            </div>
  {/* === Car Maintenance PDF Button === */}
 <CarMaintenanceReportButton dataTypeId={selectedDataTypeId} />
            <FollowContainerPanel
              accountAddress={account?.address}
              followedContainers={followedContainers}
              setFollowedContainers={setFollowedContainers}
              setSelectedContainerId={setSelectedContainerId}
              setPrimaryMenuSelection={(val) => setPrimaryMenuSelection(val)}
            />
          </>
        )}
      </aside>

      {/* === Secondary aside: Containers === */}
      {showContainersPanel && (
        <>
          <aside
            style={{
              width: containersWidth,
              background: 'var(--bg-alt)',
              padding: '1rem',
              borderRight: '1px solid var(--comment)',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={panelSpacing}>
              <div
                style={sectionHeaderStyle}
                onClick={() => setShowContainersPanel(false)}
              >
                <FaChevronDown />{' '}
                <span style={{ marginLeft: 6 }}>Containers</span>
                <FaSyncAlt
                  style={{ marginLeft: 8, cursor: 'pointer' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setContainerRefreshKey((k) => k + 1);
                  }}
                />
              </div>
              <ItemsLoader
                key={containerRefreshKey}
                type="container"
                containerId={selectedContainerId ?? undefined}
                dataTypeId={selectedDataTypeId ?? undefined} // <— here it’s used
                fieldsToShow={['name']}
              />
            </div>
          </aside>

          <div
            style={{
              width: 5,
              cursor: 'col-resize',
              background: 'transparent',
            }}
            onMouseDown={startDragContainers}
          />
        </>
      )}

      {/* === Tertiary aside: Data Types === */}
      {showDataTypesPanel && (
        <aside
          style={{
            width: dataTypesWidth,
            background: 'var(--bg-alt)',
            padding: '1rem',
            borderRight: '1px solid var(--comment)',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={panelSpacing}>
            <div
              style={sectionHeaderStyle}
              onClick={() => setShowDataTypesPanel(false)}
            >
              <FaChevronDown /> <span style={{ marginLeft: 6 }}>Data Types</span>
              <FaSyncAlt
                style={{ marginLeft: 8, cursor: 'pointer' }}
                onClick={(e) => {
                  e.stopPropagation();
                  setDataTypeRefreshKey((k) => k + 1);
                }}
              />
            </div>
            <ItemsLoader
              key={dataTypeRefreshKey}
              type="data_type"
              containerId={selectedContainerId ?? undefined}
              dataTypeId={selectedDataTypeId ?? undefined}
              fieldsToShow={['name']}
            />
          </div>
        </aside>
      )}
    </div>
  );
}
