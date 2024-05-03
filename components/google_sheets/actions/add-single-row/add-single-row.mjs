import googleSheets from "../../google_sheets.app.mjs";
import { ConfigurationError } from "@pipedream/platform";

export default {
  key: "google_sheets-add-single-row",
  name: "Add Single Row",
  description: "Add a single row of data to Google Sheets",
  version: "2.1.4",
  type: "action",
  props: {
    googleSheets,
    drive: {
      propDefinition: [
        googleSheets,
        "watchedDrive",
      ],
    },
    sheetId: {
      propDefinition: [
        googleSheets,
        "sheetID",
        (c) => ({
          driveId: googleSheets.methods.getDriveId(c.drive),
        }),
      ],
      description: "",
      withLabel: true,
    },
    sheetName: {
      propDefinition: [
        googleSheets,
        "sheetName",
        (c) => ({
          sheetId: c.sheetId?.value || c.sheetId,
        }),
      ],
      description: "",
    },
    hasHeaders: {
      type: "string",
      label: "Does the first row of the sheet have headers?",
      description: "If the first row of your document has headers we'll retrieve them to make it easy to enter the value for each column.",
      options: [
        "Yes",
        "No",
      ],
      reloadProps: true,
    },
  },
  async additionalProps() {
    const sheetId = this.sheetId?.value || this.sheetId;
    const props = {};
    if (this.hasHeaders === "Yes") {
      const { values } = await this.googleSheets.getSpreadsheetValues(sheetId, `${this.sheetName}!1:1`);
      if (!values[0]?.length) {
        throw new ConfigurationError("Could not find a header row. Please either add headers and click \"Refresh fields\" or adjust the action configuration to continue.");
      }
      for (let i = 0; i < values[0]?.length; i++) {
        props[`col_${i.toString().padStart(4, "0")}`] = {
          type: "string",
          label: values[0][i],
          optional: true,
        };
      }
    } else if (this.hasHeaders === "No") {
      props.myColumnData = {
        type: "string[]",
        label: "Values",
        description: "Provide a value for each cell of the row. Google Sheets accepts strings, numbers and boolean values for each cell. To set a cell to an empty value, pass an empty string.",
      };
    }
    return props;
  },
  async run({ $ }) {
    const sheetId = this.sheetId?.value || this.sheetId;
    let row;
    if (this.hasHeaders === "Yes") {
      row = {
        "Time": new Date().toISOString(),
        "State": "Alarmed",
      };
    } else {
      row = ["Alarmed", new Date().toISOString()];
    }

    const data = await this.googleSheets.addRowsToSheet({
      spreadsheetId: sheetId,
      range: this.sheetName,
      rows: [Object.values(row)],
    });

    $.export("$summary", `Added 1 row to [${this.sheetId?.label || this.sheetId} (${data.updatedRange})](https://docs.google.com/spreadsheets/d/${sheetId}).`);

    return data;
  },
};
