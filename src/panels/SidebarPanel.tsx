import React, { useEffect, useState } from 'react';
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
  FaProjectDiagram,
  FaUsers,
  FaQuestionCircle,
  FaPlug,
  FaFileAlt,
  FaTimes,
} from 'react-icons/fa';

import { API_BASE, t } from '../Config.ts'; // <-- import translations
import { useDragResize } from '../hooks/useDragResize';
import { DEFAULT_FIELDS_BY_TYPE } from '../utils/itemLoaderConfig.ts';

export type PanelMenuSelection = Extract<
  PrimarySelection,
  | 'help'
  | 'dashboard'
  | 'smartReport'
  | 'erpIntegration'
  | 'createContainer'
  | 'addDataType'
  | 'addDataItem'
  | 'publishDataItemVerification'
  | 'items'
  | 'containerChildLinks'
  | 'owners'
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
  disabledReason?: string;
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
  const [showContainerFullTableDialog, setShowContainerFullTableDialog] =
    useState(false);
  const [showDataTypeFullTableDialog, setShowDataTypeFullTableDialog] =
    useState(false);
  const [expandedSecondary, setExpandedSecondary] =
    useState<'createContainer' | 'addDataType' | null>(null);
  const [addDataCollapsed, setAddDataCollapsed] = useState(false);
  const [viewDataCollapsed, setViewDataCollapsed] = useState(false);
  const [reportsCollapsed, setReportsCollapsed] = useState(false);
  const [receivedDataCollapsed, setReceivedDataCollapsed] = useState(false);
  const [followDataCollapsed, setFollowDataCollapsed] = useState(false);
  const [needsStartupTutorialHelpHint, setNeedsStartupTutorialHelpHint] =
    useState(false);

  const toggleCollapse = () => setCollapsed((v) => !v);

  const sectionHeaderStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    fontWeight: 600,
    padding: '5px 3px',
    borderRadius: 4,
    justifyContent: 'space-between',
    gap: 8,
  };

  const headerLinkStyle: React.CSSProperties = {
    border: 'none',
    background: 'transparent',
    color: 'var(--comment)',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    padding: 0,
    margin: 0,
    fontSize: 12,
    textDecoration: 'none',
    textUnderlineOffset: 2,
    fontWeight: 600,
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
    color: disabled ? 'rgba(248, 248, 242, 0.58)' : undefined,
  });

  const panelSpacing = { marginBottom: 10 };
  const secondaryPanelsTogether = showContainersPanel && showDataTypesPanel;
  const helpLinkIsActive = primaryMenuSelection === 'help';
  const shouldGlowHelpLink = needsStartupTutorialHelpHint && !helpLinkIsActive;

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
      disabledReason: 'Select a container in Browse Containers to edit it.',
    },
    {
      label: t('actions.attach'),
      key: 'attachChild',
      icon: <FaLink />,
      disabled: !selectedContainerId,
      disabledReason:
        'Select a container in Browse Containers to attach a child link.',
    },
    {
      label: t('actions.addOwner'),
      key: 'addOwner',
      icon: <FaUserPlus />,
      disabled: !selectedContainerId,
      disabledReason: 'Select a container in Browse Containers to add an owner.',
    },
    {
      label: t('actions.removeOwner'),
      key: 'removeOwner',
      icon: <FaUserMinus />,
      disabled: !selectedContainerId,
      disabledReason:
        'Select a container in Browse Containers to remove an owner.',
    },
  ];

  const dataTypeSecondary: SecondaryAction[] = [
    {
      label: t('type.singular') + ' ' + t('actions.edit'),
      key: 'updateDataType',
      icon: <FaEdit />,
      disabled: !selectedDataTypeId,
      disabledReason: 'Select a data type in Browse Types to edit it.',
    },
  ];

  const canCreateDataType = !!selectedContainerId;
  const canCreateDataItem = !!selectedContainerId && !!selectedDataTypeId;
  const canCreateVerification = !!selectedContainerId && !!selectedDataTypeId;
  const canBrowseTypes = !!selectedContainerId;
  const canBrowseItems = !!selectedContainerId || !!selectedDataTypeId;
  const canBrowseItemVerifications = !!selectedContainerId;
  const addDataTypeDisabledHint =
    'Select a container in Browse Containers first, or create one in New Container.';
  const addDataItemDisabledHint = !selectedContainerId
    ? 'Select a container in Browse Containers first (or create one in New Container), then select a data type in Browse Types.'
    : !selectedDataTypeId
    ? 'Select a data type in Browse Types first, or create one in New Type.'
    : undefined;
  const addVerificationDisabledHint = !selectedContainerId
    ? 'Select a container in Browse Containers first (or create one in New Container), then select a data type in Browse Types.'
    : !selectedDataTypeId
    ? 'Select a data type in Browse Types first, or create one in New Type.'
    : undefined;
  const browseTypesDisabledHint =
    'Select a container in Browse Containers first (required). If no rows appear after selection, publish/create data types in that container.';
  const browseItemsDisabledHint =
    'Select at least one filter first: a container in Browse Containers or a data type in Browse Types. If it is still empty, publish/create data items that match your selection.';
  const browseItemVerificationsDisabledHint =
    'Select a container in Browse Containers first (required). If the table is still empty, publish item verifications for data items in that container.';
  const renderDisabledHint = (hint?: string) =>
    hint ? <span className="bp-sidebar-disabled-tooltip">{hint}</span> : null;

  useEffect(() => {
    if (canBrowseTypes) return;
    setShowDataTypesPanel(false);
    setShowDataTypeFullTableDialog(false);
  }, [canBrowseTypes]);

  useEffect(() => {
    const userAddress = account?.address;
    if (!userAddress) {
      setNeedsStartupTutorialHelpHint(false);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    const loadTutorialProgress = async () => {
      try {
        const params = new URLSearchParams({
          userAddress,
          topN: '1',
          graphLimit: '1',
        });

        const response = await fetch(
          `${API_BASE}api/analytics/dashboard?${params.toString()}`,
          { signal: controller.signal }
        );
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const payload = await response.json();
        const totals = payload?.totals ?? {};
        const hasContainer = Number(totals.containers) > 0;
        const hasDataType = Number(totals.dataTypes) > 0;
        const hasDataItem = Number(totals.dataItems) > 0;
        const tutorialDone = hasContainer && hasDataType && hasDataItem;

        if (!cancelled) {
          setNeedsStartupTutorialHelpHint(!tutorialDone);
        }
      } catch {
        if (controller.signal.aborted || cancelled) return;
        setNeedsStartupTutorialHelpHint(false);
      }
    };

    void loadTutorialProgress();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [account?.address, primaryMenuSelection]);

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
        >
          <button
            type="button"
            style={{
              border: 'none',
              background: 'transparent',
              color: 'inherit',
              cursor: 'pointer',
              padding: 0,
              margin: 0,
              display: 'inline-flex',
              alignItems: 'center',
            }}
            onClick={toggleCollapse}
            aria-label={collapsed ? 'Expand menu' : 'Collapse menu'}
          >
            <FaBars />
            {!collapsed && <span style={{ marginLeft: 6 }}>{t('menu')}</span>}
          </button>
          {!collapsed && (
            <button
              type="button"
              style={{
                ...headerLinkStyle,
                color: helpLinkIsActive
                  ? 'var(--cyan)'
                  : shouldGlowHelpLink
                  ? 'var(--green)'
                  : 'var(--comment)',
                fontWeight: helpLinkIsActive || shouldGlowHelpLink ? 700 : 600,
                padding: '2px 6px',
                borderRadius: 6,
                boxShadow: shouldGlowHelpLink
                  ? '0 0 0 1px rgba(80, 250, 123, 0.24), 0 0 9px rgba(80, 250, 123, 0.2)'
                  : 'none',
                textShadow: shouldGlowHelpLink
                  ? '0 0 8px rgba(80, 250, 123, 0.4)'
                  : 'none',
                transition:
                  'color 0.2s ease, box-shadow 0.2s ease, text-shadow 0.2s ease',
                textDecoration: helpLinkIsActive ? 'underline' : 'none',
              }}
              onClick={() => setPrimaryMenuSelection('help')}
              aria-label={t('help')}
              title={
                shouldGlowHelpLink
                  ? 'Complete Startup Tutorial steps 1-3. Open Help for guidance.'
                  : undefined
              }
            >
              <FaQuestionCircle />
              {t('help')}
            </button>
          )}
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
                        className={item.disabled ? 'bp-sidebar-disabled-item' : undefined}
                        aria-disabled={item.disabled ? 'true' : undefined}
                        onClick={() => {
                          if (item.disabled) return;
                          setPrimaryMenuSelection(item.key);
                        }}
                      >
                        {item.icon} {item.label}
                        {item.disabled ? renderDisabledHint(item.disabledReason) : null}
                      </div>
                    ))}

                  <div
                    style={actionButtonStyle(
                      primaryMenuSelection === 'addDataType',
                      0,
                      !canCreateDataType
                    )}
                    className={!canCreateDataType ? 'bp-sidebar-disabled-item' : undefined}
                    aria-disabled={!canCreateDataType ? 'true' : undefined}
                    onClick={() => {
                      if (!canCreateDataType) return;
                      setPrimaryMenuSelection('addDataType');
                      setExpandedSecondary(
                        expandedSecondary === 'addDataType' ? null : 'addDataType'
                      );
                    }}
                  >
                    <FaPlus /> {t('actions.new')} {t('type.singular')}
                    {!canCreateDataType
                      ? renderDisabledHint(addDataTypeDisabledHint)
                      : null}
                  </div>
                  {expandedSecondary === 'addDataType' &&
                    dataTypeSecondary.map((item) => (
                      <div
                        key={item.key}
                        style={actionButtonStyle(primaryMenuSelection === item.key, 16, !!item.disabled)}
                        className={item.disabled ? 'bp-sidebar-disabled-item' : undefined}
                        aria-disabled={item.disabled ? 'true' : undefined}
                        onClick={() => {
                          if (item.disabled) return;
                          setPrimaryMenuSelection(item.key);
                        }}
                      >
                        {item.icon} {item.label}
                        {item.disabled ? renderDisabledHint(item.disabledReason) : null}
                      </div>
                    ))}

                  <div
                    style={actionButtonStyle(
                      primaryMenuSelection === 'addDataItem',
                      0,
                      !canCreateDataItem
                    )}
                    className={!canCreateDataItem ? 'bp-sidebar-disabled-item' : undefined}
                    aria-disabled={!canCreateDataItem ? 'true' : undefined}
                    onClick={() => {
                      if (!canCreateDataItem) return;
                      setPrimaryMenuSelection('addDataItem');
                    }}
                  >
                    <FaPlus /> {t('actions.new')} {t('item.singular')}
                    {!canCreateDataItem
                      ? renderDisabledHint(addDataItemDisabledHint)
                      : null}
                  </div>

                  <div
                    style={actionButtonStyle(
                      primaryMenuSelection === 'publishDataItemVerification',
                      0,
                      !canCreateVerification
                    )}
                    className={!canCreateVerification ? 'bp-sidebar-disabled-item' : undefined}
                    aria-disabled={!canCreateVerification ? 'true' : undefined}
                    onClick={() => {
                      if (!canCreateVerification) return;
                      setPrimaryMenuSelection('publishDataItemVerification');
                    }}
                  >
                    <FaPlus /> {t('actions.new')} {t('itemVerification.singular')}
                    {!canCreateVerification
                      ? renderDisabledHint(addVerificationDisabledHint)
                      : null}
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
                    style={actionButtonStyle(primaryMenuSelection === 'erpIntegration')}
                    onClick={() => setPrimaryMenuSelection('erpIntegration')}
                  >
                    <FaPlug /> ERP Integration
                  </div>

                  <div
                    style={{ ...actionButtonStyle(showContainersPanel), justifyContent: 'space-between' }}
                    onClick={() => setShowContainersPanel((p) => !p)}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                      <FaColumns /> {t('browse.containers')}
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
                  {showContainersPanel && (
                    <>
                      <div
                        style={actionButtonStyle(
                          primaryMenuSelection === 'containerChildLinks',
                          16
                        )}
                        onClick={() => setPrimaryMenuSelection('containerChildLinks')}
                      >
                        <FaProjectDiagram /> {t('browse.containerChildLinks')}
                      </div>
                      <div
                        style={actionButtonStyle(primaryMenuSelection === 'owners', 16)}
                        onClick={() => setPrimaryMenuSelection('owners')}
                      >
                        <FaUsers /> {t('browse.owners')}
                      </div>
                    </>
                  )}
                  <div
                    style={{
                      ...actionButtonStyle(showDataTypesPanel, 0, !canBrowseTypes),
                      justifyContent: 'space-between',
                    }}
                    className={!canBrowseTypes ? 'bp-sidebar-disabled-item' : undefined}
                    aria-disabled={!canBrowseTypes ? 'true' : undefined}
                    onClick={() => {
                      if (!canBrowseTypes) return;
                      setShowDataTypesPanel((p) => !p);
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                      <FaColumns /> {t('browse.types')}
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
                    {!canBrowseTypes ? renderDisabledHint(browseTypesDisabledHint) : null}
                  </div>
                  <div
                    style={actionButtonStyle(
                      primaryMenuSelection === 'items',
                      0,
                      !canBrowseItems
                    )}
                    className={!canBrowseItems ? 'bp-sidebar-disabled-item' : undefined}
                    aria-disabled={!canBrowseItems ? 'true' : undefined}
                    onClick={() => {
                      if (!canBrowseItems) return;
                      setPrimaryMenuSelection('items');
                    }}
                  >
                    <FaList /> {t('browse.items')}
                    {!canBrowseItems ? renderDisabledHint(browseItemsDisabledHint) : null}
                  </div>
                  <div
                    style={actionButtonStyle(
                      primaryMenuSelection === 'itemVerifications',
                      0,
                      !canBrowseItemVerifications
                    )}
                    className={
                      !canBrowseItemVerifications ? 'bp-sidebar-disabled-item' : undefined
                    }
                    aria-disabled={!canBrowseItemVerifications ? 'true' : undefined}
                    onClick={() => {
                      if (!canBrowseItemVerifications) return;
                      setPrimaryMenuSelection('itemVerifications');
                    }}
                  >
                    <FaCheckCircle /> {t('browse.itemVerifications')}
                    {!canBrowseItemVerifications
                      ? renderDisabledHint(browseItemVerificationsDisabledHint)
                      : null}
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
                  onClick={() => setReportsCollapsed((prev) => !prev)}
                  aria-expanded={!reportsCollapsed}
                  aria-label="Toggle Reports section"
                >
                  {reportsCollapsed ? <FaChevronRight /> : <FaChevronDown />}
                  REPORTS
                </button>
                <span style={sectionDividerLineStyle} />
              </div>

              {!reportsCollapsed && (
                <>
                  <div
                    style={actionButtonStyle(primaryMenuSelection === 'smartReport')}
                    onClick={() => setPrimaryMenuSelection('smartReport')}
                  >
                    <FaFileAlt /> Smart Report
                  </div>
                  <CarMaintenanceReportButton dataTypeId={selectedDataTypeId} />
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
                <i
                  className="bi bi-arrows-fullscreen"
                  title={t('actions.openFullTable')}
                  style={{ marginLeft: 8, cursor: 'pointer' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowContainerFullTableDialog(true);
                  }}
                />
                <FaSyncAlt
                  style={{ marginLeft: 6, cursor: 'pointer' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setContainerRefreshKey((k) => k + 1);
                  }}
                />
                <FaTimes
                  style={{ marginLeft: 6, cursor: 'pointer' }}
                  title="Close"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowContainersPanel(false);
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
              <i
                className="bi bi-arrows-fullscreen"
                title={t('actions.openFullTable')}
                style={{ marginLeft: 8, cursor: 'pointer' }}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDataTypeFullTableDialog(true);
                }}
              />
              <FaSyncAlt
                style={{ marginLeft: 6, cursor: 'pointer' }}
                onClick={(e) => {
                  e.stopPropagation();
                  setDataTypeRefreshKey((k) => k + 1);
                }}
              />
              <FaTimes
                style={{ marginLeft: 6, cursor: 'pointer' }}
                title="Close"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDataTypesPanel(false);
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

      {showContainerFullTableDialog && (
        <div
          className="bp-dialog-backdrop"
          role="presentation"
          onClick={() => setShowContainerFullTableDialog(false)}
        >
          <div
            className="bp-dialog bp-dialog-wide bp-sidebar-full-table-dialog"
            role="dialog"
            aria-modal="true"
            aria-label={t('browse.containers')}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="bp-dialog-close"
              onClick={() => setShowContainerFullTableDialog(false)}
              aria-label="Close"
            >
              ×
            </button>

            <div className="bp-sidebar-full-table-dialog-header">
              <h3 className="bp-sidebar-full-table-dialog-title">
                {t('browse.containers')}
              </h3>
              <small className="bp-sidebar-full-table-dialog-subtitle">
                {t('messages.fullTableFilterHint')}
              </small>
            </div>

            <ItemsLoader
              type="container"
              containerId={selectedContainerId ?? undefined}
              dataTypeId={selectedDataTypeId ?? undefined}
              fieldsToShow={DEFAULT_FIELDS_BY_TYPE.container}
              enableEntityFilter
            />
          </div>
        </div>
      )}

      {showDataTypeFullTableDialog && (
        <div
          className="bp-dialog-backdrop"
          role="presentation"
          onClick={() => setShowDataTypeFullTableDialog(false)}
        >
          <div
            className="bp-dialog bp-dialog-wide bp-sidebar-full-table-dialog"
            role="dialog"
            aria-modal="true"
            aria-label={t('browse.types')}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="bp-dialog-close"
              onClick={() => setShowDataTypeFullTableDialog(false)}
              aria-label="Close"
            >
              ×
            </button>

            <div className="bp-sidebar-full-table-dialog-header">
              <h3 className="bp-sidebar-full-table-dialog-title">
                {t('browse.types')}
              </h3>
              <small className="bp-sidebar-full-table-dialog-subtitle">
                {t('messages.fullTableFilterHint')}
              </small>
            </div>

            <ItemsLoader
              type="data_type"
              containerId={selectedContainerId ?? undefined}
              dataTypeId={selectedDataTypeId ?? undefined}
              fieldsToShow={DEFAULT_FIELDS_BY_TYPE.data_type}
              enableEntityFilter
            />
          </div>
        </div>
      )}
    </div>
  );
}
