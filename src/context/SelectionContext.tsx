import React, { createContext, useState, useContext } from 'react';

interface SelectionContextType {
  // ===== Selection =====
  selectedContainerId: string | null;
  setSelectedContainerId: React.Dispatch<React.SetStateAction<string | null>>;

  selectedDataTypeId: string | null;
  setSelectedDataTypeId: React.Dispatch<React.SetStateAction<string | null>>;

  selectedDataItemId: string | null;
  setSelectedDataItemId: React.Dispatch<React.SetStateAction<string | null>>;

  selectedDataItemVerificationId: string | null;
  setSelectedDataItemVerificationId: React.Dispatch<React.SetStateAction<string | null>>;

  verificationBrowseDataItemId: string | null;
  setVerificationBrowseDataItemId: React.Dispatch<React.SetStateAction<string | null>>;

  // ===== Pagination =====
  containerPage: number;
  setContainerPage: React.Dispatch<React.SetStateAction<number>>;

  dataTypePage: number;
  setDataTypePage: React.Dispatch<React.SetStateAction<number>>;

  dataItemPage: number;
  setDataItemPage: React.Dispatch<React.SetStateAction<number>>;

  receivedDataItemPage: number;
  setReceivedDataItemPage: React.Dispatch<React.SetStateAction<number>>;

  dataItemVerificationPage: number;
  setDataItemVerificationPage: React.Dispatch<React.SetStateAction<number>>;

  receivedDataItemVerificationPage: number;
  setReceivedDataItemVerificationPage: React.Dispatch<React.SetStateAction<number>>;
}

const SelectionContext = createContext<SelectionContextType>({
  selectedContainerId: null,
  setSelectedContainerId: () => {},

  selectedDataTypeId: null,
  setSelectedDataTypeId: () => {},

  selectedDataItemId: null,
  setSelectedDataItemId: () => {},

  selectedDataItemVerificationId: null,
  setSelectedDataItemVerificationId: () => {},

  verificationBrowseDataItemId: null,
  setVerificationBrowseDataItemId: () => {},

  containerPage: 0,
  setContainerPage: () => {},

  dataTypePage: 0,
  setDataTypePage: () => {},

  dataItemPage: 0,
  setDataItemPage: () => {},

  receivedDataItemPage: 0,
  setReceivedDataItemPage: () => {},

  dataItemVerificationPage: 0,
  setDataItemVerificationPage: () => {},

  receivedDataItemVerificationPage: 0,
  setReceivedDataItemVerificationPage: () => {},
});

export const SelectionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedContainerId, setSelectedContainerId] = useState<string | null>(null);
  const [selectedDataTypeId, setSelectedDataTypeId] = useState<string | null>(null);
  const [selectedDataItemId, setSelectedDataItemId] = useState<string | null>(null);
  const [selectedDataItemVerificationId, setSelectedDataItemVerificationId] =
    useState<string | null>(null);
  const [verificationBrowseDataItemId, setVerificationBrowseDataItemId] =
    useState<string | null>(null);

  const [containerPage, setContainerPage] = useState(0);
  const [dataTypePage, setDataTypePage] = useState(0);
  const [dataItemPage, setDataItemPage] = useState(0);
  const [receivedDataItemPage, setReceivedDataItemPage] = useState(0);
  const [dataItemVerificationPage, setDataItemVerificationPage] = useState(0);
  const [receivedDataItemVerificationPage, setReceivedDataItemVerificationPage] =
    useState(0);

  return (
    <SelectionContext.Provider
      value={{
        selectedContainerId,
        setSelectedContainerId,

        selectedDataTypeId,
        setSelectedDataTypeId,

        selectedDataItemId,
        setSelectedDataItemId,

        selectedDataItemVerificationId,
        setSelectedDataItemVerificationId,

        verificationBrowseDataItemId,
        setVerificationBrowseDataItemId,

        containerPage,
        setContainerPage,

        dataTypePage,
        setDataTypePage,

        dataItemPage,
        setDataItemPage,

        receivedDataItemPage,
        setReceivedDataItemPage,

        dataItemVerificationPage,
        setDataItemVerificationPage,

        receivedDataItemVerificationPage,
        setReceivedDataItemVerificationPage,
      }}
    >
      {children}
    </SelectionContext.Provider>
  );
};

export const useSelection = () => useContext(SelectionContext);
