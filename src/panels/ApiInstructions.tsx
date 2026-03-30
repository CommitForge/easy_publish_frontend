const requestExamples = `GET /izipublish/api/items?userAddress=0x...&include=CONTAINER
GET /izipublish/api/items?userAddress=0x...&containerId=0xcontainer123&include=CONTAINER,DATA_TYPE
GET /izipublish/api/items?userAddress=0x...&containerId=0xcontainer123&include=CONTAINER,DATA_TYPE,DATA_ITEM,DATA_ITEM_VERIFICATION
GET /izipublish/api/items?userAddress=0x...&containerId=0xcontainer123&include=CONTAINER,DATA_TYPE,DATA_ITEM,DATA_ITEM_VERIFICATION&dataItemVerificationVerified=true
GET /izipublish/api/items?userAddress=0x...&containerId=0xcontainer123&include=CONTAINER,DATA_TYPE,DATA_ITEM,DATA_ITEM_VERIFICATION&dataItemVerificationVerified=false`;

const paginationExamples = `GET /izipublish/api/items?userAddress=0x...&include=CONTAINER&page=0&pageSize=20
GET /izipublish/api/items?userAddress=0x...&containerId=0xcontainer123&include=CONTAINER,DATA_TYPE&page=1&pageSize=20
GET /izipublish/api/items?userAddress=0x...&containerId=0xcontainer123&include=CONTAINER,DATA_TYPE,DATA_ITEM,DATA_ITEM_VERIFICATION&page=0&pageSize=50`;

const sampleResponse = `{
  "containers": [
    {
      "container": {
        "id": "0xcontainer123",
        "name": "Vehicle Records",
        "description": "Main vehicle container"
      },
      "dataTypes": [
        {
          "dataType": {
            "id": "0xtype001",
            "containerId": "0xcontainer123",
            "name": "Maintenance",
            "description": "Service history"
          },
          "dataItems": [
            {
              "dataItem": {
                "id": "0xitem001",
                "containerId": "0xcontainer123",
                "dataTypeId": "0xtype001",
                "name": "Oil Change 2026-03-01",
                "description": "Filter + oil replaced",
                "verified": false
              },
              "dataItemVerifications": [
                {
                  "id": "0xverif001",
                  "containerId": "0xcontainer123",
                  "dataItemId": "0xitem001",
                  "name": "Garage Verification",
                  "verified": true
                }
              ]
            }
          ]
        }
      ]
    }
  ],
  "meta": {
    "paginationLevel": "data_item",
    "page": 0,
    "pageSize": 20,
    "totalPages": 1,
    "hasNext": false,
    "includes": [
      "CONTAINER",
      "DATA_TYPE",
      "DATA_ITEM",
      "DATA_ITEM_VERIFICATION"
    ],
    "filters": {
      "containerId": "0xcontainer123",
      "dataTypeId": null,
      "dataItemId": null,
      "dataItemVerificationId": null,
      "dataItemVerificationVerified": null,
      "domain": null
    }
  }
}`;

export default function ApiInstructions() {
  return (
    <div style={{ width: "100%", boxSizing: "border-box", overflow: "hidden" }}>
      <h2 style={{ marginBottom: "1rem" }}>Universal Output API (Beta)</h2>

      <div style={{ marginBottom: "1rem", lineHeight: 1.6, color: "var(--fg-muted)" }}>
        <div style={{ marginBottom: "0.5rem" }}>
          Use the same data via REST, generate exports, or embed anywhere.
        </div>
        <div style={{ marginBottom: "0.5rem" }}>
          <strong>Beta notice:</strong> API shape and URL conventions can change
          in upcoming releases, including but not limited to explicit versioned
          paths.
        </div>
        <div>
          Full API notes are documented in <code>docs/ITEMS_API.md</code>.
        </div>
      </div>

      <h3 style={{ marginBottom: "0.5rem" }}>Request Examples</h3>
      <pre
        className="code"
        style={{
          maxHeight: 260,
          overflow: "auto",
          marginBottom: "1rem",
        }}
      >
        {requestExamples}
      </pre>

      <h3 style={{ marginBottom: "0.5rem" }}>Pagination</h3>
      <div style={{ marginBottom: "0.75rem", color: "var(--fg-muted)", lineHeight: 1.6 }}>
        Use <code>page</code> (0-based) and <code>pageSize</code> to fetch in chunks.
        The backend returns <code>meta.paginationLevel</code> to indicate whether paging is
        currently at container, data type, or data item level.
      </div>
      <ul style={{ marginTop: 0, marginBottom: "0.85rem", color: "var(--fg-muted)" }}>
        <li>
          No <code>containerId</code>: paging is at <code>container</code> level.
        </li>
        <li>
          With <code>containerId</code> and type browsing: paging is at <code>data_type</code> level.
        </li>
        <li>
          With item browsing includes: paging is at <code>data_item</code> level.
        </li>
        <li>
          For navigation, use <code>meta.hasNext</code>, <code>meta.totalPages</code>, and
          <code>meta.page</code>.
        </li>
      </ul>
      <pre
        className="code"
        style={{
          maxHeight: 210,
          overflow: "auto",
          marginBottom: "1rem",
        }}
      >
        {paginationExamples}
      </pre>

      <h3 style={{ marginBottom: "0.5rem" }}>Sample /api/items Output</h3>
      <pre
        className="code"
        style={{
          maxHeight: 320,
          overflow: "auto",
        }}
      >
        {sampleResponse}
      </pre>
    </div>
  );
}
