
type SecondaryMenuProps = {
  secondaryMenu: 'attachChild' | 'addOwner' | 'removeOwner' | null;
  setSecondaryMenu: (val: 'attachChild' | 'addOwner' | 'removeOwner' | null) => void;
  selectedContainerId?: string | null;
};

export function SecondaryMenu({
  secondaryMenu,
  setSecondaryMenu,
  selectedContainerId,
}: SecondaryMenuProps) {
  if (!selectedContainerId) return null;

  const actions: Array<{ key: 'attachChild' | 'addOwner' | 'removeOwner'; label: string }> = [
    { key: 'attachChild', label: 'Attach' },
    { key: 'addOwner', label: 'Owner +' },
    { key: 'removeOwner', label: 'Owner −' },
  ];

  return (
    <div
      style={{
        marginBottom: '1rem',
        display: 'flex',
        gap: '0.5rem',
        flexWrap: 'wrap',
      }}
    >
      {actions.map((action) => (
        <button
          key={action.key}
          className={`btn ${secondaryMenu === action.key ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          onClick={() => setSecondaryMenu(action.key)}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
