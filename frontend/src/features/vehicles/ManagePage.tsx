import { useUrlState } from "../../shared/lib/useUrlState";
import { Modal, PageHeader, btn } from "../../shared/ui";
import { VehicleForm } from "./forms";
import { VehiclesView } from "./VehiclesView";

export default function ManagePage() {
  const { get, update } = useUrlState();
  return (
    <section>
      <PageHeader title="Manage Vehicles" sub="Add vehicles, edit details, restock and delete. Every stock change is recorded.">
        <button className={btn} onClick={() => update({ new: "1" })}>Add vehicle</button>
      </PageHeader>
      <VehiclesView mode="manage" />
      {get("new") && (
        <Modal title="Add vehicle" narrow onClose={() => update({ new: "" })}>
          <VehicleForm onSaved={() => update({ new: "" })} />
        </Modal>
      )}
    </section>
  );
}
