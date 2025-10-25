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
  connectionIdLabel: string;
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
    connectionIdLabel, connectionId, onConnectionIdChange,
    showText, hideText,
  } = props;

  return (
    <div
      className="connection-card panel" // ⬅️ panel para tema light/dark
      style={{
        marginTop: "24px",
        borderRadius: "12px",
      }}
    >
      <div
        className="connection-header panel-header" // ⬅️ panel-header para barra superior
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 16px",
          fontWeight: 500,
          fontSize: "16px",
          lineHeight: 1.4,
        }}
      >
        <h3 style={{ margin: 0 }}>{title}</h3>

        <button
          type="button"
          className="toggle-button"
          onClick={onToggle}
          aria-expanded={show}
          aria-controls="conn-body"
          title={show ? hideText : showText}
          style={{
            // importante: que parezca link moradito consistente con el tema
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: 500,
            lineHeight: 1.4,
            color: "rgb(109, 40, 217)", // morado claro, se ve bien en ambos temas
          }}
        >
          {show ? hideText : showText}
        </button>
      </div>

      <div
        id="conn-body"
        className={`conn-body ${show ? "open" : "closed"}`}
        aria-hidden={!show}
        style={{
          padding: show ? "16px" : undefined,
        }}
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
                <input
                  type="number"
                  placeholder="1"
                  value={String(connectionId)}
                  onChange={(e) =>
                    onConnectionIdChange(
                      e.target.value === "" ? "" : Number(e.target.value)
                    )
                  }
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
