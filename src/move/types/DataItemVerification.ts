export interface DataItemVerification {
  id: string;
  containerId?: string;
  dataItemId?: string;
  name?: string;
  description?: string;
  content?: string;
  verified?: string;
  creatorAddr?: string;
  externalId?: string;
  externalIndex?: string | number;
  recipients?: string[];
  recipientCount?: number;
}
