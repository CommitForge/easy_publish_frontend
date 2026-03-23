import React, { useState } from 'react';
import {
  FaPlus,
  FaEdit,
  FaLink,
  FaBox,
  FaCubes,
  FaUserPlus,
  FaUserMinus,
  FaList,
  FaCheckCircle,
} from 'react-icons/fa';
import type { PrimarySelection } from './PrimarySelection';

type MenuItem = {
  key: PrimarySelection;
  label: string;
  icon: React.ReactNode;
  disabled?: boolean;
  isPrimary?: boolean;
  showSecondary?: boolean;
  toggleSidePanel?: 'containers' | 'types' | null;
};

type PrimaryMenuProps = {
  selection: PrimarySelection;
  setSelection: (val: PrimarySelection) => void;
  toggleSidePanel?: (panel: 'containers' | 'types' | null) => void;
  selectedContainerId?: string | null;
  selectedDataTypeId?: string | null;
};

export function PrimaryMenu({
  selection,
  setSelection,
  toggleSidePanel,
  selectedContainerId,
  selectedDataTypeId,
}: PrimaryMenuProps) {
  const [expandedSecondary, setExpandedSecondary] = useState<PrimarySelection | null>(null);

  const hasContainer = !!selectedContainerId?.trim();
  const hasDataType = !!selectedDataTypeId?.trim();

  const items: MenuItem[] = [
    { key: 'createContainer', label: 'New Container', icon: <FaBox />, isPrimary: true, showSecondary: true },
    { key: 'addDataType', label: 'New Type', icon: <FaCubes />, isPrimary: true, showSecondary: true },
    { key: 'addDataItem', label: 'New Item', icon: <FaPlus />, isPrimary: true, disabled: !hasDataType, showSecondary: true },
    { key: 'publishDataItemVerification', label: 'New Item Verification', icon: <FaCheckCircle />, isPrimary: true, disabled: !(hasContainer && hasDataType) },
    { key: 'browseContainers', label: 'Browse Containers', icon: <FaList />, toggleSidePanel: 'containers' },
    { key: 'browseTypes', label: 'Browse Types', icon: <FaList />, toggleSidePanel: 'types' },
    { key: 'items', label: 'Browse Items', icon: <FaList /> },
  ];

  const containerSecondary: MenuItem[] = [
    { key: 'updateContainer', label: 'Edit Container', icon: <FaEdit />, disabled: !hasContainer },
    { key: 'attachChild', label: 'Attach', icon: <FaLink />, disabled: !hasContainer },
    { key: 'addOwner', label: 'Owner +', icon: <FaUserPlus />, disabled: !hasContainer },
    { key: 'removeOwner', label: 'Owner −', icon: <FaUserMinus />, disabled: !hasContainer },
  ];

  const dataTypeSecondary: MenuItem[] = [
    { key: 'updateDataType', label: 'Edit Type', icon: <FaEdit />, disabled: !hasDataType },
  ];

  const handleClick = (item: MenuItem) => {
    if (item.disabled) return;
    setSelection(item.key);

    // Expand/collapse secondary section for Container / Type
    if (item.showSecondary) {
      if (expandedSecondary === item.key) setExpandedSecondary(null);
      else setExpandedSecondary(item.key);
    } else {
      setExpandedSecondary(null);
    }

    // Toggle side panel if applicable
    if (item.toggleSidePanel && toggleSidePanel) toggleSidePanel(item.toggleSidePanel);
  };

  const renderButton = (item: MenuItem) => {
    const isActive = selection === item.key;
    const isDisabled = !!item.disabled;
    return (
      <button
        key={item.key}
        onClick={() => handleClick(item)}
        disabled={isDisabled}
        title={isDisabled ? 'Select required container/type first' : item.label}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 10px',
          borderRadius: 6,
          fontSize: 13,
          border: '1px solid',
          cursor: isDisabled ? 'not-allowed' : 'pointer',
          opacity: isDisabled ? 0.45 : 1,
          background: isActive ? 'var(--accent)' : item.isPrimary ? 'rgba(255,255,255,0.06)' : 'transparent',
          borderColor: isActive ? 'var(--accent)' : 'rgba(255,255,255,0.15)',
          color: isActive ? '#fff' : 'inherit',
        }}
      >
        {item.icon}
        <span>{item.label}</span>
      </button>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 10 }}>
      {/* Main Actions */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.7, marginBottom: 6, textTransform: 'uppercase' }}>
          Main Actions
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {items.filter((i) => i.isPrimary).map(renderButton)}
        </div>
      </div>

      {/* Expanded secondary options */}
      {expandedSecondary === 'createContainer' && containerSecondary.length > 0 && (
        <div style={{ marginTop: 8 }}>
          {containerSecondary.map(renderButton)}
        </div>
      )}
      {expandedSecondary === 'addDataType' && dataTypeSecondary.length > 0 && (
        <div style={{ marginTop: 8 }}>
          {dataTypeSecondary.map(renderButton)}
        </div>
      )}

      {/* Browse section */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.7, marginBottom: 6, textTransform: 'uppercase' }}>
          Browse
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {items.filter((i) => i.toggleSidePanel || i.key === 'items').map(renderButton)}
        </div>
      </div>
    </div>
  );
}