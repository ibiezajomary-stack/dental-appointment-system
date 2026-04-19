import { PaperStyleOdontogram } from "../../../components/odontogram/PaperStyleOdontogram";

/** Patient portal: dental chart is always read-only (editing is dentist-only). */
export function PatientOdontogramPanel({
  patientId,
  ageYears,
}: {
  patientId: string;
  /** `null` if date of birth unknown — permanent chart + hint. */
  ageYears?: number | null;
}) {
  return <PaperStyleOdontogram patientId={patientId} readOnly ageYears={ageYears} />;
}
