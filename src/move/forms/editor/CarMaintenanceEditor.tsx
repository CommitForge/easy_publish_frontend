import { useEffect, useState } from "react";
import type { CarMaintenance } from '../../types';
export type { CarMaintenance } from '../../types';

interface Props {
  value: string;
  onChange: (json: string) => void;
}

export default function CarMaintenanceEditor({ value, onChange }: Props) {
  const [maintenances, setMaintenances] = useState<CarMaintenance[]>([]);

  // Initial empty maintenance entry
  const emptyEntry: CarMaintenance = {
    date: "",
    distance: "",
    service: "",
    cost: "",
    parts: "",
    performed_by: "",
    note: "",
  };

  // Update the JSON in parent
  function updateJson(newArray: CarMaintenance[]) {
    let obj: any = {};

    try {
      obj = JSON.parse(value || "{}");
    } catch {}

    if (!obj.easy_publish) obj.easy_publish = {};

    // Preserve publish.targets if missing
    if (!obj.easy_publish.publish) {
      obj.easy_publish.publish = {
        targets: [
          {
            domain: "cars.izipublish.com",
            base_url: "https://cars.izipublish.com",
            enabled: true,
          },
        ],
      };
    }

    // Set cars maintenances array
    obj.easy_publish.cars = { maintenances: newArray };

    onChange(JSON.stringify(obj, null, 2));
  }

  // Load from value whenever it changes
  useEffect(() => {
    try {
      const obj = JSON.parse(value || "{}");
      const arr = obj?.easy_publish?.cars?.maintenances;
      if (Array.isArray(arr)) setMaintenances(arr);
      else setMaintenances([]);
    } catch {
      setMaintenances([]);
    }
  }, [value]);

  function updateMaintenance(index: number, field: keyof CarMaintenance, val: string) {
    const newArray = [...maintenances];
    newArray[index] = { ...newArray[index], [field]: val };
    setMaintenances(newArray);
    updateJson(newArray);
  }

  function addMaintenance() {
    const newArray = [...maintenances, { ...emptyEntry }];
    setMaintenances(newArray);
    updateJson(newArray);
  }

  function removeMaintenance(index: number) {
    const newArray = maintenances.filter((_, i) => i !== index);
    setMaintenances(newArray);
    updateJson(newArray);
  }

  return (
    <div>
      {maintenances.map((entry, i) => (
        <div key={i} className="mb-3 p-2 border rounded">
          <div className="mb-2 d-flex justify-content-between align-items-center">
            <strong>Maintenance #{i + 1}</strong>
            <button className="btn btn-sm btn-outline-danger" onClick={() => removeMaintenance(i)}>
              Remove
            </button>
          </div>

          <div className="mb-2">
            Date
            <input
              type="date"
              className="form-control form-control-sm"
              value={entry.date}
              onChange={(e) => updateMaintenance(i, "date", e.target.value)}
            />
          </div>

          <div className="mb-2">
            Distance
            <input
              className="form-control form-control-sm"
              placeholder="185000 km"
              value={entry.distance}
              onChange={(e) => updateMaintenance(i, "distance", e.target.value)}
            />
          </div>

          <div className="mb-2">
            Service
            <input
              className="form-control form-control-sm"
              placeholder="Oil change"
              value={entry.service}
              onChange={(e) => updateMaintenance(i, "service", e.target.value)}
            />
          </div>

          <div className="mb-2">
            Cost
            <input
              className="form-control form-control-sm"
              placeholder="120 EUR"
              value={entry.cost}
              onChange={(e) => updateMaintenance(i, "cost", e.target.value)}
            />
          </div>

          <div className="mb-2">
            Parts
            <input
              className="form-control form-control-sm"
              placeholder="Oil filter, brake pads"
              value={entry.parts}
              onChange={(e) => updateMaintenance(i, "parts", e.target.value)}
            />
          </div>

          <div className="mb-2">
            Performed by
            <input
              className="form-control form-control-sm"
              placeholder="Garage / mechanic"
              value={entry.performed_by}
              onChange={(e) => updateMaintenance(i, "performed_by", e.target.value)}
            />
          </div>

          <div className="mb-2">
            Note
            <textarea
              className="form-control form-control-sm"
              rows={2}
              value={entry.note}
              onChange={(e) => updateMaintenance(i, "note", e.target.value)}
            />
          </div>
        </div>
      ))}

      <button className="btn btn-sm btn-outline-primary" onClick={addMaintenance}>
        Add Maintenance
      </button>
    </div>
  );
}
