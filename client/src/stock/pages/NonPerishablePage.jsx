import { NP_CATALOG, NP_ALL_ITEMS } from '../catalog/nonPerishableCatalog';
import DispatchSheetForm from '../components/DispatchSheetForm';

export default function NonPerishablePage() {
  return <DispatchSheetForm catalog={NP_CATALOG} allItems={NP_ALL_ITEMS} type="nonperishable" />;
}
