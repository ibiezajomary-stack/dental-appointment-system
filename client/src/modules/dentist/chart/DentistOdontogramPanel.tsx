import { PaperStyleOdontogram } from "../../../components/odontogram/PaperStyleOdontogram";

/** Dentist dashboard: full charting (surface editing). */
export function DentistOdontogramPanel({
  patientId,
  ageYears,
}: {
  patientId: string;
  ageYears?: number | null;
}) {
  return <PaperStyleOdontogram patientId={patientId} readOnly={false} ageYears={ageYears} />;
}
