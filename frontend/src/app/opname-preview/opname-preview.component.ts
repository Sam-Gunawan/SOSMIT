import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, OnInit, OnChanges } from '@angular/core';
import { AssetInfo } from '../model/asset-info.model';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSortModule } from '@angular/material/sort';

export interface PreviewTableData {
  assetTag: string;
  assetName: string;
  serialNumber: string;
  equipments: string;
  regionName: string;
  siteGroupName: string;
  siteName: string;
  subSiteName: string;
  room: string;
  userName: string;
  position: string;
  division: string;
  department: string;
  costCenter: number;
  condition: boolean | null;
  status: string;
  processingStatus: 'pending' | 'all_good' | 'edited';
}

@Component({
  selector: 'app-opname-preview',
  imports: [CommonModule, MatTableModule, MatSortModule],
  templateUrl: './opname-preview.component.html',
  styleUrl: './opname-preview.component.scss'
})
export class OpnamePreviewComponent implements OnInit, OnChanges {
  @Input() searchResults: AssetInfo[] = [];
  @Output() closePreviewEvent = new EventEmitter<void>();

  dataSource = new MatTableDataSource<PreviewTableData>([]);
  displayedColumns: string[] = ['assetTag', 'assetName', 'serialNumber', 'equipments', 'regionName', 'siteGroupName', 'siteName', 'subSiteName', 'room', 'userName', 'position', 'division', 'department', 'costCenter', 'condition', 'status', 'processingStatus'];

  ngOnInit() {
    this.loadPreviewData();
  }

  ngOnChanges() {
    this.loadPreviewData();
  }

  loadPreviewData() {
    const tableData: PreviewTableData[] = this.searchResults.map(asset => ({
      assetTag: asset.assetTag,
      assetName: asset.assetName,
      serialNumber: asset.serialNumber,
      equipments: asset.equipments,
      regionName: asset.regionName,
      siteGroupName: asset.siteGroupName,
      siteName: asset.siteName,
      subSiteName: asset.subSiteName,
      room: asset.room,
      userName: asset.assetOwnerName,
      position: asset.assetOwnerPosition,
      division: asset.assetOwnerDivision,
      department: asset.assetOwnerDepartment,
      costCenter: asset.assetOwnerCostCenter,
      condition: asset.condition,
      status: asset.assetStatus,
      processingStatus: this.getProcessingStatus(asset)
    }));
    this.dataSource.data = tableData;
  }

  private getProcessingStatus(asset: AssetInfo): 'pending' | 'all_good' | 'edited' {
    // Logic to determine processing status based on asset data
    // For original data preview, we'll show 'all_good' as default
    return 'all_good';
  }

  closePreview() {
    this.closePreviewEvent.emit();
  }

  // errorMessage: string = '';
  // showToast: boolean = false;
  // isLoading: boolean = true;
}
