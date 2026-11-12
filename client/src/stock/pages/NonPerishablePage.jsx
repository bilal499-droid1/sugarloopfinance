import { NP_CATALOG, NP_ALL_ITEMS } from '../catalog/nonPerishableCatalog';
import DispatchSheetForm from '../components/DispatchSheetForm';

export default function NonPerishablePage({ saleDate, onSaleDateChange, branch, onBranchChange }) {
  return (
    <DispatchSheetForm
      catalog={NP_CATALOG}
      allItems={NP_ALL_ITEMS}
      type="nonperishable"
      saleDate={saleDate}
      onSaleDateChange={onSaleDateChange}
      branch={branch}
      onBranchChange={onBranchChange}
    />
  );
}
