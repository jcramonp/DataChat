// src/__tests__/helpers/ErrorSample.tsx
import React from "react";
import { useTranslation } from "react-i18next";

export default function ErrorSample({ code }: { code: "forbidden" | "not_found" | "network" | "backend" | "unauthorized" }) {
  const { t } = useTranslation();
  return <div>{t(`errors.${code}`)}</div>;
}
