import { Segmented } from "./Segmented";

export type View = "vm" | "k8s" | "both";

type Props = { readonly view: View; readonly onChange: (view: View) => void };

export function HostingToggle({ view, onChange }: Props) {
  return (
    <Segmented<View>
      label="Hosting"
      value={view}
      onChange={onChange}
      options={[
        { value: "vm", label: "Virtual machines" },
        { value: "k8s", label: "Kubernetes" },
        { value: "both", label: "Side by side" },
      ]}
    />
  );
}
