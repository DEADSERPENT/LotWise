import { PageHeader } from "../../shared/ui";
import { StockSummary } from "./StockSummary";
import { VehiclesView } from "./VehiclesView";

export function InventoryPage() {
  return (
    <section>
      <PageHeader title="Inventory" sub="Find a vehicle and record a sale." />
      <StockSummary />
      <VehiclesView mode="sell" />
    </section>
  );
}
