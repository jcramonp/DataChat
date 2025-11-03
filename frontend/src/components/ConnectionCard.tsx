import React from "react";
import "./ConnectionCard.css";
import DataTable from "./DataTable";

type SourceType = "mysql" | "excel" | "saved";
type PreviewT = null | { columns: string[]; rows: any[][]; total: number };

type Props = {
  // UI
  title: string;
  show: boolean;
  onToggle: () => void;

  // Sesión/idioma
  signedText: string;
  langLabel: string;
  lang: "es" | "en";
  onLangChange: (lang: "es" | "en") => void;

  // Fuente de datos (labels i18n)
  sourceLabel: string;         // e.g., t("connection.source")
  sourceAriaLabel: string;     // e.g., t("connection.sourceAria")
  mysqlLabel: string;          // e.g., t("connection.sources.mysql")
  excelLabel: string;          // e.g., t("connection.sources.excel")
  savedLabel: string;          // e.g., t("connection.sources.admin")

  // Estado de fuente
  source: SourceType;
  onSourceChange: (s: SourceType) => void;

  // MySQL
  sqlalchemyLabel: string;
  sqlalchemyPlaceholder: string;
  sqlUrl: string;
  onSqlUrlChange: (v: string) => void;

  // Excel
  excelPathLabel: string;
  excelPathPlaceholder: string;
  excelPath: string;
  onExcelPathChange: (v: string) => void;
  sheetLabel: string;
  rowsLabel: string;
  sheets: string[];
  sheetName: string | number | undefined;
  onSheetNameChange: (v: string | number) => void;
  preview: PreviewT;

  // Saved (admin)
  connectionIdLabel: string; // <- FALTABA EN TU TIPO
  connections?: { id: number; name: string; db_type: string }[];
  connectionId: number | "";
  onConnectionIdChange: (v: number | "") => void;

  // Accesibilidad / i18n mínimos
  showText: string;
  hideText: string;
};

export default function ConnectionCard(props: Props) {
  const {
    title, show, onToggle,
    signedText, langLabel, lang, onLangChange,
    sourceLabel, sourceAriaLabel, mysqlLabel, excelLabel, savedLabel,
    source, onSourceChange,
    sqlalchemyLabel, sqlalchemyPlaceholder, sqlUrl, onSqlUrlChange,
    excelPathLabel, excelPathPlaceholder, excelPath, onExcelPathChange,
    sheetLabel, rowsLabel, sheets, sheetName, onSheetNameChange, preview,
    connectionIdLabel, connections, connectionId, onConnectionIdChange,
    showText, hideText,
  } = props;

  return (
    <div className="connection-card">
      <div className="connection-header">
        <h3>{title}</h3>
        <button
          type="button"
          className="toggle-button"
          onClick={onToggle}
          aria-expanded={show}
          aria-controls="conn-body"
          title={show ? hideText : showText}
        >
          {show ? hideText : showText}
        </button>
      </div>

      <div
        id="conn-body"
        className={`conn-body ${show ? "open" : "closed"}`}
        aria-hidden={!show}
      >
        {!show ? null : (
          <div className="connection-form">
            {/* Selector visual (segmented control) */}
            <div className="form-group">
              <label>{sourceLabel}</label>
              <div
                className="segmented"
                role="tablist"
                aria-label={sourceAriaLabel}
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={source === "mysql"}
                  className={`seg-btn ${source === "mysql" ? "active" : ""}`}
                  onClick={() => onSourceChange("mysql")}
                >
                  {mysqlLabel}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={source === "excel"}
                  className={`seg-btn ${source === "excel" ? "active" : ""}`}
                  onClick={() => onSourceChange("excel")}
                >
                  {excelLabel}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={source === "saved"}
                  className={`seg-btn ${source === "saved" ? "active" : ""}`}
                  onClick={() => onSourceChange("saved")}
                >
                  {savedLabel}
                </button>
              </div>
            </div>

            {/* Sesión / Idioma */}
            <div className="form-note">{signedText}</div>
            <div className="form-group">
              <label>{langLabel}</label>
              <select
                value={lang}
                onChange={(e) => onLangChange(e.target.value as "es" | "en")}
                className="form-select"
              >
                <option value="es">Español</option>
                <option value="en">English</option>
              </select>
            </div>

            {/* MySQL */}
            {source === "mysql" && (
              <div className="form-group">
                <label>{sqlalchemyLabel}</label>
                <input
                  type="text"
                  placeholder={sqlalchemyPlaceholder}
                  value={sqlUrl}
                  onChange={(e) => onSqlUrlChange(e.target.value)}
                />
              </div>
            )}

            {/* Excel */}
            {source === "excel" && (
              <>
                <div className="form-group">
                  <label>{excelPathLabel}</label>
                  <input
                    type="text"
                    placeholder={excelPathPlaceholder}
                    value={excelPath}
                    onChange={(e) => onExcelPathChange(e.target.value)}
                  />
                </div>

                <div className="form-group row">
                  <label>{sheetLabel}</label>
                  <div className="row-inline">
                    <select
                      className="form-select"
                      value={String(sheetName ?? "")}
                      onChange={(e) => onSheetNameChange(e.target.value)}
                    >
                      {sheets.map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                    <span className="rows-hint">
                      {preview ? `${preview.total} ${rowsLabel}` : ""}
                    </span>
                  </div>
                </div>

                {preview && preview.rows.length > 0 && (
                  <div className="preview-table">
                    <DataTable
                      columns={preview.columns}
                      rows={preview.rows}
                      defaultPageSize={10}
                    />
                  </div>
                )}
              </>
            )}

            {/* Saved/Admin */}
            {source === "saved" && (
              <div className="form-group">
                <label>{connectionIdLabel}</label>
                {Array.isArray(connections) && connections.length > 0 ? (
                  <select
                    className="form-select"
                    value={connectionId === "" ? "" : String(connectionId)}
                    onChange={(e) =>
                      onConnectionIdChange(
                        e.target.value === "" ? "" : Number(e.target.value)
                      )
                    }
                  >
                    {connections.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} (ID {c.id} • {c.db_type})
                      </option>
                    ))}
                  </select>
                ) : (
                  // Fallback si aún no cargó el listado
                  <input
                    className="form-input"
                    placeholder="1"
                    value={connectionId === "" ? "" : String(connectionId)}
                    onChange={(e) =>
                      onConnectionIdChange(
                        e.target.value === "" ? "" : Number(e.target.value)
                      )
                    }
                  />
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
