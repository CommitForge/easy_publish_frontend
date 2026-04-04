import React, { useState } from 'react';
import { useCurrentAccount } from '@iota/dapp-kit';
import { ItemsLoader } from '../move/view/ItemsLoader';
import { CarMaintenanceReportButton } from './CarMaintenanceReportButton.tsx';
import { FollowContainerPanel } from './FollowContainerPanel';
import type { PrimarySelection } from '../menus/PrimarySelection';
import {
  FaChevronDown,
  FaChevronRight,
  FaBars,
  FaSyncAlt,
  FaChartBar,
  FaPlus,
  FaList,
  FaColumns,
  FaEdit,
  FaLink,
  FaInbox,
  FaCheckCircle,
  FaUserPlus,
  FaUserMinus,
} from 'react-icons/fa';

import { t } from '../Config.ts'; // <-- import translations
import { useDragResize } from '../hooks/useDragResize';

export type PanelMenuSelection = Extract<
  PrimarySelection,
  | 'dashboard'
  | 'createContainer'
  | 'addDataType'
  | 'addDataItem'
  | 'publishDataItemVerification'
  | 'items'
  | 'receivedItems'
  | 'itemVerifications'
  | 'receivedItemVerifications'
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
  const [addDataCollapsed, setAddDataCollapsed] = useState(false);
  const [viewDataCollapsed, setViewDataCollapsed] = useState(false);
  const [receivedDataCollapsed, setReceivedDataCollapsed] = useState(false);
  const [followDataCollapsed, setFollowDataCollapsed] = useState(false);

  const toggleCollapse = () => setCollapsed((v) => !v);

  const sectionHeaderStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    fontWeight: 600,
    padding: '5px 3px',
    borderRadius: 4,
  };

  const actionButtonStyle = (
    active: boolean,
    indent = 0,
    disabled = false
  ): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    padding: '5px 7px',
    borderRadius: 6,
    cursor: disabled ? 'not-allowed' : 'pointer',
    marginBottom: 4,
    paddingLeft: 8 + indent,
    background: active ? 'rgba(255,255,255,0.12)' : 'transparent',
    fontWeight: active ? 600 : 400,
    opacity: disabled ? 0.4 : 1,
  });

  const panelSpacing = { marginBottom: 10 };
  const secondaryPanelsTogether = showContainersPanel && showDataTypesPanel;

  const sectionDividerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    margin: '2px 0 5px 0',
  };

  const sectionDividerLineStyle: React.CSSProperties = {
    flex: 1,
    height: 1,
    background: 'rgba(98, 114, 164, 0.38)',
  };

  const sectionToggleStyle: React.CSSProperties = {
    border: 'none',
    background: 'transparent',
    color: 'var(--comment)',
    padding: 0,
    margin: 0,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 11,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    lineHeight: 1.1,
  };

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

  const canCreateDataType = !!selectedContainerId;
  const canCreateDataItem = !!selectedContainerId && !!selectedDataTypeId;
  const canCreateVerification = !!selectedContainerId && !!selectedDataTypeId;

  return (
    <div style={{ display: 'flex' }}>
      <aside
        style={{
          width: collapsed ? 50 : mainWidth,
          background: 'var(--bg-alt)',
          padding: '0.6rem',
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
              <div style={sectionDividerStyle}>
                <span style={sectionDividerLineStyle} />
                <button
                  type="button"
                  style={sectionToggleStyle}
                  onClick={() => setAddDataCollapsed((prev) => !prev)}
                  aria-expanded={!addDataCollapsed}
                  aria-label="Toggle Add Data section"
                >
                  {addDataCollapsed ? <FaChevronRight /> : <FaChevronDown />}
                  ADD DATA
                </button>
                <span style={sectionDividerLineStyle} />
              </div>

              {!addDataCollapsed && (
                <>
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
                    style={actionButtonStyle(
                      primaryMenuSelection === 'addDataType',
                      0,
                      !canCreateDataType
                    )}
                    onClick={() => {
                      if (!canCreateDataType) return;
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
                    style={actionButtonStyle(
                      primaryMenuSelection === 'addDataItem',
                      0,
                      !canCreateDataItem
                    )}
                    onClick={() => {
                      if (!canCreateDataItem) return;
                      setPrimaryMenuSelection('addDataItem');
                    }}
                  >
                    <FaPlus /> {t('actions.new')} {t('item.singular')}
                  </div>

                  <div
                    style={actionButtonStyle(
                      primaryMenuSelection === 'publishDataItemVerification',
                      0,
                      !canCreateVerification
                    )}
                    onClick={() => {
                      if (!canCreateVerification) return;
                      setPrimaryMenuSelection('publishDataItemVerification');
                    }}
                  >
                    <FaPlus /> {t('actions.new')} {t('itemVerification.singular')}
                  </div>
                </>
              )}
            </div>

            <div style={panelSpacing}>
              <div style={sectionDividerStyle}>
                <span style={sectionDividerLineStyle} />
                <button
                  type="button"
                  style={sectionToggleStyle}
                  onClick={() => setViewDataCollapsed((prev) => !prev)}
                  aria-expanded={!viewDataCollapsed}
                  aria-label="Toggle View Data section"
                >
                  {viewDataCollapsed ? <FaChevronRight /> : <FaChevronDown />}
                  VIEW DATA
                </button>
                <span style={sectionDividerLineStyle} />
              </div>

              {!viewDataCollapsed && (
                <>
                  <div
                    style={actionButtonStyle(primaryMenuSelection === 'dashboard')}
                    onClick={() => setPrimaryMenuSelection('dashboard')}
                  >
                    <FaChartBar /> Dashboard
                  </div>

                  <div
                    style={{ ...actionButtonStyle(showContainersPanel), justifyContent: 'space-between' }}
                    onClick={() => setShowContainersPanel((p) => !p)}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                      <FaList /> {t('browse.containers')}
                    </span>
                    <span
                      title={
                        secondaryPanelsTogether
                          ? 'Secondary sidebars are open together'
                          : 'Opens as a secondary sidebar'
                      }
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: 11,
                        opacity: showContainersPanel ? 0.95 : 0.55,
                      }}
                    >
                      <FaColumns />
                      {secondaryPanelsTogether ? <span>2</span> : null}
                    </span>
                  </div>
                  <div
                    style={{ ...actionButtonStyle(showDataTypesPanel), justifyContent: 'space-between' }}
                    onClick={() => setShowDataTypesPanel((p) => !p)}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                      <FaList /> {t('browse.types')}
                    </span>
                    <span
                      title={
                        secondaryPanelsTogether
                          ? 'Secondary sidebars are open together'
                          : 'Opens as a secondary sidebar'
                      }
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: 11,
                        opacity: showDataTypesPanel ? 0.95 : 0.55,
                      }}
                    >
                      <FaColumns />
                      {secondaryPanelsTogether ? <span>2</span> : null}
                    </span>
                  </div>
                  <div
                    style={actionButtonStyle(primaryMenuSelection === 'items')}
                    onClick={() => setPrimaryMenuSelection('items')}
                  >
                    <FaList /> {t('browse.items')}
                  </div>
                  <div
                    style={actionButtonStyle(primaryMenuSelection === 'itemVerifications')}
                    onClick={() => setPrimaryMenuSelection('itemVerifications')}
                  >
                    <FaCheckCircle /> {t('browse.itemVerifications')}
                  </div>
                </>
              )}
            </div>

            <div style={panelSpacing}>
              <div style={sectionDividerStyle}>
                <span style={sectionDividerLineStyle} />
                <button
                  type="button"
                  style={sectionToggleStyle}
                  onClick={() => setReceivedDataCollapsed((prev) => !prev)}
                  aria-expanded={!receivedDataCollapsed}
                  aria-label="Toggle Received Data section"
                >
                  {receivedDataCollapsed ? <FaChevronRight /> : <FaChevronDown />}
                  RECEIVED DATA
                </button>
                <span style={sectionDividerLineStyle} />
              </div>

              {!receivedDataCollapsed && (
                <>
                  <div
                    style={actionButtonStyle(primaryMenuSelection === 'receivedItems')}
                    onClick={() => setPrimaryMenuSelection('receivedItems')}
                  >
                    <FaInbox /> {t('browse.receivedItems')}
                  </div>
                  <div
                    style={actionButtonStyle(primaryMenuSelection === 'receivedItemVerifications')}
                    onClick={() => setPrimaryMenuSelection('receivedItemVerifications')}
                  >
                    <FaInbox /> {t('browse.receivedItemVerifications')}
                  </div>
                </>
              )}
            </div>

            <div style={panelSpacing}>
              <div style={sectionDividerStyle}>
                <span style={sectionDividerLineStyle} />
                <button
                  type="button"
                  style={sectionToggleStyle}
                  onClick={() => setFollowDataCollapsed((prev) => !prev)}
                  aria-expanded={!followDataCollapsed}
                  aria-label="Toggle Follow Data section"
                >
                  {followDataCollapsed ? <FaChevronRight /> : <FaChevronDown />}
                  FOLLOW DATA
                </button>
                <span style={sectionDividerLineStyle} />
              </div>

              {!followDataCollapsed && (
                <>
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
            </div>
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
              padding: '0.55rem 0.6rem',
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
            padding: '0.55rem 0.6rem',
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
