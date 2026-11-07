import { guard } from "../guard";
import { FieldsEditor } from "./fields-editor";

export const metadata = { title: "Campos personalizados" };

export default async function FieldsPage() {
  await guard("ADMIN");
  return <FieldsEditor />;
}
