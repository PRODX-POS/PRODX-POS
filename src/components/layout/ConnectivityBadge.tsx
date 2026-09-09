import React from 'react';
import { SyncStatusIndicator, SyncStatusIndicatorProps } from './SyncStatusIndicator';

export const ConnectivityBadge: React.FC<SyncStatusIndicatorProps> = (props) => {
  return <SyncStatusIndicator {...props} />;
};

export default ConnectivityBadge;
