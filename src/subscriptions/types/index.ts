export interface PayloadAssignBinaryPosition {
  id_user: string;
  sponsor_id: string;
  position: 'left' | 'right';
  is_new: boolean;
}

export interface PayloadAssignBinaryPositionForAutomaticFranchises {
  id_user: string;
  sponsor_id: string;
  position: 'left' | 'right';
  is_new: boolean;
  binary_points: number;
  range_points: number;
}
