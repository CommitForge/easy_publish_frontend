import React, { createContext, useState, useContext } from 'react';

interface SelectionContextType {
  // ===== Selection =====
  selectedContainerId: string | null;
  setSelectedContainerId: React.Dispatch<React.SetStateAction<string | null>>;

  selectedDataTypeId: string | null;
  setSelectedDataTypeId: React.Dispatch<React.SetStateAction<string | null>>;

  selectedDataItemId: string | null;
  setSelectedDataItemId: React.Dispatch<React.SetStateAction<string | null>>;

  // ===== Pagination =====
  containerPage: number;
  setContainerPage: React.Dispatch<React.SetStateAction<number>>;

  dataTypePage: number;
  setDataTypePage: React.Dispatch<React.SetStateAction<number>>;

  dataItemPage: number;
  setDataItemPage: React.Dispatch<React.SetStateAction<number>>;
}

const SelectionContext = createContext<SelectionContextType>({
  selectedContainerId: null,
  setSelectedContainerId: () => {},

  selectedDataTypeId: null,
  setSelectedDataTypeId: () => {},

  selectedDataItemId: null,
  setSelectedDataItemId: () => {},

  containerPage: 0,
  setContainerPage: () => {},

  dataTypePage: 0,
  setDataTypePage: () => {},

  dataItemPage: 0,
  setDataItemPage: () => {},
});

export const SelectionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedContainerId, setSelectedContainerId] = useState<string | null>(null);
  const [selectedDataTypeId, setSelectedDataTypeId] = useState<string | null>(null);
  const [selectedDataItemId, setSelectedDataItemId] = useState<string | null>(null);

  const [containerPage, setContainerPage] = useState(0);
  const [dataTypePage, setDataTypePage] = useState(0);
  const [dataItemPage, setDataItemPage] = useState(0);

  return (
    <SelectionContext.Provider
      value={{
        selectedContainerId,
        setSelectedContainerId,

        selectedDataTypeId,
        setSelectedDataTypeId,

        selectedDataItemId,
        setSelectedDataItemId,

        containerPage,
        setContainerPage,

        dataTypePage,
        setDataTypePage,

        dataItemPage,
        setDataItemPage,
      }}
    >
      {children}
    </SelectionContext.Provider>
  );
};

export const useSelection = () => useContext(SelectionContext);
